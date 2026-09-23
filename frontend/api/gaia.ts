import type { IncomingMessage, ServerResponse } from "node:http";

import {
  generateGeminiContent,
  resolveGeminiApiKey,
  resolveGeminiBaseUrl,
  resolveGeminiModel,
} from "./geminiRequest";

/** Hobby/Pro cap. Keeps Gemini from being killed mid-generation. */
export const maxDuration = 60;

interface GaiaProxyBody {
  systemPrompt?: string;
  userContent?: string;
  model?: string;
}

interface NodeRequest extends IncomingMessage {
  body?: unknown;
}

function sendJson(res: ServerResponse, status: number, body: unknown): void {
  res.statusCode = status;
  res.setHeader("Content-Type", "application/json");
  res.setHeader("Access-Control-Allow-Origin", "*");
  res.setHeader("Access-Control-Allow-Methods", "GET, POST, OPTIONS");
  res.setHeader("Access-Control-Allow-Headers", "Content-Type");
  res.end(JSON.stringify(body));
}

function runtimeEnv(): Record<string, string | undefined> {
  return process.env;
}

async function readJsonBody(req: NodeRequest): Promise<GaiaProxyBody> {
  const existing = req.body;
  if (existing && typeof existing === "object" && !Buffer.isBuffer(existing)) {
    const record = existing as GaiaProxyBody;
    if (record.systemPrompt || record.userContent) return record;
  }
  if (typeof existing === "string" && existing.trim()) {
    return JSON.parse(existing) as GaiaProxyBody;
  }
  if (Buffer.isBuffer(existing) && existing.length > 0) {
    return JSON.parse(existing.toString("utf8")) as GaiaProxyBody;
  }

  const chunks: Buffer[] = [];
  for await (const chunk of req) {
    chunks.push(typeof chunk === "string" ? Buffer.from(chunk) : chunk);
  }
  const raw = Buffer.concat(chunks).toString("utf8").trim();
  if (!raw) return {};
  return JSON.parse(raw) as GaiaProxyBody;
}

export default async function handler(req: NodeRequest, res: ServerResponse): Promise<void> {
  if (req.method === "OPTIONS") {
    sendJson(res, 200, {});
    return;
  }

  const env = runtimeEnv();
  const apiKey = resolveGeminiApiKey(env);
  const defaultModel = resolveGeminiModel(env);

  if (req.method === "GET") {
    sendJson(res, 200, { available: Boolean(apiKey), model: defaultModel });
    return;
  }

  if (req.method !== "POST") {
    sendJson(res, 405, { error: "method_not_allowed" });
    return;
  }

  if (!apiKey) {
    sendJson(res, 503, { error: "not_configured" });
    return;
  }

  let body: GaiaProxyBody;
  try {
    body = await readJsonBody(req);
  } catch {
    sendJson(res, 400, { error: "invalid_json" });
    return;
  }

  if (!body.systemPrompt || !body.userContent) {
    sendJson(res, 400, { error: "invalid_request" });
    return;
  }

  try {
    const result = await generateGeminiContent({
      apiKey,
      baseUrl: resolveGeminiBaseUrl(env),
      model: body.model?.trim() || defaultModel,
      systemPrompt: body.systemPrompt,
      userContent: body.userContent,
    });
    sendJson(res, 200, result);
  } catch (error) {
    sendJson(res, 502, {
      error: "upstream_error",
      message: error instanceof Error ? error.message : "Unknown proxy error",
    });
  }
}
