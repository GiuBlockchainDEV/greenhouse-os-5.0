import { useEffect } from "react";
import { useTranslation } from "react-i18next";

import {
  CUSTOM_FERTIGATION_PRESET_ID,
  fertigationPresetById,
  fertigationPresetLabel,
  MARKET_FERTIGATION_PRESETS,
} from "@/lib/fertigation/fertigationPresets";
import { FERTIGATION_TEMPLATES } from "@/lib/fertigation/templates";
import { useFertigationStore } from "@/store/useFertigationStore";

export function FertigationPresetControls() {
  const { t } = useTranslation("fertigation");
  const marketPresetId = useFertigationStore((s) => s.marketPresetId);
  const templateId = useFertigationStore((s) => s.templateId);
  const syncWithGreenhouse = useFertigationStore((s) => s.syncWithGreenhouse);
  const applyMarketPreset = useFertigationStore((s) => s.applyMarketPreset);
  const setSyncWithGreenhouse = useFertigationStore((s) => s.setSyncWithGreenhouse);
  const alignPresetWithGreenhouseCrop = useFertigationStore((s) => s.alignPresetWithGreenhouseCrop);
  const pushProjectToTwin = useFertigationStore((s) => s.pushProjectToTwin);
  const setStudioView = useFertigationStore((s) => s.setStudioView);

  const preset = fertigationPresetById(marketPresetId);
  const template = FERTIGATION_TEMPLATES[templateId];

  useEffect(() => {
    pushProjectToTwin();
  }, [pushProjectToTwin]);

  return (
    <aside className="ui-card flex h-full flex-col gap-4 overflow-y-auto p-5">
      <div>
        <h3 className="text-sm font-bold text-gray-900">{t("panel.title")}</h3>
        <p className="mt-1 text-xs text-label">{t("panel.hintShort")}</p>
      </div>

      <ol className="space-y-2 rounded-xl border border-border bg-surface-page p-3 text-[11px] text-gray-800">
        <li className="flex gap-2">
          <span className="font-mono font-bold text-status-optimalDark">1</span>
          <span>{t("steps.choosePreset")}</span>
        </li>
        <li className="flex gap-2">
          <span className="font-mono font-bold text-status-optimalDark">2</span>
          <span>{t("steps.open3d")}</span>
        </li>
        <li className="flex gap-2">
          <span className="font-mono font-bold text-status-optimalDark">3</span>
          <span>{t("steps.openPid")}</span>
        </li>
      </ol>

      <section className="flex flex-col gap-2">
        <h4 className="ui-section-title">{t("presets.title")}</h4>
        <select
          value={marketPresetId}
          onChange={(event) => {
            applyMarketPreset(event.target.value);
            setStudioView("plant3d");
          }}
          className="ui-select"
        >
          <option value={CUSTOM_FERTIGATION_PRESET_ID}>{t("presets.custom")}</option>
          {MARKET_FERTIGATION_PRESETS.map((item) => (
            <option key={item.id} value={item.id}>
              {fertigationPresetLabel(item)}
            </option>
          ))}
        </select>
        <button
          type="button"
          className="ui-btn-secondary w-full text-xs"
          onClick={() => {
            alignPresetWithGreenhouseCrop();
            setStudioView("plant3d");
          }}
        >
          {t("presets.matchCrop")}
        </button>
      </section>

      {preset ? (
        <div className="rounded-xl border border-border bg-white p-3 text-[11px]">
          <p className="font-semibold text-gray-900">{fertigationPresetLabel(preset)}</p>
          <p className="mt-1 text-label">{t(template.nameKey)}</p>
          <p className="mt-1 text-label">{t(template.subtitleKey)}</p>
        </div>
      ) : null}

      <label className="flex items-start gap-2 text-xs text-label">
        <input
          type="checkbox"
          checked={syncWithGreenhouse}
          onChange={(event) => setSyncWithGreenhouse(event.target.checked)}
          className="mt-0.5 rounded border-border"
        />
        <span>{t("sync.greenhouseShort")}</span>
      </label>
    </aside>
  );
}