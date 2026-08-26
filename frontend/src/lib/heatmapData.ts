import type { WSSimulationResults } from "@/types/simulation";

export type SimulationData = WSSimulationResults["data"];

export type HeatmapValueMode = "temperature" | "humidity" | "vpd" | "uniformity";

export function heatmapColorMode(mode: HeatmapValueMode): number {
  switch (mode) {
    case "humidity":
      return 1;
    case "vpd":
      return 2;
    case "uniformity":
      return 3;
    default:
      return 0;
  }
}

export interface HeatmapClimatePreview {
  internalTemp: number;
  externalTemp: number;
  internalRh: number;
  vpdKpa: number;
}

export interface HeatmapSurfaceValues {
  temperature: number[][];
  humidity: number[][];
  vpd: number[][];
  uniformity: number[][];
}

const SATURATION_VPOR_PRESSURE = (tempC: number): number =>
  0.6108 * Math.exp((17.27 * tempC) / (tempC + 237.3));

export function vpdKpaAt(tempC: number, rhPct: number): number {
  const es = SATURATION_VPOR_PRESSURE(tempC);
  return Math.max(0, es - es * (rhPct / 100));
}

function matrixMean(matrix: number[][]): number {
  let sum = 0;
  let count = 0;
  for (const row of matrix) {
    for (const value of row) {
      sum += value;
      count += 1;
    }
  }
  return count > 0 ? sum / count : 0;
}

const TEMP_UNIFORMITY_REF_C = 6;
const RH_UNIFORMITY_REF_PCT = 18;

export function buildVpdMatrix(temperature: number[][], humidity: number[][]): number[][] {
  return temperature.map((row, rowIndex) =>
    row.map((temp, colIndex) => {
      const rh = humidity[rowIndex]?.[colIndex] ?? 50;
      return Math.round(vpdKpaAt(temp, rh) * 1000) / 1000;
    }),
  );
}

export function buildUniformityMatrix(
  temperature: number[][],
  humidity: number[][],
): number[][] {
  const tempMean = matrixMean(temperature);
  const rhMean = matrixMean(humidity);
  return temperature.map((row, rowIndex) =>
    row.map((localTemp, colIndex) => {
      const localRh = humidity[rowIndex]?.[colIndex] ?? rhMean;
      const tempNorm = Math.min(Math.abs(localTemp - tempMean) / TEMP_UNIFORMITY_REF_C, 1);
      const rhNorm = Math.min(Math.abs(localRh - rhMean) / RH_UNIFORMITY_REF_PCT, 1);
      return Math.round(Math.max(0, Math.min(100, 100 * (1 - (tempNorm * 0.65 + rhNorm * 0.35)))) * 100) / 100;
    }),
  );
}

/** 0-100 score: 100 = at greenhouse average, lower = more local deviation. */
export function computeUniformityAt(
  temperature: number[][],
  humidity: number[][],
  row: number,
  col: number,
  tempMean = matrixMean(temperature),
  rhMean = matrixMean(humidity),
): number {
  const localTemp = temperature[row]?.[col] ?? tempMean;
  const localRh = humidity[row]?.[col] ?? rhMean;

  const tempNorm = Math.min(Math.abs(localTemp - tempMean) / TEMP_UNIFORMITY_REF_C, 1);
  const rhNorm = Math.min(Math.abs(localRh - rhMean) / RH_UNIFORMITY_REF_PCT, 1);

  return Math.max(0, Math.min(100, 100 * (1 - (tempNorm * 0.65 + rhNorm * 0.35))));
}

export function matrixValueAt(
  surface: HeatmapSurfaceValues,
  mode: HeatmapValueMode,
  internalRh: number,
  row: number,
  col: number,
): number {
  if (mode === "humidity") {
    return surface.humidity[row]?.[col] ?? internalRh;
  }

  if (mode === "vpd") {
    return surface.vpd[row]?.[col] ?? 0;
  }

  if (mode === "uniformity") {
    return surface.uniformity[row]?.[col] ?? 100;
  }

  return surface.temperature[row]?.[col] ?? 25;
}

export function computeHeatmapStats(
  surface: HeatmapSurfaceValues,
  mode: HeatmapValueMode,
  internalRh: number,
): { min: number; max: number; unit: string } {
  const rows = surface.temperature.length;
  const cols = rows > 0 ? (surface.temperature[0]?.length ?? 0) : 0;
  const values: number[] = [];

  for (let row = 0; row < rows; row++) {
    for (let col = 0; col < cols; col++) {
      values.push(matrixValueAt(surface, mode, internalRh, row, col));
    }
  }

  if (values.length === 0) {
    return {
      min: mode === "humidity" ? 50 : mode === "uniformity" ? 0 : mode === "vpd" ? 0.5 : 20,
      max: mode === "humidity" ? 80 : mode === "uniformity" ? 100 : mode === "vpd" ? 1.5 : 30,
      unit: mode === "humidity" ? "%" : mode === "uniformity" ? "%" : mode === "vpd" ? "kPa" : "°C",
    };
  }

  let min = Math.min(...values);
  let max = Math.max(...values);
  const spread = max - min;
  const minSpread =
    mode === "vpd" ? 0.25 : mode === "humidity" ? 5 : mode === "uniformity" ? 12 : 1.2;

  if (spread < minSpread) {
    const mid = (min + max) / 2;
    min = mid - minSpread / 2;
    max = mid + minSpread / 2;
  }

  return {
    min,
    max,
    unit:
      mode === "humidity" ? "%" : mode === "uniformity" ? "%" : mode === "vpd" ? "kPa" : "°C",
  };
}

export interface HeatmapScale {
  min: number;
  max: number;
  unit: string;
}

/** Fixed absolute color scales for heatmap visualization. */
export const HEATMAP_FIXED_SCALE: Record<HeatmapValueMode, HeatmapScale> = {
  temperature: { min: 0, max: 50, unit: "°C" },
  humidity: { min: 0, max: 100, unit: "%" },
  vpd: { min: 0, max: 10, unit: "kPa" },
  uniformity: { min: 0, max: 100, unit: "%" },
};

export function computeHeatmapDisplayRange(mode: HeatmapValueMode): HeatmapScale {
  return HEATMAP_FIXED_SCALE[mode];
}

const MIN_VISUAL_SPAN: Record<HeatmapValueMode, number> = {
  temperature: 14,
  humidity: 22,
  vpd: 0.9,
  uniformity: 28,
};

function surfaceValueBounds(
  surface: HeatmapSurfaceValues,
  mode: HeatmapValueMode,
  preview: HeatmapClimatePreview,
): { min: number; max: number } {
  const rows = surface.temperature.length;
  const cols = rows > 0 ? (surface.temperature[0]?.length ?? 0) : 0;
  if (rows === 0 || cols === 0) {
    if (mode === "humidity") return { min: preview.internalRh - 5, max: preview.internalRh + 5 };
    if (mode === "vpd") return { min: 0.2, max: 1.2 };
    if (mode === "uniformity") return { min: 40, max: 100 };
    return { min: preview.internalTemp - 4, max: preview.internalTemp + 4 };
  }

  let min = Infinity;
  let max = -Infinity;
  for (let row = 0; row < rows; row++) {
    for (let col = 0; col < cols; col++) {
      const value = matrixValueAt(surface, mode, preview.internalRh, row, col);
      min = Math.min(min, value);
      max = Math.max(max, value);
    }
  }
  return { min, max };
}

/** Color range from actual field spread, clamped to absolute scale (0–50°C etc.). */
export function computeHeatmapVisualRange(
  surface: HeatmapSurfaceValues,
  mode: HeatmapValueMode,
  preview: HeatmapClimatePreview,
): HeatmapScale {
  const absolute = HEATMAP_FIXED_SCALE[mode];
  const minSpan = MIN_VISUAL_SPAN[mode];
  const { min: dataMin, max: dataMax } = surfaceValueBounds(surface, mode, preview);

  let min = dataMin;
  let max = dataMax;

  if (mode === "temperature") {
    min = Math.min(min, preview.internalTemp - minSpan / 2);
    max = Math.max(max, preview.internalTemp + minSpan / 2);
  } else if (mode === "humidity") {
    min = Math.min(min, preview.internalRh - minSpan / 2);
    max = Math.max(max, preview.internalRh + minSpan / 2);
  }

  if (max - min < minSpan) {
    const mid = (min + max) / 2;
    min = mid - minSpan / 2;
    max = mid + minSpan / 2;
  }

  return {
    min: Math.max(absolute.min, min),
    max: Math.min(absolute.max, max),
    unit: absolute.unit,
  };
}
