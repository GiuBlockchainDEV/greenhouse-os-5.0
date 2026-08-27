/** Bed layout: lines run along X (pad↔fan), stacked in parallel along Z — perpendicular to side walls, crossing airflow. */

import {
  DWC_HOLE_SPACING_M,
  SUBSTRATE_SLAB_SPACING_M,
  SYSTEM_DEFAULT_DENSITY,
  SYSTEM_LINE_WIDTH_M,
  bedLineWidthForSystem,
  FIXED_LINE_WIDTH_SYSTEMS,
  maxBedLinesForSystem,
  MIN_FIELD_LINE_WIDTH_M,
} from "@/lib/cultivationConstants";
import { plantScaleForSystem } from "@/lib/plantGeometry";
import { bayCenterZ } from "@/lib/structureUtils";
import type { CultivationLayout, CultivationSystem, CropType } from "@/types/greenhouse";

export { DWC_HOLE_SPACING_M, SUBSTRATE_SLAB_SPACING_M, SYSTEM_LINE_WIDTH_M };

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

export const CROP_SPACING_FACTOR: Record<CropType, number> = {
  tomato: 1.0,
  cucumber: 1.15,
  pepper: 0.9,
  lettuce: 0.55,
  strawberry: 0.65,
  cannabis: 1.1,
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
  /** Long axis — bed/gutter run along airflow direction (X, pad wall to fan wall). */
  xMin: number;
  xMax: number;
  /** Short axis — line width; parallel lines stacked along Z. */
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
  slotIndex: number;
}

export interface CultivationLayoutResult {
  beds: BedZone[];
  plants: PlantSlot[];
  cultivationAreaM2: number;
  pathwayAreaM2: number;
  totalPlants: number;
  plantsPerTier: number;
  bedLineCount: number;
}

function computeBedZonesForBay(
  length: number,
  bayIndex: number,
  bayWidthM: number,
  totalWidth: number,
  sideClearanceM: number,
  pathwayWidthM: number,
  system: CultivationSystem,
  requestedLineCount: number,
): BedZone[] {
  const bayCenter = bayCenterZ(bayIndex, bayWidthM, totalWidth);
  const bayZMin = bayCenter - bayWidthM / 2;
  const bayZMax = bayCenter + bayWidthM / 2;

  const xMin = -length / 2 + sideClearanceM;
  const xMax = length / 2 - sideClearanceM;
  const runLength = xMax - xMin;

  const zMinBound = bayZMin + sideClearanceM;
  const zMaxBound = bayZMax - sideClearanceM;
  const usableWidth = zMaxBound - zMinBound;

  if (runLength < 1.0 || usableWidth < 0.5) {
    return [];
  }

  const maxLines = maxBedLinesForSystem(system, usableWidth, pathwayWidthM);
  if (requestedLineCount <= 0 || maxLines === 0) {
    return [];
  }

  const lineCount = Math.min(Math.max(1, requestedLineCount), maxLines);
  const resolvedLineWidth = bedLineWidthForSystem(
    system,
    usableWidth,
    lineCount,
    pathwayWidthM,
  );
  const minLineWidth = FIXED_LINE_WIDTH_SYSTEMS.has(system)
    ? SYSTEM_LINE_WIDTH_M[system]
    : MIN_FIELD_LINE_WIDTH_M;
  if (resolvedLineWidth < minLineWidth) {
    return [];
  }

  const isFixedWidthSystem = FIXED_LINE_WIDTH_SYSTEMS.has(system);
  const blockWidth = isFixedWidthSystem
    ? lineCount * resolvedLineWidth + (lineCount - 1) * pathwayWidthM
    : usableWidth;
  let zCursor = isFixedWidthSystem
    ? zMinBound + (usableWidth - blockWidth) / 2
    : zMinBound;

  const elevationM = SYSTEM_BED_ELEVATION_M[system];
  const depthM = SYSTEM_BED_DEPTH_M[system];
  const beds: BedZone[] = [];

  for (let i = 0; i < lineCount; i++) {
    beds.push({
      bayIndex,
      bedIndex: i,
      xMin,
      xMax,
      zMin: zCursor,
      zMax: zCursor + resolvedLineWidth,
      elevationM,
      depthM,
    });
    zCursor += resolvedLineWidth + pathwayWidthM;
  }

  return beds;
}

function plantY(bed: BedZone, system: CultivationSystem, tier: number, tierStep: number): number {
  switch (system) {
    case "nft":
    case "aeroponic":
      return bed.elevationM + 0.11 + tier * tierStep;
    case "dwc":
      return bed.elevationM + bed.depthM + 0.14 + tier * tierStep;
    case "substrate":
      return bed.elevationM + 0.22 + tier * tierStep;
    default:
      return bed.elevationM + bed.depthM + 0.02 + tier * tierStep;
  }
}

function generateSlotsForBed(
  bed: BedZone,
  system: CultivationSystem,
  spacing: number,
  tier: number,
  tierStep: number,
  baseScale: number,
  systemScale: number,
  slotOffset: number,
): PlantSlot[] {
  const bedRun = bed.xMax - bed.xMin;
  const bedLine = bed.zMax - bed.zMin;
  const centerZ = (bed.zMin + bed.zMax) / 2;
  const y = plantY(bed, system, tier, tierStep);
  const slots: PlantSlot[] = [];
  let idx = slotOffset;

  const push = (x: number, z: number, scaleMul = 1) => {
    slots.push({
      x,
      y,
      z,
      scale: baseScale * systemScale * scaleMul,
      rotation: ((idx * 17) % 360) * (Math.PI / 180),
      slotIndex: idx++,
    });
  };

  switch (system) {
    case "nft":
    case "aeroponic": {
      const count = Math.max(1, Math.floor(bedRun / spacing));
      for (let row = 0; row < count; row++) {
        push(bed.xMin + spacing / 2 + row * spacing, centerZ);
      }
      break;
    }
    case "dwc": {
      const startX = bed.xMin + DWC_HOLE_SPACING_M * 0.7;
      const startZ = bed.zMin + DWC_HOLE_SPACING_M * 0.7;
      for (let x = startX; x <= bed.xMax - 0.25; x += DWC_HOLE_SPACING_M) {
        for (let z = startZ; z <= bed.zMax - 0.25; z += DWC_HOLE_SPACING_M) {
          push(x, z);
        }
      }
      break;
    }
    case "substrate": {
      const slabCount = Math.max(1, Math.floor(bedRun / SUBSTRATE_SLAB_SPACING_M));
      for (let i = 0; i < slabCount; i++) {
        const x = bed.xMin + bedRun / (slabCount + 1) * (i + 1);
        if (bedLine > 0.8) {
          push(x, centerZ - bedLine * 0.2);
          push(x, centerZ + bedLine * 0.2, 0.95);
        } else {
          push(x, centerZ);
        }
      }
      break;
    }
    default: {
      const rows = Math.max(1, Math.floor(bedRun / spacing));
      const cols = Math.max(1, Math.floor(bedLine / spacing));
      for (let row = 0; row < rows; row++) {
        for (let col = 0; col < cols; col++) {
          const jitter = ((tier * rows * cols + row * cols + col) % 7) * 0.012 - 0.03;
          push(
            bed.xMin + spacing / 2 + row * spacing + jitter,
            bed.zMin + spacing / 2 + col * spacing + jitter,
            0.85 + ((row + col + tier) % 5) * 0.05,
          );
        }
      }
    }
  }

  return slots;
}

export function computeCultivationLayout(params: {
  length: number;
  totalWidth: number;
  bayCount: number;
  bayWidthM: number;
  eaveHeight: number;
  cropType: CropType;
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
    cropType,
    system,
    layout,
    lai,
    growthStage,
  } = params;

  const sideClearanceM = layout.sideClearanceM;
  const pathwayWidthM = layout.pathwayWidthM;
  const tierCount = Math.max(layout.tierCount, 1);
  const density = layout.plantDensity * SYSTEM_DEFAULT_DENSITY[system];
  const spacing =
    (SYSTEM_PLANT_SPACING_M[system] * CROP_SPACING_FACTOR[cropType]) / density;
  const tierStep = Math.min(1.0, Math.max((eaveHeight - 1.2) / tierCount, 0.35));
  const systemScale = plantScaleForSystem(system);

  const stageScale: Record<string, number> = {
    seedling: 0.4,
    early_vegetative: 0.6,
    mid_season: 1.0,
    late_vegetative: 1.1,
    generative: 1.0,
    harvest: 0.85,
  };
  const baseScale = (0.35 + lai * 0.1) * (stageScale[growthStage] ?? 1.0);

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
        layout.bedLineCount,
      ),
    );
  }

  const bedLineCount = bayCount > 0 ? Math.round(beds.length / bayCount) : 0;

  const plants: PlantSlot[] = [];
  let slotOffset = 0;
  for (const bed of beds) {
    for (let tier = 0; tier < tierCount; tier++) {
      const bedSlots = generateSlotsForBed(
        bed,
        system,
        spacing,
        tier,
        tierStep,
        baseScale,
        systemScale,
        slotOffset,
      );
      plants.push(...bedSlots);
      slotOffset += bedSlots.length;
    }
  }

  const cultivationAreaM2 = beds.reduce(
    (sum, bed) => sum + (bed.xMax - bed.xMin) * (bed.zMax - bed.zMin),
    0,
  ) * tierCount;

  const floorAreaM2 = length * totalWidth;
  const pathwayAreaM2 = Math.max(floorAreaM2 - cultivationAreaM2 / tierCount, 0);
  const plantsPerTier = tierCount > 0 ? Math.round(plants.length / tierCount) : 0;

  return {
    beds,
    plants,
    cultivationAreaM2,
    pathwayAreaM2,
    totalPlants: plants.length,
    plantsPerTier,
    bedLineCount,
  };
}

export function estimatePlantsPerTier(
  length: number,
  bayCount: number,
  bayWidthM: number,
  totalWidth: number,
  cropType: CropType,
  system: CultivationSystem,
  layout: CultivationLayout,
): number {
  return computeCultivationLayout({
    length,
    totalWidth,
    bayCount,
    bayWidthM,
    eaveHeight: 4,
    cropType,
    system,
    layout: { ...layout, tierCount: 1 },
    lai: 3,
    growthStage: "mid_season",
  }).plantsPerTier;
}
