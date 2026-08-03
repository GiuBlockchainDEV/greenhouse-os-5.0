"""Rule-based climate optimizer used when external AI providers are unavailable."""

from app.ai.schemas import ClimateSetpoint, GreenhouseContext

VPD_OPTIMAL: dict[str, tuple[float, float]] = {
    "seedling": (0.4, 0.8),
    "early_vegetative": (0.6, 1.0),
    "mid_season": (0.8, 1.2),
    "late_vegetative": (0.8, 1.2),
    "generative": (1.0, 1.5),
    "harvest": (0.8, 1.0),
}


def generate_local_optimization(ctx: GreenhouseContext, locale: str) -> tuple[str, list[ClimateSetpoint]]:
    """
    Produce deterministic climate optimization from physics metrics.

    Used as fallback when no external AI API key is configured, or as
    validation layer. Returns natural-language advice and structured setpoints.
    """
    setpoints: list[ClimateSetpoint] = []
    messages: list[str] = []

    vpd = ctx.vpd_kpa or 1.0
    internal_temp = ctx.internal_temp_c or 25.0
    internal_rh = ctx.internal_rh_pct or 70.0
    vpd_min, vpd_max = VPD_OPTIMAL.get(ctx.growth_stage, (0.8, 1.2))

    if vpd < vpd_min:
        target_rh = min(internal_rh + 8, 85)
        target_temp = max(internal_temp - 1.5, 18.0)
        setpoints.extend([
            ClimateSetpoint(
                parameter="relative_humidity_setpoint",
                current_value=internal_rh,
                recommended_value=round(target_rh, 1),
                unit="%",
                rationale="Increase RH to raise VPD into optimal range for crop stage",
            ),
            ClimateSetpoint(
                parameter="heating_pipe_temp",
                current_value=internal_temp,
                recommended_value=round(target_temp, 1),
                unit="°C",
                rationale="Slightly reduce pipe temperature to limit excessive transpiration suppression",
            ),
        ])
        messages.append(
            f"VPD ({vpd:.2f} kPa) is below optimal range ({vpd_min}–{vpd_max} kPa) for {ctx.growth_stage}. "
            "Increase humidity or reduce ventilation to improve nutrient uptake."
        )
    elif vpd > vpd_max:
        target_rh = max(internal_rh - 5, 55)
        vent_pct = 25.0 if internal_temp > 30 else 15.0
        setpoints.extend([
            ClimateSetpoint(
                parameter="relative_humidity_setpoint",
                current_value=internal_rh,
                recommended_value=round(target_rh, 1),
                unit="%",
                rationale="Reduce RH setpoint to lower VPD and prevent stomatal closure",
            ),
            ClimateSetpoint(
                parameter="ventilation_lee_side",
                current_value=0.0,
                recommended_value=vent_pct,
                unit="%",
                rationale="Increase ventilation to remove excess moisture and reduce VPD stress",
            ),
        ])
        messages.append(
            f"VPD ({vpd:.2f} kPa) exceeds optimal ceiling ({vpd_max} kPa). "
            "Activate dehumidification or increase vent opening to prevent water stress."
        )
    else:
        messages.append(
            f"VPD ({vpd:.2f} kPa) is within optimal range for {ctx.growth_stage}. "
            "Maintain current setpoints with minor energy optimization."
        )
        if ctx.transmittance < 0.7:
            setpoints.append(ClimateSetpoint(
                parameter="supplemental_lighting",
                current_value=0.0,
                recommended_value=120.0,
                unit="μmol/m²/s",
                rationale="Low covering transmittance — compensate DLI with supplemental PAR",
            ))

    if internal_temp > 32.0:
        setpoints.append(ClimateSetpoint(
            parameter="shade_screen",
            current_value=0.0,
            recommended_value=60.0,
            unit="%",
            rationale="Deploy thermal shade to reduce solar load and prevent heat stress",
        ))
        messages.append(f"Internal temperature ({internal_temp:.1f}°C) is elevated. Deploy shade screen.")

    intro = _localized_intro(locale)
    content = intro + "\n\n" + "\n".join(messages)
    return content, setpoints


def _localized_intro(locale: str) -> str:
    intros = {
        "en": "GreenhouseOS Local Optimizer — analysis based on FAO-56 microclimate metrics:",
        "it": "GreenhouseOS Optimizer Locale — analisi basata su metriche microclimatiche FAO-56:",
        "es": "GreenhouseOS Optimizador Local — análisis basado en métricas de microclima FAO-56:",
        "fr": "GreenhouseOS Optimiseur Local — analyse basée sur les métriques microclimatiques FAO-56:",
    }
    return intros.get(locale, intros["en"])
