# Capability Registry

[[Home]] · [[10-Trade-Secret-Policy]] · [[12-IP-Declaration]]

---

## Platform Scale (Non-Secret)

| Metric | Value |
|--------|-------|
| Source modules | ~113 files |
| Lines of code | ~15,200 |
| Languages | Python, TypeScript |
| Locales | 4 |
| Milestones delivered | 6 |

---

## Capability Map

| Domain | Capabilities | Disclosure Level |
|--------|-------------|------------------|
| Agronomic Intelligence | ET₀, VPD, DLI, stress indices | Outputs only |
| Climate Twin | Energy balance, equipment, heatmaps | Capabilities only |
| Virtual Experience | 3D viewport, shaders, No-Form UX | Behaviour only |
| GAIA Intelligence | Chat, optimise, fallback | Interface only |
| Data Governance | Auth, CRUD, RLS | Schema shape only |
| Industrial Bridge | Priva, Ridder, Hoogendoorn export | Format names only |

---

## Module Categories (Abstracted)

```text
Platform
├── Experience      (3D · HUD · Controls · i18n)
├── Orchestration   (API · WebSocket · Validation)
├── Agronomic       [BLACK BOX]
├── Climate Twin    [BLACK BOX]
├── GAIA            [BLACK BOX]
├── Data            (Auth · Persistence · RLS)
└── Export          [BLACK BOX — vendor mappings]
```

> Individual source file paths and internal module names are intentionally omitted to prevent reverse-engineering aids.

---

*Continue to [[12-IP-Declaration]]*
