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
  /** Length of each gutter/bed run along X (pad wall to fan wall). Auto-synced. */
  gutterLengthM: number;
  /** Plants per tier — auto-synced from layout (read-only in UI). */
  plantsPerTier: number;
  /** Planting density multiplier (0.7 = sparse, 1.3 = dense). */
  plantDensity: number;
  /** Parallel cultivation lines per bay (0 = no lines). */
  bedLineCount: number;
  /** Pathway width between parallel lines across bay width (Z). */
  pathwayWidthM: number;
  /** Clearance from gable walls (X) and bay side walls (Z). */
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

export interface ClimateEquipmentSizing {
  /** Exhaust / circulation fan units (fan-and-pad, forced exhaust). */
  exhaustFanCount: number;
  /** Fan impeller diameter in meters. */
  exhaustFanDiameterM: number;
  /** Gable-roof exhaust fans above wall fans at the fan end. */
  roofExhaustFanCount: number;
  /** Roof exhaust fan impeller diameter in meters. */
  roofExhaustFanDiameterM: number;
  /** Horizontal circulation (HAF) fans inside the greenhouse. */
  circulationFanCount: number;
  /** Circulation fan impeller diameter in meters. */
  circulationFanDiameterM: number;
  /** Pad wall span along the gable width in meters. */
  padWallWidthM: number;
  /** Pad wall height in meters. */
  padWallHeightM: number;
  /** Roof-mounted or wall-mounted AC condenser units. */
  acUnitCount: number;
  /** AC unit cabinet width in meters. */
  acUnitWidthM: number;
  /** Motorized roof vent bays along the ridge. */
  roofVentCount: number;
  /** Individual roof vent opening width in meters. */
  roofVentWidthM: number;
  /** Side-wall louver sections per long wall. */
  sideVentCount: number;
  /** Side vent louver height in meters. */
  sideVentHeightM: number;
  /** Hanging or floor-mounted heater cabinets. */
  heaterUnitCount: number;
  /** Hot-water pipe rows running length-wise above the crop. */
  pipeRowCount: number;
  /** High-pressure fog lines under the roof. */
  fogLineCount: number;
}

export interface ClimateEquipment {
  cooling: CoolingSystem;
  heating: HeatingSystem;
  ventilation: VentilationSystem;
  sizing: ClimateEquipmentSizing;
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
  /** Human-readable site label sent to GAIA, e.g. "Rome, Italy". */
  label: string;
}

/** Season preset for GAIA location-aware analyses. */
export type GaiaAnalysisSeason = "simulation" | "summer" | "winter" | "shoulder";

/** External weather inputs used by the simulation and preview heatmap. */
export interface ClimateScenario {
  externalTempC: number;
  externalRhPct: number;
  windSpeedMS: number;
  /** Compass azimuth: 0° north, 90° east, 180° south, 270° west. */
  solarAzimuthDeg: number;
  /** Sun height above horizon in degrees. */
  solarElevationDeg: number;
  /** Relative solar intensity 0–100%. */
  solarIntensityPct: number;
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
  plantsPerTier: number;
  /** Parallel cultivation lines per bay. */
  bedLineCount: number;
  /** Total bed lines across all bays. */
  totalBedLines: number;
  totalWidthM: number;
  bayCount: number;
  bedCoveragePct: number;
}
