import { useEffect, useRef } from "react";

import { applyGreenhouseContextToProject } from "@/lib/fertigation/syncFromGreenhouse";
import { persistFertigationProjectToStorage } from "@/lib/fertigation/persistProject";
import { marketPresetById, marketPresetLabel } from "@/lib/marketGreenhousePresets";
import { useFertigationStore } from "@/store/useFertigationStore";
import { useGreenhouseStore } from "@/store/useGreenhouseStore";

const DEBOUNCE_MS = 400;

/** Keep fertigation P&ID crop nodes aligned with greenhouse geometry and physics. */
export function useFertigationGreenhouseSync(): void {
  const syncEnabled = useFertigationStore((s) => s.syncWithGreenhouse);
  const activeProject = useFertigationStore((s) => s.activeProject);
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    if (!syncEnabled || !activeProject) {
      return;
    }

    const runSync = () => {
      const fert = useFertigationStore.getState();
      if (!fert.syncWithGreenhouse || !fert.activeProject) {
        return;
      }
      const gh = useGreenhouseStore.getState();
      const ghMarket = marketPresetById(gh.marketPresetId);
      const micro = gh.simulationResults?.microclimate;
      const thermal = gh.simulationResults?.thermal_balance;
      const next = applyGreenhouseContextToProject(fert.activeProject, {
        system: gh.crop.system,
        cropType: gh.crop.type,
        metrics: gh.metrics,
        marketPresetLabel: ghMarket ? marketPresetLabel(ghMarket) : undefined,
        vpdKpa: micro?.vpd_kpa,
        internalTempC: micro?.internal_temp,
        internalRhPct: micro?.internal_rh,
        transpirationWm2: thermal?.q_transpiration,
        et0MmDay: micro?.et0_fao56,
      });
      persistFertigationProjectToStorage(next);
      useFertigationStore.setState((state) => ({
        activeProject: next,
        projectRevision: state.projectRevision + 1,
      }));
    };

    const schedule = () => {
      if (timerRef.current) {
        clearTimeout(timerRef.current);
      }
      timerRef.current = setTimeout(runSync, DEBOUNCE_MS);
    };

    const unsub = useGreenhouseStore.subscribe((state, prev) => {
      const linked =
        state.metrics !== prev.metrics ||
        state.crop !== prev.crop ||
        state.simulationResults !== prev.simulationResults ||
        state.marketPresetId !== prev.marketPresetId;
      if (linked) {
        schedule();
      }
    });

    return () => {
      unsub();
      if (timerRef.current) {
        clearTimeout(timerRef.current);
      }
    };
  }, [syncEnabled, activeProject]);
}