"""Agronomic indices for real-time twin responses (no external telemetry)."""


def botrytis_cinerea_risk_index(internal_rh_pct: float, vpd_kpa: float) -> float:
    """
    Simplified Botrytis pressure index (0–100) from RH and VPD.

    High risk when RH > 85% and VPD < 0.5 kPa (condensation-friendly canopy).
    """
    rh_stress = max(0.0, (internal_rh_pct - 82.0) / 18.0)
    vpd_stress = max(0.0, (0.55 - vpd_kpa) / 0.55)
    return round(min(100.0, 100.0 * (0.62 * rh_stress + 0.38 * vpd_stress)), 1)