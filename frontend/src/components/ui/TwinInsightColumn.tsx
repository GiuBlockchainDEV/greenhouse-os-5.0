import { useState } from "react";
import { useTranslation } from "react-i18next";

import { AICopilotPanel } from "@/components/ai/AICopilotPanel";
import { OfflineTwinAdvisor } from "@/components/ui/OfflineTwinAdvisor";

export function TwinInsightColumn() {
  const { t } = useTranslation("experience");
  const [tab, setTab] = useState<"advisor" | "copilot">("advisor");

  return (
    <div className="flex min-h-0 flex-col gap-2">
      <div className="ui-card flex gap-1 p-1">
        <TabButton active={tab === "advisor"} onClick={() => setTab("advisor")} label={t("insightColumn.tabAdvisor")} />
        <TabButton active={tab === "copilot"} onClick={() => setTab("copilot")} label={t("insightColumn.tabCopilot")} />
      </div>
      {tab === "advisor" ? (
        <>
          <p className="px-1 text-[10px] text-label">{t("insightColumn.advisorHint")}</p>
          <OfflineTwinAdvisor />
        </>
      ) : (
        <div className="min-h-0 flex-1">
          <AICopilotPanel />
        </div>
      )}
    </div>
  );
}

function TabButton({ active, label, onClick }: { active: boolean; label: string; onClick: () => void }) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={`flex-1 rounded-lg px-2 py-2 text-xs font-semibold transition ${
        active ? "bg-status-optimalDark text-white shadow-sm" : "text-label hover:bg-gray-100"
      }`}
    >
      {label}
    </button>
  );
}