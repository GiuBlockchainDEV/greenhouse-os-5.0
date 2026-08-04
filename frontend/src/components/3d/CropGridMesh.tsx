import { useEffect, useMemo, useRef } from "react";
import * as THREE from "three";

import {
  computeCultivationLayout,
  type BedZone,
  type PlantSlot,
} from "@/lib/cultivationLayout";
import { useGreenhouseStore } from "@/store/useGreenhouseStore";
import type { CropType, CultivationSystem } from "@/types/greenhouse";

const CROP_COLORS: Record<CropType, string> = {
  tomato: "#2d8a4e",
  cucumber: "#3cb371",
  pepper: "#228b22",
  lettuce: "#66cdaa",
  strawberry: "#c0392b",
  cannabis: "#6b8e23",
};

const BED_COLORS: Record<CultivationSystem, string> = {
  soil: "#3d5c3a",
  substrate: "#4a6741",
  growbed: "#5c4a32",
  nft: "#6b7280",
  dwc: "#2563eb",
  drip: "#3d5c3a",
  aeroponic: "#7c3aed",
  ebb_flow: "#5c4a32",
};

function applyInstanceMatrices(mesh: THREE.InstancedMesh, plants: PlantSlot[]): void {
  const dummy = new THREE.Object3D();
  plants.forEach((plant, index) => {
    dummy.position.set(plant.x, plant.y, plant.z);
    dummy.rotation.y = plant.rotation;
    dummy.scale.setScalar(plant.scale);
    dummy.updateMatrix();
    mesh.setMatrixAt(index, dummy.matrix);
  });
  mesh.instanceMatrix.needsUpdate = true;
}

function CultivationBeds({ beds, system }: { beds: BedZone[]; system: CultivationSystem }) {
  const color = BED_COLORS[system];

  return (
    <group>
      {beds.map((bed) => {
        const width = bed.xMax - bed.xMin;
        const depth = bed.zMax - bed.zMin;
        const centerX = (bed.xMin + bed.xMax) / 2;
        const centerZ = (bed.zMin + bed.zMax) / 2;
        const isGutter = system === "nft" || system === "aeroponic";

        return (
          <mesh
            key={`bed-${bed.bayIndex}-${bed.bedIndex}`}
            position={[centerX, bed.elevationM + bed.depthM / 2, centerZ]}
          >
            <boxGeometry args={[width, bed.depthM, isGutter ? 0.35 : depth]} />
            <meshStandardMaterial color={color} roughness={0.85} metalness={0.15} />
          </mesh>
        );
      })}
    </group>
  );
}

export function CropGridMesh() {
  const dimensions = useGreenhouseStore((s) => s.dimensions);
  const structure = useGreenhouseStore((s) => s.structure);
  const crop = useGreenhouseStore((s) => s.crop);
  const meshRef = useRef<THREE.InstancedMesh>(null);

  const layoutResult = useMemo(
    () =>
      computeCultivationLayout({
        length: dimensions.length,
        totalWidth: dimensions.width,
        bayCount: structure.bayCount,
        bayWidthM: structure.bayWidthM,
        eaveHeight: dimensions.eaveHeight,
        system: crop.system,
        layout: crop.layout,
        lai: crop.lai,
        growthStage: crop.growthStage,
      }),
    [
      dimensions.length,
      dimensions.width,
      dimensions.eaveHeight,
      structure.bayCount,
      structure.bayWidthM,
      crop.system,
      crop.layout,
      crop.lai,
      crop.growthStage,
    ],
  );

  const foliageGeometry = useMemo(() => new THREE.ConeGeometry(0.18, 0.55, 6), []);

  useEffect(() => {
    const mesh = meshRef.current;
    if (!mesh) return;
    applyInstanceMatrices(mesh, layoutResult.plants);
  }, [layoutResult.plants]);

  if (layoutResult.plants.length === 0) {
    return null;
  }

  return (
    <group>
      <CultivationBeds beds={layoutResult.beds} system={crop.system} />
      <instancedMesh
        ref={meshRef}
        args={[foliageGeometry, undefined, layoutResult.plants.length]}
        castShadow
        receiveShadow
      >
        <meshStandardMaterial
          color={CROP_COLORS[crop.type]}
          roughness={0.7}
          metalness={0.05}
        />
      </instancedMesh>
    </group>
  );
}
