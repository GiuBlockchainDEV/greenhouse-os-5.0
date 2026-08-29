import { create } from "zustand";
import { devtools } from "zustand/middleware";

import { roofRiseM } from "@/lib/structureUtils";
import { computeCultivationLayout } from "@/lib/cultivationLayout";
import { defaultSystemForCrop } from "@/lib/cultivationConstants";
import { DEFAULT_CLIMATE_SIZING, applyCoolingSystemDefaults } from "@/lib/climateEquipmentLayout";
import type {
  ClimateEquipment,
  ClimateEquipmentSizing,
  ClimateScenario,
  CoveringMaterial,
  CropConfig,
  CultivationLayout,
  CropType,
  DimensionUpdate,
  GeoLocation,
  GreenhouseDimensions,
  GreenhouseStructure,
  StructureUpdate,
  SupportedLocale,
  VolumeMetrics,
} from "@/types/greenhouse";
import type { GizmoMode, HeatmapMode } from "@/types/viewport";
import type { AIProviderType } from "@/types/ai";
import type {
  WSConnectionStatus,
  WSSimulationResults,
} from "@/types/simulation";

type SimulationData = WSSimulationResults["data"];

const DEFAULT_STRUCTURE: GreenhouseStructure = {
  bayCount: 1,
  bayWidthM: 10,
  archType: "triangular",
};

const DEFAULT_DIMENSIONS: GreenhouseDimensions = {
  length: 30,
  width: 10,
  ridgeHeight: 4.5,
  eaveHeight: 3.0,
};

const DEFAULT_COVERING: CoveringMaterial = {
  type: "glass",
  transmittance: 0.85,
  uValue: 5.8,
};

const DEFAULT_LAYOUT: CultivationLayout = {
  tierCount: 1,
  gutterLengthM: 28.8,
  plantsPerTier: 0,
  plantDensity: 1.0,
  bedLineCount: 0,
  pathwayWidthM: 1.2,
  sideClearanceM: 0.6,
};

const DEFAULT_CROP: CropConfig = {
  type: "tomato",
  system: "substrate",
  lai: 3.2,
  growthStage: "mid_season",
  layout: DEFAULT_LAYOUT,
};

const DEFAULT_CLIMATE_EQUIPMENT: ClimateEquipment = {
  cooling: "none",
  heating: "none",
  ventilation: "natural_ridge",
  sizing: DEFAULT_CLIMATE_SIZING,
};

const DEFAULT_LOCATION: GeoLocation = {
  lat: 41.9028,
  lon: 12.4964,
  elevationM: 21,
  label: "Rome, Italy",
};

const DEFAULT_CLIMATE_SCENARIO: ClimateScenario = {
  externalTempC: 28,
  externalRhPct: 65,
  windSpeedMS: 2,
  solarAzimuthDeg: 180,
  solarElevationDeg: 55,
  solarIntensityPct: 85,
};

function syncDimensionsFromStructure(
  structure: GreenhouseStructure,
  dimensions: GreenhouseDimensions,
): GreenhouseDimensions {
  const width = structure.bayCount * structure.bayWidthM;
  return { ...dimensions, width };
}

function computeVolumeMetrics(
  structure: GreenhouseStructure,
  dimensions: GreenhouseDimensions,
  crop: CropConfig = DEFAULT_CROP,
): VolumeMetrics {
  const { length, eaveHeight, ridgeHeight } = dimensions;
  const width = structure.bayCount * structure.bayWidthM;
  const roofRise = roofRiseM(eaveHeight, ridgeHeight);

  let volumeM3 = 0;
  for (let bay = 0; bay < structure.bayCount; bay++) {
    const bayFloor = structure.bayWidthM * length;
    if (structure.archType === "semicircular") {
      const archArea = (Math.PI * structure.bayWidthM * roofRise) / 4;
      volumeM3 += bayFloor * eaveHeight + archArea * length;
    } else {
      volumeM3 += bayFloor * eaveHeight + (bayFloor * roofRise) / 2;
    }
  }

  const floorAreaM2 = length * width;
  const ridgeAngleDeg =
    structure.bayWidthM > 0
      ? (Math.atan((2 * roofRise) / structure.bayWidthM) * 180) / Math.PI
      : 0;

  const cultivation = computeCultivationLayout({
    length,
    totalWidth: width,
    bayCount: structure.bayCount,
    bayWidthM: structure.bayWidthM,
    eaveHeight,
    cropType: crop.type,
    system: crop.system,
    layout: crop.layout,
    lai: crop.lai,
    growthStage: crop.growthStage,
  });

  return {
    floorAreaM2: Number(floorAreaM2.toFixed(2)),
    volumeM3: Number(volumeM3.toFixed(2)),
    ridgeAngleDeg: Number(ridgeAngleDeg.toFixed(1)),
    cultivationAreaM2: Number(cultivation.cultivationAreaM2.toFixed(2)),
    pathwayAreaM2: Number(cultivation.pathwayAreaM2.toFixed(2)),
    totalPlants: cultivation.totalPlants,
    plantsPerTier: cultivation.plantsPerTier,
    bedLineCount: crop.layout.bedLineCount,
    totalBedLines: crop.layout.bedLineCount * structure.bayCount,
    totalWidthM: Number(width.toFixed(2)),
    bayCount: structure.bayCount,
    bedCoveragePct: Number(
      ((cultivation.cultivationAreaM2 / Math.max(crop.layout.tierCount, 1) / floorAreaM2) * 100).toFixed(1),
    ),
  };
}

function syncCropFromLayout(
  structure: GreenhouseStructure,
  dimensions: GreenhouseDimensions,
  crop: CropConfig,
): CropConfig {
  const width = structure.bayCount * structure.bayWidthM;
  const cultivation = computeCultivationLayout({
    length: dimensions.length,
    totalWidth: width,
    bayCount: structure.bayCount,
    bayWidthM: structure.bayWidthM,
    eaveHeight: dimensions.eaveHeight,
    cropType: crop.type,
    system: crop.system,
    layout: crop.layout,
    lai: crop.lai,
    growthStage: crop.growthStage,
  });

  return {
    ...crop,
    layout: {
      ...crop.layout,
      plantsPerTier: cultivation.plantsPerTier,
      gutterLengthM: Number(
        Math.max(1, dimensions.length - 2 * crop.layout.sideClearanceM).toFixed(1),
      ),
    },
  };
}

type CropConfigPatch = Partial<Omit<CropConfig, "layout">> & {
  layout?: Partial<CultivationLayout>;
};

function buildCropUpdate(
  structure: GreenhouseStructure,
  dimensions: GreenhouseDimensions,
  prev: CropConfig,
  patch: CropConfigPatch,
): { crop: CropConfig; metrics: VolumeMetrics } {
  let next: CropConfig = {
    ...prev,
    ...patch,
    layout: { ...prev.layout, ...(patch.layout ?? {}) },
  };

  if (patch.type && !patch.system) {
    next.system = defaultSystemForCrop(patch.type as CropType);
  }

  const synced = syncCropFromLayout(structure, dimensions, next);
  return {
    crop: synced,
    metrics: computeVolumeMetrics(structure, dimensions, synced),
  };
}

const initialDimensions = syncDimensionsFromStructure(DEFAULT_STRUCTURE, DEFAULT_DIMENSIONS);
const initialCrop = syncCropFromLayout(DEFAULT_STRUCTURE, initialDimensions, DEFAULT_CROP);
const initialMetrics = computeVolumeMetrics(DEFAULT_STRUCTURE, initialDimensions, initialCrop);

interface GreenhouseStore {
  locale: SupportedLocale;
  name: string;
  location: GeoLocation;
  structure: GreenhouseStructure;
  dimensions: GreenhouseDimensions;
  covering: CoveringMaterial;
  crop: CropConfig;
  climateEquipment: ClimateEquipment;
  climateScenario: ClimateScenario;
  metrics: VolumeMetrics;
  simulationStatus: WSConnectionStatus;
  simulationResults: SimulationData | null;
  gizmoMode: GizmoMode;
  heatmapMode: HeatmapMode;
  aiProvider: AIProviderType;
  setLocale: (locale: SupportedLocale) => void;
  setName: (name: string) => void;
  setLocation: (location: Partial<GeoLocation>) => void;
  setStructure: (update: StructureUpdate) => void;
  setDimensions: (update: DimensionUpdate) => void;
  setCovering: (covering: Partial<CoveringMaterial>) => void;
  setCrop: (crop: Partial<CropConfig>) => void;
  setCropLayout: (layout: Partial<CultivationLayout>) => void;
  setClimateEquipment: (equipment: Partial<ClimateEquipment>) => void;
  setClimateEquipmentSizing: (sizing: Partial<ClimateEquipmentSizing>) => void;
  setClimateScenario: (scenario: Partial<ClimateScenario>) => void;
  setSimulationStatus: (status: WSConnectionStatus) => void;
  setSimulationResults: (results: SimulationData) => void;
  setGizmoMode: (mode: GizmoMode) => void;
  setHeatmapMode: (mode: HeatmapMode) => void;
  setAiProvider: (provider: AIProviderType) => void;
  resetToDefaults: () => void;
}

export const useGreenhouseStore = create<GreenhouseStore>()(
  devtools(
    (set, get) => ({
      locale: "en",
      name: "Virtual Twin Alpha",
      location: DEFAULT_LOCATION,
      structure: DEFAULT_STRUCTURE,
      dimensions: initialDimensions,
      covering: DEFAULT_COVERING,
      crop: initialCrop,
      climateEquipment: DEFAULT_CLIMATE_EQUIPMENT,
      climateScenario: DEFAULT_CLIMATE_SCENARIO,
      metrics: initialMetrics,
      simulationStatus: "idle",
      simulationResults: null,
      gizmoMode: "off",
      heatmapMode: "off",
      aiProvider: "gemini",

      setLocale: (locale) => set({ locale }, false, "setLocale"),

      setName: (name) => set({ name }, false, "setName"),

      setLocation: (location) =>
        set(
          { location: { ...get().location, ...location } },
          false,
          "setLocation",
        ),

      setStructure: (update) => {
        const structure = { ...get().structure, ...update };
        const dimensions = syncDimensionsFromStructure(structure, get().dimensions);
        const { crop, metrics } = buildCropUpdate(structure, dimensions, get().crop, {});
        set({ structure, dimensions, crop, metrics }, false, "setStructure");
      },

      setDimensions: (update) => {
        const structure = get().structure;
        const dimensions = syncDimensionsFromStructure(structure, {
          ...get().dimensions,
          ...update,
        });
        const { crop, metrics } = buildCropUpdate(structure, dimensions, get().crop, {});
        set({ dimensions, crop, metrics }, false, "setDimensions");
      },

      setCovering: (covering) =>
        set(
          { covering: { ...get().covering, ...covering } },
          false,
          "setCovering",
        ),

      setCrop: (cropPatch) => {
        const structure = get().structure;
        const dimensions = get().dimensions;
        const { crop, metrics } = buildCropUpdate(structure, dimensions, get().crop, cropPatch);
        set({ crop, metrics }, false, "setCrop");
      },

      setCropLayout: (layoutPatch) => {
        const structure = get().structure;
        const dimensions = get().dimensions;
        const { crop, metrics } = buildCropUpdate(structure, dimensions, get().crop, {
          layout: layoutPatch,
        });
        set({ crop, metrics }, false, "setCropLayout");
      },

      setClimateEquipment: (equipment) => {
        const current = get().climateEquipment;
        const nextCooling = equipment.cooling ?? current.cooling;
        let sizing = equipment.sizing
          ? { ...current.sizing, ...equipment.sizing }
          : { ...current.sizing };
        if (equipment.cooling && equipment.cooling !== current.cooling) {
          sizing = applyCoolingSystemDefaults(nextCooling, sizing);
        }
        set(
          {
            climateEquipment: { ...current, ...equipment, sizing },
          },
          false,
          "setClimateEquipment",
        );
      },

      setClimateEquipmentSizing: (sizing) =>
        set(
          {
            climateEquipment: {
              ...get().climateEquipment,
              sizing: { ...get().climateEquipment.sizing, ...sizing },
            },
          },
          false,
          "setClimateEquipmentSizing",
        ),

      setClimateScenario: (scenario) =>
        set(
          { climateScenario: { ...get().climateScenario, ...scenario } },
          false,
          "setClimateScenario",
        ),

      setSimulationStatus: (simulationStatus) =>
        set({ simulationStatus }, false, "setSimulationStatus"),

      setSimulationResults: (simulationResults) =>
        set({ simulationResults }, false, "setSimulationResults"),

      setGizmoMode: (gizmoMode) => set({ gizmoMode }, false, "setGizmoMode"),

      setHeatmapMode: (heatmapMode) => set({ heatmapMode }, false, "setHeatmapMode"),

      setAiProvider: (aiProvider) => set({ aiProvider }, false, "setAiProvider"),

      resetToDefaults: () => {
        const dimensions = syncDimensionsFromStructure(DEFAULT_STRUCTURE, DEFAULT_DIMENSIONS);
        const crop = syncCropFromLayout(DEFAULT_STRUCTURE, dimensions, DEFAULT_CROP);
        set(
          {
            name: "Virtual Twin Alpha",
            location: DEFAULT_LOCATION,
            structure: DEFAULT_STRUCTURE,
            dimensions,
            covering: DEFAULT_COVERING,
            crop,
            climateEquipment: DEFAULT_CLIMATE_EQUIPMENT,
            climateScenario: DEFAULT_CLIMATE_SCENARIO,
            metrics: computeVolumeMetrics(DEFAULT_STRUCTURE, dimensions, crop),
          },
          false,
          "resetToDefaults",
        );
      },
    }),
    { name: "greenhouse-store" },
  ),
);

export { computeVolumeMetrics, syncDimensionsFromStructure };
