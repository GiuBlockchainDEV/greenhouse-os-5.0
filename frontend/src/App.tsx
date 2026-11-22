import { useTranslation } from "react-i18next";

import { AICopilotPanel } from "@/components/ai/AICopilotPanel";
import { OfflineTwinAdvisor } from "@/components/ui/OfflineTwinAdvisor";
import { AuthPanel } from "@/components/auth/AuthPanel";
import { Viewport3D } from "@/components/3d/Viewport3D";
import { FertigationPresetControls } from "@/components/fertigation/FertigationPresetControls";
import { FertigationStudioCenter } from "@/components/fertigation/FertigationStudioCenter";
import { FertigationSummaryPanel } from "@/components/fertigation/FertigationSummaryPanel";
import { DimensionControls } from "@/components/ui/DimensionControls";
import { HUDOverlay } from "@/components/ui/HUDOverlay";
import { LanguagePicker } from "@/components/ui/LanguagePicker";
import { WorkspaceModeSwitch } from "@/components/ui/WorkspaceModeSwitch";
import { ClimateDashboard } from "@/components/ui/ClimateDashboard";
import { useFertigationGreenhouseSync } from "@/hooks/useFertigationGreenhouseSync";
import { useTwinProjectPersist } from "@/hooks/useTwinProjectPersist";
import { useSimulationWS } from "@/hooks/useSimulationWS";
import { useTwinScenarioClock } from "@/hooks/useTwinScenarioClock";
import { useWorkspaceStore } from "@/store/useWorkspaceStore";

export function AppShell() {
  const { t } = useTranslation("common");
  const workspaceMode = useWorkspaceStore((state) => state.mode);
  const { reconnect } = useSimulationWS();
  useTwinScenarioClock();
  useTwinProjectPersist();
  useFertigationGreenhouseSync();

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
          <WorkspaceModeSwitch />
          <AuthPanel />
          <LanguagePicker />
        </div>
      </header>

      {workspaceMode === "greenhouse" ? (
        <main className="grid min-h-0 flex-1 grid-cols-[320px_1fr_480px] gap-4 overflow-hidden p-4">
          <DimensionControls />
          <div className="relative min-h-0">
            <Viewport3D />
            <HUDOverlay />
            <ClimateDashboard onReconnect={reconnect} />
          </div>
          <div className="flex min-h-0 flex-col gap-3">
            <OfflineTwinAdvisor />
            <div className="min-h-0 flex-1">
              <AICopilotPanel />
            </div>
          </div>
        </main>
      ) : (
        <main className="grid min-h-0 flex-1 grid-cols-[320px_1fr_320px] gap-4 overflow-hidden p-4">
          <FertigationPresetControls />
          <FertigationStudioCenter />
          <FertigationSummaryPanel />
        </main>
      )}
    </div>
  );
}
