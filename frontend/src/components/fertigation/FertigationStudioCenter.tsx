import { useTranslation } from "react-i18next";

import { FertigationPlantViewport } from "@/components/fertigation/FertigationPlantViewport";
import { FertigationTwinFrame } from "@/components/fertigation/FertigationTwinFrame";
import { useFertigationStore } from "@/store/useFertigationStore";

export function FertigationStudioCenter() {
  const { t } = useTranslation("fertigation");
  const studioView = useFertigationStore((s) => s.studioView);
  const setStudioView = useFertigationStore((s) => s.setStudioView);

  return (
    <div className="flex h-full min-h-0 flex-col gap-3">
      <div className="ui-card flex shrink-0 flex-col gap-2 p-4">
        <p className="text-sm font-semibold text-gray-900">{t("guide.headline")}</p>
        <p className="text-xs leading-relaxed text-label">{t("guide.lead")}</p>
        <div
          className="mt-1 flex gap-1 rounded-lg border border-border bg-surface-page p-0.5"
          role="tablist"
          aria-label={t("views.aria")}
        >
          <button
            type="button"
            role="tab"
            aria-selected={studioView === "plant3d"}
            className={`flex-1 rounded-md px-3 py-2 text-xs font-semibold transition-colors ${
              studioView === "plant3d"
                ? "bg-white text-gray-900 shadow-sm"
                : "text-label hover:text-gray-800"
            }`}
            onClick={() => setStudioView("plant3d")}
          >
            {t("views.plant3d")}
          </button>
          <button
            type="button"
            role="tab"
            aria-selected={studioView === "pid"}
            className={`flex-1 rounded-md px-3 py-2 text-xs font-semibold transition-colors ${
              studioView === "pid"
                ? "bg-white text-gray-900 shadow-sm"
                : "text-label hover:text-gray-800"
            }`}
            onClick={() => setStudioView("pid")}
          >
            {t("views.pid")}
          </button>
        </div>
        <p className="text-[11px] text-label">
          {studioView === "plant3d" ? t("guide.plant3dHint") : t("guide.pidHint")}
        </p>
      </div>

      <div className="relative min-h-0 flex-1">
        {studioView === "plant3d" ? <FertigationPlantViewport /> : <FertigationTwinFrame />}
      </div>
    </div>
  );
}