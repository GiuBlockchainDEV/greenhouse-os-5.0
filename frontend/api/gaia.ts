const GEMINI_BASE_URL =
  process.env.GEMINI_BASE_URL?.trim() || "https://generativelanguage.googleapis.com";

const MAX_OUTPUT_TOKENS = 8192;

interface GaiaProxyBody {
  systemPrompt?: string;
  userContent?: string;
  model?: string;
}

interface GeminiCandidate {
  content?: { parts?: Array<{ text?: string }> };
  finishReason?: string;
}

interface VercelRequest {
  method?: string;
  body?: GaiaProxyBody;
}

interface VercelResponse {
  setHeader(name: string, value: string): void;
  status(code: number): {
    json(body: unknown): void;
    end(): void;
  };
}

function extractGeminiText(data: { candidates?: GeminiCandidate[] }): {
  content: string;
  truncated: boolean;
} {
  const candidate = data.candidates?.[0];
  const parts = candidate?.content?.parts ?? [];
  const content = parts.map((part) => part.text ?? "").join("").trim();
  const truncated = candidate?.finishReason === "MAX_TOKENS";
  return { content, truncated };
}

export default async function handler(req: VercelRequest, res: VercelResponse): Promise<void> {
  res.setHeader("Access-Control-Allow-Origin", "*");
  res.setHeader("Access-Control-Allow-Methods", "GET, POST, OPTIONS");
  res.setHeader("Access-Control-Allow-Headers", "Content-Type");

  if (req.method === "OPTIONS") {
    res.status(200).end();
    return;
  }

  if (req.method === "GET") {
    res.status(200).json({
      available: Boolean(process.env.GEMINI_API_KEY?.trim()),
      model: process.env.GEMINI_MODEL?.trim() || "gemini-3.5-flash",
    });
    return;
  }

  if (req.method !== "POST") {
    res.status(405).json({ error: "method_not_allowed" });
    return;
  }

  const apiKey = process.env.GEMINI_API_KEY?.trim();
  if (!apiKey) {
    res.status(503).json({ error: "not_configured" });
    return;
  }

  const { systemPrompt, userContent, model } = req.body ?? {};
  if (!systemPrompt || !userContent) {
    res.status(400).json({ error: "invalid_request" });
    return;
  }

  const usedModel = model?.trim() || process.env.GEMINI_MODEL?.trim() || "gemini-3.5-flash";
  const url = `${GEMINI_BASE_URL}/v1beta/models/${usedModel}:generateContent?key=${apiKey}`;

  try {
    const upstream = await fetch(url, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        systemInstruction: { parts: [{ text: systemPrompt }] },
        contents: [{ role: "user", parts: [{ text: userContent }] }],
        generationConfig: { temperature: 0.35, maxOutputTokens: MAX_OUTPUT_TOKENS },
      }),
    });

    const data = (await upstream.json()) as {
      candidates?: GeminiCandidate[];
      error?: { message?: string };
    };

    if (!upstream.ok) {
      res.status(upstream.status).json({
        error: "upstream_error",
        message: data.error?.message ?? `HTTP ${upstream.status}`,
      });
      return;
    }

    const { content, truncated } = extractGeminiText(data);
    if (!content) {
      res.status(502).json({ error: "empty_response" });
      return;
    }

    res.status(200).json({ content, model: usedModel, truncated });
  } catch (error) {
    res.status(502).json({
      error: "proxy_error",
      message: error instanceof Error ? error.message : "Unknown proxy error",
    });
  }
}
