import type { HeatmapValueMode } from "@/lib/heatmapData";
import type { HeatmapFieldSummary, WorkingTempRange } from "@/lib/heatmapData";

interface HeatmapScaleLegendProps {
  mode: HeatmapValueMode;
  visualMin: number;
  visualMax: number;
  unit: string;
  summary: HeatmapFieldSummary | null;
  workingRange?: WorkingTempRange;
  estimatedLabel: string;
  workingRangeLabel: string;
  floorRangeLabel: string;
}

function pctInRange(value: number, min: number, max: number): number {
  const span = Math.max(max - min, 0.001);
  return Math.max(0, Math.min(100, ((value - min) / span) * 100));
}

function temperatureBarGradient(): string {
  return "linear-gradient(90deg, #0d40d9 0%, #26d959 44%, #f2d919 56%, #e6260d 100%)";
}

function humidityBarGradient(): string {
  return "linear-gradient(90deg, #f2bf33 0%, #33bfd9 50%, #1a59d9 100%)";
}

function vpdBarGradient(): string {
  return "linear-gradient(90deg, #33d973 0%, #f28c1a 50%, #d91a26 100%)";
}

function uniformityBarGradient(): string {
  return "linear-gradient(90deg, #e6260d 0%, #f2bf33 50%, #26d959 100%)";
}

function barGradient(mode: HeatmapValueMode): string {
  switch (mode) {
    case "humidity":
      return humidityBarGradient();
    case "vpd":
      return vpdBarGradient();
    case "uniformity":
      return uniformityBarGradient();
    default:
      return temperatureBarGradient();
  }
}

function formatLegendValue(mode: HeatmapValueMode, value: number): string {
  if (mode === "vpd") return value.toFixed(2);
  if (mode === "humidity" || mode === "uniformity") return value.toFixed(0);
  return value.toFixed(1);
}

export function HeatmapScaleLegend({
  mode,
  visualMin,
  visualMax,
  unit,
  summary,
  workingRange,
  estimatedLabel,
  workingRangeLabel,
  floorRangeLabel,
}: HeatmapScaleLegendProps) {
  const estimatedPct = summary
    ? pctInRange(summary.estimated, visualMin, visualMax)
    : null;
  const workingStartPct =
    workingRange && mode === "temperature"
      ? pctInRange(workingRange.min, visualMin, visualMax)
      : null;
  const workingEndPct =
    workingRange && mode === "temperature"
      ? pctInRange(workingRange.max, visualMin, visualMax)
      : null;

  return (
    <div className="space-y-2">
      <div className="relative h-3.5 overflow-hidden rounded-full border border-border/80">
        <div
          className="absolute inset-0"
          style={{ background: barGradient(mode) }}
        />
        {workingStartPct !== null && workingEndPct !== null && (
          <div
            className="absolute inset-y-0 border-x-2 border-emerald-300/90 bg-emerald-200/25"
            style={{
              left: `${workingStartPct}%`,
              width: `${Math.max(workingEndPct - workingStartPct, 1)}%`,
            }}
            title={`${workingRangeLabel}: ${workingRange?.min}–${workingRange?.max} ${unit}`}
          />
        )}
        {estimatedPct !== null && (
          <div
            className="absolute inset-y-0 z-10 w-[3px] -translate-x-1/2 rounded-full bg-white shadow-[0_0_0_1px_rgba(15,23,42,0.85)]"
            style={{ left: `${estimatedPct}%` }}
            title={`${estimatedLabel}: ${formatLegendValue(mode, summary?.estimated ?? 0)} ${unit}`}
          />
        )}
      </div>

      <div className="flex justify-between font-mono text-[9px] text-label">
        <span>{formatLegendValue(mode, visualMin)}</span>
        <span>{formatLegendValue(mode, visualMax)} {unit}</span>
      </div>

      {summary && (
        <div className="space-y-1 rounded-md border border-border/70 bg-white/70 px-2 py-1.5">
          <p className="font-mono text-xs font-bold text-gray-900">
            {estimatedLabel}: {formatLegendValue(mode, summary.estimated)} {unit}
          </p>
          <p className="font-mono text-[10px] text-label">
            {floorRangeLabel}: {formatLegendValue(mode, summary.fieldMin)} –{" "}
            {formatLegendValue(mode, summary.fieldMax)} {unit}
          </p>
          {workingRange && mode === "temperature" && (
            <p className="font-mono text-[10px] text-status-optimalDark">
              {workingRangeLabel}: {workingRange.min} – {workingRange.max} {unit}
            </p>
          )}
        </div>
      )}
    </div>
  );
}
