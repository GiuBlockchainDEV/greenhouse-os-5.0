"""Qatar-corrected steady-state greenhouse microclimate solver."""

from __future__ import annotations

import math
from dataclasses import dataclass

from app.simulation.climate_equipment import (
    ac_capacity_factor,
    fan_and_pad_cooling_c,
    fog_capacity_factor,
    heater_capacity_factor,
)
from app.simulation.constants import LATENT_HEAT_VAPORIZATION
from app.simulation.cultivation import (
    CULTIVATION_ET_FACTOR,
    effective_lai,
    normalize_cultivation_system,
)
from app.simulation.geometry import compute_envelope
from app.simulation.psychrometrics import approx_wet_bulb_c
from app.simulation.schemas import ThermalInput
from app.simulation.vpd import calculate_vpd_kpa

RHO_AIR = 1.2
CP_AIR = 1005.0
LATENT_HEAT_J_KG = LATENT_HEAT_VAPORIZATION * 1e6
GRAVITY = 9.81
DEFAULT_LEAKAGE_ACH = 0.35
DEFAULT_CD = 0.65
DEFAULT_WIND_COEFF = 0.75
EXHAUST_FACE_VELOCITY = 8.0
ROOF_EXHAUST_FACE_VELOCITY = 6.5
CIRC_FACE_VELOCITY = 5.5
DEFAULT_PAD_EFFICIENCY = 0.82
DEFAULT_AC_SHR = 0.75
DEFAULT_AC_KW_PER_REF = 30.0
DEFAULT_HEATER_KW = 25.0
DEFAULT_HAF_MOTOR_W = 450.0
DEFAULT_GROUND_U = 1.8
DEFAULT_GROUND_OFFSET_C = -2.0
SOLAR_ABSORPTION = 0.72
HEATING_SETPOINT_C = 22.0
EPSILON = 0.62198
PRESSURE_KPA = 101.325


@dataclass
class MicroclimateState:
    internal_temp_c: float
    internal_rh_pct: float
    humidity_ratio_kg_kg: float
    q_solar_w_m2: float
    ventilation_ach: float
    mixing_effectiveness: float
    supply_temp_c: float | None
    q_transpiration_w_m2: float
    q_ventilation_w_m2: float
    q_conduction_w_m2: float
    q_equipment_w_m2: float


def _humidity_ratio_kg_kg(temperature_c: float, rh_pct: float) -> float:
    es = 0.6108 * math.exp((17.27 * temperature_c) / (temperature_c + 237.3))
    ea = es * max(0.0, min(100.0, rh_pct)) / 100.0
    return (EPSILON * ea) / max(PRESSURE_KPA - ea, 0.01)


def _rh_from_w(temperature_c: float, humidity_ratio: float) -> float:
    es = 0.6108 * math.exp((17.27 * temperature_c) / (temperature_c + 237.3))
    ea = (humidity_ratio * PRESSURE_KPA) / (EPSILON + humidity_ratio)
    return max(0.0, min(100.0, (ea / max(es, 1e-6)) * 100.0))


def _fan_flow_m3h(count: int, diameter_m: float, face_velocity: float, runtime: float = 1.0) -> float:
    if count <= 0 or diameter_m <= 0:
        return 0.0
    area = count * math.pi * (diameter_m / 2.0) ** 2
    return area * face_velocity * 3600.0 * runtime


def _uses_mechanical_ventilation(cooling: str, ventilation: str) -> bool:
    return cooling in {"fan_and_pad", "evaporative"} or ventilation in {"forced_exhaust", "combined"}


def _vent_opening_area_m2(equipment) -> float:
    sizing = equipment.sizing
    roof = sizing.roof_vent_count * sizing.roof_vent_width_m * 0.35
    side = sizing.side_vent_count * sizing.side_vent_height_m * 1.8 * 2.0
    gable = sizing.pad_wall_width_m * 0.35 if equipment.ventilation == "natural_gable" else 0.0
    return roof + side + gable


def _ventilation_flows(
    equipment,
    wind_speed_m_s: float,
    volume_m3: float,
    eave_height: float,
    internal_temp_c: float,
    external_temp_c: float,
    runtime: float = 1.0,
) -> tuple[float, float]:
    sizing = equipment.sizing
    mechanical = 0.0
    if _uses_mechanical_ventilation(equipment.cooling, equipment.ventilation):
        mechanical = (
            _fan_flow_m3h(sizing.exhaust_fan_count, sizing.exhaust_fan_diameter_m, EXHAUST_FACE_VELOCITY, runtime)
            + _fan_flow_m3h(
                sizing.roof_exhaust_fan_count,
                sizing.roof_exhaust_fan_diameter_m,
                ROOF_EXHAUST_FACE_VELOCITY,
                runtime,
            )
        )

    a_eff = _vent_opening_area_m2(equipment)
    wind = (
        0.0
        if equipment.ventilation == "forced_exhaust"
        else DEFAULT_CD * a_eff * wind_speed_m_s * math.sqrt(DEFAULT_WIND_COEFF) * 3600.0
    )
    delta_t = abs(internal_temp_c - external_temp_c)
    t_in_k = internal_temp_c + 273.15
    stack = (
        DEFAULT_CD
        * a_eff
        * math.sqrt(2.0 * GRAVITY * max(eave_height * 0.65, 1.2) * delta_t / max(t_in_k, 200.0))
        * 3600.0
        if a_eff > 0 and delta_t > 0.05
        else 0.0
    )
    infiltration = DEFAULT_LEAKAGE_ACH * max(volume_m3, 1.0)
    natural = math.sqrt(wind**2 + stack**2)
    total = mechanical + natural + infiltration
    return total, mechanical


def _ac_derating(outdoor_temp_c: float) -> float:
    if outdoor_temp_c <= 35.0:
        return 1.0
    return max(0.35, 1.0 - (outdoor_temp_c - 35.0) * 0.025)


def _crop_coefficient(crop_type: str, growth_stage: str) -> float:
    base_kc = {
        "tomato": 1.05,
        "cucumber": 0.95,
        "pepper": 0.90,
        "lettuce": 0.80,
        "strawberry": 0.85,
        "cannabis": 1.10,
    }
    stage_factor = {
        "seedling": 0.6,
        "early_vegetative": 0.8,
        "mid_season": 1.0,
        "late_vegetative": 1.05,
        "generative": 1.1,
        "harvest": 0.9,
    }
    return base_kc.get(crop_type, 1.0) * stage_factor.get(growth_stage, 1.0)


def _solar_irradiance_w_m2(solar_mj_m2_day: float, daylight_hours: float, transmittance: float) -> float:
    if daylight_hours <= 0:
        return 0.0
    irradiance = (solar_mj_m2_day * 1e6) / (daylight_hours * 3600.0)
    return irradiance * transmittance * SOLAR_ABSORPTION


def solve_microclimate(params: ThermalInput) -> MicroclimateState:
    length = params.geometry.length
    width = params.geometry.width
    eave_height = params.geometry.eave_height
    ridge_height = params.geometry.ridge_height
    floor_area, envelope_area, volume = compute_envelope(
        length,
        width,
        eave_height,
        ridge_height,
        arch_type=params.geometry.arch_type,
        bay_count=params.geometry.bay_count,
        bay_width=params.geometry.bay_width_m,
        bay_arch_types=params.geometry.bay_arch_types,
    )

    t_ext = params.external_temp_c
    rh_ext = params.external_rh_pct
    q_solar = _solar_irradiance_w_m2(
        params.solar_radiation_mj_m2_day,
        max(params.daylight_hours, 1.0),
        params.materials.transmittance,
    )

    system = normalize_cultivation_system(params.crop.system)
    et_factor = CULTIVATION_ET_FACTOR.get(system, 1.0)
    kc = _crop_coefficient(params.crop.type, params.crop.growth_stage)
    lai_effective = effective_lai(params.crop.lai, system, params.crop.layout.tier_count)
    lai_factor = min(lai_effective / 3.0, 2.0)
    et_rate_mm_h = (params.et0_mm_day / 24.0) * kc * lai_factor * et_factor
    q_transpiration = -(et_rate_mm_h / 3600.0) * LATENT_HEAT_J_KG
    m_dot_crop = et_rate_mm_h / 3600.0

    w_out = _humidity_ratio_kg_kg(t_ext, rh_ext)
    ground_t = t_ext + DEFAULT_GROUND_OFFSET_C
    t_in = t_ext
    w_in = w_out
    supply_temp_c: float | None = None

    for _ in range(24):
        total_flow, mechanical_flow = _ventilation_flows(
            params.equipment,
            params.wind_speed_m_s,
            volume,
            eave_height,
            t_in,
            t_ext,
        )
        conductance = params.materials.u_value * envelope_area / max(floor_area, 1.0)
        vent_coeff = RHO_AIR * CP_AIR * total_flow / (3600.0 * max(floor_area, 1.0))
        ground_coeff = DEFAULT_GROUND_U
        total_coeff = conductance + vent_coeff + ground_coeff

        q_cond = -params.materials.u_value * (envelope_area / max(floor_area, 1.0)) * (t_in - t_ext)
        q_ground = -DEFAULT_GROUND_U * (t_in - ground_t)
        q_vent = -(RHO_AIR * CP_AIR * total_flow) / (3600.0 * max(floor_area, 1.0)) * (t_in - t_ext)

        q_equipment = 0.0
        moisture_source = m_dot_crop
        cooling = params.equipment.cooling
        sizing = params.equipment.sizing

        if cooling in {"fan_and_pad", "evaporative"}:
            temp_drop, _ = fan_and_pad_cooling_c(t_ext, rh_ext, sizing)
            pad_eff = DEFAULT_PAD_EFFICIENCY if cooling == "fan_and_pad" else DEFAULT_PAD_EFFICIENCY * 0.75
            wet_bulb = approx_wet_bulb_c(t_ext, rh_ext)
            supply_temp_c = t_ext - pad_eff * (t_ext - wet_bulb)
            m_dot_air = RHO_AIR * mechanical_flow / 3600.0
            q_equipment += (m_dot_air * CP_AIR * (supply_temp_c - t_in)) / max(floor_area, 1.0)
        elif cooling == "mechanical_ac":
            rated_kw = DEFAULT_AC_KW_PER_REF * 2.0 * ac_capacity_factor(sizing) * _ac_derating(t_ext)
            q_total = rated_kw * 1000.0
            q_sens = q_total * DEFAULT_AC_SHR
            deficit = max(0.0, t_in - t_ext)
            applied = min(q_sens, deficit * 1200.0 * floor_area)
            q_equipment -= applied / max(floor_area, 1.0)
            supply_temp_c = max(t_ext + 4.0, t_in - 8.0)
            moisture_source -= (q_total * (1.0 - DEFAULT_AC_SHR)) / LATENT_HEAT_J_KG / max(floor_area, 1.0)
        elif cooling == "high_pressure_fog":
            nozzle_flow_lh = sizing.fog_line_count * 18.0 * fog_capacity_factor(sizing)
            m_dot_evap = (nozzle_flow_lh / 3600.0) * 0.72
            q_lat = m_dot_evap * LATENT_HEAT_J_KG
            q_equipment -= q_lat / max(floor_area, 1.0)
            moisture_source += m_dot_evap / max(floor_area, 1.0)

        deficit = params.heating_setpoint_c - t_in
        if deficit > 0 and params.equipment.heating != "none":
            rated_kw = DEFAULT_HEATER_KW
            if params.equipment.heating == "geothermal":
                rated_kw *= 1.4 * min(max(sizing.pipe_row_count, 1), 8) / 3.0
            elif params.equipment.heating in {"unit_heater", "air_heater"}:
                rated_kw *= heater_capacity_factor(sizing)
            elif params.equipment.heating == "hot_water_pipes":
                rated_kw *= 0.9 * min(max(sizing.pipe_row_count, 1), 8) / 3.0
            applied_kw = min(rated_kw, rated_kw * min(deficit / 5.0, 1.5))
            q_equipment += applied_kw * 1000.0 / max(floor_area, 1.0)
            supply_temp_c = t_in + min(12.0, deficit * 0.6)

        haf_w = sizing.circulation_fan_count * DEFAULT_HAF_MOTOR_W
        q_equipment += haf_w / max(floor_area, 1.0)

        q_net = q_solar + q_transpiration + q_cond + q_ground + q_vent + q_equipment
        t_in += q_net / max(total_coeff, 0.35)

        m_dot_vent = (RHO_AIR * total_flow / 3600.0) * (w_out - w_in) / max(floor_area, 1.0)
        moisture_net = moisture_source + m_dot_vent
        dry_air_mass = (RHO_AIR * volume) / max(floor_area, 1.0)
        w_in += (moisture_net / max(dry_air_mass, 0.5)) * 0.35
        w_sat = _humidity_ratio_kg_kg(t_in, 98.0)
        w_in = max(0.0005, min(w_sat, w_in))

    if params.equipment.cooling in {"fan_and_pad", "evaporative", "high_pressure_fog"}:
        t_in = max(approx_wet_bulb_c(t_ext, rh_ext), t_in)

    total_flow, _ = _ventilation_flows(
        params.equipment,
        params.wind_speed_m_s,
        volume,
        eave_height,
        t_in,
        t_ext,
    )
    recirc = _fan_flow_m3h(
        params.equipment.sizing.circulation_fan_count,
        params.equipment.sizing.circulation_fan_diameter_m,
        CIRC_FACE_VELOCITY,
    )
    mix_eff = min(0.92, 0.12 + (total_flow / max(volume, 1.0)) * 0.08 + (recirc / max(volume, 1.0)) * 0.18)

    q_cond = -params.materials.u_value * (envelope_area / max(floor_area, 1.0)) * (t_in - t_ext)
    q_vent = -(RHO_AIR * CP_AIR * total_flow) / (3600.0 * max(floor_area, 1.0)) * (t_in - t_ext)
    rh = _rh_from_w(t_in, w_in)

    return MicroclimateState(
        internal_temp_c=round(t_in, 1),
        internal_rh_pct=round(rh, 1),
        humidity_ratio_kg_kg=w_in,
        q_solar_w_m2=round(q_solar, 1),
        ventilation_ach=round(total_flow / max(volume, 1.0), 2),
        mixing_effectiveness=mix_eff,
        supply_temp_c=supply_temp_c,
        q_transpiration_w_m2=round(q_transpiration, 1),
        q_ventilation_w_m2=round(q_vent, 1),
        q_conduction_w_m2=round(q_cond, 1),
        q_equipment_w_m2=round(q_equipment, 1),
    )
