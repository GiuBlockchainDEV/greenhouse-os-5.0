import { Suspense, useRef } from "react";
import { Canvas } from "@react-three/fiber";
import { OrbitControls, PerspectiveCamera } from "@react-three/drei";
import type { OrbitControls as OrbitControlsImpl } from "three-stdlib";

import { GreenhouseScene } from "@/components/3d/GreenhouseScene";
import { SceneLook, SiteGround } from "@/components/3d/sceneAtmosphere";
import { useGreenhouseStore } from "@/store/useGreenhouseStore";

function SceneContent() {
  const orbitRef = useRef<OrbitControlsImpl | null>(null);
  const dimensions = useGreenhouseStore((state) => state.dimensions);
  const maxDim = Math.max(dimensions.length, dimensions.width, dimensions.ridgeHeight);

  return (
    <>
      <PerspectiveCamera makeDefault position={[maxDim * 1.2, maxDim * 0.8, maxDim * 1.4]} fov={45} />
      <OrbitControls
        ref={orbitRef}
        makeDefault
        enableDamping
        dampingFactor={0.08}
        minDistance={5}
        maxDistance={maxDim * 4}
        maxPolarAngle={Math.PI / 2 - 0.05}
        target={[0, dimensions.eaveHeight / 2, 0]}
      />
      <SceneLook />
      <SiteGround span={maxDim} />
      <GreenhouseScene orbitRef={orbitRef} />
    </>
  );
}

function CanvasLoader() {
  return (
    <mesh>
      <boxGeometry args={[1, 1, 1]} />
      <meshStandardMaterial color="#059669" wireframe />
    </mesh>
  );
}

export function Viewport3D() {
  return (
    <div className="relative h-full w-full overflow-hidden rounded-2xl border border-border bg-gray-100 shadow-card">
      <Canvas
        shadows
        gl={{ antialias: true, alpha: false, powerPreference: "high-performance" }}
        dpr={[1, 2]}
      >
        <Suspense fallback={<CanvasLoader />}>
          <SceneContent />
        </Suspense>
      </Canvas>
    </div>
  );
}
