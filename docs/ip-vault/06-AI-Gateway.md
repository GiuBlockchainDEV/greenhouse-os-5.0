# AI Gateway — Multi-Provider Copilot

[[Home]] · [[02-System-Overview]] · [[08-Industrial-Export]]

---

## Overview

GreenhouseOS includes a **decoupled Multi-AI gateway** that routes natural-language climate optimization requests to cloud AI providers, with a deterministic local fallback when providers are unavailable.

**Primary implementations:**
- `backend/app/ai/gateway.py`
- `backend/app/ai/base.py`
- `backend/app/ai/local_optimizer.py`
- `backend/app/ai/router.py`
- `frontend/src/components/ai/AICopilotPanel.tsx`
- `frontend/src/hooks/useAICopilot.ts`

---

## Architecture

```text
AICopilotPanel → useAICopilot → POST /api/v1/ai/chat
                                      │
                                      ▼
                               MultiAIGateway
                    ┌──────────┬──────────┬──────────┬──────────┐
                    │  OpenAI  │Anthropic │  Gemini  │  Ollama  │
                    └──────────┴──────────┴──────────┴──────────┘
                                      │ (fallback)
                                      ▼
                          Local Optimizer (FAO-56 rules)
```

---

## Provider Abstraction

Each provider implements the abstract `AIProvider.complete()` interface:

| Provider | Implementation | Transport |
|----------|----------------|-----------|
| OpenAI | `providers/openai_provider.py` | HTTPS REST |
| Anthropic | `providers/anthropic_provider.py` | HTTPS REST |
| Gemini | `providers/gemini_provider.py` | HTTPS REST |
| Ollama | `providers/ollama_provider.py` | Local HTTP |

Provider availability is determined at runtime by checking whether the corresponding API key or endpoint is configured. **No API keys are stored in source code.**

---

## Local Optimizer Fallback

When the selected cloud provider is unavailable or fails, `local_optimizer.py` produces **deterministic, rule-based setpoints** derived from:

- Current VPD and temperature readings
- Crop type and growth stage
- FAO-56 stress indices

Output format is compatible with [[08-Industrial-Export]] climate computer payloads (Priva/Ridder tag conventions).

---

## GAIA Frontend Integration

The frontend includes a **GAIA** (Generative AI Assistant) layer for in-browser copilot chat:

| File | Role |
|------|------|
| `frontend/src/lib/gaia/client.ts` | API client |
| `frontend/src/lib/gaia/buildContext.ts` | Simulation context assembly |
| `frontend/src/lib/gaia/formatContext.ts` | Context formatting for prompts |
| `frontend/src/lib/gaia/prompts.ts` | System prompt templates |
| `frontend/src/components/ai/GaiaMarkdown.tsx` | Rendered response display |
| `frontend/api/gaia.ts` | Serverless proxy endpoint (Vercel) |

API keys for GAIA are resolved at runtime from environment variables. Variable **names** are documented in [[10-Security-Redaction-Policy]]; values are never included in this vault.

---

## REST Endpoints

| Method | Path | Description |
|--------|------|-------------|
| GET | `/api/v1/ai/providers` | List available providers and status |
| POST | `/api/v1/ai/chat` | Natural-language climate chat |
| POST | `/api/v1/ai/optimize-climate` | Structured setpoint optimization |

Request/response schemas: `backend/app/ai/schemas.py`

---

## Prompt Engineering

System prompts in `backend/app/ai/prompts.py` constrain AI responses to:

- Agronomic best practices aligned with FAO standards
- Actionable setpoint recommendations (temperature, RH, ventilation)
- Industrial climate computer tag format awareness
- Refusal to disclose system credentials or internal configuration

---

## Security Considerations

- AI provider API keys are **server-side only** (backend env or serverless proxy)
- Frontend never receives or stores provider credentials
- Chat context includes only simulation parameters — no user PII beyond optional greenhouse name
- See [[10-Security-Redaction-Policy]]

---

*Continue to [[07-Data-Persistence]]*
