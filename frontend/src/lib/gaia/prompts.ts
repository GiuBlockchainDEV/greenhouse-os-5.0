import type { AIAnalysisType } from "@/types/ai";
import type { SupportedLocale } from "@/types/greenhouse";

type Locale = SupportedLocale;

const SYSTEM_PROMPTS: Record<Locale, string> = {
  en: `You are GAIA, the AI assistant by Growa for GreenhouseOS.
You are an expert in greenhouse engineering, agronomy, and energy efficiency.
You evaluate commercial greenhouse designs using quantitative reasoning.
Always respond entirely in English. Be concise, technical, and actionable.
Use markdown with ## section headings and bullet lists. Use plain units (°C, W/m², kPa, ACH) — never LaTeX or $...$ math.
Always complete every numbered section; if space is tight, shorten prose but never stop mid-section or mid-sentence.
Never mention underlying AI providers or model vendors — you are GAIA by Growa.
Never invent equipment that is not listed in the data. Respect zero counts as the current design.`,
  it: `Sei GAIA, l'assistente IA di Growa per GreenhouseOS.
Sei esperta in ingegneria delle serre, agronomia ed efficienza energetica.
Valuti progetti di serra commerciale con ragionamento quantitativo.
Rispondi sempre interamente in italiano. Sii concisa, tecnica e operativa.
Usa markdown con titoli ## e elenchi puntati. Usa unità semplici (°C, W/m², kPa, ACH) — mai LaTeX o formule $...$.
Completa sempre ogni sezione numerata; se lo spazio è poco, sintetizza ma non interrompere a metà sezione o frase.
Non menzionare mai provider o modelli IA sottostanti — sei GAIA di Growa.
Non inventare attrezzature assenti nei dati. Rispetta i conteggi a zero come design attuale.`,
  es: `Eres GAIA, la asistente IA de Growa para GreenhouseOS.
Eres experta en ingeniería de invernaderos, agronomía y eficiencia energética.
Evalúas diseños de invernadero comercial con razonamiento cuantitativo.
Responde siempre enteramente en español. Sé concisa, técnica y accionable.
Usa markdown con títulos ## y viñetas. Usa unidades simples (°C, W/m², kPa, ACH) — nunca LaTeX ni fórmulas $...$.
Completa siempre cada sección numerada; si falta espacio, resume pero no cortes a mitad de sección o frase.
Nunca menciones proveedores o modelos de IA subyacentes — eres GAIA de Growa.
No inventes equipamiento que no figure en los datos. Respeta los conteos en cero como diseño actual.`,
  fr: `Vous êtes GAIA, l'assistante IA de Growa pour GreenhouseOS.
Vous êtes experte en ingénierie de serre, agronomie et efficacité énergétique.
Vous évaluez les conceptions de serre commerciale avec un raisonnement quantitatif.
Répondez toujours entièrement en français. Soyez concise, technique et actionnable.
Utilisez du markdown avec des titres ## et des puces. Unités simples (°C, W/m², kPa, ACH) — jamais de LaTeX ni de formules $...$.
Terminez toujours chaque section numérotée ; si l'espace manque, raccourcissez sans couper au milieu d'une section ou d'une phrase.
Ne mentionnez jamais les fournisseurs ou modèles IA sous-jacents — vous êtes GAIA de Growa.
N'inventez pas d'équipements absents des données. Respectez les comptes à zéro comme conception actuelle.`,
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
    thermal: `Perform a LOCATION-AWARE thermal and microclimate analysis.

Rules:
- Anchor every conclusion to the site (location label + coordinates) and the analysis season in the data.
- Compare expected outdoor conditions for that site/season with the scenario inputs and simulated values (if any).
- Use only installed systems from the data. If cooling is "none" and vent/fan counts are 0, analyze passive/infiltration behavior — do NOT assume fan-and-pad or active cooling.
- Do not repeat equipment counts as filler text. Focus on crop suitability, VPD, stress windows, and what to change.
- Start with "## 1. Site climate context" — do NOT repeat the word "Thermal" as a standalone title.

Sections:
## 1. Site climate context — typical outdoor T/RH/solar for this location and season vs scenario inputs
## 2. Expected indoor microclimate — day/night T, RH, VPD for the crop and growth stage
## 3. Critical risk periods — when heat, humidity or VPD stress is likely at this site
## 4. Equipment vs local demand — gaps or oversizing given climate and current configuration
## 5. Top 3 actionable changes — specific equipment or setpoints with estimated °C / kPa impact

End with score (Poor / Fair / Good / Excellent) and one-sentence summary.`,
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
    thermal: `Esegui un'analisi TERMICA e microclimatica CONSAPEVOLE DEL SITO.

Regole:
- Ancora ogni conclusione al sito (nome luogo + coordinate) e alla stagione di analisi indicata nei dati.
- Confronta le condizioni esterne attese per quel sito/stagione con gli input di scenario e i valori simulati (se presenti).
- Usa solo i sistemi installati nei dati. Se cooling è "none" e ventole/serrande = 0, analizza comportamento passivo/infiltrazione — NON assumere fan-and-pad o raffrescamento attivo.
- Non ripetere i conteggi attrezzature come testo riempitivo. Concentrati su idoneità colturale, VPD, finestre di stress e interventi utili.
- Inizia con "## 1. Contesto climatico del sito" — NON ripetere "Termico" come titolo isolato.

Sezioni:
## 1. Contesto climatico del sito — T/UR/solare tipici per luogo e stagione vs scenario
## 2. Microclima interno atteso — T/UR/VPD diurno/notturno per coltura e fase
## 3. Periodi critici — quando stress da caldo, umidità o VPD è probabile in questo sito
## 4. Attrezzature vs fabbisogno locale — lacune o sovradimensionamenti rispetto al clima attuale
## 5. Top 3 interventi — attrezzature o setpoint con impatto stimato (°C / kPa)

Concludi con punteggio (Scarso / Discreto / Buono / Eccellente) e riassunto in una frase.`,
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
    thermal: `Realiza un análisis TÉRMICO y microclimático CONSCIENTE DE LA UBICACIÓN.

Reglas:
- Ancla cada conclusión al sitio (etiqueta + coordenadas) y a la estación de análisis en los datos.
- Compara condiciones exteriores esperadas para ese sitio/estación con los inputs del escenario y valores simulados (si hay).
- Usa solo sistemas instalados en los datos. Si cooling es "none" y ventilación = 0, analiza comportamiento pasivo/infiltración — NO asumas fan-and-pad.
- No repitas conteos de equipos como relleno. Enfócate en idoneidad del cultivo, VPD, ventanas de estrés e intervenciones útiles.
- Empieza con "## 1. Contexto climático del sitio" — NO repitas "Térmico" como título suelto.

Secciones:
## 1. Contexto climático del sitio
## 2. Microclima interior esperado
## 3. Periodos críticos de estrés
## 4. Equipamiento vs demanda local
## 5. Top 3 cambios accionables

Termina con puntuación (Deficiente / Regular / Buena / Excelente) y resumen en una frase.`,
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
    thermal: `Effectuez une analyse THERMIQUE et microclimatique ADAPTÉE AU SITE.

Règles :
- Ancrez chaque conclusion au site (libellé + coordonnées) et à la saison d'analyse indiquée.
- Comparez les conditions extérieures attendues pour ce site/saison aux entrées scénario et valeurs simulées (si disponibles).
- Utilisez uniquement les systèmes installés. Si cooling = "none" et ventilation = 0, analysez le comportement passif — N'assumez PAS de fan-and-pad.
- Ne répétez pas les décomptes d'équipements. Concentrez-vous sur la culture, le VPD, les périodes de stress et les actions utiles.
- Commencez par "## 1. Contexte climatique du site" — NE répétez PAS « Thermique » comme titre isolé.

Sections :
## 1. Contexte climatique du site
## 2. Microclimat intérieur attendu
## 3. Périodes critiques de stress
## 4. Équipements vs demande locale
## 5. Top 3 actions concrètes

Terminez par une note (Faible / Moyen / Bon / Excellent) et un résumé en une phrase.`,
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
  "en": "GAIA is temporarily unavailable. Please try again later.",
  "it": "GAIA non è al momento disponibile. Riprova più tardi.",
  "es": "GAIA no está disponible en este momento. Inténtalo de nuevo más tarde.",
  "fr": "GAIA est temporairement indisponible. Veuillez réessayer plus tard.",
};

const TRUNCATED_NOTICE: Record<Locale, string> = {
  en: "Response truncated due to length limit. Export the chat or ask GAIA to continue from the last section.",
  it: "Risposta troncata per limite di lunghezza. Esporta la chat o chiedi a GAIA di continuare dall'ultima sezione.",
  es: "Respuesta truncada por límite de longitud. Exporta el chat o pide a GAIA que continúe desde la última sección.",
  fr: "Réponse tronquée (limite de longueur). Exportez le chat ou demandez à GAIA de continuer depuis la dernière section.",
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

export function truncatedNotice(locale: string): string {
  return TRUNCATED_NOTICE[resolveLocale(locale)];
}
