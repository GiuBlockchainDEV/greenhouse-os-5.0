/** Shared layout constants — beds and plant slots use the same values. */

import type { CropType, CultivationSystem } from "@/types/greenhouse";

export const DWC_HOLE_SPACING_M = 0.5;
export const SUBSTRATE_SLAB_SPACING_M = 1.0;
export const NFT_CHANNEL_WIDTH_M = 0.32;

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
