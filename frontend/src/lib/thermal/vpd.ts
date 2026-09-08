/** VPD from temperature and RH. */

import { saturationVaporPressureKpa } from "@/lib/psychrometrics";

export function calculateVpdKpa(temperatureC: number, relativeHumidityPct: number): number {
  const es = saturationVaporPressureKpa(temperatureC);
  const ea = es * Math.max(0, Math.min(100, relativeHumidityPct)) / 100;
  return Math.max(0, es - ea);
}
