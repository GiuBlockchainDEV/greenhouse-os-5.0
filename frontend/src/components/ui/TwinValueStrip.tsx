import { useMemo } from "react";
import { useTranslation } from "react-i18next";

import { useTwinMicroclimateView } from "@/hooks/useTwinMicroclimateView";
import { computeOfflineTwinRecommendations } from "@/lib/twin/offlineTwinAdvisor";
import { useGreenhouseStore } from "@/store/useGreenhouseStore";

export function TwinValueStrip() {
  const { t } = useTranslation("experience");
  const view = useTwinMicroclimateView();
  const crop = useGreenhouseStore((s) => s.crop);
  const equipment = useGreenhouseStore((s) => s.climateEquipment);
  const scenario = useGreenhouseStore((s) => s.climateScenario);
  const covering = useGreenhouseStore((s) => s.covering);
  const shadingScreen = useGreenhouseStore((s) => s.shadingScreen);
  const dimensions = useGreenhouseStore((s) => s.dimensions);
  const simulationStatus = useGreenhouseStore((s) => s.simulationStatus);
  const micro = useGreenhouseStore((s) => s.simulationResults?.microclimate);
  const heatmapMode = useGreenhouseStore((s) => s.heatmapMode);

  const topAction = useMemo(() => {
    const recs = computeOfflineTwinRecommendations({
      crop,
      equipment,
      scenario,
      covering,
      shadingScreen,
      dimensions,
      micro,
      physicsConnected: simulationStatus === "connected",
    }).filter((item) => item.id !== "stable-ok");
    return recs[0]?.impactHint ?? recs[0]?.rationale ?? null;
  }, [
    crop,
    equipment,
    scenario,
    covering,
    shadingScreen,
    dimensions,
    micro,
    simulationStatus,
  ]);

  const vpdTone =
    view.vpdKpa >= 0.8 && view.vpdKpa <= 1.25
      ? "bg-emerald-600 text-white"
      : view.vpdKpa > 1.6
        ? "bg-amber-500 text-white"
        : "bg-sky-600 text-white";

  return (
    <div className="pointer-events-none absolute inset-x-0 top-[7.5rem] z-20 flex justify-center px-4">
      <div className="pointer-events-auto flex max-w-3xl flex-wrap items-center justify-center gap-2 rounded-2xl border border-white/60 bg-white/90 px-3 py-2 shadow-lg backdrop-blur-md">
        <span
          className={`rounded-full px-2 py-0.5 text-[10px] font-bold uppercase tracking-wide ${
            view.source === "live" ? "bg-emerald-100 text-emerald-900" : "bg-gray-100 text-gray-700"
          }`}
        >
          {view.source === "live" ? t("valueStrip.sourceLive") : t("valueStrip.sourcePreview")}
        </span>
        <MetricPill label={t("valueStrip.opex")} value={`€${view.opexEurDay.toFixed(0)}`} suffix={t("valueStrip.perDay")} highlight />
        <MetricPill label={t("valueStrip.energy")} value={view.energyKwhM2Day.toFixed(2)} suffix="kWh/m²·d" />
        <MetricPill label={t("valueStrip.indoor")} value={`${view.internalTemp.toFixed(1)} °C`} />
        <MetricPill label={t("valueStrip.outdoor")} value={`${view.externalTemp.toFixed(1)} °C`} />
        <span className={`rounded-full px-2.5 py-1 text-[11px] font-mono font-bold ${vpdTone}`}>
          {t("valueStrip.vpd")} {view.vpdKpa.toFixed(2)} kPa
        </span>
        {heatmapMode !== "off" && (
          <span className="rounded-full bg-indigo-100 px-2 py-0.5 text-[10px] font-semibold uppercase text-indigo-900">
            3D heatmap
          </span>
        )}
        {topAction ? (
          <span className="hidden text-[10px] text-label lg:inline">
            {t("valueStrip.insightPrefix")} {topAction}
          </span>
        ) : null}
      </div>
    </div>
  );
}

function MetricPill({
  label,
  value,
  suffix,
  highlight = false,
}: {
  label: string;
  value: string;
  suffix?: string;
  highlight?: boolean;
}) {
  return (
    <div
      className={`rounded-xl px-2.5 py-1 text-[11px] ${
        highlight ? "bg-status-optimalDark text-white" : "bg-gray-50 text-gray-800"
      }`}
    >
      <span className="opacity-80">{label}</span>{" "}
      <span className="font-mono font-bold">
        {value}
        {suffix ? ` ${suffix}` : ""}
      </span>
    </div>
  );
}