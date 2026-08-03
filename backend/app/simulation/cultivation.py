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


def cultivation_area_m2(
    length: float,
    width: float,
    tier_count: int,
    aisle_width_m: float = 0.8,
) -> float:
    """Total active cultivation area accounting for tiers and aisles."""
    tiers = max(tier_count, 1)
    usable_width = max(width - aisle_width_m * max(tiers - 1, 0), width * 0.6)
    return length * usable_width * tiers
