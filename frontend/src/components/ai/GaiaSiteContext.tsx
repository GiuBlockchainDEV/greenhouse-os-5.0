import { useTranslation } from "react-i18next";

import { useGreenhouseStore } from "@/store/useGreenhouseStore";
import type { GaiaAnalysisSeason } from "@/types/greenhouse";

interface GaiaSiteContextProps {
  season: GaiaAnalysisSeason;
  onSeasonChange: (season: GaiaAnalysisSeason) => void;
}

const SEASONS: GaiaAnalysisSeason[] = ["simulation", "summer", "winter", "shoulder"];

export function GaiaSiteContext({ season, onSeasonChange }: GaiaSiteContextProps) {
  const { t } = useTranslation("ai_copilot");
  const location = useGreenhouseStore((s) => s.location);
  const scenario = useGreenhouseStore((s) => s.climateScenario);
  const setLocation = useGreenhouseStore((s) => s.setLocation);

  return (
    <div className="border-b border-border px-4 py-3">
      <p className="ui-section-title mb-2">{t("site.title")}</p>
      <div className="space-y-2">
        <label className="block">
          <span className="mb-1 block text-[10px] text-label">{t("site.place")}</span>
          <input
            type="text"
            value={location.label}
            onChange={(e) => setLocation({ label: e.target.value })}
            placeholder={t("site.placePlaceholder")}
            className="ui-input w-full py-1.5 text-xs"
          />
        </label>
        <div className="grid grid-cols-2 gap-2">
          <label className="block">
            <span className="mb-1 block text-[10px] text-label">{t("site.latitude")}</span>
            <input
              type="number"
              step="0.0001"
              value={location.lat}
              onChange={(e) => setLocation({ lat: Number(e.target.value) })}
              className="ui-input w-full py-1.5 text-xs"
            />
          </label>
          <label className="block">
            <span className="mb-1 block text-[10px] text-label">{t("site.longitude")}</span>
            <input
              type="number"
              step="0.0001"
              value={location.lon}
              onChange={(e) => setLocation({ lon: Number(e.target.value) })}
              className="ui-input w-full py-1.5 text-xs"
            />
          </label>
        </div>
        <label className="block">
          <span className="mb-1 block text-[10px] text-label">{t("site.season")}</span>
          <select
            value={season}
            onChange={(e) => onSeasonChange(e.target.value as GaiaAnalysisSeason)}
            className="ui-select w-full py-1.5 text-xs"
          >
            {SEASONS.map((value) => (
              <option key={value} value={value}>
                {t(`site.seasons.${value}`)}
              </option>
            ))}
          </select>
        </label>
        {season === "simulation" && (
          <p className="text-[10px] leading-relaxed text-label">
            {t("site.scenarioHint", {
              temp: scenario.externalTempC,
              rh: scenario.externalRhPct,
            })}
          </p>
        )}
      </div>
    </div>
  );
}
