/**
 * Equipment-aware microclimate preview (calibrated global balance + rated flows for heatmap).
 */
import type {
  ClimateEquipment,
  ClimateScenario,
  CoveringMaterial,
  CropConfig,
  GreenhouseDimensions,
  ShadingScreen,
} from "@/types/greenhouse";
import {
  solveMicroclimate,
  HEATING_SETPOINT_C,
  MECHANICAL_AC_TEMP_FLOOR_C,
  ventilationAchWithSizing,
} from "@/lib/thermal/solveMicroclimate";

export { HEATING_SETPOINT_C, MECHANICAL_AC_TEMP_FLOOR_C, ventilationAchWithSizing };

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
