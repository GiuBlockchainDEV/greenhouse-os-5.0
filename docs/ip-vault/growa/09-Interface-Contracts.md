# Interface Contracts

[[Home]] · [[08-Industrial-Bridge]] · [[10-Trade-Secret-Policy]]

---

## Public API Surface (Sanitized)

All endpoints are versioned under `/api/v1`. Production origins are environment-configured and not documented here.

---

## Health

```http
GET /health
→ { "status": "healthy", "version": "5.0.0" }
```

---

## Simulation

```http
POST /api/v1/simulation/run
```

**Request shape (abstracted):**

```json
{
  "climate": { "latitude_deg": 0.0, "longitude_deg": 0.0, "...": "..." },
  "covering": { "type": "glass", "transmittance": 0.85 },
  "crop_type": "tomato",
  "growth_stage": "mid_season"
}
```

**Response shape (abstracted):**

```json
{
  "et0": { "et0_mm_day": 0.0 },
  "agronomic": { "vpd_kpa": 0.0, "dli_mol_m2_day": 0.0 }
}
```

> Example values are placeholders. No production coordinates or customer data are used.

---

## Real-Time Stream

```text
WS /ws/simulation

Client → { "event": "UPDATE_SIMULATION", "data": { ... } }
Server → { "event": "SIMULATION_RESULTS", "data": { ... } }
```

Payload schemas define **structure only**. Internal solver fields are not specified in this vault.

---

## AI · Data · Export

| Endpoint | Purpose |
|----------|---------|
| `GET /api/v1/ai/providers` | Provider availability |
| `POST /api/v1/ai/chat` | GAIA conversation |
| `GET /api/v1/greenhouses` | List saved designs |
| `POST /api/v1/greenhouses` | Save design |
| `POST /api/v1/export/climate-computer` | Vendor export |

---

*Continue to [[10-Trade-Secret-Policy]]*
