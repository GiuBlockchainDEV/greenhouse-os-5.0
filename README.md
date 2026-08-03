# 🌿 GreenhouseOS 5.0

![License](https://img.shields.io/badge/License-BUSL--1.1-blue.svg)
![TypeScript](https://img.shields.io/badge/TypeScript-Strict-blue?logo=typescript)
![Python](https://img.shields.io/badge/Python-3.11+-yellow?logo=python)
![React](https://img.shields.io/badge/3D-Three.js%20%2F%20R3F-black?logo=react)
![FastAPI](https://img.shields.io/badge/Backend-FastAPI-green?logo=fastapi)
![Supabase](https://img.shields.io/badge/Database-Supabase-emerald?logo=supabase)

**Enterprise-grade, open-source 3D Virtual Twin & SaaS platform** for dynamic greenhouse design and agronomic simulation. GreenhouseOS delivers actionable OPEX/CAPEX insights, FAO-standard physics, and industrial climate-computer interoperability.

---

## Why GreenhouseOS?

Traditional greenhouse software treats 3D as decoration. GreenhouseOS treats every pixel as a **physics probe**:

| Pillar | Output |
|--------|--------|
| **Financial & Energy** | Real-time kWh/m², €/day OPEX, CO₂ footprint, ROI on screens/LEDs |
| **Agronomic Metrics** | VPD (kPa), DLI (mol/m²/day), *Botrytis* risk indices |
| **Engineering Sizing** | Boiler capacity (kW), dehumidification (L/h), ventilation (m³/h) |
| **Climate Computer Export** | Priva / Ridder / Hoogendoorn JSON setpoint payloads |

---

## Quick Start

### Backend (FAO-56 Simulation Engine)

```bash
cd backend
python -m venv .venv
.venv\Scripts\activate        # Windows
pip install -r requirements.txt
uvicorn app.main:app --reload --port 8000
```

### Run a Simulation

```bash
curl -X POST http://localhost:8000/api/v1/simulation/run \
  -H "Content-Type: application/json" \
  -d '{
    "climate": {
      "latitude_deg": 41.9028,
      "longitude_deg": 12.4964,
      "temperature_max_c": 34.0,
      "temperature_min_c": 22.0,
      "relative_humidity_pct": 72.0,
      "wind_speed_m_s": 2.5
    },
    "covering": { "type": "glass", "transmittance": 0.85, "u_value": 5.8 },
    "crop_type": "tomato",
    "growth_stage": "mid_season"
  }'
```

### Docker

```bash
cd backend
docker build -t greenhouseos-backend .
docker run -p 8000:8000 greenhouseos-backend
```

### Frontend (3D Viewport)

```bash
cd frontend
npm install
npm run dev        # http://localhost:5173
```

The frontend proxies `/api` requests to the backend at `localhost:8000`.

---

## Project Structure

```text
greenhouse-os-2.0/
├── LICENSE                         # BUSL-1.1
├── README.md
├── CHANGELOG.md
├── docs/
│   ├── ARCHITECTURE.md
│   └── API_SPEC.md
└── backend/
    ├── app/
    │   ├── main.py                 # FastAPI entrypoint
    │   ├── core/                   # Configuration
    │   └── simulation/             # FAO-56, VPD, DLI engines
    ├── requirements.txt
    └── Dockerfile
└── frontend/
    ├── src/
    │   ├── i18n.ts                 # react-i18next setup
    │   ├── locales/                # en, it, es, fr namespaces
    │   ├── store/                  # Zustand greenhouse store
    │   ├── components/3d/          # Viewport3D, GreenhouseMesh
    │   └── components/ui/          # HUDOverlay, LanguagePicker
    ├── package.json
    └── vite.config.ts
```

---

## Physics Engine (Milestone 1)

The backend implements **FAO-56 Penman-Monteith** reference evapotranspiration with:

- **ET0** — Daily reference crop evapotranspiration (mm/day)
- **VPD** — Vapor Pressure Deficit with crop-stage stress indexing
- **DLI** — Daily Light Integral adjusted for covering transmittance
- **Net Radiation** — FAO-56 Eq. 15–20 daily Rn estimation

All calculations use strict **Pydantic v2** schemas with full input validation.

---

## 3D Frontend (Milestone 2)

The React Three Fiber viewport provides a **No-Form UX** foundation:

- **Viewport3D** — OrbitControls, infinite grid, dynamic camera framing
- **GreenhouseMesh** — Parametric gable-roof greenhouse driven by Zustand geometry state
- **Zustand Store** — Reactive dimensions, covering, crop, location with derived volume metrics
- **i18n** — Full multilingual support (en, it, es, fr) across 5 namespaces via react-i18next
- **DimensionControls** — Live slider-based geometry editing with instant 3D updates

---

## Real-Time Simulation (Milestone 3)

- **Thermal Engine** — Greenhouse energy balance (solar gain, transpiration, ventilation, conduction)
- **WebSocket Pipeline** — `WS /ws/simulation` with <50 ms calculation loop
- **useSimulationWS** — Auto-reconnect hook with exponential backoff (1s → 30s)
- **ClimateDashboard** — Live thermal balance and microclimate metrics overlay

---

## Interactive 3D Controls (Milestone 4)

- **TransformControls Gizmo** — Scale/move greenhouse directly in the viewport (No-Form UX)
- **GLSL Heatmap Shader** — Temperature and VPD floor overlay from live simulation data
- **CropGridMesh** — High-performance InstancedMesh foliage grid scaled by LAI and growth stage
- **GizmoToolbar** — Toggle gizmo mode and heatmap visualization (en/it/es/fr)

---

## Multi-AI Copilot (Milestone 5)

- **Decoupled AI Gateway** — OpenAI, Anthropic, Gemini, Ollama via unified `MultiAIGateway`
- **Local Optimizer Fallback** — FAO-56 rule-based setpoints when API keys unavailable
- **AICopilotPanel** — Chat UI with Optimize Climate and Explain Metrics actions
- **ProviderSelector** — Switch AI provider at runtime

---

## Industrial Launch (Milestone 6)

- **Supabase RLS** — PostgreSQL schema with profiles + greenhouses, Row Level Security policies
- **AuthPanel** — Supabase Auth sign-in/sign-up (optional, graceful offline mode)
- **Industrial Dashboard** — OPEX/energy/CO₂ metrics + Priva/Ridder/Hoogendoorn JSON export
- **Greenhouse CRUD API** — Save designs to Supabase or in-memory fallback
- **Stress Test** — `backend/scripts/stress_test.py` validates p95 latency targets

### Supabase Setup

```bash
# Apply migration in Supabase SQL Editor
cat supabase/migrations/001_initial_schema.sql

# Backend .env
SUPABASE_URL=https://your-project.supabase.co
SUPABASE_ANON_KEY=eyJ...
SUPABASE_SERVICE_ROLE_KEY=eyJ...

# Frontend .env
VITE_SUPABASE_URL=https://your-project.supabase.co
VITE_SUPABASE_ANON_KEY=eyJ...
```

### Stress Test

```bash
cd backend
uvicorn app.main:app --port 8000 &
python scripts/stress_test.py --iterations 50
```

---

## License

Licensed under the [Business Source License 1.1](LICENSE) (BUSL-1.1). Converts to Apache 2.0 on **2029-08-03**.

---

## Roadmap

- [x] Milestone 1 — Project Setup, Living Docs & Core FAO Physics Engine
- [x] Milestone 2 — 3D Canvas Foundation, Zustand Store & i18n
- [x] Milestone 3 — Thermodynamic Core & Real-Time WebSocket Engine
- [x] Milestone 4 — Interactive No-Form 3D Controls, GLSL Heatmaps & Instanced Mesh
- [x] Milestone 5 — Decoupled Multi-AI Gateway & Natural Language Copilot
- [x] Milestone 6 — Supabase Data Layer, Industrial Dashboard & Launch Polish
