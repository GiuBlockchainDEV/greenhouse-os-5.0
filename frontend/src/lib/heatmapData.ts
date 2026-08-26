import type { WSSimulationResults } from "@/types/simulation";

export type SimulationData = WSSimulationResults["data"];

export type HeatmapValueMode = "temperature" | "vpd";

const SATURATION_VPOR_PRESSURE = (tempC: number): number =>
  0.6108 * Math.exp((17.27 * tempC) / (tempC + 237.3));

export function matrixValueAt(
  matrix: number[][],
  mode: HeatmapValueMode,
  internalRh: number,
  row: number,
  col: number,
): number {
  const temp = matrix[row]?.[col] ?? 25;
  if (mode === "vpd") {
    const es = SATURATION_VPOR_PRESSURE(temp);
    const ea = es * (internalRh / 100);
    return Math.max(0, es - ea);
  }
  return temp;
}

export function computeHeatmapStats(
  matrix: number[][],
  mode: HeatmapValueMode,
  internalRh: number,
): { min: number; max: number; unit: string } {
  const rows = matrix.length;
  const cols = rows > 0 ? (matrix[0]?.length ?? 0) : 0;
  const values: number[] = [];

  for (let row = 0; row < rows; row++) {
    for (let col = 0; col < cols; col++) {
      values.push(matrixValueAt(matrix, mode, internalRh, row, col));
    }
  }

  if (values.length === 0) {
    return { min: 20, max: 30, unit: mode === "vpd" ? "kPa" : "°C" };
  }

  let min = Math.min(...values);
  let max = Math.max(...values);
  const spread = max - min;
  const minSpread = mode === "vpd" ? 0.25 : 1.2;

  if (spread < minSpread) {
    const mid = (min + max) / 2;
    min = mid - minSpread / 2;
    max = mid + minSpread / 2;
  }

  return {
    min,
    max,
    unit: mode === "vpd" ? "kPa" : "°C",
  };
}
