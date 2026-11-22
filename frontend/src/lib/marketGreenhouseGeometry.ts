import type { GreenhouseStructure } from "@/types/greenhouse";

export interface MarketGeometryInput {
  bays: number;
  bayM: number;
  arch: GreenhouseStructure["archType"];
  eaveM: number;
  ridgeM: number;
}

/** Enforce plausible roof rise for catalog entries (Venlo vs tunnel arcs). */
export function normalizeMarketRidgeHeights(input: MarketGeometryInput): { eaveM: number; ridgeM: number } {
  const eaveM = input.eaveM;
  let ridgeM = input.ridgeM;
  const rise = ridgeM - eaveM;
  const minRise = input.arch === "triangular" ? input.bayM * 0.14 : input.bayM * 0.22;
  const maxRise = input.arch === "triangular" ? input.bayM * 0.55 : input.bayM * 0.62;
  if (rise < minRise) {
    ridgeM = eaveM + minRise;
  } else if (rise > maxRise) {
    ridgeM = eaveM + maxRise;
  }
  return { eaveM, ridgeM: Number(ridgeM.toFixed(2)) };
}