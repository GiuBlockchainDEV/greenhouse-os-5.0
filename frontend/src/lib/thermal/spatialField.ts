/**
 * Energy-conserving spatial temperature / humidity field from solved microclimate.
 * Replaces fixed +/- delta-T equipment hacks with advection and mixing kernels.
 */

import type { HeatmapFieldContext } from "@/lib/equipmentAwareHeatmap";
import {
  buildSolarFieldContext,
  solarTempDeltaFromContext,
} from "@/lib/solarIrradiance";
import { rhPctFromHumidityRatio, humidityRatioKgKg } from "@/lib/thermal/psychrometricsExtended";

const MAX_LOCAL_TEMP_SPREAD_C = 8;
const MAX_LOCAL_RH_SPREAD_PCT = 24;

function gaussian1d(dist: number, sigma: number): number {
  if (sigma <= 0) return 0;
  return Math.exp(-(dist * dist) / (2 * sigma * sigma));
}

function normalizeWeights(weights: number[]): number[] {
  const sum = weights.reduce((acc, value) => acc + value, 0);
  if (sum <= 0) return weights.map(() => 0);
  return weights.map((value) => value / sum);
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
    const sigma = fan.diameterM * 1.4;
    influence += gaussian1d(x - fan.x, sigma) * gaussian1d(z - fan.z, sigma) * 0.25;
  }

  return Math.min(1, influence);
}

function padTransitInfluence(ctx: HeatmapFieldContext, x: number): number {
  const distFromPadM = Math.max(0, x + ctx.coeffs.halfL);
  return 1 - Math.min(1, distFromPadM / Math.max(ctx.length * 0.95, 1));
}

function circulationMixingAt(ctx: HeatmapFieldContext, x: number, z: number): number {
  let mix = 0;
  for (const fan of ctx.layout.circulationFans) {
    const sigma = fan.diameterM * 2.4;
    const g = gaussian1d(x - fan.x, sigma) * gaussian1d(z - fan.z, sigma);
    mix += g;
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

export interface SpatialPerturbation {
  tempDelta: number;
  rhDelta: number;
}

export function computeSpatialPerturbation(
  ctx: HeatmapFieldContext,
  x: number,
  y: number,
  z: number,
): SpatialPerturbation {
  const solar = buildSolarFieldContext(
    ctx.scenario,
    ctx.qSolar,
    ctx.length,
    ctx.width,
    ctx.eaveHeight,
  );
  const solarWeights: number[] = [];
  const sampleCount = 5;
  for (let index = 0; index < sampleCount; index++) {
    solarWeights.push(
      Math.max(0, solarTempDeltaFromContext(solar, x, y, z)),
    );
  }
  const solarMean =
    solarWeights.reduce((acc, value) => acc + value, 0) / Math.max(sampleCount, 1);
  const solarDelta = solarTempDeltaFromContext(solar, x, y, z) - solarMean * 0.15;

  const outdoorInfl = outdoorInfluenceAt(ctx, x, z);
  const outdoorTempDelta =
    outdoorInfl * (ctx.externalTemp - ctx.baseTemp) * 0.45;
  const wOut = humidityRatioKgKg(ctx.externalTemp, ctx.scenario.externalRhPct);
  const outdoorRhDelta =
    outdoorInfl *
    (rhPctFromHumidityRatio(ctx.externalTemp, wOut) - ctx.internalRh) *
    0.35;

  let tempDelta = solarDelta + outdoorTempDelta;
  let rhDelta = -solarDelta * 0.18 + outdoorRhDelta;

  if (
    ctx.equipment.cooling === "fan_and_pad" ||
    ctx.equipment.cooling === "evaporative"
  ) {
    const transit = padTransitInfluence(ctx, x);
    const supplyTemp = ctx.supplyTempC ?? ctx.externalTemp;
    const supplyDelta = (supplyTemp - ctx.baseTemp) * transit;
    tempDelta += supplyDelta;
    if (ctx.supplyHumidityRatioKgKg !== null) {
      const supplyRh = rhPctFromHumidityRatio(supplyTemp, ctx.supplyHumidityRatioKgKg);
      rhDelta += (supplyRh - ctx.internalRh) * transit * 0.65;
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
