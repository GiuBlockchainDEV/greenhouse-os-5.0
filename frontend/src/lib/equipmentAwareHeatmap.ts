import { computeCultivationLayout } from "@/lib/cultivationLayout";
import {
  computeClimateEquipmentLayout,
  type ClimateEquipmentLayout,
} from "@/lib/climateEquipmentLayout";
import type {
  ClimateEquipment,
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
  mixingFactor: number;
}

function gaussian1d(dist: number, sigma: number): number {
  if (sigma <= 0) return 0;
  return Math.exp(-(dist * dist) / (2 * sigma * sigma));
}

function gridSize(span: number, step = 2): number {
  return Math.max(Math.floor(span / step), 4);
}

function influenceAt(ctx: HeatmapFieldContext, x: number, y: number, z: number): number {
  const halfL = ctx.length / 2;
  const halfW = ctx.width / 2;
  let delta = 0;

  const xNorm = (x + halfL) / Math.max(ctx.length, 0.1);
  const edgeFactor = Math.sqrt(((x / halfL) ** 2 + (z / halfW) ** 2) / 2);

  delta += ctx.qSolar * 0.014 * (1 - edgeFactor * 0.55);
  delta -= edgeFactor * Math.max(ctx.baseTemp - ctx.externalTemp, 0) * 0.07;

  for (const pad of ctx.layout.padWalls) {
    const g =
      gaussian1d(z - pad.zCenter, pad.widthM * 0.35) *
      gaussian1d(x - pad.x, ctx.length * 0.22);
    delta -= 2.8 * g * (pad.widthM / Math.max(ctx.width, 1));
    if (y <= pad.heightM + 0.3) {
      delta -= 1.2 * g;
    }
  }

  for (const fan of ctx.layout.exhaustFans) {
    const sigma = fan.diameterM * 1.4;
    delta += 1.4 * gaussian1d(x - fan.x, sigma) * gaussian1d(z - fan.z, sigma) * (fan.diameterM / 1.2);
  }

  for (const fan of ctx.layout.roofExhaustFans) {
    const sigma = fan.diameterM * 1.6;
    delta += 1.1 * gaussian1d(x - fan.x, sigma) * gaussian1d(z - fan.z, sigma);
  }

  for (const fan of ctx.layout.circulationFans) {
    const sigma = fan.diameterM * 2.2;
    delta += 0.35 * gaussian1d(x - fan.x, sigma) * gaussian1d(z - fan.z, sigma);
  }

  for (const vent of ctx.layout.vents) {
    const sigmaX = vent.kind === "roof" ? vent.widthM * 0.45 : 1.2;
    const sigmaZ = vent.kind === "roof" ? ctx.structureBayWidth * 0.35 : 1.2;
    const g = gaussian1d(x - vent.x, sigmaX) * gaussian1d(z - vent.z, sigmaZ);
    if (vent.kind === "roof") {
      delta -= 1.6 * g;
      if (y >= ctx.ridgeHeight - 0.6) {
        delta -= 0.8 * g;
      }
    } else if (vent.kind === "side") {
      delta -= 1.1 * g;
    } else {
      delta -= 0.9 * g;
    }
  }

  for (const ac of ctx.layout.acUnits) {
    const sigma = ac.widthM * 0.9;
    delta -= 2.5 * gaussian1d(x - ac.x, sigma) * gaussian1d(z - ac.z, sigma);
  }

  for (const heater of ctx.layout.heaters) {
    delta += 1.8 * gaussian1d(x - heater.x, 2.2) * gaussian1d(z - heater.z, 2.2);
  }

  for (const fog of ctx.layout.fogLines) {
    delta -= 0.9 * gaussian1d(z - fog.z, ctx.width * 0.18);
  }

  if (ctx.equipment.cooling === "fan_and_pad") {
    const padWidth = ctx.layout.padWalls[0]?.widthM ?? 0;
    delta -= (1 - xNorm) * 1.5 * (padWidth / Math.max(ctx.width, 1));
  }

  return delta * (1 - ctx.mixingFactor * 0.45);
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

  const mixingFactor = Math.min(
    0.85,
    equipment.sizing.circulationFanCount * 0.08 + equipment.sizing.exhaustFanCount * 0.04,
  );

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
    mixingFactor,
  };
}

export function generateSurfaceHeatmap(
  ctx: HeatmapFieldContext,
  surface: HeatmapSurfaceKind,
): number[][] {
  const halfL = ctx.length / 2;
  const halfW = ctx.width / 2;

  if (surface === "floor") {
    const rows = gridSize(ctx.length);
    const cols = gridSize(ctx.width);
    const matrix: number[][] = [];
    for (let row = 0; row < rows; row++) {
      const rowData: number[] = [];
      const x = -halfL + (row / Math.max(rows - 1, 1)) * ctx.length;
      for (let col = 0; col < cols; col++) {
        const z = -halfW + (col / Math.max(cols - 1, 1)) * ctx.width;
        rowData.push(
          Math.round((ctx.baseTemp + influenceAt(ctx, x, 0.2, z)) * 100) / 100,
        );
      }
      matrix.push(rowData);
    }
    return matrix;
  }

  if (surface === "roof") {
    const rows = gridSize(ctx.length);
    const cols = gridSize(ctx.width);
    const y = ctx.ridgeHeight - 0.15;
    const matrix: number[][] = [];
    for (let row = 0; row < rows; row++) {
      const rowData: number[] = [];
      const x = -halfL + (row / Math.max(rows - 1, 1)) * ctx.length;
      for (let col = 0; col < cols; col++) {
        const z = -halfW + (col / Math.max(cols - 1, 1)) * ctx.width;
        let temp = ctx.baseTemp + influenceAt(ctx, x, y, z);
        temp += ctx.qSolar * 0.022;
        rowData.push(Math.round(temp * 100) / 100);
      }
      matrix.push(rowData);
    }
    return matrix;
  }

  const wallRows = gridSize(
    surface === "wall_west" || surface === "wall_east" ? ctx.width : ctx.length,
  );
  const wallCols = gridSize(ctx.eaveHeight, 1);
  const matrix: number[][] = [];

  for (let row = 0; row < wallRows; row++) {
    const rowData: number[] = [];
    for (let col = 0; col < wallCols; col++) {
      const y = (col / Math.max(wallCols - 1, 1)) * ctx.eaveHeight;
      let x = 0;
      let z = 0;

      if (surface === "wall_west") {
        x = -halfL + 0.05;
        z = -halfW + (row / Math.max(wallRows - 1, 1)) * ctx.width;
      } else if (surface === "wall_east") {
        x = halfL - 0.05;
        z = -halfW + (row / Math.max(wallRows - 1, 1)) * ctx.width;
      } else if (surface === "wall_north") {
        x = -halfL + (row / Math.max(wallRows - 1, 1)) * ctx.length;
        z = -halfW + 0.05;
      } else {
        x = -halfL + (row / Math.max(wallRows - 1, 1)) * ctx.length;
        z = halfW - 0.05;
      }

      let temp = ctx.baseTemp + influenceAt(ctx, x, y, z);
      if (surface === "wall_west") {
        const pad = ctx.layout.padWalls[0];
        if (pad && y <= pad.heightM + 0.2) {
          temp -= 2 * gaussian1d(z - pad.zCenter, pad.widthM * 0.4);
        }
      }
      if (surface === "wall_east") {
        temp += 0.8 * (y / Math.max(ctx.eaveHeight, 1));
      }

      rowData.push(Math.round(temp * 100) / 100);
    }
    matrix.push(rowData);
  }

  return matrix;
}

export function generateAllSurfaceHeatmaps(
  ctx: HeatmapFieldContext,
): Record<HeatmapSurfaceKind, number[][]> {
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
  ) as Record<HeatmapSurfaceKind, number[][]>;
}
