# GreenhouseOS 5.0 — API Specification

## Base URL

```
http://localhost:8000
```

Production deployments will use environment-configured origins with CORS enabled for the frontend.

---

## Health Check

### `GET /health`

Returns service liveness and version.

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

Execute FAO-56 Penman-Monteith ET0 with VPD and DLI agronomic metrics.

**Request Body:**

```json
{
  "climate": {
    "latitude_deg": 41.9028,
    "longitude_deg": 12.4964,
    "elevation_m": 21.0,
    "temperature_max_c": 34.0,
    "temperature_min_c": 22.0,
    "relative_humidity_pct": 72.0,
    "wind_speed_m_s": 2.5,
    "sunshine_hours": 10.5,
    "solar_radiation_mj_m2_day": null,
    "simulation_date": "2026-08-03"
  },
  "covering": {
    "type": "glass",
    "transmittance": 0.85,
    "u_value": 5.8
  },
  "crop_type": "tomato",
  "growth_stage": "mid_season"
}
```

| Field | Type | Required | Description |
|-------|------|----------|-------------|
| `climate.latitude_deg` | float | Yes | -90 to 90 |
| `climate.longitude_deg` | float | Yes | -180 to 180 |
| `climate.elevation_m` | float | No | Meters above sea level (default 0) |
| `climate.temperature_max_c` | float | Yes | Maximum daily temperature °C |
| `climate.temperature_min_c` | float | Yes | Minimum daily temperature °C |
| `climate.relative_humidity_pct` | float | Yes | 0–100 |
| `climate.wind_speed_m_s` | float | No | Wind at 2 m (default 2.0) |
| `climate.sunshine_hours` | float | No | Used for Angstrom Rs estimation |
| `climate.solar_radiation_mj_m2_day` | float | No | Overrides Angstrom if provided |
| `climate.simulation_date` | date | No | Defaults to today |
| `covering.type` | string | No | Material identifier |
| `covering.transmittance` | float | No | 0–1 (default 0.85) |
| `covering.u_value` | float | No | W/m²/K (default 5.8) |
| `crop_type` | enum | No | tomato, cucumber, pepper, lettuce, strawberry, cannabis |
| `growth_stage` | enum | No | seedling, early_vegetative, mid_season, late_vegetative, generative, harvest |

**Response 200:**

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
    "dli_adequacy_index": 0.937,
    "temperature_mean_c": 28.0,
    "saturation_vapor_pressure_kpa": 3.782,
    "actual_vapor_pressure_kpa": 2.528
  },
  "crop_type": "tomato",
  "growth_stage": "mid_season"
}
```

**Error 422:** Validation failure (invalid temperature range, out-of-bounds latitude, etc.)

---

## WebSocket — Real-Time Simulation

### `WS /ws/simulation`

High-speed WebSocket pipeline for live greenhouse simulation. Target: **<50 ms** per update.

**Connection:** `ws://localhost:8000/ws/simulation` (proxied via Vite at `/ws/simulation`)

#### Client → Server: `UPDATE_SIMULATION`

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
    "heatmap_matrix": [[28.1, 28.4], [27.9, 28.2]],
    "computation_ms": 0.74,
    "ventilation_ach": 2.3
  }
}
```

#### Keepalive: `PING` / `PONG`

Client sends `{"event": "PING"}` every 30 s. Server responds with `{"event": "PONG"}`.

#### Error Response

```json
{
  "event": "ERROR",
  "message": "Validation error: 2 field(s)"
}
```

---

## Multi-AI Copilot

### `GET /api/v1/ai/providers`

List configured AI providers and availability status.

**Response 200:**

```json
[
  {
    "id": "openai",
    "name": "OpenAI",
    "default_model": "gpt-4o",
    "available": false,
    "requires_api_key": true
  }
]
```

### `POST /api/v1/ai/chat`

Natural-language copilot message with greenhouse context.

**Request Body:**

```json
{
  "provider": "openai",
  "model": null,
  "message": "How can I reduce VPD stress for my tomatoes?",
  "context": {
    "crop_type": "tomato",
    "growth_stage": "mid_season",
    "lai": 3.2,
    "vpd_kpa": 1.8,
    "internal_temp_c": 30.0,
    "internal_rh_pct": 72.0
  },
  "locale": "en"
}
```

**Response 200:**

```json
{
  "provider": "openai",
  "model": "greenhouseos-local-optimizer",
  "content": "GreenhouseOS Local Optimizer — analysis...",
  "setpoints": [
    {
      "parameter": "ventilation_lee_side",
      "current_value": 0.0,
      "recommended_value": 25.0,
      "unit": "%",
      "rationale": "Increase ventilation to reduce VPD stress"
    }
  ],
  "used_local_engine": true
}
```

Falls back to the built-in FAO-56 rule-based optimizer when the selected provider is unavailable.

### `POST /api/v1/ai/optimize-climate`

Autonomous microclimate optimization with structured Priva/Ridder-compatible setpoints.

**Request Body:**

```json
{
  "provider": "anthropic",
  "context": {
    "crop_type": "tomato",
    "growth_stage": "generative",
    "vpd_kpa": 1.5,
    "internal_temp_c": 28.4
  },
  "locale": "it"
}
```

**Response 200:** Same schema as `/ai/chat`.

### Environment Variables

| Variable | Description |
|----------|-------------|
| `OPENAI_API_KEY` | OpenAI API key |
| `ANTHROPIC_API_KEY` | Anthropic API key |
| `GEMINI_API_KEY` | Google Gemini API key |
| `OLLAMA_BASE_URL` | Ollama server URL (default `http://localhost:11434`) |
| `OLLAMA_MODEL` | Ollama model name (default `llama3.2`) |

Supported providers: OpenAI, Anthropic, Google Gemini, Ollama (local).
