/** Shared layout constants — beds and plant slots use the same values. */

import type { CropType, CultivationLayout, CultivationSystem } from "@/types/greenhouse";

export const DWC_HOLE_SPACING_M = 0.5;
export const SUBSTRATE_SLAB_SPACING_M = 1.0;
export const NFT_CHANNEL_WIDTH_M = 0.32;

/** Width of one cultivation line along Z (stacked across bay width). Beds run along X toward exhaust fans. */
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

export function defaultCenterAisleM(bayWidthM: number): number {
  if (bayWidthM >= 12) return 1.8;
  if (bayWidthM >= 9) return 1.6;
  if (bayWidthM >= 7) return 1.5;
  return 1.2;
}

export function defaultCrossPathIntervalM(lengthM: number): number {
  return lengthM >= 60 ? 48 : 0;
}

/** Commercial layout: twin bed blocks + central aisle; lines split left/right. */
export function recommendBedLinesPerBay(
  bayWidthM: number,
  system: CultivationSystem,
  layout: Pick<
    CultivationLayout,
    "pathwayWidthM" | "sideClearanceM" | "centerAisleM" | "gutterWalkM"
  >,
): number {
  const gutterWalk = layout.gutterWalkM ?? 0;
  const centerAisle = layout.centerAisleM ?? 0;
  const usable =
    bayWidthM - 2 * layout.sideClearanceM - 2 * gutterWalk - centerAisle;
  const blockWidth = usable / 2;
  if (blockWidth < MIN_FIELD_LINE_WIDTH_M) {
    return 0;
  }
  const perSide = maxBedLinesForSystem(system, blockWidth, layout.pathwayWidthM);
  return Math.max(0, perSide * 2);
}
