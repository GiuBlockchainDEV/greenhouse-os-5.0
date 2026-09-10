import { computeCultivationLayout } from "@/lib/cultivationLayout";
import {
  computeClimateEquipmentLayout,
  type ClimateEquipmentLayout,
} from "@/lib/climateEquipmentLayout";
import { HEATING_SETPOINT_C } from "@/lib/thermal/solveMicroclimate";
import { anchorWallsToFloorField } from "@/lib/heatmapBoundaryContinuity";
import {
  applyConservationToGrid,
  computeSpatialPerturbation,
} from "@/lib/thermal/spatialField";
import type { HeatmapSurfaceValues } from "@/lib/heatmapData";
import {
  buildUniformityMatrix,
  buildVpdMatrix,
  HEATMAP_FIXED_SCALE,
} from "@/lib/heatmapData";
import type {
  ClimateEquipment,
  ClimateScenario,
  CropConfig,
  GreenhouseDimensions,
  GreenhouseStructure,
} from "@/types/greenhouse";

export type HeatmapSurfaceKind =
  | "floor"
  | "roof"
  | "wall_west"
  | "wall_east"
  | "wall_north"
  | "wall_south";

export const VISIBLE_HEATMAP_SURFACE_KINDS = [
  "floor",
  "wall_west",
  "wall_east",
  "wall_north",
  "wall_south",
] as const satisfies readonly HeatmapSurfaceKind[];

export interface HeatmapFieldContext {
  length: number;
  width: number;
  eaveHeight: number;
  ridgeHeight: number;
  structureBayWidth: number;
  baseTemp: number;
  externalTemp: number;
  internalRh: number;
  qSolar: number;
  equipment: ClimateEquipment;
  layout: ClimateEquipmentLayout;
  scenario: ClimateScenario;
  mixingEffectiveness: number;
  supplyTempC: number | null;
  supplyHumidityRatioKgKg: number | null;
  heatingActive: boolean;
  coeffs: {
    halfL: number;
    halfW: number;
    invHalfL: number;
    invHalfW: number;
  };
}

const TEMP_DISPLAY_MIN = HEATMAP_FIXED_SCALE.temperature.min;
const TEMP_DISPLAY_MAX = HEATMAP_FIXED_SCALE.temperature.max;
const GRID_STEP_M = 1.25;
const GRID_MIN = 8;
const GRID_MAX = 24;

function gridSize(span: number): number {
  return Math.min(GRID_MAX, Math.max(GRID_MIN, Math.round(span / GRID_STEP_M)));
}

function finalizeSurfaceValues(
  temperature: number[][],
  humidity: number[][],
): HeatmapSurfaceValues {
  const clampedTemp: number[][] = [];
  const clampedRh: number[][] = [];

  for (let row = 0; row < temperature.length; row++) {
    const tempRow: number[] = [];
    const rhRow: number[] = [];
    for (let col = 0; col < (temperature[row]?.length ?? 0); col++) {
      const temp = Math.max(
        TEMP_DISPLAY_MIN,
        Math.min(TEMP_DISPLAY_MAX, temperature[row]?.[col] ?? TEMP_DISPLAY_MIN),
      );
      const rh = Math.max(
        HEATMAP_FIXED_SCALE.humidity.min,
        Math.min(HEATMAP_FIXED_SCALE.humidity.max, humidity[row]?.[col] ?? 0),
      );
      tempRow.push(Math.round(temp * 100) / 100);
      rhRow.push(Math.round(rh * 100) / 100);
    }
    clampedTemp.push(tempRow);
    clampedRh.push(rhRow);
  }

  return {
    temperature: clampedTemp,
    humidity: clampedRh,
    vpd: buildVpdMatrix(clampedTemp, clampedRh),
    uniformity: buildUniformityMatrix(clampedTemp, clampedRh),
  };
}

function fillHorizontalGrid(
  ctx: HeatmapFieldContext,
  rows: number,
  cols: number,
  y: number,
  surface: HeatmapSurfaceKind = "floor",
): HeatmapSurfaceValues {
  const { halfL, halfW } = ctx.coeffs;
  const rowDenom = Math.max(rows - 1, 1);
  const colDenom = Math.max(cols - 1, 1);
  const temperature: number[][] = [];
  const humidity: number[][] = [];

  for (let row = 0; row < rows; row++) {
    const tempRow: number[] = [];
    const rhRow: number[] = [];
    const x = -halfL + (row / rowDenom) * ctx.length;
    for (let col = 0; col < cols; col++) {
      const z = -halfW + (col / colDenom) * ctx.width;
      const { tempDelta, rhDelta } = computeSpatialPerturbation(ctx, x, y, z, surface);
      tempRow.push(Math.round((ctx.baseTemp + tempDelta) * 100) / 100);
      rhRow.push(Math.round((ctx.internalRh + rhDelta) * 100) / 100);
    }
    temperature.push(tempRow);
    humidity.push(rhRow);
  }

  const conserved = applyConservationToGrid(
    temperature,
    humidity,
    ctx.baseTemp,
    ctx.internalRh,
  );

  return finalizeSurfaceValues(conserved.temperature, conserved.humidity);
}

export function buildHeatmapFieldContext(
  dimensions: GreenhouseDimensions,
  structure: GreenhouseStructure,
  equipment: ClimateEquipment,
  crop: CropConfig,
  baseTemp: number,
  externalTemp: number,
  internalRh: number,
  qSolar: number,
  scenario: ClimateScenario,
  options?: {
    mixingEffectiveness?: number;
    supplyTempC?: number | null;
    supplyHumidityRatioKgKg?: number | null;
  },
): HeatmapFieldContext {
  const cultivation = computeCultivationLayout({
    length: dimensions.length,
    totalWidth: dimensions.width,
    bayCount: structure.bayCount,
    bayWidthM: structure.bayWidthM,
    eaveHeight: dimensions.eaveHeight,
    cropType: crop.type,
    system: crop.system,
    layout: crop.layout,
    lai: crop.lai,
    growthStage: crop.growthStage,
  });

  const layout = computeClimateEquipmentLayout({
    dimensions,
    structure,
    equipment,
    cultivationBeds: cultivation.beds,
    bedLineCount: cultivation.bedLineCount,
  });

  const halfL = dimensions.length / 2;
  const halfW = dimensions.width / 2;

  return {
    length: dimensions.length,
    width: dimensions.width,
    eaveHeight: dimensions.eaveHeight,
    ridgeHeight: dimensions.ridgeHeight,
    structureBayWidth: structure.bayWidthM,
    baseTemp,
    externalTemp,
    internalRh,
    qSolar,
    equipment,
    layout,
    scenario,
    mixingEffectiveness: options?.mixingEffectiveness ?? 0.25,
    supplyTempC: options?.supplyTempC ?? null,
    supplyHumidityRatioKgKg: options?.supplyHumidityRatioKgKg ?? null,
    heatingActive:
      equipment.heating !== "none" && HEATING_SETPOINT_C - baseTemp > 0.5,
    coeffs: {
      halfL,
      halfW,
      invHalfL: 1 / Math.max(halfL, 0.1),
      invHalfW: 1 / Math.max(halfW, 0.1),
    },
  };
}

export function generateSurfaceHeatmap(
  ctx: HeatmapFieldContext,
  surface: HeatmapSurfaceKind,
  options?: { applyConservation?: boolean },
): HeatmapSurfaceValues {
  const applyConservation = options?.applyConservation ?? true;
  const { halfL, halfW } = ctx.coeffs;

  if (surface === "floor") {
    return fillHorizontalGrid(ctx, gridSize(ctx.length), gridSize(ctx.width), 0.2, "floor");
  }

  if (surface === "roof") {
    return fillHorizontalGrid(
      ctx,
      gridSize(ctx.length),
      gridSize(ctx.width),
      ctx.ridgeHeight - 0.15,
      "roof",
    );
  }

  const wallRows = gridSize(
    surface === "wall_west" || surface === "wall_east" ? ctx.width : ctx.length,
  );
  const wallCols = gridSize(ctx.eaveHeight);
  const rowDenom = Math.max(wallRows - 1, 1);
  const colDenom = Math.max(wallCols - 1, 1);
  const temperature: number[][] = [];
  const humidity: number[][] = [];

  for (let row = 0; row < wallRows; row++) {
    const tempRow: number[] = [];
    const rhRow: number[] = [];
    for (let col = 0; col < wallCols; col++) {
      const y = (col / colDenom) * ctx.eaveHeight;
      let x = 0;
      let z = 0;

      if (surface === "wall_west") {
        x = -halfL + 0.05;
        z = -halfW + (row / rowDenom) * ctx.width;
      } else if (surface === "wall_east") {
        x = halfL - 0.05;
        z = -halfW + (row / rowDenom) * ctx.width;
      } else if (surface === "wall_north") {
        x = -halfL + (row / rowDenom) * ctx.length;
        z = -halfW + 0.05;
      } else {
        x = -halfL + (row / rowDenom) * ctx.length;
        z = halfW - 0.05;
      }

      const { tempDelta, rhDelta } = computeSpatialPerturbation(ctx, x, y, z, surface);
      tempRow.push(Math.round((ctx.baseTemp + tempDelta) * 100) / 100);
      rhRow.push(Math.round((ctx.internalRh + rhDelta) * 100) / 100);
    }
    temperature.push(tempRow);
    humidity.push(rhRow);
  }

  if (!applyConservation) {
    return finalizeSurfaceValues(temperature, humidity);
  }

  const conserved = applyConservationToGrid(
    temperature,
    humidity,
    ctx.baseTemp,
    ctx.internalRh,
  );

  return finalizeSurfaceValues(conserved.temperature, conserved.humidity);
}

export function generateVisibleSurfaceHeatmaps(
  ctx: HeatmapFieldContext,
): Record<(typeof VISIBLE_HEATMAP_SURFACE_KINDS)[number], HeatmapSurfaceValues> {
  const floor = generateSurfaceHeatmap(ctx, "floor");
  const rawWalls = {
    wall_west: generateSurfaceHeatmap(ctx, "wall_west", { applyConservation: false }),
    wall_east: generateSurfaceHeatmap(ctx, "wall_east", { applyConservation: false }),
    wall_north: generateSurfaceHeatmap(ctx, "wall_north", { applyConservation: false }),
    wall_south: generateSurfaceHeatmap(ctx, "wall_south", { applyConservation: false }),
  };
  const walls = anchorWallsToFloorField(ctx, floor, rawWalls);

  return {
    floor,
    ...walls,
  };
}

export function generateAllSurfaceHeatmaps(
  ctx: HeatmapFieldContext,
): Record<HeatmapSurfaceKind, HeatmapSurfaceValues> {
  const kinds: HeatmapSurfaceKind[] = [
    "floor",
    "roof",
    "wall_west",
    "wall_east",
    "wall_north",
    "wall_south",
  ];
  return Object.fromEntries(
    kinds.map((kind) => [kind, generateSurfaceHeatmap(ctx, kind)]),
  ) as Record<HeatmapSurfaceKind, HeatmapSurfaceValues>;
}
