import { useLayoutEffect, useMemo, useRef } from "react";
import * as THREE from "three";

import { ALUMINUM, ALUMINUM_DARK, CONCRETE } from "@/components/3d/claddingMaterials";
import { bayCenterZ } from "@/lib/structureUtils";

const POST_SPACING_M = 4;

interface GreenhouseFrameProps {
  length: number;
  width: number;
  eaveHeight: number;
  bayCount: number;
  bayWidthM: number;
}

function columnPositions(
  length: number,
  width: number,
  eaveHeight: number,
  bayCount: number,
  bayWidthM: number,
): THREE.Matrix4[] {
  const matrices: THREE.Matrix4[] = [];
  const dummy = new THREE.Object3D();
  const xCount = Math.max(2, Math.floor(length / POST_SPACING_M) + 1);
  for (let xi = 0; xi < xCount; xi += 1) {
    const x = -length / 2 + (xi * length) / Math.max(1, xCount - 1);
    for (let bay = 0; bay <= bayCount; bay += 1) {
      const z = -width / 2 + bay * bayWidthM;
      dummy.position.set(x, eaveHeight / 2, z);
      dummy.updateMatrix();
      matrices.push(dummy.matrix.clone());
    }
  }
  return matrices;
}

function InstancedPosts({
  matrices,
  eaveHeight,
}: {
  matrices: THREE.Matrix4[];
  eaveHeight: number;
}) {
  const ref = useRef<THREE.InstancedMesh>(null);
  useLayoutEffect(() => {
    const mesh = ref.current;
    if (!mesh) return;
    matrices.forEach((matrix, index) => {
      mesh.setMatrixAt(index, matrix);
    });
    mesh.instanceMatrix.needsUpdate = true;
  }, [matrices]);

  if (matrices.length === 0) return null;

  return (
    <instancedMesh ref={ref} args={[undefined, undefined, matrices.length]} castShadow receiveShadow>
      <boxGeometry args={[0.08, eaveHeight, 0.08]} />
      <meshStandardMaterial color={ALUMINUM} metalness={0.82} roughness={0.28} />
    </instancedMesh>
  );
}

export function GreenhouseFrame({
  length,
  width,
  eaveHeight,
  bayCount,
  bayWidthM,
}: GreenhouseFrameProps) {
  const matrices = useMemo(
    () => columnPositions(length, width, eaveHeight, bayCount, bayWidthM),
    [bayCount, bayWidthM, eaveHeight, length, width],
  );

  const gutters = useMemo(
    () =>
      Array.from({ length: bayCount + 1 }, (_, bay) => ({
        z: bay === bayCount ? width / 2 : bayCenterZ(bay, bayWidthM, width) - bayWidthM / 2,
      })),
    [bayCount, bayWidthM, width],
  );

  return (
    <group>
      <mesh position={[0, 0.06, 0]} receiveShadow>
        <boxGeometry args={[length + 1.2, 0.12, width + 1.2]} />
        <meshStandardMaterial color={CONCRETE} roughness={0.92} metalness={0.02} />
      </mesh>
      <InstancedPosts matrices={matrices} eaveHeight={eaveHeight} />
      {gutters.map((gutter) => (
        <mesh key={`gutter-${gutter.z}`} position={[0, eaveHeight, gutter.z]} castShadow>
          <boxGeometry args={[length, 0.1, 0.14]} />
          <meshStandardMaterial color={ALUMINUM_DARK} metalness={0.78} roughness={0.32} />
        </mesh>
      ))}
      <mesh position={[0, eaveHeight / 2, -width / 2]} castShadow>
        <boxGeometry args={[length, 0.06, 0.06]} />
        <meshStandardMaterial color={ALUMINUM} metalness={0.8} roughness={0.3} />
      </mesh>
      <mesh position={[0, eaveHeight / 2, width / 2]} castShadow>
        <boxGeometry args={[length, 0.06, 0.06]} />
        <meshStandardMaterial color={ALUMINUM} metalness={0.8} roughness={0.3} />
      </mesh>
    </group>
  );
}
