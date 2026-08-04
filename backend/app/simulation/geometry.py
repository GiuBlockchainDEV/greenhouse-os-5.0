"""Greenhouse structural geometry helpers for volume and envelope calculations."""

import math


def _roof_rise(eave_height: float, ridge_height: float) -> float:
    return max(ridge_height - eave_height, 0.01)


def _triangular_roof_area(length: float, width: float, eave_height: float, ridge_height: float) -> float:
    roof_rise = _roof_rise(eave_height, ridge_height)
    slope_length = math.sqrt((width / 2) ** 2 + roof_rise**2)
    return 2 * slope_length * length


def _triangular_volume(length: float, width: float, eave_height: float, ridge_height: float) -> float:
    floor = length * width
    roof_rise = max(ridge_height - eave_height, 0)
    return floor * eave_height + floor * roof_rise / 2


def _semicircular_roof_area_single_bay(
    length: float,
    bay_width: float,
    eave_height: float,
    ridge_height: float,
) -> float:
    """Arc length of a circular-segment roof with adjustable rise."""
    roof_rise = _roof_rise(eave_height, ridge_height)
    radius = (bay_width**2) / (8 * roof_rise) + roof_rise / 2
    half_angle = math.asin(min(bay_width / (2 * radius), 1.0))
    arc_length = 2 * radius * half_angle
    return arc_length * length


def _semicircular_volume_single_bay(
    length: float,
    bay_width: float,
    eave_height: float,
    ridge_height: float,
) -> float:
    roof_rise = max(ridge_height - eave_height, 0)
    bay_floor = length * bay_width
    arch_area = math.pi * bay_width * roof_rise / 4.0
    return bay_floor * eave_height + arch_area * length


def ridge_height_for_arch(
    arch_type: str,
    eave_height: float,
    bay_width: float,
    ridge_height: float,
) -> float:
    """Return effective ridge/apex height (user-controlled for both profiles)."""
    return ridge_height


def compute_envelope(
    length: float,
    width: float,
    eave_height: float,
    ridge_height: float,
    arch_type: str = "triangular",
    bay_count: int = 1,
    bay_width: float | None = None,
    bay_arch_types: list[str] | None = None,
) -> tuple[float, float, float]:
    """
    Compute floor area, envelope area, and internal volume.

    All bays share the same roof profile (arch_type).

    Returns:
        (floor_area_m2, envelope_area_m2, volume_m3)
    """
    bays = max(bay_count, 1)
    span = bay_width if bay_width and bay_width > 0 else width / bays
    effective_width = span * bays
    profile = arch_type
    if bay_arch_types:
        profile = bay_arch_types[0]

    floor_area = length * effective_width
    wall_area = 2 * length * eave_height + 2 * effective_width * eave_height

    roof_area = 0.0
    volume = 0.0
    for _ in range(bays):
        if profile == "semicircular":
            roof_area += _semicircular_roof_area_single_bay(length, span, eave_height, ridge_height)
            volume += _semicircular_volume_single_bay(length, span, eave_height, ridge_height)
        else:
            roof_area += _triangular_roof_area(length, span, eave_height, ridge_height)
            volume += _triangular_volume(length, span, eave_height, ridge_height)

    return floor_area, wall_area + roof_area, volume
