/**
 * GAIA proxy for Vercel.
 * Single file, no local imports: a missing sibling module was crashing the
 * function before the API key was read (FUNCTION_INVOCATION_FAILED).
 * Supports both the Node (req, res) runtime and the Web Request runtime.
 */

const KEY_NAMES = [
  "GEMINI_API_KEY",
  "GOOGLE_GENERATIVE_AI_API_KEY",
  "GOOGLE_API_KEY",
  "VITE_GEMINI_API_KEY",
  "GEMINI_KEY",
];

const MAX_OUTPUT_TOKENS = 16384;
const THINKING_ATTEMPTS = ["LOW", "MINIMAL"];

export const maxDuration = 60;

function clean(value) {
  if (typeof value !== "string") return undefined;
  const trimmed = value.trim().replace(/^['"]+|['"]+$/g, "");
  return trimmed || undefined;
}

export function resolveGeminiApiKey(env) {
  const source = env ?? process.env;
  for (const name of KEY_NAMES) {
    const value = clean(source[name]);
    if (value) return value;
  }
  for (const [name, value] of Object.entries(source)) {
    if (!/(gemini|google)/i.test(name) || !/key/i.test(name)) continue;
    const cleaned = clean(value);
    if (cleaned) return cleaned;
  }
  return undefined;
}

export function resolveGeminiModel(env) {
  const source = env ?? process.env;
  return clean(source.GEMINI_MODEL) || clean(source.GOOGLE_GENERATIVE_AI_MODEL) || "gemini-3.5-flash";
}

export function resolveGeminiBaseUrl(env) {
  const source = env ?? process.env;
  return clean(source.GEMINI_BASE_URL) || "https://generativelanguage.googleapis.com";
}

export function extractGeminiAnswer(data) {
  const candidate = data?.candidates?.[0];
  const parts = candidate?.content?.parts ?? [];
  const content = parts
    .filter((part) => part?.thought !== true)
    .map((part) => part?.text ?? "")
    .join("")
    .trim();
  return {
    content,
    truncated: candidate?.finishReason === "MAX_TOKENS",
    finishReason: candidate?.finishReason,
  };
}

function geminiPayload(systemPrompt, userContent, thinkingLevel) {
  return JSON.stringify({
    systemInstruction: { parts: [{ text: systemPrompt }] },
    contents: [{ role: "user", parts: [{ text: userContent }] }],
    generationConfig: {
      maxOutputTokens: MAX_OUTPUT_TOKENS,
      thinkingConfig: { thinkingLevel },
    },
  });
}

export async function generateGeminiContent(input) {
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
    const data = await upstream.json();
    if (!upstream.ok) {
      throw new Error(data?.error?.message ?? `HTTP ${upstream.status}`);
    }
    const extracted = extractGeminiAnswer(data);
    if (extracted.content) {
      return { content: extracted.content, model: input.model, truncated: extracted.truncated };
    }
    const blocked = data?.promptFeedback?.blockReason;
    lastDetail = blocked
      ? `blocked:${blocked}`
      : `empty_response:${extracted.finishReason ?? "no_candidate"}`;
  }

  throw new Error(lastDetail);
}

function isWebRequest(req) {
  return typeof Request !== "undefined" && req instanceof Request;
}

async function readNodeBody(req) {
  const existing = req.body;
  if (existing && typeof existing === "object" && !Buffer.isBuffer(existing)) {
    if (existing.systemPrompt || existing.userContent) return existing;
  }
  if (typeof existing === "string" && existing.trim()) return JSON.parse(existing);
  if (Buffer.isBuffer(existing) && existing.length > 0) {
    return JSON.parse(existing.toString("utf8"));
  }
  const chunks = [];
  for await (const chunk of req) {
    chunks.push(typeof chunk === "string" ? Buffer.from(chunk) : chunk);
  }
  const raw = Buffer.concat(chunks).toString("utf8").trim();
  return raw ? JSON.parse(raw) : {};
}

async function readBody(req) {
  if (isWebRequest(req)) {
    const raw = (await req.text()).trim();
    return raw ? JSON.parse(raw) : {};
  }
  return readNodeBody(req);
}

function requestKey(req) {
  if (isWebRequest(req)) return clean(req.headers.get("x-gemini-key") ?? undefined);
  const raw = req.headers?.["x-gemini-key"];
  return clean(Array.isArray(raw) ? raw[0] : raw);
}

async function route(req) {
  const method = req.method ?? "GET";
  const env = process.env;
  const apiKey = requestKey(req) || resolveGeminiApiKey(env);
  const model = resolveGeminiModel(env);

  if (method === "OPTIONS") return { status: 200, body: {} };
  if (method === "GET") return { status: 200, body: { available: Boolean(apiKey), model } };
  if (method !== "POST") return { status: 405, body: { error: "method_not_allowed" } };
  if (!apiKey) return { status: 503, body: { error: "not_configured" } };

  let body;
  try {
    body = await readBody(req);
  } catch {
    return { status: 400, body: { error: "invalid_json" } };
  }
  if (!body?.systemPrompt || !body?.userContent) {
    return { status: 400, body: { error: "invalid_request" } };
  }

  try {
    const result = await generateGeminiContent({
      apiKey,
      baseUrl: resolveGeminiBaseUrl(env),
      model: typeof body.model === "string" && body.model.trim() ? body.model.trim() : model,
      systemPrompt: body.systemPrompt,
      userContent: body.userContent,
    });
    return { status: 200, body: result };
  } catch (error) {
    return {
      status: 502,
      body: {
        error: "upstream_error",
        message: error instanceof Error ? error.message : "Unknown proxy error",
      },
    };
  }
}

const CORS = {
  "Content-Type": "application/json",
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "GET, POST, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type",
};

function writeNode(res, result) {
  res.statusCode = result.status;
  for (const [name, value] of Object.entries(CORS)) res.setHeader(name, value);
  res.end(JSON.stringify(result.body));
}

export default async function handler(req, res) {
  try {
    const result = await route(req);
    if (res && typeof res.setHeader === "function" && typeof res.end === "function") {
      writeNode(res, result);
      return;
    }
    return new Response(JSON.stringify(result.body), { status: result.status, headers: CORS });
  } catch (error) {
    const body = {
      error: "handler_error",
      message: error instanceof Error ? error.message : "Unknown handler error",
    };
    if (res && typeof res.setHeader === "function" && typeof res.end === "function") {
      writeNode(res, { status: 500, body });
      return;
    }
    return new Response(JSON.stringify(body), { status: 500, headers: CORS });
  }
}
