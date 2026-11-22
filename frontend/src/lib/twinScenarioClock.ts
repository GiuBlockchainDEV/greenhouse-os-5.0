import type { ClimateScenario } from "@/types/greenhouse";

/** Map virtual time-of-day (minutes 0–1440) to exterior weather and sun pose. */
export function climateScenarioFromClock(
  clockMin: number,
  baseline: Pick<ClimateScenario, "externalTempC" | "externalRhPct" | "windSpeedMS">,
): Partial<ClimateScenario> {
  const hour = ((clockMin % 1440) + 1440) % 1440 / 60;
  const dawn = 5.5;
  const dusk = 19.5;
  const inDaylight = hour >= dawn && hour <= dusk;
  const daySpan = dusk - dawn;
  const noon = (dawn + dusk) / 2;
  const phase = inDaylight ? (hour - noon) / (daySpan / 2) : hour < dawn ? -1 : 1;
  const daylightFactor = inDaylight ? Math.cos((phase * Math.PI) / 2) : 0;
  const elevation = Math.max(0, daylightFactor * 62);
  const intensity = Math.max(0, daylightFactor * 100);
  const azimuth = inDaylight ? 90 + phase * 90 : 180;

  const tempSwing = daylightFactor * 5;
  const nightCool = inDaylight ? 0 : -3;

  return {
    externalTempC: Number((baseline.externalTempC + tempSwing + nightCool).toFixed(1)),
    externalRhPct: Number(
      Math.min(98, Math.max(35, baseline.externalRhPct + (inDaylight ? -8 : 12))).toFixed(0),
    ),
    windSpeedMS: Number(
      Math.max(0.2, baseline.windSpeedMS + (inDaylight ? 0.4 : -0.3)).toFixed(1),
    ),
    solarElevationDeg: Number(elevation.toFixed(1)),
    solarIntensityPct: Number(intensity.toFixed(0)),
    solarAzimuthDeg: Number(((azimuth % 360) + 360) % 360),
  };
}

export function formatClockLabel(clockMin: number): string {
  const m = ((clockMin % 1440) + 1440) % 1440;
  const hh = Math.floor(m / 60);
  const mm = m % 60;
  return `${String(hh).padStart(2, "0")}:${String(mm).padStart(2, "0")}`;
}