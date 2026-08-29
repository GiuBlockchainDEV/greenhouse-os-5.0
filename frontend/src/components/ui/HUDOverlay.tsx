import { useTranslation } from "react-i18next";

import { GizmoToolbar } from "@/components/ui/GizmoToolbar";
import { StatusBadge } from "@/components/ui/StatusBadge";
import { useGreenhouseStore } from "@/store/useGreenhouseStore";

export function HUDOverlay() {
  const { t: tCommon } = useTranslation("common");
  const { t: tSim } = useTranslation("simulation");
  const { t: tCrops } = useTranslation("crops");
  const { t: tControls } = useTranslation("3d_controls");

  const structure = useGreenhouseStore((state) => state.structure);
  const name = useGreenhouseStore((state) => state.name);
  const metrics = useGreenhouseStore((state) => state.metrics);
  const crop = useGreenhouseStore((state) => state.crop);
  const climateEquipment = useGreenhouseStore((state) => state.climateEquipment);
  const location = useGreenhouseStore((state) => state.location);

  return (
    <div className="pointer-events-none absolute inset-x-0 top-0 z-10 flex items-start justify-between gap-4 p-4">
      <div className="ui-card max-w-[min(100%,20rem)] px-4 py-3">
        <div className="flex items-start gap-2.5">
          <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-gradient-to-br from-emerald-500 to-status-optimalDark">
            <svg viewBox="0 0 24 24" className="h-4 w-4 text-white" fill="currentColor" aria-hidden>
              <path d="M12 3L4 9v12h16V9l-8-6zm0 2.2L18 10v9H6v-9l6-4.8z" />
            </svg>
          </div>
          <div>
            <h2 className="text-sm font-bold text-gray-900">{name}</h2>
            <p className="mt-0.5 font-mono text-[11px] text-label">
              {location.label}
              {location.lat != null && location.lon != null && (
                <>
                  {" "}
                  · {location.lat.toFixed(4)}°, {location.lon.toFixed(4)}°
                </>
              )}
            </p>
            <p className="mt-1.5 text-xs text-label">
              {tCrops(`types.${crop.type}`)} · {tCrops(`systems.${crop.system}`)} ·{" "}
              {tCrops(`stages.${crop.growthStage}`)}
            </p>
            <p className="mt-0.5 text-xs text-gray-400">
              {structure.bayCount} {tControls("structure.baysShort")} ·{" "}
              {tControls(`structure.archTypes.${structure.archType}`)}
            </p>
            <p className="mt-0.5 text-[11px] text-gray-400">
              {crop.layout.tierCount} {tCrops("labels.tiersShort")} ·{" "}
              {tSim(`equipment.coolingOptions.${climateEquipment.cooling}`)}
            </p>
          </div>
        </div>
      </div>

      <div className="pointer-events-auto flex w-[min(100%,22rem)] shrink-0 flex-col gap-2">
        <div className="ui-card px-4 py-3">
          <div className="mb-2 flex items-center justify-between gap-3">
            <span className="text-xs font-semibold text-gray-800">
              {tSim("metrics.overview", { defaultValue: "Overview" })}
            </span>
            <StatusBadge
              label={tSim("metrics.live", { defaultValue: "Live" })}
              tone="sync"
            />
          </div>
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
