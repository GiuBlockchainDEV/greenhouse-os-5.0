/**
 * HAF jet corridors on the floor — visible mixing paths from circulation fan layout.
 */

import type { HeatmapFieldContext } from "@/lib/equipmentAwareHeatmap";
import { circulationCapacityFactor } from "@/lib/climateEquipmentCapacity";
import { resolveCirculationMotorW } from "@/lib/thermal/ratedCapacities";

const REFERENCE_EXHAUST_FAN_DIAMETER_M = 1.2;

function gaussian1d(dist: number, sigma: number): number {
  if (sigma <= 0) return 0;
  return Math.exp(-(dist * dist) / (2 * sigma * sigma));
}

function fanSizeFactor(diameterM: number): number {
  const ratio = diameterM / REFERENCE_EXHAUST_FAN_DIAMETER_M;
  return Math.max(0.35, Math.min(2.8, ratio * ratio));
}

export interface CirculationJetSample {
  /** 0–1 local mixing weight along the HAF jet corridor. */
  mixWeight: number;
  /** 0–1 motor sensible heat hub at the fan. */
  motorHeat: number;
}

/** Floor-plane HAF jet influence from each circulation fan position and yaw. */
export function circulationJetInfluenceAt(
  ctx: HeatmapFieldContext,
  x: number,
  z: number,
): CirculationJetSample {
  const fans = ctx.layout.circulationFans;
  if (fans.length === 0) {
    return { mixWeight: 0, motorHeat: 0 };
  }

  const capacity = circulationCapacityFactor(ctx.equipment.sizing);
  const flowScale = Math.sqrt(Math.max(0.35, capacity));
  const motorRefW = resolveCirculationMotorW(ctx.equipment.sizing);
  let mixWeight = 0;
  let motorHeat = 0;

  for (const fan of fans) {
    const sizeWeight = fanSizeFactor(fan.diameterM);
    const throwM = fan.diameterM * (14 + flowScale * 18) * sizeWeight;
    const dirX = Math.cos(fan.yaw);
    const dirZ = Math.sin(fan.yaw);

    const dx = x - fan.x;
    const dz = z - fan.z;
    const along = dx * dirX + dz * dirZ;
    const cross = dx * (-dirZ) + dz * dirX;

    const forward = along >= 0 ? 1 : 0.38;
    const jet =
      gaussian1d(along, throwM * 0.68) *
      gaussian1d(cross, fan.diameterM * 5.5) *
      forward;

    const hub =
      gaussian1d(dx, fan.diameterM * 1.35) *
      gaussian1d(dz, fan.diameterM * 1.35);

    mixWeight += jet * 0.95;
    motorHeat += hub * (motorRefW / 320) * 1.35 * sizeWeight;
  }

  const countBoost = Math.min(1.85, 0.82 + fans.length * 0.045);

  return {
    mixWeight: Math.min(1, mixWeight * countBoost * (0.68 + capacity * 0.28)),
    motorHeat: Math.min(2.2, motorHeat),
  };
}

/** Sensible floor warming (°C) under each HAF motor hub. */
export function circulationFloorMotorHeatDeltaC(
  ctx: HeatmapFieldContext,
  jet: CirculationJetSample,
): number {
  if (jet.motorHeat <= 0) {
    return 0;
  }

  const motorRefW = resolveCirculationMotorW(ctx.equipment.sizing);
  const count = ctx.equipment.sizing.circulationFanCount;
  const countScale = Math.min(1.35, 0.55 + count / 28);
  const motorScale = Math.min(1.6, 0.75 + motorRefW / 500);

  return jet.motorHeat * 0.95 * countScale * motorScale;
}

/** Mixing strength 0–1 scaled by fan count, rated flow, and solver coefficient. */
export function resolveCirculationMixingStrength(ctx: HeatmapFieldContext): number {
  const count = ctx.equipment.sizing.circulationFanCount;
  if (count <= 0) {
    return 0;
  }

  const capacity = circulationCapacityFactor(ctx.equipment.sizing);
  const countFactor = Math.min(1, count / 14);
  return Math.min(
    0.97,
    (0.18 + countFactor * 0.82) * (0.58 + capacity * 0.34) + ctx.mixingEffectiveness * 0.1,
  );
}
