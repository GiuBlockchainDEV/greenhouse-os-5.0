# Climate Twin

[[Home]] · [[03-Agronomic-Intelligence]] · [[05-Virtual-Experience]]

---

## Capability Summary

The **Climate Twin** module provides real-time greenhouse energy and microclimate simulation. It couples agronomic transpiration with envelope physics and climate-equipment models to produce internal temperature, humidity, and spatial heatmaps.

---

## Observable Outputs

| Output | Description |
|--------|-------------|
| Thermal balance | Solar, transpiration, ventilation, conduction fluxes |
| Internal microclimate | Temperature, RH, VPD at steady state |
| Spatial heatmap | Per-zone temperature and VPD field |
| Equipment loads | Heating, cooling, fan energy demand |

---

## Black-Box Interface

```typescript
/** Climate twin — proprietary solver inside */
interface ClimateTwin {
  solve(context: TwinInput): TwinSnapshot;
  generateHeatmap(context: TwinInput): HeatmapField;
}

interface TwinInput extends GrowaDesignContext {
  externalClimate: ExternalClimate;
}

interface TwinSnapshot {
  internalTempC: number;
  internalRhPct: number;
  vpdKpa: number;
  energyFluxes: EnergyBalance;
}
```

---

## Equipment Categories (Abstracted)

| Category | Modelled Behaviour |
|----------|-------------------|
| Ventilation | Mechanical, natural, and infiltration exchange |
| Evaporative cooling | Pad walls, fog systems |
| Mechanical AC | Rated cooling with duct distribution |
| Heating | Localised warm zones |
| Circulation | Air mixing without direct exhaust |
| Shading | Solar flux attenuation |

> **Trade secret:** Flow coefficients, derating curves, spatial influence functions, and heatmap blending rules are **proprietary** and excluded from this document.

---

## Performance Target

Real-time simulation updates target **sub-50 ms** latency for interactive design workflows. Optimisation techniques are not disclosed.

---

*Continue to [[05-Virtual-Experience]]*
