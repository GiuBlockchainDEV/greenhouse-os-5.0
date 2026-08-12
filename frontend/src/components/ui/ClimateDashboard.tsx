import { useState } from "react";
import { useTranslation } from "react-i18next";

import { RangeGauge } from "@/components/ui/RangeGauge";
import { StatusBadge } from "@/components/ui/StatusBadge";
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

const STATUS_TONE: Record<
  WSConnectionStatus,
  "optimal" | "warning" | "error" | "neutral" | "sync"
> = {
  idle: "neutral",
  connecting: "warning",
  connected: "optimal",
  disconnected: "warning",
  error: "error",
};

const EXPORT_FORMATS: ClimateComputerFormat[] = ["priva", "ridder", "hoogendoorn"];

interface ClimateDashboardProps {
  onReconnect: () => void;
}

export function ClimateDashboard({ onReconnect }: ClimateDashboardProps) {
  const { t } = useTranslation("simulation");
  const { t: tCommon } = useTranslation("common");
  const { t: tCrops } = useTranslation("crops");
  const { user, status: authStatus } = useAuth();

  const status = useGreenhouseStore((s) => s.simulationStatus);
  const results = useGreenhouseStore((s) => s.simulationResults);
  const metrics = useGreenhouseStore((s) => s.metrics);
  const name = useGreenhouseStore((s) => s.name);
  const crop = useGreenhouseStore((s) => s.crop);

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

  const statusLabel =
    status === "connected"
      ? t("status.inRange", { defaultValue: "In range" })
      : t(`status.${STATUS_LABELS[status]}`);

  return (
    <div className="pointer-events-auto absolute inset-x-0 bottom-0 z-10 p-4">
      <div className="ui-card px-5 py-4">
        <div className="mb-4 flex flex-wrap items-start justify-between gap-3">
          <div className="flex items-start gap-3">
            <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-gradient-to-br from-emerald-500 to-status-optimalDark">
              <svg viewBox="0 0 24 24" className="h-5 w-5 text-white" fill="currentColor" aria-hidden>
                <path d="M12 2C9.5 2 7.5 4 7.5 6.5c0 3.5 4.5 9.5 4.5 9.5s4.5-6 4.5-9.5C16.5 4 14.5 2 12 2zm0 4a1.5 1.5 0 110 3 1.5 1.5 0 010-3z" />
              </svg>
            </div>
            <div>
              <h3 className="text-sm font-bold text-gray-900">
                {t("panel.climateTitle", { defaultValue: "Climate" })} – {name}
              </h3>
              <p className="mt-0.5 text-xs text-label">
                {tCrops(`types.${crop.type}`)} · {tCrops(`stages.${crop.growthStage}`)} ·{" "}
                {metrics.totalPlants.toLocaleString()} {tCrops("labels.plantsShort", { defaultValue: "plants" })} ·{" "}
                {metrics.floorAreaM2} m²
              </p>
            </div>
          </div>
          <div className="flex flex-wrap items-center gap-2">
            <StatusBadge
              label={statusLabel}
              tone={STATUS_TONE[status]}
              pulse={status === "connecting"}
            />
            {results && (
              <span className="font-mono text-[10px] text-gray-400">
                {results.computation_ms.toFixed(1)} ms
              </span>
            )}
          </div>
        </div>

        <div className="mb-3 flex flex-wrap items-center gap-2">
          {EXPORT_FORMATS.map((fmt) => (
            <button
              key={fmt}
              type="button"
              disabled={exporting || !micro}
              onClick={() => void handleExport(fmt)}
              className="ui-btn-ghost uppercase tracking-wide"
            >
              {t(`export.${fmt}`)}
            </button>
          ))}
          {authStatus === "authenticated" && user && (
            <button
              type="button"
              disabled={saving}
              onClick={() => void handleSave()}
              className="ui-btn-primary"
            >
              {tCommon("actions.save")}
            </button>
          )}
          {(status === "disconnected" || status === "error") && (
            <button type="button" onClick={onReconnect} className="ui-btn-secondary">
              {t("actions.reconnect")}
            </button>
          )}
        </div>

        {message && <p className="mb-2 text-xs text-status-optimalDark">{message}</p>}

        {micro && thermal && opex ? (
          <>
            <div className="mb-4 grid grid-cols-2 gap-x-8 gap-y-5 md:grid-cols-4">
              <RangeGauge
                label={t("metrics.internalTemp")}
                value={micro.internal_temp}
                unit="°C"
                min={10}
                max={40}
                optimalMin={20}
                optimalMax={28}
                rangeLabel="20 – 28"
                hint={t("metrics.optimalTempHint", { defaultValue: "Optimal for crop stage" })}
              />
              <RangeGauge
                label={t("metrics.internalRh")}
                value={micro.internal_rh}
                unit="%"
                min={30}
                max={100}
                optimalMin={60}
                optimalMax={85}
                rangeLabel="60 – 85"
                decimals={0}
              />
              <RangeGauge
                label={t("metrics.vpd")}
                value={micro.vpd_kpa}
                unit="kPa"
                min={0}
                max={2.5}
                optimalMin={0.8}
                optimalMax={1.2}
                rangeLabel="0,8 – 1,2"
              />
              <RangeGauge
                label={t("metrics.et0")}
                value={micro.et0_fao56}
                unit="mm/d"
                min={0}
                max={12}
                optimalMin={2}
                optimalMax={8}
                variant="blue"
                rangeLabel={t("metrics.et0Range", { defaultValue: "Reference evapotranspiration" })}
              />
            </div>

            <div className="ui-divider mb-3 pt-3">
              <div className="grid grid-cols-2 gap-4 md:grid-cols-4 lg:grid-cols-7">
                <MetricCard label={t("metrics.externalTemp")} value={`${micro.external_temp}°C`} />
                <MetricCard label={t("thermal.qSolar")} value={`${thermal.q_solar} W/m²`} highlight />
                <MetricCard label={t("thermal.qTranspiration")} value={`${thermal.q_transpiration} W/m²`} />
                <MetricCard label={t("thermal.qNet")} value={`${thermal.q_net_delta} W/m²`} />
                <MetricCard label={t("opex.energy")} value={`${opex.energyKwhM2Day} kWh/m²`} />
                <MetricCard label={t("opex.cost")} value={`€${opex.opexEurDay}/d`} highlight />
                <MetricCard label={t("opex.co2")} value={`${opex.co2KgDay} kg/d`} />
              </div>
            </div>

            <p className="text-center text-[11px] text-label">
              {t("panel.syncFooter", {
                defaultValue: "Live simulation · synced",
              })}
            </p>
          </>
        ) : (
          <p className="text-xs text-label">{t("status.idle")}</p>
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
      <dt className="text-[10px] text-label">{label}</dt>
      <dd
        className={`font-mono text-sm font-semibold ${highlight ? "text-status-optimalDark" : "text-gray-800"}`}
      >
        {value}
      </dd>
    </div>
  );
}
