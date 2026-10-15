# Agronomic Intelligence

[[Home]] · [[02-Black-Box-Architecture]] · [[04-Climate-Twin]]

---

## Capability Summary

The **Agronomic Intelligence** module computes crop-relevant microclimate indices from meteorological inputs and greenhouse design parameters. It adheres to internationally recognised agronomic standards without exposing proprietary calibration logic.

---

## Observable Outputs

| Output | Unit | Purpose |
|--------|------|---------|
| Reference evapotranspiration | mm/day | Water demand baseline |
| Vapour pressure deficit | kPa | Stomatal / transpiration driver |
| Daily light integral | mol/m²/day | Photosynthesis adequacy |
| Stress indices | 0–1 | Crop-stage deviation signals |

---

## Black-Box Interface

```typescript
/** Agronomic engine — implementation is proprietary */
interface AgronomicEngine {
  evaluate(context: AgronomicInput): AgronomicSnapshot;
}

interface AgronomicInput {
  climate: ExternalClimate;
  covering: CoveringMaterial;
  crop: CropProfile;
}

interface AgronomicSnapshot {
  et0: number;           // mm/day
  vpdKpa: number;
  dliMolM2Day: number;
  stressIndices: StressMap;
}
```

---

## Standards Alignment (Public Knowledge)

The engine is **aligned with** — but not a reproduction of — published references:

- FAO Irrigation and Drainage Paper 56 (reference evapotranspiration)
- ASHRAE psychrometric fundamentals (humidity calculations)

> **Trade secret:** Crop-specific coefficients, tuning parameters, and solver optimisations are **not documented** in this vault.

---

## Supported Crop Families

Tomato · Cucumber · Pepper · Lettuce · Strawberry · Cannabis

Each crop supports multiple growth stages with stage-aware optimal bands. Specific coefficient tables are proprietary.

---

*Continue to [[04-Climate-Twin]]*
