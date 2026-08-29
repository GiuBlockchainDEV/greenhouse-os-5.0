"""Shade / thermal screen transmittance helpers."""

CLOSED_SCREEN_TRANSMITTANCE = 0.30


def effective_solar_transmittance(
    cover_transmittance: float,
    installed: bool,
    deployment_pct: float,
) -> float:
    """Combined glazing + retractable screen solar transmittance (0–1)."""
    if not installed or deployment_pct <= 0:
        return cover_transmittance

    deploy = max(0.0, min(100.0, deployment_pct)) / 100.0
    screen_factor = 1.0 - deploy * (1.0 - CLOSED_SCREEN_TRANSMITTANCE)
    return cover_transmittance * screen_factor
