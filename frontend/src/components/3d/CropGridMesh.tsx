import { useEffect, useMemo, useRef } from "react";
import * as THREE from "three";

import { CultivationBedsGroup } from "@/lib/cultivationBedModels";
import {
  computeCultivationLayout,
  type PlantSlot,
} from "@/lib/cultivationLayout";
import { createPlantLayers } from "@/lib/plantGeometry";
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

function PlantInstances({
  geometry,
  count,
  color,
  plants,
  instanceKey,
}: {
  geometry: THREE.BufferGeometry;
  count: number;
  color?: THREE.Color;
  plants: PlantSlot[];
  instanceKey: string;
}) {
  const meshRef = useRef<THREE.InstancedMesh>(null);

  useEffect(() => {
    const mesh = meshRef.current;
    if (!mesh) return;
    applyInstanceMatrices(mesh, plants);
  }, [plants, instanceKey]);

  return (
    <instancedMesh
      key={instanceKey}
      ref={meshRef}
      args={[geometry, undefined, count]}
      castShadow
      receiveShadow
    >
      {color ? (
        <meshStandardMaterial color={color} roughness={0.78} metalness={0.04} side={THREE.DoubleSide} />
      ) : (
        <meshStandardMaterial vertexColors roughness={0.78} metalness={0.04} side={THREE.DoubleSide} />
      )}
    </instancedMesh>
  );
}

export function CropGridMesh() {
  const dimensions = useGreenhouseStore((s) => s.dimensions);
  const structure = useGreenhouseStore((s) => s.structure);
  const crop = useGreenhouseStore((s) => s.crop);

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

  const layers = useMemo(
    () => createPlantLayers(crop.type, crop.system, crop.growthStage),
    [crop.type, crop.system, crop.growthStage],
  );

  const instanceKey = `${crop.type}-${crop.system}-${crop.growthStage}-${layoutResult.plants.length}-${crop.layout.plantDensity}`;

  if (layoutResult.plants.length === 0) {
    return null;
  }

  const count = layoutResult.plants.length;

  return (
    <group>
      <CultivationBedsGroup beds={layoutResult.beds} system={crop.system} />
      {layers.mount && (
        <PlantInstances
          geometry={layers.mount}
          count={count}
          color={layers.mountColor}
          plants={layoutResult.plants}
          instanceKey={`${instanceKey}-mount`}
        />
      )}
      <PlantInstances
        geometry={layers.foliage}
        count={count}
        plants={layoutResult.plants}
        instanceKey={`${instanceKey}-foliage`}
      />
      {layers.fruit && (
        <PlantInstances
          geometry={layers.fruit}
          count={count}
          color={layers.fruitColor ?? undefined}
          plants={layoutResult.plants}
          instanceKey={`${instanceKey}-fruit`}
        />
      )}
    </group>
  );
}
