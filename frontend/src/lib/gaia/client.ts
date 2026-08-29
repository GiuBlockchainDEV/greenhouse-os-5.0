import type { AIAnalysisType, AIChatResponse, GreenhouseAIContext } from "@/types/ai";

import { formatGreenhouseContext } from "./formatContext";
import { analysisPrompt, gaiaUnavailableMessage, systemPrompt } from "./prompts";

const GEMINI_API_KEY = (import.meta.env.VITE_GEMINI_API_KEY as string | undefined)?.trim() ?? "";
const GEMINI_MODEL =
  (import.meta.env.VITE_GEMINI_MODEL as string | undefined)?.trim() || "gemini-2.0-flash";
const GEMINI_BASE_URL =
  (import.meta.env.VITE_GEMINI_BASE_URL as string | undefined)?.trim() ||
  "https://generativelanguage.googleapis.com";

interface GeminiResponse {
  candidates?: Array<{
    content?: {
      parts?: Array<{ text?: string }>;
    };
  }>;
  error?: { message?: string };
}

export function isGaiaConfigured(): boolean {
  return GEMINI_API_KEY.length > 0;
}

async function callGaia(locale: string, userContent: string): Promise<AIChatResponse> {
  if (!isGaiaConfigured()) {
    return {
      provider: "gemini",
      model: "gaia-unconfigured",
      content: gaiaUnavailableMessage(locale),
      setpoints: [],
      used_local_engine: true,
    };
  }

  const url = `${GEMINI_BASE_URL}/v1beta/models/${GEMINI_MODEL}:generateContent?key=${GEMINI_API_KEY}`;

  const response = await fetch(url, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      systemInstruction: { parts: [{ text: systemPrompt(locale) }] },
      contents: [{ role: "user", parts: [{ text: userContent }] }],
      generationConfig: { temperature: 0.35, maxOutputTokens: 2048 },
    }),
  });

  const data = (await response.json()) as GeminiResponse;

  if (!response.ok) {
    const detail = data.error?.message ?? `HTTP ${response.status}`;
    return {
      provider: "gemini",
      model: "gaia-error",
      content: `${gaiaUnavailableMessage(locale)}\n\n(${detail})`,
      setpoints: [],
      used_local_engine: true,
    };
  }

  const content = data.candidates?.[0]?.content?.parts?.[0]?.text?.trim();
  if (!content) {
    return {
      provider: "gemini",
      model: GEMINI_MODEL,
      content: gaiaUnavailableMessage(locale),
      setpoints: [],
      used_local_engine: true,
    };
  }

  return {
    provider: "gemini",
    model: GEMINI_MODEL,
    content,
    setpoints: [],
    used_local_engine: false,
  };
}

export async function gaiaChat(
  message: string,
  context: GreenhouseAIContext,
  locale: string,
): Promise<AIChatResponse> {
  const contextBlock = formatGreenhouseContext(context);
  const userContent = `${contextBlock}\n\n--- USER REQUEST ---\n${message}`;
  return callGaia(locale, userContent);
}

export async function gaiaAnalyze(
  analysisType: AIAnalysisType,
  context: GreenhouseAIContext,
  locale: string,
): Promise<AIChatResponse> {
  const contextBlock = formatGreenhouseContext(context);
  const prompt = analysisPrompt(analysisType, locale);
  const userContent = `${contextBlock}\n\n--- ANALYSIS TASK ---\n${prompt}`;
  const result = await callGaia(locale, userContent);
  return { ...result, analysis_type: analysisType };
}
