import { Suspense, useMemo, useRef } from "react";
import { Canvas } from "@react-three/fiber";
import { OrbitControls, PerspectiveCamera } from "@react-three/drei";
import { useTranslation } from "react-i18next";
import type { OrbitControls as OrbitControlsImpl } from "three-stdlib";

import { FertigationPlantScene } from "@/components/fertigation/FertigationPlantScene";
import { SceneLook, SiteGround } from "@/components/3d/sceneAtmosphere";
import { freshFertigationProject } from "@/lib/fertigation/projectFactory";
import { useFertigationStore } from "@/store/useFertigationStore";

function FertigationCanvasInner() {
  const orbitRef = useRef<OrbitControlsImpl | null>(null);
  const activeProject = useFertigationStore((s) => s.activeProject);
  const templateId = useFertigationStore((s) => s.templateId);

  const project = activeProject ?? freshFertigationProject(templateId);

  const span = useMemo(() => {
    let maxR = 8;
    for (const node of project.nodes) {
      const x = Math.abs((node.x - 448) / 14);
      const z = Math.abs((node.y - 247) / 14);
      maxR = Math.max(maxR, x + 3, z + 3);
    }
    return maxR;
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

  return (
    <div className="relative h-full min-h-[220px] w-full overflow-hidden rounded-2xl border border-border bg-gray-100 shadow-card">
      <div className="pointer-events-none absolute left-3 top-3 z-10 rounded-lg border border-border bg-white/90 px-2 py-1 text-[10px] font-semibold uppercase tracking-wide text-label backdrop-blur-sm">
        {t("viewport.badge")}
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