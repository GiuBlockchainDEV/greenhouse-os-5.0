const GEMINI_API_KEY_NAMES = [
  "GEMINI_API_KEY",
  "GOOGLE_GENERATIVE_AI_API_KEY",
  "GOOGLE_API_KEY",
] as const;

/** Avoid build-time inlining so Vercel injects secrets at runtime. */
function readEnv(name: string): string | undefined {
  const value = process.env[name];
  return typeof value === "string" ? value.trim() : undefined;
}

export function resolveGeminiApiKey(): string | undefined {
  for (const name of GEMINI_API_KEY_NAMES) {
    const value = readEnv(name);
    if (value) return value;
  }

  const dynamic = readEnv(`GEMINI_${"API_KEY"}`);
  return dynamic || undefined;
}

export function resolveGeminiModel(): string {
  return (
    readEnv("GEMINI_MODEL") ??
    readEnv("GOOGLE_GENERATIVE_AI_MODEL") ??
    "gemini-3.5-flash"
  );
}

export function resolveGeminiBaseUrl(): string {
  return (
    readEnv("GEMINI_BASE_URL") ??
    "https://generativelanguage.googleapis.com"
  );
}
