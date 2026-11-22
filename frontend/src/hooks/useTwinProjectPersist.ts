import { useEffect, useRef } from "react";

import { marketCultivationLayoutDefaults } from "@/lib/marketCultivationLayout";
import {
  applyTwinFertigationSlice,
  applyTwinWorkspaceMode,
  buildTwinProjectBundle,
  persistTwinProject,
  readTwinProject,
} from "@/lib/twin/persistTwinProject";
import { useFertigationStore } from "@/store/useFertigationStore";
import { computeVolumeMetrics, syncDimensionsFromStructure, useGreenhouseStore } from "@/store/useGreenhouseStore";
import { useWorkspaceStore } from "@/store/useWorkspaceStore";

const DEBOUNCE_MS = 1400;

/** Unified twin persistence + cold start hydration (greenhouse + fertigation + workspace). */
export function useTwinProjectPersist(): void {
  const hydratedRef = useRef(false);

  useEffect(() => {
    if (hydratedRef.current) {
      return;
    }
    hydratedRef.current = true;

    const bundle = readTwinProject();
    if (!bundle) {
      if (!useFertigationStore.getState().activeProject) {
        useFertigationStore.getState().pushProjectToTwin();
      }
      return;
    }

    const { greenhouse: snapshot } = bundle;
    const dimensions = syncDimensionsFromStructure(snapshot.structure, snapshot.dimensions);
    const layoutDefaults = marketCultivationLayoutDefaults({
      lengthM: dimensions.length,
      bayWidthM: snapshot.structure.bayWidthM,
      system: snapshot.crop.system,
      crop: snapshot.crop.type,
    });
    const crop = {
      ...snapshot.crop,
      layout: { ...layoutDefaults, ...snapshot.crop.layout },
    };
    const metrics = computeVolumeMetrics(snapshot.structure, dimensions, crop);

    useGreenhouseStore.setState({
      locale: snapshot.locale,
      name: snapshot.name,
      location: snapshot.location,
      structure: snapshot.structure,
      dimensions,
      covering: snapshot.covering,
      shadingScreen: snapshot.shadingScreen,
      crop,
      climateEquipment: snapshot.climateEquipment,
      climateScenario: snapshot.climateScenario,
      twinRuntime: {
        ...useGreenhouseStore.getState().twinRuntime,
        ...snapshot.twinRuntime,
      },
      marketPresetId: snapshot.marketPresetId,
      heatmapMode: snapshot.heatmapMode,
      metrics,
    });

    applyTwinFertigationSlice(bundle.fertigation);
    applyTwinWorkspaceMode(bundle.workspaceMode);

    if (!bundle.fertigation.activeProject) {
      useFertigationStore.getState().pushProjectToTwin();
    }
  }, []);

  useEffect(() => {
    let timer: ReturnType<typeof setTimeout> | null = null;

    const flush = () => {
      persistTwinProject(buildTwinProjectBundle());
    };

    const debouncedFlush = () => {
      if (timer) {
        clearTimeout(timer);
      }
      timer = setTimeout(flush, DEBOUNCE_MS);
    };

    const unsubGh = useGreenhouseStore.subscribe(debouncedFlush);
    const unsubFert = useFertigationStore.subscribe(debouncedFlush);
    const unsubWs = useWorkspaceStore.subscribe(debouncedFlush);

    return () => {
      unsubGh();
      unsubFert();
      unsubWs();
      if (timer) {
        clearTimeout(timer);
      }
    };
  }, []);
}