import type { ClimateScenario } from "@/types/greenhouse";

const DEG = Math.PI / 180;

/** Incoming sun direction (unit vector, light traveling toward the greenhouse). */
export function sunLightDirection(scenario: ClimateScenario): { x: number; y: number; z: number } {
  const az = scenario.solarAzimuthDeg * DEG;
  const el = scenario.solarElevationDeg * DEG;
  const cosEl = Math.cos(el);
  return {
    x: -Math.sin(az) * cosEl,
    y: -Math.sin(el),
    z: -Math.cos(az) * cosEl,
  };
}

export function solarIntensityFactor(scenario: ClimateScenario): number {
  return Math.max(0, Math.min(1, scenario.solarIntensityPct / 100));
}

/**
 * Spatial solar heating (°C-equivalent delta) from direction, elevation, and intensity.
 * Coordinates: +X east, +Z south, pad wall at −X, exhaust fans at +X.
 */
export function solarTempDeltaAt(
  scenario: ClimateScenario,
  qSolar: number,
  x: number,
  y: number,
  z: number,
  length: number,
  width: number,
  eaveHeight: number,
): number {
  const intensity = solarIntensityFactor(scenario);
  if (intensity <= 0 || scenario.solarElevationDeg <= 0 || qSolar <= 0) {
    return 0;
  }

  const { x: lx, y: ly, z: lz } = sunLightDirection(scenario);
  const halfL = length / 2;
  const halfW = width / 2;

  const floorBeam = Math.max(0, ly);

  const westDist = (x + halfL) / Math.max(length, 0.1);
  const eastDist = (halfL - x) / Math.max(length, 0.1);
  const southDist = (z + halfW) / Math.max(width, 0.1);
  const northDist = (halfW - z) / Math.max(width, 0.1);

  let wallLeak = 0;
  wallLeak += Math.max(0, lx) * Math.exp(-westDist * 2.8) * 0.6;
  wallLeak += Math.max(0, -lx) * Math.exp(-eastDist * 2.8) * 0.6;
  wallLeak += Math.max(0, lz) * Math.exp(-southDist * 2.8) * 0.5;
  wallLeak += Math.max(0, -lz) * Math.exp(-northDist * 2.8) * 0.5;

  const heightFactor = 1 - (y / Math.max(eaveHeight, 1)) * 0.3;
  const combined = (floorBeam * 0.7 + wallLeak * heightFactor) * intensity;

  return combined * qSolar * 0.042;
}

export function solarAzimuthLabel(azimuthDeg: number): string {
  const dirs = ["N", "NE", "E", "SE", "S", "SW", "W", "NW"] as const;
  const index = Math.round(((azimuthDeg % 360) + 360) % 360 / 45) % 8;
  return dirs[index] ?? "N";
}
