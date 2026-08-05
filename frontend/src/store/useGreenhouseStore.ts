import { create } from "zustand";
import { devtools } from "zustand/middleware";

import { roofRiseM } from "@/lib/structureUtils";
import { computeCultivationLayout } from "@/lib/cultivationLayout";
import { DEFAULT_CLIMATE_SIZING } from "@/lib/climateEquipmentLayout";
import type {
  ClimateEquipment,
  ClimateEquipmentSizing,
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
  gutterLengthM: 30,
  plantsPerTier: 120,
  pathwayWidthM: 1.2,
  sideClearanceM: 0.6,
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
  heating: "none",
  ventilation: "roof_vents",
  sizing: DEFAULT_CLIMATE_SIZING,
};

const DEFAULT_LOCATION: GeoLocation = {
  lat: 41.9028,
  lon: 12.4964,
  elevationM: 21,
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
    totalWidthM: Number(width.toFixed(2)),
    bayCount: structure.bayCount,
    bedCoveragePct: Number(
      ((cultivation.cultivationAreaM2 / Math.max(crop.layout.tierCount, 1) / floorAreaM2) * 100).toFixed(1),
    ),
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
  setDimensions: (update: DimensionUpdate) => void;
  setCovering: (covering: Partial<CoveringMaterial>) => void;
  setCrop: (crop: Partial<CropConfig>) => void;
  setCropLayout: (layout: Partial<CultivationLayout>) => void;
  setClimateEquipment: (equipment: Partial<ClimateEquipment>) => void;
  setClimateEquipmentSizing: (sizing: Partial<ClimateEquipmentSizing>) => void;
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
        const structure = { ...get().structure, ...update };
        const dimensions = syncDimensionsFromStructure(structure, get().dimensions);
        set(
          {
            structure,
            dimensions,
            metrics: computeVolumeMetrics(structure, dimensions, get().crop),
          },
          false,
          "setStructure",
        );
      },

      setDimensions: (update) => {
        const structure = get().structure;
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
        const structure = get().structure;
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
        const structure = get().structure;
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

      setClimateEquipment: (equipment) => {
        const current = get().climateEquipment;
        const sizing = equipment.sizing
          ? { ...current.sizing, ...equipment.sizing }
          : current.sizing;
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

export { computeVolumeMetrics, syncDimensionsFromStructure };
