/**
 * Shared Gemini generateContent call for the Vercel function and the Vite dev proxy.
 * Gemini 3.x spends output tokens on thinking; a low cap or default MEDIUM level
 * returns HTTP 200 with an empty answer even when the API key is valid.
 */

export const GEMINI_API_KEY_NAMES = [
  "GEMINI_API_KEY",
  "GOOGLE_GENERATIVE_AI_API_KEY",
  "GOOGLE_API_KEY",
] as const;

const MAX_OUTPUT_TOKENS = 16384;
const THINKING_ATTEMPTS = ["LOW", "MINIMAL"] as const;

export interface GeminiGenerateInput {
  apiKey: string;
  baseUrl: string;
  model: string;
  systemPrompt: string;
  userContent: string;
}

export interface GeminiGenerateResult {
  content: string;
  model: string;
  truncated: boolean;
}

interface GeminiPart {
  text?: string;
  thought?: boolean;
}

interface GeminiCandidate {
  content?: { parts?: GeminiPart[] };
  finishReason?: string;
}

interface GeminiResponse {
  candidates?: GeminiCandidate[];
  error?: { message?: string; status?: string };
  promptFeedback?: { blockReason?: string };
}

export function readEnvValue(
  env: Record<string, string | undefined>,
  name: string,
): string | undefined {
  const value = env[name];
  if (typeof value !== "string") return undefined;
  const trimmed = value.trim().replace(/^['"]|['"]$/g, "");
  return trimmed ? trimmed : undefined;
}

export function resolveGeminiApiKey(
  env: Record<string, string | undefined>,
): string | undefined {
  for (const name of GEMINI_API_KEY_NAMES) {
    const value = readEnvValue(env, name);
    if (value) return value;
  }
  return undefined;
}

export function resolveGeminiModel(env: Record<string, string | undefined>): string {
  return (
    readEnvValue(env, "GEMINI_MODEL") ??
    readEnvValue(env, "GOOGLE_GENERATIVE_AI_MODEL") ??
    "gemini-3.5-flash"
  );
}

export function resolveGeminiBaseUrl(env: Record<string, string | undefined>): string {
  return (
    readEnvValue(env, "GEMINI_BASE_URL") ?? "https://generativelanguage.googleapis.com"
  );
}

export function extractGeminiAnswer(data: GeminiResponse): {
  content: string;
  truncated: boolean;
  finishReason?: string;
} {
  const candidate = data.candidates?.[0];
  const parts = candidate?.content?.parts ?? [];
  const content = parts
    .filter((part) => part.thought !== true)
    .map((part) => part.text ?? "")
    .join("")
    .trim();
  return {
    content,
    truncated: candidate?.finishReason === "MAX_TOKENS",
    finishReason: candidate?.finishReason,
  };
}

function geminiPayload(
  systemPrompt: string,
  userContent: string,
  thinkingLevel: (typeof THINKING_ATTEMPTS)[number],
): string {
  return JSON.stringify({
    systemInstruction: { parts: [{ text: systemPrompt }] },
    contents: [{ role: "user", parts: [{ text: userContent }] }],
    generationConfig: {
      maxOutputTokens: MAX_OUTPUT_TOKENS,
      thinkingConfig: { thinkingLevel },
    },
  });
}

export async function generateGeminiContent(
  input: GeminiGenerateInput,
): Promise<GeminiGenerateResult> {
  const baseUrl = input.baseUrl.replace(/\/$/, "");
  const url = `${baseUrl}/v1beta/models/${input.model}:generateContent`;
  let lastDetail = "empty_response";

  for (const thinkingLevel of THINKING_ATTEMPTS) {
    const upstream = await fetch(url, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "x-goog-api-key": input.apiKey,
      },
      body: geminiPayload(input.systemPrompt, input.userContent, thinkingLevel),
    });

    const data = (await upstream.json()) as GeminiResponse;
    if (!upstream.ok) {
      const message = data.error?.message ?? `HTTP ${upstream.status}`;
      throw new Error(message);
    }

    const extracted = extractGeminiAnswer(data);
    if (extracted.content) {
      return {
        content: extracted.content,
        model: input.model,
        truncated: extracted.truncated,
      };
    }

    const blocked = data.promptFeedback?.blockReason;
    lastDetail = blocked
      ? `blocked:${blocked}`
      : `empty_response:${extracted.finishReason ?? "no_candidate"}`;
  }

  throw new Error(lastDetail);
}
