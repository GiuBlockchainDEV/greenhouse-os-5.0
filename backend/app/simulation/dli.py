"""Daily Light Integral (DLI) calculations for greenhouse photobiology."""

from app.simulation.constants import PAR_FRACTION, SECONDS_PER_HOUR, UMOL_TO_MOL


def calculate_dli_from_par(
    par_umol_m2_s: float,
    photoperiod_hours: float,
) -> float:
    """
    Calculate Daily Light Integral from instantaneous PAR and photoperiod.

    DLI (mol m^-2 day^-1) = PAR (μmol m^-2 s^-1) × photoperiod (s) × 10^-6

    Args:
        par_umol_m2_s: Photosynthetically Active Radiation in μmol m^-2 s^-1.
        photoperiod_hours: Effective daylight duration in hours.

    Returns:
        DLI in mol m^-2 day^-1.
    """
    photoperiod_seconds = photoperiod_hours * SECONDS_PER_HOUR
    return par_umol_m2_s * photoperiod_seconds * UMOL_TO_MOL


def calculate_dli_from_solar_radiation(
    solar_radiation_mj_m2_day: float,
    transmittance: float = 1.0,
) -> float:
    """
    Estimate DLI from daily global solar radiation (FAO-56 based approximation).

    Uses the conversion: DLI ≈ 0.0864 × PAR_fraction × Rs × transmittance
    where Rs is extraterrestrial-adjusted solar radiation in MJ m^-2 day^-1.

    Args:
        solar_radiation_mj_m2_day: Daily solar radiation in MJ m^-2 day^-1.
        transmittance: Covering material transmittance (0–1).

    Returns:
        Estimated DLI in mol m^-2 day^-1.
    """
    clamped_transmittance = max(0.0, min(transmittance, 1.0))
    return 0.0864 * PAR_FRACTION * solar_radiation_mj_m2_day * clamped_transmittance


def dli_adequacy_index(
    dli_mol_m2_day: float,
    crop_requirement_mol_m2_day: float,
) -> float:
    """
    Ratio of actual DLI to crop requirement (1.0 = fully adequate).

    Args:
        dli_mol_m2_day: Calculated DLI in mol m^-2 day^-1.
        crop_requirement_mol_m2_day: Crop-specific DLI requirement.

    Returns:
        Adequacy index (0–2+, values >1 indicate surplus light).
    """
    if crop_requirement_mol_m2_day <= 0:
        return 0.0
    return dli_mol_m2_day / crop_requirement_mol_m2_day
