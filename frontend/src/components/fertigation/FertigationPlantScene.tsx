import { Text } from "@react-three/drei";
import { useMemo } from "react";
import * as THREE from "three";

import { FertigationPlantPart } from "@/components/fertigation/FertigationPlantPart";
import { FertigationSkidStructure } from "@/components/fertigation/FertigationSkidStructure";
import {
  connectionHeightY,
  plantLayoutCenter,
  resolvePlantLayout,
  type PlantPose,
} from "@/lib/fertigation/plantLayoutEngine";
import type { FertigationNode, FertigationProject } from "@/types/fertigation";

const PIPE_RADIUS = 0.03;

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
    const a = new THREE.Vector3(...from);
    const b = new THREE.Vector3(...to);
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

  if (length < 0.04) {
    return null;
  }

  return (
    <mesh position={position} rotation={rotation} castShadow receiveShadow>
      <cylinderGeometry args={[PIPE_RADIUS, PIPE_RADIUS, length, 18]} />
      <meshStandardMaterial color={tint} metalness={0.72} roughness={0.28} />
    </mesh>
  );
}

const CIRCUIT_COLOR: Record<string, string> = {
  source: "#4A90A4",
  mix: "#64748b",
  transfer: "#94a3b8",
  crop: "#059669",
  return: "#2F7A6C",
  inline: "#475569",
  bypass: "#9ca3af",
  custom: "#94a3b8",
};

function nodeKindById(nodes: FertigationNode[]): Map<string, FertigationNode["kind"]> {
  const map = new Map<string, FertigationNode["kind"]>();
  for (const node of nodes) {
    map.set(node.id, node.kind);
  }
  return map;
}

function partPosition(pose: PlantPose): [number, number, number] {
  const [x, , z] = pose.position;
  return [x, pose.groundY, z];
}

export function FertigationPlantScene({ project }: { project: FertigationProject }) {
  const { blueprint, poses } = useMemo(() => resolvePlantLayout(project), [project]);
  const kinds = useMemo(() => nodeKindById(project.nodes), [project.nodes]);
  const [centerX, centerZ] = useMemo(() => plantLayoutCenter(poses), [poses]);

  const floor = blueprint?.bounds ?? { widthM: 24, depthM: 16 };

  const poseById = useMemo(() => new Map(poses), [poses]);

  return (
    <group position={[-centerX, 0, -centerZ]}>
      <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, -0.02, 0]} receiveShadow>
        <planeGeometry args={[floor.widthM + 2, floor.depthM + 2]} />
        <meshStandardMaterial color="#f1f5f9" roughness={0.92} metalness={0.05} />
      </mesh>

      {blueprint ? <FertigationSkidStructure blueprint={blueprint} /> : null}

      {project.edges.map((edge) => {
        const poseA = poseById.get(edge.from);
        const poseB = poseById.get(edge.to);
        if (!poseA || !poseB || edge.enabled === false) {
          return null;
        }
        const kindA = kinds.get(edge.from) ?? "junction";
        const kindB = kinds.get(edge.to) ?? "junction";
        const yA = connectionHeightY(kindA, edge.circuit, poseA.belowGrade);
        const yB = connectionHeightY(kindB, edge.circuit, poseB.belowGrade);
        const [ax, , az] = poseA.position;
        const [bx, , bz] = poseB.position;
        return (
          <FertigationPipe
            key={edge.id}
            from={[ax, yA, az]}
            to={[bx, yB, bz]}
            tint={CIRCUIT_COLOR[edge.circuit] ?? "#94a3b8"}
          />
        );
      })}

      {project.nodes.map((node) => {
        const pose = poseById.get(node.id);
        if (!pose) {
          return null;
        }
        const base = partPosition(pose);
        const labelY =
          node.kind === "tank"
            ? pose.belowGrade
              ? 0.85
              : 1.55
            : node.kind === "crop"
              ? base[1] + 0.72
              : node.kind === "pump"
                ? base[1] + 0.62
                : base[1] + 0.95;
        return (
          <group key={node.id}>
            <FertigationPlantPart node={node} position={base} rotationY={pose.rotationY} />
            <Text
              position={[base[0], labelY, base[2]]}
              fontSize={0.16}
              color="#0f172a"
              anchorX="center"
              anchorY="bottom"
              outlineWidth={0.015}
              outlineColor="#ffffff"
            >
              {node.tag}
            </Text>
          </group>
        );
      })}
    </group>
  );
}