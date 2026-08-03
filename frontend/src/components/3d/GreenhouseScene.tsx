import { useCallback, useLayoutEffect, useRef, useState } from "react";
import { TransformControls } from "@react-three/drei";
import type { OrbitControls as OrbitControlsImpl } from "three-stdlib";
import * as THREE from "three";

import { CropGridMesh } from "@/components/3d/CropGridMesh";
import { GreenhouseMesh } from "@/components/3d/GreenhouseMesh";
import { HeatmapPlane } from "@/components/3d/HeatmapShader";
import { useGreenhouseStore } from "@/store/useGreenhouseStore";
import type { GreenhouseDimensions } from "@/types/greenhouse";

const DIMENSION_LIMITS = {
  length: { min: 6, max: 120 },
  width: { min: 4, max: 120 },
  height: { min: 2, max: 12 },
} as const;

function clamp(value: number, min: number, max: number): number {
  return Math.min(max, Math.max(min, value));
}

function scaleToDimensions(
  base: GreenhouseDimensions,
  scale: THREE.Vector3,
): GreenhouseDimensions {
  const heightScale = scale.y;
  return {
    length: clamp(base.length * scale.x, DIMENSION_LIMITS.length.min, DIMENSION_LIMITS.length.max),
    width: clamp(base.width * scale.z, DIMENSION_LIMITS.width.min, DIMENSION_LIMITS.width.max),
    eaveHeight: clamp(
      base.eaveHeight * heightScale,
      DIMENSION_LIMITS.height.min,
      DIMENSION_LIMITS.height.max,
    ),
    ridgeHeight: clamp(
      base.ridgeHeight * heightScale,
      DIMENSION_LIMITS.height.min + 0.5,
      DIMENSION_LIMITS.height.max,
    ),
  };
}

interface GreenhouseSceneProps {
  orbitRef: React.RefObject<OrbitControlsImpl | null>;
}

export function GreenhouseScene({ orbitRef }: GreenhouseSceneProps) {
  const groupRef = useRef<THREE.Group>(null);
  const baseDimensionsRef = useRef<GreenhouseDimensions>(
    useGreenhouseStore.getState().dimensions,
  );
  const [gizmoReady, setGizmoReady] = useState(false);

  const gizmoMode = useGreenhouseStore((s) => s.gizmoMode);
  const setDimensions = useGreenhouseStore((s) => s.setDimensions);

  useLayoutEffect(() => {
    if (groupRef.current) {
      setGizmoReady(true);
    }
  }, []);

  const handleDragStart = useCallback(() => {
    baseDimensionsRef.current = { ...useGreenhouseStore.getState().dimensions };
    if (orbitRef.current) {
      orbitRef.current.enabled = false;
    }
  }, [orbitRef]);

  const handleDragEnd = useCallback(() => {
    const group = groupRef.current;
    if (group && gizmoMode === "scale") {
      const next = scaleToDimensions(baseDimensionsRef.current, group.scale);
      setDimensions(next);
      group.scale.set(1, 1, 1);
    }
    if (group && gizmoMode === "translate") {
      group.position.set(0, 0, 0);
    }
    if (orbitRef.current) {
      orbitRef.current.enabled = true;
    }
  }, [gizmoMode, setDimensions, orbitRef]);

  return (
    <>
      <group ref={groupRef}>
        <GreenhouseMesh />
        <CropGridMesh />
        <HeatmapPlane />
      </group>
      {gizmoReady && gizmoMode !== "off" && groupRef.current && (
        <TransformControls
          object={groupRef.current}
          mode={gizmoMode === "scale" ? "scale" : "translate"}
          onMouseDown={handleDragStart}
          onMouseUp={handleDragEnd}
          size={0.75}
        />
      )}
    </>
  );
}
