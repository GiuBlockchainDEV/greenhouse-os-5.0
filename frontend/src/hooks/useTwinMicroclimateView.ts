import { useMemo } from "react";

import { computeOpexMetrics } from "@/lib/climateExport";
import { estimatePreviewMicroclimate } from "@/lib/previewMicroclimate";
import { useGreenhouseStore } from "@/store/useGreenhouseStore";

export interface TwinMicroclimateView {
  source: "live" | "preview";
  internalTemp: number;
  internalRh: number;
  externalTemp: number;
  vpdKpa: number;
  qSolar: number;
  qNetDelta: number;
  et0Fao56: number;
  opexEurDay: number;
  energyKwhM2Day: number;
}

/** Unified metrics for HUD, value strip, and dashboard (live WS or local FAO preview). */
export function useTwinMicroclimateView(): TwinMicroclimateView {
  const scenario = useGreenhouseStore((s) => s.climateScenario);
  const covering = useGreenhouseStore((s) => s.covering);
  const shadingScreen = useGreenhouseStore((s) => s.shadingScreen);
  const equipment = useGreenhouseStore((s) => s.climateEquipment);
  const dimensions = useGreenhouseStore((s) => s.dimensions);
  const crop = useGreenhouseStore((s) => s.crop);
  const metrics = useGreenhouseStore((s) => s.metrics);
  const simulationStatus = useGreenhouseStore((s) => s.simulationStatus);
  const results = useGreenhouseStore((s) => s.simulationResults);

  return useMemo(() => {
    const live = simulationStatus === "connected" && results?.microclimate;
    if (live && results?.thermal_balance) {
      const micro = results.microclimate;
      const thermal = results.thermal_balance;
      const opex = computeOpexMetrics(metrics.floorAreaM2, thermal.q_solar, thermal.q_net_delta);
      return {
        source: "live",
        internalTemp: micro.internal_temp,
        internalRh: micro.internal_rh,
        externalTemp: micro.external_temp,
        vpdKpa: micro.vpd_kpa,
        qSolar: thermal.q_solar,
        qNetDelta: thermal.q_net_delta,
        et0Fao56: micro.et0_fao56,
        opexEurDay: opex.opexEurDay,
        energyKwhM2Day: opex.energyKwhM2Day,
      };
    }

    const preview = estimatePreviewMicroclimate(
      scenario,
      covering,
      shadingScreen,
      equipment,
      dimensions,
      crop,
    );
    const qNetDelta = Math.max(
      -120,
      Math.min(180, (preview.internalTemp - preview.externalTemp) * 18 + preview.qSolar * 0.12),
    );
    const opex = computeOpexMetrics(metrics.floorAreaM2, preview.qSolar, qNetDelta);
    const et0 = Math.max(0.5, (scenario.solarIntensityPct / 100) * 7.5);

    return {
      source: "preview",
      internalTemp: preview.internalTemp,
      internalRh: preview.internalRh,
      externalTemp: preview.externalTemp,
      vpdKpa: preview.vpdKpa,
      qSolar: preview.qSolar,
      qNetDelta,
      et0Fao56: et0,
      opexEurDay: opex.opexEurDay,
      energyKwhM2Day: opex.energyKwhM2Day,
    };
  }, [
    scenario,
    covering,
    shadingScreen,
    equipment,
    dimensions,
    crop,
    metrics.floorAreaM2,
    simulationStatus,
    results,
  ]);
}