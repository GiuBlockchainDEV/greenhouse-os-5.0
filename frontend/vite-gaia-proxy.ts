import type { IncomingMessage, ServerResponse } from "node:http";
import type { Plugin } from "vite";
import { loadEnv } from "vite";

import {
  generateGeminiContent,
  resolveGeminiApiKey,
  resolveGeminiBaseUrl,
  resolveGeminiModel,
} from "./api/gaia.js";

interface GaiaProxyBody {
  systemPrompt?: string;
  userContent?: string;
  model?: string;
}

function readBody(req: IncomingMessage): Promise<string> {
  return new Promise((resolve, reject) => {
    let data = "";
    req.on("data", (chunk: Buffer | string) => {
      data += chunk.toString();
    });
    req.on("end", () => resolve(data));
    req.on("error", reject);
  });
}

function sendJson(res: ServerResponse, status: number, body: unknown): void {
  res.statusCode = status;
  res.setHeader("Content-Type", "application/json");
  res.end(JSON.stringify(body));
}

/** Local dev proxy for /api/gaia — mirrors the Vercel serverless function. */
export function gaiaDevProxy(): Plugin {
  return {
    name: "gaia-dev-proxy",
    configureServer(server) {
      server.middlewares.use(async (req, res, next) => {
        const pathname = req.url?.split("?")[0];
        if (pathname !== "/api/gaia") {
          next();
          return;
        }

        const env = loadEnv(server.config.mode, server.config.envDir ?? process.cwd(), "");
        const headerKey = req.headers["x-gemini-key"];
        const apiKey =
          (Array.isArray(headerKey) ? headerKey[0] : headerKey)?.trim() ||
          resolveGeminiApiKey(env);
        const defaultModel = resolveGeminiModel(env);

        if (req.method === "GET") {
          sendJson(res, 200, { available: Boolean(apiKey), model: defaultModel });
          return;
        }

        if (req.method === "OPTIONS") {
          res.statusCode = 200;
          res.end();
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

        try {
          const raw = await readBody(req);
          const body = JSON.parse(raw) as GaiaProxyBody;
          if (!body.systemPrompt || !body.userContent) {
            sendJson(res, 400, { error: "invalid_request" });
            return;
          }

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
      });
    },
  };
}
