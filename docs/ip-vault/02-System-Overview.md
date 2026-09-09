# System Overview

[[Home]] · [[01-Executive-Summary]] · [[03-Physics-Engine]] · [[09-API-Contracts]]

---

## Architectural Topology

GreenhouseOS follows a **modular monorepo** pattern with strict separation of concerns:

```text
┌─────────────────────────────────────────────────────────┐
│                    Frontend (React/R3F)                  │
│  Viewport3D │ Zustand Store │ i18n │ AI Copilot Panel   │
└────────────────────────┬────────────────────────────────┘
                         │ REST / WebSocket
┌────────────────────────▼────────────────────────────────┐
│                  Backend (FastAPI)                       │
│  Simulation Engine │ AI Gateway │ Export │ Data Layer   │
└────────────────────────┬────────────────────────────────┘
                         │
┌────────────────────────▼────────────────────────────────┐
│                  Supabase (PostgreSQL + RLS)             │
│  profiles │ greenhouses │ auth.users                     │
└─────────────────────────────────────────────────────────┘
```

---

## Repository Structure

```text
greenhouse-os-5.0/
├── LICENSE                         # BUSL-1.1
├── README.md
├── CHANGELOG.md
├── docs/
│   ├── ARCHITECTURE.md
│   ├── API_SPEC.md
│   ├── THERMAL_EQUIPMENT_AUDIT.csv
│   └── ip-vault/                   # This knowledge vault
├── backend/
│   ├── app/
│   │   ├── main.py                 # FastAPI entrypoint
│   │   ├── core/                   # Configuration
│   │   ├── simulation/             # Physics engines
│   │   ├── ai/                     # Multi-AI gateway
│   │   ├── data/                   # Greenhouse CRUD
│   │   └── export/                 # Climate computer export
│   ├── requirements.txt
│   ├── Dockerfile
│   └── scripts/stress_test.py
├── frontend/
│   ├── src/
│   │   ├── components/3d/          # R3F viewport
│   │   ├── components/ui/          # HUD, dashboard
│   │   ├── components/ai/          # Copilot panel
│   │   ├── components/auth/        # Supabase auth
│   │   ├── hooks/                  # WebSocket, AI, auth
│   │   ├── store/                  # Zustand
│   │   ├── lib/thermal/            # Client-side thermal solver
│   │   └── locales/                # en, it, es, fr
│   └── package.json
└── supabase/migrations/            # Database DDL
```

---

## Backend Module Responsibilities

| Module | Path | Responsibility |
|--------|------|----------------|
| Entrypoint | `backend/app/main.py` | FastAPI app, CORS, route registration, WebSocket |
| Config | `backend/app/core/config.py` | Environment-based Pydantic Settings |
| Simulation | `backend/app/simulation/` | FAO-56, thermal, WebSocket handler |
| AI | `backend/app/ai/` | Multi-provider gateway, local optimizer |
| Data | `backend/app/data/` | Greenhouse persistence service |
| Export | `backend/app/export/` | Climate computer JSON generation |

---

## Frontend Module Responsibilities

| Module | Path | Responsibility |
|--------|------|----------------|
| 3D Viewport | `frontend/src/components/3d/` | Canvas, mesh, shaders, equipment |
| UI Overlay | `frontend/src/components/ui/` | HUD, dashboard, controls |
| AI Copilot | `frontend/src/components/ai/` | Chat panel, GAIA integration |
| Auth | `frontend/src/components/auth/` | Supabase sign-in/up |
| State | `frontend/src/store/useGreenhouseStore.ts` | Single source of truth |
| Thermal lib | `frontend/src/lib/thermal/` | Client-side microclimate solver |
| Hooks | `frontend/src/hooks/` | WebSocket, AI, auth abstractions |

---

## Communication Patterns

### REST API

- **Prefix:** `/api/v1`
- **Simulation:** `POST /simulation/run` — synchronous FAO-56 batch run
- **AI:** `POST /ai/chat`, `POST /ai/optimize-climate`
- **Data:** `GET/POST/DELETE /greenhouses`
- **Export:** `POST /export/climate-computer`
- **Health:** `GET /health`

### WebSocket

- **Endpoint:** `WS /ws/simulation`
- **Events:** `UPDATE_SIMULATION` → `SIMULATION_RESULTS`, `PING` → `PONG`
- **Target latency:** p95 < 50 ms per update

See [[09-API-Contracts]] for payload schemas.

---

## Configuration Model

All runtime secrets are loaded from **environment variables** via Pydantic Settings. No credentials are embedded in source code. Configuration categories:

| Category | Variables (names only) | Notes |
|----------|------------------------|-------|
| Application | `APP_NAME`, `DEBUG`, `CORS_ORIGINS` | Non-sensitive defaults |
| AI providers | `GEMINI_API_KEY` | Optional; local optimizer fallback |
| Supabase | `SUPABASE_URL`, `SUPABASE_ANON_KEY`, `SUPABASE_SERVICE_ROLE_KEY` | Required for production persistence |

> **Redacted:** Actual values are never documented in this vault. See [[10-Security-Redaction-Policy]].

---

## Deployment Topology (Abstract)

```text
[Browser] ──HTTPS──► [CDN / Static Host] ──► React SPA
     │
     ├── REST/WS ──► [FastAPI Backend] ──► [Supabase PostgreSQL]
     │
     └── (optional) ──► [AI Provider APIs] via server-side proxy
```

Production hostnames, regions, and scaling parameters are deployment-specific and excluded from this document.

---

*Continue to [[03-Physics-Engine]]*
