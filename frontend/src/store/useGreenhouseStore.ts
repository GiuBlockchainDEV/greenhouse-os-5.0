import { create } from "zustand";
import { devtools } from "zustand/middleware";

import {
  bayApexHeight,
  maxBayApexHeight,
  normalizeBayArchTypes,
  structureHasArchType,
} from "@/lib/structureUtils";
import type {
  ArchType,
  ClimateEquipment,
  CoveringMaterial,
  CropConfig,
  CultivationLayout,
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
  bayArchTypes: ["triangular"],
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
  gutterLengthM: 30,
  plantsPerTier: 120,
  aisleWidthM: 0.8,
};

const DEFAULT_CROP: CropConfig = {
  type: "tomato",
  system: "nft",
  lai: 3.2,
  growthStage: "mid_season",
  layout: DEFAULT_LAYOUT,
};

const DEFAULT_CLIMATE_EQUIPMENT: ClimateEquipment = {
  cooling: "fan_and_pad",
  heating: "hot_water_pipes",
  ventilation: "roof_vents",
};

const DEFAULT_LOCATION: GeoLocation = {
  lat: 41.9028,
  lon: 12.4964,
  elevationM: 21,
};

function withNormalizedStructure(structure: GreenhouseStructure): GreenhouseStructure {
  return {
    ...structure,
    bayArchTypes: normalizeBayArchTypes(structure.bayCount, structure.bayArchTypes),
  };
}

function syncDimensionsFromStructure(
  structure: GreenhouseStructure,
  dimensions: GreenhouseDimensions,
): GreenhouseDimensions {
  const normalized = withNormalizedStructure(structure);
  const width = normalized.bayCount * normalized.bayWidthM;
  const ridgeHeight = maxBayApexHeight(
    normalized,
    dimensions.eaveHeight,
    dimensions.ridgeHeight,
  );
  return { ...dimensions, width, ridgeHeight };
}

function computeVolumeMetrics(
  structure: GreenhouseStructure,
  dimensions: GreenhouseDimensions,
  crop: CropConfig = DEFAULT_CROP,
): VolumeMetrics {
  const normalized = withNormalizedStructure(structure);
  const { length, eaveHeight, ridgeHeight } = dimensions;
  const width = normalized.bayCount * normalized.bayWidthM;

  let volumeM3 = 0;
  for (const archType of normalized.bayArchTypes) {
    const bayFloor = normalized.bayWidthM * length;
    if (archType === "semicircular") {
      const radius = normalized.bayWidthM / 2;
      const semicircleArea = (Math.PI * radius * radius) / 2;
      volumeM3 += bayFloor * eaveHeight + semicircleArea * length;
    } else {
      const roofRise = Math.max(ridgeHeight - eaveHeight, 0);
      volumeM3 += bayFloor * eaveHeight + (bayFloor * roofRise) / 2;
    }
  }

  const floorAreaM2 = length * width;
  const triangularBay = normalized.bayArchTypes.find((type) => type === "triangular");
  const ridgeAngleDeg =
    triangularBay && normalized.bayWidthM > 0
      ? (Math.atan((2 * Math.max(ridgeHeight - eaveHeight, 0)) / normalized.bayWidthM) *
          180) /
        Math.PI
      : 0;

  const tierCount = Math.max(crop.layout.tierCount, 1);
  const aisleWidth = crop.layout.aisleWidthM;
  const usableWidth = Math.max(
    width - aisleWidth * Math.max(tierCount - 1, 0),
    width * 0.6,
  );
  const cultivationAreaM2 = length * usableWidth * tierCount;
  const totalPlants = tierCount * crop.layout.plantsPerTier;

  return {
    floorAreaM2: Number(floorAreaM2.toFixed(2)),
    volumeM3: Number(volumeM3.toFixed(2)),
    ridgeAngleDeg: Number(ridgeAngleDeg.toFixed(1)),
    cultivationAreaM2: Number(cultivationAreaM2.toFixed(2)),
    totalPlants,
    totalWidthM: Number(width.toFixed(2)),
    bayCount: normalized.bayCount,
  };
}

interface GreenhouseStore {
  locale: SupportedLocale;
  name: string;
  location: GeoLocation;
  structure: GreenhouseStructure;
  dimensions: GreenhouseDimensions;
  covering: CoveringMaterial;
  crop: CropConfig;
  climateEquipment: ClimateEquipment;
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
  setBayArchType: (bayIndex: number, archType: ArchType) => void;
  setDimensions: (update: DimensionUpdate) => void;
  setCovering: (covering: Partial<CoveringMaterial>) => void;
  setCrop: (crop: Partial<CropConfig>) => void;
  setCropLayout: (layout: Partial<CultivationLayout>) => void;
  setClimateEquipment: (equipment: Partial<ClimateEquipment>) => void;
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
      dimensions: syncDimensionsFromStructure(DEFAULT_STRUCTURE, DEFAULT_DIMENSIONS),
      covering: DEFAULT_COVERING,
      crop: DEFAULT_CROP,
      climateEquipment: DEFAULT_CLIMATE_EQUIPMENT,
      metrics: computeVolumeMetrics(DEFAULT_STRUCTURE, DEFAULT_DIMENSIONS, DEFAULT_CROP),
      simulationStatus: "idle",
      simulationResults: null,
      gizmoMode: "off",
      heatmapMode: "off",
      aiProvider: "openai",

      setLocale: (locale) => set({ locale }, false, "setLocale"),

      setName: (name) => set({ name }, false, "setName"),

      setLocation: (location) =>
        set(
          { location: { ...get().location, ...location } },
          false,
          "setLocation",
        ),

      setStructure: (update) => {
        const merged = withNormalizedStructure({ ...get().structure, ...update });
        const dimensions = syncDimensionsFromStructure(merged, get().dimensions);
        set(
          {
            structure: merged,
            dimensions,
            metrics: computeVolumeMetrics(merged, dimensions, get().crop),
          },
          false,
          "setStructure",
        );
      },

      setBayArchType: (bayIndex, archType) => {
        const structure = withNormalizedStructure(get().structure);
        const bayArchTypes = [...structure.bayArchTypes];
        bayArchTypes[bayIndex] = archType;
        get().setStructure({ bayArchTypes });
      },

      setDimensions: (update) => {
        const structure = withNormalizedStructure(get().structure);
        const dimensions = syncDimensionsFromStructure(structure, {
          ...get().dimensions,
          ...update,
        });
        set(
          {
            dimensions,
            metrics: computeVolumeMetrics(structure, dimensions, get().crop),
          },
          false,
          "setDimensions",
        );
      },

      setCovering: (covering) =>
        set(
          { covering: { ...get().covering, ...covering } },
          false,
          "setCovering",
        ),

      setCrop: (crop) => {
        const structure = withNormalizedStructure(get().structure);
        const nextCrop = { ...get().crop, ...crop };
        set(
          {
            crop: nextCrop,
            metrics: computeVolumeMetrics(structure, get().dimensions, nextCrop),
          },
          false,
          "setCrop",
        );
      },

      setCropLayout: (layout) => {
        const structure = withNormalizedStructure(get().structure);
        const nextCrop = {
          ...get().crop,
          layout: { ...get().crop.layout, ...layout },
        };
        set(
          {
            crop: nextCrop,
            metrics: computeVolumeMetrics(structure, get().dimensions, nextCrop),
          },
          false,
          "setCropLayout",
        );
      },

      setClimateEquipment: (equipment) =>
        set(
          {
            climateEquipment: { ...get().climateEquipment, ...equipment },
          },
          false,
          "setClimateEquipment",
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
        set(
          {
            name: "Virtual Twin Alpha",
            location: DEFAULT_LOCATION,
            structure: DEFAULT_STRUCTURE,
            dimensions,
            covering: DEFAULT_COVERING,
            crop: DEFAULT_CROP,
            climateEquipment: DEFAULT_CLIMATE_EQUIPMENT,
            metrics: computeVolumeMetrics(DEFAULT_STRUCTURE, dimensions, DEFAULT_CROP),
          },
          false,
          "resetToDefaults",
        );
      },
    }),
    { name: "greenhouse-store" },
  ),
);

export { computeVolumeMetrics, syncDimensionsFromStructure, structureHasArchType, bayApexHeight };
