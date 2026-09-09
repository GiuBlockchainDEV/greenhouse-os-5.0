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

function outdoorInfluenceAt(
  ctx: HeatmapFieldContext,
  x: number,
  z: number,
): number {
  const edge = Math.min(
    1,
    Math.sqrt(((x * ctx.coeffs.invHalfL) ** 2 + (z * ctx.coeffs.invHalfW) ** 2) / 2),
  );

  let influence = edge * 0.55;

  for (const vent of ctx.layout.vents) {
    const sigma =
      vent.kind === "roof" ? vent.widthM * 0.45 : Math.max(vent.widthM, 1.2);
    const g = gaussian1d(x - vent.x, sigma) * gaussian1d(z - vent.z, sigma);
    influence += g * 0.35;
  }

  for (const fan of ctx.layout.exhaustFans) {
    const sigma = fan.diameterM * 1.55;
    const sizeWeight = exhaustFanSizeFactor(fan.diameterM);
    influence +=
      gaussian1d(x - fan.x, sigma) *
      gaussian1d(z - fan.z, sigma) *
      0.32 *
      sizeWeight;
  }

  return Math.min(1, influence);
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
  const distFromPadM = Math.max(0, x + ctx.coeffs.halfL);
  const alongX = 1 - Math.min(1, distFromPadM / Math.max(ctx.length * 0.95, 1));
  const alongZ = padCoverageAlongZ(ctx, z);
  return alongX * alongZ;
}

function padWallLocalEffect(
  ctx: HeatmapFieldContext,
  x: number,
  y: number,
  z: number,
): { tempDelta: number; rhDelta: number } {
  if (
    ctx.equipment.cooling !== "fan_and_pad" &&
    ctx.equipment.cooling !== "evaporative"
  ) {
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

  if (influence <= 0 || ctx.supplyTempC === null) {
    return { tempDelta: 0, rhDelta: 0 };
  }

  const supplyDelta = (ctx.supplyTempC - ctx.baseTemp) * influence * (0.55 + padFactor * 0.25);
  let rhDelta = 0;
  if (ctx.supplyHumidityRatioKgKg !== null) {
    const supplyRh = rhPctFromHumidityRatio(ctx.supplyTempC, ctx.supplyHumidityRatioKgKg);
    rhDelta = (supplyRh - ctx.internalRh) * influence * 0.45 * padFactor;
  }

  return { tempDelta: supplyDelta, rhDelta };
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
  let solarDelta = solarSample;
  if (!surface?.startsWith("wall_")) {
    const solarWeights: number[] = [];
    const sampleCount = 5;
    for (let index = 0; index < sampleCount; index++) {
      solarWeights.push(
        Math.max(0, solarTempDeltaFromContext(solar, x, y, z, solarSurface)),
      );
    }
    const solarMean =
      solarWeights.reduce((acc, value) => acc + value, 0) / Math.max(sampleCount, 1);
    solarDelta = solarSample - solarMean * 0.15;
  }

  const outdoorInfl = outdoorInfluenceAt(ctx, x, z);
  const padTransit =
    ctx.equipment.cooling === "fan_and_pad" ||
    ctx.equipment.cooling === "evaporative"
      ? padTransitInfluence(ctx, x, z)
      : 0;
  const outdoorTempDelta =
    outdoorInfl * (1 - padTransit * 0.85) * (ctx.externalTemp - ctx.baseTemp) * 0.45;
  const wOut = humidityRatioKgKg(ctx.externalTemp, ctx.scenario.externalRhPct);
  const outdoorRhDelta =
    outdoorInfl *
    (rhPctFromHumidityRatio(ctx.externalTemp, wOut) - ctx.internalRh) *
    0.35;

  let tempDelta = solarDelta + outdoorTempDelta;
  let rhDelta = -solarDelta * 0.18 + outdoorRhDelta;

  const padLocal = padWallLocalEffect(ctx, x, y, z);
  tempDelta += padLocal.tempDelta;
  rhDelta += padLocal.rhDelta;

  if (
    ctx.equipment.cooling === "fan_and_pad" ||
    ctx.equipment.cooling === "evaporative"
  ) {
    const transit = padTransit;
    const supplyTemp = ctx.supplyTempC ?? ctx.externalTemp;
    const padFactor = padCapacityFactor(ctx.equipment.sizing);
    const supplyDelta = (supplyTemp - ctx.baseTemp) * transit * (0.75 + padFactor * 0.2);
    tempDelta += supplyDelta;
    const warmExcess = Math.max(ctx.baseTemp - supplyTemp, 0);
    const downwind = 1 - transit;
    const exhaustPull = ctx.layout.exhaustFans.reduce(
      (acc, fan) => acc + exhaustFanSizeFactor(fan.diameterM),
      0,
    );
    const exhaustNorm = Math.max(1, ctx.layout.exhaustFans.length);
    tempDelta +=
      downwind ** 1.3 *
      warmExcess *
      0.6 *
      (0.65 + (exhaustPull / exhaustNorm) * 0.35);
    if (ctx.supplyHumidityRatioKgKg !== null) {
      const supplyRh = rhPctFromHumidityRatio(supplyTemp, ctx.supplyHumidityRatioKgKg);
      rhDelta += (supplyRh - ctx.internalRh) * transit * 0.65 * padFactor;
      rhDelta -= downwind ** 1.15 * Math.max(supplyRh - ctx.internalRh, 0) * 0.35;
    }
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
    0.08 *
    (1 - ctx.mixingEffectiveness);
  tempDelta += stratification;

  const mix = circulationMixingAt(ctx, x, z);
  tempDelta *= 1 - mix * 0.35;
  rhDelta *= 1 - mix * 0.28;

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
