/** Psychrometric helpers for preview microclimate and equipment-aware heatmaps. */

import { PAD_WET_BULB_MARGIN_C } from "@/lib/coolingConstants";

/** Magnus–Tetens saturation vapor pressure (kPa). */
export function saturationVaporPressureKpa(temperatureC: number): number {
  return 0.6108 * Math.exp((17.27 * temperatureC) / (temperatureC + 237.3));
}

/**
 * Wet-bulb temperature (°C) via Stull (2011) — valid for 5–45 °C, 5–99 % RH.
 * Sets the thermodynamic floor for evaporative (pad) cooling.
 */
export function approxWetBulbC(dryBulbC: number, rhPct: number): number {
  const rh = Math.max(1, Math.min(100, rhPct));
  const t = dryBulbC;
  return (
    t * Math.atan(0.151977 * Math.sqrt(rh + 8.313659)) +
    Math.atan(t + rh) -
    Math.atan(rh - 1.676331) +
    0.00391838 * rh ** 1.5 * Math.atan(0.023101 * rh) -
    4.686035
  );
}

/** Minimum achievable internal air temperature with evaporative pad cooling (°C). */
export function padCoolingTempFloorC(externalTempC: number, externalRhPct: number): number {
  return approxWetBulbC(externalTempC, externalRhPct) - PAD_WET_BULB_MARGIN_C;
}
