import { useEffect } from "react";

import { climateScenarioFromClock } from "@/lib/twinScenarioClock";
import { useGreenhouseStore } from "@/store/useGreenhouseStore";

const TICK_MS = 250;

/** Advance virtual clock and map sun/weather when twin auto-play is enabled. */
export function useTwinScenarioClock(): void {
  const autoAdvance = useGreenhouseStore((s) => s.twinRuntime.autoAdvance);
  const timeScale = useGreenhouseStore((s) => s.twinRuntime.timeScale);
  const clockMin = useGreenhouseStore((s) => s.twinRuntime.clockMin);
  const setTwinRuntime = useGreenhouseStore((s) => s.setTwinRuntime);
  const setClimateScenario = useGreenhouseStore((s) => s.setClimateScenario);
  const twinRuntime = useGreenhouseStore((s) => s.twinRuntime);

  useEffect(() => {
    if (!autoAdvance) {
      return;
    }
    const handle = setInterval(() => {
      const nextClock = (clockMin + timeScale * 2) % 1440;
      setTwinRuntime({ clockMin: nextClock });
      setClimateScenario(
        climateScenarioFromClock(nextClock, {
          externalTempC: twinRuntime.baselineTempC,
          externalRhPct: twinRuntime.baselineRhPct,
          windSpeedMS: twinRuntime.baselineWindMS,
        }),
      );
    }, TICK_MS);
    return () => clearInterval(handle);
  }, [
    autoAdvance,
    timeScale,
    clockMin,
    setClimateScenario,
    setTwinRuntime,
    twinRuntime.baselineRhPct,
    twinRuntime.baselineTempC,
    twinRuntime.baselineWindMS,
  ]);

  useEffect(() => {
    if (autoAdvance) {
      return;
    }
    setClimateScenario(
      climateScenarioFromClock(clockMin, {
        externalTempC: twinRuntime.baselineTempC,
        externalRhPct: twinRuntime.baselineRhPct,
        windSpeedMS: twinRuntime.baselineWindMS,
      }),
    );
  }, [
    clockMin,
    autoAdvance,
    setClimateScenario,
    twinRuntime.baselineRhPct,
    twinRuntime.baselineTempC,
    twinRuntime.baselineWindMS,
  ]);
}