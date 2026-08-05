/** 3D bed / gutter / raft models — runs along Z, perpendicular to fan airflow (−X). */

import {
  DWC_HOLE_SPACING_M,
  NFT_CHANNEL_WIDTH_M,
  SUBSTRATE_SLAB_SPACING_M,
} from "@/lib/cultivationConstants";
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

function bedDims(bed: BedZone) {
  const lineW = bed.xMax - bed.xMin;
  const runLen = bed.zMax - bed.zMin;
  const cx = (bed.xMin + bed.xMax) / 2;
  const cz = (bed.zMin + bed.zMax) / 2;
  return { lineW, runLen, cx, cz };
}

function SoilBed({ bed }: { bed: BedZone }) {
  const { lineW, runLen, cx, cz } = bedDims(bed);

  return (
    <group position={[cx, bed.elevationM, cz]}>
      <mesh position={[0, bed.depthM / 2, 0]} castShadow receiveShadow>
        <boxGeometry args={[lineW, bed.depthM, runLen]} />
        <meshStandardMaterial color={MEDIA_SOIL} roughness={0.95} />
      </mesh>
      <mesh position={[0, bed.depthM + 0.015, 0]} receiveShadow>
        <boxGeometry args={[lineW * 0.96, 0.03, runLen * 0.96]} />
        <meshStandardMaterial color="#4e342e" roughness={1} />
      </mesh>
    </group>
  );
}

function SubstrateBed({ bed }: { bed: BedZone }) {
  const { lineW, runLen, cx, cz } = bedDims(bed);
  const slabCount = Math.max(2, Math.floor(runLen / SUBSTRATE_SLAB_SPACING_M));

  return (
    <group position={[cx, bed.elevationM, cz]}>
      <mesh position={[0, 0.06, 0]} castShadow receiveShadow>
        <boxGeometry args={[lineW, 0.12, runLen]} />
        <meshStandardMaterial color={TRAY} metalness={0.35} roughness={0.55} />
      </mesh>
      {Array.from({ length: slabCount }, (_, i) => {
        const z = -runLen / 2 + runLen / (slabCount + 1) * (i + 1);
        return (
          <mesh key={`slab-${i}`} position={[0, 0.16, z]} castShadow>
            <boxGeometry args={[lineW * 0.88, 0.14, 0.95]} />
            <meshStandardMaterial color={SUBSTRATE} roughness={0.9} />
          </mesh>
        );
      })}
    </group>
  );
}

function GrowbedBed({ bed }: { bed: BedZone }) {
  const { lineW, runLen, cx, cz } = bedDims(bed);

  return (
    <group position={[cx, bed.elevationM, cz]}>
      <mesh position={[0, bed.depthM / 2, 0]} castShadow receiveShadow>
        <boxGeometry args={[lineW, bed.depthM, runLen]} />
        <meshStandardMaterial color={TRAY} roughness={0.7} />
      </mesh>
      <mesh position={[0, bed.depthM + 0.02, 0]}>
        <boxGeometry args={[lineW * 0.94, 0.12, runLen * 0.94]} />
        <meshStandardMaterial color={MEDIA_GRAVEL} roughness={0.95} />
      </mesh>
      <mesh position={[0, bed.depthM - 0.04, 0]}>
        <boxGeometry args={[lineW * 0.92, 0.06, runLen * 0.92]} />
        <meshStandardMaterial color={WATER_DARK} roughness={0.2} metalness={0.15} transparent opacity={0.85} />
      </mesh>
      <mesh position={[lineW / 2 - 0.08, bed.depthM + 0.06, -runLen / 2 + 0.2]}>
        <cylinderGeometry args={[0.025, 0.025, 0.08, 8]} />
        <meshStandardMaterial color="#1f2937" metalness={0.4} />
      </mesh>
    </group>
  );
}

function NftGutter({ bed }: { bed: BedZone }) {
  const { lineW, runLen, cx, cz } = bedDims(bed);
  const channelW = Math.min(lineW * 0.92, NFT_CHANNEL_WIDTH_M);

  return (
    <group position={[cx, bed.elevationM, cz]}>
      <mesh position={[0, 0.04, 0]} castShadow>
        <boxGeometry args={[lineW, 0.08, runLen]} />
        <meshStandardMaterial color={GUTTER} metalness={0.55} roughness={0.35} />
      </mesh>
      <mesh position={[0, 0.02, 0]}>
        <boxGeometry args={[channelW, 0.03, runLen * 0.98]} />
        <meshStandardMaterial color={GUTTER_INNER} metalness={0.4} roughness={0.45} />
      </mesh>
      <mesh position={[0, 0.045, 0]} rotation={[-Math.PI / 2, 0, 0]}>
        <planeGeometry args={[runLen * 0.96, channelW * 0.75]} />
        <meshStandardMaterial color={WATER} roughness={0.15} metalness={0.25} transparent opacity={0.75} />
      </mesh>
      <mesh position={[0, 0.07, -runLen / 2 + 0.04]}>
        <boxGeometry args={[lineW * 0.5, 0.04, 0.06]} />
        <meshStandardMaterial color="#6b7280" metalness={0.5} />
      </mesh>
      <mesh position={[0, 0.07, runLen / 2 - 0.04]}>
        <boxGeometry args={[lineW * 0.5, 0.04, 0.06]} />
        <meshStandardMaterial color="#6b7280" metalness={0.5} />
      </mesh>
    </group>
  );
}

function DwcRaft({ bed }: { bed: BedZone }) {
  const { lineW, runLen, cx, cz } = bedDims(bed);

  return (
    <group position={[cx, bed.elevationM, cz]}>
      <mesh position={[0, 0.08, 0]} castShadow receiveShadow>
        <boxGeometry args={[lineW, 0.16, runLen]} />
        <meshStandardMaterial color={WATER_DARK} roughness={0.25} metalness={0.2} transparent opacity={0.9} />
      </mesh>
      <mesh position={[0, bed.depthM / 2 + 0.1, 0]} castShadow>
        <boxGeometry args={[lineW * 0.96, 0.1, runLen * 0.96]} />
        <meshStandardMaterial color={RAFT} roughness={0.85} />
      </mesh>
      {Array.from({ length: Math.floor((runLen - 0.7) / DWC_HOLE_SPACING_M) + 1 }, (_, j) =>
        Array.from({ length: Math.floor((lineW - 0.7) / DWC_HOLE_SPACING_M) + 1 }, (_, i) => (
          <mesh
            key={`hole-${i}-${j}`}
            position={[
              -lineW / 2 + DWC_HOLE_SPACING_M * 0.7 + i * DWC_HOLE_SPACING_M,
              bed.depthM / 2 + 0.1,
              -runLen / 2 + DWC_HOLE_SPACING_M * 0.7 + j * DWC_HOLE_SPACING_M,
            ]}
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
  const { lineW, runLen, cx, cz } = bedDims(bed);

  return (
    <group position={[cx, bed.elevationM, cz]}>
      <mesh position={[0, bed.depthM / 2, 0]} castShadow receiveShadow>
        <boxGeometry args={[lineW, bed.depthM, runLen]} />
        <meshStandardMaterial color={MEDIA_SOIL} roughness={0.95} />
      </mesh>
      <mesh position={[0, bed.depthM + 0.015, 0]}>
        <boxGeometry args={[lineW * 0.96, 0.03, runLen * 0.96]} />
        <meshStandardMaterial color="#4e342e" roughness={1} />
      </mesh>
      <mesh position={[0, 0.35, 0]} rotation={[Math.PI / 2, 0, 0]} castShadow>
        <cylinderGeometry args={[0.012, 0.012, runLen * 0.9, 6]} />
        <meshStandardMaterial color="#374151" roughness={0.6} />
      </mesh>
      {Array.from({ length: Math.floor(runLen / 1.5) }, (_, i) => (
        <mesh key={`dripper-${i}`} position={[0, 0.32, -runLen / 2 + 0.5 + i * 1.5]}>
          <sphereGeometry args={[0.025, 6, 6]} />
          <meshStandardMaterial color="#ef4444" roughness={0.5} />
        </mesh>
      ))}
    </group>
  );
}

function AeroponicBed({ bed }: { bed: BedZone }) {
  const { lineW, runLen, cx, cz } = bedDims(bed);

  return (
    <group position={[cx, bed.elevationM, cz]}>
      <mesh position={[0, 0.05, 0]} castShadow>
        <boxGeometry args={[lineW, 0.1, runLen]} />
        <meshStandardMaterial color="#374151" metalness={0.4} roughness={0.5} />
      </mesh>
      <mesh position={[0, 0.02, 0]} rotation={[-Math.PI / 2, 0, 0]}>
        <planeGeometry args={[runLen * 0.95, lineW * 0.85]} />
        <meshStandardMaterial color={WATER} transparent opacity={0.6} roughness={0.1} />
      </mesh>
      {Array.from({ length: Math.floor(runLen / 2) }, (_, i) => (
        <mesh key={`nozzle-${i}`} position={[0, 0.01, -runLen / 2 + 1 + i * 2]}>
          <coneGeometry args={[0.02, 0.05, 5]} />
          <meshStandardMaterial color="#67e8f9" metalness={0.5} />
        </mesh>
      ))}
    </group>
  );
}

function EbbFlowBed({ bed }: { bed: BedZone }) {
  const { lineW, runLen, cx, cz } = bedDims(bed);

  return (
    <group position={[cx, bed.elevationM, cz]}>
      <mesh position={[0, bed.depthM / 2, 0]} castShadow receiveShadow>
        <boxGeometry args={[lineW, bed.depthM, runLen]} />
        <meshStandardMaterial color={TRAY} roughness={0.65} />
      </mesh>
      <mesh position={[0, 0.04, 0]}>
        <boxGeometry args={[lineW * 0.94, 0.06, runLen * 0.94]} />
        <meshStandardMaterial color={WATER_DARK} transparent opacity={0.8} roughness={0.2} />
      </mesh>
      <mesh position={[lineW / 2 - 0.12, 0.02, runLen / 2 - 0.15]}>
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
