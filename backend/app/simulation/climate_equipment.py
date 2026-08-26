"""Climate equipment effects on greenhouse energy balance."""

import math

from app.simulation.schemas import ClimateEquipmentSizingInput

COOLING_DELTA_C: dict[str, float] = {
    "none": 0.0,
    "fan_and_pad": -6.0,
    "evaporative": -4.5,
    "mechanical_ac": -10.0,
    "high_pressure_fog": -5.0,
}

COOLING_RH_BOOST: dict[str, float] = {
    "none": 0.0,
    "fan_and_pad": 12.0,
    "evaporative": 10.0,
    "mechanical_ac": -8.0,
    "high_pressure_fog": 15.0,
}

HEATING_POWER_W_M2: dict[str, float] = {
    "none": 0.0,
    "hot_water_pipes": 120.0,
    "unit_heater": 180.0,
    "air_heater": 150.0,
    "geothermal": 90.0,
}

VENTILATION_ACH_BASE: dict[str, float] = {
    "natural_ridge": 1.2,
    "natural_gable": 1.0,
    "roof_vents": 2.5,
    "side_vents": 2.0,
    "forced_exhaust": 4.0,
    "combined": 5.5,
}


DEFAULT_EXHAUST_DIAM_M = 1.2
DEFAULT_EXHAUST_COUNT = 4
DEFAULT_ROOF_EXHAUST_DIAM_M = 1.0
DEFAULT_ROOF_EXHAUST_COUNT = 1
DEFAULT_PAD_WIDTH_M = 8.0
DEFAULT_PAD_HEIGHT_M = 2.0
DEFAULT_AC_COUNT = 2
DEFAULT_AC_WIDTH_M = 1.8
DEFAULT_FOG_LINES = 4
DEFAULT_HEATER_COUNT = 2


def _fan_flow_units(diameter_m: float, count: int, ref_diameter_m: float) -> float:
    if count <= 0 or diameter_m <= 0:
        return 0.0
    ratio = diameter_m / ref_diameter_m
    return count * ratio * ratio


def exhaust_capacity_factor(sizing: ClimateEquipmentSizingInput) -> float:
    actual = _fan_flow_units(
        sizing.exhaust_fan_diameter_m,
        sizing.exhaust_fan_count,
        DEFAULT_EXHAUST_DIAM_M,
    ) + _fan_flow_units(
        sizing.roof_exhaust_fan_diameter_m,
        sizing.roof_exhaust_fan_count,
        DEFAULT_ROOF_EXHAUST_DIAM_M,
    )
    baseline = _fan_flow_units(
        DEFAULT_EXHAUST_DIAM_M,
        DEFAULT_EXHAUST_COUNT,
        DEFAULT_EXHAUST_DIAM_M,
    ) + _fan_flow_units(
        DEFAULT_ROOF_EXHAUST_DIAM_M,
        DEFAULT_ROOF_EXHAUST_COUNT,
        DEFAULT_ROOF_EXHAUST_DIAM_M,
    )
    return actual / max(baseline, 0.1)


def pad_capacity_factor(sizing: ClimateEquipmentSizingInput) -> float:
    actual = sizing.pad_wall_width_m * sizing.pad_wall_height_m
    baseline = DEFAULT_PAD_WIDTH_M * DEFAULT_PAD_HEIGHT_M
    return actual / max(baseline, 0.1)


def ac_capacity_factor(sizing: ClimateEquipmentSizingInput) -> float:
    actual = sizing.ac_unit_count * sizing.ac_unit_width_m
    baseline = DEFAULT_AC_COUNT * DEFAULT_AC_WIDTH_M
    return actual / max(baseline, 0.1)


def fog_capacity_factor(sizing: ClimateEquipmentSizingInput) -> float:
    return sizing.fog_line_count / max(DEFAULT_FOG_LINES, 1)


def heater_capacity_factor(sizing: ClimateEquipmentSizingInput) -> float:
    return sizing.heater_unit_count / max(DEFAULT_HEATER_COUNT, 1)


def cooling_effect(cooling_system: str) -> tuple[float, float]:
    """Return (temp_delta_c, rh_delta_pct) from active cooling."""
    return (
        COOLING_DELTA_C.get(cooling_system, 0.0),
        COOLING_RH_BOOST.get(cooling_system, 0.0),
    )


def cooling_effect_with_sizing(
    cooling_system: str,
    sizing: ClimateEquipmentSizingInput,
    length: float,
    width: float,
    eave_height: float,
) -> tuple[float, float]:
    """Scale cooling effect by installed pad/AC capacity."""
    delta, rh = cooling_effect(cooling_system)
    if cooling_system == "fan_and_pad":
        pad_capacity = pad_capacity_factor(sizing)
        exhaust_capacity = exhaust_capacity_factor(sizing)
        delta *= (0.35 + pad_capacity * 0.65) * (0.55 + exhaust_capacity * 0.65)
        rh += (pad_capacity - 1.0) * 6.0
        rh -= (exhaust_capacity - 1.0) * 5.0
    elif cooling_system == "evaporative":
        delta *= 0.45 + pad_capacity_factor(sizing) * 0.75
    elif cooling_system == "mechanical_ac":
        delta *= 0.45 + ac_capacity_factor(sizing) * 0.85
        rh -= (ac_capacity_factor(sizing) - 1.0) * 4.0
    elif cooling_system == "high_pressure_fog":
        delta *= 0.45 + fog_capacity_factor(sizing) * 0.85
        rh += (fog_capacity_factor(sizing) - 1.0) * 8.0
    return delta, rh


def heating_flux_w_m2(heating_system: str, temp_deficit_c: float) -> float:
    """Heating power flux when internal temp is below setpoint."""
    if temp_deficit_c <= 0:
        return 0.0
    base = HEATING_POWER_W_M2.get(heating_system, 0.0)
    return base * min(temp_deficit_c / 5.0, 1.5)


def heating_flux_with_sizing(
    heating_system: str,
    temp_deficit_c: float,
    sizing: ClimateEquipmentSizingInput,
) -> float:
    """Scale heating flux by installed heater/pipe rows."""
    base = heating_flux_w_m2(heating_system, temp_deficit_c)
    if heating_system == "geothermal":
        return base * min(max(sizing.pipe_row_count, 1), 8) / 3.0
    if heating_system in {"unit_heater", "air_heater"}:
        return base * heater_capacity_factor(sizing)
    return base


def ventilation_ach(ventilation_system: str, wind_speed_m_s: float) -> float:
    """Effective air changes per hour from ventilation configuration."""
    base = VENTILATION_ACH_BASE.get(ventilation_system, 2.0)
    wind_bonus = 0.3 * wind_speed_m_s
    buoyancy = 0.5 if ventilation_system.startswith("natural") else 0.0
    return base + wind_bonus + buoyancy


def ventilation_ach_with_sizing(
    ventilation_system: str,
    wind_speed_m_s: float,
    sizing: ClimateEquipmentSizingInput,
    length: float,
    width: float,
) -> float:
    """Add ACH contribution from fan throat area and vent openings."""
    base = ventilation_ach(ventilation_system, wind_speed_m_s)
    floor_area = max(length * width, 1.0)

    fan_area = sizing.exhaust_fan_count * math.pi * (sizing.exhaust_fan_diameter_m / 2) ** 2
    fan_area += sizing.roof_exhaust_fan_count * math.pi * (sizing.roof_exhaust_fan_diameter_m / 2) ** 2
    vent_area = sizing.roof_vent_count * sizing.roof_vent_width_m * 1.2
    vent_area += sizing.side_vent_count * sizing.side_vent_height_m * 1.8

    forced_boost = (fan_area / floor_area) * 8.0 + (vent_area / floor_area) * 2.5
    circulation_boost = min(sizing.circulation_fan_count, 24) * 0.15
    return base + forced_boost + circulation_boost
