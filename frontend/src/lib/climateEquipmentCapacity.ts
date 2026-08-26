import { DEFAULT_CLIMATE_SIZING } from "@/lib/climateEquipmentLayout";
import type { ClimateEquipmentSizing } from "@/types/greenhouse";

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
  const ref = DEFAULT_CLIMATE_SIZING;
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
  const ref = DEFAULT_CLIMATE_SIZING;
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

export function padCapacityFactor(sizing: ClimateEquipmentSizing): number {
  const ref = DEFAULT_CLIMATE_SIZING;
  const actual = sizing.padWallWidthM * sizing.padWallHeightM;
  const baseline = ref.padWallWidthM * ref.padWallHeightM;
  return normalizedRatio(actual, baseline);
}

export function ventCapacityFactor(sizing: ClimateEquipmentSizing): number {
  const ref = DEFAULT_CLIMATE_SIZING;
  const actual =
    sizing.roofVentCount * sizing.roofVentWidthM +
    sizing.sideVentCount * sizing.sideVentHeightM * 1.2;
  const baseline =
    ref.roofVentCount * ref.roofVentWidthM +
    ref.sideVentCount * ref.sideVentHeightM * 1.2;
  return normalizedRatio(actual, baseline);
}

export function acCapacityFactor(sizing: ClimateEquipmentSizing): number {
  const ref = DEFAULT_CLIMATE_SIZING;
  const actual = sizing.acUnitCount * sizing.acUnitWidthM;
  const baseline = ref.acUnitCount * ref.acUnitWidthM;
  return normalizedRatio(actual, baseline);
}

export function heaterCapacityFactor(sizing: ClimateEquipmentSizing): number {
  return normalizedRatio(
    sizing.heaterUnitCount,
    DEFAULT_CLIMATE_SIZING.heaterUnitCount,
  );
}

export function fogCapacityFactor(sizing: ClimateEquipmentSizing): number {
  return normalizedRatio(
    sizing.fogLineCount,
    DEFAULT_CLIMATE_SIZING.fogLineCount,
  );
}
