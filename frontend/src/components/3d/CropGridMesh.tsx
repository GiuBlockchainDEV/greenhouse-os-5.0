import { useEffect, useMemo, useRef } from "react";
import * as THREE from "three";

import { useGreenhouseStore } from "@/store/useGreenhouseStore";
import type { CropType } from "@/types/greenhouse";

const CROP_COLORS: Record<CropType, string> = {
  tomato: "#2d8a4e",
  cucumber: "#3cb371",
  pepper: "#228b22",
  lettuce: "#66cdaa",
  strawberry: "#c0392b",
  cannabis: "#6b8e23",
};

const CROP_SPACING: Record<CropType, number> = {
  tomato: 0.5,
  cucumber: 0.45,
  pepper: 0.4,
  lettuce: 0.25,
  strawberry: 0.3,
  cannabis: 0.6,
};

const STAGE_SCALE: Record<string, number> = {
  seedling: 0.4,
  early_vegetative: 0.6,
  mid_season: 1.0,
  late_vegetative: 1.1,
  generative: 1.0,
  harvest: 0.85,
};

interface PlantInstance {
  x: number;
  z: number;
  scale: number;
  rotation: number;
}

function computePlantGrid(
  length: number,
  width: number,
  cropType: CropType,
  lai: number,
  growthStage: string,
): PlantInstance[] {
  const spacing = CROP_SPACING[cropType];
  const cols = Math.max(1, Math.floor(width / spacing));
  const rows = Math.max(1, Math.floor(length / spacing));
  const stageScale = STAGE_SCALE[growthStage] ?? 1.0;
  const baseScale = (0.25 + lai * 0.12) * stageScale;

  const plants: PlantInstance[] = [];
  const offsetX = -length / 2 + spacing / 2;
  const offsetZ = -width / 2 + spacing / 2;

  for (let row = 0; row < rows; row++) {
    for (let col = 0; col < cols; col++) {
      const jitter = ((row * cols + col) % 7) * 0.02 - 0.06;
      plants.push({
        x: offsetX + row * spacing + jitter,
        z: offsetZ + col * spacing + jitter,
        scale: baseScale * (0.85 + ((row + col) % 5) * 0.05),
        rotation: ((row * 3 + col * 7) % 360) * (Math.PI / 180),
      });
    }
  }

  return plants;
}

function applyInstanceMatrices(
  mesh: THREE.InstancedMesh,
  plants: PlantInstance[],
): void {
  const dummy = new THREE.Object3D();
  plants.forEach((plant, index) => {
    dummy.position.set(plant.x, 0.28, plant.z);
    dummy.rotation.y = plant.rotation;
    dummy.scale.setScalar(plant.scale);
    dummy.updateMatrix();
    mesh.setMatrixAt(index, dummy.matrix);
  });
  mesh.instanceMatrix.needsUpdate = true;
}

export function CropGridMesh() {
  const dimensions = useGreenhouseStore((s) => s.dimensions);
  const crop = useGreenhouseStore((s) => s.crop);
  const meshRef = useRef<THREE.InstancedMesh>(null);

  const plants = useMemo(
    () =>
      computePlantGrid(
        dimensions.length,
        dimensions.width,
        crop.type,
        crop.lai,
        crop.growthStage,
      ),
    [dimensions.length, dimensions.width, crop.type, crop.lai, crop.growthStage],
  );

  const foliageGeometry = useMemo(() => new THREE.ConeGeometry(0.18, 0.55, 6), []);

  useEffect(() => {
    const mesh = meshRef.current;
    if (!mesh) return;
    applyInstanceMatrices(mesh, plants);
  }, [plants]);

  if (plants.length === 0) {
    return null;
  }

  return (
    <instancedMesh
      ref={meshRef}
      args={[foliageGeometry, undefined, plants.length]}
      castShadow
      receiveShadow
    >
      <meshStandardMaterial
        color={CROP_COLORS[crop.type]}
        roughness={0.7}
        metalness={0.05}
      />
    </instancedMesh>
  );
}
