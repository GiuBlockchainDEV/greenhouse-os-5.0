import type { GreenhouseDimensions, GreenhouseStructure } from "@/types/greenhouse";

/** Total span along Z from multispan structure (authoritative over stale `dimensions.width`). */
export function structureTotalWidthM(structure: GreenhouseStructure): number {
  return structure.bayCount * structure.bayWidthM;
}

export interface GreenhouseEnvelope {
  length: number;
  width: number;
  halfLength: number;
  halfWidth: number;
}

export function greenhouseEnvelope(
  structure: GreenhouseStructure,
  dimensions: Pick<GreenhouseDimensions, "length">,
): GreenhouseEnvelope {
  const width = structureTotalWidthM(structure);
  const length = dimensions.length;
  return {
    length,
    width,
    halfLength: length / 2,
    halfWidth: width / 2,
  };
}