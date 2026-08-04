/** Bed layout, pathways, and elevation by cultivation system. */

import { bayCenterZ } from "@/lib/structureUtils";
import type { CultivationLayout, CultivationSystem } from "@/types/greenhouse";

export const SYSTEM_BED_ELEVATION_M: Record<CultivationSystem, number> = {
  soil: 0.0,
  substrate: 0.2,
  growbed: 0.55,
  nft: 0.9,
  dwc: 0.75,
  drip: 0.0,
  aeroponic: 1.15,
  ebb_flow: 0.5,
};

export const SYSTEM_BED_DEPTH_M: Record<CultivationSystem, number> = {
  soil: 0.05,
  substrate: 0.12,
  growbed: 0.28,
  nft: 0.06,
  dwc: 0.35,
  drip: 0.05,
  aeroponic: 0.04,
  ebb_flow: 0.15,
};

export const SYSTEM_PLANT_SPACING_M: Record<CultivationSystem, number> = {
  soil: 0.4,
  substrate: 0.35,
  growbed: 0.3,
  nft: 0.25,
  dwc: 0.3,
  drip: 0.45,
  aeroponic: 0.35,
  ebb_flow: 0.3,
};

export interface BedZone {
  bayIndex: number;
  bedIndex: number;
  xMin: number;
  xMax: number;
  zMin: number;
  zMax: number;
  elevationM: number;
  depthM: number;
}

export interface PlantSlot {
  x: number;
  y: number;
  z: number;
  scale: number;
  rotation: number;
}

export interface CultivationLayoutResult {
  beds: BedZone[];
  plants: PlantSlot[];
  cultivationAreaM2: number;
  pathwayAreaM2: number;
  totalPlants: number;
}

function computeBedZonesForBay(
  length: number,
  bayIndex: number,
  bayWidthM: number,
  totalWidth: number,
  sideClearanceM: number,
  pathwayWidthM: number,
  system: CultivationSystem,
): BedZone[] {
  const bayCenter = bayCenterZ(bayIndex, bayWidthM, totalWidth);
  const bayZMin = bayCenter - bayWidthM / 2;
  const bayZMax = bayCenter + bayWidthM / 2;

  const xMin = -length / 2 + sideClearanceM;
  const xMax = length / 2 - sideClearanceM;
  const usableWidth = bayWidthM - 2 * sideClearanceM;

  if (usableWidth <= pathwayWidthM + 1.2) {
    return [];
  }

  const bedWidth = (usableWidth - pathwayWidthM) / 2;
  const leftZMin = bayZMin + sideClearanceM;
  const leftZMax = leftZMin + bedWidth;
  const rightZMax = bayZMax - sideClearanceM;
  const rightZMin = rightZMax - bedWidth;
  const elevationM = SYSTEM_BED_ELEVATION_M[system];
  const depthM = SYSTEM_BED_DEPTH_M[system];

  return [
    {
      bayIndex,
      bedIndex: 0,
      xMin,
      xMax,
      zMin: leftZMin,
      zMax: leftZMax,
      elevationM,
      depthM,
    },
    {
      bayIndex,
      bedIndex: 1,
      xMin,
      xMax,
      zMin: rightZMin,
      zMax: rightZMax,
      elevationM,
      depthM,
    },
  ];
}

export function computeCultivationLayout(params: {
  length: number;
  totalWidth: number;
  bayCount: number;
  bayWidthM: number;
  eaveHeight: number;
  system: CultivationSystem;
  layout: CultivationLayout;
  lai: number;
  growthStage: string;
}): CultivationLayoutResult {
  const {
    length,
    totalWidth,
    bayCount,
    bayWidthM,
    eaveHeight,
    system,
    layout,
    lai,
    growthStage,
  } = params;

  const sideClearanceM = layout.sideClearanceM;
  const pathwayWidthM = layout.pathwayWidthM;
  const tierCount = Math.max(layout.tierCount, 1);
  const spacing = SYSTEM_PLANT_SPACING_M[system];
  const tierStep = Math.min(1.0, Math.max((eaveHeight - 1.2) / tierCount, 0.35));

  const stageScale: Record<string, number> = {
    seedling: 0.4,
    early_vegetative: 0.6,
    mid_season: 1.0,
    late_vegetative: 1.1,
    generative: 1.0,
    harvest: 0.85,
  };
  const baseScale = (0.25 + lai * 0.12) * (stageScale[growthStage] ?? 1.0);

  const beds: BedZone[] = [];
  for (let bayIndex = 0; bayIndex < bayCount; bayIndex++) {
    beds.push(
      ...computeBedZonesForBay(
        length,
        bayIndex,
        bayWidthM,
        totalWidth,
        sideClearanceM,
        pathwayWidthM,
        system,
      ),
    );
  }

  const plants: PlantSlot[] = [];
  for (const bed of beds) {
    for (let tier = 0; tier < tierCount; tier++) {
      const bedLength = bed.xMax - bed.xMin;
      const bedWidth = bed.zMax - bed.zMin;
      const rows = Math.max(1, Math.floor(bedLength / spacing));
      const cols = Math.max(1, Math.floor(bedWidth / spacing));
      const y = bed.elevationM + bed.depthM + 0.22 + tier * tierStep;

      for (let row = 0; row < rows; row++) {
        for (let col = 0; col < cols; col++) {
          const jitter = ((tier * rows * cols + row * cols + col) % 7) * 0.015 - 0.04;
          plants.push({
            x: bed.xMin + spacing / 2 + row * spacing + jitter,
            y,
            z: bed.zMin + spacing / 2 + col * spacing + jitter,
            scale: baseScale * (0.85 + ((row + col + tier) % 5) * 0.05),
            rotation: ((row * 3 + col * 7 + tier * 11) % 360) * (Math.PI / 180),
          });
        }
      }
    }
  }

  const cultivationAreaM2 = beds.reduce(
    (sum, bed) => sum + (bed.xMax - bed.xMin) * (bed.zMax - bed.zMin),
    0,
  ) * tierCount;

  const floorAreaM2 = length * totalWidth;
  const pathwayAreaM2 = Math.max(floorAreaM2 - cultivationAreaM2 / tierCount, 0);

  return {
    beds,
    plants,
    cultivationAreaM2,
    pathwayAreaM2,
    totalPlants: plants.length,
  };
}

export function estimatePlantsPerTier(
  length: number,
  bayCount: number,
  bayWidthM: number,
  totalWidth: number,
  system: CultivationSystem,
  layout: CultivationLayout,
): number {
  const result = computeCultivationLayout({
    length,
    totalWidth,
    bayCount,
    bayWidthM,
    eaveHeight: 4,
    system,
    layout: { ...layout, tierCount: 1 },
    lai: 3,
    growthStage: "mid_season",
  });
  return Math.max(1, Math.round(result.totalPlants / Math.max(layout.tierCount, 1)));
}
