import {
  defaultCenterAisleM,
  defaultCrossPathIntervalM,
  recommendBedLinesPerBay,
} from "@/lib/cultivationConstants";
import type { CultivationLayout, CultivationSystem, CropType } from "@/types/greenhouse";

export function marketCultivationLayoutDefaults(input: {
  lengthM: number;
  bayWidthM: number;
  system: CultivationSystem;
  crop: CropType;
  maxBedLinesPerBay?: number;
}): CultivationLayout {
  const pathwayWidthM = 1.5;
  const sideClearanceM = 1.2;
  const centerAisleM = defaultCenterAisleM(input.bayWidthM);
  const gutterWalkM = 0.55;
  const crossPathIntervalM = defaultCrossPathIntervalM(input.lengthM);
  const crossPathWidthM = 2.5;

  const layoutProbe: Pick<
    CultivationLayout,
    "pathwayWidthM" | "sideClearanceM" | "centerAisleM" | "gutterWalkM"
  > = {
    pathwayWidthM,
    sideClearanceM,
    centerAisleM,
    gutterWalkM,
  };

  let bedLineCount = recommendBedLinesPerBay(input.bayWidthM, input.system, layoutProbe);
  if (input.maxBedLinesPerBay !== undefined) {
    bedLineCount = Math.min(bedLineCount, input.maxBedLinesPerBay);
  }

  return {
    tierCount: input.crop === "strawberry" ? 2 : 1,
    gutterLengthM: Math.max(1, input.lengthM - 2 * sideClearanceM),
    plantsPerTier: 0,
    plantDensity: 1.0,
    bedLineCount,
    pathwayWidthM,
    sideClearanceM,
    centerAisleM,
    gutterWalkM,
    crossPathIntervalM,
    crossPathWidthM,
  };
}