import type { AIAnalysisType, AIChatResponse, GreenhouseAIContext } from "@/types/ai";

import { formatGreenhouseContext } from "./formatContext";
import { analysisPrompt, gaiaUnavailableMessage, systemPrompt, truncatedNotice } from "./prompts";

const GAIA_API = "/api/gaia";

interface GaiaStatus {
  available: boolean;
  model?: string;
}

interface GaiaProxySuccess {
  content: string;
  model: string;
  truncated?: boolean;
}

interface GaiaProxyError {
  error: string;
  message?: string;
}

let cachedAvailable: boolean | null = null;

export async function checkGaiaStatus(): Promise<GaiaStatus> {
  try {
    const response = await fetch(GAIA_API);
    if (!response.ok) return { available: false };
    const data = (await response.json()) as GaiaStatus;
    cachedAvailable = data.available;
    return data;
  } catch {
    cachedAvailable = false;
    return { available: false };
  }
}

export function isGaiaConfigured(): boolean {
  return cachedAvailable ?? false;
}

async function callGaia(locale: string, userContent: string): Promise<AIChatResponse> {
  try {
    const response = await fetch(GAIA_API, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        systemPrompt: systemPrompt(locale),
        userContent,
      }),
    });

    const data = (await response.json()) as GaiaProxySuccess | GaiaProxyError;

    if (!response.ok) {
      const detail =
        "message" in data && data.message
          ? data.message
          : "error" in data
            ? data.error
            : `HTTP ${response.status}`;

      if ("error" in data && data.error === "not_configured") {
        cachedAvailable = false;
      }

      return {
        provider: "gemini",
        model: "gaia-error",
        content: `${gaiaUnavailableMessage(locale)}\n\n(${detail})`,
        setpoints: [],
        used_local_engine: true,
      };
    }

    const success = data as GaiaProxySuccess;
    cachedAvailable = true;

    const content = success.truncated
      ? `${success.content}\n\n---\n\n*${truncatedNotice(locale)}*`
      : success.content;

    return {
      provider: "gemini",
      model: success.model,
      content,
      setpoints: [],
      used_local_engine: false,
      truncated: success.truncated,
    };
  } catch (error) {
    const detail = error instanceof Error ? error.message : "network_error";
    return {
      provider: "gemini",
      model: "gaia-error",
      content: `${gaiaUnavailableMessage(locale)}\n\n(${detail})`,
      setpoints: [],
      used_local_engine: true,
    };
  }
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
