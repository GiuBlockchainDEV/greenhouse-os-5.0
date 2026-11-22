import { useMemo } from "react";
import * as THREE from "three";

import { GltfPart } from "@/components/3d/GltfPart";
import { glbPlacementForNode } from "@/lib/fertigation/fertigationGlbMap";
import { pidNodeToWorld } from "@/lib/fertigation/pidToWorld";
import type { FertigationProject } from "@/types/fertigation";

const PIPE_Y = 0.42;
const PIPE_RADIUS = 0.028;

function FertigationPipe({
  from,
  to,
  tint,
}: {
  from: [number, number, number];
  to: [number, number, number];
  tint: string;
}) {
  const { position, rotation, length } = useMemo(() => {
    const a = new THREE.Vector3(from[0], PIPE_Y, from[2]);
    const b = new THREE.Vector3(to[0], PIPE_Y, to[2]);
    const dir = new THREE.Vector3().subVectors(b, a);
    const len = dir.length();
    const mid = new THREE.Vector3().addVectors(a, b).multiplyScalar(0.5);
    dir.normalize();
    const quat = new THREE.Quaternion().setFromUnitVectors(new THREE.Vector3(0, 1, 0), dir);
    const euler = new THREE.Euler().setFromQuaternion(quat);
    return {
      position: [mid.x, mid.y, mid.z] as [number, number, number],
      rotation: [euler.x, euler.y, euler.z] as [number, number, number],
      length: len,
    };
  }, [from, to]);

  if (length < 0.05) {
    return null;
  }

  return (
    <mesh position={position} rotation={rotation} castShadow receiveShadow>
      <cylinderGeometry args={[PIPE_RADIUS, PIPE_RADIUS, length, 20]} />
      <meshStandardMaterial color={tint} metalness={0.72} roughness={0.28} />
    </mesh>
  );
}

const CIRCUIT_COLOR: Record<string, string> = {
  source: "#608FA2",
  mix: "#94a3b8",
  transfer: "#a8b4c0",
  crop: "#059669",
  return: "#5D988C",
  inline: "#64748b",
  bypass: "#9ca3af",
  custom: "#94a3b8",
};

export function FertigationPlantScene({ project }: { project: FertigationProject }) {
  const worldById = useMemo(() => {
    const map = new Map<string, [number, number, number]>();
    for (const node of project.nodes) {
      map.set(node.id, pidNodeToWorld(node));
    }
    return map;
  }, [project.nodes]);

  return (
    <group>
      {project.edges.map((edge) => {
        const a = worldById.get(edge.from);
        const b = worldById.get(edge.to);
        if (!a || !b || edge.enabled === false) {
          return null;
        }
        return (
          <FertigationPipe
            key={edge.id}
            from={a}
            to={b}
            tint={CIRCUIT_COLOR[edge.circuit] ?? "#94a3b8"}
          />
        );
      })}
      {project.nodes.map((node) => {
        const placement = glbPlacementForNode(node);
        const [x, , z] = worldById.get(node.id) ?? [0, 0, 0];
        return (
          <GltfPart
            key={node.id}
            file={placement.file}
            position={[x, placement.yOffset, z]}
            rotation={[0, placement.rotationY ?? 0, 0]}
            scale={placement.scale}
          />
        );
      })}
    </group>
  );
}