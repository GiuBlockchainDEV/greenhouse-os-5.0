import type { ClimateScenario, GeoLocation } from "@/types/greenhouse";
import type { HeatmapMode } from "@/types/viewport";

export interface TwinLaunchScenario {
  id: string;
  presetId: string;
  location: GeoLocation;
  climatePatch: Partial<ClimateScenario>;
  heatmapMode: HeatmapMode;
  twinClockMin: number;
  twinAutoAdvance: boolean;
  twinTimeScale: number;
  icon: "venlo" | "tunnel" | "stress";
}

export const TWIN_LAUNCH_SCENARIOS: TwinLaunchScenario[] = [
  {
    id: "semi-closed-venlo",
    presetId: "kubo-ultra-clima",
    location: { label: "Westland, Netherlands", lat: 52.0, lon: 4.2, elevationM: 2 },
    climatePatch: {
      solarIntensityPct: 78,
      solarElevationDeg: 58,
      solarAzimuthDeg: 195,
      externalTempC: 26,
      externalRhPct: 68,
      windSpeedMS: 3.2,
    },
    heatmapMode: "temperature",
    twinClockMin: 660,
    twinAutoAdvance: true,
    twinTimeScale: 6,
    icon: "venlo",
  },
  {
    id: "fan-pad-tunnel",
    presetId: "richel-960",
    location: { label: "Emilia-Romagna, Italy", lat: 44.65, lon: 11.2, elevationM: 18 },
    climatePatch: {
      solarIntensityPct: 88,
      solarElevationDeg: 64,
      solarAzimuthDeg: 210,
      externalTempC: 32,
      externalRhPct: 55,
      windSpeedMS: 2.4,
    },
    heatmapMode: "vpd",
    twinClockMin: 780,
    twinAutoAdvance: true,
    twinTimeScale: 5,
    icon: "tunnel",
  },
  {
    id: "gulf-summer-stress",
    presetId: "certhon-suprimair",
    location: { label: "Al Khor, Qatar", lat: 25.68, lon: 51.5, elevationM: 6 },
    climatePatch: {
      solarIntensityPct: 96,
      solarElevationDeg: 72,
      solarAzimuthDeg: 230,
      externalTempC: 44,
      externalRhPct: 38,
      windSpeedMS: 4.5,
    },
    heatmapMode: "temperature",
    twinClockMin: 900,
    twinAutoAdvance: true,
    twinTimeScale: 8,
    icon: "stress",
  },
];

export function twinLaunchScenarioById(id: string): TwinLaunchScenario | undefined {
  return TWIN_LAUNCH_SCENARIOS.find((scenario) => scenario.id === id);
}