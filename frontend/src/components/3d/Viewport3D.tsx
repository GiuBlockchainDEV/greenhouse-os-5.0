import { Suspense, useRef } from "react";
import { Canvas } from "@react-three/fiber";
import { Grid, OrbitControls, PerspectiveCamera } from "@react-three/drei";
import type { OrbitControls as OrbitControlsImpl } from "three-stdlib";

import { GreenhouseScene } from "@/components/3d/GreenhouseScene";
import { useGreenhouseStore } from "@/store/useGreenhouseStore";

function SceneLighting() {
  return (
    <>
      <ambientLight intensity={0.35} />
      <directionalLight
        position={[20, 30, 15]}
        intensity={1.2}
        castShadow
        shadow-mapSize={[2048, 2048]}
      />
      <directionalLight position={[-15, 10, -10]} intensity={0.3} color="#86efac" />
      <hemisphereLight args={["#86efac", "#0a1f0f", 0.4]} />
    </>
  );
}

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
      <SceneLighting />
      <Grid
        args={[100, 100]}
        cellSize={1}
        cellThickness={0.5}
        cellColor="#1a3822"
        sectionSize={5}
        sectionThickness={1}
        sectionColor="#2d6a3e"
        fadeDistance={80}
        fadeStrength={1}
        followCamera={false}
        infiniteGrid
      />
      <GreenhouseScene orbitRef={orbitRef} />
    </>
  );
}

function CanvasLoader() {
  return (
    <mesh>
      <boxGeometry args={[1, 1, 1]} />
      <meshStandardMaterial color="#2d6a3e" wireframe />
    </mesh>
  );
}

export function Viewport3D() {
  return (
    <div className="relative h-full w-full overflow-hidden rounded-2xl border border-border bg-gray-100 shadow-card">
      <Canvas shadows gl={{ antialias: true, alpha: false }} dpr={[1, 2]}>
        <color attach="background" args={["#0a1f0f"]} />
        <fog attach="fog" args={["#0a1f0f", 40, 120]} />
        <Suspense fallback={<CanvasLoader />}>
          <SceneContent />
        </Suspense>
      </Canvas>
    </div>
  );
}
