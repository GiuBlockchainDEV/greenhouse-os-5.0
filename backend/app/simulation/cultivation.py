"""Cultivation system factors for thermal and agronomic modeling."""

CULTIVATION_ET_FACTOR: dict[str, float] = {
    "soil": 0.92,
    "substrate": 0.95,
    "growbed": 0.98,
    "nft": 1.05,
    "dwc": 1.08,
    "drip": 1.0,
    "aeroponic": 1.12,
    "ebb_flow": 1.02,
}

CULTIVATION_THERMAL_MASS: dict[str, float] = {
    "soil": 1.25,
    "substrate": 1.15,
    "growbed": 1.20,
    "nft": 0.85,
    "dwc": 0.90,
    "drip": 1.0,
    "aeroponic": 0.80,
    "ebb_flow": 1.05,
}

CULTIVATION_LAI_FACTOR: dict[str, float] = {
    "soil": 1.0,
    "substrate": 1.0,
    "growbed": 1.05,
    "nft": 0.95,
    "dwc": 0.90,
    "drip": 1.0,
    "aeroponic": 0.85,
    "ebb_flow": 1.0,
}

SYSTEM_SPACING_M: dict[str, float] = {
    "soil": 0.40,
    "substrate": 0.35,
    "growbed": 0.30,
    "nft": 0.25,
    "dwc": 0.30,
    "drip": 0.45,
    "aeroponic": 0.35,
    "ebb_flow": 0.30,
}


def normalize_cultivation_system(system: str) -> str:
    """Map legacy system identifiers to canonical names."""
    legacy = {
        "hydroponic_nft": "nft",
        "hydroponic_drip": "drip",
    }
    return legacy.get(system, system)


def effective_lai(base_lai: float, system: str, tier_count: int) -> float:
    """Compute tier- and system-adjusted leaf area index."""
    normalized = normalize_cultivation_system(system)
    factor = CULTIVATION_LAI_FACTOR.get(normalized, 1.0)
    tier_boost = 1.0 + (max(tier_count, 1) - 1) * 0.35
    return base_lai * factor * tier_boost


def _bay_center_z(bay_index: int, bay_width_m: float, total_width: float) -> float:
    return -total_width / 2 + bay_width_m / 2 + bay_index * bay_width_m


def _bed_area_per_bay(
    length: float,
    bay_width_m: float,
    side_clearance_m: float,
    pathway_width_m: float,
) -> float:
    usable_width = bay_width_m - 2 * side_clearance_m
    if usable_width <= pathway_width_m + 1.2:
        return 0.0
    bed_width = (usable_width - pathway_width_m) / 2
    usable_length = max(length - 2 * side_clearance_m, 0.0)
    return 2 * bed_width * usable_length


def cultivation_area_m2(
    length: float,
    width: float,
    tier_count: int,
    *,
    bay_count: int = 1,
    bay_width_m: float | None = None,
    pathway_width_m: float = 1.2,
    side_clearance_m: float = 0.6,
    aisle_width_m: float | None = None,
) -> float:
    """Total active cultivation area with beds, pathways, and vertical tiers."""
    tiers = max(tier_count, 1)
    pathway = pathway_width_m if aisle_width_m is None else aisle_width_m
    bays = max(bay_count, 1)
    per_bay_width = bay_width_m if bay_width_m is not None else width / bays

    bed_floor_area = sum(
        _bed_area_per_bay(length, per_bay_width, side_clearance_m, pathway)
        for _ in range(bays)
    )
    return bed_floor_area * tiers
