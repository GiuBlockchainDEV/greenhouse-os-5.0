import type { HeatmapSurfaceKind } from "@/lib/equipmentAwareHeatmap";

export interface HeatmapTextureRemap {
  flipRow: boolean;
  flipCol: boolean;
}

/** Align DataTexture rows/cols with Three.js plane UVs after each wall rotation. */
export function heatmapTextureRemap(surfaceKind: HeatmapSurfaceKind): HeatmapTextureRemap {
  switch (surfaceKind) {
    case "wall_south":
      return { flipRow: true, flipCol: true };
    case "wall_west":
    case "wall_east":
      return { flipRow: true, flipCol: false };
    case "wall_north":
      return { flipRow: false, flipCol: false };
    case "floor":
      return { flipRow: true, flipCol: false };
    default:
      return { flipRow: false, flipCol: false };
  }
}
