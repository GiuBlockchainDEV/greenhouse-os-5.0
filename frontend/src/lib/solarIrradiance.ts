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

/** Elevation factor for global solar gain (0 at horizon, 1 at zenith). */
export function solarElevationFactor(scenario: ClimateScenario): number {
  return Math.max(0, Math.sin(scenario.solarElevationDeg * DEG));
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
  const elevationFactor = solarElevationFactor(scenario);
  if (intensity <= 0 || elevationFactor <= 0 || qSolar <= 0) {
    return 0;
  }

  const { x: lx, y: ly, z: lz } = sunLightDirection(scenario);
  const halfL = length / 2;
  const halfW = width / 2;

  const horiz = Math.hypot(lx, lz);
  const dirX = horiz > 1e-6 ? lx / horiz : 0;
  const dirZ = horiz > 1e-6 ? lz / horiz : 0;

  // −1 = sunward side, +1 = leeward side along horizontal sun bearing
  const alongSun = (x * dirX + z * dirZ) / Math.max(Math.max(halfL, halfW), 1);
  const sunwardBias = 0.5 - alongSun * 0.5;

  const fromWest = (x + halfL) / Math.max(length, 0.1);
  const fromEast = (halfL - x) / Math.max(length, 0.1);
  const fromSouth = (z + halfW) / Math.max(width, 0.1);
  const fromNorth = (halfW - z) / Math.max(width, 0.1);

  let sunFacing = 0;
  if (dirX > 0.12) sunFacing = Math.max(sunFacing, fromWest);
  if (dirX < -0.12) sunFacing = Math.max(sunFacing, fromEast);
  if (dirZ > 0.12) sunFacing = Math.max(sunFacing, fromSouth);
  if (dirZ < -0.12) sunFacing = Math.max(sunFacing, fromNorth);

  const floorBeam = Math.max(0, ly);
  const heightFactor = 0.65 + 0.35 * (1 - y / Math.max(eaveHeight, 1));

  const spatial =
    elevationFactor *
    (floorBeam * 0.45 + sunwardBias * 0.55 + sunFacing * 0.65) *
    heightFactor;

  return spatial * intensity * qSolar * 0.11;
}

export function solarAzimuthLabel(azimuthDeg: number): string {
  const dirs = ["N", "NE", "E", "SE", "S", "SW", "W", "NW"] as const;
  const index = Math.round(((azimuthDeg % 360) + 360) % 360 / 45) % 8;
  return dirs[index] ?? "N";
}
