import { FERTIGATION_PROJECT_STORAGE_KEY } from "@/lib/fertigation/componentCatalog";
import {
  GREENHOUSE_DESIGN_STORAGE_KEY,
  readGreenhouseDesign,
  serializeGreenhouseSnapshot,
  type PersistedGreenhouseDesign,
} from "@/lib/greenhouse/persistDesign";
import { readFertigationProjectFromStorage } from "@/lib/fertigation/persistProject";
import { useFertigationStore } from "@/store/useFertigationStore";
import { useGreenhouseStore } from "@/store/useGreenhouseStore";
import { useWorkspaceStore } from "@/store/useWorkspaceStore";
import {
  TWIN_PROJECT_STORAGE_KEY,
  type TwinFertigationSlice,
  type TwinProjectBundle,
  type TwinWorkspaceMode,
} from "@/types/twinProject";

export function buildTwinProjectBundle(): TwinProjectBundle {
  const gh = useGreenhouseStore.getState();
  const fert = useFertigationStore.getState();
  return {
    version: 1,
    savedAt: new Date().toISOString(),
    workspaceMode: useWorkspaceStore.getState().mode,
    greenhouse: serializeGreenhouseSnapshot({
      locale: gh.locale,
      name: gh.name,
      location: gh.location,
      structure: gh.structure,
      dimensions: gh.dimensions,
      covering: gh.covering,
      shadingScreen: gh.shadingScreen,
      crop: gh.crop,
      climateEquipment: gh.climateEquipment,
      climateScenario: gh.climateScenario,
      marketPresetId: gh.marketPresetId,
      twinRuntime: gh.twinRuntime,
      heatmapMode: gh.heatmapMode,
    }),
    fertigation: {
      marketPresetId: fert.marketPresetId,
      templateId: fert.templateId,
      syncWithGreenhouse: fert.syncWithGreenhouse,
      studioView: fert.studioView,
      activeProject: fert.activeProject,
    },
  };
}

export function persistTwinProject(bundle: TwinProjectBundle): void {
  try {
    localStorage.setItem(TWIN_PROJECT_STORAGE_KEY, JSON.stringify(bundle));
    const legacyGreenhouse: PersistedGreenhouseDesign = {
      version: 1,
      savedAt: bundle.savedAt,
      snapshot: bundle.greenhouse,
    };
    localStorage.setItem(GREENHOUSE_DESIGN_STORAGE_KEY, JSON.stringify(legacyGreenhouse));
    if (bundle.fertigation.activeProject) {
      localStorage.setItem(
        FERTIGATION_PROJECT_STORAGE_KEY,
        JSON.stringify(bundle.fertigation.activeProject),
      );
    }
  } catch {
    /* quota */
  }
}

export function readTwinProject(): TwinProjectBundle | null {
  try {
    const raw = localStorage.getItem(TWIN_PROJECT_STORAGE_KEY);
    if (raw) {
      const parsed = JSON.parse(raw) as TwinProjectBundle;
      if (parsed.version === 1 && parsed.greenhouse && parsed.fertigation) {
        return parsed;
      }
    }
  } catch {
    /* ignore */
  }
  return migrateLegacyTwinBundle();
}

function migrateLegacyTwinBundle(): TwinProjectBundle | null {
  const greenhouse = readGreenhouseDesign();
  const fertigationProject = readFertigationProjectFromStorage();
  const fert = useFertigationStore.getState();
  if (!greenhouse && !fertigationProject) {
    return null;
  }
  return {
    version: 1,
    savedAt: new Date().toISOString(),
    workspaceMode: useWorkspaceStore.getState().mode,
    greenhouse:
      greenhouse?.snapshot ??
      serializeGreenhouseSnapshot({
        locale: useGreenhouseStore.getState().locale,
        name: useGreenhouseStore.getState().name,
        location: useGreenhouseStore.getState().location,
        structure: useGreenhouseStore.getState().structure,
        dimensions: useGreenhouseStore.getState().dimensions,
        covering: useGreenhouseStore.getState().covering,
        shadingScreen: useGreenhouseStore.getState().shadingScreen,
        crop: useGreenhouseStore.getState().crop,
        climateEquipment: useGreenhouseStore.getState().climateEquipment,
        climateScenario: useGreenhouseStore.getState().climateScenario,
        marketPresetId: useGreenhouseStore.getState().marketPresetId,
        twinRuntime: useGreenhouseStore.getState().twinRuntime,
        heatmapMode: useGreenhouseStore.getState().heatmapMode,
      }),
    fertigation: {
      marketPresetId: fert.marketPresetId,
      templateId: fert.templateId,
      syncWithGreenhouse: fert.syncWithGreenhouse,
      studioView: fert.studioView,
      activeProject: fertigationProject,
    },
  };
}

export function applyTwinFertigationSlice(slice: TwinFertigationSlice): void {
  useFertigationStore.setState({
    marketPresetId: slice.marketPresetId,
    templateId: slice.templateId,
    syncWithGreenhouse: slice.syncWithGreenhouse,
    studioView: slice.studioView,
    activeProject: slice.activeProject,
  });
}

export function applyTwinWorkspaceMode(mode: TwinWorkspaceMode): void {
  useWorkspaceStore.getState().setMode(mode);
}