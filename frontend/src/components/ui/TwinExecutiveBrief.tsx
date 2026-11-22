import { useMemo, useState } from "react";
import { useTranslation } from "react-i18next";

import { useTwinMicroclimateView } from "@/hooks/useTwinMicroclimateView";
import { applyTwinFixPack } from "@/lib/twin/applyTwinFixPack";
import { computeOfflineTwinRecommendations } from "@/lib/twin/offlineTwinAdvisor";
import { applyTwinLaunchScenario } from "@/lib/twin/applyTwinLaunchScenario";
import { assessTwinExecutive } from "@/lib/twin/twinExecutiveAssessment";
import { isFixPackTwinRecommendation } from "@/lib/twin/twinRecommendationUtils";
import { useGreenhouseStore } from "@/store/useGreenhouseStore";

const VERDICT_STYLES = {
  proceed: "from-emerald-500 to-teal-600",
  caution: "from-amber-500 to-orange-600",
  redesign: "from-red-500 to-rose-700",
} as const;

export function TwinExecutiveBrief() {
  const { t } = useTranslation("experience");
  const view = useTwinMicroclimateView();
  const metrics = useGreenhouseStore((s) => s.metrics);
  const name = useGreenhouseStore((s) => s.name);
  const crop = useGreenhouseStore((s) => s.crop);
  const equipment = useGreenhouseStore((s) => s.climateEquipment);
  const scenario = useGreenhouseStore((s) => s.climateScenario);
  const covering = useGreenhouseStore((s) => s.covering);
  const shadingScreen = useGreenhouseStore((s) => s.shadingScreen);
  const dimensions = useGreenhouseStore((s) => s.dimensions);
  const simulationStatus = useGreenhouseStore((s) => s.simulationStatus);
  const micro = useGreenhouseStore((s) => s.simulationResults?.microclimate);
  const [fixPackMessage, setFixPackMessage] = useState<string | null>(null);

  const recommendations = useMemo(
    () =>
      computeOfflineTwinRecommendations({
        crop,
        equipment,
        scenario,
        covering,
        shadingScreen,
        dimensions,
        micro,
        physicsConnected: simulationStatus === "connected",
      }).filter((item) => item.id !== "stable-ok"),
    [crop, equipment, scenario, covering, shadingScreen, dimensions, micro, simulationStatus],
  );

  const assessment = useMemo(
    () => assessTwinExecutive({ view, crop, recommendations }),
    [view, crop, recommendations],
  );

  const fixPackCount = recommendations.filter(isFixPackTwinRecommendation).length;

  const handleFixPack = () => {
    const result = applyTwinFixPack(recommendations);
    if (result.applied === 0) {
      setFixPackMessage(t("executive.fixPackNone"));
      return;
    }
    setFixPackMessage(
      t("executive.fixPackDone", { count: result.applied, items: result.labels.join(", ") }),
    );
  };

  const handleLoadDemo = () => {
    applyTwinLaunchScenario("gulf-summer-stress");
  };

  const downloadBrief = () => {
    const lines = [
      `GreenhouseOS — Twin executive brief`,
      `Project: ${name}`,
      `Score: ${assessment.score}/100 (${assessment.verdict})`,
      `Annual OPEX (est.): €${assessment.annualOpexEur}`,
      `At-risk OPEX: €${assessment.atRiskEur}`,
      `Savings if fixed (est.): €${assessment.savingsIfFixedEur}/yr`,
      `Indoor: ${view.internalTemp.toFixed(1)} °C · VPD ${view.vpdKpa.toFixed(2)} kPa`,
      `Actions pending: ${recommendations.length} (${fixPackCount} apply-all)`,
    ];
    const blob = new Blob([lines.join("\n")], { type: "text/plain" });
    const url = URL.createObjectURL(blob);
    const anchor = document.createElement("a");
    anchor.href = url;
    anchor.download = "greenhouseos-executive-brief.txt";
    anchor.click();
    URL.revokeObjectURL(url);
  };

  return (
    <div className="pointer-events-none absolute left-4 top-4 z-30 w-[min(100%,22rem)]">
      <div className="pointer-events-auto ui-card overflow-hidden border-0 shadow-2xl">
        <div className={`bg-gradient-to-br px-4 py-3 text-white ${VERDICT_STYLES[assessment.verdict]}`}>
          <p className="text-[10px] font-bold uppercase tracking-[0.18em] opacity-90">
            {t("executive.kicker")}
          </p>
          <p className="mt-1 text-lg font-bold leading-tight">{t(assessment.headlineKey)}</p>
          <div className="mt-2 flex items-end justify-between gap-2">
            <ScoreBlock score={assessment.score} label={t("executive.scoreLabel")} />
            <div className="text-right text-[10px] opacity-95">
              <p className="font-semibold">{name}</p>
              <p>{metrics.floorAreaM2.toLocaleString()} m²</p>
            </div>
          </div>
        </div>

        <div className="space-y-3 px-4 py-3">
          <ul className="space-y-1 text-[11px] text-gray-800">
            {assessment.detailKeys.map((key) => (
              <li key={key} className="flex gap-2">
                <span className="text-status-optimalDark">•</span>
                <span>{t(key)}</span>
              </li>
            ))}
          </ul>

          <div className="grid grid-cols-3 gap-2 text-center">
            <MoneyCell label={t("executive.annualOpex")} value={`€${assessment.annualOpexEur.toLocaleString()}`} />
            <MoneyCell label={t("executive.atRisk")} value={`€${assessment.atRiskEur.toLocaleString()}`} warn />
            <MoneyCell
              label={t("executive.savings")}
              value={`€${assessment.savingsIfFixedEur.toLocaleString()}`}
              highlight
            />
          </div>

          <div className="flex flex-wrap gap-2">
            <button
              type="button"
              disabled={fixPackCount === 0}
              onClick={handleFixPack}
              className="ui-btn-primary flex-1 text-xs disabled:cursor-not-allowed"
            >
              {t("executive.applyFixPack", { count: fixPackCount })}
            </button>
            <button type="button" onClick={downloadBrief} className="ui-btn-secondary text-xs">
              {t("executive.exportBrief")}
            </button>
          </div>

          {fixPackMessage ? (
            <p className="text-center text-[10px] font-semibold text-status-optimalDark">{fixPackMessage}</p>
          ) : null}

          <p className="text-center text-[10px] text-label">{t("executive.whereToConfigure")}</p>

          {recommendations.length === 0 ? (
            <button type="button" onClick={handleLoadDemo} className="w-full text-xs text-label underline">
              {t("executive.loadStressDemo")}
            </button>
          ) : null}
        </div>
      </div>
    </div>
  );
}

function ScoreBlock({ score, label }: { score: number; label: string }) {
  return (
    <div>
      <p className="text-3xl font-black tabular-nums">{score}</p>
      <p className="text-[10px] font-medium uppercase opacity-90">{label}</p>
    </div>
  );
}

function MoneyCell({
  label,
  value,
  highlight = false,
  warn = false,
}: {
  label: string;
  value: string;
  highlight?: boolean;
  warn?: boolean;
}) {
  return (
    <div
      className={`rounded-lg px-1 py-1.5 ${
        highlight ? "bg-emerald-50" : warn ? "bg-amber-50" : "bg-gray-50"
      }`}
    >
      <p className="text-[9px] font-medium uppercase text-label">{label}</p>
      <p className="font-mono text-xs font-bold text-gray-900">{value}</p>
    </div>
  );
}