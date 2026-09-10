import type { HeatmapFieldContext, HeatmapSurfaceKind } from "@/lib/equipmentAwareHeatmap";
import { computeSpatialPerturbation } from "@/lib/thermal/spatialField";
import type { HeatmapSurfaceValues } from "@/lib/heatmapData";
import {
  buildUniformityMatrix,
  buildVpdMatrix,
  HEATMAP_FIXED_SCALE,
} from "@/lib/heatmapData";

const TEMP_DISPLAY_MIN = HEATMAP_FIXED_SCALE.temperature.min;
const TEMP_DISPLAY_MAX = HEATMAP_FIXED_SCALE.temperature.max;
const FLOOR_REFERENCE_Y_M = 0.2;

function smoothstep(edge0: number, edge1: number, value: number): number {
  const t = Math.max(0, Math.min(1, (value - edge0) / Math.max(edge1 - edge0, 1e-6)));
  return t * t * (3 - 2 * t);
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

function bilinearSample(
  matrix: number[][],
  u: number,
  v: number,
): number {
  const rows = matrix.length;
  const cols = rows > 0 ? (matrix[0]?.length ?? 0) : 0;
  if (rows === 0 || cols === 0) {
    return 0;
  }

  const fu = Math.max(0, Math.min(1, u)) * (rows - 1);
  const fv = Math.max(0, Math.min(1, v)) * (cols - 1);
  const r0 = Math.floor(fu);
  const c0 = Math.floor(fv);
  const r1 = Math.min(rows - 1, r0 + 1);
  const c1 = Math.min(cols - 1, c0 + 1);
  const dr = fu - r0;
  const dc = fv - c0;

  const v00 = matrix[r0]?.[c0] ?? 0;
  const v10 = matrix[r1]?.[c0] ?? 0;
  const v01 = matrix[r0]?.[c1] ?? 0;
  const v11 = matrix[r1]?.[c1] ?? 0;

  const a = v00 + (v10 - v00) * dr;
  const b = v01 + (v11 - v01) * dr;
  return a + (b - a) * dc;
}

function floorUvAt(
  ctx: HeatmapFieldContext,
  x: number,
  z: number,
): { u: number; v: number } {
  const { halfL, halfW } = ctx.coeffs;
  return {
    u: (x + halfL) / Math.max(ctx.length, 0.1),
    v: (z + halfW) / Math.max(ctx.width, 0.1),
  };
}

function floorReferenceAt(
  floor: HeatmapSurfaceValues,
  ctx: HeatmapFieldContext,
  x: number,
  z: number,
): { temp: number; rh: number } {
  const { u, v } = floorUvAt(ctx, x, z);
  return {
    temp: bilinearSample(floor.temperature, u, v),
    rh: bilinearSample(floor.humidity, u, v),
  };
}

function floorPhysicsAt(
  ctx: HeatmapFieldContext,
  x: number,
  z: number,
): { temp: number; rh: number } {
  const { tempDelta, rhDelta } = computeSpatialPerturbation(
    ctx,
    x,
    FLOOR_REFERENCE_Y_M,
    z,
    "floor",
  );
  return {
    temp: ctx.baseTemp + tempDelta,
    rh: ctx.internalRh + rhDelta,
  };
}

function finalizeSurface(
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

function anchorWallToFloorField(
  ctx: HeatmapFieldContext,
  floor: HeatmapSurfaceValues,
  wall: HeatmapSurfaceValues,
  surface: HeatmapSurfaceKind,
): HeatmapSurfaceValues {
  const { halfL, halfW } = ctx.coeffs;
  const rows = wall.temperature.length;
  const cols = wall.temperature[0]?.length ?? 0;
  const rowDenom = Math.max(rows - 1, 1);
  const colDenom = Math.max(cols - 1, 1);
  const blendHeight = ctx.eaveHeight * 0.5;

  const temperature: number[][] = [];
  const humidity: number[][] = [];

  for (let row = 0; row < rows; row++) {
    const tempRow: number[] = [];
    const rhRow: number[] = [];
    for (let col = 0; col < cols; col++) {
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

      const floorRef = floorReferenceAt(floor, ctx, x, z);
      const floorPhysics = floorPhysicsAt(ctx, x, z);
      const wallTemp = wall.temperature[row]?.[col] ?? ctx.baseTemp;
      const wallRh = wall.humidity[row]?.[col] ?? ctx.internalRh;

      const verticalWeight = smoothstep(0, blendHeight, y);
      const tempDelta = (wallTemp - floorPhysics.temp) * verticalWeight;
      const rhDelta = (wallRh - floorPhysics.rh) * verticalWeight;

      tempRow.push(floorRef.temp + tempDelta);
      rhRow.push(floorRef.rh + rhDelta);
    }
    temperature.push(tempRow);
    humidity.push(rhRow);
  }

  return finalizeSurface(temperature, humidity);
}

export interface VisibleWallSurfaces {
  wall_west: HeatmapSurfaceValues;
  wall_east: HeatmapSurfaceValues;
  wall_north: HeatmapSurfaceValues;
  wall_south: HeatmapSurfaceValues;
}

/** Anchor long and gable walls to the conserved floor field for seamless corners. */
export function anchorWallsToFloorField(
  ctx: HeatmapFieldContext,
  floor: HeatmapSurfaceValues,
  walls: VisibleWallSurfaces,
): VisibleWallSurfaces {
  return {
    wall_west: anchorWallToFloorField(ctx, floor, walls.wall_west, "wall_west"),
    wall_east: anchorWallToFloorField(ctx, floor, walls.wall_east, "wall_east"),
    wall_north: anchorWallToFloorField(ctx, floor, walls.wall_north, "wall_north"),
    wall_south: anchorWallToFloorField(ctx, floor, walls.wall_south, "wall_south"),
  };
}
