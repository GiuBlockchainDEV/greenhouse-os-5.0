/** Cultivation lines repeat GLB modules along X (pad wall → exhaust fans), stacked across Z. */

import { GltfPart } from "@/components/3d/GltfPart";
import type { BedZone } from "@/lib/cultivationLayout";
import type { CultivationSystem } from "@/types/greenhouse";

/** Manifest Z origin: min-edge lines anchor at zMin; centered beds anchor at bay midpoint. */
const MODULE_Z_ANCHOR: Partial<Record<CultivationSystem, "center" | "min">> = {
  substrate: "min",
  nft: "min",
  drip: "min",
};

const MODULES: Record<CultivationSystem, { file: string; length: number; width: number }> = {
  soil: { file: "soil-bed.glb", length: 2, width: 1.06 },
  substrate: { file: "substrate-gutter.glb", length: 2, width: 0.36 },
  growbed: { file: "growbed.glb", length: 2, width: 0.8 },
  nft: { file: "nft-channel.glb", length: 2, width: 0.16 },
  dwc: { file: "dwc-raft.glb", length: 2, width: 1.2 },
  drip: { file: "drip-line.glb", length: 2, width: 0.04 },
  aeroponic: { file: "aeroponic-channel.glb", length: 2, width: 0.45 },
  ebb_flow: { file: "ebb-flow-bench.glb", length: 2, width: 1.2 },
};

/** GLB origin is at the +X start of the run (`*_start_*` in manifest); tile without center offset. */
function buildRunSegments(
  xMin: number,
  xMax: number,
  moduleLength: number,
  maxInstances: number,
): Array<{ x: number; lengthM: number }> {
  const runLen = Math.max(0, xMax - xMin);
  if (runLen < 0.05) {
    return [];
  }

  const count = Math.min(maxInstances, Math.max(1, Math.ceil(runLen / moduleLength)));
  const step = runLen / count;
  const segments: Array<{ x: number; lengthM: number }> = [];

  for (let index = 0; index < count; index++) {
    const x = xMin + index * step;
    const end = index === count - 1 ? xMax : x + step;
    const lengthM = Math.min(end - x, xMax - x);
    if (lengthM < 0.04) {
      continue;
    }
    segments.push({ x, lengthM });
  }

  return segments;
}

function bedAnchorZ(bed: BedZone, system: CultivationSystem): number {
  const lineW = Math.max(0.05, bed.zMax - bed.zMin);
  const anchor = MODULE_Z_ANCHOR[system] ?? "center";
  return anchor === "min" ? bed.zMin : bed.zMin + lineW / 2;
}

function CultivationBedMesh({ bed, system }: { bed: BedZone; system: CultivationSystem }) {
  const module = MODULES[system] ?? MODULES.soil;
  const lineW = Math.max(0.05, bed.zMax - bed.zMin);
  const z = bedAnchorZ(bed, system);
  const segments = buildRunSegments(bed.xMin, bed.xMax, module.length, 24);

  return (
    <group>
      {segments.map((segment, index) => (
        <GltfPart
          key={`${system}-${bed.bayIndex}-${bed.bedIndex}-${index}`}
          file={module.file}
          position={[segment.x, bed.elevationM, z]}
          rotation={[0, 0, 0]}
          scale={[segment.lengthM / module.length, 1, lineW / module.width]}
        />
      ))}
    </group>
  );
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