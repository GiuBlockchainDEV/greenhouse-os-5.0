import { API_V1 } from "@/lib/apiConfig";
import type {
  AIAnalysisType,
  AIChatResponse,
  GreenhouseAIContext,
  ProviderInfo,
} from "@/types/ai";

import { formatGreenhouseContext } from "./formatContext";
import { analysisPrompt, gaiaUnavailableMessage, systemPrompt, truncatedNotice } from "./prompts";

const GAIA_API = "/api/gaia";
const GAIA_KEY_STORAGE = "greenhouseos.gaiaApiKey";

export function readStoredGaiaKey(): string {
  if (typeof localStorage === "undefined") return "";
  return localStorage.getItem(GAIA_KEY_STORAGE)?.trim() ?? "";
}

export function saveStoredGaiaKey(key: string): void {
  if (typeof localStorage === "undefined") return;
  const trimmed = key.trim();
  if (trimmed) localStorage.setItem(GAIA_KEY_STORAGE, trimmed);
  else localStorage.removeItem(GAIA_KEY_STORAGE);
  cachedAvailable = null;
}

function gaiaHeaders(json = false): HeadersInit {
  const headers: Record<string, string> = {};
  if (json) headers["Content-Type"] = "application/json";
  const key = readStoredGaiaKey();
  if (key) headers["x-gemini-key"] = key;
  return headers;
}
const BACKEND_CHAT = `${API_V1}/ai/chat`;
const BACKEND_ANALYZE = `${API_V1}/ai/analyze`;
const BACKEND_PROVIDERS = `${API_V1}/ai/providers`;

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

async function checkBackendStatus(): Promise<GaiaStatus> {
  try {
    const response = await fetch(BACKEND_PROVIDERS, { headers: gaiaHeaders() });
    if (!response.ok) return { available: false };
    const providers = (await response.json()) as ProviderInfo[];
    const gemini = providers.find((provider) => provider.id === "gemini" && provider.available);
    return gemini
      ? { available: true, model: gemini.default_model }
      : { available: false };
  } catch {
    return { available: false };
  }
}

export async function checkGaiaStatus(): Promise<GaiaStatus> {
  try {
    const response = await fetch(GAIA_API, { headers: gaiaHeaders() });
    if (response.ok) {
      const data = (await response.json()) as GaiaStatus;
      if (data.available) {
        cachedAvailable = true;
        return data;
      }
    }
  } catch {
    // Fall through to the FastAPI gateway when the Vercel proxy is absent.
  }

  const backend = await checkBackendStatus();
  cachedAvailable = backend.available;
  return backend;
}

export function isGaiaConfigured(): boolean {
  return cachedAvailable ?? false;
}

function errorResponse(locale: string, detail: string): AIChatResponse {
  return {
    provider: "gemini",
    model: "gaia-error",
    content: `${gaiaUnavailableMessage(locale)}\n\n(${detail})`,
    setpoints: [],
    used_local_engine: true,
  };
}

async function callBackend(path: string, body: unknown): Promise<AIChatResponse | null> {
  try {
    const response = await fetch(path, {
      method: "POST",
      headers: gaiaHeaders(true),
      body: JSON.stringify(body),
    });
    if (!response.ok) return null;
    const data = (await response.json()) as AIChatResponse;
    cachedAvailable = !data.used_local_engine;
    return data;
  } catch {
    return null;
  }
}

interface ProxyAttempt {
  response: AIChatResponse;
  fallback: boolean;
}

async function callGaia(locale: string, userContent: string): Promise<ProxyAttempt> {
  try {
    const response = await fetch(GAIA_API, {
      method: "POST",
      headers: gaiaHeaders(true),
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
      const missing =
        response.status === 404 || ("error" in data && data.error === "not_configured");
      if (missing) cachedAvailable = false;
      return { response: errorResponse(locale, detail), fallback: missing };
    }

    const success = data as GaiaProxySuccess;
    cachedAvailable = true;

    const content = success.truncated
      ? `${success.content}\n\n---\n\n*${truncatedNotice(locale)}*`
      : success.content;

    return {
      fallback: false,
      response: {
        provider: "gemini",
        model: success.model,
        content,
        setpoints: [],
        used_local_engine: false,
        truncated: success.truncated,
      },
    };
  } catch (error) {
    const detail = error instanceof Error ? error.message : "proxy_unreachable";
    return { response: errorResponse(locale, detail), fallback: true };
  }
}

export async function gaiaChat(
  message: string,
  context: GreenhouseAIContext,
  locale: string,
): Promise<AIChatResponse> {
  const contextBlock = formatGreenhouseContext(context);
  const userContent = `${contextBlock}\n\n--- USER REQUEST ---\n${message}`;
  const proxied = await callGaia(locale, userContent);
  if (!proxied.fallback) return proxied.response;

  const backend = await callBackend(BACKEND_CHAT, { message, context, locale });
  return backend ?? proxied.response;
}

export async function gaiaAnalyze(
  analysisType: AIAnalysisType,
  context: GreenhouseAIContext,
  locale: string,
): Promise<AIChatResponse> {
  const contextBlock = formatGreenhouseContext(context);
  const prompt = analysisPrompt(analysisType, locale);
  const userContent = `${contextBlock}\n\n--- ANALYSIS TASK ---\n${prompt}`;
  const proxied = await callGaia(locale, userContent);
  if (!proxied.fallback) {
    return { ...proxied.response, analysis_type: analysisType };
  }

  const backend = await callBackend(BACKEND_ANALYZE, {
    analysis_type: analysisType,
    context,
    locale,
  });
  return backend
    ? { ...backend, analysis_type: analysisType }
    : { ...proxied.response, analysis_type: analysisType };
}
