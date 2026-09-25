import { useMemo } from "react";

import { GltfPart } from "@/components/3d/GltfPart";
import { bayCenterZ } from "@/lib/structureUtils";
import type { ArchType } from "@/types/greenhouse";

const VENLO = { width: 4, height: 5.2, slice: 1 };
const GOTHIC = { width: 8, height: 5.9, slice: 1 };
const MULLION_H = 2.4;

interface BayFrame {
  archType: ArchType;
  zCenter: number;
}

interface GreenhouseFrameProps {
  length: number;
  width: number;
  eaveHeight: number;
  ridgeHeight: number;
  bayWidthM: number;
  bays: BayFrame[];
}

function sliceCount(length: number): { count: number; step: number } {
  const count = Math.min(24, Math.max(2, Math.round(length / 4)));
  return { count, step: length / count };
}

export function GreenhouseFrame({
  length,
  width,
  eaveHeight,
  ridgeHeight,
  bayWidthM,
  bays,
}: GreenhouseFrameProps) {
  const slices = useMemo(() => sliceCount(length), [length]);
  const mullions = useMemo(() => {
    const count = Math.min(36, Math.max(4, Math.round(length / 2)));
    return Array.from({ length: count }, (_, index) => -length / 2 + ((index + 0.5) * length) / count);
  }, [length]);

  return (
    <group>
      {bays.map((bay) => {
        const gothic = bay.archType === "semicircular";
        const nominal = gothic ? GOTHIC : VENLO;
        const file = gothic ? "gothic-arch.glb" : "venlo-bay.glb";
        const scale: [number, number, number] = [
          bayWidthM / nominal.width,
          ridgeHeight / nominal.height,
          slices.step / nominal.slice,
        ];
        return Array.from({ length: slices.count }, (_, index) => (
          <GltfPart
            key={`${bay.zCenter}-${index}`}
            file={file}
            position={[-length / 2 + (index + 0.5) * slices.step, 0, bay.zCenter]}
            rotation={[0, Math.PI / 2, 0]}
            scale={scale}
          />
        ));
      })}
      {mullions.map((x) =>
        ([-1, 1] as const).map((side) => (
          <GltfPart
            key={`mullion-${side}-${x}`}
            file="glazing-bar.glb"
            position={[x, 0, (side * width) / 2]}
            scale={[1, eaveHeight / MULLION_H, 1]}
          />
        )),
      )}
      {Array.from({ length: Math.max(2, Math.round(width / bayWidthM)) }, (_, index) => {
        const z = bayCenterZ(index, bayWidthM, width);
        return ([-1, 1] as const).map((side) => (
          <GltfPart
            key={`gable-mullion-${side}-${z}`}
            file="glazing-bar.glb"
            position={[(side * length) / 2, 0, z]}
            rotation={[0, Math.PI / 2, 0]}
            scale={[1, eaveHeight / MULLION_H, 1]}
          />
        ));
      })}
    </group>
  );
}
