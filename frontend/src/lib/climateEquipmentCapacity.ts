import { REFERENCE_CLIMATE_SIZING } from "@/lib/climateEquipmentLayout";
import { approxWetBulbC } from "@/lib/psychrometrics";
import type { ClimateEquipmentSizing } from "@/types/greenhouse";

const PAD_CAPACITY_MAX = 2.5;
const PAD_EVAPORATIVE_EFFICIENCY = 0.72;

function fanFlowUnits(diameterM: number, count: number, refDiameter: number): number {
  if (count <= 0 || diameterM <= 0) return 0;
  const ratio = diameterM / refDiameter;
  return count * ratio * ratio;
}

function normalizedRatio(actual: number, reference: number): number {
  return actual / Math.max(reference, 0.1);
}

/** 1.0 = default sizing; scales with count × diameter². */
export function exhaustCapacityFactor(sizing: ClimateEquipmentSizing): number {
  const ref = REFERENCE_CLIMATE_SIZING;
  const actual =
    fanFlowUnits(
      sizing.exhaustFanDiameterM,
      sizing.exhaustFanCount,
      ref.exhaustFanDiameterM,
    ) +
    fanFlowUnits(
      sizing.roofExhaustFanDiameterM,
      sizing.roofExhaustFanCount,
      ref.roofExhaustFanDiameterM,
    );
  const baseline =
    fanFlowUnits(
      ref.exhaustFanDiameterM,
      ref.exhaustFanCount,
      ref.exhaustFanDiameterM,
    ) +
    fanFlowUnits(
      ref.roofExhaustFanDiameterM,
      ref.roofExhaustFanCount,
      ref.roofExhaustFanDiameterM,
    );
  return normalizedRatio(actual, baseline);
}

export function circulationCapacityFactor(sizing: ClimateEquipmentSizing): number {
  const ref = REFERENCE_CLIMATE_SIZING;
  const actual = fanFlowUnits(
    sizing.circulationFanDiameterM,
    sizing.circulationFanCount,
    ref.circulationFanDiameterM,
  );
  const baseline = fanFlowUnits(
    ref.circulationFanDiameterM,
    ref.circulationFanCount,
    ref.circulationFanDiameterM,
  );
  return normalizedRatio(actual, baseline);
}

/** 1.0 = reference pad area; diminishing returns for oversized pads. */
export function padCapacityFactor(sizing: ClimateEquipmentSizing): number {
  const ref = REFERENCE_CLIMATE_SIZING;
  const areaRatio =
    (sizing.padWallWidthM * sizing.padWallHeightM) /
    Math.max(ref.padWallWidthM * ref.padWallHeightM, 0.1);
  return Math.min(PAD_CAPACITY_MAX, Math.sqrt(areaRatio));
}

/**
 * Physics-bounded fan-and-pad cooling from outdoor wet-bulb depression.
 * Prevents unrealistic sub-zero or below-wet-bulb temperatures at high outdoor RH.
 */
export function computeFanAndPadCoolingC(
  externalTempC: number,
  externalRhPct: number,
  sizing: ClimateEquipmentSizing,
): { tempDropC: number; rhBoostPct: number } {
  const padCapacity = padCapacityFactor(sizing);
  const exhaustCapacity = exhaustCapacityFactor(sizing);
  const wetBulb = approxWetBulbC(externalTempC, externalRhPct);
  const depression = Math.max(0, externalTempC - wetBulb);
  const systemFactor =
    (0.42 + padCapacity * 0.29) *
    (0.58 + Math.min(exhaustCapacity, 2) * 0.42);
  const tempDropC =
    depression * PAD_EVAPORATIVE_EFFICIENCY * Math.min(1.1, systemFactor);
  const rhBoostPct =
    Math.min(28, 10 + (tempDropC / Math.max(depression, 0.5)) * 18) -
    Math.max(0, (exhaustCapacity - 1) * 3);
  return { tempDropC, rhBoostPct };
}

export function ventCapacityFactor(sizing: ClimateEquipmentSizing): number {
  const ref = REFERENCE_CLIMATE_SIZING;
  const actual =
    sizing.roofVentCount * sizing.roofVentWidthM +
    sizing.sideVentCount * sizing.sideVentHeightM * 1.2;
  const baseline =
    ref.roofVentCount * ref.roofVentWidthM +
    ref.sideVentCount * ref.sideVentHeightM * 1.2;
  return normalizedRatio(actual, baseline);
}

export function acCapacityFactor(sizing: ClimateEquipmentSizing): number {
  const ref = REFERENCE_CLIMATE_SIZING;
  const actual = sizing.acUnitCount * sizing.acUnitWidthM;
  const baseline = ref.acUnitCount * ref.acUnitWidthM;
  return normalizedRatio(actual, baseline);
}

export function heaterCapacityFactor(sizing: ClimateEquipmentSizing): number {
  return normalizedRatio(
    sizing.heaterUnitCount,
    REFERENCE_CLIMATE_SIZING.heaterUnitCount,
  );
}

export function fogCapacityFactor(sizing: ClimateEquipmentSizing): number {
  return normalizedRatio(
    sizing.fogLineCount,
    REFERENCE_CLIMATE_SIZING.fogLineCount,
  );
}
