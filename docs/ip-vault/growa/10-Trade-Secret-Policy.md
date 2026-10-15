# Trade Secret Policy

[[Home]] · [[00-Cover]] · [[12-IP-Declaration]]

---

## Protection Boundary

This vault documents the **observable and contractual** surface of the Growa platform. Everything below the interface line is protected.

```text
┌─────────────────────────────────────────┐
│  INCLUDED     Interfaces · outcomes ·    │
│               capabilities · schema shape  │
├─────────────────────────────────────────┤
│  EXCLUDED     Algorithms · coefficients · │
│               prompts · optimisations      │
└─────────────────────────────────────────┘
```

---

## Never Disclosed

| Category | Examples |
|----------|----------|
| Credentials | API keys, tokens, database passwords |
| Infrastructure | Production URLs, IPs, CDN rules |
| Algorithms | Solver logic, calibration tables, heatmap blending |
| AI internals | System prompts, routing rules, fallback thresholds |
| Business data | Customer records, pricing, unreleased roadmap |
| Source code | Full implementations, proprietary utilities |

---

## Safe Disclosure Checklist

Before sharing this document, confirm:

- [ ] No environment variable **values** appear
- [ ] Code snippets are **interface-only** abstractions
- [ ] No file paths to proprietary algorithm modules
- [ ] No numerical coefficients or tuning parameters
- [ ] Example data uses generic placeholders

---

## Incident Response

If secrets are inadvertently exposed:

1. Rotate all affected credentials immediately
2. Regenerate this document
3. Revoke prior distributions
4. Audit service access logs

---

*Continue to [[11-Capability-Registry]]*
