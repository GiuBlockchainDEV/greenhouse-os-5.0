/**
 * Equipment-aware microclimate preview (Qatar-corrected physics engine).
 */
import type {
  ClimateEquipment,
  ClimateScenario,
  CoveringMaterial,
  CropConfig,
  GreenhouseDimensions,
  ShadingScreen,
} from "@/types/greenhouse";
import { solveMicroclimate, HEATING_SETPOINT_C } from "@/lib/thermal/solveMicroclimate";

export { HEATING_SETPOINT_C };
export const MECHANICAL_AC_TEMP_FLOOR_C = 12;

export function ventilationAchWithSizing(
  equipment: ClimateEquipment,
  scenario: ClimateScenario,
  length: number,
  width: number,
  eaveHeight = 3,
  ridgeHeight = 4.5,
): number {
  return solveMicroclimate({
    scenario,
    covering: { type: "glass", transmittance: 0.85, uValue: 5.8 },
    shadingScreen: { installed: false, deploymentPct: 0 },
    equipment,
    dimensions: { length, width, eaveHeight, ridgeHeight },
    crop: {
      type: "tomato",
      system: "nft",
      lai: 3,
      growthStage: "mid_season",
      layout: {
        tierCount: 1,
        gutterLengthM: length,
        plantsPerTier: 100,
        plantDensity: 1,
        bedLineCount: 2,
        pathwayWidthM: 1.2,
        sideClearanceM: 0.6,
      },
    },
  }).ventilationAch;
}

export function estimatePreviewMicroclimate(
  scenario: ClimateScenario,
  covering: CoveringMaterial,
  shadingScreen: ShadingScreen,
  equipment: ClimateEquipment,
  dimensions: GreenhouseDimensions,
  crop: CropConfig,
  et0MmDay?: number,
): {
  internalTemp: number;
  externalTemp: number;
  internalRh: number;
  qSolar: number;
  vpdKpa: number;
  ventilationAch?: number;
  mixingEffectiveness?: number;
  supplyTempC?: number | null;
  supplyHumidityRatioKgKg?: number | null;
} {
  const result = solveMicroclimate({
    scenario,
    covering,
    shadingScreen,
    equipment,
    dimensions,
    crop,
    et0MmDay,
  });

  return {
    internalTemp: result.internalTemp,
    externalTemp: result.externalTemp,
    internalRh: result.internalRh,
    qSolar: result.qSolar,
    vpdKpa: result.vpdKpa,
    ventilationAch: result.ventilationAch,
    mixingEffectiveness: result.mixingEffectiveness,
    supplyTempC: result.supplyTempC,
    supplyHumidityRatioKgKg: result.supplyHumidityRatioKgKg,
  };
}
