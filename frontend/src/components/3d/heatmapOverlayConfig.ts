import type { HeatmapSurfaceKind } from "@/lib/equipmentAwareHeatmap";

/** Slight transparency so structure and equipment stay readable beneath. */
export const HEATMAP_OVERLAY_OPACITY = 0.52;

export const HEATMAP_SURFACE_RENDER_ORDER: Record<HeatmapSurfaceKind, number> = {
  floor: 30,
  canopy: 32,
  roof: 34,
  wall_west: 36,
  wall_east: 36,
  wall_north: 36,
  wall_south: 36,
};

const WALL_INSET_M = 0.07;

export function heatmapSurfaceLayout(
  surfaceKind: HeatmapSurfaceKind,
  d: { length: number; width: number; eaveHeight: number; ridgeHeight: number },
): {
  position: [number, number, number];
  rotation: [number, number, number];
  planeSize: [number, number];
} {
  const { length, width, eaveHeight, ridgeHeight } = d;
  const halfL = length / 2;
  const halfW = width / 2;

  switch (surfaceKind) {
    case "floor":
      return {
        position: [0, 0.38, 0],
        rotation: [-Math.PI / 2, 0, 0],
        planeSize: [length * 0.96, width * 0.96],
      };
    case "canopy":
      return {
        position: [0, Math.max(0.9, Math.min(eaveHeight * 0.62, ridgeHeight - 0.5)), 0],
        rotation: [-Math.PI / 2, 0, 0],
        planeSize: [length * 0.94, width * 0.94],
      };
    case "roof":
      return {
        position: [0, ridgeHeight - 0.1, 0],
        rotation: [-Math.PI / 2, 0, 0],
        planeSize: [length * 0.94, width * 0.94],
      };
    case "wall_west":
      return {
        position: [-halfL + WALL_INSET_M, eaveHeight / 2, 0],
        rotation: [0, Math.PI / 2, 0],
        planeSize: [width * 0.96, eaveHeight * 0.96],
      };
    case "wall_east":
      return {
        position: [halfL - WALL_INSET_M, eaveHeight / 2, 0],
        rotation: [0, -Math.PI / 2, 0],
        planeSize: [width * 0.96, eaveHeight * 0.96],
      };
    case "wall_north":
      return {
        position: [0, eaveHeight / 2, -halfW + WALL_INSET_M],
        rotation: [0, 0, 0],
        planeSize: [length * 0.96, eaveHeight * 0.96],
      };
    case "wall_south":
      return {
        position: [0, eaveHeight / 2, halfW - WALL_INSET_M],
        rotation: [0, Math.PI, 0],
        planeSize: [length * 0.96, eaveHeight * 0.96],
      };
    default:
      return {
        position: [0, 0.38, 0],
        rotation: [-Math.PI / 2, 0, 0],
        planeSize: [length * 0.96, width * 0.96],
      };
  }
}