"""Greenhouse structural geometry helpers for volume and envelope calculations."""

import math


def _triangular_roof_area(length: float, width: float, eave_height: float, ridge_height: float) -> float:
    roof_rise = max(ridge_height - eave_height, 0.01)
    slope_length = math.sqrt((width / 2) ** 2 + roof_rise**2)
    return 2 * slope_length * length


def _triangular_volume(length: float, width: float, eave_height: float, ridge_height: float) -> float:
    floor = length * width
    roof_rise = max(ridge_height - eave_height, 0)
    return floor * eave_height + floor * roof_rise / 2


def _semicircular_roof_area(length: float, bay_count: int, bay_width: float) -> float:
    """Half-cylinder roof area per bay, summed across campate."""
    radius = bay_width / 2.0
    return bay_count * math.pi * radius * length


def _semicircular_volume(
    length: float,
    bay_count: int,
    bay_width: float,
    eave_height: float,
) -> float:
    radius = bay_width / 2.0
    bay_floor = length * bay_width
    semicircle_area = (math.pi * radius**2) / 2.0
    return bay_count * (bay_floor * eave_height + semicircle_area * length)


def ridge_height_for_arch(
    arch_type: str,
    eave_height: float,
    bay_width: float,
    ridge_height: float,
) -> float:
    """Return effective ridge/apex height for the selected arch profile."""
    if arch_type == "semicircular":
        return eave_height + bay_width / 2.0
    return ridge_height


def compute_envelope(
    length: float,
    width: float,
    eave_height: float,
    ridge_height: float,
    arch_type: str = "triangular",
    bay_count: int = 1,
    bay_width: float | None = None,
) -> tuple[float, float, float]:
    """
    Compute floor area, envelope area, and internal volume.

    Returns:
        (floor_area_m2, envelope_area_m2, volume_m3)
    """
    bays = max(bay_count, 1)
    span = bay_width if bay_width and bay_width > 0 else width / bays
    effective_width = span * bays

    floor_area = length * effective_width

    if arch_type == "semicircular":
        wall_area = 2 * length * eave_height + 2 * effective_width * eave_height
        roof_area = _semicircular_roof_area(length, bays, span)
        volume = _semicircular_volume(length, bays, span, eave_height)
    else:
        apex = ridge_height_for_arch(arch_type, eave_height, span, ridge_height)
        wall_area = 2 * length * eave_height + 2 * effective_width * eave_height
        roof_area = _triangular_roof_area(length, effective_width, eave_height, apex)
        volume = _triangular_volume(length, effective_width, eave_height, apex)

    return floor_area, wall_area + roof_area, volume
