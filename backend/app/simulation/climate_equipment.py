"""Climate equipment effects on greenhouse energy balance."""

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


def cooling_effect(cooling_system: str) -> tuple[float, float]:
    """Return (temp_delta_c, rh_delta_pct) from active cooling."""
    return (
        COOLING_DELTA_C.get(cooling_system, 0.0),
        COOLING_RH_BOOST.get(cooling_system, 0.0),
    )


def heating_flux_w_m2(heating_system: str, temp_deficit_c: float) -> float:
    """Heating power flux when internal temp is below setpoint."""
    if temp_deficit_c <= 0:
        return 0.0
    base = HEATING_POWER_W_M2.get(heating_system, 0.0)
    return base * min(temp_deficit_c / 5.0, 1.5)


def ventilation_ach(ventilation_system: str, wind_speed_m_s: float) -> float:
    """Effective air changes per hour from ventilation configuration."""
    base = VENTILATION_ACH_BASE.get(ventilation_system, 2.0)
    wind_bonus = 0.3 * wind_speed_m_s
    buoyancy = 0.5 if ventilation_system.startswith("natural") else 0.0
    return base + wind_bonus + buoyancy
