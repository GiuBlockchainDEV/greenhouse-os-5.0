/**
 * Energy-conserving spatial temperature / humidity field from solved microclimate.
 */

import type { HeatmapFieldContext, HeatmapSurfaceKind } from "@/lib/equipmentAwareHeatmap";
import {
  buildSolarFieldContext,
  solarTempDeltaFromContext,
  type SolarSurfaceKind,
} from "@/lib/solarIrradiance";
import { padCapacityFactor } from "@/lib/climateEquipmentCapacity";
import { rhPctFromHumidityRatio, humidityRatioKgKg } from "@/lib/thermal/psychrometricsExtended";

const MAX_LOCAL_TEMP_SPREAD_C = 8;
const MAX_LOCAL_RH_SPREAD_PCT = 24;
const REFERENCE_EXHAUST_FAN_DIAMETER_M = 1.2;

function gaussian1d(dist: number, sigma: number): number {
  if (sigma <= 0) return 0;
  return Math.exp(-(dist * dist) / (2 * sigma * sigma));
}

function normalizeWeights(weights: number[]): number[] {
  const sum = weights.reduce((acc, value) => acc + value, 0);
  if (sum <= 0) return weights.map(() => 0);
  return weights.map((value) => value / sum);
}

function exhaustFanSizeFactor(diameterM: number): number {
  const ratio = diameterM / REFERENCE_EXHAUST_FAN_DIAMETER_M;
  return Math.max(0.35, Math.min(2.8, ratio * ratio));
}

function isEvaporativeCooling(ctx: HeatmapFieldContext): boolean {
  return (
    ctx.equipment.cooling === "fan_and_pad" ||
    ctx.equipment.cooling === "evaporative"
  );
}

/** 0 at pad wall (−X), 1 at exhaust wall (+X). */
function airflowFraction(ctx: HeatmapFieldContext, x: number): number {
  return Math.max(0, Math.min(1, (x + ctx.coeffs.halfL) / Math.max(ctx.length, 0.1)));
}

function padCoverageAlongZ(ctx: HeatmapFieldContext, z: number): number {
  if (ctx.layout.padWalls.length === 0) {
    return 1;
  }
  let coverage = 0;
  for (const pad of ctx.layout.padWalls) {
    coverage = Math.max(
      coverage,
      gaussian1d(z - pad.zCenter, Math.max(pad.widthM * 0.5, 0.8)),
    );
  }
  return coverage;
}

function padTransitInfluence(ctx: HeatmapFieldContext, x: number, z: number): number {
  const alongX = 1 - airflowFraction(ctx, x);
  const alongZ = padCoverageAlongZ(ctx, z);
  return alongX * alongZ;
}

/**
 * Primary pad→exhaust gradient: cool at pad, warm at exhaust.
 * Zero-mean along greenhouse length so conservation does not erase it.
 */
function padExhaustAirflowGradient(
  ctx: HeatmapFieldContext,
  x: number,
  z: number,
): { tempDelta: number; rhDelta: number } {
  if (!isEvaporativeCooling(ctx)) {
    return { tempDelta: 0, rhDelta: 0 };
  }

  const flow = airflowFraction(ctx, x);
  const transit = padTransitInfluence(ctx, x, z);
  const supply = ctx.supplyTempC ?? ctx.externalTemp;
  const padFactor = padCapacityFactor(ctx.equipment.sizing);

  const outdoorDepression = Math.max(1.5, ctx.externalTemp - supply);
  const spread = Math.min(
    MAX_LOCAL_TEMP_SPREAD_C * 0.85,
    outdoorDepression * (0.42 + padFactor * 0.22),
  );

  const tempDelta = spread * (flow - 0.5) * 2 * (0.65 + transit * 0.35);

  let rhDelta = 0;
  if (ctx.supplyHumidityRatioKgKg !== null) {
    const supplyRh = rhPctFromHumidityRatio(supply, ctx.supplyHumidityRatioKgKg);
    rhDelta = (supplyRh - ctx.internalRh) * (1 - flow) * transit * 0.55 * padFactor;
  }

  return { tempDelta, rhDelta };
}

function padWallLocalEffect(
  ctx: HeatmapFieldContext,
  x: number,
  y: number,
  z: number,
): { tempDelta: number; rhDelta: number } {
  if (!isEvaporativeCooling(ctx) || ctx.supplyTempC === null) {
    return { tempDelta: 0, rhDelta: 0 };
  }

  const padFactor = padCapacityFactor(ctx.equipment.sizing);
  let influence = 0;
  for (const pad of ctx.layout.padWalls) {
    const face = gaussian1d(x - pad.x, 0.45);
    const alongZ = gaussian1d(z - pad.zCenter, Math.max(pad.widthM * 0.48, 0.8));
    const alongY = gaussian1d(y - pad.y, Math.max(pad.heightM * 0.42, 0.6));
    influence = Math.max(influence, face * alongZ * alongY);
  }

  if (influence <= 0) {
    return { tempDelta: 0, rhDelta: 0 };
  }

  const supply = ctx.supplyTempC;
  const localTarget = Math.min(supply, ctx.baseTemp);
  const tempDelta = (localTarget - ctx.baseTemp) * influence * (0.45 + padFactor * 0.2);

  let rhDelta = 0;
  if (ctx.supplyHumidityRatioKgKg !== null) {
    const supplyRh = rhPctFromHumidityRatio(supply, ctx.supplyHumidityRatioKgKg);
    rhDelta = (supplyRh - ctx.internalRh) * influence * 0.35 * padFactor;
  }

  return { tempDelta, rhDelta };
}

function exhaustWarmthAt(ctx: HeatmapFieldContext, x: number, z: number): number {
  let warmth = 0;
  for (const fan of ctx.layout.exhaustFans) {
    const sigma = fan.diameterM * 1.35;
    const sizeWeight = exhaustFanSizeFactor(fan.diameterM);
    warmth +=
      gaussian1d(x - fan.x, sigma) *
      gaussian1d(z - fan.z, sigma) *
      0.28 *
      sizeWeight;
  }
  return warmth;
}

function outdoorInfluenceAt(
  ctx: HeatmapFieldContext,
  x: number,
  z: number,
): number {
  const edge = Math.min(
    1,
    Math.sqrt(((x * ctx.coeffs.invHalfL) ** 2 + (z * ctx.coeffs.invHalfW) ** 2) / 2),
  );

  let influence = edge * 0.35;

  for (const vent of ctx.layout.vents) {
    const sigma =
      vent.kind === "roof" ? vent.widthM * 0.45 : Math.max(vent.widthM, 1.2);
    const g = gaussian1d(x - vent.x, sigma) * gaussian1d(z - vent.z, sigma);
    influence += g * 0.22;
  }

  return Math.min(1, influence);
}

function circulationMixingAt(ctx: HeatmapFieldContext, x: number, z: number): number {
  let mix = 0;
  for (const fan of ctx.layout.circulationFans) {
    const sigma = fan.diameterM * 2.4;
    const g = gaussian1d(x - fan.x, sigma) * gaussian1d(z - fan.z, sigma);
    mix += g * exhaustFanSizeFactor(fan.diameterM);
  }
  return Math.min(1, mix * ctx.mixingEffectiveness);
}

function acSupplyInfluenceAt(
  ctx: HeatmapFieldContext,
  x: number,
  z: number,
): number {
  if (ctx.equipment.cooling !== "mechanical_ac") return 0;
  let weight = 0;
  for (const diffuser of ctx.layout.acDucts.diffusers) {
    const sigma = diffuser.reachM;
    weight += gaussian1d(x - diffuser.x, sigma) * gaussian1d(z - diffuser.z, sigma);
  }
  return weight;
}

function heaterInfluenceAt(ctx: HeatmapFieldContext, x: number, z: number): number {
  if (!ctx.heatingActive) return 0;
  let weight = 0;
  for (const heater of ctx.layout.heaters) {
    weight += gaussian1d(x - heater.x, 2.2) * gaussian1d(z - heater.z, 2.2);
  }
  return weight;
}

function fogInfluenceAt(ctx: HeatmapFieldContext, x: number, z: number): number {
  if (ctx.equipment.cooling !== "high_pressure_fog") return 0;
  let weight = 0;
  for (const fog of ctx.layout.fogLines) {
    const alongX = 1 - 0.12 * (Math.abs(x) / Math.max(ctx.coeffs.halfL, 0.1));
    weight += gaussian1d(z - fog.z, ctx.width * 0.16) * alongX;
  }
  return weight;
}

function solarSpatialScale(ctx: HeatmapFieldContext): number {
  if (isEvaporativeCooling(ctx)) {
    return 0.18;
  }
  return 0.55;
}

function toSolarSurface(surface?: HeatmapSurfaceKind): SolarSurfaceKind | undefined {
  if (!surface || surface === "floor" || surface === "roof") {
    return surface;
  }
  return surface;
}

export interface SpatialPerturbation {
  tempDelta: number;
  rhDelta: number;
}

export function computeSpatialPerturbation(
  ctx: HeatmapFieldContext,
  x: number,
  y: number,
  z: number,
  surface?: HeatmapSurfaceKind,
): SpatialPerturbation {
  const solarSurface = toSolarSurface(surface);
  const solar = buildSolarFieldContext(
    ctx.scenario,
    ctx.qSolar,
    ctx.length,
    ctx.width,
    ctx.eaveHeight,
  );
  const solarSample = solarTempDeltaFromContext(solar, x, y, z, solarSurface);
  let solarDelta = solarSample * solarSpatialScale(ctx);

  if (!surface?.startsWith("wall_")) {
    const solarMean = solarSample * solarSpatialScale(ctx);
    solarDelta = solarSample * solarSpatialScale(ctx) - solarMean * 0.35;
  }

  const outdoorInfl = outdoorInfluenceAt(ctx, x, z);
  const padTransit = isEvaporativeCooling(ctx) ? padTransitInfluence(ctx, x, z) : 0;
  const outdoorTempDelta =
    outdoorInfl * (1 - padTransit * 0.9) * (ctx.externalTemp - ctx.baseTemp) * 0.28;
  const wOut = humidityRatioKgKg(ctx.externalTemp, ctx.scenario.externalRhPct);
  const outdoorRhDelta =
    outdoorInfl *
    (rhPctFromHumidityRatio(ctx.externalTemp, wOut) - ctx.internalRh) *
    0.22;

  let tempDelta = solarDelta + outdoorTempDelta;
  let rhDelta = -solarDelta * 0.12 + outdoorRhDelta;

  const airflow = padExhaustAirflowGradient(ctx, x, z);
  tempDelta += airflow.tempDelta;
  rhDelta += airflow.rhDelta;

  const padLocal = padWallLocalEffect(ctx, x, y, z);
  tempDelta += padLocal.tempDelta;
  rhDelta += padLocal.rhDelta;

  if (isEvaporativeCooling(ctx)) {
    const exhaustInfl = exhaustWarmthAt(ctx, x, z);
    const warmBias = Math.max(1.2, ctx.baseTemp - (ctx.supplyTempC ?? ctx.externalTemp) + 1.5);
    tempDelta += exhaustInfl * warmBias * 0.55;
  }

  if (ctx.equipment.cooling === "mechanical_ac") {
    const acInfl = acSupplyInfluenceAt(ctx, x, z);
    const weights = ctx.layout.acDucts.diffusers.map((diffuser) =>
      gaussian1d(x - diffuser.x, diffuser.reachM) *
      gaussian1d(z - diffuser.z, diffuser.reachM),
    );
    const normalized = normalizeWeights(weights);
    const totalWeight = normalized.reduce((acc, value) => acc + value, 0);
    if (totalWeight > 0 && ctx.supplyTempC !== null) {
      const localSupplyDelta = (ctx.supplyTempC - ctx.baseTemp) * Math.min(1, acInfl);
      tempDelta += localSupplyDelta;
      rhDelta -= localSupplyDelta * 0.12;
    }
  }

  if (ctx.equipment.cooling === "high_pressure_fog") {
    const fogInfl = fogInfluenceAt(ctx, x, z);
    tempDelta -= fogInfl * Math.min(2.5, Math.max(0, ctx.baseTemp - ctx.externalTemp) * 0.08);
    rhDelta += fogInfl * 6;
  }

  const heaterInfl = heaterInfluenceAt(ctx, x, z);
  if (heaterInfl > 0 && ctx.supplyTempC !== null) {
    tempDelta += heaterInfl * (ctx.supplyTempC - ctx.baseTemp) * 0.55;
    rhDelta -= heaterInfl * 2.5;
  }

  const stratification =
    (y / Math.max(ctx.eaveHeight, 1)) *
    Math.max(0, ctx.baseTemp - ctx.externalTemp) *
    0.06 *
    (1 - ctx.mixingEffectiveness);
  tempDelta += stratification;

  const mix = circulationMixingAt(ctx, x, z);
  tempDelta *= 1 - mix * 0.28;
  rhDelta *= 1 - mix * 0.22;

  return {
    tempDelta: Math.max(-MAX_LOCAL_TEMP_SPREAD_C, Math.min(MAX_LOCAL_TEMP_SPREAD_C, tempDelta)),
    rhDelta: Math.max(-MAX_LOCAL_RH_SPREAD_PCT, Math.min(MAX_LOCAL_RH_SPREAD_PCT, rhDelta)),
  };
}

export function applyConservationToGrid(
  temperature: number[][],
  humidity: number[][],
  baseTemp: number,
  baseRh: number,
): { temperature: number[][]; humidity: number[][] } {
  let tempSum = 0;
  let rhSum = 0;
  let count = 0;
  for (const row of temperature) {
    for (const value of row) {
      tempSum += value;
      count += 1;
    }
  }
  for (const row of humidity) {
    for (const value of row) {
      rhSum += value;
    }
  }
  const tempMean = count > 0 ? tempSum / count : baseTemp;
  const rhMean = count > 0 ? rhSum / count : baseRh;
  const tempShift = baseTemp - tempMean;
  const rhShift = baseRh - rhMean;

  return {
    temperature: temperature.map((row) =>
      row.map((value) => Math.round((value + tempShift) * 100) / 100),
    ),
    humidity: humidity.map((row) =>
      row.map((value) => Math.round((value + rhShift) * 100) / 100),
    ),
  };
}
