import type { IncomingMessage, ServerResponse } from "node:http";
import type { Plugin } from "vite";
import { loadEnv } from "vite";

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
        const apiKey = env.GEMINI_API_KEY?.trim();
        const baseUrl = env.GEMINI_BASE_URL?.trim() || "https://generativelanguage.googleapis.com";
        const defaultModel = env.GEMINI_MODEL?.trim() || "gemini-3.5-flash";

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

          const usedModel = body.model?.trim() || defaultModel;
          const url = `${baseUrl}/v1beta/models/${usedModel}:generateContent?key=${apiKey}`;

          const upstream = await fetch(url, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              systemInstruction: { parts: [{ text: body.systemPrompt }] },
              contents: [{ role: "user", parts: [{ text: body.userContent }] }],
              generationConfig: { temperature: 0.35, maxOutputTokens: 2048 },
            }),
          });

          const data = (await upstream.json()) as {
            candidates?: Array<{ content?: { parts?: Array<{ text?: string }> } }>;
            error?: { message?: string };
          };

          if (!upstream.ok) {
            sendJson(res, upstream.status, {
              error: "upstream_error",
              message: data.error?.message ?? `HTTP ${upstream.status}`,
            });
            return;
          }

          const content = data.candidates?.[0]?.content?.parts?.[0]?.text?.trim();
          if (!content) {
            sendJson(res, 502, { error: "empty_response" });
            return;
          }

          sendJson(res, 200, { content, model: usedModel });
        } catch (error) {
          sendJson(res, 502, {
            error: "proxy_error",
            message: error instanceof Error ? error.message : "Unknown proxy error",
          });
        }
      });
    },
  };
}
