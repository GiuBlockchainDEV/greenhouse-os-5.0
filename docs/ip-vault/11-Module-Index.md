# Module Index — Complete File Registry

[[Home]] · [[02-System-Overview]] · [[12-IP-Declaration]]

---

## Summary Statistics

| Metric | Value |
|--------|-------|
| Total source files | 113 |
| Total lines of code | ~15,231 |
| Backend Python modules | ~45 |
| Frontend TypeScript/TSX modules | ~68 |
| SQL migrations | 1 |
| Documentation files | 5+ |
| Supported locales | 4 (en, it, es, fr) |

---

## Backend Modules

### Core

| File | Lines (approx.) | Responsibility |
|------|-----------------|----------------|
| `backend/app/main.py` | 57 | FastAPI entrypoint, CORS, routes |
| `backend/app/core/config.py` | 36 | Pydantic Settings from env |

### Simulation Engine

| File | Responsibility |
|------|----------------|
| `simulation/engine.py` | SimulationEngine orchestrator |
| `simulation/fao56.py` | Penman-Monteith ET₀ pipeline |
| `simulation/psychrometrics.py` | Magnus-Tetens, Δ, γ |
| `simulation/vpd.py` | VPD calculation + stress index |
| `simulation/dli.py` | DLI + adequacy index |
| `simulation/thermal.py` | Thermal balance orchestration |
| `simulation/thermal_physics.py` | Energy balance coefficients |
| `simulation/realtime_engine.py` | WebSocket real-time solver |
| `simulation/climate_equipment.py` | Equipment load models |
| `simulation/cultivation.py` | Crop thermal mass, Kc |
| `simulation/geometry.py` | Greenhouse geometry helpers |
| `simulation/shading_screen.py` | Screen solar attenuation |
| `simulation/constants.py` | Physical constants |
| `simulation/schemas.py` | Pydantic request/response models |
| `simulation/websocket_handler.py` | WebSocket connection manager |
| `simulation/websocket_schemas.py` | WS event schemas |

### AI Gateway

| File | Responsibility |
|------|----------------|
| `ai/gateway.py` | MultiAIGateway router |
| `ai/base.py` | AIProvider abstract interface |
| `ai/local_optimizer.py` | Deterministic fallback optimizer |
| `ai/router.py` | FastAPI AI routes |
| `ai/schemas.py` | AI request/response models |
| `ai/prompts.py` | System prompt templates |
| `ai/providers/gemini_provider.py` | Google Gemini integration |
| `ai/providers/__init__.py` | Provider registry |

### Data Layer

| File | Responsibility |
|------|----------------|
| `data/greenhouse_service.py` | Supabase CRUD + in-memory fallback |
| `data/router.py` | Greenhouse REST endpoints |
| `data/schemas.py` | Data transfer models |

### Export

| File | Responsibility |
|------|----------------|
| `export/climate_computer.py` | Vendor JSON generation |
| `export/schemas.py` | Export request/response models |
| `export/router.py` | Export REST endpoints |

### Scripts

| File | Responsibility |
|------|----------------|
| `scripts/stress_test.py` | REST + WS latency validation |

---

## Frontend Modules

### 3D Components

| File | Responsibility |
|------|----------------|
| `components/3d/Viewport3D.tsx` | R3F Canvas setup |
| `components/3d/GreenhouseScene.tsx` | Scene graph + TransformControls |
| `components/3d/GreenhouseMesh.tsx` | Parametric greenhouse geometry |
| `components/3d/CropGridMesh.tsx` | InstancedMesh crop foliage |
| `components/3d/ClimateEquipmentMesh.tsx` | Fans, pads, ducts, heaters |
| `components/3d/HeatmapShader.tsx` | GLSL heatmap overlay |
| `components/3d/shaders/heatmapShader.ts` | Vertex/fragment shaders |

### UI Components

| File | Responsibility |
|------|----------------|
| `components/ui/HUDOverlay.tsx` | Real-time metrics HUD |
| `components/ui/ClimateDashboard.tsx` | OPEX, energy, export |
| `components/ui/DimensionControls.tsx` | Structure dimension sliders |
| `components/ui/CultivationClimateControls.tsx` | Crop & equipment controls |
| `components/ui/HeatmapControls.tsx` | Heatmap mode selector |
| `components/ui/HeatmapScaleLegend.tsx` | Color scale legend |
| `components/ui/LanguagePicker.tsx` | Locale selector |
| `components/ui/GizmoToolbar.tsx` | Transform mode toolbar |
| `components/ui/RangeGauge.tsx` | Metric gauge widget |
| `components/ui/StatusBadge.tsx` | Connection status indicator |

### AI Components

| File | Responsibility |
|------|----------------|
| `components/ai/AICopilotPanel.tsx` | Chat UI |
| `components/ai/GaiaMarkdown.tsx` | Markdown response renderer |
| `components/ai/GaiaSiteContext.tsx` | GAIA context provider |

### Auth

| File | Responsibility |
|------|----------------|
| `components/auth/AuthPanel.tsx` | Sign-in/sign-up form |

### Hooks

| File | Responsibility |
|------|----------------|
| `hooks/useSimulationWS.ts` | WebSocket connection + auto-reconnect |
| `hooks/useAICopilot.ts` | AI chat state management |
| `hooks/useAuth.ts` | Supabase auth state |

### State & Types

| File | Responsibility |
|------|----------------|
| `store/useGreenhouseStore.ts` | Zustand global state |
| `types/greenhouse.ts` | Greenhouse domain types |
| `types/simulation.ts` | Simulation result types |
| `types/ai.ts` | AI provider types |
| `types/supabase.ts` | Database types |
| `types/viewport.ts` | 3D viewport types |

### Thermal Library

| File | Responsibility |
|------|----------------|
| `lib/thermal/solveMicroclimate.ts` | Client steady-state solver |
| `lib/thermal/ventilationFlow.ts` | Flow-based ventilation |
| `lib/thermal/equipmentLoads.ts` | Equipment heat/cool loads |
| `lib/thermal/spatialField.ts` | Per-cell heatmap field |
| `lib/thermal/ratedCapacities.ts` | Equipment capacity resolution |
| `lib/thermal/constants.ts` | Frontend thermal constants |
| `lib/thermal/vpd.ts` | Client VPD calculation |
| `lib/thermal/psychrometricsExtended.ts` | Extended psychrometrics |

### Layout & Utility Libraries

| File | Responsibility |
|------|----------------|
| `lib/acDuctLayout.ts` | AC duct network layout |
| `lib/climateEquipmentLayout.ts` | Equipment 3D positioning |
| `lib/climateEquipmentCapacity.ts` | Capacity calculations |
| `lib/cultivationLayout.ts` | Crop grid layout |
| `lib/cultivationFactors.ts` | Crop-specific factors |
| `lib/equipmentAwareHeatmap.ts` | Equipment-influenced heatmap |
| `lib/heatmapFallback.ts` | Heatmap data fallback |
| `lib/heatmapInfluence.ts` | Per-system heatmap rules |
| `lib/heatmapRevision.ts` | Stable render revision token |
| `lib/heatmapSurfaceUv.ts` | Wall UV mapping |
| `lib/plantGeometry.ts` | Plant instance geometry |
| `lib/previewMicroclimate.ts` | Quick preview solver |
| `lib/psychrometrics.ts` | Basic psychrometrics |
| `lib/shadingScreen.ts` | Screen shading model |
| `lib/structureUtils.ts` | Structure geometry helpers |
| `lib/thermalEstimate.ts` | Thermal estimate wrapper |
| `lib/climateExport.ts` | Client-side export trigger |
| `lib/apiConfig.ts` | API base URL configuration |

### GAIA (AI Assistant)

| File | Responsibility |
|------|----------------|
| `lib/gaia/client.ts` | GAIA API client |
| `lib/gaia/buildContext.ts` | Context assembly |
| `lib/gaia/formatContext.ts` | Context formatting |
| `lib/gaia/prompts.ts` | Prompt templates |
| `lib/gaia/preprocessMarkdown.ts` | Markdown preprocessing |
| `lib/gaia/exportChat.ts` | Chat export utility |

### i18n

| Path | Responsibility |
|------|----------------|
| `i18n.ts` | react-i18next initialization |
| `locales/{en,it,es,fr}/*.json` | Translation namespaces (5 per locale) |

---

## Database

| File | Responsibility |
|------|----------------|
| `supabase/migrations/001_initial_schema.sql` | profiles, greenhouses, RLS, triggers |

---

## Documentation

| File | Responsibility |
|------|----------------|
| `README.md` | Project overview and quick start |
| `CHANGELOG.md` | Architectural change log |
| `docs/ARCHITECTURE.md` | System design reference |
| `docs/API_SPEC.md` | API specification |
| `docs/THERMAL_EQUIPMENT_AUDIT.csv` | Equipment coefficient audit |
| `docs/ip-vault/` | This IP knowledge vault |

---

*Continue to [[12-IP-Declaration]]*
