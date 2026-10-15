# API Contracts — REST & WebSocket (Redacted)

[[Home]] · [[02-System-Overview]] · [[10-Security-Redaction-Policy]]

---

## Base URL

```
http://localhost:8000          # Local development
```

Production base URLs are deployment-specific and excluded from this document.

---

## Health Check

### `GET /health`

**Response 200:**

```json
{
  "status": "healthy",
  "version": "5.0.0"
}
```

---

## Simulation

### `POST /api/v1/simulation/run`

Execute FAO-56 Penman-Monteith ET₀ with VPD and DLI agronomic metrics.

**Request (representative):**

```json
{
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
}
```

**Response (representative):**

```json
{
  "et0": {
    "et0_mm_day": 4.852,
    "net_radiation_mj_m2_day": 12.340,
    "solar_radiation_mj_m2_day": 22.150,
    "daylight_hours": 14.52
  },
  "agronomic": {
    "vpd_kpa": 1.254,
    "vpd_stress_index": 0.045,
    "dli_mol_m2_day": 18.732,
    "dli_adequacy_index": 0.937
  }
}
```

Full schema: `backend/app/simulation/schemas.py`

---

## WebSocket — Real-Time Simulation

### Endpoint

```
WS /ws/simulation
```

### Client → Server: `UPDATE_SIMULATION`

```json
{
  "event": "UPDATE_SIMULATION",
  "data": {
    "location": { "lat": 41.9028, "lon": 12.4964 },
    "geometry": { "length": 30.0, "width": 10.0, "ridge_height": 4.5, "eave_height": 3.0 },
    "materials": { "covering_type": "glass", "transmittance": 0.85, "u_value": 5.8 },
    "crop": { "type": "tomato", "system": "hydroponic_nft", "lai": 3.2, "growth_stage": "mid_season" }
  }
}
```

### Server → Client: `SIMULATION_RESULTS`

```json
{
  "event": "SIMULATION_RESULTS",
  "data": {
    "thermal_balance": {
      "q_solar": 450.5,
      "q_transpiration": -120.3,
      "q_ventilation": -80.2,
      "q_net_delta": 250.0
    },
    "microclimate": {
      "internal_temp": 28.4,
      "external_temp": 34.0,
      "internal_rh": 72.1,
      "vpd_kpa": 1.25,
      "et0_fao56": 4.85
    },
    "heatmap_matrix": ["..."]
  }
}
```

### Heartbeat

```json
{ "event": "PING" }  →  { "event": "PONG" }
```

Schema: `backend/app/simulation/websocket_schemas.py`

---

## AI Endpoints

| Method | Path | Description |
|--------|------|-------------|
| GET | `/api/v1/ai/providers` | List providers and availability |
| POST | `/api/v1/ai/chat` | Natural-language climate chat |
| POST | `/api/v1/ai/optimize-climate` | Structured optimization |

---

## Data Endpoints

| Method | Path | Description |
|--------|------|-------------|
| GET | `/api/v1/greenhouses` | List user greenhouses |
| POST | `/api/v1/greenhouses` | Create/update greenhouse |
| DELETE | `/api/v1/greenhouses/{id}` | Delete greenhouse |

---

## Export Endpoints

| Method | Path | Description |
|--------|------|-------------|
| POST | `/api/v1/export/climate-computer` | Generate vendor JSON |

---

## CORS Policy

- Development origins: `localhost:5173`, `localhost:3000`
- Production: regex pattern for `*.vercel.app` deployments
- Credentials allowed; all methods and headers permitted

Actual production origin lists are environment-configured.

---

## Error Responses

Standard FastAPI error format:

```json
{
  "detail": "Validation error description"
}
```

HTTP status codes: 200 (success), 400 (validation), 401 (auth), 404 (not found), 422 (schema), 500 (server).

---

*Continue to [[10-Security-Redaction-Policy]]*
