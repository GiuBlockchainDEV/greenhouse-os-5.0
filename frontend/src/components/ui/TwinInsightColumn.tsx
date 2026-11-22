import { useEffect, useState } from "react";
import { useTranslation } from "react-i18next";

import { AICopilotPanel } from "@/components/ai/AICopilotPanel";
import { DimensionControls } from "@/components/ui/DimensionControls";
import { OfflineTwinAdvisor } from "@/components/ui/OfflineTwinAdvisor";

export type TwinInsightTab = "advisor" | "design" | "copilot";

interface TwinInsightColumnProps {
  activeTab?: TwinInsightTab;
  onTabChange?: (tab: TwinInsightTab) => void;
}

export function TwinInsightColumn({ activeTab, onTabChange }: TwinInsightColumnProps) {
  const { t } = useTranslation("experience");
  const [internalTab, setInternalTab] = useState<TwinInsightTab>("advisor");
  const tab = activeTab ?? internalTab;

  const setTab = (next: TwinInsightTab) => {
    setInternalTab(next);
    onTabChange?.(next);
  };

  useEffect(() => {
    if (activeTab) {
      setInternalTab(activeTab);
    }
  }, [activeTab]);

  return (
    <div className="flex min-h-0 flex-col gap-2">
      <div className="ui-card flex gap-1 p-1">
        <TabButton active={tab === "design"} onClick={() => setTab("design")} label={t("insightColumn.tabDesign")} highlight />
        <TabButton active={tab === "advisor"} onClick={() => setTab("advisor")} label={t("insightColumn.tabAdvisor")} />
        <TabButton active={tab === "copilot"} onClick={() => setTab("copilot")} label={t("insightColumn.tabCopilot")} />
      </div>
      {tab === "design" ? (
        <div className="min-h-0 flex-1 overflow-y-auto">
          <p className="mb-2 px-1 text-[10px] text-label">{t("insightColumn.designHint")}</p>
          <DimensionControls />
        </div>
      ) : tab === "advisor" ? (
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

function TabButton({
  active,
  label,
  onClick,
  highlight = false,
}: {
  active: boolean;
  label: string;
  onClick: () => void;
  highlight?: boolean;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={`flex-1 rounded-lg px-2 py-2 text-xs font-semibold transition ${
        active
          ? "bg-status-optimalDark text-white shadow-sm"
          : highlight
            ? "bg-emerald-50 text-status-optimalDark hover:bg-emerald-100"
            : "text-label hover:bg-gray-100"
      }`}
    >
      {label}
    </button>
  );
}