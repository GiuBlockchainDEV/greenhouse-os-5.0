"""Psychrometric calculations for vapor pressure and humidity metrics."""

import math

from app.simulation.constants import (
    LATENT_HEAT_VAPORIZATION,
    MOLECULAR_WEIGHT_RATIO,
    SPECIFIC_HEAT_AIR,
    STANDARD_ATM_PRESSURE_KPA,
)


def saturation_vapor_pressure_kpa(temperature_c: float) -> float:
    """
    Saturation vapor pressure (es) at a given temperature.

    Uses the Magnus-Tetens equation validated for 0–50 °C (FAO-56 Eq. 11).

    Args:
        temperature_c: Air temperature in degrees Celsius.

    Returns:
        Saturation vapor pressure in kilopascals.
    """
    return 0.6108 * math.exp((17.27 * temperature_c) / (temperature_c + 237.3))


def actual_vapor_pressure_from_rh(
    temperature_c: float,
    relative_humidity_pct: float,
) -> float:
    """
    Actual vapor pressure (ea) derived from temperature and relative humidity.

    Args:
        temperature_c: Air temperature in degrees Celsius.
        relative_humidity_pct: Relative humidity as a percentage (0–100).

    Returns:
        Actual vapor pressure in kilopascals.
    """
    es = saturation_vapor_pressure_kpa(temperature_c)
    return es * max(0.0, min(relative_humidity_pct, 100.0)) / 100.0


def actual_vapor_pressure_from_dewpoint(dewpoint_c: float) -> float:
    """
    Actual vapor pressure from dew-point temperature.

    Args:
        dewpoint_c: Dew-point temperature in degrees Celsius.

    Returns:
        Actual vapor pressure in kilopascals.
    """
    return saturation_vapor_pressure_kpa(dewpoint_c)


def slope_saturation_vapor_pressure(temperature_c: float) -> float:
    """
    Slope of the saturation vapor pressure curve (Δ) at a given temperature.

    FAO-56 Eq. 13.

    Args:
        temperature_c: Mean air temperature in degrees Celsius.

    Returns:
        Slope Δ in kPa °C^-1.
    """
    es = saturation_vapor_pressure_kpa(temperature_c)
    return (4098.0 * es) / ((temperature_c + 237.3) ** 2)


def psychrometric_constant(
    elevation_m: float = 0.0,
    atmospheric_pressure_kpa: float | None = None,
) -> float:
    """
    Psychrometric constant (γ) for a given elevation or atmospheric pressure.

    FAO-56 Eq. 8.

    Args:
        elevation_m: Site elevation above sea level in meters.
        atmospheric_pressure_kpa: Optional explicit atmospheric pressure in kPa.

    Returns:
        Psychrometric constant γ in kPa °C^-1.
    """
    if atmospheric_pressure_kpa is None:
        atmospheric_pressure_kpa = STANDARD_ATM_PRESSURE_KPA * (
            (293.0 - 0.0065 * elevation_m) / 293.0
        ) ** 5.26

    return (
        SPECIFIC_HEAT_AIR * atmospheric_pressure_kpa
    ) / (MOLECULAR_WEIGHT_RATIO * LATENT_HEAT_VAPORIZATION)
