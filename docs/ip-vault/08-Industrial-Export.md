# Industrial Export — Climate Computer Interoperability

[[Home]] · [[06-AI-Gateway]] · [[07-Data-Persistence]]

---

## Overview

GreenhouseOS exports simulation-derived setpoint rules as **standardized JSON payloads** compatible with industrial climate computers from **Priva**, **Ridder**, and **Hoogendoorn**.

**Primary implementations:**
- `backend/app/export/climate_computer.py`
- `backend/app/export/schemas.py`
- `backend/app/export/router.py`
- `frontend/src/lib/climateExport.ts`

---

## Supported Formats

| Vendor | Tag Prefix Convention | Output |
|--------|----------------------|--------|
| Priva | `Priva.` namespace | Temperature, RH, ventilation setpoints |
| Ridder | `Ridder.` namespace | Climate control rules |
| Hoogendoorn | `HGC.` namespace | Process computer setpoints |

Format selection is a request parameter; the export engine applies vendor-specific tag prefixes and unit conventions.

---

## Export Content

Each export payload includes:

| Category | Fields |
|----------|--------|
| Temperature setpoints | Day/night targets, ramp rates |
| Humidity setpoints | RH targets per crop growth stage |
| Ventilation rules | Min/max vent positions, CO₂ override thresholds |
| Screen control | Thermal screen open/close conditions |
| Heating | Boiler enable thresholds |
| Cooling | Pad/AC activation conditions |

Setpoints are derived from:

- Current simulation microclimate (VPD, temperature, DLI)
- Crop type and growth stage optimal bands
- AI copilot recommendations (when available)
- Local optimizer fallback rules

---

## REST Endpoint

| Method | Path | Description |
|--------|------|-------------|
| POST | `/api/v1/export/climate-computer` | Generate vendor-specific JSON |

Request schema includes:
- `format`: `priva` | `ridder` | `hoogendoorn`
- `greenhouse_id` (optional): load saved design
- Inline simulation parameters (alternative to saved design)

Response: vendor-formatted JSON object ready for import into climate computer configuration tools.

---

## Frontend Integration

The **ClimateDashboard** component (`frontend/src/components/ui/ClimateDashboard.tsx`) displays:

- OPEX estimate (€/day)
- Energy consumption (kWh/m²)
- CO₂ footprint (kg/day)
- Export button with format selector

Export is triggered client-side via `frontend/src/lib/climateExport.ts`, calling the backend export endpoint.

---

## Industrial Dashboard Metrics

| Metric | Calculation Basis |
|--------|-------------------|
| OPEX €/day | Equipment kW loads × energy tariff proxy |
| Energy kWh/m² | Sum of heating, cooling, fan, lighting loads / floor area |
| CO₂ kg/day | Energy × emissions factor |

These are engineering estimates for design-phase decision support, not operational billing data.

---

*Continue to [[09-API-Contracts]]*
