/** Positions and dimensions for 3D climate equipment placement. */

import { computeAcDuctNetwork, type AcDuctNetwork } from "@/lib/acDuctLayout";

import type { BedZone } from "@/lib/cultivationLayout";
import { RATED_CAPACITY_DEFAULTS } from "@/lib/thermal/ratedCapacities";
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
  /** Insulated supply ducts and ceiling diffusers for mechanical AC. */
  acDucts: AcDuctNetwork;
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
  ...RATED_CAPACITY_DEFAULTS,
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
  ...RATED_CAPACITY_DEFAULTS,
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

/** Minimum clearance from short gable walls along greenhouse length (m). */
export const HAF_WALL_OFFSET_M = 3;

/** Pad wall may span up to 95% of the greenhouse width (gable face). */
export const PAD_WALL_MAX_SPAN_FRACTION = 0.95;

export function maxPadWallSpanM(greenhouseWidth: number): number {
  return Math.max(2, greenhouseWidth * PAD_WALL_MAX_SPAN_FRACTION);
}

export interface HafFanCountNormalization {
  requested: number;
  total: number;
  adjusted: boolean;
}

/**
 * HAF loops require:
 * - an even total fan count;
 * - the same number of fans per row in every bay (N_fila divisible by bayCount);
 * - at least one fan per row per bay (minimum 2 × bayCount).
 */
export function normalizeHafFanCount(
  requested: number,
  bayCount = 1,
): HafFanCountNormalization {
  const bays = Math.max(1, Math.floor(bayCount));
  if (requested <= 0) {
    return { requested, total: 0, adjusted: false };
  }

  let total = requested;
  if (total % 2 !== 0) {
    total += 1;
  }

  const minTotal = 2 * bays;
  if (total < minTotal) {
    total = minTotal;
  }

  let fansPerRow = total / 2;
  const bayRemainder = fansPerRow % bays;
  if (bayRemainder !== 0) {
    fansPerRow += bays - bayRemainder;
    total = fansPerRow * 2;
  }

  return { requested, total, adjusted: total !== requested };
}

export function hafFansPerBayPerRow(totalCount: number, bayCount = 1): number {
  const bays = Math.max(1, Math.floor(bayCount));
  const { total } = normalizeHafFanCount(totalCount, bays);
  if (total <= 0) return 0;
  return total / 2 / bays;
}

function computeHafRowXUserPositions(
  fanSlotCount: number,
  length: number,
  wallOffsetM: number,
): { row1: number[]; row2: number[] } {
  const effectiveOffset = Math.min(wallOffsetM, Math.max((length - 0.5) / 2, 0));
  const usefulSpace = Math.max(length - 2 * effectiveOffset, 0.5);

  if (fanSlotCount <= 0) {
    return { row1: [], row2: [] };
  }

  if (fanSlotCount === 1) {
    const center = effectiveOffset + usefulSpace / 2;
    return { row1: [center], row2: [center] };
  }

  const step = usefulSpace / (fanSlotCount - 1);
  const row1 = Array.from(
    { length: fanSlotCount },
    (_, index) => effectiveOffset + index * step,
  );
  const row2 = Array.from(
    { length: fanSlotCount },
    (_, index) => length - effectiveOffset - index * step,
  );
  return { row1, row2 };
}

function userXToSceneX(xUser: number, length: number): number {
  return xUser - length / 2;
}

/**
 * Balanced HAF circulation layout per bay:
 * - Row 1 at Z = bayCenter − bayWidth/4, blowing +X (outbound)
 * - Row 2 at Z = bayCenter + bayWidth/4, blowing −X (return)
 * - All fans in a row share distinct X slots along the full useful length
 * - Bays are filled round-robin so airflow covers length × width, not just a few lines
 */
export function distributeHafCirculationFans(params: {
  totalCount: number;
  length: number;
  width: number;
  bayCount: number;
  bayWidthM: number;
  eaveHeight: number;
  ridgeHeight: number;
  diameterM: number;
  wallOffsetM?: number;
}): CirculationFanPlacement[] {
  const {
    totalCount,
    length,
    width,
    bayCount,
    bayWidthM,
    eaveHeight,
    ridgeHeight,
    diameterM,
    wallOffsetM = HAF_WALL_OFFSET_M,
  } = params;

  const bays = Math.max(1, bayCount);
  const { total } = normalizeHafFanCount(totalCount, bays);
  if (total <= 0) return [];

  const fansPerRow = total / 2;
  const { row1: outboundXUser, row2: returnXUser } = computeHafRowXUserPositions(
    fansPerRow,
    length,
    wallOffsetM,
  );
  const hangY = Math.max(1.8, Math.min(eaveHeight - 0.65, ridgeHeight - 1.1));
  const fans: CirculationFanPlacement[] = [];

  for (let fanIndex = 0; fanIndex < fansPerRow; fanIndex++) {
    const bayIndex = fanIndex % bays;
    const bayCenter = bayCenterZ(bayIndex, bayWidthM, width);
    const row1Z = bayCenter - bayWidthM / 4;
    const row2Z = bayCenter + bayWidthM / 4;

    const outboundX = outboundXUser[fanIndex] ?? outboundXUser[0] ?? 0;
    const returnX = returnXUser[fanIndex] ?? returnXUser[0] ?? 0;

    fans.push({
      x: userXToSceneX(outboundX, length),
      y: hangY,
      z: row1Z,
      diameterM,
      yaw: 0,
    });
    fans.push({
      x: userXToSceneX(returnX, length),
      y: hangY,
      z: row2Z,
      diameterM,
      yaw: Math.PI,
    });
  }

  return fans;
}

export function computeClimateEquipmentLayout(params: {
  dimensions: GreenhouseDimensions;
  structure: GreenhouseStructure;
  equipment: ClimateEquipment;
  cultivationBeds?: BedZone[];
  bedLineCount?: number;
}): ClimateEquipmentLayout {
  const { dimensions, structure, equipment } = params;
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
    circulationFans.push(
      ...distributeHafCirculationFans({
        totalCount: sizing.circulationFanCount,
        length,
        width,
        bayCount,
        bayWidthM,
        eaveHeight,
        ridgeHeight,
        diameterM: sizing.circulationFanDiameterM,
      }),
    );
  }

  if (needsPadWall(equipment.cooling)) {
    padWalls.push({
      x: -halfLength + 0.06,
      y: sizing.padWallHeightM / 2 + 0.2,
      zCenter: 0,
      widthM: Math.min(sizing.padWallWidthM, maxPadWallSpanM(width)),
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

  const acDucts =
    equipment.cooling === "mechanical_ac"
      ? computeAcDuctNetwork(acUnits, length, width, eaveHeight)
      : { segments: [], diffusers: [] };

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

  if (equipment.heating === "hot_water_pipes") {
    const loopZs = spreadAlongAxis(Math.max(sizing.pipeRowCount, 1), width, width * 0.15);
    loopZs.forEach((offsetZ) => {
      heaters.push({
        x: 0,
        y: 0.35,
        z: offsetZ,
        kind: "unit",
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
    acDucts,
    vents,
    heaters,
    fogLines,
  };
}
