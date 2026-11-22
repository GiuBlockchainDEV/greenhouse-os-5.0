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

## Unified twin project (`greenhouseos-twin-project-v1`)

One `localStorage` bundle restores:

- Greenhouse geometry, climate, equipment, scenario clock
- Fertigation preset, template, studio tab, active P&ID project
- Last workspace (`greenhouse` | `fertigation`)

With **sync to greenhouse** enabled, crop node uptake/evaporation tracks greenhouse metrics and WS physics (VPD, transpiration).

Legacy keys (`greenhouseos-twin-design-v1`, fertigation project key) are still written for the P&ID iframe.

## Roadmap (autonomous)

1. ~~Unified `TwinProject` bundle~~ (shipped).
2. Map WebSocket `heatmap_matrix` to shaders (today: equipment-aware preview field, labeled honestly).
3. Replace iframe process twin with native React simulator or formal `postMessage` bridge.
4. Offline deterministic setpoint recommendations (no cloud API keys).