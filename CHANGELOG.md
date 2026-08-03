# Changelog

All notable architectural changes to GreenhouseOS 5.0 are documented here.

Format based on [Keep a Changelog](https://keepachangelog.com/en/1.1.0/).

## [5.0.0-milestone-5] - 2026-08-03

### Added

- **Decoupled Multi-AI gateway** (`backend/app/ai/`) — Abstract `AIProvider` interface
- **Provider implementations** — OpenAI, Anthropic, Gemini (httpx), Ollama (local)
- **Local optimizer fallback** — FAO-56 rule-based setpoints when APIs unavailable
- **AI REST endpoints** — `GET /ai/providers`, `POST /ai/chat`, `POST /ai/optimize-climate`
- **Frontend AICopilotPanel** — Chat UI with setpoint recommendations table
- **ProviderSelector** — Runtime AI provider switching
- **useAICopilot hook** — Chat state, optimize, and provider discovery

## [5.0.0-milestone-4] - 2026-08-03

### Added

- **TransformControls gizmo** (`GreenhouseScene`) — Scale/move greenhouse in viewport with OrbitControls lock during drag
- **GLSL heatmap shader** (`HeatmapShader.tsx`) — Custom vertex/fragment shaders for temperature and VPD floor overlay
- **CropGridMesh** — InstancedMesh foliage grid with crop-specific spacing, color, and LAI/growth-stage scaling
- **GizmoToolbar** — UI to toggle gizmo mode (off/translate/scale) and heatmap mode (off/temperature/vpd)
- **Viewport store slice** — `gizmoMode` and `heatmapMode` in Zustand

## [5.0.0-milestone-3] - 2026-08-03

### Added

- **Thermal energy balance engine** (`backend/app/simulation/thermal.py`)
  - Solar gain through covering transmittance
  - Crop transpiration flux from FAO-56 ET0 × Kc × LAI
  - Natural ventilation and envelope conduction losses
  - Quasi-steady-state internal temperature solver
  - Spatial heatmap matrix generation
- **Real-time simulation pipeline** (`backend/app/simulation/realtime_engine.py`) — FAO-56 + thermal in <50 ms
- **WebSocket gateway** (`WS /ws/simulation`) with PING/PONG keepalive and validation
- **Frontend `useSimulationWS` hook** — Auto-reconnect, debounced store sync, 30 s heartbeat
- **ClimateDashboard** — Live thermal balance and microclimate overlay
- **Simulation types** — Strict TypeScript interfaces for WebSocket payloads

## [5.0.0-milestone-2] - 2026-08-03

### Added

- **Vite + React 18 + TypeScript (strict)** frontend scaffold with Tailwind CSS
- **React Three Fiber viewport** (`Viewport3D`) with OrbitControls, grid, and adaptive camera
- **Parametric GreenhouseMesh** — Gable-roof geometry synced to store dimensions and covering transmittance
- **Zustand store** (`useGreenhouseStore`) — Geometry, covering, crop, location, derived volume metrics
- **Multilingual i18n** — react-i18next with en, it, es, fr locales across 5 namespaces
- **UI components** — LanguagePicker, HUDOverlay (floor area/volume/ridge angle), DimensionControls
- **TypeScript types** — Strict interfaces for greenhouse geometry, crops, and covering materials

## [5.0.0-milestone-1] - 2026-08-03

### Added

- **Project foundation** — BUSL-1.1 license, README with required header badges, `.gitignore`
- **Living documentation** — `docs/ARCHITECTURE.md`, `docs/API_SPEC.md`
- **Backend FastAPI skeleton** — Health check and simulation REST endpoint
- **FAO-56 Penman-Monteith engine** (`backend/app/simulation/fao56.py`)
  - Extraterrestrial radiation (Ra) from latitude and Julian day
  - Angstrom solar radiation estimation from sunshine hours
  - Net radiation (Rn) via FAO-56 Eq. 15–20
  - Daily ET0 via FAO-56 Eq. 6
- **Psychrometric module** (`backend/app/simulation/psychrometrics.py`)
  - Magnus-Tetens saturation vapor pressure (FAO-56 Eq. 11)
  - Slope of saturation curve Δ (FAO-56 Eq. 13)
  - Psychrometric constant γ (FAO-56 Eq. 8)
- **VPD module** (`backend/app/simulation/vpd.py`)
  - Vapor Pressure Deficit calculation in kPa
  - Crop-stage normalized stress index
- **DLI module** (`backend/app/simulation/dli.py`)
  - Daily Light Integral from solar radiation and covering transmittance
  - Crop adequacy index against species-specific requirements
- **Simulation orchestrator** (`backend/app/simulation/engine.py`) — Unified pipeline with Pydantic v2 schemas
- **Docker support** — Python 3.11-slim container for backend deployment
