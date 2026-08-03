import { useTranslation } from "react-i18next";

import { useGreenhouseStore } from "@/store/useGreenhouseStore";
import type { GizmoMode, HeatmapMode } from "@/types/viewport";

const GIZMO_MODES: GizmoMode[] = ["off", "translate", "scale"];
const HEATMAP_MODES: HeatmapMode[] = ["off", "temperature", "vpd"];

export function GizmoToolbar() {
  const { t } = useTranslation("3d_controls");
  const gizmoMode = useGreenhouseStore((s) => s.gizmoMode);
  const heatmapMode = useGreenhouseStore((s) => s.heatmapMode);
  const setGizmoMode = useGreenhouseStore((s) => s.setGizmoMode);
  const setHeatmapMode = useGreenhouseStore((s) => s.setHeatmapMode);

  return (
    <div className="pointer-events-auto absolute right-4 top-4 z-20 flex flex-col gap-2">
      <div className="rounded-xl border border-greenhouse-700/80 bg-greenhouse-900/90 p-2 backdrop-blur-sm">
        <p className="mb-1.5 px-1 text-[10px] font-semibold uppercase tracking-wide text-greenhouse-400">
          {t("gizmo.title")}
        </p>
        <div className="flex gap-1">
          {GIZMO_MODES.map((mode) => (
            <ToolbarButton
              key={mode}
              label={t(`gizmo.${mode}`)}
              active={gizmoMode === mode}
              onClick={() => setGizmoMode(mode)}
            />
          ))}
        </div>
      </div>

      <div className="rounded-xl border border-greenhouse-700/80 bg-greenhouse-900/90 p-2 backdrop-blur-sm">
        <p className="mb-1.5 px-1 text-[10px] font-semibold uppercase tracking-wide text-greenhouse-400">
          {t("heatmap.title")}
        </p>
        <div className="flex gap-1">
          {HEATMAP_MODES.map((mode) => (
            <ToolbarButton
              key={mode}
              label={t(`heatmap.${mode}`)}
              active={heatmapMode === mode}
              onClick={() => setHeatmapMode(mode)}
            />
          ))}
        </div>
      </div>
    </div>
  );
}

interface ToolbarButtonProps {
  label: string;
  active: boolean;
  onClick: () => void;
}

function ToolbarButton({ label, active, onClick }: ToolbarButtonProps) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={`rounded-md px-2 py-1 text-xs font-medium transition ${
        active
          ? "bg-greenhouse-500 text-white"
          : "bg-greenhouse-800 text-greenhouse-300 hover:bg-greenhouse-700"
      }`}
    >
      {label}
    </button>
  );
}
