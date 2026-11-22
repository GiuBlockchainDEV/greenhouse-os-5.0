import { useMemo } from "react";
import { useTranslation } from "react-i18next";

import { applyTwinRecommendation } from "@/lib/twin/applyTwinRecommendation";
import { computeOfflineTwinRecommendations } from "@/lib/twin/offlineTwinAdvisor";
import { useGreenhouseStore } from "@/store/useGreenhouseStore";

export function OfflineTwinAdvisor() {
  const { t } = useTranslation("simulation");
  const crop = useGreenhouseStore((s) => s.crop);
  const equipment = useGreenhouseStore((s) => s.climateEquipment);
  const scenario = useGreenhouseStore((s) => s.climateScenario);
  const covering = useGreenhouseStore((s) => s.covering);
  const shadingScreen = useGreenhouseStore((s) => s.shadingScreen);
  const dimensions = useGreenhouseStore((s) => s.dimensions);
  const simulationStatus = useGreenhouseStore((s) => s.simulationStatus);
  const micro = useGreenhouseStore((s) => s.simulationResults?.microclimate);

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
    [
      crop,
      equipment,
      scenario,
      covering,
      shadingScreen,
      dimensions,
      micro,
      simulationStatus,
    ],
  );

  return (
    <section className="ui-card flex shrink-0 flex-col gap-2 overflow-y-auto p-4">
      <div>
        <h3 className="text-sm font-bold text-gray-900">
          {t("advisor.title", { defaultValue: "Twin advisor" })}
        </h3>
        <p className="mt-0.5 text-[11px] text-label">
          {t("advisor.subtitle", {
            defaultValue: "Deterministic rules on your model — no cloud API.",
          })}
        </p>
      </div>

      {recommendations.length === 0 ? (
        <p className="text-xs text-label">
          {t("advisor.empty", {
            defaultValue: "No changes suggested. Adjust scenario or wait for physics results.",
          })}
        </p>
      ) : (
        <ul className="space-y-2">
          {recommendations.slice(0, 5).map((rec) => (
            <li
              key={rec.id}
              className="rounded-lg border border-border bg-surface-page p-2.5 text-[11px]"
            >
              <div className="flex items-start justify-between gap-2">
                <span className="font-mono font-semibold text-gray-900">{rec.parameter}</span>
                <span
                  className={`rounded px-1.5 py-0.5 text-[9px] font-bold uppercase ${
                    rec.priority === "high"
                      ? "bg-red-100 text-red-800"
                      : rec.priority === "medium"
                        ? "bg-amber-100 text-amber-900"
                        : "bg-gray-100 text-gray-700"
                  }`}
                >
                  {rec.priority}
                </span>
              </div>
              <p className="mt-1 font-mono text-gray-800">
                {rec.currentValue.toFixed(rec.unit === "%" ? 0 : 2)} →{" "}
                {rec.recommendedValue.toFixed(rec.unit === "%" ? 0 : 2)} {rec.unit}
              </p>
              <p className="mt-1 text-label">{rec.rationale}</p>
              <p className="mt-0.5 text-[10px] text-status-optimalDark">{rec.impactHint}</p>
              {rec.action.kind !== "climateScenario" || Object.keys(rec.action.patch).length > 0 ? (
                <button
                  type="button"
                  className="ui-btn-ghost mt-2 w-full py-1 text-[10px] font-semibold"
                  onClick={() => applyTwinRecommendation(rec)}
                >
                  {t("advisor.apply", { defaultValue: "Apply to twin" })}
                </button>
              ) : null}
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}