import { useEffect, useState } from "react";
import { useTranslation } from "react-i18next";

import { AuthPanel } from "@/components/auth/AuthPanel";
import { Viewport3D } from "@/components/3d/Viewport3D";
import { FertigationPresetControls } from "@/components/fertigation/FertigationPresetControls";
import { FertigationStudioCenter } from "@/components/fertigation/FertigationStudioCenter";
import { FertigationSummaryPanel } from "@/components/fertigation/FertigationSummaryPanel";
import { HUDOverlay } from "@/components/ui/HUDOverlay";
import { LanguagePicker } from "@/components/ui/LanguagePicker";
import { WorkspaceModeSwitch } from "@/components/ui/WorkspaceModeSwitch";
import { ClimateDashboard } from "@/components/ui/ClimateDashboard";
import { TwinInsightColumn, type TwinInsightTab } from "@/components/ui/TwinInsightColumn";
import { TwinLaunchExperience } from "@/components/ui/TwinLaunchExperience";
import { TwinExecutiveBrief } from "@/components/ui/TwinExecutiveBrief";
import { TwinFocusChrome } from "@/components/ui/TwinFocusChrome";
import { hasCompletedTwinLaunch } from "@/lib/twin/twinLaunchState";
import { useFertigationGreenhouseSync } from "@/hooks/useFertigationGreenhouseSync";
import { useTwinProjectPersist } from "@/hooks/useTwinProjectPersist";
import { useSimulationWS } from "@/hooks/useSimulationWS";
import { useTwinScenarioClock } from "@/hooks/useTwinScenarioClock";
import { useWorkspaceStore } from "@/store/useWorkspaceStore";

export function AppShell() {
  const { t } = useTranslation("common");
  const workspaceMode = useWorkspaceStore((state) => state.mode);
  const [launchOpen, setLaunchOpen] = useState(false);
  const [insightTab, setInsightTab] = useState<TwinInsightTab>("design");
  const { reconnect } = useSimulationWS();
  useTwinScenarioClock();
  useTwinProjectPersist();
  useFertigationGreenhouseSync();

  useEffect(() => {
    const timer = window.setTimeout(() => {
      if (!hasCompletedTwinLaunch()) {
        setLaunchOpen(true);
      }
    }, 400);
    return () => window.clearTimeout(timer);
  }, []);

  return (
    <div className="flex h-screen flex-col bg-surface-page text-gray-900">
      <header className="flex items-center justify-between border-b border-border bg-white px-6 py-4 shadow-sm">
        <div className="flex items-center gap-3">
          <img
            src="/logo512.png"
            alt=""
            width={40}
            height={40}
            className="h-10 w-10 shrink-0 rounded-lg object-contain"
          />
          <div>
            <h1 className="text-lg font-bold tracking-tight text-gray-900">
              {t("app.title")}
            </h1>
            <p className="text-xs text-label">{t("app.subtitle")}</p>
          </div>
        </div>
        <div className="flex items-center gap-4">
          {workspaceMode === "greenhouse" ? (
            <button
              type="button"
              onClick={() => setInsightTab("design")}
              className="rounded-lg bg-emerald-700 px-3 py-1.5 text-xs font-bold text-white shadow-sm hover:bg-emerald-800"
            >
              {t("app.openGreenhouseDesign")}
            </button>
          ) : null}
          <WorkspaceModeSwitch />
          <AuthPanel />
          <LanguagePicker />
        </div>
      </header>

      {workspaceMode === "greenhouse" ? (
        <>
          <main className="grid min-h-0 flex-1 grid-cols-[1fr_380px] gap-3 overflow-hidden p-3">
            <div className="relative min-h-0 min-w-0">
              <Viewport3D />
              <TwinExecutiveBrief />
              <TwinFocusChrome
                designOpen={insightTab === "design"}
                onToggleDesign={() => setInsightTab((prev) => (prev === "design" ? "advisor" : "design"))}
              />
              <HUDOverlay />
              <ClimateDashboard onReconnect={reconnect} />
            </div>
            <TwinInsightColumn activeTab={insightTab} onTabChange={setInsightTab} />
          </main>
        </>
      ) : (
        <main className="grid min-h-0 flex-1 grid-cols-[320px_1fr_320px] gap-4 overflow-hidden p-4">
          <FertigationPresetControls />
          <FertigationStudioCenter />
          <FertigationSummaryPanel />
        </main>
      )}

      {workspaceMode === "greenhouse" ? (
        <TwinLaunchExperience
          open={launchOpen}
          onClose={() => {
            setLaunchOpen(false);
            setInsightTab("design");
          }}
        />
      ) : null}
    </div>
  );
}
