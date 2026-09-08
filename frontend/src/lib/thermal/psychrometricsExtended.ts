/** Extended psychrometrics: humidity ratio and RH from mass balance state. */

import { saturationVaporPressureKpa } from "@/lib/psychrometrics";

const EPSILON = 0.62198;
const DEFAULT_PRESSURE_KPA = 101.325;

export function humidityRatioKgKg(
  temperatureC: number,
  rhPct: number,
  pressureKpa = DEFAULT_PRESSURE_KPA,
): number {
  const es = saturationVaporPressureKpa(temperatureC);
  const ea = es * Math.max(0, Math.min(100, rhPct)) / 100;
  return (EPSILON * ea) / Math.max(pressureKpa - ea, 0.01);
}

export function rhPctFromHumidityRatio(
  temperatureC: number,
  humidityRatioKgKg: number,
  pressureKpa = DEFAULT_PRESSURE_KPA,
): number {
  const es = saturationVaporPressureKpa(temperatureC);
  const ea = (humidityRatioKgKg * pressureKpa) / (EPSILON + humidityRatioKgKg);
  return Math.max(0, Math.min(100, (ea / Math.max(es, 1e-6)) * 100));
}

export function saturationHumidityRatioKgKg(
  temperatureC: number,
  pressureKpa = DEFAULT_PRESSURE_KPA,
): number {
  const es = saturationVaporPressureKpa(temperatureC);
  return (EPSILON * es) / Math.max(pressureKpa - es, 0.01);
}

export function humidityRatioFromWetBulb(
  dryBulbC: number,
  wetBulbC: number,
  pressureKpa = DEFAULT_PRESSURE_KPA,
): number {
  const ws = saturationHumidityRatioKgKg(wetBulbC, pressureKpa);
  return (
    ws -
    ((CP_AIR_KG_K * (dryBulbC - wetBulbC)) / LATENT_HEAT_MJ_KG)
  );
}

const CP_AIR_KG_K = 1.005;
const LATENT_HEAT_MJ_KG = 2.45;

export function padOutletState(
  externalTempC: number,
  externalRhPct: number,
  padEfficiency: number,
  wetBulbC: number,
): { temperatureC: number; humidityRatioKgKg: number } {
  const wOut = humidityRatioKgKg(externalTempC, externalRhPct);
  const temperatureC = externalTempC - padEfficiency * (externalTempC - wetBulbC);
  const wPad = humidityRatioFromWetBulb(temperatureC, wetBulbC);
  return {
    temperatureC,
    humidityRatioKgKg: Math.max(wOut, wPad),
  };
}
