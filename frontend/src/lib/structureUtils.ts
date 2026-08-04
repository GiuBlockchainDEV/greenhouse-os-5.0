/** Per-bay roof geometry helpers for 3D rendering and metrics. */

import type { ArchType, GreenhouseStructure } from "@/types/greenhouse";

/** Expand a single arch type to one entry per bay (all campate share the same roof). */
export function expandBayArchTypes(bayCount: number, archType: ArchType): ArchType[] {
  return Array.from({ length: Math.max(bayCount, 1) }, () => archType);
}

export function roofRiseM(eaveHeight: number, ridgeHeight: number): number {
  return Math.max(ridgeHeight - eaveHeight, 0.01);
}

export function bayApexHeight(
  _archType: ArchType,
  _eaveHeight: number,
  ridgeHeight: number,
  _bayWidthM: number,
): number {
  return ridgeHeight;
}

export function bayCenterZ(
  bayIndex: number,
  bayWidthM: number,
  totalWidth: number,
): number {
  return -totalWidth / 2 + bayWidthM / 2 + bayIndex * bayWidthM;
}

export function structureArchType(structure: GreenhouseStructure): ArchType {
  return structure.archType;
}
