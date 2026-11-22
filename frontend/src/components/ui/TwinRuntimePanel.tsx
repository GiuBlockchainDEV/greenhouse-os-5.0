import { useTranslation } from "react-i18next";

import { formatClockLabel } from "@/lib/twinScenarioClock";
import { estimatePreviewMicroclimate } from "@/lib/previewMicroclimate";
import { useGreenhouseStore } from "@/store/useGreenhouseStore";
import type { TwinDataSource } from "@/types/simulation";

export function TwinRuntimePanel() {
  const { t } = useTranslation("simulation");
  const twinRuntime = useGreenhouseStore((s) => s.twinRuntime);
  const setTwinRuntime = useGreenhouseStore((s) => s.setTwinRuntime);
  const status = useGreenhouseStore((s) => s.simulationStatus);
  const results = useGreenhouseStore((s) => s.simulationResults);
  const scenario = useGreenhouseStore((s) => s.climateScenario);
  const covering = useGreenhouseStore((s) => s.covering);
  const shadingScreen = useGreenhouseStore((s) => s.shadingScreen);
  const equipment = useGreenhouseStore((s) => s.climateEquipment);
  const dimensions = useGreenhouseStore((s) => s.dimensions);
  const crop = useGreenhouseStore((s) => s.crop);

  const dataSource: TwinDataSource =
    status === "connected" && results?.microclimate ? "physics" : "preview";

  const preview =
    dataSource === "preview"
      ? estimatePreviewMicroclimate(
          scenario,
          covering,
          shadingScreen,
          equipment,
          dimensions,
          crop,
        )
      : null;

  const micro = results?.microclimate;
  const sensors = [
    {
      tag: "INT.TEMP",
      value: dataSource === "physics" ? micro?.internal_temp : preview?.internalTemp,
      unit: "°C",
    },
    {
      tag: "INT.RH",
      value: dataSource === "physics" ? micro?.internal_rh : preview?.internalRh,
      unit: "%",
    },
    {
      tag: "VPD",
      value: dataSource === "physics" ? micro?.vpd_kpa : preview?.vpdKpa,
      unit: "kPa",
    },
    {
      tag: "DLI",
      value: micro?.dli_mol_m2_day,
      unit: "mol/m²/d",
    },
    {
      tag: "BOTRYTIS",
      value: micro?.botrytis_risk_index,
      unit: "%",
    },
    {
      tag: "VENT.ACH",
      value: results?.ventilation_ach,
      unit: "ACH",
    },
  ];

  return (
    <section className="ui-divider flex flex-col gap-3 pt-4">
      <h4 className="ui-section-title">{t("twin.title", { defaultValue: "Virtual twin" })}</h4>
      <p className="text-[11px] text-label">
        {t("twin.subtitle", {
          defaultValue: "Synthetic sensors from physics model — no external telemetry.",
        })}
      </p>

      <div className="flex items-center gap-2">
        <label className="text-xs text-label" htmlFor="twin-clock">
          {t("twin.clock", { defaultValue: "Time" })}
        </label>
        <input
          id="twin-clock"
          type="range"
          min={0}
          max={1439}
          step={15}
          value={twinRuntime.clockMin}
          onChange={(event) =>
            setTwinRuntime({ clockMin: Number(event.target.value) })
          }
          className="flex-1"
        />
        <span className="w-12 font-mono text-xs text-gray-800">
          {formatClockLabel(twinRuntime.clockMin)}
        </span>
      </div>

      <div className="flex flex-wrap gap-2">
        <button
          type="button"
          className="ui-btn-secondary text-xs"
          onClick={() =>
            setTwinRuntime({ autoAdvance: !twinRuntime.autoAdvance })
          }
        >
          {twinRuntime.autoAdvance
            ? t("twin.pause", { defaultValue: "Pause day" })
            : t("twin.play", { defaultValue: "Play day" })}
        </button>
        <button
          type="button"
          className="ui-btn-ghost text-xs"
          onClick={() => setTwinRuntime({ clockMin: 360 })}
        >
          {t("twin.dawn", { defaultValue: "Dawn" })}
        </button>
        <button
          type="button"
          className="ui-btn-ghost text-xs"
          onClick={() => setTwinRuntime({ clockMin: 780 })}
        >
          {t("twin.noon", { defaultValue: "Noon" })}
        </button>
      </div>

      <div className="rounded-lg border border-border bg-surface-muted/40 p-2">
        <div className="mb-2 flex items-center justify-between text-[10px] uppercase tracking-wide text-label">
          <span>{t("twin.sensors", { defaultValue: "Synthetic tags" })}</span>
          <span className="font-mono">
            {t(`twin.source.${dataSource}`, {
              defaultValue: dataSource === "physics" ? "PHYSICS" : "PREVIEW",
            })}
          </span>
        </div>
        <dl className="grid grid-cols-2 gap-x-3 gap-y-1.5 text-xs">
          {sensors.map((row) => (
            <div key={row.tag} className="contents">
              <dt className="font-mono text-[10px] text-label">{row.tag}</dt>
              <dd className="font-mono text-gray-900">
                {row.value !== undefined && row.value !== null
                  ? `${Number(row.value).toFixed(row.unit === "%" ? 0 : 2)} ${row.unit}`
                  : "—"}
              </dd>
            </div>
          ))}
        </dl>
      </div>
    </section>
  );
}