import { useState } from "react";
import { useTranslation } from "react-i18next";

import { useAICopilot } from "@/hooks/useAICopilot";
import type { AIAnalysisType, ClimateSetpoint } from "@/types/ai";

const ANALYSIS_TYPES: AIAnalysisType[] = ["structural", "thermal", "efficiency"];

export function AICopilotPanel() {
  const { t } = useTranslation("ai_copilot");
  const {
    messages,
    status,
    geminiAvailable,
    sendMessage,
    runAnalysis,
    clearMessages,
  } = useAICopilot();

  const [input, setInput] = useState("");

  const handleSubmit = (event: React.FormEvent) => {
    event.preventDefault();
    if (status === "loading" || !input.trim()) return;
    void sendMessage(input);
    setInput("");
  };

  return (
    <aside className="ui-card flex h-full flex-col">
      <header className="border-b border-border px-4 py-3">
        <div className="flex items-center justify-between">
          <h3 className="text-sm font-bold text-gray-900">{t("panel.title")}</h3>
          {messages.length > 0 && (
            <button
              type="button"
              onClick={clearMessages}
              className="text-[10px] text-label hover:text-gray-700"
            >
              {t("actions.clear")}
            </button>
          )}
        </div>
        <p className="mt-1 text-[10px] text-label">
          {t("panel.poweredBy")}
          {!geminiAvailable && (
            <span className="ml-1 text-amber-600">{t("panel.geminiUnavailable")}</span>
          )}
        </p>
      </header>

      <div className="flex-1 space-y-3 overflow-y-auto px-4 py-3">
        {messages.length === 0 && (
          <p className="text-xs leading-relaxed text-label">{t("panel.welcome")}</p>
        )}
        {messages.map((msg) => (
          <MessageBubble key={msg.id} role={msg.role} content={msg.content} />
        ))}
        {(() => {
          const lastAssistant = [...messages].reverse().find((m) => m.role === "assistant");
          const setpoints = lastAssistant?.setpoints ?? [];
          return setpoints.length > 0 ? <SetpointsTable setpoints={setpoints} /> : null;
        })()}
        {status === "loading" && (
          <p className="animate-pulse text-xs text-status-optimalDark">{t("status.thinking")}</p>
        )}
        {status === "error" && (
          <p className="text-xs text-red-500">{t("status.error")}</p>
        )}
      </div>

      <footer className="border-t border-border p-3">
        <div className="mb-2 grid grid-cols-3 gap-2">
          {ANALYSIS_TYPES.map((type) => (
            <button
              key={type}
              type="button"
              onClick={() => void runAnalysis(type, t(`actions.${type}`))}
              disabled={status === "loading"}
              className="ui-btn-secondary py-1.5 text-[10px] disabled:opacity-50"
            >
              {t(`actions.${type}`)}
            </button>
          ))}
        </div>
        <form onSubmit={handleSubmit} className="flex gap-2">
          <input
            type="text"
            value={input}
            onChange={(e) => setInput(e.target.value)}
            placeholder={t("panel.placeholder")}
            disabled={status === "loading"}
            className="ui-input flex-1 disabled:opacity-50"
          />
          <button
            type="submit"
            disabled={status === "loading" || !input.trim()}
            className="ui-btn-primary px-4 py-2 text-sm disabled:opacity-50"
          >
            {t("actions.send")}
          </button>
        </form>
      </footer>
    </aside>
  );
}

interface MessageBubbleProps {
  role: "user" | "assistant";
  content: string;
}

function MessageBubble({ role, content }: MessageBubbleProps) {
  return (
    <div
      className={`rounded-xl px-3 py-2 text-xs leading-relaxed whitespace-pre-wrap ${
        role === "user"
          ? "ml-4 bg-emerald-50 text-gray-800 ring-1 ring-emerald-100"
          : "mr-4 bg-surface-muted text-gray-700"
      }`}
    >
      {content}
    </div>
  );
}

interface SetpointsTableProps {
  setpoints: ClimateSetpoint[];
}

function SetpointsTable({ setpoints }: SetpointsTableProps) {
  const { t } = useTranslation("ai_copilot");

  if (setpoints.length === 0) return null;

  return (
    <div className="ui-card-muted p-3">
      <p className="ui-section-title mb-2">
        {t("setpoints.title")}
      </p>
      <div className="space-y-2">
        {setpoints.map((sp) => (
          <div key={sp.parameter} className="text-[11px]">
            <div className="flex justify-between font-mono font-semibold text-gray-800">
              <span>{sp.parameter}</span>
              <span>
                {sp.current_value} → {sp.recommended_value} {sp.unit}
              </span>
            </div>
            <p className="text-label">{sp.rationale}</p>
          </div>
        ))}
      </div>
    </div>
  );
}
