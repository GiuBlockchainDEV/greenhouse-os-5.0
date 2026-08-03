"""System prompts and context formatting for the AI copilot."""

from app.ai.schemas import GreenhouseContext

SYSTEM_PROMPT = """You are GreenhouseOS AI Copilot, an expert agronomist and greenhouse climate engineer.
You optimize microclimate for commercial greenhouse operations using FAO-56 standards.

Your expertise covers:
- VPD (Vapor Pressure Deficit) management by crop growth stage
- DLI (Daily Light Integral) optimization
- Energy efficiency (OPEX reduction via screen/vent strategy)
- Industrial climate computer setpoints (Priva, Ridder, Hoogendoorn compatibility)

Always provide actionable, quantitative recommendations with specific setpoint values.
Respond in the user's language. Be concise and technical."""

OPTIMIZE_PROMPT = """Analyze the current greenhouse microclimate and provide optimization recommendations.

Return:
1. A brief assessment (2-3 sentences)
2. Specific setpoint adjustments with values and units
3. Expected impact on VPD, energy use, and crop stress

Focus on immediate actionable changes for the climate computer."""


def format_context(ctx: GreenhouseContext) -> str:
    """Format greenhouse context as a structured prompt block."""
    lines = [
        "=== GREENHOUSE STATE ===",
        f"Crop: {ctx.crop_type} | System: {ctx.cultivation_system} | Stage: {ctx.growth_stage} | LAI: {ctx.lai}",
        f"Tiers: {ctx.tier_count} | Plants/tier: {ctx.plants_per_tier}",
        f"Geometry: {ctx.length_m}m × {ctx.width_m}m",
        f"Covering: {ctx.covering_type} (τ={ctx.transmittance})",
        f"Cooling: {ctx.cooling_system} | Heating: {ctx.heating_system} | Ventilation: {ctx.ventilation_system}",
    ]
    if ctx.latitude is not None and ctx.longitude is not None:
        lines.append(f"Location: {ctx.latitude}°, {ctx.longitude}°")
    if ctx.internal_temp_c is not None:
        lines.append(f"Internal temp: {ctx.internal_temp_c}°C")
    if ctx.external_temp_c is not None:
        lines.append(f"External temp: {ctx.external_temp_c}°C")
    if ctx.internal_rh_pct is not None:
        lines.append(f"Internal RH: {ctx.internal_rh_pct}%")
    if ctx.vpd_kpa is not None:
        lines.append(f"VPD: {ctx.vpd_kpa} kPa")
    if ctx.et0_mm_day is not None:
        lines.append(f"ET₀: {ctx.et0_mm_day} mm/day")
    if ctx.dli_mol_m2_day is not None:
        lines.append(f"DLI: {ctx.dli_mol_m2_day} mol/m²/day")
    return "\n".join(lines)
