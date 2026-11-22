# Market greenhouse presets

Twenty-four OEM-style models are defined in `frontend/src/lib/marketGreenhousePresets.ts`. Applying a preset copies structure (bays × module width), ridge/eave heights, covering, crop, cultivation system, and a **typical climate equipment** pack into the Zustand store (no re-application of cooling defaults).

## Equipment heuristics

`frontend/src/lib/marketGreenhouseEquipment.ts` derives fan, pad, vent, and heating counts from bay count, greenhouse width/length, and cooling/ventilation mode. Counts are capped to match backend `ClimateEquipmentSizingInput` limits (e.g. exhaust ≤ 12, HAF ≤ 24, ridge vents ≤ 12).

Rules of thumb:

| Mode | Gable exhaust | HAF | Pad wall |
|------|---------------|-----|----------|
| Fan & pad / evaporative | Yes, span-based, capped | Lower in tunnels, up to 4× bays in glass | ≥ 90% width |
| High-pressure fog + roof vents | No gable exhaust | Glass-scale | None |
| Mechanical AC + combined | Few fans (≈ bays) | Glass-scale | None |
| Unheated poly tunnel | Exhaust if pad/evap | 2× bays | When evaporative |

Semi-closed houses (Ultra-Clima, SuprimAir, ModuleAir, Texlon, Nexus) use reduced gable exhaust and modest ridge/roof exhaust fan counts under `combined` ventilation.

## Validation

`frontend/src/lib/marketGreenhouseValidate.ts` checks all presets against WebSocket limits, HAF divisibility, and obvious HVAC mismatches (e.g. pad width without evaporative cooling). Run locally:

```bash
cd frontend && npx tsx -e "import { validateMarketGreenhousePresets } from './src/lib/marketGreenhouseValidate.ts'; console.log(validateMarketGreenhousePresets());"
```

## Geometry

`marketGreenhouseGeometry.ts` clamps catalog ridge height to plausible rise per arch type (Venlo vs tunnel) so entered OEM dimensions stay within renderer expectations.