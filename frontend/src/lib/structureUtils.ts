/** Per-bay roof geometry helpers for 3D rendering and metrics. */

import type { ArchType, GreenhouseStructure } from "@/types/greenhouse";

export function normalizeBayArchTypes(
  bayCount: number,
  types: ArchType[],
): ArchType[] {
  const normalized = types.slice(0, bayCount);
  const fallback = normalized[normalized.length - 1] ?? "triangular";
  while (normalized.length < bayCount) {
    normalized.push(fallback);
  }
  return normalized;
}

export function bayApexHeight(
  archType: ArchType,
  eaveHeight: number,
  ridgeHeight: number,
  bayWidthM: number,
): number {
  if (archType === "semicircular") {
    return eaveHeight + bayWidthM / 2;
  }
  return ridgeHeight;
}

export function maxBayApexHeight(
  structure: GreenhouseStructure,
  eaveHeight: number,
  ridgeHeight: number,
): number {
  const types = normalizeBayArchTypes(structure.bayCount, structure.bayArchTypes);
  return Math.max(
    ...types.map((type) => bayApexHeight(type, eaveHeight, ridgeHeight, structure.bayWidthM)),
  );
}

export function bayCenterZ(
  bayIndex: number,
  bayWidthM: number,
  totalWidth: number,
): number {
  return -totalWidth / 2 + bayWidthM / 2 + bayIndex * bayWidthM;
}

export function structureHasArchType(
  structure: GreenhouseStructure,
  archType: ArchType,
): boolean {
  return normalizeBayArchTypes(structure.bayCount, structure.bayArchTypes).includes(
    archType,
  );
}
