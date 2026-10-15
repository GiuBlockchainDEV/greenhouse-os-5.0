# Thermal Simulation — Energy Balance & Equipment Models

[[Home]] · [[03-Physics-Engine]] · [[05-3D-Frontend]]

---

## Overview

The thermal simulation layer solves a **quasi-steady-state greenhouse energy balance** in real time, coupling FAO-56 transpiration with envelope conduction, ventilation, and climate equipment loads. Frontend and backend implementations share calibrated coefficients for parity.

**Primary implementations:**
- `backend/app/simulation/thermal_physics.py`
- `backend/app/simulation/thermal.py`
- `backend/app/simulation/realtime_engine.py`
- `backend/app/simulation/climate_equipment.py`
- `frontend/src/lib/thermal/solveMicroclimate.ts`
- `frontend/src/lib/thermalEstimate.ts`

**Equipment specification audit:** `docs/THERMAL_EQUIPMENT_AUDIT.csv`

---

## Greenhouse Energy Balance

$$
Q_{net} = Q_{solar} + Q_{transpiration} + Q_{ventilation} + Q_{conduction} \approx 0
$$

| Flux | Unit | Description |
|------|------|-------------|
| $Q_{solar}$ | W/m² | Transmitted solar gain through covering |
| $Q_{transpiration}$ | W/m² | Latent heat from crop ET (FAO-56 × Kc × LAI) |
| $Q_{ventilation}$ | W/m² | Sensible heat loss via air exchange (ACH) |
| $Q_{conduction}$ | W/m² | Envelope heat loss via U-value |

Internal temperature is solved at quasi-steady state from net energy gain and total conductance.

---

## Key Physical Coefficients

| Parameter | Value | Notes |
|-----------|-------|-------|
| Air density ρ | 1.2 kg/m³ | Ventilation sensible heat |
| Air $c_p$ | 1005 J/(kg·K) | Ventilation sensible heat |
| Latent heat λ | 2.45 MJ/kg | Transpiration latent heat |
| Solar absorption | 0.72 × τ | Fraction of transmitted radiation heating air |
| RH coupling | 1.0 %/°C | Internal RH shift per °C below external dry-bulb |
| Cooling capacity factor | 1.15 | Applied to pad, fog, evaporative, and AC deltas |

---

## Ventilation Model (Qatar-Corrected)

Flow-based ventilation combining:

| Mechanism | Description |
|-----------|-------------|
| Mechanical | Exhaust fan throat area × velocity |
| Wind | Facade pressure differential |
| Stack | Buoyancy-driven ridge vent flow |
| Infiltration | Baseline air leakage (ACH) |

**ACH fan boost:** $(A_{fan}/A_{floor}) \times 8$  
**ACH vent boost:** $(A_{vent}/A_{floor}) \times 2.5$  
**ACH circulation:** $\min(N_{circ}, 24) \times 0.15$ (HAF mixing only — no direct exhaust)

---

## Climate Equipment Models

| Equipment | Model Behavior |
|-----------|----------------|
| Fan-and-pad | Wet-bulb depression with diminishing returns; pad outlet state |
| Evaporative cooling | $T_{wb} - 1.5/1.15$ °C floor |
| High-pressure fog | Full-length RH bands aloft |
| Mechanical AC | kW-rated with high-ambient derating; 12 °C floor |
| Heating | Warm spots near heaters; gated below 22 °C setpoint |
| HAF circulation | Mixing only — dampens local ΔT/ΔRH, no cooling |
| Shading screen | Solar flux attenuation |

Rated capacity fields (m³/h, kW, COP, SHR, pad/fog efficiency) are exposed in the UI and wired through WebSocket payloads.

---

## Moisture Balance

Humidity-ratio based moisture balance tracks:

- Transpiration moisture addition
- Ventilation moisture exchange
- Pad/fog evaporative humidification
- Per-cell RH derivation for spatial heatmaps

---

## Spatial Heatmap Engine

The heatmap produces a 2D matrix of per-cell temperature and VPD values influenced by equipment placement:

| System | Spatial Pattern |
|--------|-----------------|
| Solar | Directional beam on roof/walls/floor |
| Pad / evaporative | Cool humid plume at pad wall + airflow transit |
| Exhaust fans | Cool/dry near exhaust gable |
| HAF circulation | Mixing (dampens local ΔT/ΔRH) |
| Roof/side vents | Cool near openings |
| Mechanical AC | Duct network + diffusers |
| High-pressure fog | Full-length bands along fog lines |
| Heating | Warm spots near heaters |

**Frontend:** `frontend/src/lib/equipmentAwareHeatmap.ts`, `frontend/src/lib/thermal/spatialField.ts`  
**Shader rendering:** See [[05-3D-Frontend#GLSL Heatmap Shader]]

Heatmap color scale: fixed 0–50 °C reference with crop working-range band.

---

## Real-Time WebSocket Pipeline

```text
Client                          Server
  │                               │
  ├── UPDATE_SIMULATION ─────────►│ RealtimeSimulationEngine.run()
  │                               │   ├── FAO-56 ET0 (~0.3 ms)
  │                               │   └── Thermal balance (~0.4 ms)
  │◄── SIMULATION_RESULTS ────────┤
  │                               │
  ├── PING ──────────────────────►│
  │◄── PONG ───────────────────────┤
```

**Endpoint:** `WS /ws/simulation`  
**Handler:** `backend/app/simulation/websocket_handler.py`  
**Frontend hook:** `frontend/src/hooks/useSimulationWS.ts`  
**Target:** p95 < 50 ms per update (validated by `backend/scripts/stress_test.py`)

---

## Cultivation Thermal Mass

A cultivation thermal mass divisor (≥ 1.0) dampens temperature deviation from steady state without sub-unity amplification, modeling the buffering effect of substrate and crop biomass.

---

*Continue to [[05-3D-Frontend]]*
