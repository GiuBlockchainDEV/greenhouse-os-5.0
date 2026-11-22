# Standalone digital twin (no field telemetry)

GreenhouseOS operates as a **self-contained virtual twin**: geometry, equipment, cultivation layout, weather scenarios, and physics outputs are generated inside the platform. External sensors, SCADA, or climate computers are optional future inputs—not required for design or what-if analysis.

## Runtime layers

| Layer | Role |
|-------|------|
| **3D twin** | Structure, walkways, equipment GLBs, crop infrastructure |
| **Scenario clock** | Virtual time-of-day → sun pose and exterior weather (`twinScenarioClock.ts`) |
| **Physics WebSocket** | FAO-56 + thermal balance + agronomic indices (DLI, Botrytis risk) |
| **Preview solver** | Immediate heatmap feedback when backend is offline |
| **Synthetic tags** | `INT.TEMP`, `VPD`, `DLI`, etc. labeled PHYSICS or PREVIEW in UI |
| **Local persistence** | `localStorage` snapshot (`greenhouseos-twin-design-v1`) |

## UI surfaces

- **Climate dashboard** — bottom overlay on the 3D viewport (VPD, OPEX, export).
- **Twin runtime panel** — left sidebar: play/pause day, synthetic sensor table.
- **HUD** — connection state (physics vs preview), not a generic “Live” badge.

## Roadmap (autonomous)

1. Unified `TwinProject` schema linking greenhouse + fertigation React views (replace iframe-only process twin).
2. Single microclimate authority selector (WS vs preview) for heatmap means.
3. Offline deterministic recommendations (no cloud API keys) for standalone demos.