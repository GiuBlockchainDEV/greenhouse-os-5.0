import type { ClimateEquipment, ClimateScenario, CoveringMaterial, CropConfig, GreenhouseDimensions, GreenhouseStructure } from "@/types/greenhouse";
import {
  buildHeatmapFieldContext,
  generateAllSurfaceHeatmaps,
  generateSurfaceHeatmap,
  type HeatmapSurfaceKind,
} from "@/lib/equipmentAwareHeatmap";
import type { SimulationData } from "@/lib/heatmapData";
import { estimatePreviewMicroclimate } from "@/lib/thermalEstimate";

export function resolveHeatmapField(
  dimensions: GreenhouseDimensions,
  structure: GreenhouseStructure,
  equipment: ClimateEquipment,
  crop: CropConfig,
  covering: CoveringMaterial,
  scenario: ClimateScenario,
  simulationResults: SimulationData | null,
): {
  ctx: ReturnType<typeof buildHeatmapFieldContext>;
  surfaces: Record<HeatmapSurfaceKind, number[][]>;
  internalRh: number;
  isLive: boolean;
  preview: ReturnType<typeof estimatePreviewMicroclimate>;
} {
  const preview = estimatePreviewMicroclimate(
    scenario,
    covering,
    equipment,
    dimensions,
    crop,
  );

  const isLive = Boolean(
    simulationResults?.heatmap_matrix && simulationResults.heatmap_matrix.length > 0,
  );

  const baseTemp = isLive
    ? simulationResults!.microclimate.internal_temp
    : preview.internalTemp;
  const externalTemp = isLive
    ? simulationResults!.microclimate.external_temp
    : preview.externalTemp;
  const internalRh = isLive
    ? simulationResults!.microclimate.internal_rh
    : preview.internalRh;
  const qSolar = isLive
    ? simulationResults!.thermal_balance.q_solar
    : preview.qSolar;

  const ctx = buildHeatmapFieldContext(
    dimensions,
    structure,
    equipment,
    crop,
    baseTemp,
    externalTemp,
    internalRh,
    qSolar,
  );

  const surfaces = generateAllSurfaceHeatmaps(ctx);

  if (isLive && simulationResults?.heatmap_matrix) {
    surfaces.floor = simulationResults.heatmap_matrix;
  } else {
    surfaces.floor = generateSurfaceHeatmap(ctx, "floor");
  }

  return { ctx, surfaces, internalRh, isLive, preview };
}

// Re-export for HeatmapControls
export { estimatePreviewMicroclimate } from "@/lib/thermalEstimate";
