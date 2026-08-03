import { useState } from "react";
import { useTranslation } from "react-i18next";

import { useAuth } from "@/hooks/useAuth";
import {
  computeOpexMetrics,
  downloadExport,
  exportClimateComputer,
  saveGreenhouseDesign,
} from "@/lib/climateExport";
import { useGreenhouseStore } from "@/store/useGreenhouseStore";
import type { ClimateComputerFormat } from "@/types/supabase";
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

const EXPORT_FORMATS: ClimateComputerFormat[] = ["priva", "ridder", "hoogendoorn"];

interface ClimateDashboardProps {
  onReconnect: () => void;
}

export function ClimateDashboard({ onReconnect }: ClimateDashboardProps) {
  const { t } = useTranslation("simulation");
  const { t: tCommon } = useTranslation("common");
  const { user, status: authStatus } = useAuth();

  const status = useGreenhouseStore((s) => s.simulationStatus);
  const results = useGreenhouseStore((s) => s.simulationResults);
  const metrics = useGreenhouseStore((s) => s.metrics);
  const name = useGreenhouseStore((s) => s.name);

  const [exporting, setExporting] = useState(false);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState<string | null>(null);

  const thermal = results?.thermal_balance;
  const micro = results?.microclimate;

  const opex = thermal
    ? computeOpexMetrics(metrics.floorAreaM2, thermal.q_solar, thermal.q_net_delta)
    : null;

  const handleExport = async (format: ClimateComputerFormat) => {
    setExporting(true);
    setMessage(null);
    try {
      const data = await exportClimateComputer({ format });
      downloadExport(data, `${name.replace(/\s+/g, "_")}_${format}_export.json`);
      setMessage(t("export.success"));
    } catch {
      setMessage(t("export.error"));
    } finally {
      setExporting(false);
    }
  };

  const handleSave = async () => {
    if (!user) return;
    setSaving(true);
    setMessage(null);
    try {
      await saveGreenhouseDesign(user.id);
      setMessage(t("save.success"));
    } catch {
      setMessage(t("save.error"));
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="pointer-events-auto absolute inset-x-0 bottom-0 z-10 p-4">
      <div className="rounded-xl border border-greenhouse-700/80 bg-greenhouse-900/90 px-5 py-4 backdrop-blur-sm">
        <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
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
          <div className="flex flex-wrap items-center gap-2">
            {EXPORT_FORMATS.map((fmt) => (
              <button
                key={fmt}
                type="button"
                disabled={exporting || !micro}
                onClick={() => void handleExport(fmt)}
                className="rounded-md border border-greenhouse-500/40 px-2 py-1 text-[10px] font-medium uppercase tracking-wide text-greenhouse-300 hover:bg-greenhouse-700/50 disabled:opacity-40"
              >
                {t(`export.${fmt}`)}
              </button>
            ))}
            {authStatus === "authenticated" && user && (
              <button
                type="button"
                disabled={saving}
                onClick={() => void handleSave()}
                className="rounded-md bg-greenhouse-500 px-2 py-1 text-[10px] font-medium text-white hover:bg-greenhouse-400 disabled:opacity-40"
              >
                {tCommon("actions.save")}
              </button>
            )}
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
        </div>

        {message && (
          <p className="mb-2 text-xs text-greenhouse-400">{message}</p>
        )}

        {micro && thermal && opex ? (
          <>
            <div className="mb-3 grid grid-cols-2 gap-4 md:grid-cols-4 lg:grid-cols-11">
              <MetricCard label={t("metrics.internalTemp")} value={`${micro.internal_temp}°C`} />
              <MetricCard label={t("metrics.externalTemp")} value={`${micro.external_temp}°C`} />
              <MetricCard label={t("metrics.internalRh")} value={`${micro.internal_rh}%`} />
              <MetricCard label={t("metrics.vpd")} value={`${micro.vpd_kpa} kPa`} />
              <MetricCard label={t("metrics.et0")} value={`${micro.et0_fao56} mm/d`} />
              <MetricCard label={t("thermal.qSolar")} value={`${thermal.q_solar} W/m²`} highlight />
              <MetricCard label={t("thermal.qTranspiration")} value={`${thermal.q_transpiration} W/m²`} />
              <MetricCard label={t("thermal.qNet")} value={`${thermal.q_net_delta} W/m²`} />
              <MetricCard label={t("opex.energy")} value={`${opex.energyKwhM2Day} kWh/m²`} />
              <MetricCard label={t("opex.cost")} value={`€${opex.opexEurDay}/d`} highlight />
              <MetricCard label={t("opex.co2")} value={`${opex.co2KgDay} kg/d`} />
            </div>
          </>
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
