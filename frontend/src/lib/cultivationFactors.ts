/** Cultivation system factors — mirrors backend/app/simulation/cultivation.py */

import type { CropConfig, CultivationSystem } from "@/types/greenhouse";

export const CULTIVATION_ET_FACTOR: Record<CultivationSystem, number> = {
  soil: 0.92,
  substrate: 0.95,
  growbed: 0.98,
  nft: 1.05,
  dwc: 1.08,
  drip: 1.0,
  aeroponic: 1.12,
  ebb_flow: 1.02,
};

export const CULTIVATION_THERMAL_MASS: Record<CultivationSystem, number> = {
  soil: 1.25,
  substrate: 1.15,
  growbed: 1.2,
  nft: 0.85,
  dwc: 0.9,
  drip: 1.0,
  aeroponic: 0.8,
  ebb_flow: 1.05,
};

export const CULTIVATION_LAI_FACTOR: Record<CultivationSystem, number> = {
  soil: 1.0,
  substrate: 1.0,
  growbed: 1.05,
  nft: 0.95,
  dwc: 0.9,
  drip: 1.0,
  aeroponic: 0.85,
  ebb_flow: 1.0,
};

const LEGACY_SYSTEM: Record<string, CultivationSystem> = {
  hydroponic_nft: "nft",
  hydroponic_drip: "drip",
};

export function normalizeCultivationSystem(system: string): CultivationSystem {
  return (LEGACY_SYSTEM[system] ?? system) as CultivationSystem;
}

export function effectiveLai(
  baseLai: number,
  system: CultivationSystem,
  tierCount: number,
): number {
  const factor = CULTIVATION_LAI_FACTOR[system] ?? 1.0;
  const tierBoost = 1 + (Math.max(tierCount, 1) - 1) * 0.35;
  return baseLai * factor * tierBoost;
}

const CROP_KC: Record<string, number> = {
  tomato: 1.05,
  cucumber: 0.95,
  pepper: 0.9,
  lettuce: 0.8,
  strawberry: 0.85,
  cannabis: 1.1,
};

const STAGE_FACTOR: Record<string, number> = {
  seedling: 0.6,
  early_vegetative: 0.8,
  mid_season: 1.0,
  late_vegetative: 1.05,
  generative: 1.1,
  harvest: 0.9,
};

export function cropCoefficient(crop: CropConfig): number {
  const kc = CROP_KC[crop.type] ?? 1.0;
  const stage = STAGE_FACTOR[crop.growthStage] ?? 1.0;
  return kc * stage;
}

/** Latent heat of vaporization at 20 °C (J/kg). */
export const LATENT_HEAT_J_KG = 2.45e6;

/** Default reference ET₀ when live FAO-56 output is unavailable (mm/day). */
export const DEFAULT_ET0_MM_DAY = 4.0;
