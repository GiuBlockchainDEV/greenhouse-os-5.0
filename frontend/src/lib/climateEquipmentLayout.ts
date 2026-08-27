/** Positions and dimensions for 3D climate equipment placement. */

import type { BedZone } from "@/lib/cultivationLayout";
import { bayCenterZ, roofRiseM } from "@/lib/structureUtils";
import type {
  ArchType,
  ClimateEquipment,
  ClimateEquipmentSizing,
  GreenhouseDimensions,
  GreenhouseStructure,
} from "@/types/greenhouse";

export interface Vec3 {
  x: number;
  y: number;
  z: number;
}

export interface FanPlacement extends Vec3 {
  diameterM: number;
}

export interface CirculationFanPlacement extends FanPlacement {
  /** Horizontal blow direction (yaw radians, 0 = +X). */
  yaw: number;
}

export interface RoofExhaustFanPlacement extends FanPlacement {
  /** Fan mounted flush on the gable face (−X). */
  gableMount: true;
}

export interface PadWallPlacement {
  x: number;
  y: number;
  zCenter: number;
  widthM: number;
  heightM: number;
}

export interface AcUnitPlacement extends Vec3 {
  widthM: number;
  heightM: number;
  depthM: number;
  wall: "north" | "south";
}

export interface VentPlacement extends Vec3 {
  widthM: number;
  heightM: number;
  kind: "roof" | "side" | "gable";
  rotationX?: number;
}

export interface HeaterPlacement extends Vec3 {
  kind: "unit" | "air" | "geothermal";
}

export interface FogLinePlacement {
  y: number;
  z: number;
  nozzleCount: number;
}

export interface ClimateEquipmentLayout {
  exhaustFans: FanPlacement[];
  roofExhaustFans: RoofExhaustFanPlacement[];
  circulationFans: CirculationFanPlacement[];
  padWalls: PadWallPlacement[];
  acUnits: AcUnitPlacement[];
  vents: VentPlacement[];
  heaters: HeaterPlacement[];
  fogLines: FogLinePlacement[];
}

export const REFERENCE_CLIMATE_SIZING: ClimateEquipmentSizing = {
  exhaustFanCount: 4,
  exhaustFanDiameterM: 1.2,
  roofExhaustFanCount: 1,
  roofExhaustFanDiameterM: 1.0,
  circulationFanCount: 6,
  circulationFanDiameterM: 0.55,
  padWallWidthM: 8,
  padWallHeightM: 2,
  acUnitCount: 2,
  acUnitWidthM: 1.8,
  roofVentCount: 3,
  roofVentWidthM: 2.5,
  sideVentCount: 4,
  sideVentHeightM: 1.5,
  heaterUnitCount: 2,
  pipeRowCount: 3,
  fogLineCount: 4,
};

/** Default installed equipment counts for a new greenhouse (empty install). */
export const DEFAULT_CLIMATE_SIZING: ClimateEquipmentSizing = {
  exhaustFanCount: 0,
  exhaustFanDiameterM: REFERENCE_CLIMATE_SIZING.exhaustFanDiameterM,
  roofExhaustFanCount: 0,
  roofExhaustFanDiameterM: REFERENCE_CLIMATE_SIZING.roofExhaustFanDiameterM,
  circulationFanCount: 0,
  circulationFanDiameterM: REFERENCE_CLIMATE_SIZING.circulationFanDiameterM,
  padWallWidthM: REFERENCE_CLIMATE_SIZING.padWallWidthM,
  padWallHeightM: REFERENCE_CLIMATE_SIZING.padWallHeightM,
  acUnitCount: 0,
  acUnitWidthM: REFERENCE_CLIMATE_SIZING.acUnitWidthM,
  roofVentCount: 0,
  roofVentWidthM: REFERENCE_CLIMATE_SIZING.roofVentWidthM,
  sideVentCount: 0,
  sideVentHeightM: REFERENCE_CLIMATE_SIZING.sideVentHeightM,
  heaterUnitCount: 0,
  pipeRowCount: 0,
  fogLineCount: 0,
};

/** Seed visible equipment when a cooling mode is first selected (counts still at zero). */
export function applyCoolingSystemDefaults(
  cooling: ClimateEquipment["cooling"],
  sizing: ClimateEquipmentSizing,
): ClimateEquipmentSizing {
  const next = { ...sizing };
  switch (cooling) {
    case "fan_and_pad":
      if (next.exhaustFanCount === 0) {
        next.exhaustFanCount = REFERENCE_CLIMATE_SIZING.exhaustFanCount;
      }
      break;
    case "evaporative":
      if (next.exhaustFanCount === 0) {
        next.exhaustFanCount = REFERENCE_CLIMATE_SIZING.exhaustFanCount;
      }
      break;
    case "mechanical_ac":
      if (next.acUnitCount === 0) {
        next.acUnitCount = REFERENCE_CLIMATE_SIZING.acUnitCount;
      }
      break;
    case "high_pressure_fog":
      if (next.fogLineCount === 0) {
        next.fogLineCount = REFERENCE_CLIMATE_SIZING.fogLineCount;
      }
      break;
    default:
      break;
  }
  return next;
}

function spreadAlongAxis(
  count: number,
  span: number,
  margin: number,
): number[] {
  if (count <= 0) return [];
  const usable = Math.max(span - margin * 2, 0.5);
  if (count === 1) return [0];
  const step = usable / (count - 1);
  const start = -usable / 2;
  return Array.from({ length: count }, (_, index) => start + index * step);
}

/** Place items at equal intervals between edges (segment centers, not endpoints). */
function evenlySpacedInRange(count: number, min: number, max: number): number[] {
  if (count <= 0) return [];
  if (count === 1) return [(min + max) / 2];
  const span = max - min;
  const step = span / (count + 1);
  return Array.from({ length: count }, (_, index) => min + step * (index + 1));
}

function needsPadWall(cooling: ClimateEquipment["cooling"]): boolean {
  return cooling === "fan_and_pad" || cooling === "evaporative";
}

function needsExhaustFans(
  cooling: ClimateEquipment["cooling"],
  ventilation: ClimateEquipment["ventilation"],
): boolean {
  return (
    cooling === "fan_and_pad" ||
    cooling === "evaporative" ||
    ventilation === "forced_exhaust" ||
    ventilation === "combined"
  );
}

function gableFanCenterY(
  archType: ArchType,
  eaveHeight: number,
  ridgeHeight: number,
): number {
  const rise = roofRiseM(eaveHeight, ridgeHeight);
  const wallFanY = eaveHeight * 0.62;
  if (archType === "semicircular") {
    return Math.max(wallFanY + 0.35, eaveHeight + rise * 0.38);
  }
  return Math.max(wallFanY + 0.4, eaveHeight + rise * 0.35);
}

function distributeCirculationFansOnBeds(
  totalCount: number,
  beds: BedZone[],
  bedLineCount: number,
  eaveHeight: number,
  ridgeHeight: number,
  diameterM: number,
): CirculationFanPlacement[] {
  if (totalCount <= 0 || beds.length === 0 || bedLineCount <= 0) return [];

  const lineCount = bedLineCount;
  const perLine = Math.floor(totalCount / lineCount);
  let lineRemainder = totalCount % lineCount;
  const hangY = Math.max(1.8, Math.min(eaveHeight - 0.65, ridgeHeight - 1.1));
  const fans: CirculationFanPlacement[] = [];

  for (let lineIdx = 0; lineIdx < lineCount; lineIdx++) {
    const lineFanCount = perLine + (lineRemainder > 0 ? 1 : 0);
    if (lineRemainder > 0) lineRemainder--;

    if (lineFanCount <= 0) continue;

    const lineBeds = beds.filter((bed) => bed.bedIndex === lineIdx);
    const firstBed = lineBeds[0];
    if (!firstBed) continue;

    const xPositions = evenlySpacedInRange(lineFanCount, firstBed.xMin, firstBed.xMax);

    xPositions.forEach((x, fanIdx) => {
      const bed = lineBeds[fanIdx % lineBeds.length];
      if (!bed) return;
      const centerZ = (bed.zMin + bed.zMax) / 2;
      fans.push({
        x,
        y: hangY,
        z: centerZ,
        diameterM,
        yaw: lineIdx % 2 === 0 ? Math.PI : 0,
      });
    });
  }

  return fans;
}

function distributeCirculationFansInHouse(
  totalCount: number,
  length: number,
  width: number,
  eaveHeight: number,
  ridgeHeight: number,
  diameterM: number,
): CirculationFanPlacement[] {
  if (totalCount <= 0) return [];

  const hangY = Math.max(1.8, Math.min(eaveHeight - 0.65, ridgeHeight - 1.1));
  const halfLength = length / 2;
  const xPositions = evenlySpacedInRange(
    totalCount,
    -halfLength * 0.72,
    halfLength * 0.72,
  );
  const zOffsets = spreadAlongAxis(totalCount, width, width * 0.18);

  return xPositions.map((x, index) => ({
    x,
    y: hangY,
    z: zOffsets[index] ?? 0,
    diameterM,
    yaw: index % 2 === 0 ? Math.PI : 0,
  }));
}

export function computeClimateEquipmentLayout(params: {
  dimensions: GreenhouseDimensions;
  structure: GreenhouseStructure;
  equipment: ClimateEquipment;
  cultivationBeds?: BedZone[];
  bedLineCount?: number;
}): ClimateEquipmentLayout {
  const { dimensions, structure, equipment, cultivationBeds = [], bedLineCount = 0 } = params;
  const { length, width, eaveHeight, ridgeHeight } = dimensions;
  const { bayCount, bayWidthM, archType } = structure;
  const sizing = equipment.sizing;

  const halfLength = length / 2;
  const halfWidth = width / 2;
  const exhaustFans: FanPlacement[] = [];
  const roofExhaustFans: RoofExhaustFanPlacement[] = [];
  const circulationFans: CirculationFanPlacement[] = [];
  const padWalls: PadWallPlacement[] = [];
  const acUnits: AcUnitPlacement[] = [];
  const vents: VentPlacement[] = [];
  const heaters: HeaterPlacement[] = [];
  const fogLines: FogLinePlacement[] = [];

  if (needsExhaustFans(equipment.cooling, equipment.ventilation)) {
    const fanZs = spreadAlongAxis(sizing.exhaustFanCount, width, width * 0.12);
    fanZs.forEach((offsetZ) => {
      exhaustFans.push({
        x: halfLength - 0.12,
        y: eaveHeight * 0.62,
        z: offsetZ,
        diameterM: sizing.exhaustFanDiameterM,
      });
    });

    const roofFanBayCount = Math.min(
      Math.max(0, sizing.roofExhaustFanCount),
      bayCount,
    );
    for (let bayIndex = 0; bayIndex < roofFanBayCount; bayIndex++) {
      const zCenter = bayCenterZ(bayIndex, bayWidthM, width);
      roofExhaustFans.push({
        x: halfLength - 0.08,
        y: gableFanCenterY(archType, eaveHeight, ridgeHeight),
        z: zCenter,
        diameterM: Math.min(sizing.roofExhaustFanDiameterM, bayWidthM * 0.38),
        gableMount: true,
      });
    }
  }

  if (sizing.circulationFanCount > 0) {
    if (cultivationBeds.length > 0) {
      circulationFans.push(
        ...distributeCirculationFansOnBeds(
          sizing.circulationFanCount,
          cultivationBeds,
          bedLineCount,
          eaveHeight,
          ridgeHeight,
          sizing.circulationFanDiameterM,
        ),
      );
    } else {
      circulationFans.push(
        ...distributeCirculationFansInHouse(
          sizing.circulationFanCount,
          length,
          width,
          eaveHeight,
          ridgeHeight,
          sizing.circulationFanDiameterM,
        ),
      );
    }
  }

  if (needsPadWall(equipment.cooling)) {
    padWalls.push({
      x: -halfLength + 0.06,
      y: sizing.padWallHeightM / 2 + 0.2,
      zCenter: 0,
      widthM: Math.min(sizing.padWallWidthM, width * 0.85),
      heightM: Math.min(sizing.padWallHeightM, eaveHeight * 0.85),
    });
  }

  if (equipment.cooling === "mechanical_ac") {
    const acXs = spreadAlongAxis(sizing.acUnitCount, length, length * 0.15);
    acXs.forEach((offsetX, index) => {
      const onSouth = index % 2 === 0;
      const depthM = 0.55;
      acUnits.push({
        x: offsetX,
        y: eaveHeight * 0.55,
        z: onSouth ? halfWidth - depthM * 0.5 - 0.06 : -halfWidth + depthM * 0.5 + 0.06,
        widthM: sizing.acUnitWidthM,
        heightM: eaveHeight * 0.45,
        depthM,
        wall: onSouth ? "south" : "north",
      });
    });
  }

  if (equipment.cooling === "high_pressure_fog") {
    const fogZs = spreadAlongAxis(sizing.fogLineCount, width, width * 0.1);
    fogZs.forEach((offsetZ) => {
      fogLines.push({
        y: ridgeHeight - 0.35,
        z: offsetZ,
        nozzleCount: Math.max(3, Math.floor(length / 4)),
      });
    });
  }

  const showRoofVents =
    equipment.ventilation === "roof_vents" ||
    equipment.ventilation === "combined" ||
    equipment.ventilation === "natural_ridge";

  if (showRoofVents && sizing.roofVentCount > 0) {
    const ventCount = sizing.roofVentCount;
    for (let bayIndex = 0; bayIndex < bayCount; bayIndex++) {
      const perBay = Math.ceil(ventCount / bayCount);
      const zCenter = bayCenterZ(bayIndex, bayWidthM, width);
      const ventXs = spreadAlongAxis(perBay, length * 0.75, length * 0.12);
      ventXs.forEach((offsetX) => {
        vents.push({
          x: offsetX,
          y: ridgeHeight - 0.08,
          z: zCenter,
          widthM: sizing.roofVentWidthM,
          heightM: 0.35,
          kind: "roof",
          rotationX: equipment.ventilation === "natural_ridge" ? 0 : -0.35,
        });
      });
    }
  }

  const showSideVents =
    equipment.ventilation === "side_vents" ||
    equipment.ventilation === "combined";

  if (showSideVents) {
    const sideZs = spreadAlongAxis(sizing.sideVentCount, width, width * 0.12);
    sideZs.forEach((offsetZ) => {
      vents.push({
        x: -halfLength * 0.55,
        y: eaveHeight * 0.55,
        z: offsetZ,
        widthM: 1.8,
        heightM: sizing.sideVentHeightM,
        kind: "side",
      });
      vents.push({
        x: halfLength * 0.55,
        y: eaveHeight * 0.55,
        z: offsetZ,
        widthM: 1.8,
        heightM: sizing.sideVentHeightM,
        kind: "side",
      });
    });
  }

  if (equipment.ventilation === "natural_gable") {
    vents.push({
      x: halfLength - 0.05,
      y: eaveHeight * 0.72,
      z: 0,
      widthM: width * 0.55,
      heightM: eaveHeight * 0.35,
      kind: "gable",
    });
  }

  if (equipment.heating === "unit_heater") {
    const heaterZs = spreadAlongAxis(sizing.heaterUnitCount, width, width * 0.2);
    heaterZs.forEach((offsetZ) => {
      heaters.push({
        x: -halfLength * 0.35,
        y: eaveHeight - 0.45,
        z: offsetZ,
        kind: "unit",
      });
    });
  }

  if (equipment.heating === "air_heater") {
    const heaterZs = spreadAlongAxis(sizing.heaterUnitCount, width, width * 0.2);
    heaterZs.forEach((offsetZ) => {
      heaters.push({
        x: -halfLength + 0.2,
        y: eaveHeight * 0.35,
        z: offsetZ,
        kind: "air",
      });
    });
  }

  if (equipment.heating === "geothermal") {
    const loopZs = spreadAlongAxis(sizing.pipeRowCount, width, width * 0.15);
    loopZs.forEach((offsetZ) => {
      heaters.push({
        x: 0,
        y: 0.08,
        z: offsetZ,
        kind: "geothermal",
      });
    });
  }

  return {
    exhaustFans,
    roofExhaustFans,
    circulationFans,
    padWalls,
    acUnits,
    vents,
    heaters,
    fogLines,
  };
}
