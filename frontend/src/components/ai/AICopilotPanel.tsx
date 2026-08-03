import { useState } from "react";
import { useTranslation } from "react-i18next";

import { ProviderSelector } from "@/components/ai/ProviderSelector";
import { useAICopilot } from "@/hooks/useAICopilot";
import type { ClimateSetpoint } from "@/types/ai";

export function AICopilotPanel() {
  const { t } = useTranslation("ai_copilot");
  const {
    messages,
    status,
    providers,
    provider,
    setProvider,
    sendMessage,
    optimizeClimate,
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
    <aside className="flex h-full flex-col rounded-xl border border-greenhouse-700 bg-greenhouse-800/60">
      <header className="border-b border-greenhouse-700 px-4 py-3">
        <div className="flex items-center justify-between">
          <h3 className="text-sm font-semibold text-greenhouse-300">{t("panel.title")}</h3>
          {messages.length > 0 && (
            <button
              type="button"
              onClick={clearMessages}
              className="text-[10px] text-white/40 hover:text-white/70"
            >
              {t("actions.clear")}
            </button>
          )}
        </div>
        <div className="mt-2">
          <ProviderSelector
            provider={provider}
            providers={providers}
            onChange={setProvider}
          />
        </div>
      </header>

      <div className="flex-1 space-y-3 overflow-y-auto px-4 py-3">
        {messages.length === 0 && (
          <p className="text-xs leading-relaxed text-white/40">{t("panel.welcome")}</p>
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
          <p className="animate-pulse text-xs text-greenhouse-400">{t("status.thinking")}</p>
        )}
        {status === "error" && (
          <p className="text-xs text-red-400">{t("status.error")}</p>
        )}
      </div>

      <footer className="border-t border-greenhouse-700 p-3">
        <div className="mb-2 flex gap-2">
          <button
            type="button"
            onClick={() => void optimizeClimate()}
            disabled={status === "loading"}
            className="flex-1 rounded-lg border border-greenhouse-500/40 bg-greenhouse-700/40 px-3 py-1.5 text-xs font-medium text-greenhouse-300 transition hover:bg-greenhouse-700 disabled:opacity-50"
          >
            {t("actions.optimize")}
          </button>
          <button
            type="button"
            onClick={() => void sendMessage(t("prompts.explainMetrics"))}
            disabled={status === "loading"}
            className="flex-1 rounded-lg border border-greenhouse-700 bg-greenhouse-900/60 px-3 py-1.5 text-xs font-medium text-white/70 transition hover:bg-greenhouse-800 disabled:opacity-50"
          >
            {t("actions.explain")}
          </button>
        </div>
        <form onSubmit={handleSubmit} className="flex gap-2">
          <input
            type="text"
            value={input}
            onChange={(e) => setInput(e.target.value)}
            placeholder={t("panel.placeholder")}
            disabled={status === "loading"}
            className="flex-1 rounded-lg border border-greenhouse-700 bg-greenhouse-900 px-3 py-2 text-sm text-white placeholder-white/30 outline-none focus:border-greenhouse-400 disabled:opacity-50"
          />
          <button
            type="submit"
            disabled={status === "loading" || !input.trim()}
            className="rounded-lg bg-greenhouse-500 px-4 py-2 text-sm font-medium text-white transition hover:bg-greenhouse-400 disabled:opacity-50"
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
  if (content === "[optimize-climate]") return null;

  return (
    <div
      className={`rounded-lg px-3 py-2 text-xs leading-relaxed ${
        role === "user"
          ? "ml-4 bg-greenhouse-700/50 text-white/90"
          : "mr-4 bg-greenhouse-900/80 text-white/80"
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
    <div className="rounded-lg border border-greenhouse-700/60 bg-greenhouse-900/60 p-3">
      <p className="mb-2 text-[10px] font-semibold uppercase tracking-wide text-greenhouse-400">
        {t("setpoints.title")}
      </p>
      <div className="space-y-2">
        {setpoints.map((sp) => (
          <div key={sp.parameter} className="text-[11px]">
            <div className="flex justify-between font-mono text-white/90">
              <span>{sp.parameter}</span>
              <span>
                {sp.current_value} → {sp.recommended_value} {sp.unit}
              </span>
            </div>
            <p className="text-white/40">{sp.rationale}</p>
          </div>
        ))}
      </div>
    </div>
  );
}
