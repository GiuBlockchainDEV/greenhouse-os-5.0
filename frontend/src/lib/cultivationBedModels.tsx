/** 3D bed / gutter / raft models per cultivation system. */

import type { BedZone } from "@/lib/cultivationLayout";
import type { CultivationSystem } from "@/types/greenhouse";

const WATER = "#1d4ed8";
const WATER_DARK = "#1e3a8a";
const MEDIA_SOIL = "#3e2723";
const MEDIA_GRAVEL = "#8d6e63";
const SUBSTRATE = "#c5e1a5";
const GUTTER = "#9ca3af";
const GUTTER_INNER = "#6b7280";
const RAFT = "#e0f2fe";
const TRAY = "#4b5563";

interface BedMeshProps {
  bed: BedZone;
  system: CultivationSystem;
}

function SoilBed({ bed }: { bed: BedZone }) {
  const w = bed.xMax - bed.xMin;
  const d = bed.zMax - bed.zMin;
  const cx = (bed.xMin + bed.xMax) / 2;
  const cz = (bed.zMin + bed.zMax) / 2;
  const y = bed.elevationM;

  return (
    <group position={[cx, y, cz]}>
      <mesh position={[0, bed.depthM / 2, 0]} castShadow receiveShadow>
        <boxGeometry args={[w, bed.depthM, d]} />
        <meshStandardMaterial color={MEDIA_SOIL} roughness={0.95} />
      </mesh>
      <mesh position={[0, bed.depthM + 0.015, 0]} receiveShadow>
        <boxGeometry args={[w * 0.96, 0.03, d * 0.96]} />
        <meshStandardMaterial color="#4e342e" roughness={1} />
      </mesh>
    </group>
  );
}

function SubstrateBed({ bed }: { bed: BedZone }) {
  const w = bed.xMax - bed.xMin;
  const d = bed.zMax - bed.zMin;
  const cx = (bed.xMin + bed.xMax) / 2;
  const cz = (bed.zMin + bed.zMax) / 2;
  const slabCount = Math.max(2, Math.floor(w / 1.2));

  return (
    <group position={[cx, bed.elevationM, cz]}>
      <mesh position={[0, 0.06, 0]} castShadow receiveShadow>
        <boxGeometry args={[w, 0.12, d]} />
        <meshStandardMaterial color={TRAY} metalness={0.35} roughness={0.55} />
      </mesh>
      {Array.from({ length: slabCount }, (_, i) => {
        const x = -w / 2 + w / (slabCount + 1) * (i + 1);
        return (
          <mesh key={`slab-${i}`} position={[x, 0.16, 0]} castShadow>
            <boxGeometry args={[0.95, 0.14, d * 0.88]} />
            <meshStandardMaterial color={SUBSTRATE} roughness={0.9} />
          </mesh>
        );
      })}
    </group>
  );
}

function GrowbedBed({ bed }: { bed: BedZone }) {
  const w = bed.xMax - bed.xMin;
  const d = bed.zMax - bed.zMin;
  const cx = (bed.xMin + bed.xMax) / 2;
  const cz = (bed.zMin + bed.zMax) / 2;

  return (
    <group position={[cx, bed.elevationM, cz]}>
      <mesh position={[0, bed.depthM / 2, 0]} castShadow receiveShadow>
        <boxGeometry args={[w, bed.depthM, d]} />
        <meshStandardMaterial color={TRAY} roughness={0.7} />
      </mesh>
      <mesh position={[0, bed.depthM + 0.02, 0]}>
        <boxGeometry args={[w * 0.94, 0.12, d * 0.94]} />
        <meshStandardMaterial color={MEDIA_GRAVEL} roughness={0.95} />
      </mesh>
      <mesh position={[0, bed.depthM - 0.04, 0]}>
        <boxGeometry args={[w * 0.92, 0.06, d * 0.92]} />
        <meshStandardMaterial color={WATER_DARK} roughness={0.2} metalness={0.15} transparent opacity={0.85} />
      </mesh>
    </group>
  );
}

function NftGutter({ bed }: { bed: BedZone }) {
  const w = bed.xMax - bed.xMin;
  const cx = (bed.xMin + bed.xMax) / 2;
  const cz = (bed.zMin + bed.zMax) / 2;
  const channelW = 0.32;

  return (
    <group position={[cx, bed.elevationM, cz]}>
      <mesh position={[0, 0.04, 0]} castShadow>
        <boxGeometry args={[w, 0.08, channelW]} />
        <meshStandardMaterial color={GUTTER} metalness={0.55} roughness={0.35} />
      </mesh>
      <mesh position={[0, 0.02, 0]}>
        <boxGeometry args={[w * 0.98, 0.03, channelW * 0.75]} />
        <meshStandardMaterial color={GUTTER_INNER} metalness={0.4} roughness={0.45} />
      </mesh>
      <mesh position={[0, 0.045, 0]} rotation={[-Math.PI / 2, 0, 0]}>
        <planeGeometry args={[w * 0.96, channelW * 0.7]} />
        <meshStandardMaterial color={WATER} roughness={0.15} metalness={0.25} transparent opacity={0.75} />
      </mesh>
    </group>
  );
}

function DwcRaft({ bed }: { bed: BedZone }) {
  const w = bed.xMax - bed.xMin;
  const d = bed.zMax - bed.zMin;
  const cx = (bed.xMin + bed.xMax) / 2;
  const cz = (bed.zMin + bed.zMax) / 2;

  return (
    <group position={[cx, bed.elevationM, cz]}>
      <mesh position={[0, 0.08, 0]} castShadow receiveShadow>
        <boxGeometry args={[w, 0.16, d]} />
        <meshStandardMaterial color={WATER_DARK} roughness={0.25} metalness={0.2} transparent opacity={0.9} />
      </mesh>
      <mesh position={[0, bed.depthM / 2 + 0.1, 0]} castShadow>
        <boxGeometry args={[w * 0.96, 0.1, d * 0.96]} />
        <meshStandardMaterial color={RAFT} roughness={0.85} />
      </mesh>
      {Array.from({ length: Math.floor(w / 0.5) }, (_, i) =>
        Array.from({ length: Math.floor(d / 0.5) }, (_, j) => (
          <mesh
            key={`hole-${i}-${j}`}
            position={[-w / 2 + 0.35 + i * 0.5, bed.depthM / 2 + 0.1, -d / 2 + 0.35 + j * 0.5]}
          >
            <cylinderGeometry args={[0.06, 0.06, 0.12, 8]} />
            <meshStandardMaterial color="#111827" roughness={0.9} />
          </mesh>
        )),
      )}
    </group>
  );
}

function DripBed({ bed }: { bed: BedZone }) {
  const w = bed.xMax - bed.xMin;
  const d = bed.zMax - bed.zMin;
  const cx = (bed.xMin + bed.xMax) / 2;
  const cz = (bed.zMin + bed.zMax) / 2;

  return (
    <group position={[cx, bed.elevationM, cz]}>
      <mesh position={[0, bed.depthM / 2, 0]} castShadow receiveShadow>
        <boxGeometry args={[w, bed.depthM, d]} />
        <meshStandardMaterial color={MEDIA_SOIL} roughness={0.95} />
      </mesh>
      <mesh position={[0, bed.depthM + 0.015, 0]}>
        <boxGeometry args={[w * 0.96, 0.03, d * 0.96]} />
        <meshStandardMaterial color="#4e342e" roughness={1} />
      </mesh>
      <mesh position={[0, 0.35, 0]} rotation={[0, 0, Math.PI / 2]} castShadow>
        <cylinderGeometry args={[0.012, 0.012, w * 0.9, 6]} />
        <meshStandardMaterial color="#374151" roughness={0.6} />
      </mesh>
      {Array.from({ length: Math.floor(w / 1.5) }, (_, i) => (
        <mesh key={`dripper-${i}`} position={[-w / 2 + 0.5 + i * 1.5, 0.32, 0]}>
          <sphereGeometry args={[0.025, 6, 6]} />
          <meshStandardMaterial color="#ef4444" roughness={0.5} />
        </mesh>
      ))}
    </group>
  );
}

function AeroponicBed({ bed }: { bed: BedZone }) {
  const w = bed.xMax - bed.xMin;
  const cx = (bed.xMin + bed.xMax) / 2;
  const cz = (bed.zMin + bed.zMax) / 2;

  return (
    <group position={[cx, bed.elevationM, cz]}>
      <mesh position={[0, 0.05, 0]} castShadow>
        <boxGeometry args={[w, 0.1, 0.4]} />
        <meshStandardMaterial color="#374151" metalness={0.4} roughness={0.5} />
      </mesh>
      <mesh position={[0, 0.02, 0]} rotation={[-Math.PI / 2, 0, 0]}>
        <planeGeometry args={[w * 0.95, 0.35]} />
        <meshStandardMaterial color={WATER} transparent opacity={0.6} roughness={0.1} />
      </mesh>
      {Array.from({ length: Math.floor(w / 2) }, (_, i) => (
        <mesh key={`nozzle-${i}`} position={[-w / 2 + 1 + i * 2, 0.01, 0]}>
          <coneGeometry args={[0.02, 0.05, 5]} />
          <meshStandardMaterial color="#67e8f9" metalness={0.5} />
        </mesh>
      ))}
    </group>
  );
}

function EbbFlowBed({ bed }: { bed: BedZone }) {
  const w = bed.xMax - bed.xMin;
  const d = bed.zMax - bed.zMin;
  const cx = (bed.xMin + bed.xMax) / 2;
  const cz = (bed.zMin + bed.zMax) / 2;

  return (
    <group position={[cx, bed.elevationM, cz]}>
      <mesh position={[0, bed.depthM / 2, 0]} castShadow receiveShadow>
        <boxGeometry args={[w, bed.depthM, d]} />
        <meshStandardMaterial color={TRAY} roughness={0.65} />
      </mesh>
      <mesh position={[0, 0.04, 0]}>
        <boxGeometry args={[w * 0.94, 0.06, d * 0.94]} />
        <meshStandardMaterial color={WATER_DARK} transparent opacity={0.8} roughness={0.2} />
      </mesh>
      <mesh position={[w / 2 - 0.15, 0.02, d / 2 - 0.15]}>
        <cylinderGeometry args={[0.04, 0.04, 0.08, 8]} />
        <meshStandardMaterial color="#1f2937" metalness={0.5} />
      </mesh>
    </group>
  );
}

export function CultivationBedMesh({ bed, system }: BedMeshProps) {
  switch (system) {
    case "soil":
      return <SoilBed bed={bed} />;
    case "substrate":
      return <SubstrateBed bed={bed} />;
    case "growbed":
      return <GrowbedBed bed={bed} />;
    case "nft":
      return <NftGutter bed={bed} />;
    case "dwc":
      return <DwcRaft bed={bed} />;
    case "drip":
      return <DripBed bed={bed} />;
    case "aeroponic":
      return <AeroponicBed bed={bed} />;
    case "ebb_flow":
      return <EbbFlowBed bed={bed} />;
    default:
      return <SoilBed bed={bed} />;
  }
}

export function CultivationBedsGroup({
  beds,
  system,
}: {
  beds: BedZone[];
  system: CultivationSystem;
}) {
  return (
    <group>
      {beds.map((bed) => (
        <CultivationBedMesh
          key={`bed-${system}-${bed.bayIndex}-${bed.bedIndex}`}
          bed={bed}
          system={system}
        />
      ))}
    </group>
  );
}
