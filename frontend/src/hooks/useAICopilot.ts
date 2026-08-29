import { useCallback, useEffect, useState } from "react";

import { useGreenhouseStore } from "@/store/useGreenhouseStore";
import type {
  AIAnalysisType,
  AIChatResponse,
  CopilotMessage,
  CopilotStatus,
  GreenhouseAIContext,
  ProviderInfo,
} from "@/types/ai";

const API_BASE = "/api/v1/ai";

function generateId(): string {
  return `${Date.now()}-${Math.random().toString(36).slice(2, 9)}`;
}

function buildContextFromStore(): GreenhouseAIContext {
  const state = useGreenhouseStore.getState();
  const sim = state.simulationResults;
  const sizing = state.climateEquipment.sizing;

  return {
    crop_type: state.crop.type,
    cultivation_system: state.crop.system,
    growth_stage: state.crop.growthStage,
    lai: state.crop.lai,
    tier_count: state.crop.layout.tierCount,
    plants_per_tier: state.metrics.plantsPerTier,
    total_plants: state.metrics.totalPlants,
    bed_line_count: state.metrics.bedLineCount,
    total_bed_lines: state.metrics.totalBedLines,
    cooling_system: state.climateEquipment.cooling,
    heating_system: state.climateEquipment.heating,
    ventilation_system: state.climateEquipment.ventilation,
    length_m: state.dimensions.length,
    width_m: state.dimensions.width,
    eave_height_m: state.dimensions.eaveHeight,
    ridge_height_m: state.dimensions.ridgeHeight,
    bay_count: state.structure.bayCount,
    bay_width_m: state.structure.bayWidthM,
    arch_type: state.structure.archType,
    floor_area_m2: state.metrics.floorAreaM2,
    volume_m3: state.metrics.volumeM3,
    ridge_angle_deg: state.metrics.ridgeAngleDeg,
    covering_type: state.covering.type,
    transmittance: state.covering.transmittance,
    u_value: state.covering.uValue,
    exhaust_fan_count: sizing.exhaustFanCount,
    exhaust_fan_diameter_m: sizing.exhaustFanDiameterM,
    circulation_fan_count: sizing.circulationFanCount,
    roof_vent_count: sizing.roofVentCount,
    side_vent_count: sizing.sideVentCount,
    ac_unit_count: sizing.acUnitCount,
    pad_wall_width_m: sizing.padWallWidthM,
    pad_wall_height_m: sizing.padWallHeightM,
    heater_unit_count: sizing.heaterUnitCount,
    internal_temp_c: sim?.microclimate.internal_temp,
    external_temp_c: sim?.microclimate.external_temp,
    internal_rh_pct: sim?.microclimate.internal_rh,
    vpd_kpa: sim?.microclimate.vpd_kpa,
    et0_mm_day: sim?.microclimate.et0_fao56,
    ventilation_ach: sim?.ventilation_ach,
    q_solar: sim?.thermal_balance.q_solar,
    q_transpiration: sim?.thermal_balance.q_transpiration,
    q_ventilation: sim?.thermal_balance.q_ventilation,
    q_conduction: sim?.thermal_balance.q_conduction,
    q_net_delta: sim?.thermal_balance.q_net_delta,
    latitude: state.location.lat,
    longitude: state.location.lon,
  };
}

export interface UseAICopilotReturn {
  messages: CopilotMessage[];
  status: CopilotStatus;
  providers: ProviderInfo[];
  gaiaAvailable: boolean;
  sendMessage: (message: string) => Promise<void>;
  runAnalysis: (analysisType: AIAnalysisType, label: string) => Promise<void>;
  clearMessages: () => void;
}

export function useAICopilot(): UseAICopilotReturn {
  const [messages, setMessages] = useState<CopilotMessage[]>([]);
  const [status, setStatus] = useState<CopilotStatus>("idle");
  const [providers, setProviders] = useState<ProviderInfo[]>([]);

  const locale = useGreenhouseStore((s) => s.locale);

  useEffect(() => {
    void fetch(`${API_BASE}/providers`)
      .then((res) => res.json() as Promise<ProviderInfo[]>)
      .then(setProviders)
      .catch(() => setProviders([]));
  }, []);

  const gaiaAvailable = providers.some((p) => p.id === "gemini" && p.available);

  const appendAssistant = useCallback((response: AIChatResponse) => {
    setMessages((prev) => [
      ...prev,
      {
        id: generateId(),
        role: "assistant",
        content: response.content,
        setpoints: response.setpoints.length > 0 ? response.setpoints : undefined,
        usedLocalEngine: response.used_local_engine,
        analysisType: response.analysis_type,
        timestamp: Date.now(),
      },
    ]);
  }, []);

  const sendMessage = useCallback(
    async (message: string) => {
      const trimmed = message.trim();
      if (!trimmed) return;

      setMessages((prev) => [
        ...prev,
        { id: generateId(), role: "user", content: trimmed, timestamp: Date.now() },
      ]);
      setStatus("loading");

      try {
        const response = await fetch(`${API_BASE}/chat`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            message: trimmed,
            context: buildContextFromStore(),
            locale,
          }),
        });

        if (!response.ok) {
          throw new Error(`HTTP ${response.status}`);
        }

        const data = (await response.json()) as AIChatResponse;
        appendAssistant(data);
        setStatus("idle");
      } catch {
        setStatus("error");
      }
    },
    [locale, appendAssistant],
  );

  const runAnalysis = useCallback(
    async (analysisType: AIAnalysisType, label: string) => {
      setMessages((prev) => [
        ...prev,
        {
          id: generateId(),
          role: "user",
          content: label,
          analysisType,
          timestamp: Date.now(),
        },
      ]);
      setStatus("loading");

      try {
        const response = await fetch(`${API_BASE}/analyze`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            analysis_type: analysisType,
            context: buildContextFromStore(),
            locale,
          }),
        });

        if (!response.ok) {
          throw new Error(`HTTP ${response.status}`);
        }

        const data = (await response.json()) as AIChatResponse;
        appendAssistant(data);
        setStatus("idle");
      } catch {
        setStatus("error");
      }
    },
    [locale, appendAssistant],
  );

  const clearMessages = useCallback(() => {
    setMessages([]);
    setStatus("idle");
  }, []);

  return {
    messages,
    status,
    providers,
    gaiaAvailable,
    sendMessage,
    runAnalysis,
    clearMessages,
  };
}
