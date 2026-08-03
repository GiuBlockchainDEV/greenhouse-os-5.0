# GreenhouseOS 5.0 — System Architecture

## Overview

GreenhouseOS is a modular monorepo combining a **Python/FastAPI physics backend** with a **React/Three.js 3D frontend** (Milestone 2+). The system follows a strict separation of concerns:

```text
┌─────────────────────────────────────────────────────────┐
│                    Frontend (React/R3F)                  │
│  Viewport3D │ Zustand Store │ i18n │ AI Copilot Panel   │
└────────────────────────┬────────────────────────────────┘
                         │ REST / WebSocket
┌────────────────────────▼────────────────────────────────┐
│                  Backend (FastAPI)                       │
│  Simulation Engine │ AI Gateway │ Data Providers         │
└────────────────────────┬────────────────────────────────┘
                         │
┌────────────────────────▼────────────────────────────────┐
│                  Supabase (PostgreSQL + RLS)             │
│  profiles │ greenhouses │ auth.users                     │
└─────────────────────────────────────────────────────────┘
```

---

## Physics Engine (Milestone 1)

### FAO-56 Penman-Monteith ET0

Reference evapotranspiration for a well-watered grass reference crop:

$$
ET_0 = \frac{0.408 \cdot \Delta \cdot (R_n - G) + \gamma \cdot \frac{900}{T + 273} \cdot u_2 \cdot (e_s - e_a)}{\Delta + \gamma \cdot (1 + 0.34 \cdot u_2)}
$$

| Symbol | Unit | Description |
|--------|------|-------------|
| $ET_0$ | mm/day | Reference evapotranspiration |
| $R_n$ | MJ/m²/day | Net radiation at crop surface |
| $G$ | MJ/m²/day | Soil heat flux (≈ 0 daily) |
| $T$ | °C | Mean daily air temperature |
| $u_2$ | m/s | Wind speed at 2 m height |
| $e_s$ | kPa | Saturation vapor pressure |
| $e_a$ | kPa | Actual vapor pressure |
| $\Delta$ | kPa/°C | Slope of saturation vapor pressure curve |
| $\gamma$ | kPa/°C | Psychrometric constant |

**Implementation:** `backend/app/simulation/fao56.py`

### Saturation Vapor Pressure (Magnus-Tetens)

$$
e_s = 0.6108 \cdot \exp\left(\frac{17.27 \cdot T}{T + 237.3}\right)
$$

**Implementation:** `backend/app/simulation/psychrometrics.py`

### Vapor Pressure Deficit (VPD)

$$
VPD = e_s(T) - e_a
$$

VPD drives stomatal conductance and transpiration. Crop-stage optimal ranges:

| Growth Stage | Optimal VPD (kPa) |
|--------------|-------------------|
| Seedling | 0.4 – 0.8 |
| Vegetative | 0.8 – 1.2 |
| Generative | 1.0 – 1.5 |

**Implementation:** `backend/app/simulation/vpd.py`

### Daily Light Integral (DLI)

$$
DLI = 0.0864 \cdot f_{PAR} \cdot R_s \cdot \tau
$$

| Symbol | Unit | Description |
|--------|------|-------------|
| $DLI$ | mol/m²/day | Daily light integral |
| $f_{PAR}$ | mol/MJ | PAR fraction (2.08) |
| $R_s$ | MJ/m²/day | Global solar radiation |
| $\tau$ | — | Covering transmittance (0–1) |

**Implementation:** `backend/app/simulation/dli.py`

---

## Module Map

```text
backend/app/
├── main.py                    # FastAPI app, CORS, route registration
├── core/
│   └── config.py              # Pydantic Settings (env-based)
└── simulation/
    ├── constants.py           # Physical constants (FAO-56, ASHRAE)
    ├── psychrometrics.py      # es, ea, Δ, γ
    ├── fao56.py               # Ra, Rs, Rn, ET0 pipeline
    ├── vpd.py                 # VPD + stress index
    ├── dli.py                 # DLI + adequacy index
    ├── schemas.py             # Pydantic v2 request/response models
    └── engine.py              # SimulationEngine orchestrator
```

---

## Data Flow (Milestone 1)

```text
SimulationRequest (JSON)
    │
    ▼
SimulationEngine.run()
    ├── calculate_et0()        → ET0Result
    ├── calculate_vpd_kpa()    → VPD + stress index
    └── calculate_dli()      → DLI + adequacy index
    │
    ▼
SimulationResponse (JSON)
```

---

## Planned Modules (Milestones 2–6)

| Milestone | Module | Technology |
|-----------|--------|------------|
| 2 | 3D Viewport, Zustand, i18n | React Three Fiber, Zustand, react-i18next |
| 3 | Thermal balance, WebSocket | FastAPI WebSocket, thermal engine |
| 4 | Gizmos, GLSL heatmaps | TransformControls, custom shaders |
| 5 | Multi-AI gateway | OpenAI, Anthropic, Gemini, Ollama |
| 6 | Supabase RLS, dashboard | PostgreSQL, Priva/Ridder export |

---

## References

- Allen, R.G., Pereira, L.S., Raes, D., Smith, M. (1998). *Crop Evapotranspiration — Guidelines for Computing Crop Water Requirements.* FAO Irrigation and Drainage Paper 56.
- ASHRAE Handbook — Fundamentals (psychrometric properties).
