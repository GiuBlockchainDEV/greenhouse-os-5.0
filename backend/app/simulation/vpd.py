"""Vapor Pressure Deficit (VPD) agronomic metric calculations."""

from app.simulation.psychrometrics import (
    actual_vapor_pressure_from_dewpoint,
    actual_vapor_pressure_from_rh,
    saturation_vapor_pressure_kpa,
)


def calculate_vpd_kpa(
    temperature_c: float,
    relative_humidity_pct: float | None = None,
    dewpoint_c: float | None = None,
) -> float:
    """
    Calculate Vapor Pressure Deficit (VPD) in kilopascals.

    VPD = es(T) - ea

    Optimal greenhouse VPD ranges vary by crop and growth stage:
    - Seedling: 0.4–0.8 kPa
    - Vegetative: 0.8–1.2 kPa
    - Generative: 1.0–1.5 kPa

    Args:
        temperature_c: Air temperature in degrees Celsius.
        relative_humidity_pct: Relative humidity percentage (0–100).
        dewpoint_c: Alternative dew-point temperature in degrees Celsius.

    Returns:
        VPD in kilopascals (always >= 0).

    Raises:
        ValueError: If neither humidity nor dew-point is provided.
    """
    es = saturation_vapor_pressure_kpa(temperature_c)

    if dewpoint_c is not None:
        ea = actual_vapor_pressure_from_dewpoint(dewpoint_c)
    elif relative_humidity_pct is not None:
        ea = actual_vapor_pressure_from_rh(temperature_c, relative_humidity_pct)
    else:
        raise ValueError("Either relative_humidity_pct or dewpoint_c must be provided")

    return max(0.0, es - ea)


def vpd_stress_index(vpd_kpa: float, crop_optimal_max_kpa: float = 1.5) -> float:
    """
    Normalized VPD stress index (0 = optimal, 1 = severe stress).

    Args:
        vpd_kpa: Current VPD in kilopascals.
        crop_optimal_max_kpa: Upper bound of optimal VPD for the crop.

    Returns:
        Stress index between 0.0 and 1.0.
    """
    if vpd_kpa <= crop_optimal_max_kpa:
        return 0.0
    excess = vpd_kpa - crop_optimal_max_kpa
    return min(1.0, excess / crop_optimal_max_kpa)
