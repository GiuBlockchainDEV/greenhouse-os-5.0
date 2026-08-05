/** Shared layout constants — beds and plant slots use the same values. */

import type { CropType, CultivationSystem } from "@/types/greenhouse";

export const DWC_HOLE_SPACING_M = 0.5;
export const SUBSTRATE_SLAB_SPACING_M = 1.0;
export const NFT_CHANNEL_WIDTH_M = 0.32;

/** Width of one cultivation line along the airflow axis (X). Beds run along Z. */
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
