import { useEffect } from "react";
import { useTranslation } from "react-i18next";

import {
  CUSTOM_FERTIGATION_PRESET_ID,
  fertigationPresetLabel,
  MARKET_FERTIGATION_PRESETS,
} from "@/lib/fertigation/fertigationPresets";
import { FERTIGATION_TEMPLATE_LIST } from "@/lib/fertigation/templates";
import { FERTIGATION_COMPONENT_CATALOG, FERTIGATION_COMPONENT_KINDS } from "@/lib/fertigation/componentCatalog";
import { useFertigationStore } from "@/store/useFertigationStore";
import type { FertigationTemplateId } from "@/types/fertigation";

export function FertigationPresetControls() {
  const { t } = useTranslation("fertigation");
  const marketPresetId = useFertigationStore((s) => s.marketPresetId);
  const templateId = useFertigationStore((s) => s.templateId);
  const syncWithGreenhouse = useFertigationStore((s) => s.syncWithGreenhouse);
  const applyMarketPreset = useFertigationStore((s) => s.applyMarketPreset);
  const applyTemplate = useFertigationStore((s) => s.applyTemplate);
  const setSyncWithGreenhouse = useFertigationStore((s) => s.setSyncWithGreenhouse);
  const alignPresetWithGreenhouseCrop = useFertigationStore((s) => s.alignPresetWithGreenhouseCrop);
  const pushProjectToTwin = useFertigationStore((s) => s.pushProjectToTwin);

  useEffect(() => {
    pushProjectToTwin();
  }, [pushProjectToTwin]);

  return (
    <aside className="ui-card flex h-full flex-col gap-5 overflow-y-auto p-5">
      <div>
        <h3 className="text-sm font-bold text-gray-900">{t("panel.title")}</h3>
        <p className="mt-1 text-xs text-label">{t("panel.hint")}</p>
      </div>

      <section className="flex flex-col gap-3">
        <h4 className="ui-section-title">{t("presets.title")}</h4>
        <p className="text-[10px] leading-relaxed text-label">{t("presets.hint")}</p>
        <select
          value={marketPresetId}
          onChange={(event) => applyMarketPreset(event.target.value)}
          className="ui-select"
        >
          <option value={CUSTOM_FERTIGATION_PRESET_ID}>{t("presets.custom")}</option>
          {MARKET_FERTIGATION_PRESETS.map((preset) => (
            <option key={preset.id} value={preset.id}>
              {fertigationPresetLabel(preset)}
            </option>
          ))}
        </select>
        <button
          type="button"
          className="ui-btn-secondary text-xs"
          onClick={() => alignPresetWithGreenhouseCrop()}
        >
          {t("presets.matchCrop")}
        </button>
      </section>

      <section className="flex flex-col gap-3">
        <h4 className="ui-section-title">{t("topology.title")}</h4>
        <select
          value={templateId}
          onChange={(event) => applyTemplate(event.target.value as FertigationTemplateId)}
          className="ui-select"
        >
          {FERTIGATION_TEMPLATE_LIST.map((template) => (
            <option key={template.id} value={template.id}>
              {t(template.nameKey)} — {t(template.subtitleKey)}
            </option>
          ))}
        </select>
      </section>

      <label className="flex items-center gap-2 text-xs text-label">
        <input
          type="checkbox"
          checked={syncWithGreenhouse}
          onChange={(event) => setSyncWithGreenhouse(event.target.checked)}
          className="rounded border-border"
        />
        {t("sync.greenhouse")}
      </label>

      <section className="flex flex-col gap-2 border-t border-border pt-4">
        <h4 className="ui-section-title">{t("catalog.title")}</h4>
        <p className="text-[10px] text-label">{t("catalog.hint")}</p>
        <ul className="max-h-48 space-y-2 overflow-y-auto text-[11px]">
          {FERTIGATION_COMPONENT_KINDS.map((kind) => {
            const item = FERTIGATION_COMPONENT_CATALOG[kind];
            return (
              <li key={kind} className="rounded-lg border border-border bg-surface-page px-2 py-1.5">
                <div className="font-semibold text-gray-800">{t(item.nameKey)}</div>
                <div className="text-[10px] text-label">
                  {t(item.categoryKey)} · {item.prefix}
                </div>
              </li>
            );
          })}
        </ul>
      </section>
    </aside>
  );
}