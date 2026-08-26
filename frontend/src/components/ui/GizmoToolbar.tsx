import { useTranslation } from "react-i18next";

import { HeatmapControls } from "@/components/ui/HeatmapControls";
import { useGreenhouseStore } from "@/store/useGreenhouseStore";
import type { GizmoMode } from "@/types/viewport";

const GIZMO_MODES: GizmoMode[] = ["off", "translate", "scale"];

export function GizmoToolbar() {
  const { t } = useTranslation("3d_controls");
  const gizmoMode = useGreenhouseStore((s) => s.gizmoMode);
  const setGizmoMode = useGreenhouseStore((s) => s.setGizmoMode);

  return (
    <div className="flex flex-col gap-2">
      <div className="ui-card p-2">
        <p className="ui-section-title mb-1.5 px-1">{t("gizmo.title")}</p>
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

      <HeatmapControls />
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
      className={`rounded-lg px-2 py-1 text-xs font-medium transition ${
        active
          ? "bg-status-optimalDark text-white shadow-sm"
          : "bg-surface-muted text-label hover:bg-gray-100"
      }`}
    >
      {label}
    </button>
  );
}
