import { useEffect, useMemo, useRef } from "react";
import * as THREE from "three";

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

const CROP_SPACING: Record<CropType, number> = {
  tomato: 0.5,
  cucumber: 0.45,
  pepper: 0.4,
  lettuce: 0.25,
  strawberry: 0.3,
  cannabis: 0.6,
};

const SYSTEM_SPACING: Record<CultivationSystem, number> = {
  soil: 0.4,
  substrate: 0.35,
  growbed: 0.3,
  nft: 0.25,
  dwc: 0.3,
  drip: 0.45,
  aeroponic: 0.35,
  ebb_flow: 0.3,
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
  y: number;
  z: number;
  scale: number;
  rotation: number;
}

function computePlantGrid(
  length: number,
  width: number,
  eaveHeight: number,
  cropType: CropType,
  system: CultivationSystem,
  lai: number,
  growthStage: string,
  tierCount: number,
): PlantInstance[] {
  const spacing = SYSTEM_SPACING[system] ?? CROP_SPACING[cropType];
  const tiers = Math.max(tierCount, 1);
  const tierHeight = Math.min(1.2, Math.max((eaveHeight - 0.6) / tiers, 0.35));

  const stageScale = STAGE_SCALE[growthStage] ?? 1.0;
  const baseScale = (0.25 + lai * 0.12) * stageScale;

  const plants: PlantInstance[] = [];
  const usableWidth = width / tiers;

  for (let tier = 0; tier < tiers; tier++) {
    const tierOffsetZ = -width / 2 + usableWidth * tier + usableWidth / 2;
    const cols = Math.max(1, Math.floor(usableWidth / spacing));
    const rows = Math.max(1, Math.floor(length / spacing));
    const offsetX = -length / 2 + spacing / 2;
    const offsetZ = tierOffsetZ - (cols * spacing) / 2 + spacing / 2;
    const y = 0.28 + tier * tierHeight;

    for (let row = 0; row < rows; row++) {
      for (let col = 0; col < cols; col++) {
        const jitter = ((tier * rows * cols + row * cols + col) % 7) * 0.02 - 0.06;
        plants.push({
          x: offsetX + row * spacing + jitter,
          y,
          z: offsetZ + col * spacing + jitter,
          scale: baseScale * (0.85 + ((row + col + tier) % 5) * 0.05),
          rotation: ((row * 3 + col * 7 + tier * 11) % 360) * (Math.PI / 180),
        });
      }
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
  const crop = useGreenhouseStore((s) => s.crop);
  const meshRef = useRef<THREE.InstancedMesh>(null);

  const plants = useMemo(
    () =>
      computePlantGrid(
        dimensions.length,
        dimensions.width,
        dimensions.eaveHeight,
        crop.type,
        crop.system,
        crop.lai,
        crop.growthStage,
        crop.layout.tierCount,
      ),
    [
      dimensions.length,
      dimensions.width,
      dimensions.eaveHeight,
      crop.type,
      crop.system,
      crop.lai,
      crop.growthStage,
      crop.layout.tierCount,
    ],
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
