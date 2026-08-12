import { useTranslation } from "react-i18next";

import { AICopilotPanel } from "@/components/ai/AICopilotPanel";
import { AuthPanel } from "@/components/auth/AuthPanel";
import { Viewport3D } from "@/components/3d/Viewport3D";
import { ClimateDashboard } from "@/components/ui/ClimateDashboard";
import { DimensionControls } from "@/components/ui/DimensionControls";
import { GizmoToolbar } from "@/components/ui/GizmoToolbar";
import { HUDOverlay } from "@/components/ui/HUDOverlay";
import { LanguagePicker } from "@/components/ui/LanguagePicker";
import { useSimulationWS } from "@/hooks/useSimulationWS";

export function AppShell() {
  const { t } = useTranslation("common");
  const { reconnect } = useSimulationWS();

  return (
    <div className="flex h-screen flex-col bg-surface-page text-gray-900">
      <header className="flex items-center justify-between border-b border-border bg-white px-6 py-4 shadow-sm">
        <div>
          <h1 className="text-lg font-bold tracking-tight text-gray-900">
            {t("app.title")}
          </h1>
          <p className="text-xs text-label">{t("app.subtitle")}</p>
        </div>
        <div className="flex items-center gap-4">
          <AuthPanel />
          <LanguagePicker />
        </div>
      </header>

      <main className="grid flex-1 grid-cols-[320px_1fr_300px] gap-4 overflow-hidden p-4">
        <DimensionControls />
        <div className="relative min-h-0">
          <Viewport3D />
          <GizmoToolbar />
          <HUDOverlay />
          <ClimateDashboard onReconnect={reconnect} />
        </div>
        <AICopilotPanel />
      </main>
    </div>
  );
}
