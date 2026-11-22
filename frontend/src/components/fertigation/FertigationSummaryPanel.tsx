import { useTranslation } from "react-i18next";

import {
  CUSTOM_FERTIGATION_PRESET_ID,
  fertigationPresetById,
  fertigationPresetLabel,
} from "@/lib/fertigation/fertigationPresets";
import { FERTIGATION_TEMPLATES } from "@/lib/fertigation/templates";
import { useFertigationStore } from "@/store/useFertigationStore";
import { useGreenhouseStore } from "@/store/useGreenhouseStore";

export function FertigationSummaryPanel() {
  const { t } = useTranslation("fertigation");
  const { t: tCrops } = useTranslation("crops");
  const marketPresetId = useFertigationStore((s) => s.marketPresetId);
  const templateId = useFertigationStore((s) => s.templateId);
  const syncWithGreenhouse = useFertigationStore((s) => s.syncWithGreenhouse);
  const crop = useGreenhouseStore((s) => s.crop);
  const metrics = useGreenhouseStore((s) => s.metrics);

  const preset =
    marketPresetId !== CUSTOM_FERTIGATION_PRESET_ID
      ? fertigationPresetById(marketPresetId)
      : undefined;
  const template = FERTIGATION_TEMPLATES[templateId];

  return (
    <aside className="ui-card flex h-full flex-col gap-4 overflow-y-auto p-5 text-xs">
      <div>
        <h3 className="text-sm font-bold text-gray-900">{t("summary.title")}</h3>
        <p className="mt-1 text-label">{t("summary.hint")}</p>
      </div>

      <dl className="space-y-2">
        <div>
          <dt className="text-label">{t("summary.activePreset")}</dt>
          <dd className="font-semibold text-gray-900">
            {preset ? fertigationPresetLabel(preset) : t("presets.custom")}
          </dd>
        </div>
        <div>
          <dt className="text-label">{t("topology.title")}</dt>
          <dd className="font-semibold text-gray-900">{t(template.nameKey)}</dd>
        </div>
        <div>
          <dt className="text-label">{t("summary.category")}</dt>
          <dd className="font-mono capitalize text-gray-800">{template.category.replace("_", " ")}</dd>
        </div>
      </dl>

      {syncWithGreenhouse ? (
        <section className="rounded-xl border border-border bg-surface-page p-3">
          <h4 className="mb-2 font-semibold text-gray-900">{t("sync.linked")}</h4>
          <ul className="space-y-1 text-label">
            <li>
              {tCrops("systems." + crop.system)} · {tCrops("types." + crop.type)}
            </li>
            <li>
              {metrics.cultivationAreaM2.toFixed(0)} m² · {metrics.totalBedLines}{" "}
              {tCrops("labels.totalBedLines").toLowerCase()}
            </li>
            <li>
              {metrics.totalPlants} {t("summary.plants")}
            </li>
          </ul>
        </section>
      ) : null}

      <p className="text-[10px] leading-relaxed text-label">{t("summary.footer")}</p>
    </aside>
  );
}