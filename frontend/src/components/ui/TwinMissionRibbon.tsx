import { useTranslation } from "react-i18next";

import { useGreenhouseStore } from "@/store/useGreenhouseStore";
import { useWorkspaceStore } from "@/store/useWorkspaceStore";

export function TwinMissionRibbon() {
  const { t } = useTranslation("experience");
  const heatmapMode = useGreenhouseStore((s) => s.heatmapMode);
  const workspace = useWorkspaceStore((s) => s.mode);

  const heatmapDone = heatmapMode !== "off";
  const fertDone = workspace === "fertigation";

  return (
    <div className="pointer-events-none absolute bottom-[13.5rem] left-4 z-20 hidden max-w-xs lg:block">
      <div className="pointer-events-auto ui-card px-3 py-2.5 text-[10px] text-gray-800 shadow-md">
        <p className="mb-1.5 font-bold uppercase tracking-wide text-label">{t("mission.title")}</p>
        <ol className="space-y-1">
          <MissionStep done={heatmapDone} label={t("mission.stepHeatmap")} />
          <MissionStep done label={t("mission.stepOpex")} />
          <MissionStep done={fertDone} label={t("mission.stepFertigation")} />
        </ol>
        {heatmapDone && (
          <p className="mt-2 text-[10px] leading-relaxed text-label">{t("mission.done")}</p>
        )}
      </div>
    </div>
  );
}

function MissionStep({ done, label }: { done: boolean; label: string }) {
  return (
    <li className={`flex items-center gap-2 ${done ? "text-status-optimalDark" : "text-gray-500"}`}>
      <span
        className={`flex h-4 w-4 shrink-0 items-center justify-center rounded-full text-[9px] font-bold ${
          done ? "bg-emerald-100 text-emerald-800" : "border border-gray-300 bg-white"
        }`}
      >
        {done ? "✓" : ""}
      </span>
      {label}
    </li>
  );
}