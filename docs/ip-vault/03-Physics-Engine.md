# Physics Engine — FAO-56 Agronomic Core

[[Home]] · [[02-System-Overview]] · [[04-Thermal-Simulation]]

---

## Overview

The agronomic physics engine implements **FAO-56 Penman-Monteith** reference evapotranspiration (ET₀) combined with **Vapor Pressure Deficit (VPD)** and **Daily Light Integral (DLI)** calculations. These form the biological foundation upon which the [[04-Thermal-Simulation]] energy balance operates.

**Primary implementations:**
- `backend/app/simulation/fao56.py`
- `backend/app/simulation/psychrometrics.py`
- `backend/app/simulation/vpd.py`
- `backend/app/simulation/dli.py`
- `backend/app/simulation/engine.py` (orchestrator)

---

## FAO-56 Penman-Monteith ET₀

Reference evapotranspiration for a well-watered grass reference crop:

$$
ET_0 = \frac{0.408 \cdot \Delta \cdot (R_n - G) + \gamma \cdot \frac{900}{T + 273} \cdot u_2 \cdot (e_s - e_a)}{\Delta + \gamma \cdot (1 + 0.34 \cdot u_2)}
$$

| Symbol | Unit | Description |
|--------|------|-------------|
| $ET_0$ | mm/day | Reference evapotranspiration |
| $R_n$ | MJ/m²/day | Net radiation at crop surface |
| $G$ | MJ/m²/day | Soil heat flux (≈ 0 daily) |
| $T$ | °C | Mean daily air temperature |
| $u_2$ | m/s | Wind speed at 2 m height |
| $e_s$ | kPa | Saturation vapor pressure |
| $e_a$ | kPa | Actual vapor pressure |
| $\Delta$ | kPa/°C | Slope of saturation vapor pressure curve |
| $\gamma$ | kPa/°C | Psychrometric constant |

### Pipeline Stages

1. **Extraterrestrial radiation** ($R_a$) — latitude and day-of-year dependent
2. **Solar radiation** ($R_s$) — Angstrom model or direct input
3. **Net radiation** ($R_n$) — albedo and longwave corrections
4. **ET₀** — full Penman-Monteith assembly

---

## Saturation Vapor Pressure (Magnus-Tetens)

$$
e_s = 0.6108 \cdot \exp\left(\frac{17.27 \cdot T}{T + 237.3}\right)
$$

**Implementation:** `backend/app/simulation/psychrometrics.py`

---

## Vapor Pressure Deficit (VPD)

$$
VPD = e_s(T) - e_a
$$

VPD drives stomatal conductance and transpiration. Crop-stage optimal ranges:

| Growth Stage | Optimal VPD (kPa) |
|--------------|-------------------|
| Seedling | 0.4 – 0.8 |
| Vegetative | 0.8 – 1.2 |
| Generative | 1.0 – 1.5 |

A **VPD stress index** (0–1) quantifies deviation from the optimal band for the selected crop and growth stage.

**Implementation:** `backend/app/simulation/vpd.py`

---

## Daily Light Integral (DLI)

$$
DLI = 0.0864 \cdot f_{PAR} \cdot R_s \cdot \tau
$$

| Symbol | Unit | Description |
|--------|------|-------------|
| $DLI$ | mol/m²/day | Daily light integral |
| $f_{PAR}$ | mol/MJ | PAR fraction (2.08) |
| $R_s$ | MJ/m²/day | Global solar radiation |
| $\tau$ | — | Covering transmittance (0–1) |

A **DLI adequacy index** compares calculated DLI against crop-specific requirements.

**Implementation:** `backend/app/simulation/dli.py`

---

## Supported Crops & Growth Stages

### Crop Types

`tomato`, `cucumber`, `pepper`, `lettuce`, `strawberry`, `cannabis`

### Growth Stages

`seedling`, `early_vegetative`, `mid_season`, `late_vegetative`, `generative`, `harvest`

Each crop/stage combination carries calibrated Kc (crop coefficient), VPD band, and DLI target values defined in `backend/app/simulation/constants.py` and mirrored in frontend cultivation factors.

---

## Simulation Engine Orchestration

```text
SimulationRequest (JSON)
    │
    ▼
SimulationEngine.run()
    ├── calculate_et0()        → ET0Result
    ├── calculate_vpd_kpa()  → VPD + stress index
    └── calculate_dli()      → DLI + adequacy index
    │
    ▼
SimulationResponse (JSON)
```

**Entry point:** `POST /api/v1/simulation/run`  
**Schema validation:** Pydantic v2 models in `backend/app/simulation/schemas.py`

---

## Physical Constants

Centralized in `backend/app/simulation/constants.py`:

- Psychrometric constant γ
- PAR fraction $f_{PAR}$
- Crop coefficients (Kc) per crop/stage
- Albedo values for net radiation
- ASHRAE-aligned psychrometric helpers

---

## References

- Allen, R.G., Pereira, L.S., Raes, D., Smith, M. (1998). *Crop Evapotranspiration — Guidelines for Computing Crop Water Requirements.* FAO Irrigation and Drainage Paper 56.
- ASHRAE Handbook — Fundamentals (psychrometric properties).

---

*Continue to [[04-Thermal-Simulation]]*
