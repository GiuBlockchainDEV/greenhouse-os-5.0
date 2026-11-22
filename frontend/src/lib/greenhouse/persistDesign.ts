import type { GreenhouseStoreSnapshot } from "@/types/greenhouse";

export const GREENHOUSE_DESIGN_STORAGE_KEY = "greenhouseos-twin-design-v1";

export interface PersistedGreenhouseDesign {
  version: 1;
  savedAt: string;
  snapshot: GreenhouseStoreSnapshot;
}

export function serializeGreenhouseSnapshot(state: {
  locale: GreenhouseStoreSnapshot["locale"];
  name: string;
  location: GreenhouseStoreSnapshot["location"];
  structure: GreenhouseStoreSnapshot["structure"];
  dimensions: GreenhouseStoreSnapshot["dimensions"];
  covering: GreenhouseStoreSnapshot["covering"];
  shadingScreen: GreenhouseStoreSnapshot["shadingScreen"];
  crop: GreenhouseStoreSnapshot["crop"];
  climateEquipment: GreenhouseStoreSnapshot["climateEquipment"];
  climateScenario: GreenhouseStoreSnapshot["climateScenario"];
  marketPresetId: string;
  twinRuntime: GreenhouseStoreSnapshot["twinRuntime"];
  heatmapMode: GreenhouseStoreSnapshot["heatmapMode"];
}): GreenhouseStoreSnapshot {
  return {
    locale: state.locale,
    name: state.name,
    location: state.location,
    structure: state.structure,
    dimensions: state.dimensions,
    covering: state.covering,
    shadingScreen: state.shadingScreen,
    crop: state.crop,
    climateEquipment: state.climateEquipment,
    climateScenario: state.climateScenario,
    marketPresetId: state.marketPresetId,
    twinRuntime: state.twinRuntime,
    heatmapMode: state.heatmapMode,
  };
}

export function persistGreenhouseDesign(snapshot: GreenhouseStoreSnapshot): void {
  try {
    const payload: PersistedGreenhouseDesign = {
      version: 1,
      savedAt: new Date().toISOString(),
      snapshot,
    };
    localStorage.setItem(GREENHOUSE_DESIGN_STORAGE_KEY, JSON.stringify(payload));
  } catch {
    /* quota / private mode */
  }
}

export function readGreenhouseDesign(): PersistedGreenhouseDesign | null {
  try {
    const raw = localStorage.getItem(GREENHOUSE_DESIGN_STORAGE_KEY);
    if (!raw) {
      return null;
    }
    const parsed = JSON.parse(raw) as PersistedGreenhouseDesign;
    if (parsed.version !== 1 || !parsed.snapshot) {
      return null;
    }
    return parsed;
  } catch {
    return null;
  }
}