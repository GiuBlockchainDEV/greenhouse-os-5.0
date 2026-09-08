/**
 * Mechanical AC supply duct network inside the greenhouse.
 * One insulated trunk + length-wise spine per AC unit, with ceiling diffusers.
 */

import type { AcUnitPlacement, Vec3 } from "@/lib/climateEquipmentLayout";

export interface AcDuctSegment {
  start: Vec3;
  end: Vec3;
  diameterM: number;
  acUnitIndex: number;
}

export interface AcDuctDiffuser extends Vec3 {
  /** Horizontal blow direction (yaw radians, 0 = +X). */
  yaw: number;
  /** Gaussian reach for thermal mixing (m). */
  reachM: number;
  acUnitIndex: number;
}

export interface AcDuctNetwork {
  segments: AcDuctSegment[];
  diffusers: AcDuctDiffuser[];
}

const DUCT_DIFFUSER_SPACING_M = 4;
const ZONE_END_MARGIN_M = 1.2;

function ductDiameterM(unitWidthM: number): number {
  return 0.18 + 0.06 * (unitWidthM / 1.8);
}

function diffuserReachM(unitWidthM: number): number {
  return 1.6 + 0.35 * (unitWidthM / 1.8);
}

function buildUnitDuct(
  unit: AcUnitPlacement,
  unitIndex: number,
  zoneStartX: number,
  zoneEndX: number,
  halfWidth: number,
  eaveHeight: number,
): { segments: AcDuctSegment[]; diffusers: AcDuctDiffuser[] } {
  const segments: AcDuctSegment[] = [];
  const diffusers: AcDuctDiffuser[] = [];
  const diameter = ductDiameterM(unit.widthM);
  const reach = diffuserReachM(unit.widthM);
  const ductY = Math.max(2.1, Math.min(eaveHeight * 0.68, eaveHeight - 0.55));
  const trunkInset = Math.min(2.8, halfWidth * 0.44);

  const inwardZ =
    unit.wall === "south"
      ? halfWidth - trunkInset
      : -halfWidth + trunkInset;

  const trunkStart: Vec3 = {
    x: unit.x,
    y: ductY,
    z: unit.wall === "south" ? unit.z - unit.depthM * 0.55 : unit.z + unit.depthM * 0.55,
  };
  const trunkEnd: Vec3 = { x: unit.x, y: ductY, z: inwardZ };

  segments.push({
    start: trunkStart,
    end: trunkEnd,
    diameterM: diameter * 1.12,
    acUnitIndex: unitIndex,
  });

  const spineStartX = zoneStartX + ZONE_END_MARGIN_M;
  const spineEndX = zoneEndX - ZONE_END_MARGIN_M;
  if (spineEndX <= spineStartX + 0.5) {
    diffusers.push({
      x: unit.x,
      y: ductY - 0.06,
      z: inwardZ,
      yaw: unit.wall === "south" ? -Math.PI / 2 : Math.PI / 2,
      reachM: reach,
      acUnitIndex: unitIndex,
    });
    return { segments, diffusers };
  }

  segments.push({
    start: { x: spineStartX, y: ductY, z: inwardZ },
    end: { x: spineEndX, y: ductY, z: inwardZ },
    diameterM: diameter,
    acUnitIndex: unitIndex,
  });

  const spineLength = spineEndX - spineStartX;
  const diffuserCount = Math.max(2, Math.floor(spineLength / DUCT_DIFFUSER_SPACING_M) + 1);
  const blowYaw = unit.wall === "south" ? -Math.PI / 2 : Math.PI / 2;

  for (let index = 0; index < diffuserCount; index++) {
    const t = diffuserCount === 1 ? 0.5 : index / (diffuserCount - 1);
    diffusers.push({
      x: spineStartX + t * spineLength,
      y: ductY - 0.06,
      z: inwardZ,
      yaw: blowYaw,
      reachM: reach,
      acUnitIndex: unitIndex,
    });
  }

  return { segments, diffusers };
}

/** Build supply ducts and ceiling diffusers for all installed AC units. */
export function computeAcDuctNetwork(
  acUnits: AcUnitPlacement[],
  length: number,
  width: number,
  eaveHeight: number,
): AcDuctNetwork {
  if (acUnits.length === 0) {
    return { segments: [], diffusers: [] };
  }

  const halfWidth = width / 2;
  const halfLength = length / 2;
  const zoneLength = length / acUnits.length;
  const segments: AcDuctSegment[] = [];
  const diffusers: AcDuctDiffuser[] = [];

  acUnits.forEach((unit, unitIndex) => {
    const zoneStartX = -halfLength + unitIndex * zoneLength;
    const zoneEndX = zoneStartX + zoneLength;
    const { segments: unitSegments, diffusers: unitDiffusers } = buildUnitDuct(
      unit,
      unitIndex,
      zoneStartX,
      zoneEndX,
      halfWidth,
      eaveHeight,
    );
    segments.push(...unitSegments);
    diffusers.push(...unitDiffusers);
  });

  return { segments, diffusers };
}
