/** Resolve rated equipment capacities — explicit UI values or geometry fallback. */

import type { ClimateEquipmentSizing } from "@/types/greenhouse";
import {
  DEFAULT_AC_RATED_KW_PER_REF_UNIT,
  DEFAULT_AC_SHR,
  DEFAULT_CIRCULATION_FACE_VELOCITY_MS,
  DEFAULT_EXHAUST_FACE_VELOCITY_MS,
  DEFAULT_FOG_EVAPORATION_EFFICIENCY,
  DEFAULT_HAF_MOTOR_W,
  DEFAULT_HEATER_UNIT_KW,
  DEFAULT_LEAKAGE_ACH,
  DEFAULT_PAD_EFFICIENCY,
  DEFAULT_ROOF_EXHAUST_FACE_VELOCITY_MS,
} from "@/lib/thermal/constants";

export const RATED_CAPACITY_DEFAULTS = {
  exhaustFanRatedFlowM3h: 32_500,
  roofExhaustFanRatedFlowM3h: 22_000,
  circulationFanRatedFlowM3h: 8_500,
  circulationFanMotorW: DEFAULT_HAF_MOTOR_W,
  acRatedCoolingKwPerUnit: DEFAULT_AC_RATED_KW_PER_REF_UNIT,
  acShr: DEFAULT_AC_SHR,
  acCop: 3.2,
  acSupplyAirflowM3h: 12_000,
  heaterRatedKwPerUnit: DEFAULT_HEATER_UNIT_KW,
  geothermalRatedKw: 45,
  geothermalCop: 4.2,
  hotWaterHeatingKw: 35,
  padEfficiency: DEFAULT_PAD_EFFICIENCY,
  fogNozzleFlowLhPerLine: 18,
  fogEvaporationEfficiency: DEFAULT_FOG_EVAPORATION_EFFICIENCY,
  leakageAch: DEFAULT_LEAKAGE_ACH,
} as const;

function fanThroatFlowM3h(
  count: number,
  diameterM: number,
  faceVelocityMs: number,
): number {
  if (count <= 0 || diameterM <= 0) return 0;
  const area = count * Math.PI * (diameterM / 2) ** 2;
  return area * faceVelocityMs * 3600;
}

function pickPositive(value: number, fallback: number): number {
  return value > 0 ? value : fallback;
}

export function resolveExhaustFlowM3h(
  sizing: ClimateEquipmentSizing,
  runtimeFraction = 1,
): number {
  const perFan = pickPositive(
    sizing.exhaustFanRatedFlowM3h,
    RATED_CAPACITY_DEFAULTS.exhaustFanRatedFlowM3h,
  );
  if (sizing.exhaustFanRatedFlowM3h > 0) {
    return sizing.exhaustFanCount * perFan * runtimeFraction;
  }
  return fanThroatFlowM3h(
    sizing.exhaustFanCount,
    sizing.exhaustFanDiameterM,
    DEFAULT_EXHAUST_FACE_VELOCITY_MS,
  ) * runtimeFraction;
}

export function resolveRoofExhaustFlowM3h(
  sizing: ClimateEquipmentSizing,
  runtimeFraction = 1,
): number {
  const perFan = pickPositive(
    sizing.roofExhaustFanRatedFlowM3h,
    RATED_CAPACITY_DEFAULTS.roofExhaustFanRatedFlowM3h,
  );
  if (sizing.roofExhaustFanRatedFlowM3h > 0) {
    return sizing.roofExhaustFanCount * perFan * runtimeFraction;
  }
  return fanThroatFlowM3h(
    sizing.roofExhaustFanCount,
    sizing.roofExhaustFanDiameterM,
    DEFAULT_ROOF_EXHAUST_FACE_VELOCITY_MS,
  ) * runtimeFraction;
}

export function resolveCirculationFlowM3h(
  sizing: ClimateEquipmentSizing,
  runtimeFraction = 1,
): number {
  const perFan = pickPositive(
    sizing.circulationFanRatedFlowM3h,
    RATED_CAPACITY_DEFAULTS.circulationFanRatedFlowM3h,
  );
  if (sizing.circulationFanRatedFlowM3h > 0) {
    return sizing.circulationFanCount * perFan * runtimeFraction;
  }
  return fanThroatFlowM3h(
    sizing.circulationFanCount,
    sizing.circulationFanDiameterM,
    DEFAULT_CIRCULATION_FACE_VELOCITY_MS,
  ) * runtimeFraction;
}

export function resolveCirculationMotorW(sizing: ClimateEquipmentSizing): number {
  return pickPositive(
    sizing.circulationFanMotorW,
    RATED_CAPACITY_DEFAULTS.circulationFanMotorW,
  );
}

export function resolveAcCoolingKw(sizing: ClimateEquipmentSizing): number {
  const perUnit = pickPositive(
    sizing.acRatedCoolingKwPerUnit,
    RATED_CAPACITY_DEFAULTS.acRatedCoolingKwPerUnit,
  );
  return sizing.acUnitCount * perUnit;
}

export function resolveAcShr(sizing: ClimateEquipmentSizing): number {
  return Math.max(0.35, Math.min(1, pickPositive(sizing.acShr, RATED_CAPACITY_DEFAULTS.acShr)));
}

export function resolveAcCop(sizing: ClimateEquipmentSizing): number {
  return Math.max(1.8, pickPositive(sizing.acCop, RATED_CAPACITY_DEFAULTS.acCop));
}

export function resolveAcSupplyAirflowM3h(sizing: ClimateEquipmentSizing): number {
  return pickPositive(sizing.acSupplyAirflowM3h, RATED_CAPACITY_DEFAULTS.acSupplyAirflowM3h);
}

export function resolveHeaterKwPerUnit(sizing: ClimateEquipmentSizing): number {
  return pickPositive(sizing.heaterRatedKwPerUnit, RATED_CAPACITY_DEFAULTS.heaterRatedKwPerUnit);
}

export function resolveGeothermalKw(sizing: ClimateEquipmentSizing): number {
  return pickPositive(sizing.geothermalRatedKw, RATED_CAPACITY_DEFAULTS.geothermalRatedKw);
}

export function resolveGeothermalCop(sizing: ClimateEquipmentSizing): number {
  return Math.max(1.5, pickPositive(sizing.geothermalCop, RATED_CAPACITY_DEFAULTS.geothermalCop));
}

export function resolveHotWaterHeatingKw(sizing: ClimateEquipmentSizing): number {
  return pickPositive(sizing.hotWaterHeatingKw, RATED_CAPACITY_DEFAULTS.hotWaterHeatingKw);
}

export function resolvePadEfficiency(sizing: ClimateEquipmentSizing): number {
  return Math.max(0.4, Math.min(0.98, pickPositive(sizing.padEfficiency, RATED_CAPACITY_DEFAULTS.padEfficiency)));
}

export function resolveFogFlowLhPerLine(sizing: ClimateEquipmentSizing): number {
  return pickPositive(sizing.fogNozzleFlowLhPerLine, RATED_CAPACITY_DEFAULTS.fogNozzleFlowLhPerLine);
}

export function resolveFogEvaporationEfficiency(sizing: ClimateEquipmentSizing): number {
  return Math.max(
    0.2,
    Math.min(1, pickPositive(sizing.fogEvaporationEfficiency, RATED_CAPACITY_DEFAULTS.fogEvaporationEfficiency)),
  );
}

export function resolveLeakageAch(sizing: ClimateEquipmentSizing): number {
  return Math.max(0.05, pickPositive(sizing.leakageAch, RATED_CAPACITY_DEFAULTS.leakageAch));
}
