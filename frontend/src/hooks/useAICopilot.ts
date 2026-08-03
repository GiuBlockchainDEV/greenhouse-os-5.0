import { useCallback, useEffect, useState } from "react";

import { useGreenhouseStore } from "@/store/useGreenhouseStore";
import type {
  AIChatResponse,
  AIProviderType,
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

  return {
    crop_type: state.crop.type,
    cultivation_system: state.crop.system,
    growth_stage: state.crop.growthStage,
    lai: state.crop.lai,
    tier_count: state.crop.layout.tierCount,
    plants_per_tier: state.crop.layout.plantsPerTier,
    cooling_system: state.climateEquipment.cooling,
    heating_system: state.climateEquipment.heating,
    ventilation_system: state.climateEquipment.ventilation,
    length_m: state.dimensions.length,
    width_m: state.dimensions.width,
    covering_type: state.covering.type,
    transmittance: state.covering.transmittance,
    internal_temp_c: sim?.microclimate.internal_temp,
    external_temp_c: sim?.microclimate.external_temp,
    internal_rh_pct: sim?.microclimate.internal_rh,
    vpd_kpa: sim?.microclimate.vpd_kpa,
    et0_mm_day: sim?.microclimate.et0_fao56,
    latitude: state.location.lat,
    longitude: state.location.lon,
  };
}

export interface UseAICopilotReturn {
  messages: CopilotMessage[];
  status: CopilotStatus;
  providers: ProviderInfo[];
  provider: AIProviderType;
  setProvider: (provider: AIProviderType) => void;
  sendMessage: (message: string) => Promise<void>;
  optimizeClimate: () => Promise<void>;
  clearMessages: () => void;
}

export function useAICopilot(): UseAICopilotReturn {
  const [messages, setMessages] = useState<CopilotMessage[]>([]);
  const [status, setStatus] = useState<CopilotStatus>("idle");
  const [providers, setProviders] = useState<ProviderInfo[]>([]);

  const provider = useGreenhouseStore((s) => s.aiProvider);
  const setProvider = useGreenhouseStore((s) => s.setAiProvider);
  const locale = useGreenhouseStore((s) => s.locale);

  useEffect(() => {
    void fetch(`${API_BASE}/providers`)
      .then((res) => res.json() as Promise<ProviderInfo[]>)
      .then(setProviders)
      .catch(() => setProviders([]));
  }, []);

  const appendAssistant = useCallback((response: AIChatResponse) => {
    setMessages((prev) => [
      ...prev,
      {
        id: generateId(),
        role: "assistant",
        content: response.content,
        setpoints: response.setpoints.length > 0 ? response.setpoints : undefined,
        usedLocalEngine: response.used_local_engine,
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
            provider,
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
    [provider, locale, appendAssistant],
  );

  const optimizeClimate = useCallback(async () => {
    setStatus("loading");

    try {
      const response = await fetch(`${API_BASE}/optimize-climate`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          provider,
          context: buildContextFromStore(),
          locale,
        }),
      });

      if (!response.ok) {
        throw new Error(`HTTP ${response.status}`);
      }

      const data = (await response.json()) as AIChatResponse;
      setMessages((prev) => [
        ...prev,
        {
          id: generateId(),
          role: "user",
          content: "[optimize-climate]",
          timestamp: Date.now(),
        },
      ]);
      appendAssistant(data);
      setStatus("idle");
    } catch {
      setStatus("error");
    }
  }, [provider, locale, appendAssistant]);

  const clearMessages = useCallback(() => {
    setMessages([]);
    setStatus("idle");
  }, []);

  return {
    messages,
    status,
    providers,
    provider,
    setProvider,
    sendMessage,
    optimizeClimate,
    clearMessages,
  };
}
