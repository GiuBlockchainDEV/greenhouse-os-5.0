import { useCallback, useEffect, useState } from "react";

import { buildGreenhouseContext } from "@/lib/gaia/buildContext";
import { checkGaiaStatus, gaiaAnalyze, gaiaChat } from "@/lib/gaia/client";
import { useGreenhouseStore } from "@/store/useGreenhouseStore";
import type {
  AIAnalysisType,
  AIChatResponse,
  CopilotMessage,
  CopilotStatus,
} from "@/types/ai";
import type { GaiaAnalysisSeason } from "@/types/greenhouse";

function generateId(): string {
  return `${Date.now()}-${Math.random().toString(36).slice(2, 9)}`;
}

export interface UseAICopilotReturn {
  messages: CopilotMessage[];
  status: CopilotStatus;
  gaiaAvailable: boolean;
  sendMessage: (message: string) => Promise<void>;
  runAnalysis: (
    analysisType: AIAnalysisType,
    label: string,
    season: GaiaAnalysisSeason,
  ) => Promise<void>;
  clearMessages: () => void;
}

export function useAICopilot(): UseAICopilotReturn {
  const [messages, setMessages] = useState<CopilotMessage[]>([]);
  const [status, setStatus] = useState<CopilotStatus>("idle");
  const [gaiaAvailable, setGaiaAvailable] = useState(false);

  const locale = useGreenhouseStore((s) => s.locale);

  useEffect(() => {
    void checkGaiaStatus().then((result) => setGaiaAvailable(result.available));
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
        analysisType: response.analysis_type,
        truncated: response.truncated,
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
        const data = await gaiaChat(trimmed, buildGreenhouseContext(), locale);
        if (!data.used_local_engine) setGaiaAvailable(true);
        appendAssistant(data);
        setStatus("idle");
      } catch {
        setStatus("error");
      }
    },
    [locale, appendAssistant],
  );

  const runAnalysis = useCallback(
    async (analysisType: AIAnalysisType, label: string, season: GaiaAnalysisSeason) => {
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
        const data = await gaiaAnalyze(
          analysisType,
          buildGreenhouseContext({ analysisSeason: season }),
          locale,
        );
        if (!data.used_local_engine) setGaiaAvailable(true);
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
    gaiaAvailable,
    sendMessage,
    runAnalysis,
    clearMessages,
  };
}
