/** Bed layout: lines run along X (pad wall → exhaust fans), parallel rows stacked across bay width (Z). */

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
  /** Long axis — bed/gutter run toward the exhaust fans (+X). */
  xMin: number;
  xMax: number;
  /** Line width; parallel lines stacked along Z across the bay. */
  zMin: number;
  zMax: number;
  elevationM: number;
  depthM: number;
}

export type PathwayKind = "center" | "between_lines" | "gutter" | "head" | "cross";

export interface PathwayZone {
  bayIndex: number;
  kind: PathwayKind;
  xMin: number;
  xMax: number;
  zMin: number;
  zMax: number;
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
  pathways: PathwayZone[];
  plants: PlantSlot[];
  cultivationAreaM2: number;
  pathwayAreaM2: number;
  totalPlants: number;
  plantsPerTier: number;
  bedLineCount: number;
}

function crossPathCenters(length: number, intervalM: number, sideClearanceM: number): number[] {
  if (intervalM <= 0) {
    return [];
  }
  const halfLength = length / 2;
  const margin = sideClearanceM;
  const centers: number[] = [];
  let x = -halfLength + margin + intervalM;
  const xMax = halfLength - margin - 2;
  while (x <= xMax) {
    centers.push(x);
    x += intervalM;
  }
  return centers;
}

function splitBedAroundCrossPaths(
  bed: BedZone,
  centers: number[],
  crossPathWidthM: number,
): BedZone[] {
  if (centers.length === 0 || crossPathWidthM <= 0) {
    return [bed];
  }
  const segments: BedZone[] = [];
  let cursor = bed.xMin;
  for (const centerX of centers) {
    const gapMin = centerX - crossPathWidthM / 2;
    const gapMax = centerX + crossPathWidthM / 2;
    if (gapMax <= bed.xMin || gapMin >= bed.xMax) {
      continue;
    }
    const cutEnd = Math.max(bed.xMin, gapMin);
    if (cutEnd - cursor >= 0.45) {
      segments.push({ ...bed, xMin: cursor, xMax: Math.min(cutEnd, bed.xMax) });
    }
    cursor = Math.min(bed.xMax, gapMax);
  }
  if (bed.xMax - cursor >= 0.45) {
    segments.push({ ...bed, xMin: cursor, xMax: bed.xMax });
  }
  return segments.length > 0 ? segments : [bed];
}

function layoutLinesInZBlock(
  xMin: number,
  xMax: number,
  zBlockMin: number,
  zBlockMax: number,
  bayIndex: number,
  bedIndexStart: number,
  pathwayWidthM: number,
  system: CultivationSystem,
  lineCount: number,
): { beds: BedZone[]; pathways: PathwayZone[]; nextBedIndex: number } {
  const beds: BedZone[] = [];
  const pathways: PathwayZone[] = [];
  const usableWidth = zBlockMax - zBlockMin;
  if (lineCount <= 0 || usableWidth < 0.45) {
    return { beds, pathways, nextBedIndex: bedIndexStart };
  }

  const maxLines = maxBedLinesForSystem(system, usableWidth, pathwayWidthM);
  const resolvedCount = Math.min(lineCount, maxLines);
  if (resolvedCount === 0) {
    return { beds, pathways, nextBedIndex: bedIndexStart };
  }

  const resolvedLineWidth = bedLineWidthForSystem(
    system,
    usableWidth,
    resolvedCount,
    pathwayWidthM,
  );
  const minLineWidth = FIXED_LINE_WIDTH_SYSTEMS.has(system)
    ? SYSTEM_LINE_WIDTH_M[system]
    : MIN_FIELD_LINE_WIDTH_M;
  if (resolvedLineWidth < minLineWidth) {
    return { beds, pathways, nextBedIndex: bedIndexStart };
  }

  const blockSpan =
    resolvedCount * resolvedLineWidth + Math.max(0, resolvedCount - 1) * pathwayWidthM;
  const slack = Math.max(0, usableWidth - blockSpan);
  const edgeGap = slack / (resolvedCount + 1);
  let zCursor = zBlockMin + edgeGap;

  const elevationM = SYSTEM_BED_ELEVATION_M[system];
  const depthM = SYSTEM_BED_DEPTH_M[system];
  let bedIndex = bedIndexStart;

  for (let i = 0; i < resolvedCount; i++) {
    const zMin = zCursor;
    const zMax = zCursor + resolvedLineWidth;
    beds.push({
      bayIndex,
      bedIndex,
      xMin,
      xMax,
      zMin,
      zMax,
      elevationM,
      depthM,
    });
    if (i < resolvedCount - 1) {
      const pathZMin = zMax;
      const pathZMax = zMax + pathwayWidthM;
      pathways.push({
        bayIndex,
        kind: "between_lines",
        xMin,
        xMax,
        zMin: pathZMin,
        zMax: pathZMax,
      });
    }
    zCursor = zMax + pathwayWidthM + edgeGap;
    bedIndex += 1;
  }

  return { beds, pathways, nextBedIndex: bedIndex };
}

function computeBedZonesForBay(
  length: number,
  bayIndex: number,
  bayWidthM: number,
  totalWidth: number,
  layout: CultivationLayout,
  system: CultivationSystem,
  requestedLineCount: number,
  crossPathCentersX: number[],
): { beds: BedZone[]; pathways: PathwayZone[] } {
  const { sideClearanceM, pathwayWidthM, centerAisleM, gutterWalkM } = layout;
  const bayCenter = bayCenterZ(bayIndex, bayWidthM, totalWidth);
  const bayZMin = bayCenter - bayWidthM / 2;
  const bayZMax = bayCenter + bayWidthM / 2;

  const xMin = -length / 2 + sideClearanceM;
  const xMax = length / 2 - sideClearanceM;
  const runLength = xMax - xMin;

  const zMinBound = bayZMin + sideClearanceM + gutterWalkM;
  const zMaxBound = bayZMax - sideClearanceM - gutterWalkM;
  const usableWidth = zMaxBound - zMinBound;

  const pathways: PathwayZone[] = [];

  if (runLength < 1.0 || usableWidth < 0.8 || requestedLineCount <= 0) {
    return { beds: [], pathways };
  }

  if (gutterWalkM > 0.15) {
    pathways.push({
      bayIndex,
      kind: "gutter",
      xMin,
      xMax,
      zMin: bayZMin + sideClearanceM,
      zMax: zMinBound,
    });
    pathways.push({
      bayIndex,
      kind: "gutter",
      xMin,
      xMax,
      zMin: zMaxBound,
      zMax: bayZMax - sideClearanceM,
    });
  }

  pathways.push({
    bayIndex,
    kind: "head",
    xMin: -length / 2,
    xMax: xMin,
    zMin: bayZMin + sideClearanceM,
    zMax: bayZMax - sideClearanceM,
  });
  pathways.push({
    bayIndex,
    kind: "head",
    xMin: xMax,
    xMax: length / 2,
    zMin: bayZMin + sideClearanceM,
    zMax: bayZMax - sideClearanceM,
  });

  const aisle = Math.min(Math.max(0, centerAisleM), usableWidth * 0.45);
  const blockWidth = (usableWidth - aisle) / 2;
  if (blockWidth < 0.5) {
    return { beds: [], pathways };
  }

  const westZMax = zMinBound + blockWidth;
  const eastZMin = zMaxBound - blockWidth;

  if (aisle >= 0.8) {
    pathways.push({
      bayIndex,
      kind: "center",
      xMin,
      xMax,
      zMin: westZMax,
      zMax: eastZMin,
    });
  }

  const westLines = Math.ceil(requestedLineCount / 2);
  const eastLines = Math.floor(requestedLineCount / 2);

  const west = layoutLinesInZBlock(
    xMin,
    xMax,
    zMinBound,
    westZMax,
    bayIndex,
    0,
    pathwayWidthM,
    system,
    westLines,
  );
  const east = layoutLinesInZBlock(
    xMin,
    xMax,
    eastZMin,
    zMaxBound,
    bayIndex,
    west.nextBedIndex,
    pathwayWidthM,
    system,
    eastLines,
  );

  pathways.push(...west.pathways, ...east.pathways);

  for (const centerX of crossPathCentersX) {
    const halfW = layout.crossPathWidthM / 2;
    pathways.push({
      bayIndex,
      kind: "cross",
      xMin: centerX - halfW,
      xMax: centerX + halfW,
      zMin: bayZMin + sideClearanceM,
      zMax: bayZMax - sideClearanceM,
    });
  }

  const mergedBeds = [...west.beds, ...east.beds].flatMap((bed) =>
    splitBedAroundCrossPaths(bed, crossPathCentersX, layout.crossPathWidthM),
  );

  return { beds: mergedBeds, pathways };
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

  const tierCount = Math.max(layout.tierCount, 1);
  const crossCenters = crossPathCenters(
    length,
    layout.crossPathIntervalM,
    layout.sideClearanceM,
  );
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
  const pathways: PathwayZone[] = [];
  for (let bayIndex = 0; bayIndex < bayCount; bayIndex++) {
    const bayLayout = computeBedZonesForBay(
      length,
      bayIndex,
      bayWidthM,
      totalWidth,
      layout,
      system,
      layout.bedLineCount,
      crossCenters,
    );
    beds.push(...bayLayout.beds);
    pathways.push(...bayLayout.pathways);
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
    pathways,
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
