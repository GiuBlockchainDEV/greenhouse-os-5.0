import { useState } from "react";
import { useTranslation } from "react-i18next";

import { applyTwinLaunchScenario } from "@/lib/twin/applyTwinLaunchScenario";
import { TWIN_LAUNCH_SCENARIOS, type TwinLaunchScenario } from "@/lib/twin/launchScenarios";
import { markTwinLaunchComplete } from "@/lib/twin/twinLaunchState";

interface TwinLaunchExperienceProps {
  open: boolean;
  onClose: () => void;
}

function ScenarioIcon({ kind }: { kind: TwinLaunchScenario["icon"] }) {
  const base = "flex h-11 w-11 items-center justify-center rounded-xl text-lg font-bold text-white shadow-md";
  if (kind === "venlo") {
    return <div className={`${base} bg-gradient-to-br from-sky-500 to-indigo-600`}>V</div>;
  }
  if (kind === "tunnel") {
    return <div className={`${base} bg-gradient-to-br from-emerald-500 to-teal-700`}>⌒</div>;
  }
  return <div className={`${base} bg-gradient-to-br from-amber-500 to-red-600`}>☀</div>;
}

export function TwinLaunchExperience({ open, onClose }: TwinLaunchExperienceProps) {
  const { t } = useTranslation("experience");
  const [loadingId, setLoadingId] = useState<string | null>(null);

  if (!open) {
    return null;
  }

  const handleSelect = (id: string) => {
    setLoadingId(id);
    window.requestAnimationFrame(() => {
      applyTwinLaunchScenario(id);
      setLoadingId(null);
      onClose();
    });
  };

  const handleSkip = () => {
    markTwinLaunchComplete();
    onClose();
  };

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center bg-gray-900/70 p-4 backdrop-blur-md">
      <div
        className="ui-card max-h-[min(92vh,820px)] w-full max-w-4xl overflow-y-auto border-emerald-200/40 p-6 shadow-2xl md:p-8"
        role="dialog"
        aria-modal="true"
        aria-labelledby="twin-launch-title"
      >
        <p className="text-xs font-semibold uppercase tracking-[0.2em] text-status-optimalDark">
          {t("launch.kicker")}
        </p>
        <h2 id="twin-launch-title" className="mt-2 text-2xl font-bold tracking-tight text-gray-900 md:text-3xl">
          {t("launch.title")}
        </h2>
        <p className="mt-2 max-w-2xl text-sm leading-relaxed text-label">{t("launch.subtitle")}</p>

        <ul className="mt-5 grid gap-2 text-[11px] text-gray-700 sm:grid-cols-2">
          <li className="rounded-lg bg-emerald-50 px-3 py-2 font-medium">{t("launch.pillars.capex")}</li>
          <li className="rounded-lg bg-emerald-50 px-3 py-2 font-medium">{t("launch.pillars.opex")}</li>
          <li className="rounded-lg bg-sky-50 px-3 py-2 font-medium">{t("launch.pillars.agronomy")}</li>
          <li className="rounded-lg bg-sky-50 px-3 py-2 font-medium">{t("launch.pillars.export")}</li>
        </ul>

        <div className="mt-6 grid gap-3 md:grid-cols-3">
          {TWIN_LAUNCH_SCENARIOS.map((scenario) => {
            const busy = loadingId === scenario.id;
            return (
              <button
                key={scenario.id}
                type="button"
                disabled={busy}
                onClick={() => handleSelect(scenario.id)}
                className="group flex flex-col rounded-2xl border border-border bg-white p-4 text-left shadow-sm transition hover:border-status-optimalDark hover:shadow-lg disabled:opacity-60"
              >
                <div className="mb-3 flex items-center gap-3">
                  <ScenarioIcon kind={scenario.icon} />
                  <h3 className="text-sm font-bold text-gray-900">
                    {t(`launch.scenarios.${scenario.id}.title`)}
                  </h3>
                </div>
                <p className="text-xs font-semibold text-gray-900">
                  {t(`launch.scenarios.${scenario.id}.hook`)}
                </p>
                <p className="mt-1 flex-1 text-[11px] leading-relaxed text-label">
                  {t(`launch.scenarios.${scenario.id}.outcome`)}
                </p>
                <span className="mt-3 inline-flex items-center text-xs font-bold text-status-optimalDark group-hover:underline">
                  {busy ? "…" : t("launch.cta")} →
                </span>
              </button>
            );
          })}
        </div>

        <button
          type="button"
          onClick={handleSkip}
          className="mt-6 text-xs text-label underline-offset-2 hover:text-gray-800 hover:underline"
        >
          {t("launch.skip")}
        </button>
      </div>
    </div>
  );
}
