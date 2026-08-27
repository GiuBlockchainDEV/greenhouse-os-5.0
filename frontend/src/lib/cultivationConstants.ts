/** Shared layout constants — beds and plant slots use the same values. */

import type { CropType, CultivationSystem } from "@/types/greenhouse";

export const DWC_HOLE_SPACING_M = 0.5;
export const SUBSTRATE_SLAB_SPACING_M = 1.0;
export const NFT_CHANNEL_WIDTH_M = 0.32;

/** Width of one cultivation line along Z (stacked across bay width). Beds run along X. */
export const SYSTEM_LINE_WIDTH_M: Record<CultivationSystem, number> = {
  soil: 1.2,
  substrate: 1.0,
  growbed: 1.4,
  nft: 0.4,
  dwc: 1.2,
  drip: 1.0,
  aeroponic: 0.45,
  ebb_flow: 1.2,
};

/** Hydro/gutter systems use fixed line width; field systems divide bay width among lines. */
export const FIXED_LINE_WIDTH_SYSTEMS = new Set<CultivationSystem>([
  "substrate",
  "nft",
  "dwc",
  "aeroponic",
]);

export const MIN_FIELD_LINE_WIDTH_M = 0.8;

export const CROP_PREFERRED_SYSTEMS: Record<CropType, CultivationSystem[]> = {
  tomato: ["drip", "substrate", "nft", "soil"],
  cucumber: ["substrate", "drip", "nft"],
  pepper: ["substrate", "drip", "soil"],
  lettuce: ["nft", "dwc", "substrate", "aeroponic"],
  strawberry: ["substrate", "nft", "dwc", "ebb_flow"],
  cannabis: ["substrate", "aeroponic", "dwc", "soil"],
};

export const SYSTEM_DEFAULT_DENSITY: Record<CultivationSystem, number> = {
  soil: 1.0,
  substrate: 1.05,
  growbed: 0.95,
  nft: 1.15,
  dwc: 1.1,
  drip: 0.9,
  aeroponic: 1.1,
  ebb_flow: 1.0,
};

/** Suggested cultivation system when crop type changes. */
export function defaultSystemForCrop(cropType: CropType): CultivationSystem {
  return CROP_PREFERRED_SYSTEMS[cropType][0] ?? "substrate";
}

export function maxBedLinesForLength(
  usableLengthM: number,
  lineWidthM: number,
  pathwayWidthM: number,
): number {
  if (usableLengthM < lineWidthM) return 0;
  return Math.floor((usableLengthM + pathwayWidthM) / (lineWidthM + pathwayWidthM));
}

export function maxBedLinesForSystem(
  system: CultivationSystem,
  usableWidthM: number,
  pathwayWidthM: number,
): number {
  if (FIXED_LINE_WIDTH_SYSTEMS.has(system)) {
    return maxBedLinesForLength(
      usableWidthM,
      SYSTEM_LINE_WIDTH_M[system],
      pathwayWidthM,
    );
  }
  return maxBedLinesForLength(usableWidthM, MIN_FIELD_LINE_WIDTH_M, pathwayWidthM);
}

export function bedLineWidthForSystem(
  system: CultivationSystem,
  usableWidthM: number,
  lineCount: number,
  pathwayWidthM: number,
): number {
  if (FIXED_LINE_WIDTH_SYSTEMS.has(system)) {
    return SYSTEM_LINE_WIDTH_M[system];
  }
  if (lineCount <= 0) return 0;
  return (usableWidthM - (lineCount - 1) * pathwayWidthM) / lineCount;
}
