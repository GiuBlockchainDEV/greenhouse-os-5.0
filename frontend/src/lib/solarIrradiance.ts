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

/** Precomputed solar field — build once per heatmap context, sample at many points. */
export interface SolarFieldContext {
  active: boolean;
  amplitude: number;
  dirX: number;
  dirZ: number;
  floorBeam: number;
  halfL: number;
  halfW: number;
  length: number;
  width: number;
  eaveHeight: number;
}

export function buildSolarFieldContext(
  scenario: ClimateScenario,
  qSolar: number,
  length: number,
  width: number,
  eaveHeight: number,
): SolarFieldContext {
  const intensity = solarIntensityFactor(scenario);
  const elevationFactor = solarElevationFactor(scenario);
  const halfL = length / 2;
  const halfW = width / 2;

  if (intensity <= 0 || elevationFactor <= 0 || qSolar <= 0) {
    return {
      active: false,
      amplitude: 0,
      dirX: 0,
      dirZ: 0,
      floorBeam: 0,
      halfL,
      halfW,
      length,
      width,
      eaveHeight,
    };
  }

  const { x: lx, z: lz, y: ly } = sunLightDirection(scenario);
  const horiz = Math.hypot(lx, lz);
  return {
    active: true,
    amplitude: elevationFactor * intensity * qSolar * 0.11,
    dirX: horiz > 1e-6 ? lx / horiz : 0,
    dirZ: horiz > 1e-6 ? lz / horiz : 0,
    floorBeam: Math.max(0, ly),
    halfL,
    halfW,
    length,
    width,
    eaveHeight,
  };
}

export function solarTempDeltaFromContext(
  solar: SolarFieldContext,
  x: number,
  y: number,
  z: number,
): number {
  if (!solar.active) return 0;

  const alongSun =
    (x * solar.dirX + z * solar.dirZ) / Math.max(Math.max(solar.halfL, solar.halfW), 1);
  const sunwardBias = 0.5 - alongSun * 0.5;

  const fromWest = (x + solar.halfL) / Math.max(solar.length, 0.1);
  const fromEast = (solar.halfL - x) / Math.max(solar.length, 0.1);
  const fromSouth = (z + solar.halfW) / Math.max(solar.width, 0.1);
  const fromNorth = (solar.halfW - z) / Math.max(solar.width, 0.1);

  let sunFacing = 0;
  if (solar.dirX > 0.12) sunFacing = Math.max(sunFacing, fromWest);
  if (solar.dirX < -0.12) sunFacing = Math.max(sunFacing, fromEast);
  if (solar.dirZ > 0.12) sunFacing = Math.max(sunFacing, fromSouth);
  if (solar.dirZ < -0.12) sunFacing = Math.max(sunFacing, fromNorth);

  const heightFactor = 0.65 + 0.35 * (1 - y / Math.max(solar.eaveHeight, 1));
  const spatial =
    solar.floorBeam * 0.45 + sunwardBias * 0.55 + sunFacing * 0.65;

  return solar.amplitude * spatial * heightFactor;
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
  return solarTempDeltaFromContext(
    buildSolarFieldContext(scenario, qSolar, length, width, eaveHeight),
    x,
    y,
    z,
  );
}

export function solarAzimuthLabel(azimuthDeg: number): string {
  const dirs = ["N", "NE", "E", "SE", "S", "SW", "W", "NW"] as const;
  const index = Math.round(((azimuthDeg % 360) + 360) % 360 / 45) % 8;
  return dirs[index] ?? "N";
}
