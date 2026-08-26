import { computeCultivationLayout } from "@/lib/cultivationLayout";
import {
  computeClimateEquipmentLayout,
  DEFAULT_CLIMATE_SIZING,
  type ClimateEquipmentLayout,
} from "@/lib/climateEquipmentLayout";
import type { HeatmapSurfaceValues } from "@/lib/heatmapData";
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

function clampRh(value: number): number {
  return Math.max(30, Math.min(98, value));
}

function fanFlowFactor(diameterM: number, count: number, refDiameter: number): number {
  if (count <= 0 || diameterM <= 0) return 0;
  const ratio = diameterM / refDiameter;
  return count * ratio * ratio;
}

function padAreaFactor(widthM: number, heightM: number): number {
  const refArea =
    DEFAULT_CLIMATE_SIZING.padWallWidthM * DEFAULT_CLIMATE_SIZING.padWallHeightM;
  return (widthM * heightM) / Math.max(refArea, 0.1);
}

function acCapacityFactor(widthM: number): number {
  return widthM / Math.max(DEFAULT_CLIMATE_SIZING.acUnitWidthM, 0.1);
}

function circulationScale(diameterM: number): number {
  return (diameterM / Math.max(DEFAULT_CLIMATE_SIZING.circulationFanDiameterM, 0.1)) ** 2;
}

function exhaustScale(diameterM: number): number {
  return (diameterM / Math.max(DEFAULT_CLIMATE_SIZING.exhaustFanDiameterM, 0.1)) ** 2;
}

function computeMixingFactor(equipment: ClimateEquipment): number {
  const s = equipment.sizing;
  const circulationFlow = fanFlowFactor(
    s.circulationFanDiameterM,
    s.circulationFanCount,
    DEFAULT_CLIMATE_SIZING.circulationFanDiameterM,
  );
  const exhaustFlow =
    fanFlowFactor(
      s.exhaustFanDiameterM,
      s.exhaustFanCount,
      DEFAULT_CLIMATE_SIZING.exhaustFanDiameterM,
    ) +
    fanFlowFactor(
      s.roofExhaustFanDiameterM,
      s.roofExhaustFanCount,
      DEFAULT_CLIMATE_SIZING.roofExhaustFanDiameterM,
    );

  return Math.min(0.92, circulationFlow * 0.055 + exhaustFlow * 0.04);
}

function tempInfluenceAt(ctx: HeatmapFieldContext, x: number, y: number, z: number): number {
  const halfL = ctx.length / 2;
  const halfW = ctx.width / 2;
  let delta = 0;

  const xNorm = (x + halfL) / Math.max(ctx.length, 0.1);
  const edgeFactor = Math.sqrt(((x / halfL) ** 2 + (z / halfW) ** 2) / 2);

  delta += ctx.qSolar * 0.014 * (1 - edgeFactor * 0.55);
  delta -= edgeFactor * Math.max(ctx.baseTemp - ctx.externalTemp, 0) * 0.07;

  for (const pad of ctx.layout.padWalls) {
    const padFactor = padAreaFactor(pad.widthM, pad.heightM);
    const g =
      gaussian1d(z - pad.zCenter, pad.widthM * 0.35) *
      gaussian1d(x - pad.x, ctx.length * 0.22);
    delta -= 2.8 * g * padFactor * (0.7 + pad.widthM / Math.max(ctx.width, 1));
    if (y <= pad.heightM + 0.3) {
      delta -= 1.2 * g * padFactor;
    }
  }

  for (const fan of ctx.layout.exhaustFans) {
    const scale = exhaustScale(fan.diameterM);
    const sigma = fan.diameterM * 1.4;
    delta +=
      1.4 * scale * gaussian1d(x - fan.x, sigma) * gaussian1d(z - fan.z, sigma);
  }

  for (const fan of ctx.layout.roofExhaustFans) {
    const scale =
      (fan.diameterM / Math.max(DEFAULT_CLIMATE_SIZING.roofExhaustFanDiameterM, 0.1)) ** 2;
    const sigma = fan.diameterM * 1.6;
    delta += 1.1 * scale * gaussian1d(x - fan.x, sigma) * gaussian1d(z - fan.z, sigma);
  }

  for (const fan of ctx.layout.circulationFans) {
    const scale = circulationScale(fan.diameterM);
    const sigma = fan.diameterM * 2.2;
    delta += 0.35 * scale * gaussian1d(x - fan.x, sigma) * gaussian1d(z - fan.z, sigma);
  }

  for (const vent of ctx.layout.vents) {
    const ventWidthScale = vent.widthM / Math.max(DEFAULT_CLIMATE_SIZING.roofVentWidthM, 0.1);
    const sigmaX = vent.kind === "roof" ? vent.widthM * 0.45 : 1.2 * ventWidthScale;
    const sigmaZ = vent.kind === "roof" ? ctx.structureBayWidth * 0.35 : 1.2 * ventWidthScale;
    const g = gaussian1d(x - vent.x, sigmaX) * gaussian1d(z - vent.z, sigmaZ);
    if (vent.kind === "roof") {
      delta -= 1.6 * g * ventWidthScale;
      if (y >= ctx.ridgeHeight - 0.6) {
        delta -= 0.8 * g * ventWidthScale;
      }
    } else if (vent.kind === "side") {
      delta -= 1.1 * g * ventWidthScale;
    } else {
      delta -= 0.9 * g;
    }
  }

  for (const ac of ctx.layout.acUnits) {
    const scale = acCapacityFactor(ac.widthM);
    const sigma = ac.widthM * 0.9;
    delta -= 2.5 * scale * gaussian1d(x - ac.x, sigma) * gaussian1d(z - ac.z, sigma);
  }

  for (const heater of ctx.layout.heaters) {
    const heaterScale =
      Math.min(ctx.equipment.sizing.heaterUnitCount, 6) /
      Math.max(ctx.layout.heaters.length, 1);
    delta +=
      1.8 * heaterScale * gaussian1d(x - heater.x, 2.2) * gaussian1d(z - heater.z, 2.2);
  }

  for (const fog of ctx.layout.fogLines) {
    const fogScale =
      ctx.equipment.sizing.fogLineCount / Math.max(DEFAULT_CLIMATE_SIZING.fogLineCount, 1);
    delta -= 0.9 * fogScale * gaussian1d(z - fog.z, ctx.width * 0.18);
  }

  if (ctx.equipment.cooling === "fan_and_pad") {
    const pad = ctx.layout.padWalls[0];
    const padFactor = pad
      ? padAreaFactor(pad.widthM, pad.heightM)
      : padAreaFactor(
          ctx.equipment.sizing.padWallWidthM,
          ctx.equipment.sizing.padWallHeightM,
        );
    delta -= (1 - xNorm) * 1.5 * padFactor;
  }

  return delta * (1 - ctx.mixingFactor * 0.45);
}

function rhInfluenceAt(ctx: HeatmapFieldContext, x: number, y: number, z: number): number {
  const halfL = ctx.length / 2;
  const halfW = ctx.width / 2;
  let deltaRh = 0;

  const xNorm = (x + halfL) / Math.max(ctx.length, 0.1);
  const edgeFactor = Math.sqrt(((x / halfL) ** 2 + (z / halfW) ** 2) / 2);

  deltaRh += edgeFactor * Math.max(ctx.externalTemp - ctx.baseTemp, 0) * 0.35;

  for (const pad of ctx.layout.padWalls) {
    const padFactor = padAreaFactor(pad.widthM, pad.heightM);
    const g =
      gaussian1d(z - pad.zCenter, pad.widthM * 0.35) *
      gaussian1d(x - pad.x, ctx.length * 0.22);
    deltaRh += 16 * g * padFactor;
    if (y <= pad.heightM + 0.3) {
      deltaRh += 8 * g * padFactor;
    }
  }

  for (const fan of ctx.layout.exhaustFans) {
    const scale = exhaustScale(fan.diameterM);
    const sigma = fan.diameterM * 1.4;
    deltaRh -= 4 * scale * gaussian1d(x - fan.x, sigma) * gaussian1d(z - fan.z, sigma);
  }

  for (const fan of ctx.layout.circulationFans) {
    const scale = circulationScale(fan.diameterM);
    const sigma = fan.diameterM * 2.2;
    deltaRh -= 2.5 * scale * gaussian1d(x - fan.x, sigma) * gaussian1d(z - fan.z, sigma);
  }

  for (const ac of ctx.layout.acUnits) {
    const scale = acCapacityFactor(ac.widthM);
    const sigma = ac.widthM * 0.9;
    deltaRh -= 14 * scale * gaussian1d(x - ac.x, sigma) * gaussian1d(z - ac.z, sigma);
  }

  for (const fog of ctx.layout.fogLines) {
    const fogScale =
      ctx.equipment.sizing.fogLineCount / Math.max(DEFAULT_CLIMATE_SIZING.fogLineCount, 1);
    deltaRh += 10 * fogScale * gaussian1d(z - fog.z, ctx.width * 0.18);
  }

  for (const heater of ctx.layout.heaters) {
    const heaterScale =
      Math.min(ctx.equipment.sizing.heaterUnitCount, 6) /
      Math.max(ctx.layout.heaters.length, 1);
    deltaRh -= 3 * heaterScale * gaussian1d(x - heater.x, 2.2) * gaussian1d(z - heater.z, 2.2);
  }

  if (ctx.equipment.cooling === "fan_and_pad") {
    const pad = ctx.layout.padWalls[0];
    const padFactor = pad
      ? padAreaFactor(pad.widthM, pad.heightM)
      : padAreaFactor(
          ctx.equipment.sizing.padWallWidthM,
          ctx.equipment.sizing.padWallHeightM,
        );
    deltaRh += (1 - xNorm) * 10 * padFactor;
  }

  return deltaRh * (1 - ctx.mixingFactor * 0.55);
}

function sampleAt(
  ctx: HeatmapFieldContext,
  x: number,
  y: number,
  z: number,
): { temp: number; rh: number } {
  const temp = ctx.baseTemp + tempInfluenceAt(ctx, x, y, z);
  const rh = clampRh(ctx.internalRh + rhInfluenceAt(ctx, x, y, z));
  return {
    temp: Math.round(temp * 100) / 100,
    rh: Math.round(rh * 100) / 100,
  };
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
    mixingFactor: computeMixingFactor(equipment),
  };
}

export function generateSurfaceHeatmap(
  ctx: HeatmapFieldContext,
  surface: HeatmapSurfaceKind,
): HeatmapSurfaceValues {
  const halfL = ctx.length / 2;
  const halfW = ctx.width / 2;
  const temperature: number[][] = [];
  const humidity: number[][] = [];

  if (surface === "floor") {
    const rows = gridSize(ctx.length);
    const cols = gridSize(ctx.width);
    for (let row = 0; row < rows; row++) {
      const tempRow: number[] = [];
      const rhRow: number[] = [];
      const x = -halfL + (row / Math.max(rows - 1, 1)) * ctx.length;
      for (let col = 0; col < cols; col++) {
        const z = -halfW + (col / Math.max(cols - 1, 1)) * ctx.width;
        const sample = sampleAt(ctx, x, 0.2, z);
        tempRow.push(sample.temp);
        rhRow.push(sample.rh);
      }
      temperature.push(tempRow);
      humidity.push(rhRow);
    }
    return { temperature, humidity };
  }

  if (surface === "roof") {
    const rows = gridSize(ctx.length);
    const cols = gridSize(ctx.width);
    const y = ctx.ridgeHeight - 0.15;
    for (let row = 0; row < rows; row++) {
      const tempRow: number[] = [];
      const rhRow: number[] = [];
      const x = -halfL + (row / Math.max(rows - 1, 1)) * ctx.length;
      for (let col = 0; col < cols; col++) {
        const z = -halfW + (col / Math.max(cols - 1, 1)) * ctx.width;
        const sample = sampleAt(ctx, x, y, z);
        tempRow.push(Math.round((sample.temp + ctx.qSolar * 0.022) * 100) / 100);
        rhRow.push(Math.round(Math.max(25, sample.rh - 4) * 100) / 100);
      }
      temperature.push(tempRow);
      humidity.push(rhRow);
    }
    return { temperature, humidity };
  }

  const wallRows = gridSize(
    surface === "wall_west" || surface === "wall_east" ? ctx.width : ctx.length,
  );
  const wallCols = gridSize(ctx.eaveHeight, 1);

  for (let row = 0; row < wallRows; row++) {
    const tempRow: number[] = [];
    const rhRow: number[] = [];
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

      const sample = sampleAt(ctx, x, y, z);
      let temp = sample.temp;
      let rh = sample.rh;

      if (surface === "wall_west") {
        const pad = ctx.layout.padWalls[0];
        if (pad && y <= pad.heightM + 0.2) {
          const padFactor = padAreaFactor(pad.widthM, pad.heightM);
          const g = gaussian1d(z - pad.zCenter, pad.widthM * 0.4);
          temp -= 2 * g * padFactor;
          rh += 6 * g * padFactor;
        }
      }
      if (surface === "wall_east") {
        temp += 0.8 * (y / Math.max(ctx.eaveHeight, 1));
        rh -= 1.5 * (y / Math.max(ctx.eaveHeight, 1));
      }

      tempRow.push(Math.round(temp * 100) / 100);
      rhRow.push(Math.round(clampRh(rh) * 100) / 100);
    }
    temperature.push(tempRow);
    humidity.push(rhRow);
  }

  return { temperature, humidity };
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
