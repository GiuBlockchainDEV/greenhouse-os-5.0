/**
 * HAF circulation mixing — uniformizes local T/RH without outdoor air exchange.
 * Preserves pad→exhaust along-length gradients on floor and long walls.
 */

import type { HeatmapFieldContext, HeatmapSurfaceKind } from "@/lib/equipmentAwareHeatmap";
import type { HeatmapSurfaceValues } from "@/lib/heatmapData";
import {
  buildUniformityMatrix,
  buildVpdMatrix,
  HEATMAP_FIXED_SCALE,
} from "@/lib/heatmapData";
import { circulationCapacityFactor } from "@/lib/climateEquipmentCapacity";

const TEMP_DISPLAY_MIN = HEATMAP_FIXED_SCALE.temperature.min;
const TEMP_DISPLAY_MAX = HEATMAP_FIXED_SCALE.temperature.max;

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

function rowMean(row: number[]): number {
  if (row.length === 0) return 0;
  return row.reduce((acc, value) => acc + value, 0) / row.length;
}

function clampTemp(value: number): number {
  return Math.max(TEMP_DISPLAY_MIN, Math.min(TEMP_DISPLAY_MAX, value));
}

function clampRh(value: number): number {
  return Math.max(
    HEATMAP_FIXED_SCALE.humidity.min,
    Math.min(HEATMAP_FIXED_SCALE.humidity.max, value),
  );
}

function linearTrendAt(rowMeans: number[], rowIndex: number): number {
  const n = rowMeans.length;
  if (n <= 1) {
    return rowMeans[0] ?? 0;
  }

  let sumR = 0;
  let sumM = 0;
  let sumRm = 0;
  let sumR2 = 0;
  for (let r = 0; r < n; r++) {
    const mean = rowMeans[r] ?? 0;
    sumR += r;
    sumM += mean;
    sumRm += r * mean;
    sumR2 += r * r;
  }

  const denom = n * sumR2 - sumR * sumR;
  const slope = denom !== 0 ? (n * sumRm - sumR * sumM) / denom : 0;
  const intercept = (sumM - slope * sumR) / n;
  return intercept + slope * rowIndex;
}

function renormalizeToMean(grid: number[][], targetMean: number): number[][] {
  const shift = targetMean - matrixMean(grid);
  return grid.map((row) => row.map((value) => value + shift));
}

/** Mixing strength 0–1 from HAF count, rated flow, and solver mixing coefficient. */
export function resolveCirculationMixingStrength(ctx: HeatmapFieldContext): number {
  if (ctx.equipment.sizing.circulationFanCount <= 0) {
    return 0;
  }

  const capacity = circulationCapacityFactor(ctx.equipment.sizing);
  return Math.min(0.96, ctx.mixingEffectiveness * (0.72 + capacity * 0.22));
}

function usesLengthRowAxis(surfaceKind: HeatmapSurfaceKind): boolean {
  return surfaceKind === "floor" || surfaceKind === "wall_north" || surfaceKind === "wall_south";
}

function mixGridWithHaf(
  grid: number[][],
  strength: number,
  surfaceKind: HeatmapSurfaceKind,
): number[][] {
  const targetMean = matrixMean(grid);
  const rowMeans = grid.map(rowMean);
  const preserveLengthTrend = usesLengthRowAxis(surfaceKind);

  const mixed = grid.map((row, rowIndex) => {
    const rowAvg = rowMeans[rowIndex] ?? targetMean;
    const trend = preserveLengthTrend ? linearTrendAt(rowMeans, rowIndex) : rowAvg;

    return row.map((value) => {
      let blended = value + (rowAvg - value) * Math.min(0.98, strength * 0.96);
      const micro = blended - trend;
      blended = trend + micro * (1 - strength * (preserveLengthTrend ? 0.62 : 0.82));
      return blended;
    });
  });

  return renormalizeToMean(mixed, targetMean);
}

function finalizeMixedSurface(
  temperature: number[][],
  humidity: number[][],
): HeatmapSurfaceValues {
  const clampedTemp: number[][] = [];
  const clampedRh: number[][] = [];

  for (let row = 0; row < temperature.length; row++) {
    const tempRow: number[] = [];
    const rhRow: number[] = [];
    for (let col = 0; col < (temperature[row]?.length ?? 0); col++) {
      tempRow.push(Math.round(clampTemp(temperature[row]?.[col] ?? TEMP_DISPLAY_MIN) * 100) / 100);
      rhRow.push(Math.round(clampRh(humidity[row]?.[col] ?? 0) * 100) / 100);
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

/** Apply energy-conserving HAF mixing to a heatmap surface grid. */
export function applyCirculationMixingToSurface(
  ctx: HeatmapFieldContext,
  surface: HeatmapSurfaceValues,
  surfaceKind: HeatmapSurfaceKind,
): HeatmapSurfaceValues {
  const strength = resolveCirculationMixingStrength(ctx);
  if (strength <= 0.02) {
    return surface;
  }

  const temperature = mixGridWithHaf(surface.temperature, strength, surfaceKind);
  const humidity = mixGridWithHaf(surface.humidity, strength * 0.94, surfaceKind);

  return finalizeMixedSurface(temperature, humidity);
}
