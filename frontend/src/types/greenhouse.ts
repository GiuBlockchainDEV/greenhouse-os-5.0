export type SupportedLocale = "en" | "it" | "es" | "fr";

export type ArchType = "triangular" | "semicircular";

/** Structural bay configuration — campate that scale greenhouse width. */
export interface GreenhouseStructure {
  /** Number of structural bays (campate) side-by-side. */
  bayCount: number;
  /** Width of each single bay in meters. Total width = bayCount × bayWidthM. */
  bayWidthM: number;
  /** Roof profile shared by all campate (triangular or semicircular). */
  archType: ArchType;
}

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

/** Cultivation method — affects transpiration, thermal mass, and spacing. */
export type CultivationSystem =
  | "soil"
  | "substrate"
  | "growbed"
  | "nft"
  | "dwc"
  | "drip"
  | "aeroponic"
  | "ebb_flow";

export interface CultivationLayout {
  /** Number of vertical growing levels (livelli), not structural bays. */
  tierCount: number;
  /** Length of each gutter or bed run in meters. */
  gutterLengthM: number;
  /** Plants per tier (approximate). */
  plantsPerTier: number;
  /** Central pathway width per bay (corsello) — not cultivable. */
  pathwayWidthM: number;
  /** Clearance from walls and bay edges. */
  sideClearanceM: number;
}

export type CoolingSystem =
  | "none"
  | "fan_and_pad"
  | "evaporative"
  | "mechanical_ac"
  | "high_pressure_fog";

export type HeatingSystem =
  | "none"
  | "hot_water_pipes"
  | "unit_heater"
  | "air_heater"
  | "geothermal";

export type VentilationSystem =
  | "natural_ridge"
  | "natural_gable"
  | "roof_vents"
  | "side_vents"
  | "forced_exhaust"
  | "combined";

export interface ClimateEquipment {
  cooling: CoolingSystem;
  heating: HeatingSystem;
  ventilation: VentilationSystem;
}

export interface CropConfig {
  type: CropType;
  system: CultivationSystem;
  lai: number;
  growthStage: GrowthStage;
  layout: CultivationLayout;
}

export interface GeoLocation {
  lat: number;
  lon: number;
  elevationM: number;
}

export interface GreenhouseState {
  name: string;
  location: GeoLocation;
  structure: GreenhouseStructure;
  dimensions: GreenhouseDimensions;
  covering: CoveringMaterial;
  crop: CropConfig;
  climate: ClimateEquipment;
}

export interface DimensionUpdate {
  length?: number;
  width?: number;
  ridgeHeight?: number;
  eaveHeight?: number;
}

export interface StructureUpdate {
  bayCount?: number;
  bayWidthM?: number;
  archType?: ArchType;
}

export interface VolumeMetrics {
  floorAreaM2: number;
  volumeM3: number;
  ridgeAngleDeg: number;
  cultivationAreaM2: number;
  pathwayAreaM2: number;
  totalPlants: number;
  totalWidthM: number;
  bayCount: number;
  bedCoveragePct: number;
}
