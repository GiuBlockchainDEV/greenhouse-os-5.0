import { useMemo } from "react";
import { useTranslation } from "react-i18next";

import { computeHeatmapStats } from "@/lib/heatmapData";
import { resolveHeatmapField } from "@/lib/previewMicroclimate";
import { useGreenhouseStore } from "@/store/useGreenhouseStore";
import type { HeatmapMode } from "@/types/viewport";

const HEATMAP_MODES: HeatmapMode[] = [
  "off",
  "temperature",
  "humidity",
  "vpd",
  "uniformity",
];

interface SliderRowProps {
  label: string;
  value: number;
  unit: string;
  min: number;
  max: number;
  step: number;
  onChange: (value: number) => void;
}

function SliderRow({ label, value, unit, min, max, step, onChange }: SliderRowProps) {
  return (
    <label className="flex flex-col gap-1">
      <span className="flex justify-between text-[11px] text-label">
        <span>{label}</span>
        <span className="font-mono font-semibold text-gray-800">
          {value.toFixed(step < 1 ? 1 : 0)} {unit}
        </span>
      </span>
      <input
        type="range"
        min={min}
        max={max}
        step={step}
        value={value}
        onChange={(event) => onChange(Number(event.target.value))}
        className="ui-range-track"
      />
    </label>
  );
}

interface ToolbarButtonProps {
  label: string;
  active: boolean;
  onClick: () => void;
}

function ToolbarButton({ label, active, onClick }: ToolbarButtonProps) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={`rounded-lg px-2 py-1 text-xs font-medium transition ${
        active
          ? "bg-status-optimalDark text-white shadow-sm"
          : "bg-surface-muted text-label hover:bg-gray-100"
      }`}
    >
      {label}
    </button>
  );
}

function formatStatValue(mode: HeatmapMode, value: number): string {
  if (mode === "vpd") return value.toFixed(2);
  if (mode === "uniformity" || mode === "humidity") return value.toFixed(0);
  return value.toFixed(1);
}

export function HeatmapControls() {
  const { t } = useTranslation("3d_controls");

  const heatmapMode = useGreenhouseStore((s) => s.heatmapMode);
  const setHeatmapMode = useGreenhouseStore((s) => s.setHeatmapMode);
  const climateScenario = useGreenhouseStore((s) => s.climateScenario);
  const setClimateScenario = useGreenhouseStore((s) => s.setClimateScenario);
  const simulationResults = useGreenhouseStore((s) => s.simulationResults);
  const simulationStatus = useGreenhouseStore((s) => s.simulationStatus);
  const dimensions = useGreenhouseStore((s) => s.dimensions);
  const structure = useGreenhouseStore((s) => s.structure);
  const crop = useGreenhouseStore((s) => s.crop);
  const covering = useGreenhouseStore((s) => s.covering);
  const climateEquipment = useGreenhouseStore((s) => s.climateEquipment);

  const heatmapSource = useMemo(
    () =>
      resolveHeatmapField(
        dimensions,
        structure,
        climateEquipment,
        crop,
        covering,
        climateScenario,
        simulationResults,
      ),
    [dimensions, structure, climateEquipment, crop, covering, climateScenario, simulationResults],
  );

  const valueMode =
    heatmapMode === "off" ? "temperature" : heatmapMode;
  const stats = useMemo(
    () =>
      heatmapMode === "off"
        ? null
        : computeHeatmapStats(heatmapSource.surfaces.floor, valueMode, heatmapSource.internalRh),
    [heatmapMode, heatmapSource, valueMode],
  );

  const isLive = heatmapSource.isLive && simulationStatus === "connected";

  return (
    <div className="ui-card p-2">
      <p className="ui-section-title mb-1.5 px-1">{t("heatmap.title")}</p>
      <div className="flex flex-wrap gap-1">
        {HEATMAP_MODES.map((mode) => (
          <ToolbarButton
            key={mode}
            label={t(`heatmap.${mode}`)}
            active={heatmapMode === mode}
            onClick={() => setHeatmapMode(mode)}
          />
        ))}
      </div>

      {heatmapMode !== "off" && (
        <div className="mt-3 space-y-3 border-t border-border pt-3">
          <div>
            <p className="mb-2 text-[11px] font-semibold text-gray-800">
              {t("heatmap.scenarioTitle")}
            </p>
            <p className="mb-2 text-[10px] leading-relaxed text-label">
              {t("heatmap.scenarioHint")}
            </p>
            <div className="space-y-2">
              <SliderRow
                label={t("heatmap.externalTemp")}
                value={climateScenario.externalTempC}
                unit="°C"
                min={5}
                max={42}
                step={0.5}
                onChange={(value) => setClimateScenario({ externalTempC: value })}
              />
              <SliderRow
                label={t("heatmap.externalRh")}
                value={climateScenario.externalRhPct}
                unit="%"
                min={20}
                max={95}
                step={1}
                onChange={(value) => setClimateScenario({ externalRhPct: value })}
              />
              <SliderRow
                label={t("heatmap.windSpeed")}
                value={climateScenario.windSpeedMS}
                unit="m/s"
                min={0}
                max={12}
                step={0.5}
                onChange={(value) => setClimateScenario({ windSpeedMS: value })}
              />
            </div>
          </div>

          {stats && (
            <div className="rounded-lg bg-surface-muted px-2.5 py-2">
              <p className="text-[10px] font-semibold uppercase tracking-wide text-label">
                {t(`heatmap.legend.${valueMode}`)}
              </p>
              <p className="mt-1 font-mono text-xs font-semibold text-gray-800">
                {formatStatValue(heatmapMode, stats.min)}
                {" – "}
                {formatStatValue(heatmapMode, stats.max)} {stats.unit}
              </p>
              <p className="mt-1 text-[10px] text-label">
                {t("heatmap.equipmentHint")}
              </p>
              <p className="mt-1 text-[10px] text-label">
                {isLive
                  ? t("heatmap.liveDataHint")
                  : t("heatmap.previewHintDetailed", {
                      temp: heatmapSource.preview.internalTemp,
                      rh: heatmapSource.preview.internalRh,
                    })}
              </p>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
