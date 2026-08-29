import type { AIAnalysisType } from "@/types/ai";
import type { SupportedLocale } from "@/types/greenhouse";

type Locale = SupportedLocale;

const SYSTEM_PROMPTS: Record<Locale, string> = {
  en: `You are GAIA, the AI assistant by Growa for GreenhouseOS.
You are an expert in greenhouse engineering, agronomy, and energy efficiency.
You evaluate commercial greenhouse designs using quantitative reasoning.
Always respond entirely in English. Be concise, technical, and actionable.
Use bullet points and short sections. Highlight risks and improvement priorities.
Never mention underlying AI providers or model vendors — you are GAIA by Growa.`,
  it: `Sei GAIA, l'assistente IA di Growa per GreenhouseOS.
Sei esperta in ingegneria delle serre, agronomia ed efficienza energetica.
Valuti progetti di serra commerciale con ragionamento quantitativo.
Rispondi sempre interamente in italiano. Sii concisa, tecnica e operativa.
Usa elenchi puntati e sezioni brevi. Evidenzia rischi e priorità di miglioramento.
Non menzionare mai provider o modelli IA sottostanti — sei GAIA di Growa.`,
  es: `Eres GAIA, la asistente IA de Growa para GreenhouseOS.
Eres experta en ingeniería de invernaderos, agronomía y eficiencia energética.
Evalúas diseños de invernadero comercial con razonamiento cuantitativo.
Responde siempre enteramente en español. Sé concisa, técnica y accionable.
Usa viñetas y secciones breves. Destaca riesgos y prioridades de mejora.
Nunca menciones proveedores o modelos de IA subyacentes — eres GAIA de Growa.`,
  fr: `Vous êtes GAIA, l'assistante IA de Growa pour GreenhouseOS.
Vous êtes experte en ingénierie de serre, agronomie et efficacité énergétique.
Vous évaluez les conceptions de serre commerciale avec un raisonnement quantitatif.
Répondez toujours entièrement en français. Soyez concise, technique et actionnable.
Utilisez des puces et des sections courtes. Mettez en évidence les risques et les priorités d'amélioration.
Ne mentionnez jamais les fournisseurs ou modèles IA sous-jacents — vous êtes GAIA de Growa.`,
};

const ANALYSIS_PROMPTS: Record<Locale, Record<AIAnalysisType, string>> = {
  en: {
    structural: `Analyze the greenhouse STRUCTURAL design based on the data below.

Evaluate:
1. Bay layout (count, width, arch type) vs crop and equipment needs
2. Span, length, and eave/ridge height proportions
3. Structural risks (snow/wind exposure, covering load, side clearance, pathways)
4. Cultivation layout fit (bed lines, tier count, plant density)
5. Top 3 structural improvements with estimated impact

End with a brief overall structural score (Poor / Fair / Good / Excellent) and one-sentence summary.`,
    thermal: `Analyze the greenhouse THERMAL and microclimate performance based on the data below.

Evaluate:
1. Internal vs external temperature and humidity balance
2. VPD suitability for crop and growth stage
3. Solar, transpiration, ventilation, and conduction fluxes (W/m²)
4. Cooling/heating/ventilation equipment adequacy for current geometry
5. Expected hot/cold/humid zones and crop stress risk
6. Top 3 thermal setpoint or equipment changes with expected °C / kPa impact

End with thermal comfort score (Poor / Fair / Good / Excellent) and one-sentence summary.`,
    efficiency: `Analyze the greenhouse ENERGY and operational EFFICIENCY based on the data below.

Evaluate:
1. Envelope performance (U-value, covering transmittance, volume/floor ratio)
2. Ventilation ACH vs equipment sizing (fans, vents, circulation)
3. Cooling/heating strategy vs climate scenario and crop demand
4. Potential OPEX drivers (over-ventilation, under-insulation, excess equipment)
5. Top 3 efficiency improvements (screens, vent strategy, equipment resize) with % savings estimate

End with efficiency score (Poor / Fair / Good / Excellent) and one-sentence summary.`,
  },
  it: {
    structural: `Analizza il design STRUTTURALE della serra in base ai dati sotto.

Valuta:
1. Layout campate (numero, larghezza, tipo arco) vs coltura e attrezzature
2. Proporzioni campata, lunghezza, altezza gronda/colmo
3. Rischi strutturali (neve/vento, carico copertura, margini laterali, corselli)
4. Adeguatezza layout colturale (linee per campata, livelli, densità)
5. Top 3 miglioramenti strutturali con impatto stimato

Concludi con punteggio strutturale (Scarso / Discreto / Buono / Eccellente) e riassunto in una frase.`,
    thermal: `Analizza le prestazioni TERMICHE e microclimatiche della serra in base ai dati sotto.

Valuta:
1. Bilancio temperatura e umidità interna vs esterna
2. Adeguatezza VPD per coltura e fase fenologica
3. Flussi solare, traspirazione, ventilazione e conduzione (W/m²)
4. Adeguatezza raffrescamento/riscaldamento/ventilazione per la geometria attuale
5. Zone calde/fredde/umide e rischio stress colturale
6. Top 3 interventi termici o su setpoint con impatto atteso (°C / kPa)

Concludi con punteggio termico (Scarso / Discreto / Buono / Eccellente) e riassunto in una frase.`,
    efficiency: `Analizza l'EFFICIENZA energetica e operativa della serra in base ai dati sotto.

Valuta:
1. Prestazione involucro (U-value, trasmittanza, rapporto volume/superficie)
2. ACH ventilazione vs dimensionamento ventole e serrande
3. Strategia raffrescamento/riscaldamento vs scenario climatico e coltura
4. Driver OPEX (sovra-ventilazione, sotto-isolamento, attrezzature eccessive)
5. Top 3 miglioramenti di efficienza con stima risparmio %

Concludi con punteggio efficienza (Scarso / Discreto / Buono / Eccellente) e riassunto in una frase.`,
  },
  es: {
    structural: `Analiza el diseño ESTRUCTURAL del invernadero según los datos abajo.

Evalúa:
1. Diseño de campanas (número, ancho, tipo de arco) vs cultivo y equipamiento
2. Proporciones de luz, longitud, altura de alero/cumbrera
3. Riesgos estructurales (nieve/viento, carga de cubierta, márgenes, pasillos)
4. Adecuación del layout de cultivo (líneas por campana, niveles, densidad)
5. Top 3 mejoras estructurales con impacto estimado

Termina con puntuación estructural (Deficiente / Regular / Buena / Excelente) y resumen en una frase.`,
    thermal: `Analiza el rendimiento TÉRMICO y microclimático del invernadero según los datos abajo.

Evalúa:
1. Balance temperatura y humedad interna vs externa
2. Idoneidad del VPD para cultivo y etapa de crecimiento
3. Flujos solar, transpiración, ventilación y conducción (W/m²)
4. Adecuación de refrigeración/calefacción/ventilación para la geometría actual
5. Zonas calientes/frías/húmedas y riesgo de estrés del cultivo
6. Top 3 cambios térmicos o de equipamiento con impacto esperado (°C / kPa)

Termina con puntuación térmica (Deficiente / Regular / Buena / Excelente) y resumen en una frase.`,
    efficiency: `Analiza la EFICIENCIA energética y operativa del invernadero según los datos abajo.

Evalúa:
1. Rendimiento de la envolvente (U-value, transmitancia, ratio volumen/suelo)
2. ACH de ventilación vs dimensionamiento de ventiladores y ventanas
3. Estrategia de refrigeración/calefacción vs escenario climático y cultivo
4. Drivers de OPEX (sobreventilación, subaislamiento, equipamiento excesivo)
5. Top 3 mejoras de eficiencia con estimación de ahorro %

Termina con puntuación de eficiencia (Deficiente / Regular / Buena / Excelente) y resumen en una frase.`,
  },
  fr: {
    structural: `Analysez la conception STRUCTURELLE de la serre d'après les données ci-dessous.

Évaluez :
1. Disposition des travées (nombre, largeur, type d'arche) vs culture et équipements
2. Proportions portée, longueur, hauteur égout/faîtage
3. Risques structurels (neige/vent, charge de couverture, marges, allées)
4. Adéquation du layout de culture (lignes par travée, niveaux, densité)
5. Top 3 améliorations structurelles avec impact estimé

Terminez par une note structurelle (Faible / Moyen / Bon / Excellent) et un résumé en une phrase.`,
    thermal: `Analysez les performances THERMIQUES et microclimatiques de la serre d'après les données ci-dessous.

Évaluez :
1. Équilibre température et humidité interne vs externe
2. Adéquation du VPD pour la culture et le stade de croissance
3. Flux solaire, transpiration, ventilation et conduction (W/m²)
4. Adéquation refroidissement/chauffage/ventilation pour la géométrie actuelle
5. Zones chaudes/froides/humides et risque de stress cultural
6. Top 3 ajustements thermiques ou d'équipement avec impact attendu (°C / kPa)

Terminez par une note thermique (Faible / Moyen / Bon / Excellent) et un résumé en une phrase.`,
    efficiency: `Analysez l'EFFICACITÉ énergétique et opérationnelle de la serre d'après les données ci-dessous.

Évaluez :
1. Performance de l'enveloppe (U-value, transmittance, ratio volume/surface)
2. ACH de ventilation vs dimensionnement ventilateurs et ouvrants
3. Stratégie refroidissement/chauffage vs scénario climatique et culture
4. Facteurs OPEX (surventilation, sous-isolation, surdimensionnement)
5. Top 3 améliorations d'efficacité avec estimation d'économie %

Terminez par une note d'efficacité (Faible / Moyen / Bon / Excellent) et un résumé en une phrase.`,
  },
};

const GAIA_UNAVAILABLE: Record<Locale, string> = {
  en: "GAIA is temporarily unavailable. Please try again later.",
  it: "GAIA non è al momento disponibile. Riprova più tardi.",
  es: "GAIA no está disponible en este momento. Inténtalo de nuevo más tarde.",
  fr: "GAIA est temporairement indisponible. Veuillez réessayer plus tard.",
};

function resolveLocale(locale: string): Locale {
  return locale === "it" || locale === "es" || locale === "fr" ? locale : "en";
}

export function systemPrompt(locale: string): string {
  return SYSTEM_PROMPTS[resolveLocale(locale)];
}

export function analysisPrompt(analysisType: AIAnalysisType, locale: string): string {
  return ANALYSIS_PROMPTS[resolveLocale(locale)][analysisType];
}

export function gaiaUnavailableMessage(locale: string): string {
  return GAIA_UNAVAILABLE[resolveLocale(locale)];
}
