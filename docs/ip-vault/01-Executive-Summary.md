# Executive Summary

[[Home]] · [[02-System-Overview]]

---

## Product Vision

**GreenhouseOS 5.0** is an enterprise-grade, open-source (BUSL-1.1) **3D Virtual Twin & SaaS platform** for dynamic greenhouse design and agronomic simulation. Unlike conventional greenhouse CAD tools that treat 3D visualization as decorative, GreenhouseOS binds every viewport pixel to a **physics probe** — delivering actionable outcomes across four engineering pillars.

---

## Four Value Pillars

### 1. Financial & Energy Impact (OPEX/CAPEX)

| Output | Unit | Description |
|--------|------|-------------|
| Energy consumption | kWh/m² | Real-time envelope and equipment load |
| Operational cost | €/day | Derived from thermal balance |
| CO₂ footprint | kg/day | Energy-to-emissions proxy |
| ROI | % / years | Payback on screens, LEDs, cooling upgrades |

### 2. Advanced Agronomic Metrics

| Metric | Unit | Standard |
|--------|------|----------|
| VPD | kPa | Magnus-Tetens psychrometrics |
| DLI | mol/m²/day | PAR-integrated daily light |
| Pathogen risk | index 0–1 | Humidity × temperature stress proxy |

### 3. Real Engineering & Sizing Outputs

| Output | Unit |
|--------|------|
| Heating boiler capacity | kW |
| Dehumidification rate | L/hour |
| Ventilation exchange | m³/h |

### 4. Industrial Climate Computer Interop

Export of setpoint rules as standardized JSON payloads compatible with **Priva**, **Ridder**, and **Hoogendoorn** climate computers.

---

## Development Milestones (Completed)

| # | Milestone | Deliverable |
|---|-----------|-------------|
| 1 | Project setup & FAO physics | Penman-Monteith ET₀, VPD, DLI engines |
| 2 | 3D canvas & i18n | React Three Fiber viewport, Zustand store, 4 locales |
| 3 | Thermodynamic core & WebSocket | Energy balance, <50 ms real-time loop |
| 4 | Interactive 3D & GLSL | TransformControls, heatmap shaders, InstancedMesh crops |
| 5 | Multi-AI gateway | OpenAI, Anthropic, Gemini, Ollama + local fallback |
| 6 | Supabase & launch polish | RLS schema, industrial dashboard, stress tests |

---

## Competitive Differentiation

1. **No-Form UX** — Design parameters edited directly in the 3D viewport via gizmos, not traditional forms.
2. **Frontend–backend coefficient parity** — Thermal solver constants synchronized across Python and TypeScript for consistent preview and server results.
3. **Equipment-aware spatial heatmaps** — Custom GLSL shaders visualize per-cell temperature and VPD influenced by pad walls, AC ducts, HAF fans, and vents.
4. **Deterministic AI fallback** — When cloud AI providers are unavailable, a rule-based local optimizer produces Priva/Ridder-compatible setpoints from FAO-56 metrics.

---

## Technology Stack Summary

| Layer | Technology |
|-------|------------|
| Backend | Python 3.11+, FastAPI, Pydantic v2 |
| Frontend | React 18, TypeScript (strict), Vite |
| 3D | Three.js, @react-three/fiber, @react-three/drei |
| State | Zustand |
| i18n | react-i18next (en, it, es, fr) |
| Database | Supabase (PostgreSQL + Row Level Security) |
| Real-time | WebSocket (`/ws/simulation`) |
| Container | Docker (backend) |

---

*Continue to [[02-System-Overview]]*
