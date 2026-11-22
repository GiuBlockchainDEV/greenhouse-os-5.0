import { twinLaunchScenarioById } from "@/lib/twin/launchScenarios";
import { markTwinLaunchComplete } from "@/lib/twin/twinLaunchState";
import { useGreenhouseStore } from "@/store/useGreenhouseStore";

/** Load a curated demo twin: market preset, site weather, spatial heatmap, day clock. */
export function applyTwinLaunchScenario(scenarioId: string): boolean {
  const scenario = twinLaunchScenarioById(scenarioId);
  if (!scenario) {
    return false;
  }

  const store = useGreenhouseStore.getState();
  store.applyMarketPreset(scenario.presetId);
  useGreenhouseStore.setState({
    location: scenario.location,
    climateScenario: {
      ...useGreenhouseStore.getState().climateScenario,
      ...scenario.climatePatch,
    },
    heatmapMode: scenario.heatmapMode,
    twinRuntime: {
      ...useGreenhouseStore.getState().twinRuntime,
      clockMin: scenario.twinClockMin,
      autoAdvance: scenario.twinAutoAdvance,
      timeScale: scenario.twinTimeScale,
      baselineTempC: scenario.climatePatch.externalTempC ?? store.climateScenario.externalTempC,
      baselineRhPct: scenario.climatePatch.externalRhPct ?? store.climateScenario.externalRhPct,
      baselineWindMS: scenario.climatePatch.windSpeedMS ?? store.climateScenario.windSpeedMS,
    },
  });

  markTwinLaunchComplete();
  return true;
}