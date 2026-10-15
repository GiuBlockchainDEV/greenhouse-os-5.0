# Data Persistence — Supabase & Greenhouse CRUD

[[Home]] · [[02-System-Overview]] · [[08-Industrial-Export]]

---

## Overview

GreenhouseOS persists user profiles and greenhouse designs via **Supabase** (PostgreSQL with Row Level Security). The backend provides a CRUD API with an in-memory fallback for local development when Supabase is not configured.

**Primary implementations:**
- `supabase/migrations/001_initial_schema.sql`
- `backend/app/data/greenhouse_service.py`
- `backend/app/data/router.py`
- `frontend/src/lib/supabase.ts`
- `frontend/src/hooks/useAuth.ts`
- `frontend/src/components/auth/AuthPanel.tsx`

---

## Database Schema

```text
auth.users ──► profiles (RLS: auth.uid() = id)
                    │
                    └──► greenhouses (RLS: auth.uid() = user_id)
                              └── public SELECT when is_public = TRUE
```

### Table: `profiles`

| Column | Type | Description |
|--------|------|-------------|
| id | UUID (PK, FK → auth.users) | User identity |
| full_name | TEXT | Display name |
| company_name | TEXT | Organization |
| preferred_language | VARCHAR(5) | Default locale (en, it, es, fr) |
| ai_provider_preferences | JSONB | Default AI provider/model selection |
| created_at | TIMESTAMPTZ | Record creation |
| updated_at | TIMESTAMPTZ | Auto-updated via trigger |

### Table: `greenhouses`

| Column | Type | Description |
|--------|------|-------------|
| id | UUID (PK) | Greenhouse identity |
| user_id | UUID (FK → profiles) | Owner |
| name | TEXT | Design name |
| description | TEXT | Optional notes |
| latitude | DOUBLE PRECISION | Geolocation |
| longitude | DOUBLE PRECISION | Geolocation |
| dimensions | JSONB | {length, width, ridge_height, eave_height} |
| covering_material | JSONB | {type, transmittance, u_value} |
| crop_config | JSONB | {crop_type, cultivation_system, lai, growth_stage} |
| is_public | BOOLEAN | Public visibility flag |
| created_at | TIMESTAMPTZ | Record creation |
| updated_at | TIMESTAMPTZ | Auto-updated via trigger |

---

## Row Level Security (RLS)

| Policy | Table | Rule |
|--------|-------|------|
| Users can manage their profile | profiles | `auth.uid() = id` |
| Users can manage their greenhouses | greenhouses | `auth.uid() = user_id` |
| Public greenhouses accessible by all | greenhouses | `is_public = TRUE` (SELECT only) |

RLS ensures users can only read/write their own data unless a greenhouse is explicitly marked public.

---

## Authentication Flow

```text
AuthPanel (Supabase Auth) → user.id
    │
    ▼
ClimateDashboard "Save" → POST /api/v1/greenhouses (X-User-Id header)
    │
    ├── Supabase PostgREST (production)
    └── In-memory dict (local dev fallback)
```

- Sign-in/sign-up via `supabase.auth.signInWithPassword` / `signUp`
- Graceful degradation when Supabase is not configured (auth panel shows unconfigured state)
- No passwords or tokens are logged or stored in application code

---

## CRUD API

| Method | Path | Description |
|--------|------|-------------|
| GET | `/api/v1/greenhouses` | List user's greenhouses |
| POST | `/api/v1/greenhouses` | Create or update greenhouse design |
| DELETE | `/api/v1/greenhouses/{id}` | Delete greenhouse |

Authentication is via the `X-User-Id` header (Supabase user UUID) in the backend service layer. Production deployments should validate JWT tokens at the API gateway level.

---

## TypeScript Types

Frontend Supabase types are defined in `frontend/src/types/supabase.ts`, generated to match the migration schema. Greenhouse domain types are in `frontend/src/types/greenhouse.ts`.

---

## Security Notes

- `SUPABASE_SERVICE_ROLE_KEY` is used only server-side for admin operations
- `SUPABASE_ANON_KEY` is safe for client-side use (RLS enforces access)
- Production URLs and keys are **never** documented in this vault
- See [[10-Security-Redaction-Policy]]

---

*Continue to [[08-Industrial-Export]]*
