# Changelog

All notable architectural changes to GreenhouseOS 5.0 are documented here.

Format based on [Keep a Changelog](https://keepachangelog.com/en/1.1.0/).

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
