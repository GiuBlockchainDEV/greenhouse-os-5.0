import { useTranslation } from "react-i18next";

import { GizmoToolbar } from "@/components/ui/GizmoToolbar";
import { StatusBadge } from "@/components/ui/StatusBadge";
import { useTwinMicroclimateView } from "@/hooks/useTwinMicroclimateView";
import { useGreenhouseStore } from "@/store/useGreenhouseStore";

export function HUDOverlay() {
  const { t: tCommon } = useTranslation("common");
  const { t: tSim } = useTranslation("simulation");

  const metrics = useGreenhouseStore((state) => state.metrics);
  const simulationStatus = useGreenhouseStore((state) => state.simulationStatus);
  const view = useTwinMicroclimateView();

  const statusTone =
    simulationStatus === "connected"
      ? "optimal"
      : simulationStatus === "connecting"
        ? "warning"
        : simulationStatus === "error"
          ? "error"
          : "neutral";

  const statusLabel =
    simulationStatus === "connected"
      ? tSim("status.ready", { defaultValue: "Physics engine" })
      : tSim(`status.${simulationStatus}`, { defaultValue: simulationStatus });

  const microSnippet = `${view.internalTemp.toFixed(1)} °C · VPD ${view.vpdKpa.toFixed(2)} kPa · €${view.opexEurDay.toFixed(0)}/d${
    view.source === "preview" ? ` (${tSim("twin.previewMode", { defaultValue: "preview" })})` : ""
  }`;

  return (
    <div className="pointer-events-none absolute inset-x-0 top-0 z-10 flex items-start justify-end gap-4 p-4 pl-[min(100%,24rem)]">
      <div className="pointer-events-auto flex w-[min(100%,20rem)] shrink-0 flex-col gap-2">
        <div className="ui-card px-4 py-3">
          <div className="mb-2 flex items-center justify-between gap-3">
            <span className="text-xs font-semibold text-gray-800">
              {tSim("metrics.overview", { defaultValue: "Overview" })}
            </span>
            <StatusBadge label={statusLabel} tone={statusTone} pulse={simulationStatus === "connecting"} />
          </div>
          <p className="mb-2 font-mono text-[10px] text-label">{microSnippet}</p>
          <dl className="grid grid-cols-2 gap-x-5 gap-y-2 text-xs sm:grid-cols-3">
            <MetricItem label={tSim("metrics.floorArea")} value={`${metrics.floorAreaM2} ${tCommon("units.squareMeters")}`} />
            <MetricItem label={tSim("metrics.cultivationArea")} value={`${metrics.cultivationAreaM2} ${tCommon("units.squareMeters")}`} />
            <MetricItem label={tSim("metrics.totalPlants")} value={String(metrics.totalPlants)} highlight />
            <MetricItem label={tSim("metrics.volume")} value={`${metrics.volumeM3} ${tCommon("units.cubicMeters")}`} />
            <MetricItem label={tSim("metrics.bedCoverage")} value={`${metrics.bedCoveragePct}%`} />
            <MetricItem label={tSim("metrics.pathwayArea")} value={`${metrics.pathwayAreaM2} ${tCommon("units.squareMeters")}`} />
          </dl>
        </div>

        <GizmoToolbar />
      </div>
    </div>
  );
}

function MetricItem({
  label,
  value,
  highlight = false,
}: {
  label: string;
  value: string;
  highlight?: boolean;
}) {
  return (
    <div>
      <dt className="text-[10px] text-label">{label}</dt>
      <dd className={`font-mono text-xs font-semibold ${highlight ? "text-status-optimalDark" : "text-gray-800"}`}>
        {value}
      </dd>
    </div>
  );
}
