import { useEffect } from "react";

import { climateScenarioFromClock } from "@/lib/twinScenarioClock";
import { useGreenhouseStore } from "@/store/useGreenhouseStore";

const TICK_MS = 250;

function applyDiurnalScenarioFromStore(): void {
  const state = useGreenhouseStore.getState();
  const { twinRuntime } = state;
  state.setClimateScenario(
    climateScenarioFromClock(twinRuntime.clockMin, {
      externalTempC: twinRuntime.baselineTempC,
      externalRhPct: twinRuntime.baselineRhPct,
      windSpeedMS: twinRuntime.baselineWindMS,
    }),
  );
}

/** Advance virtual clock and map sun/weather when twin auto-play is enabled. */
export function useTwinScenarioClock(): void {
  const autoAdvance = useGreenhouseStore((s) => s.twinRuntime.autoAdvance);
  const clockMin = useGreenhouseStore((s) => s.twinRuntime.clockMin);

  useEffect(() => {
    if (!autoAdvance) {
      return;
    }
    const handle = setInterval(() => {
      const state = useGreenhouseStore.getState();
      const { twinRuntime, setTwinRuntime } = state;
      const nextClock = (twinRuntime.clockMin + twinRuntime.timeScale * 2) % 1440;
      setTwinRuntime({ clockMin: nextClock });
      applyDiurnalScenarioFromStore();
    }, TICK_MS);
    return () => clearInterval(handle);
  }, [autoAdvance]);

  useEffect(() => {
    if (autoAdvance) {
      return;
    }
    applyDiurnalScenarioFromStore();
  }, [clockMin, autoAdvance]);
}