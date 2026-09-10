/**
 * HAF circulation mixing — uniformizes local T/RH without outdoor air exchange.
 * Preserves pad→exhaust along-length gradients; dampens cross-width and vertical spread.
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

function resolveMixingStrength(ctx: HeatmapFieldContext): number {
  if (ctx.equipment.sizing.circulationFanCount <= 0) {
    return 0;
  }
  const capacity = circulationCapacityFactor(ctx.equipment.sizing);
  return Math.min(0.88, ctx.mixingEffectiveness * (0.55 + capacity * 0.2));
}

function mixRowsTowardRowMean(
  grid: number[][],
  strength: number,
): number[][] {
  const targetMean = matrixMean(grid);
  const mixed = grid.map((row) => {
    const mean = rowMean(row);
    const factor = Math.min(0.9, strength);
    return row.map((value) => value + (mean - value) * factor);
  });

  const shift = targetMean - matrixMean(mixed);
  return mixed.map((row) => row.map((value) => value + shift));
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
  _surfaceKind: HeatmapSurfaceKind,
): HeatmapSurfaceValues {
  const strength = resolveMixingStrength(ctx);
  if (strength <= 0.02) {
    return surface;
  }

  const temperature = mixRowsTowardRowMean(surface.temperature, strength);
  const humidity = mixRowsTowardRowMean(surface.humidity, strength * 0.92);

  return finalizeMixedSurface(temperature, humidity);
}

