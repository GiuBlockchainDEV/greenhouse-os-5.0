import type { ClimateEquipment, ClimateScenario, CoveringMaterial, CropConfig, GreenhouseDimensions, GreenhouseStructure } from "@/types/greenhouse";
import {
  buildHeatmapFieldContext,
  generateAllSurfaceHeatmaps,
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

  // Heatmap visualization always follows current UI inputs (immediate slider feedback).
  const baseTemp = preview.internalTemp;
  const externalTemp = preview.externalTemp;
  const internalRh = preview.internalRh;
  const qSolar = preview.qSolar;

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

  return { ctx, surfaces, internalRh, isLive, preview };
}

// Re-export for HeatmapControls
export { estimatePreviewMicroclimate } from "@/lib/thermalEstimate";
