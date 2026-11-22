import { Suspense, useMemo, useRef } from "react";
import { Canvas } from "@react-three/fiber";
import { OrbitControls, PerspectiveCamera } from "@react-three/drei";
import { useTranslation } from "react-i18next";
import type { OrbitControls as OrbitControlsImpl } from "three-stdlib";

import { FertigationPlantScene } from "@/components/fertigation/FertigationPlantScene";
import { SceneLook, SiteGround } from "@/components/3d/sceneAtmosphere";
import {
  CUSTOM_FERTIGATION_PRESET_ID,
  fertigationPresetById,
  fertigationPresetLabel,
} from "@/lib/fertigation/fertigationPresets";
import { resolvePlantLayout } from "@/lib/fertigation/plantLayoutEngine";
import { freshFertigationProject } from "@/lib/fertigation/projectFactory";
import { FERTIGATION_TEMPLATES } from "@/lib/fertigation/templates";
import { useFertigationStore } from "@/store/useFertigationStore";

function FertigationCanvasInner() {
  const orbitRef = useRef<OrbitControlsImpl | null>(null);
  const activeProject = useFertigationStore((s) => s.activeProject);
  const templateId = useFertigationStore((s) => s.templateId);

  const project = activeProject ?? freshFertigationProject(templateId);

  const span = useMemo(() => {
    const { blueprint } = resolvePlantLayout(project);
    const w = blueprint?.bounds.widthM ?? 14;
    const d = blueprint?.bounds.depthM ?? 13;
    return Math.max(10, Math.max(w, d) * 0.58);
  }, [project]);

  return (
    <>
      <PerspectiveCamera makeDefault position={[span * 0.85, span * 0.55, span * 0.95]} fov={42} />
      <OrbitControls
        ref={orbitRef}
        makeDefault
        enableDamping
        dampingFactor={0.08}
        minDistance={4}
        maxDistance={span * 3.5}
        maxPolarAngle={Math.PI / 2 - 0.06}
        target={[0, 0.45, 0]}
      />
      <SceneLook />
      <SiteGround span={span} />
      <FertigationPlantScene project={project} />
    </>
  );
}

export function FertigationPlantViewport() {
  const { t } = useTranslation("fertigation");
  const projectRevision = useFertigationStore((s) => s.projectRevision);
  const marketPresetId = useFertigationStore((s) => s.marketPresetId);
  const templateId = useFertigationStore((s) => s.templateId);
  const preset =
    marketPresetId !== CUSTOM_FERTIGATION_PRESET_ID
      ? fertigationPresetById(marketPresetId)
      : undefined;
  const template = FERTIGATION_TEMPLATES[templateId];

  return (
    <div className="relative h-full min-h-[220px] w-full overflow-hidden rounded-2xl border border-border bg-gray-100 shadow-card">
      <div className="pointer-events-none absolute bottom-3 right-3 z-10 flex flex-col gap-1 rounded-lg border border-border bg-white/95 px-3 py-2 text-[10px] backdrop-blur-sm">
        <span className="font-semibold text-gray-800">{t("viewport.flowLegend")}</span>
        <div className="flex flex-wrap gap-x-3 gap-y-1 text-label">
          <span className="flex items-center gap-1">
            <span className="h-2 w-2 rounded-full bg-[#4A90A4]" />
            {t("viewport.circuitSource")}
          </span>
          <span className="flex items-center gap-1">
            <span className="h-2 w-2 rounded-full bg-[#64748b]" />
            {t("viewport.circuitMix")}
          </span>
          <span className="flex items-center gap-1">
            <span className="h-2 w-2 rounded-full bg-[#059669]" />
            {t("viewport.circuitCrop")}
          </span>
          <span className="flex items-center gap-1">
            <span className="h-2 w-2 rounded-full bg-[#2F7A6C]" />
            {t("viewport.circuitReturn")}
          </span>
        </div>
      </div>
      <div className="pointer-events-none absolute left-3 right-3 top-3 z-10 flex flex-col gap-1 rounded-lg border border-border bg-white/95 px-3 py-2 backdrop-blur-sm">
        <span className="text-[10px] font-bold uppercase tracking-wide text-status-optimalDark">
          {t("viewport.badge")}
        </span>
        <span className="text-sm font-semibold text-gray-900">
          {preset ? fertigationPresetLabel(preset) : t("presets.custom")}
        </span>
        <span className="text-[11px] text-label">{t(template.nameKey)}</span>
      </div>
      <Canvas
        key={`fertigation-canvas-${projectRevision}`}
        shadows
        gl={{
          antialias: true,
          alpha: false,
          powerPreference: "high-performance",
          logarithmicDepthBuffer: true,
        }}
        dpr={[1, Math.min(2.5, typeof window !== "undefined" ? window.devicePixelRatio : 2)]}
        className="h-full w-full"
      >
        <Suspense fallback={null}>
          <FertigationCanvasInner />
        </Suspense>
      </Canvas>
    </div>
  );
}