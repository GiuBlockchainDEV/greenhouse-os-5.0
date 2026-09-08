/** Flow-based ventilation models (ENV-02 … ENV-05). */

import type { ClimateEquipment, ClimateScenario, GreenhouseDimensions } from "@/types/greenhouse";
import {
  DEFAULT_CIRCULATION_FACE_VELOCITY_MS,
  DEFAULT_DISCHARGE_COEFF,
  DEFAULT_EXHAUST_FACE_VELOCITY_MS,
  DEFAULT_LEAKAGE_ACH,
  DEFAULT_ROOF_EXHAUST_FACE_VELOCITY_MS,
  DEFAULT_WIND_PRESSURE_COEFF,
  GRAVITY_M_S2,
} from "@/lib/thermal/constants";

export interface VentilationFlowBreakdown {
  mechanicalM3h: number;
  windM3h: number;
  stackM3h: number;
  infiltrationM3h: number;
  totalM3h: number;
  ach: number;
}

function fanThroatFlowM3h(
  count: number,
  diameterM: number,
  faceVelocityMs: number,
  runtimeFraction = 1,
): number {
  if (count <= 0 || diameterM <= 0) return 0;
  const area = count * Math.PI * (diameterM / 2) ** 2;
  return area * faceVelocityMs * 3600 * runtimeFraction;
}

function usesMechanicalVentilation(equipment: ClimateEquipment): boolean {
  return (
    equipment.cooling === "fan_and_pad" ||
    equipment.cooling === "evaporative" ||
    equipment.ventilation === "forced_exhaust" ||
    equipment.ventilation === "combined"
  );
}

function effectiveVentOpeningAreaM2(equipment: ClimateEquipment): number {
  const sizing = equipment.sizing;
  const roofArea =
    sizing.roofVentCount * sizing.roofVentWidthM * 0.35;
  const sideArea =
    sizing.sideVentCount * sizing.sideVentHeightM * 1.8 * 2;
  const gableArea =
    equipment.ventilation === "natural_gable" ? sizing.padWallWidthM * 0.35 : 0;
  return roofArea + sideArea + gableArea;
}

function verticalOpeningSeparationM(dimensions: GreenhouseDimensions): number {
  return Math.max(dimensions.eaveHeight * 0.65, 1.2);
}

export function computeVentilationFlows(
  equipment: ClimateEquipment,
  scenario: ClimateScenario,
  dimensions: GreenhouseDimensions,
  volumeM3: number,
  internalTempC: number,
  runtimeFraction = 1,
  screenPressureDropFactor = 1,
): VentilationFlowBreakdown {
  const sizing = equipment.sizing;
  let mechanicalM3h = 0;

  if (usesMechanicalVentilation(equipment)) {
    mechanicalM3h =
      fanThroatFlowM3h(
        sizing.exhaustFanCount,
        sizing.exhaustFanDiameterM,
        DEFAULT_EXHAUST_FACE_VELOCITY_MS,
        runtimeFraction,
      ) +
      fanThroatFlowM3h(
        sizing.roofExhaustFanCount,
        sizing.roofExhaustFanDiameterM,
        DEFAULT_ROOF_EXHAUST_FACE_VELOCITY_MS,
        runtimeFraction,
      );
    mechanicalM3h *= screenPressureDropFactor;
  }

  const aEff = effectiveVentOpeningAreaM2(equipment);
  const windM3h =
    equipment.ventilation !== "forced_exhaust"
      ? DEFAULT_DISCHARGE_COEFF *
        aEff *
        scenario.windSpeedMS *
        Math.sqrt(DEFAULT_WIND_PRESSURE_COEFF) *
        3600
      : 0;

  const deltaT = Math.abs(internalTempC - scenario.externalTempC);
  const tInK = internalTempC + 273.15;
  const stackM3h =
    aEff > 0 && deltaT > 0.05
      ? DEFAULT_DISCHARGE_COEFF *
        aEff *
        Math.sqrt(
          2 *
            GRAVITY_M_S2 *
            verticalOpeningSeparationM(dimensions) *
            deltaT /
            Math.max(tInK, 200),
        ) *
        3600
      : 0;

  const infiltrationM3h = DEFAULT_LEAKAGE_ACH * Math.max(volumeM3, 1);
  const naturalCombined = Math.sqrt(windM3h ** 2 + stackM3h ** 2);
  const totalM3h = mechanicalM3h + naturalCombined + infiltrationM3h;

  return {
    mechanicalM3h,
    windM3h,
    stackM3h,
    infiltrationM3h,
    totalM3h,
    ach: totalM3h / Math.max(volumeM3, 1),
  };
}

export function circulationRecirculationM3h(
  equipment: ClimateEquipment,
  runtimeFraction = 1,
): number {
  const sizing = equipment.sizing;
  return fanThroatFlowM3h(
    sizing.circulationFanCount,
    sizing.circulationFanDiameterM,
    DEFAULT_CIRCULATION_FACE_VELOCITY_MS,
    runtimeFraction,
  );
}

export function mixingEffectiveness(
  ventilationTotalM3h: number,
  recirculationM3h: number,
  volumeM3: number,
): number {
  const ventRate = ventilationTotalM3h / Math.max(volumeM3, 1);
  const recircRate = recirculationM3h / Math.max(volumeM3, 1);
  return Math.min(0.92, 0.12 + ventRate * 0.08 + recircRate * 0.18);
}
