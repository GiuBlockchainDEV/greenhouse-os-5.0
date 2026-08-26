import type { ClimateEquipment, ClimateScenario, CoveringMaterial } from "@/types/greenhouse";
import { generateFallbackHeatmap } from "@/lib/heatmapFallback";
import type { SimulationData } from "@/lib/heatmapData";

export function estimatePreviewMicroclimate(
  scenario: ClimateScenario,
  covering: CoveringMaterial,
  equipment: ClimateEquipment,
): {
  internalTemp: number;
  externalTemp: number;
  internalRh: number;
  qSolar: number;
} {
  const externalTemp = scenario.externalTempC - 3;
  const qSolar = covering.transmittance * 260;

  let internalTemp = externalTemp + qSolar * 0.04 + 2.5;
  if (equipment.cooling === "fan_and_pad" || equipment.cooling === "evaporative") {
    internalTemp -= 3.5;
  }
  if (equipment.cooling === "mechanical_ac") {
    internalTemp -= 5;
  }
  if (equipment.heating !== "none") {
    internalTemp += 2;
  }

  const internalRh = Math.min(
    95,
    Math.max(35, scenario.externalRhPct + 8 - (internalTemp - externalTemp) * 1.2),
  );

  return {
    internalTemp: Math.round(internalTemp * 10) / 10,
    externalTemp: Math.round(externalTemp * 10) / 10,
    internalRh: Math.round(internalRh * 10) / 10,
    qSolar: Math.round(qSolar * 10) / 10,
  };
}

export function resolveHeatmapInputs(
  length: number,
  width: number,
  simulationResults: SimulationData | null,
  scenario: ClimateScenario,
  covering: CoveringMaterial,
  equipment: ClimateEquipment,
): {
  matrix: number[][];
  internalRh: number;
  isLive: boolean;
  preview: ReturnType<typeof estimatePreviewMicroclimate>;
} {
  const liveMatrix = simulationResults?.heatmap_matrix;
  const isLive = Boolean(liveMatrix && liveMatrix.length > 0);

  if (isLive && liveMatrix) {
    return {
      matrix: liveMatrix,
      internalRh: simulationResults!.microclimate.internal_rh,
      isLive,
      preview: estimatePreviewMicroclimate(scenario, covering, equipment),
    };
  }

  const preview = estimatePreviewMicroclimate(scenario, covering, equipment);
  return {
    matrix: generateFallbackHeatmap(
      length,
      width,
      preview.internalTemp,
      preview.externalTemp,
      preview.qSolar,
    ),
    internalRh: preview.internalRh,
    isLive: false,
    preview,
  };
}
