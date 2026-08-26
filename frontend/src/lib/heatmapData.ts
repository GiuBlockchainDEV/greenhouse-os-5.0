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
}

const SATURATION_VPOR_PRESSURE = (tempC: number): number =>
  0.6108 * Math.exp((17.27 * tempC) / (tempC + 237.3));

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

function matrixMaxDeviation(matrix: number[][], mean: number): number {
  let maxDev = 0;
  for (const row of matrix) {
    for (const value of row) {
      maxDev = Math.max(maxDev, Math.abs(value - mean));
    }
  }
  return maxDev;
}

export function computeUniformityAt(
  temperature: number[][],
  humidity: number[][],
  row: number,
  col: number,
): number {
  const tempMean = matrixMean(temperature);
  const rhMean = matrixMean(humidity);
  const tempDev = matrixMaxDeviation(temperature, tempMean);
  const rhDev = matrixMaxDeviation(humidity, rhMean);

  const localTemp = temperature[row]?.[col] ?? tempMean;
  const localRh = humidity[row]?.[col] ?? rhMean;

  const tempScore =
    tempDev > 0.01 ? 100 * (1 - Math.abs(localTemp - tempMean) / tempDev) : 100;
  const rhScore = rhDev > 0.01 ? 100 * (1 - Math.abs(localRh - rhMean) / rhDev) : 100;

  return Math.max(0, Math.min(100, (tempScore + rhScore) / 2));
}

export function matrixValueAt(
  surface: HeatmapSurfaceValues,
  mode: HeatmapValueMode,
  internalRh: number,
  row: number,
  col: number,
): number {
  const temp = surface.temperature[row]?.[col] ?? 25;
  const rh = surface.humidity[row]?.[col] ?? internalRh;

  if (mode === "humidity") {
    return rh;
  }

  if (mode === "vpd") {
    const es = SATURATION_VPOR_PRESSURE(temp);
    const ea = es * (rh / 100);
    return Math.max(0, es - ea);
  }

  if (mode === "uniformity") {
    return computeUniformityAt(surface.temperature, surface.humidity, row, col);
  }

  return temp;
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
  temperature: { min: 0, max: 60, unit: "°C" },
  humidity: { min: 0, max: 100, unit: "%" },
  vpd: { min: 0, max: 10, unit: "kPa" },
  uniformity: { min: 0, max: 100, unit: "%" },
};

export function computeHeatmapDisplayRange(mode: HeatmapValueMode): HeatmapScale {
  return HEATMAP_FIXED_SCALE[mode];
}
