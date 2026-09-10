/**
 * HAF circulation mixing — local jet corridors uniformize T/RH under each fan path.
 */

import type { HeatmapFieldContext, HeatmapSurfaceKind } from "@/lib/equipmentAwareHeatmap";
import {
  circulationFloorMotorHeatDeltaC,
  circulationJetInfluenceAt,
  resolveCirculationMixingStrength,
} from "@/lib/thermal/circulationJetField";
import type { HeatmapSurfaceValues } from "@/lib/heatmapData";
import {
  buildUniformityMatrix,
  buildVpdMatrix,
  HEATMAP_FIXED_SCALE,
} from "@/lib/heatmapData";

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

function columnMeans(grid: number[][]): number[] {
  const cols = grid[0]?.length ?? 0;
  const means: number[] = [];
  for (let col = 0; col < cols; col++) {
    let sum = 0;
    for (const row of grid) {
      sum += row[col] ?? 0;
    }
    means.push(sum / Math.max(grid.length, 1));
  }
  return means;
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

function horizontalCoords(
  ctx: HeatmapFieldContext,
  row: number,
  col: number,
  rows: number,
  cols: number,
): { x: number; z: number } {
  const { halfL, halfW } = ctx.coeffs;
  const rowDenom = Math.max(rows - 1, 1);
  const colDenom = Math.max(cols - 1, 1);
  return {
    x: -halfL + (row / rowDenom) * ctx.length,
    z: -halfW + (col / colDenom) * ctx.width,
  };
}

/**
 * Flatten pad→exhaust gradient along each HAF jet corridor (constant-Z bands),
 * then add localized motor heat hubs that remain visible after conservation.
 */
function mixGridAlongHafJets(
  grid: number[][],
  ctx: HeatmapFieldContext,
  surfaceKind: HeatmapSurfaceKind,
): number[][] {
  const baseStrength = resolveCirculationMixingStrength(ctx);
  if (baseStrength <= 0.02) {
    return grid;
  }

  const isHorizontal = surfaceKind === "floor" || surfaceKind === "roof";
  if (!isHorizontal) {
    return grid;
  }

  const originalMean = matrixMean(grid);
  const rows = grid.length;
  const cols = grid[0]?.length ?? 0;
  const colAvgs = columnMeans(grid);

  const mixed = grid.map((row, rowIndex) =>
    row.map((value, colIndex) => {
      const { x, z } = horizontalCoords(ctx, rowIndex, colIndex, rows, cols);
      const jet = circulationJetInfluenceAt(ctx, x, z);
      const localStrength = baseStrength * jet.mixWeight;
      if (localStrength < 0.025) {
        return value;
      }

      const colAvg = colAvgs[colIndex] ?? value;
      return value + (colAvg - value) * Math.min(0.98, localStrength * 1.05);
    }),
  );

  const meanShift = originalMean - matrixMean(mixed);
  const conserved = mixed.map((row) => row.map((value) => value + meanShift));

  return conserved.map((row, rowIndex) =>
    row.map((value, colIndex) => {
      const { x, z } = horizontalCoords(ctx, rowIndex, colIndex, rows, cols);
      const jet = circulationJetInfluenceAt(ctx, x, z);
      const motorDelta = circulationFloorMotorHeatDeltaC(ctx, jet);
      if (motorDelta <= 0) {
        return value;
      }
      const localStrength = baseStrength * jet.mixWeight;
      return value + motorDelta * Math.min(1, localStrength + 0.25);
    }),
  );
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

/** Apply local HAF jet mixing on floor/roof heatmap grids. */
export function applyCirculationMixingToSurface(
  ctx: HeatmapFieldContext,
  surface: HeatmapSurfaceValues,
  surfaceKind: HeatmapSurfaceKind,
): HeatmapSurfaceValues {
  if (ctx.equipment.sizing.circulationFanCount <= 0) {
    return surface;
  }

  const temperature = mixGridAlongHafJets(surface.temperature, ctx, surfaceKind);
  const humidity = mixGridAlongHafJets(surface.humidity, ctx, surfaceKind);

  return finalizeMixedSurface(temperature, humidity);
}

export { resolveCirculationMixingStrength };
