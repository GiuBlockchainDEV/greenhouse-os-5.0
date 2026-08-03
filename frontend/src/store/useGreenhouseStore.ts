import { create } from "zustand";
import { devtools } from "zustand/middleware";

import type {
  CoveringMaterial,
  CropConfig,
  DimensionUpdate,
  GeoLocation,
  GreenhouseDimensions,
  SupportedLocale,
  VolumeMetrics,
} from "@/types/greenhouse";

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

const DEFAULT_CROP: CropConfig = {
  type: "tomato",
  system: "hydroponic_nft",
  lai: 3.2,
  growthStage: "mid_season",
};

const DEFAULT_LOCATION: GeoLocation = {
  lat: 41.9028,
  lon: 12.4964,
  elevationM: 21,
};

function computeVolumeMetrics(dimensions: GreenhouseDimensions): VolumeMetrics {
  const { length, width, ridgeHeight, eaveHeight } = dimensions;
  const floorAreaM2 = length * width;
  const roofRise = Math.max(ridgeHeight - eaveHeight, 0);
  const volumeM3 = floorAreaM2 * eaveHeight + (floorAreaM2 * roofRise) / 2;
  const ridgeAngleDeg =
    width > 0 ? (Math.atan((2 * roofRise) / width) * 180) / Math.PI : 0;

  return {
    floorAreaM2: Number(floorAreaM2.toFixed(2)),
    volumeM3: Number(volumeM3.toFixed(2)),
    ridgeAngleDeg: Number(ridgeAngleDeg.toFixed(1)),
  };
}

interface GreenhouseStore {
  locale: SupportedLocale;
  name: string;
  location: GeoLocation;
  dimensions: GreenhouseDimensions;
  covering: CoveringMaterial;
  crop: CropConfig;
  metrics: VolumeMetrics;
  setLocale: (locale: SupportedLocale) => void;
  setName: (name: string) => void;
  setLocation: (location: Partial<GeoLocation>) => void;
  setDimensions: (update: DimensionUpdate) => void;
  setCovering: (covering: Partial<CoveringMaterial>) => void;
  setCrop: (crop: Partial<CropConfig>) => void;
  resetToDefaults: () => void;
}

export const useGreenhouseStore = create<GreenhouseStore>()(
  devtools(
    (set, get) => ({
      locale: "en",
      name: "Virtual Twin Alpha",
      location: DEFAULT_LOCATION,
      dimensions: DEFAULT_DIMENSIONS,
      covering: DEFAULT_COVERING,
      crop: DEFAULT_CROP,
      metrics: computeVolumeMetrics(DEFAULT_DIMENSIONS),

      setLocale: (locale) => set({ locale }, false, "setLocale"),

      setName: (name) => set({ name }, false, "setName"),

      setLocation: (location) =>
        set(
          { location: { ...get().location, ...location } },
          false,
          "setLocation",
        ),

      setDimensions: (update) => {
        const dimensions = { ...get().dimensions, ...update };
        set(
          {
            dimensions,
            metrics: computeVolumeMetrics(dimensions),
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

      setCrop: (crop) =>
        set({ crop: { ...get().crop, ...crop } }, false, "setCrop"),

      resetToDefaults: () =>
        set(
          {
            name: "Virtual Twin Alpha",
            location: DEFAULT_LOCATION,
            dimensions: DEFAULT_DIMENSIONS,
            covering: DEFAULT_COVERING,
            crop: DEFAULT_CROP,
            metrics: computeVolumeMetrics(DEFAULT_DIMENSIONS),
          },
          false,
          "resetToDefaults",
        ),
    }),
    { name: "greenhouse-store" },
  ),
);

export { computeVolumeMetrics };
