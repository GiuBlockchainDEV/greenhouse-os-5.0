import { useTranslation } from "react-i18next";

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
    <div className="flex h-screen flex-col bg-greenhouse-900 text-white">
      <header className="flex items-center justify-between border-b border-greenhouse-700 px-6 py-4">
        <div>
          <h1 className="text-lg font-bold tracking-tight text-greenhouse-300">
            {t("app.title")}
          </h1>
          <p className="text-xs text-white/50">{t("app.subtitle")}</p>
        </div>
        <LanguagePicker />
      </header>

      <main className="grid flex-1 grid-cols-[320px_1fr] gap-4 overflow-hidden p-4">
        <DimensionControls />
        <div className="relative min-h-0">
          <Viewport3D />
          <GizmoToolbar />
          <HUDOverlay />
          <ClimateDashboard onReconnect={reconnect} />
        </div>
      </main>
    </div>
  );
}
