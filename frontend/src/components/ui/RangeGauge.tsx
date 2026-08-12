type GaugeVariant = "green" | "blue";

interface RangeGaugeProps {
  label: string;
  value: number;
  unit: string;
  min: number;
  max: number;
  optimalMin: number;
  optimalMax: number;
  variant?: GaugeVariant;
  rangeLabel?: string;
  hint?: string;
  decimals?: number;
}

const VARIANT_STYLES: Record<
  GaugeVariant,
  { value: string; segment: string; dot: string }
> = {
  green: {
    value: "text-status-optimalDark",
    segment: "bg-emerald-200",
    dot: "bg-status-optimalDark",
  },
  blue: {
    value: "text-water",
    segment: "bg-blue-200",
    dot: "bg-water",
  },
};

function clamp(value: number, min: number, max: number): number {
  return Math.min(max, Math.max(min, value));
}

function toPercent(value: number, min: number, max: number): number {
  if (max <= min) return 50;
  return ((clamp(value, min, max) - min) / (max - min)) * 100;
}

export function RangeGauge({
  label,
  value,
  unit,
  min,
  max,
  optimalMin,
  optimalMax,
  variant = "green",
  rangeLabel,
  hint,
  decimals = 1,
}: RangeGaugeProps) {
  const styles = VARIANT_STYLES[variant];
  const dotLeft = toPercent(value, min, max);
  const segmentLeft = toPercent(optimalMin, min, max);
  const segmentRight = toPercent(optimalMax, min, max);
  const segmentWidth = Math.max(segmentRight - segmentLeft, 2);

  const formattedValue = value.toLocaleString(undefined, {
    minimumFractionDigits: decimals,
    maximumFractionDigits: decimals,
  });

  return (
    <div className="flex flex-col gap-1.5">
      <span className="text-xs text-label">{label}</span>
      <div className="flex items-baseline gap-1">
        <span className={`text-2xl font-bold tracking-tight ${styles.value}`}>
          {formattedValue}
        </span>
        <span className="text-sm text-label">{unit}</span>
      </div>
      <div className="relative mt-1 h-1.5 w-full rounded-full bg-gray-200">
        <div
          className={`absolute top-0 h-full rounded-full ${styles.segment}`}
          style={{ left: `${segmentLeft}%`, width: `${segmentWidth}%` }}
        />
        <div
          className={`absolute top-1/2 h-3 w-3 -translate-x-1/2 -translate-y-1/2 rounded-full shadow-sm ${styles.dot}`}
          style={{ left: `${dotLeft}%` }}
        />
      </div>
      {(rangeLabel || hint) && (
        <div className="flex flex-col gap-0.5">
          {rangeLabel && (
            <span className="text-[11px] text-label">{rangeLabel}</span>
          )}
          {hint && <span className="text-[11px] text-gray-400">{hint}</span>}
        </div>
      )}
    </div>
  );
}
