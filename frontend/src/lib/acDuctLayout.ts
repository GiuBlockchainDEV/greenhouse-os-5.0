/**
 * Mechanical AC supply duct network inside the greenhouse.
 * Full-length wall headers, cross-ducts spanning width, and ceiling diffusers.
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

const LONG_DIFFUSER_SPACING_M = 4;
const CROSS_DUCT_SPACING_M = 5.5;
const LENGTH_END_MARGIN_M = 1.5;
const WALL_HEADER_INSET_M = 0.85;

function ductDiameterM(unitWidthM: number): number {
  return 0.2 + 0.07 * (unitWidthM / 1.8);
}

function diffuserReachM(unitWidthM: number): number {
  return 2.4 + 0.5 * (unitWidthM / 1.8);
}

function addSegment(
  segments: AcDuctSegment[],
  start: Vec3,
  end: Vec3,
  diameterM: number,
  acUnitIndex: number,
): void {
  const dx = end.x - start.x;
  const dy = end.y - start.y;
  const dz = end.z - start.z;
  if (Math.hypot(dx, dy, dz) < 0.08) return;
  segments.push({ start, end, diameterM, acUnitIndex });
}

function addDiffusersAlongLine(
  diffusers: AcDuctDiffuser[],
  start: Vec3,
  end: Vec3,
  spacingM: number,
  yaw: number,
  reachM: number,
  acUnitIndex: number,
): void {
  const dx = end.x - start.x;
  const dz = end.z - start.z;
  const lineLength = Math.hypot(dx, dz);
  if (lineLength < 0.2) {
    diffusers.push({
      x: start.x,
      y: start.y - 0.06,
      z: start.z,
      yaw,
      reachM,
      acUnitIndex,
    });
    return;
  }

  const count = Math.max(2, Math.floor(lineLength / spacingM) + 1);
  for (let index = 0; index < count; index++) {
    const t = count === 1 ? 0.5 : index / (count - 1);
    diffusers.push({
      x: start.x + dx * t,
      y: start.y - 0.06,
      z: start.z + dz * t,
      yaw,
      reachM,
      acUnitIndex,
    });
  }
}

/** Build supply ducts spanning full greenhouse length and width. */
export function computeAcDuctNetwork(
  acUnits: AcUnitPlacement[],
  length: number,
  width: number,
  eaveHeight: number,
): AcDuctNetwork {
  if (acUnits.length === 0) {
    return { segments: [], diffusers: [] };
  }

  const segments: AcDuctSegment[] = [];
  const diffusers: AcDuctDiffuser[] = [];

  const halfLength = length / 2;
  const halfWidth = width / 2;
  const ductY = Math.max(2.1, Math.min(eaveHeight * 0.68, eaveHeight - 0.55));
  const spineStartX = -halfLength + LENGTH_END_MARGIN_M;
  const spineEndX = halfLength - LENGTH_END_MARGIN_M;
  const zSouth = halfWidth - WALL_HEADER_INSET_M;
  const zNorth = -halfWidth + WALL_HEADER_INSET_M;
  const zCenter = 0;

  const avgUnitWidth =
    acUnits.reduce((sum, unit) => sum + unit.widthM, 0) / acUnits.length;
  const mainDiameter = ductDiameterM(avgUnitWidth);
  const branchDiameter = mainDiameter * 0.82;
  const reach = diffuserReachM(avgUnitWidth);

  const southUnits = acUnits.filter((unit) => unit.wall === "south");
  const northUnits = acUnits.filter((unit) => unit.wall === "north");
  const primaryIndex = 0;

  if (southUnits.length > 0) {
    addSegment(
      segments,
      { x: spineStartX, y: ductY, z: zSouth },
      { x: spineEndX, y: ductY, z: zSouth },
      mainDiameter,
      primaryIndex,
    );
    addDiffusersAlongLine(
      diffusers,
      { x: spineStartX, y: ductY, z: zSouth },
      { x: spineEndX, y: ductY, z: zSouth },
      LONG_DIFFUSER_SPACING_M,
      -Math.PI / 2,
      reach,
      primaryIndex,
    );
  }

  if (northUnits.length > 0) {
    addSegment(
      segments,
      { x: spineStartX, y: ductY, z: zNorth },
      { x: spineEndX, y: ductY, z: zNorth },
      mainDiameter,
      primaryIndex,
    );
    addDiffusersAlongLine(
      diffusers,
      { x: spineStartX, y: ductY, z: zNorth },
      { x: spineEndX, y: ductY, z: zNorth },
      LONG_DIFFUSER_SPACING_M,
      Math.PI / 2,
      reach,
      primaryIndex,
    );
  }

  acUnits.forEach((unit, unitIndex) => {
    const headerZ = unit.wall === "south" ? zSouth : zNorth;
    const trunkStart: Vec3 = {
      x: unit.x,
      y: ductY,
      z: unit.wall === "south" ? unit.z - unit.depthM * 0.5 : unit.z + unit.depthM * 0.5,
    };
    const trunkEnd: Vec3 = { x: unit.x, y: ductY, z: headerZ };
    addSegment(segments, trunkStart, trunkEnd, mainDiameter * 1.05, unitIndex);
    diffusers.push({
      x: unit.x,
      y: ductY - 0.06,
      z: headerZ,
      yaw: unit.wall === "south" ? -Math.PI / 2 : Math.PI / 2,
      reachM: reach * 1.1,
      acUnitIndex: unitIndex,
    });
  });

  const crossSpan = spineEndX - spineStartX;
  const crossCount = Math.max(2, Math.floor(crossSpan / CROSS_DUCT_SPACING_M) + 1);

  for (let crossIndex = 0; crossIndex < crossCount; crossIndex++) {
    const t = crossCount === 1 ? 0.5 : crossIndex / (crossCount - 1);
    const x = spineStartX + t * crossSpan;

    if (southUnits.length > 0 && northUnits.length > 0) {
      addSegment(
        segments,
        { x, y: ductY, z: zNorth },
        { x, y: ductY, z: zSouth },
        branchDiameter,
        primaryIndex,
      );
      addDiffusersAlongLine(
        diffusers,
        { x, y: ductY, z: zNorth },
        { x, y: ductY, z: zSouth },
        Math.max(3, width / 5),
        0,
        reach * 0.95,
        primaryIndex,
      );
      diffusers.push({
        x,
        y: ductY - 0.06,
        z: zCenter,
        yaw: 0,
        reachM: reach * 1.15,
        acUnitIndex: primaryIndex,
      });
    } else if (southUnits.length > 0) {
      addSegment(
        segments,
        { x, y: ductY, z: zSouth },
        { x, y: ductY, z: zCenter },
        branchDiameter,
        primaryIndex,
      );
      addDiffusersAlongLine(
        diffusers,
        { x, y: ductY, z: zSouth },
        { x, y: ductY, z: zCenter },
        Math.max(2.5, (zSouth - zCenter) / 2),
        -Math.PI / 2,
        reach,
        primaryIndex,
      );
    } else {
      addSegment(
        segments,
        { x, y: ductY, z: zNorth },
        { x, y: ductY, z: zCenter },
        branchDiameter,
        primaryIndex,
      );
      addDiffusersAlongLine(
        diffusers,
        { x, y: ductY, z: zNorth },
        { x, y: ductY, z: zCenter },
        Math.max(2.5, (zCenter - zNorth) / 2),
        Math.PI / 2,
        reach,
        primaryIndex,
      );
    }
  }

  return { segments, diffusers };
}
