import { useMemo } from "react";

import { GltfPart } from "@/components/3d/GltfPart";
import type { FertigationComponentKind, FertigationNode } from "@/types/fertigation";

const BODY = "#e2e8f0";
const STEEL = "#94a3b8";
const LIQUID = "#38bdf8";
const MOTOR = "#334155";
const VALVE = "#0d9488";
const CROP_GREEN = "#16a34a";

function cropGlb(node: FertigationNode): { file: string; scale: [number, number, number]; y: number } {
  const system = String(node.params.system ?? "nft");
  const channels = Math.max(4, Number(node.params.channels) || 8);
  const spanX = Math.min(4.5, 1.4 + channels * 0.05);

  if (system === "drip" || system === "inline") {
    return { file: "drip-line.glb", scale: [spanX, 1, 0.22], y: 0.18 };
  }
  if (system === "substrate") {
    return { file: "substrate-gutter.glb", scale: [spanX, 1, 0.42], y: 0.12 };
  }
  if (system === "dwc") {
    return { file: "dwc-raft.glb", scale: [spanX * 0.85, 0.9, 0.75], y: 0.08 };
  }
  if (system === "soil") {
    return { file: "soil-bed.glb", scale: [spanX, 1, 0.55], y: 0.06 };
  }
  return { file: "nft-channel.glb", scale: [spanX, 1, 0.38], y: 0.14 };
}

interface PartProps {
  position: [number, number, number];
}

function WaterSource({ position }: PartProps) {
  return (
    <group position={position}>
      <mesh position={[0, 0.35, 0]} castShadow receiveShadow>
        <boxGeometry args={[0.55, 0.7, 0.55]} />
        <meshStandardMaterial color={STEEL} metalness={0.55} roughness={0.35} />
      </mesh>
      <mesh position={[0, 0.78, 0.18]} castShadow>
        <cylinderGeometry args={[0.12, 0.12, 0.28, 16]} />
        <meshStandardMaterial color={LIQUID} metalness={0.2} roughness={0.4} transparent opacity={0.85} />
      </mesh>
    </group>
  );
}

const FERTIGATION_FILTER_GLB = "fertigation-filter-system.glb";

function TankVessel({ position, capacityL }: PartProps & { capacityL: number }) {
  const radius = useMemo(() => Math.min(0.75, 0.38 + Math.sqrt(capacityL) / 120), [capacityL]);
  const height = useMemo(() => Math.min(1.65, 0.95 + capacityL / 4500), [capacityL]);
  return (
    <group position={position}>
      <mesh position={[0, height / 2, 0]} castShadow receiveShadow>
        <cylinderGeometry args={[radius, radius * 1.02, height, 32]} />
        <meshStandardMaterial color={STEEL} metalness={0.72} roughness={0.28} />
      </mesh>
      <mesh position={[0, height * 0.55, 0]} castShadow>
        <cylinderGeometry args={[radius * 0.92, radius * 0.92, height * 0.82, 32]} />
        <meshStandardMaterial color={LIQUID} metalness={0.15} roughness={0.35} transparent opacity={0.55} />
      </mesh>
      <mesh position={[0, height + 0.08, 0]} castShadow>
        <torusGeometry args={[radius * 0.45, 0.04, 12, 24]} />
        <meshStandardMaterial color={MOTOR} metalness={0.5} roughness={0.4} />
      </mesh>
    </group>
  );
}

function CentrifugalPump({ position }: PartProps) {
  return (
    <group position={position}>
      <mesh position={[0.18, 0.22, 0]} rotation={[0, 0, Math.PI / 2]} castShadow receiveShadow>
        <cylinderGeometry args={[0.22, 0.22, 0.46, 20]} />
        <meshStandardMaterial color={STEEL} metalness={0.7} roughness={0.32} />
      </mesh>
      <mesh position={[-0.22, 0.24, 0]} castShadow receiveShadow>
        <boxGeometry args={[0.28, 0.32, 0.28]} />
        <meshStandardMaterial color={MOTOR} metalness={0.45} roughness={0.5} />
      </mesh>
    </group>
  );
}

function ValveBody({ position }: PartProps) {
  return (
    <group position={position}>
      <mesh position={[0, 0.38, 0]} castShadow receiveShadow>
        <cylinderGeometry args={[0.14, 0.14, 0.22, 16]} />
        <meshStandardMaterial color={VALVE} metalness={0.55} roughness={0.38} />
      </mesh>
      <group position={[0, 0.58, 0]} rotation={[Math.PI / 2, 0, 0]}>
        <mesh castShadow>
          <torusGeometry args={[0.08, 0.025, 10, 16]} />
          <meshStandardMaterial color={BODY} metalness={0.35} roughness={0.45} />
        </mesh>
      </group>
    </group>
  );
}

function InjectorVenturi({ position }: PartProps) {
  return (
    <group position={position}>
      <mesh position={[0, 0.35, 0]} rotation={[0, 0, Math.PI / 2]} castShadow receiveShadow>
        <cylinderGeometry args={[0.09, 0.14, 0.55, 16]} />
        <meshStandardMaterial color={STEEL} metalness={0.65} roughness={0.35} />
      </mesh>
      {[ -0.2, 0, 0.2 ].map((offset) => (
        <mesh key={offset} position={[0, 0.58, offset]} castShadow>
          <cylinderGeometry args={[0.035, 0.035, 0.28, 10]} />
          <meshStandardMaterial color={LIQUID} metalness={0.3} roughness={0.4} />
        </mesh>
      ))}
    </group>
  );
}

function InstrumentProbe({ position, tall }: PartProps & { tall?: boolean }) {
  const h = tall ? 0.95 : 0.72;
  return (
    <group position={position}>
      <mesh position={[0, 0.12, 0]} castShadow receiveShadow>
        <boxGeometry args={[0.22, 0.24, 0.18]} />
        <meshStandardMaterial color={MOTOR} metalness={0.4} roughness={0.5} />
      </mesh>
      <mesh position={[0, h / 2 + 0.12, 0]} castShadow>
        <cylinderGeometry args={[0.035, 0.035, h, 12]} />
        <meshStandardMaterial color={CROP_GREEN} metalness={0.35} roughness={0.45} />
      </mesh>
    </group>
  );
}

function ManifoldHeader({ position, legs }: PartProps & { legs: number }) {
  const span = Math.min(2.4, 0.7 + legs * 0.14);
  return (
    <group position={position}>
      <mesh position={[0, 0.48, 0]} rotation={[0, 0, Math.PI / 2]} castShadow receiveShadow>
        <cylinderGeometry args={[0.07, 0.07, span, 16]} />
        <meshStandardMaterial color={STEEL} metalness={0.72} roughness={0.3} />
      </mesh>
      {Array.from({ length: Math.min(legs, 8) }, (_, i) => {
        const t = (i - (Math.min(legs, 8) - 1) / 2) * (span / Math.max(Math.min(legs, 8), 1));
        return (
          <mesh key={i} position={[0, 0.28, t]} castShadow>
            <cylinderGeometry args={[0.04, 0.04, 0.35, 10]} />
            <meshStandardMaterial color={STEEL} metalness={0.65} roughness={0.35} />
          </mesh>
        );
      })}
    </group>
  );
}

function ReturnGutter({ position }: PartProps) {
  return (
    <group position={position}>
      <mesh position={[0, 0.18, 0]} castShadow receiveShadow>
        <boxGeometry args={[1.2, 0.12, 0.45]} />
        <meshStandardMaterial color={STEEL} metalness={0.55} roughness={0.4} />
      </mesh>
      <mesh position={[0, 0.28, 0]} castShadow>
        <boxGeometry args={[1.05, 0.06, 0.32]} />
        <meshStandardMaterial color={LIQUID} transparent opacity={0.45} metalness={0.2} roughness={0.45} />
      </mesh>
    </group>
  );
}

function JunctionTee({ position }: PartProps) {
  return (
    <group position={position}>
      <mesh position={[0, 0.35, 0]} rotation={[0, 0, Math.PI / 2]} castShadow>
        <cylinderGeometry args={[0.05, 0.05, 0.35, 12]} />
        <meshStandardMaterial color={STEEL} metalness={0.7} roughness={0.32} />
      </mesh>
      <mesh position={[0, 0.35, 0.15]} castShadow>
        <cylinderGeometry args={[0.05, 0.05, 0.2, 12]} />
        <meshStandardMaterial color={STEEL} metalness={0.7} roughness={0.32} />
      </mesh>
    </group>
  );
}

function renderPart(node: FertigationNode, position: [number, number, number]) {
  switch (node.kind as FertigationComponentKind) {
    case "source":
      return <WaterSource position={position} />;
    case "filter":
      return (
        <GltfPart
          file={FERTIGATION_FILTER_GLB}
          position={[position[0], position[1] + 0.02, position[2]]}
          rotation={[0, 0, 0]}
          scale={[1, 1, 1]}
        />
      );
    case "tank":
      return (
        <TankVessel
          position={position}
          capacityL={Math.max(500, Number(node.params.capacityL) || 2000)}
        />
      );
    case "pump":
      return <CentrifugalPump position={position} />;
    case "valve":
      return <ValveBody position={position} />;
    case "injector":
      return <InjectorVenturi position={position} />;
    case "sensor":
      return <InstrumentProbe position={position} />;
    case "flowmeter":
      return <InstrumentProbe position={position} tall />;
    case "manifold":
      return (
        <ManifoldHeader
          position={position}
          legs={Math.max(2, Number(node.params.legCount ?? node.params.zones ?? node.params.sectors ?? 4))}
        />
      );
    case "return":
      return <ReturnGutter position={position} />;
    case "junction":
      return <JunctionTee position={position} />;
    case "crop": {
      const glb = cropGlb(node);
      return (
        <GltfPart
          file={glb.file}
          position={[position[0], glb.y, position[2]]}
          rotation={[0, 0, 0]}
          scale={glb.scale}
        />
      );
    }
    default:
      return <JunctionTee position={position} />;
  }
}

export function FertigationPlantPart({
  node,
  position,
  rotationY = 0,
}: {
  node: FertigationNode;
  position: [number, number, number];
  rotationY?: number;
}) {
  return <group rotation={[0, rotationY, 0]}>{renderPart(node, position)}</group>;
}