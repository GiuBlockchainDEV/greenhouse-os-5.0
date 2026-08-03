import { useTranslation } from "react-i18next";

import { useGreenhouseStore } from "@/store/useGreenhouseStore";
import type { WSConnectionStatus } from "@/types/simulation";

const STATUS_LABELS: Record<WSConnectionStatus, string> = {
  idle: "idle",
  connecting: "running",
  connected: "ready",
  disconnected: "disconnected",
  error: "error",
};

const STATUS_COLORS: Record<WSConnectionStatus, string> = {
  idle: "bg-gray-500",
  connecting: "bg-yellow-500 animate-pulse",
  connected: "bg-greenhouse-400",
  disconnected: "bg-orange-500",
  error: "bg-red-500",
};

interface ClimateDashboardProps {
  onReconnect: () => void;
}

export function ClimateDashboard({ onReconnect }: ClimateDashboardProps) {
  const { t } = useTranslation("simulation");
  const status = useGreenhouseStore((s) => s.simulationStatus);
  const results = useGreenhouseStore((s) => s.simulationResults);

  const thermal = results?.thermal_balance;
  const micro = results?.microclimate;

  return (
    <div className="pointer-events-auto absolute inset-x-0 bottom-0 z-10 p-4">
      <div className="rounded-xl border border-greenhouse-700/80 bg-greenhouse-900/90 px-5 py-4 backdrop-blur-sm">
        <div className="mb-3 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <span className={`h-2 w-2 rounded-full ${STATUS_COLORS[status]}`} />
            <span className="text-xs font-medium text-greenhouse-300">
              {t(`status.${STATUS_LABELS[status]}`)}
            </span>
            {results && (
              <span className="font-mono text-xs text-white/40">
                {results.computation_ms.toFixed(1)} ms
              </span>
            )}
          </div>
          {(status === "disconnected" || status === "error") && (
            <button
              type="button"
              onClick={onReconnect}
              className="rounded-md border border-greenhouse-500/50 px-2 py-1 text-xs text-greenhouse-300 hover:bg-greenhouse-700/50"
            >
              {t("actions.reconnect")}
            </button>
          )}
        </div>

        {micro && thermal ? (
          <div className="grid grid-cols-2 gap-4 md:grid-cols-4 lg:grid-cols-8">
            <MetricCard label={t("metrics.internalTemp")} value={`${micro.internal_temp}°C`} />
            <MetricCard label={t("metrics.externalTemp")} value={`${micro.external_temp}°C`} />
            <MetricCard label={t("metrics.internalRh")} value={`${micro.internal_rh}%`} />
            <MetricCard label={t("metrics.vpd")} value={`${micro.vpd_kpa} kPa`} />
            <MetricCard label={t("metrics.et0")} value={`${micro.et0_fao56} mm/d`} />
            <MetricCard label={t("thermal.qSolar")} value={`${thermal.q_solar} W/m²`} highlight />
            <MetricCard label={t("thermal.qTranspiration")} value={`${thermal.q_transpiration} W/m²`} />
            <MetricCard label={t("thermal.qNet")} value={`${thermal.q_net_delta} W/m²`} />
          </div>
        ) : (
          <p className="text-xs text-white/40">{t("status.idle")}</p>
        )}
      </div>
    </div>
  );
}

interface MetricCardProps {
  label: string;
  value: string;
  highlight?: boolean;
}

function MetricCard({ label, value, highlight = false }: MetricCardProps) {
  return (
    <div>
      <dt className="text-[10px] uppercase tracking-wide text-greenhouse-400">{label}</dt>
      <dd className={`font-mono text-sm font-medium ${highlight ? "text-greenhouse-300" : "text-white"}`}>
        {value}
      </dd>
    </div>
  );
}
