import { useTranslation } from "react-i18next";

import {
  CUSTOM_FERTIGATION_PRESET_ID,
  fertigationPresetById,
  fertigationPresetLabel,
} from "@/lib/fertigation/fertigationPresets";
import { useFertigationStore } from "@/store/useFertigationStore";
import { useGreenhouseStore } from "@/store/useGreenhouseStore";

export function FertigationSummaryPanel() {
  const { t } = useTranslation("fertigation");
  const { t: tCrops } = useTranslation("crops");
  const marketPresetId = useFertigationStore((s) => s.marketPresetId);
  const activeProject = useFertigationStore((s) => s.activeProject);
  const studioView = useFertigationStore((s) => s.studioView);
  const syncWithGreenhouse = useFertigationStore((s) => s.syncWithGreenhouse);
  const crop = useGreenhouseStore((s) => s.crop);
  const metrics = useGreenhouseStore((s) => s.metrics);
  const simulationStatus = useGreenhouseStore((s) => s.simulationStatus);
  const micro = useGreenhouseStore((s) => s.simulationResults?.microclimate);
  const cropNode = activeProject?.nodes.find((node) => node.role === "crop");

  const preset =
    marketPresetId !== CUSTOM_FERTIGATION_PRESET_ID
      ? fertigationPresetById(marketPresetId)
      : undefined;

  const nodeCount = activeProject?.nodes.length ?? 0;
  const pipeCount = activeProject?.edges.length ?? 0;

  return (
    <aside className="ui-card flex h-full flex-col gap-4 overflow-y-auto p-5 text-xs">
      <div>
        <h3 className="text-sm font-bold text-gray-900">{t("help.title")}</h3>
        <p className="mt-1 leading-relaxed text-label">{t("help.intro")}</p>
      </div>

      <section className="rounded-xl border border-status-optimal/30 bg-emerald-50/50 p-3">
        <h4 className="font-semibold text-gray-900">
          {studioView === "plant3d" ? t("help.nowPlant3d") : t("help.nowPid")}
        </h4>
        <p className="mt-2 leading-relaxed text-label">
          {studioView === "plant3d" ? t("help.plant3dBody") : t("help.pidBody")}
        </p>
      </section>

      <dl className="space-y-2 rounded-xl border border-border p-3">
        <div>
          <dt className="text-label">{t("summary.activePreset")}</dt>
          <dd className="font-semibold text-gray-900">
            {preset ? fertigationPresetLabel(preset) : t("presets.custom")}
          </dd>
        </div>
        <div>
          <dt className="text-label">{t("summary.schematic")}</dt>
          <dd className="font-semibold text-gray-900">
            {nodeCount} {t("summary.assets")} · {pipeCount} {t("summary.pipes")}
          </dd>
        </div>
        <div>
          <dt className="text-label">{t("summary.greenhouseCrop")}</dt>
          <dd className="text-gray-900">
            {tCrops(`systems.${crop.system}`)} · {tCrops(`types.${crop.type}`)}
          </dd>
        </div>
        <div>
          <dt className="text-label">{t("summary.greenhouseArea")}</dt>
          <dd className="text-gray-900">
            {metrics.cultivationAreaM2.toFixed(0)} m² · {metrics.totalBedLines}{" "}
            {t("summary.lines")}
          </dd>
        </div>
        {syncWithGreenhouse && (
          <div>
            <dt className="text-label">{t("summary.twinPhysics")}</dt>
            <dd className="text-gray-900">
              {simulationStatus === "connected" && micro
                ? `${micro.internal_temp.toFixed(1)} °C · VPD ${micro.vpd_kpa.toFixed(2)} kPa`
                : t("summary.twinPhysicsPreview")}
            </dd>
            {cropNode?.params && (
              <dd className="mt-1 text-[11px] text-label">
                {t("summary.twinCropLoads", {
                  uptake: cropNode.params.uptakeLpd ?? "—",
                  evap: cropNode.params.evaporationLpd ?? "—",
                })}
              </dd>
            )}
          </div>
        )}
      </dl>

      <p className="text-[11px] leading-relaxed text-label">{t("help.footer")}</p>
    </aside>
  );
}