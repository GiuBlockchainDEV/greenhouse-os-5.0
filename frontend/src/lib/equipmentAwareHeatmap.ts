import { computeCultivationLayout } from "@/lib/cultivationLayout";
import {
  computeClimateEquipmentLayout,
  DEFAULT_CLIMATE_SIZING,
  type ClimateEquipmentLayout,
  type PadWallPlacement,
} from "@/lib/climateEquipmentLayout";
import {
  acCapacityFactor as acCapacityFromSizing,
  circulationCapacityFactor,
  exhaustCapacityFactor,
  fogCapacityFactor,
  heaterCapacityFactor,
  padCapacityFactor as padCapacityFromSizing,
  ventCapacityFactor,
} from "@/lib/climateEquipmentCapacity";
import {
  buildSolarFieldContext,
  solarTempDeltaFromContext,
  type SolarFieldContext,
} from "@/lib/solarIrradiance";
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
  coeffs: HeatmapCoeffs;
  solar: SolarFieldContext;
  scenario: ClimateScenario;
}

interface HeatmapCoeffs {
  halfL: number;
  halfW: number;
  invLength: number;
  invHalfL: number;
  invHalfW: number;
  spatialRetention: number;
  warmExcess: number;
  ventTempCoeff: number;
  rhEdgeExchange: number;
  rhWarmDryCoeff: number;
  exhaustFlow: number;
  exhaustCapacity: number;
  circulationCapacity: number;
  ventCapacity: number;
  acCapacity: number;
  padFactor: number;
  fanAndPad: boolean;
  fanAndPadTempWest: number;
  fanAndPadTempEastWarm: number;
  fanAndPadRhWest: number;
  fanAndPadRhEastDry: number;
  heaterShare: number;
  fogScale: number;
}

const TEMP_DISPLAY_MIN = HEATMAP_FIXED_SCALE.temperature.min;
const TEMP_DISPLAY_MAX = HEATMAP_FIXED_SCALE.temperature.max;
const GRID_STEP_M = 1.25;
const GRID_MIN = 8;
const GRID_MAX = 24;
const MAX_LOCAL_TEMP_DELTA_C = 18;
const MAX_LOCAL_RH_DELTA_PCT = 35;

function gaussian1d(dist: number, sigma: number): number {
  if (sigma <= 0) return 0;
  return Math.exp(-(dist * dist) / (2 * sigma * sigma));
}

function gridSize(span: number): number {
  return Math.min(GRID_MAX, Math.max(GRID_MIN, Math.round(span / GRID_STEP_M)));
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

function computeMixingFactor(equipment: ClimateEquipment, scenario: ClimateScenario): number {
  const exhaust = exhaustCapacityFactor(equipment.sizing);
  const circulation = circulationCapacityFactor(equipment.sizing);
  const windMix = scenario.windSpeedMS * 0.02;
  return Math.min(0.78, circulation * 0.09 + exhaust * 0.07 + windMix);
}

function exhaustFlowSum(layout: ClimateEquipmentLayout): number {
  let flow = 0;
  for (const fan of layout.exhaustFans) {
    flow += exhaustScale(fan.diameterM);
  }
  for (const fan of layout.roofExhaustFans) {
    flow +=
      (fan.diameterM / Math.max(DEFAULT_CLIMATE_SIZING.roofExhaustFanDiameterM, 0.1)) ** 2;
  }
  return flow;
}

function resolvePadFactor(ctx: Pick<HeatmapFieldContext, "layout" | "equipment">): number {
  const pad = ctx.layout.padWalls[0];
  if (pad) {
    return padAreaFactor(pad.widthM, pad.heightM);
  }
  return padCapacityFromSizing(ctx.equipment.sizing);
}

function buildHeatmapCoeffs(
  ctx: Omit<HeatmapFieldContext, "coeffs" | "solar">,
): HeatmapCoeffs {
  const halfL = ctx.length / 2;
  const halfW = ctx.width / 2;
  const warmExcess = Math.max(ctx.baseTemp - ctx.externalTemp, 0);
  const mixingFactor = computeMixingFactor(ctx.equipment, ctx.scenario);
  const spatialRetention = 1 - mixingFactor * 0.05;
  const padFactor = resolvePadFactor(ctx);
  const sizing = ctx.equipment.sizing;
  const exhaustCapacity = exhaustCapacityFactor(sizing);
  const circulationCapacity = circulationCapacityFactor(sizing);
  const ventCapacity = ventCapacityFactor(sizing);
  const acCapacity = acCapacityFromSizing(sizing);
  const exhaustFlow = exhaustFlowSum(ctx.layout);
  const fanAndPad = ctx.equipment.cooling === "fan_and_pad";
  const padSystem = fanAndPad ? padFactor * (0.55 + exhaustCapacity * 0.65) : padFactor;

  return {
    halfL,
    halfW,
    invLength: 1 / Math.max(ctx.length, 0.1),
    invHalfL: 1 / Math.max(halfL, 0.1),
    invHalfW: 1 / Math.max(halfW, 0.1),
    spatialRetention,
    warmExcess,
    ventTempCoeff: (0.16 + ctx.scenario.windSpeedMS * 0.012) * (0.7 + ventCapacity * 0.45),
    rhEdgeExchange: 0.22,
    rhWarmDryCoeff: 0.35,
    exhaustFlow,
    exhaustCapacity,
    circulationCapacity,
    ventCapacity,
    acCapacity,
    padFactor,
    fanAndPad,
    fanAndPadTempWest: fanAndPad ? 7 * padSystem : 0,
    fanAndPadTempEastWarm: fanAndPad ? 5.5 * padSystem * (0.75 + exhaustCapacity * 0.35) : 0,
    fanAndPadRhWest: fanAndPad ? 18 * padSystem : 0,
    fanAndPadRhEastDry: fanAndPad ? 14 * exhaustCapacity * padFactor : 0,
    heaterShare:
      ctx.layout.heaters.length > 0
        ? heaterCapacityFactor(sizing) / ctx.layout.heaters.length
        : 0,
    fogScale: fogCapacityFactor(sizing),
  };
}

function padPlumeStrength(
  ctx: HeatmapFieldContext,
  x: number,
  y: number,
  z: number,
  pad: PadWallPlacement,
): number {
  const depthIntoHouse = Math.max(0, x + ctx.coeffs.halfL);
  const alongPad = gaussian1d(z - pad.zCenter, pad.widthM * 0.42);
  const depth = gaussian1d(depthIntoHouse, ctx.length * 0.18);
  const vertical =
    y <= pad.heightM + 0.45
      ? 1
      : Math.exp(-Math.max(0, y - pad.heightM - 0.45) * 1.1);
  return depth * alongPad * vertical;
}

function edgeFactorAt(coeffs: HeatmapCoeffs, x: number, z: number): number {
  return Math.min(
    1,
    Math.sqrt(((x * coeffs.invHalfL) ** 2 + (z * coeffs.invHalfW) ** 2) / 2),
  );
}

function clampLocalTempDelta(delta: number): number {
  return Math.max(-MAX_LOCAL_TEMP_DELTA_C, Math.min(MAX_LOCAL_TEMP_DELTA_C, delta));
}

function clampLocalRhDelta(delta: number): number {
  return Math.max(-MAX_LOCAL_RH_DELTA_PCT, Math.min(MAX_LOCAL_RH_DELTA_PCT, delta));
}

/** Single-pass local microclimate perturbation (temp °C + RH % deltas). */
function influenceAt(
  ctx: HeatmapFieldContext,
  x: number,
  y: number,
  z: number,
): { tempDelta: number; rhDelta: number } {
  const { coeffs, solar } = ctx;
  const xNorm = (x + coeffs.halfL) * coeffs.invLength;
  const edge = edgeFactorAt(coeffs, x, z);

  const solarDelta = solarTempDeltaFromContext(solar, x, y, z);

  let tempDelta = solarDelta * 0.75;
  let rhDelta = -solarDelta * 0.22;

  tempDelta -= edge * coeffs.warmExcess * coeffs.ventTempCoeff;
  rhDelta += edge * (ctx.scenario.externalRhPct - ctx.internalRh) * coeffs.rhEdgeExchange;
  rhDelta -= edge * coeffs.warmExcess * coeffs.rhWarmDryCoeff;

  for (const pad of ctx.layout.padWalls) {
    const plume = padPlumeStrength(ctx, x, y, z, pad) * padAreaFactor(pad.widthM, pad.heightM);
    tempDelta -= 12 * plume;
    rhDelta += 28 * plume;
    if (y <= pad.heightM + 0.35) {
      tempDelta -= 4 * plume;
      rhDelta += 12 * plume;
    }
  }

  for (const fan of ctx.layout.exhaustFans) {
    const scale = exhaustScale(fan.diameterM) * coeffs.exhaustCapacity;
    const sigma = fan.diameterM * 1.2;
    const g = gaussian1d(x - fan.x, sigma) * gaussian1d(z - fan.z, sigma);
    tempDelta -= 3.5 * scale * g;
    rhDelta -= 8 * scale * g;
  }

  for (const fan of ctx.layout.roofExhaustFans) {
    const scale =
      (fan.diameterM / Math.max(DEFAULT_CLIMATE_SIZING.roofExhaustFanDiameterM, 0.1)) ** 2;
    const sigma = fan.diameterM * 1.4;
    tempDelta -= 2.8 * scale * gaussian1d(x - fan.x, sigma) * gaussian1d(z - fan.z, sigma);
  }

  for (const fan of ctx.layout.circulationFans) {
    const scale = circulationScale(fan.diameterM) * coeffs.circulationCapacity;
    const sigma = fan.diameterM * 1.8;
    const g = gaussian1d(x - fan.x, sigma) * gaussian1d(z - fan.z, sigma);
    tempDelta -= 1.2 * scale * g;
    rhDelta -= 2.5 * scale * g;
  }

  for (const vent of ctx.layout.vents) {
    const ventWidthScale = vent.widthM / Math.max(DEFAULT_CLIMATE_SIZING.roofVentWidthM, 0.1);
    const sigmaX = vent.kind === "roof" ? vent.widthM * 0.45 : 1.2 * ventWidthScale;
    const sigmaZ = vent.kind === "roof" ? ctx.structureBayWidth * 0.35 : 1.2 * ventWidthScale;
    const g = gaussian1d(x - vent.x, sigmaX) * gaussian1d(z - vent.z, sigmaZ);
    const strength = (vent.kind === "roof" ? 1.4 : vent.kind === "side" ? 1.0 : 0.8) * coeffs.ventCapacity;
    tempDelta -= strength * g * ventWidthScale;
    if (vent.kind === "roof" && y >= ctx.ridgeHeight - 0.6) {
      tempDelta -= 0.7 * g * ventWidthScale * coeffs.ventCapacity;
    }
  }

  for (const ac of ctx.layout.acUnits) {
    const scale = acCapacityFactor(ac.widthM) * coeffs.acCapacity;
    const sigma = ac.widthM * 0.9;
    const g = gaussian1d(x - ac.x, sigma) * gaussian1d(z - ac.z, sigma);
    tempDelta -= 2.8 * scale * g;
    rhDelta -= 12 * scale * g;
  }

  if (coeffs.heaterShare > 0) {
    for (const heater of ctx.layout.heaters) {
      const g = gaussian1d(x - heater.x, 2.2) * gaussian1d(z - heater.z, 2.2);
      tempDelta += 2.2 * coeffs.heaterShare * g;
      rhDelta -= 3 * coeffs.heaterShare * g;
    }
  }

  if (coeffs.fogScale > 0) {
    for (const fog of ctx.layout.fogLines) {
      const g = gaussian1d(z - fog.z, ctx.width * 0.18);
      tempDelta -= 1.1 * coeffs.fogScale * g;
      rhDelta += 10 * coeffs.fogScale * g;
    }
  }

  if (coeffs.fanAndPad) {
    // Pad wall: cool humid air in; exhaust side: warmer drier air after crop transit.
    tempDelta -= (1 - xNorm) * coeffs.fanAndPadTempWest;
    tempDelta += xNorm ** 1.35 * coeffs.fanAndPadTempEastWarm;
    rhDelta += (1 - xNorm) * coeffs.fanAndPadRhWest;
    rhDelta -= xNorm ** 1.25 * coeffs.fanAndPadRhEastDry;
  }

  tempDelta += (y / Math.max(ctx.eaveHeight, 1)) * 0.35;

  const retention = coeffs.spatialRetention;
  return {
    tempDelta: clampLocalTempDelta(tempDelta * retention),
    rhDelta: clampLocalRhDelta(rhDelta * retention),
  };
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
      const { tempDelta, rhDelta } = influenceAt(ctx, x, y, z);
      tempRow.push(Math.round((ctx.baseTemp + tempDelta) * 100) / 100);
      rhRow.push(Math.round((ctx.internalRh + rhDelta) * 100) / 100);
    }
    temperature.push(tempRow);
    humidity.push(rhRow);
  }

  return finalizeSurfaceValues(temperature, humidity);
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

  const baseCtx = {
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
  };

  return {
    ...baseCtx,
    coeffs: buildHeatmapCoeffs(baseCtx),
    solar: buildSolarFieldContext(
      scenario,
      qSolar,
      dimensions.length,
      dimensions.width,
      dimensions.eaveHeight,
    ),
  };
}

export function generateSurfaceHeatmap(
  ctx: HeatmapFieldContext,
  surface: HeatmapSurfaceKind,
): HeatmapSurfaceValues {
  const { halfL, halfW } = ctx.coeffs;

  if (surface === "floor") {
    return fillHorizontalGrid(ctx, gridSize(ctx.length), gridSize(ctx.width), 0.2);
  }

  if (surface === "roof") {
    return fillHorizontalGrid(
      ctx,
      gridSize(ctx.length),
      gridSize(ctx.width),
      ctx.ridgeHeight - 0.15,
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
  const pad = ctx.layout.padWalls[0];
  const padFactor = pad ? padAreaFactor(pad.widthM, pad.heightM) : 0;

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

      const { tempDelta, rhDelta } = influenceAt(ctx, x, y, z);
      let temp = ctx.baseTemp + tempDelta;
      let rh = ctx.internalRh + rhDelta;

      if (surface === "wall_west" && pad && y <= pad.heightM + 0.2) {
        const g = gaussian1d(z - pad.zCenter, pad.widthM * 0.4);
        temp -= 3.5 * g * padFactor;
        rh += 12 * g * padFactor;
      }
      if (surface === "wall_east") {
        const heightNorm = y / Math.max(ctx.eaveHeight, 1);
        temp -= 0.4 * heightNorm;
        rh -= 1 * heightNorm;
      }

      tempRow.push(Math.round(temp * 100) / 100);
      rhRow.push(Math.round(rh * 100) / 100);
    }
    temperature.push(tempRow);
    humidity.push(rhRow);
  }

  return finalizeSurfaceValues(temperature, humidity);
}

export function generateVisibleSurfaceHeatmaps(
  ctx: HeatmapFieldContext,
): Record<(typeof VISIBLE_HEATMAP_SURFACE_KINDS)[number], HeatmapSurfaceValues> {
  return Object.fromEntries(
    VISIBLE_HEATMAP_SURFACE_KINDS.map((kind) => [kind, generateSurfaceHeatmap(ctx, kind)]),
  ) as Record<(typeof VISIBLE_HEATMAP_SURFACE_KINDS)[number], HeatmapSurfaceValues>;
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
