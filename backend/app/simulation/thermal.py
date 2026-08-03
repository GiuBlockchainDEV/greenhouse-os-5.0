"""Greenhouse thermodynamic energy balance engine."""

import math

from app.simulation.climate_equipment import (
    cooling_effect,
    heating_flux_w_m2,
    ventilation_ach,
)
from app.simulation.constants import LATENT_HEAT_VAPORIZATION
from app.simulation.cultivation import (
    CULTIVATION_ET_FACTOR,
    CULTIVATION_THERMAL_MASS,
    effective_lai,
    normalize_cultivation_system,
)
from app.simulation.schemas import ThermalBalance, ThermalInput, ThermalResult
from app.simulation.vpd import calculate_vpd_kpa

RHO_AIR = 1.2
CP_AIR = 1005.0
LATENT_HEAT_J_KG = LATENT_HEAT_VAPORIZATION * 1e6


def _roof_area(length: float, width: float, eave_height: float, ridge_height: float) -> float:
    roof_rise = max(ridge_height - eave_height, 0.01)
    slope_length = math.sqrt((width / 2) ** 2 + roof_rise**2)
    return 2 * slope_length * length


def _envelope_area(length: float, width: float, eave_height: float, ridge_height: float) -> float:
    wall_area = 2 * length * eave_height + 2 * width * eave_height
    return wall_area + _roof_area(length, width, eave_height, ridge_height)


def _floor_area(length: float, width: float) -> float:
    return length * width


def _volume(length: float, width: float, eave_height: float, ridge_height: float) -> float:
    floor = _floor_area(length, width)
    roof_rise = max(ridge_height - eave_height, 0)
    return floor * eave_height + floor * roof_rise / 2


def _crop_coefficient(crop_type: str, growth_stage: str) -> float:
    base_kc: dict[str, float] = {
        "tomato": 1.05,
        "cucumber": 0.95,
        "pepper": 0.90,
        "lettuce": 0.80,
        "strawberry": 0.85,
        "cannabis": 1.10,
    }
    stage_factor: dict[str, float] = {
        "seedling": 0.6,
        "early_vegetative": 0.8,
        "mid_season": 1.0,
        "late_vegetative": 1.05,
        "generative": 1.1,
        "harvest": 0.9,
    }
    return base_kc.get(crop_type, 1.0) * stage_factor.get(growth_stage, 1.0)


def _solar_irradiance_w_m2(solar_radiation_mj_m2_day: float, daylight_hours: float) -> float:
    if daylight_hours <= 0:
        return 0.0
    return (solar_radiation_mj_m2_day * 1e6) / (daylight_hours * 3600.0)


def _solve_internal_temperature(
    t_external: float,
    q_solar_w_m2: float,
    u_value: float,
    envelope_area: float,
    floor_area: float,
    ach: float,
    volume: float,
    q_transpiration_w_m2: float,
) -> float:
    """Solve quasi-steady-state internal air temperature (°C)."""
    conductance = u_value * envelope_area / floor_area
    vent_coeff = RHO_AIR * CP_AIR * ach * volume / (3600.0 * floor_area)
    total_coeff = conductance + vent_coeff

    if total_coeff <= 0:
        return t_external

    net_gain = q_solar_w_m2 + q_transpiration_w_m2
    return t_external + net_gain / total_coeff


def compute_thermal_balance(params: ThermalInput) -> ThermalResult:
    """
    Compute greenhouse energy balance fluxes and internal microclimate.

    Energy balance (W/m² floor reference):
        Q_net = Q_solar + Q_transpiration + Q_ventilation + Q_conduction ≈ 0

    Args:
        params: Geometry, materials, crop, and external climate inputs.

    Returns:
        Thermal balance fluxes, internal microclimate, and heatmap grid.
    """
    length = params.geometry.length
    width = params.geometry.width
    eave_height = params.geometry.eave_height
    ridge_height = params.geometry.ridge_height

    floor_area = _floor_area(length, width)
    envelope_area = _envelope_area(length, width, eave_height, ridge_height)
    volume = _volume(length, width, eave_height, ridge_height)

    t_external = params.external_temp_c
    rh_external = params.external_rh_pct
    daylight = max(params.daylight_hours, 1.0)

    irradiance = _solar_irradiance_w_m2(params.solar_radiation_mj_m2_day, daylight)
    q_solar = irradiance * params.materials.transmittance * 0.72

    system = normalize_cultivation_system(params.crop.system)
    tier_count = params.crop.layout.tier_count
    et_factor = CULTIVATION_ET_FACTOR.get(system, 1.0)
    thermal_mass = CULTIVATION_THERMAL_MASS.get(system, 1.0)

    kc = _crop_coefficient(params.crop.type, params.crop.growth_stage)
    lai_effective = effective_lai(params.crop.lai, system, tier_count)
    lai_factor = min(lai_effective / 3.0, 2.0)
    et_rate_mm_h = (params.et0_mm_day / 24.0) * kc * lai_factor * et_factor
    q_transpiration = -(et_rate_mm_h / 3600.0) * 1000.0 * LATENT_HEAT_J_KG / 1e6

    ach = ventilation_ach(params.equipment.ventilation, params.wind_speed_m_s)

    t_internal = _solve_internal_temperature(
        t_external,
        q_solar,
        params.materials.u_value,
        envelope_area,
        floor_area,
        ach,
        volume,
        q_transpiration,
    )

    cool_delta, rh_cool_delta = cooling_effect(params.equipment.cooling)
    t_internal += cool_delta

    temp_deficit = params.heating_setpoint_c - t_internal
    q_heating = heating_flux_w_m2(params.equipment.heating, temp_deficit)
    if q_heating > 0:
        t_internal += q_heating / max(params.materials.u_value * 2.5, 1.0)

    t_internal = (t_internal - t_external) / thermal_mass + t_external

    q_conduction = -params.materials.u_value * (envelope_area / floor_area) * (t_internal - t_external)
    q_ventilation = -RHO_AIR * CP_AIR * ach * volume / (3600.0 * floor_area) * (t_internal - t_external)
    q_net_delta = q_solar + q_transpiration + q_ventilation + q_conduction + q_heating

    internal_rh = min(
        95.0,
        max(
            30.0,
            rh_external + (t_external - t_internal) * 1.8 + et_rate_mm_h * 0.5 + rh_cool_delta,
        ),
    )
    vpd = calculate_vpd_kpa(t_internal, relative_humidity_pct=internal_rh)

    heatmap = _generate_heatmap(
        rows=max(int(length / 2), 4),
        cols=max(int(width / 2), 4),
        base_temp=t_internal,
        t_external=t_external,
        q_solar=q_solar,
    )

    return ThermalResult(
        thermal_balance=ThermalBalance(
            q_solar=round(q_solar, 1),
            q_transpiration=round(q_transpiration, 1),
            q_ventilation=round(q_ventilation, 1),
            q_conduction=round(q_conduction, 1),
            q_net_delta=round(q_net_delta, 1),
        ),
        internal_temp_c=round(t_internal, 1),
        external_temp_c=round(t_external, 1),
        internal_rh_pct=round(internal_rh, 1),
        vpd_kpa=round(vpd, 3),
        ventilation_ach=round(ach, 2),
        heatmap_matrix=heatmap,
    )


def _generate_heatmap(
    rows: int,
    cols: int,
    base_temp: float,
    t_external: float,
    q_solar: float,
) -> list[list[float]]:
    """Generate a spatial temperature grid with edge cooling and center heating."""
    matrix: list[list[float]] = []
    center_r = (rows - 1) / 2.0
    center_c = (cols - 1) / 2.0
    max_dist = math.sqrt(center_r**2 + center_c**2) or 1.0
    solar_boost = q_solar * 0.015

    for row in range(rows):
        row_data: list[float] = []
        for col in range(cols):
            dist = math.sqrt((row - center_r) ** 2 + (col - center_c) ** 2)
            edge_factor = dist / max_dist
            temp = base_temp + solar_boost * (1.0 - edge_factor * 0.6)
            temp -= edge_factor * max(base_temp - t_external, 0) * 0.08
            row_data.append(round(temp, 2))
        matrix.append(row_data)

    return matrix
