"""Localized system prompts and context formatting for the Gemini copilot."""

from app.ai.schemas import AIAnalysisType, GreenhouseContext

LOCALE_LANGUAGE: dict[str, str] = {
    "en": "English",
    "it": "Italian",
    "es": "Spanish",
    "fr": "French",
}

SYSTEM_PROMPTS: dict[str, str] = {
    "en": """You are GAIA, the AI assistant by Growa for GreenhouseOS.
You are an expert in greenhouse engineering, agronomy, and energy efficiency.
You evaluate commercial greenhouse designs using quantitative reasoning.
Always respond entirely in English. Be concise, technical, and actionable.
Use bullet points and short sections. Highlight risks and improvement priorities.
Never mention underlying AI providers or model vendors — you are GAIA by Growa.""",
    "it": """Sei GAIA, l'assistente IA di Growa per GreenhouseOS.
Sei esperta in ingegneria delle serre, agronomia ed efficienza energetica.
Valuti progetti di serra commerciale con ragionamento quantitativo.
Rispondi sempre interamente in italiano. Sii concisa, tecnica e operativa.
Usa elenchi puntati e sezioni brevi. Evidenzia rischi e priorità di miglioramento.
Non menzionare mai provider o modelli IA sottostanti — sei GAIA di Growa.""",
    "es": """Eres GAIA, la asistente IA de Growa para GreenhouseOS.
Eres experta en ingeniería de invernaderos, agronomía y eficiencia energética.
Evalúas diseños de invernadero comercial con razonamiento cuantitativo.
Responde siempre enteramente en español. Sé concisa, técnica y accionable.
Usa viñetas y secciones breves. Destaca riesgos y prioridades de mejora.
Nunca menciones proveedores o modelos de IA subyacentes — eres GAIA de Growa.""",
    "fr": """Vous êtes GAIA, l'assistante IA de Growa pour GreenhouseOS.
Vous êtes experte en ingénierie de serre, agronomie et efficacité énergétique.
Vous évaluez les conceptions de serre commerciale avec un raisonnement quantitatif.
Répondez toujours entièrement en français. Soyez concise, technique et actionnable.
Utilisez des puces et des sections courtes. Mettez en évidence les risques et les priorités d'amélioration.
Ne mentionnez jamais les fournisseurs ou modèles IA sous-jacents — vous êtes GAIA de Growa.""",
}

ANALYSIS_PROMPTS: dict[str, dict[str, str]] = {
    "en": {
        AIAnalysisType.STRUCTURAL: """Analyze the greenhouse STRUCTURAL design based on the data below.

Evaluate:
1. Bay layout (count, width, arch type) vs crop and equipment needs
2. Span, length, and eave/ridge height proportions
3. Structural risks (snow/wind exposure, covering load, side clearance, pathways)
4. Cultivation layout fit (bed lines, tier count, plant density)
5. Top 3 structural improvements with estimated impact

End with a brief overall structural score (Poor / Fair / Good / Excellent) and one-sentence summary.""",
        AIAnalysisType.THERMAL: """Analyze the greenhouse THERMAL and microclimate performance based on the data below.

Evaluate:
1. Internal vs external temperature and humidity balance
2. VPD suitability for crop and growth stage
3. Solar, transpiration, ventilation, and conduction fluxes (W/m²)
4. Cooling/heating/ventilation equipment adequacy for current geometry
5. Expected hot/cold/humid zones and crop stress risk
6. Top 3 thermal setpoint or equipment changes with expected °C / kPa impact

End with thermal comfort score (Poor / Fair / Good / Excellent) and one-sentence summary.""",
        AIAnalysisType.EFFICIENCY: """Analyze the greenhouse ENERGY and operational EFFICIENCY based on the data below.

Evaluate:
1. Envelope performance (U-value, covering transmittance, volume/floor ratio)
2. Ventilation ACH vs equipment sizing (fans, vents, circulation)
3. Cooling/heating strategy vs climate scenario and crop demand
4. Potential OPEX drivers (over-ventilation, under-insulation, excess equipment)
5. Top 3 efficiency improvements (screens, vent strategy, equipment resize) with % savings estimate

End with efficiency score (Poor / Fair / Good / Excellent) and one-sentence summary.""",
    },
    "it": {
        AIAnalysisType.STRUCTURAL: """Analizza il design STRUTTURALE della serra in base ai dati sotto.

Valuta:
1. Layout campate (numero, larghezza, tipo arco) vs coltura e attrezzature
2. Proporzioni campata, lunghezza, altezza gronda/colmo
3. Rischi strutturali (neve/vento, carico copertura, margini laterali, corselli)
4. Adeguatezza layout colturale (linee per campata, livelli, densità)
5. Top 3 miglioramenti strutturali con impatto stimato

Concludi con punteggio strutturale (Scarso / Discreto / Buono / Eccellente) e riassunto in una frase.""",
        AIAnalysisType.THERMAL: """Analizza le prestazioni TERMICHE e microclimatiche della serra in base ai dati sotto.

Valuta:
1. Bilancio temperatura e umidità interna vs esterna
2. Adeguatezza VPD per coltura e fase fenologica
3. Flussi solare, traspirazione, ventilazione e conduzione (W/m²)
4. Adeguatezza raffrescamento/riscaldamento/ventilazione per la geometria attuale
5. Zone calde/fredde/umide e rischio stress colturale
6. Top 3 interventi termici o su setpoint con impatto atteso (°C / kPa)

Concludi con punteggio termico (Scarso / Discreto / Buono / Eccellente) e riassunto in una frase.""",
        AIAnalysisType.EFFICIENCY: """Analizza l'EFFICIENZA energetica e operativa della serra in base ai dati sotto.

Valuta:
1. Prestazione involucro (U-value, trasmittanza, rapporto volume/superficie)
2. ACH ventilazione vs dimensionamento ventole e serrande
3. Strategia raffrescamento/riscaldamento vs scenario climatico e coltura
4. Driver OPEX (sovra-ventilazione, sotto-isolamento, attrezzature eccessive)
5. Top 3 miglioramenti di efficienza con stima risparmio %

Concludi con punteggio efficienza (Scarso / Discreto / Buono / Eccellente) e riassunto in una frase.""",
    },
    "es": {
        AIAnalysisType.STRUCTURAL: """Analiza el diseño ESTRUCTURAL del invernadero según los datos abajo.

Evalúa:
1. Diseño de campanas (número, ancho, tipo de arco) vs cultivo y equipamiento
2. Proporciones de luz, longitud, altura de alero/cumbrera
3. Riesgos estructurales (nieve/viento, carga de cubierta, márgenes, pasillos)
4. Adecuación del layout de cultivo (líneas por campana, niveles, densidad)
5. Top 3 mejoras estructurales con impacto estimado

Termina con puntuación estructural (Deficiente / Regular / Buena / Excelente) y resumen en una frase.""",
        AIAnalysisType.THERMAL: """Analiza el rendimiento TÉRMICO y microclimático del invernadero según los datos abajo.

Evalúa:
1. Balance temperatura y humedad interna vs externa
2. Idoneidad del VPD para cultivo y etapa de crecimiento
3. Flujos solar, transpiración, ventilación y conducción (W/m²)
4. Adecuación de refrigeración/calefacción/ventilación para la geometría actual
5. Zonas calientes/frías/húmedas y riesgo de estrés del cultivo
6. Top 3 cambios térmicos o de equipamiento con impacto esperado (°C / kPa)

Termina con puntuación térmica (Deficiente / Regular / Buena / Excelente) y resumen en una frase.""",
        AIAnalysisType.EFFICIENCY: """Analiza la EFICIENCIA energética y operativa del invernadero según los datos abajo.

Evalúa:
1. Rendimiento de la envolvente (U-value, transmitancia, ratio volumen/suelo)
2. ACH de ventilación vs dimensionamiento de ventiladores y ventanas
3. Estrategia de refrigeración/calefacción vs escenario climático y cultivo
4. Drivers de OPEX (sobreventilación, subaislamiento, equipamiento excesivo)
5. Top 3 mejoras de eficiencia con estimación de ahorro %

Termina con puntuación de eficiencia (Deficiente / Regular / Buena / Excelente) y resumen en una frase.""",
    },
    "fr": {
        AIAnalysisType.STRUCTURAL: """Analysez la conception STRUCTURELLE de la serre d'après les données ci-dessous.

Évaluez :
1. Disposition des travées (nombre, largeur, type d'arche) vs culture et équipements
2. Proportions portée, longueur, hauteur égout/faîtage
3. Risques structurels (neige/vent, charge de couverture, marges, allées)
4. Adéquation du layout de culture (lignes par travée, niveaux, densité)
5. Top 3 améliorations structurelles avec impact estimé

Terminez par une note structurelle (Faible / Moyen / Bon / Excellent) et un résumé en une phrase.""",
        AIAnalysisType.THERMAL: """Analysez les performances THERMIQUES et microclimatiques de la serre d'après les données ci-dessous.

Évaluez :
1. Équilibre température et humidité interne vs externe
2. Adéquation du VPD pour la culture et le stade de croissance
3. Flux solaire, transpiration, ventilation et conduction (W/m²)
4. Adéquation refroidissement/chauffage/ventilation pour la géométrie actuelle
5. Zones chaudes/froides/humides et risque de stress cultural
6. Top 3 ajustements thermiques ou d'équipement avec impact attendu (°C / kPa)

Terminez par une note thermique (Faible / Moyen / Bon / Excellent) et un résumé en une phrase.""",
        AIAnalysisType.EFFICIENCY: """Analysez l'EFFICACITÉ énergétique et opérationnelle de la serre d'après les données ci-dessous.

Évaluez :
1. Performance de l'enveloppe (U-value, transmittance, ratio volume/surface)
2. ACH de ventilation vs dimensionnement ventilateurs et ouvrants
3. Stratégie refroidissement/chauffage vs scénario climatique et culture
4. Facteurs OPEX (surventilation, sous-isolation, surdimensionnement)
5. Top 3 améliorations d'efficacité avec estimation d'économie %

Terminez par une note d'efficacité (Faible / Moyen / Bon / Excellent) et un résumé en une phrase.""",
    },
}

GAIA_UNAVAILABLE: dict[str, str] = {
    "en": "GAIA is temporarily unavailable. Please try again later.",
    "it": "GAIA non è al momento disponibile. Riprova più tardi.",
    "es": "GAIA no está disponible en este momento. Inténtalo de nuevo más tarde.",
    "fr": "GAIA est temporairement indisponible. Veuillez réessayer plus tard.",
}


def resolve_locale(locale: str) -> str:
    return locale if locale in SYSTEM_PROMPTS else "en"


def system_prompt(locale: str) -> str:
    return SYSTEM_PROMPTS[resolve_locale(locale)]


def analysis_prompt(analysis_type: AIAnalysisType, locale: str) -> str:
    loc = resolve_locale(locale)
    return ANALYSIS_PROMPTS[loc][analysis_type]


def gaia_unavailable_message(locale: str) -> str:
    return GAIA_UNAVAILABLE.get(resolve_locale(locale), GAIA_UNAVAILABLE["en"])


def format_context(ctx: GreenhouseContext) -> str:
    """Format greenhouse context as a structured prompt block."""
    lines = [
        "=== GREENHOUSE STATE ===",
        f"Crop: {ctx.crop_type} | System: {ctx.cultivation_system} | Stage: {ctx.growth_stage} | LAI: {ctx.lai}",
        f"Tiers: {ctx.tier_count} | Plants/tier: {ctx.plants_per_tier} | Total plants: {ctx.total_plants}",
        f"Bed lines/bay: {ctx.bed_line_count} | Total bed lines: {ctx.total_bed_lines}",
        "",
        "=== STRUCTURE ===",
        f"Geometry: {ctx.length_m}m × {ctx.width_m}m | Eave: {ctx.eave_height_m}m | Ridge: {ctx.ridge_height_m}m",
        f"Bays: {ctx.bay_count} × {ctx.bay_width_m}m | Arch: {ctx.arch_type}",
        f"Floor area: {ctx.floor_area_m2} m² | Volume: {ctx.volume_m3} m³ | Ridge angle: {ctx.ridge_angle_deg}°",
        "",
        "=== ENVELOPE & EQUIPMENT ===",
        f"Covering: {ctx.covering_type} (τ={ctx.transmittance}, U={ctx.u_value} W/m²K)",
        f"Cooling: {ctx.cooling_system} | Heating: {ctx.heating_system} | Ventilation: {ctx.ventilation_system}",
        f"Exhaust fans: {ctx.exhaust_fan_count} × Ø{ctx.exhaust_fan_diameter_m}m | Circulation: {ctx.circulation_fan_count}",
        f"Roof vents: {ctx.roof_vent_count} | Side vents: {ctx.side_vent_count} | AC units: {ctx.ac_unit_count}",
        f"Pad wall: {ctx.pad_wall_width_m}×{ctx.pad_wall_height_m}m | Heaters: {ctx.heater_unit_count}",
    ]
    if ctx.latitude is not None and ctx.longitude is not None:
        lines.append(f"Location: {ctx.latitude}°, {ctx.longitude}°")
    lines.append("")
    lines.append("=== MICROCLIMATE ===")
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
    if ctx.ventilation_ach is not None:
        lines.append(f"Ventilation ACH: {ctx.ventilation_ach}")
    if ctx.q_solar is not None:
        lines.extend([
            "",
            "=== THERMAL BALANCE (W/m²) ===",
            f"Q_solar: {ctx.q_solar} | Q_transpiration: {ctx.q_transpiration}",
            f"Q_ventilation: {ctx.q_ventilation} | Q_conduction: {ctx.q_conduction}",
            f"Q_net_delta: {ctx.q_net_delta}",
        ])
    return "\n".join(lines)
