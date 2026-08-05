import { useEffect, useMemo, useRef } from "react";
import * as THREE from "three";

import { CultivationBedsGroup } from "@/lib/cultivationBedModels";
import {
  computeCultivationLayout,
  type PlantSlot,
} from "@/lib/cultivationLayout";
import { createPlantGeometry } from "@/lib/plantGeometry";
import { useGreenhouseStore } from "@/store/useGreenhouseStore";

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
        cropType: crop.type,
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
      crop.type,
      crop.system,
      crop.layout,
      crop.lai,
      crop.growthStage,
    ],
  );

  const plantGeometry = useMemo(
    () => createPlantGeometry(crop.type, crop.system, crop.growthStage),
    [crop.type, crop.system, crop.growthStage],
  );

  const instanceKey = `${crop.type}-${crop.system}-${crop.growthStage}-${layoutResult.plants.length}`;

  useEffect(() => {
    const mesh = meshRef.current;
    if (!mesh) return;
    applyInstanceMatrices(mesh, layoutResult.plants);
  }, [layoutResult.plants, instanceKey]);

  if (layoutResult.plants.length === 0) {
    return null;
  }

  return (
    <group>
      <CultivationBedsGroup beds={layoutResult.beds} system={crop.system} />
      <instancedMesh
        key={instanceKey}
        ref={meshRef}
        args={[plantGeometry, undefined, layoutResult.plants.length]}
        castShadow
        receiveShadow
      >
        <meshStandardMaterial
          vertexColors
          side={THREE.DoubleSide}
          roughness={0.82}
          metalness={0.03}
        />
      </instancedMesh>
    </group>
  );
}
