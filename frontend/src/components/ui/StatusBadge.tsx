type BadgeTone = "optimal" | "warning" | "error" | "neutral" | "sync";

interface StatusBadgeProps {
  label: string;
  tone?: BadgeTone;
  pulse?: boolean;
}

const TONE_CLASSES: Record<BadgeTone, string> = {
  optimal: "bg-status-optimalDark text-white",
  warning: "bg-amber-500 text-white",
  error: "bg-red-500 text-white",
  neutral: "bg-gray-400 text-white",
  sync: "bg-emerald-50 text-status-optimalDark ring-1 ring-emerald-200",
};

export function StatusBadge({ label, tone = "optimal", pulse = false }: StatusBadgeProps) {
  return (
    <span
      className={`inline-flex items-center rounded-full px-3 py-1 text-[11px] font-semibold ${TONE_CLASSES[tone]} ${pulse ? "animate-pulse" : ""}`}
    >
      {label}
    </span>
  );
}
