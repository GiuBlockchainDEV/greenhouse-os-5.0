import { useEffect, useRef } from "react";

import {
  persistGreenhouseDesign,
  readGreenhouseDesign,
  serializeGreenhouseSnapshot,
} from "@/lib/greenhouse/persistDesign";
import { computeVolumeMetrics, syncDimensionsFromStructure, useGreenhouseStore } from "@/store/useGreenhouseStore";
import { marketCultivationLayoutDefaults } from "@/lib/marketCultivationLayout";

const DEBOUNCE_MS = 1200;

/** Auto-restore and auto-save standalone twin state (no cloud telemetry). */
export function useGreenhousePersist(): void {
  const hydratedRef = useRef(false);

  useEffect(() => {
    if (hydratedRef.current) {
      return;
    }
    hydratedRef.current = true;
    const saved = readGreenhouseDesign();
    if (!saved) {
      return;
    }
    const { snapshot } = saved;
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
  }, []);

  useEffect(() => {
    let timer: ReturnType<typeof setTimeout> | null = null;
    const unsub = useGreenhouseStore.subscribe((state) => {
      if (timer) {
        clearTimeout(timer);
      }
      timer = setTimeout(() => {
        persistGreenhouseDesign(
          serializeGreenhouseSnapshot({
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
          }),
        );
      }, DEBOUNCE_MS);
    });
    return () => {
      unsub();
      if (timer) {
        clearTimeout(timer);
      }
    };
  }, []);
}