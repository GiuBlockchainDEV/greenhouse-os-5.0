export type SupportedLocale = "en" | "it" | "es" | "fr";

export interface GreenhouseDimensions {
  length: number;
  width: number;
  ridgeHeight: number;
  eaveHeight: number;
}

export interface CoveringMaterial {
  type: "glass" | "polycarbonate" | "polyethylene" | "etfe";
  transmittance: number;
  uValue: number;
}

export type CropType =
  | "tomato"
  | "cucumber"
  | "pepper"
  | "lettuce"
  | "strawberry"
  | "cannabis";

export type GrowthStage =
  | "seedling"
  | "early_vegetative"
  | "mid_season"
  | "late_vegetative"
  | "generative"
  | "harvest";

export type CultivationSystem =
  | "hydroponic_nft"
  | "hydroponic_drip"
  | "substrate"
  | "soil";

export interface CropConfig {
  type: CropType;
  system: CultivationSystem;
  lai: number;
  growthStage: GrowthStage;
}

export interface GeoLocation {
  lat: number;
  lon: number;
  elevationM: number;
}

export interface GreenhouseState {
  name: string;
  location: GeoLocation;
  dimensions: GreenhouseDimensions;
  covering: CoveringMaterial;
  crop: CropConfig;
}

export interface DimensionUpdate {
  length?: number;
  width?: number;
  ridgeHeight?: number;
  eaveHeight?: number;
}

export interface VolumeMetrics {
  floorAreaM2: number;
  volumeM3: number;
  ridgeAngleDeg: number;
}
