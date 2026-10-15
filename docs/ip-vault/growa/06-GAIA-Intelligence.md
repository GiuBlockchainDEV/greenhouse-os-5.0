# GAIA Intelligence

[[Home]] · [[05-Virtual-Experience]] · [[07-Data-Governance]]

---

## Capability Summary

**GAIA** is Growa's proprietary AI copilot layer for GreenhouseOS. It provides natural-language climate guidance, setpoint recommendations, and design optimisation suggestions grounded in the current virtual twin state.

---

## Design Principles

| Principle | Description |
|-----------|-------------|
| Growa-branded | Users interact with GAIA — never underlying providers |
| Context-aware | Recommendations reflect live design and simulation state |
| Vendor-aware | Output compatible with industrial climate computers |
| Resilient | Deterministic local fallback when cloud AI is unavailable |

---

## Black-Box Interface

```typescript
/** GAIA copilot — prompt engineering and routing are proprietary */
interface GAIACopilot {
  chat(context: GrowaDesignContext, message: string): GuidanceResponse;
  optimize(context: GrowaDesignContext): SetpointRecommendation[];
  listCapabilities(): ProviderStatus[];
}

interface GuidanceResponse {
  narrative: string;
  recommendations?: SetpointRecommendation[];
}
```

---

## Security Posture

- AI credentials are **server-side only** — never exposed to clients
- Chat context contains simulation parameters only — no user PII beyond optional design name
- System prompts and routing logic are **trade secrets**

---

## Local Optimizer Fallback

When external AI is unavailable, a **deterministic rule engine** produces agronomically sound setpoints. The rule set, thresholds, and vendor tag mappings are proprietary.

---

*Continue to [[07-Data-Governance]]*
