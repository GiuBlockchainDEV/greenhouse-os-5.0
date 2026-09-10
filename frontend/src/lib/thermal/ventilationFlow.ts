/** Flow-based ventilation models (ENV-02 … ENV-05). */

import type { ClimateEquipment, ClimateScenario, GreenhouseDimensions } from "@/types/greenhouse";
import {
  DEFAULT_DISCHARGE_COEFF,
  DEFAULT_WIND_PRESSURE_COEFF,
  GRAVITY_M_S2,
} from "@/lib/thermal/constants";
import {
  resolveCirculationFlowM3h,
  resolveExhaustFlowM3h,
  resolveLeakageAch,
  resolveRoofExhaustFlowM3h,
} from "@/lib/thermal/ratedCapacities";

export interface VentilationFlowBreakdown {
  mechanicalM3h: number;
  windM3h: number;
  stackM3h: number;
  infiltrationM3h: number;
  totalM3h: number;
  ach: number;
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
      resolveExhaustFlowM3h(sizing, runtimeFraction) +
      resolveRoofExhaustFlowM3h(sizing, runtimeFraction);
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

  const infiltrationM3h = resolveLeakageAch(sizing) * Math.max(volumeM3, 1);
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
  return resolveCirculationFlowM3h(equipment.sizing, runtimeFraction);
}

/** HAF recirculation mixing coefficient (no outdoor air exchange). */
export function circulationMixingEffectiveness(
  recirculationM3h: number,
  volumeM3: number,
): number {
  const recircRate = recirculationM3h / Math.max(volumeM3, 1);
  return Math.min(0.88, 0.04 + recircRate * 0.24);
}

/**
 * Combined mixing: dominated by HAF recirculation; ventilation adds minor turbulence only.
 */
export function mixingEffectiveness(
  ventilationTotalM3h: number,
  recirculationM3h: number,
  volumeM3: number,
): number {
  const hafMix = circulationMixingEffectiveness(recirculationM3h, volumeM3);
  const ventRate = ventilationTotalM3h / Math.max(volumeM3, 1);
  const ventTurbulence = Math.min(0.18, ventRate * 0.035);
  return Math.min(0.92, hafMix + ventTurbulence * (1 - hafMix * 0.5));
}
