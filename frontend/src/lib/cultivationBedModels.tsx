/** Cultivation lines repeat the authored GLB modules along X (pad to exhaust). */

import { GltfPart } from "@/components/3d/GltfPart";
import type { BedZone } from "@/lib/cultivationLayout";
import type { CultivationSystem } from "@/types/greenhouse";

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

function CultivationBedMesh({ bed, system }: { bed: BedZone; system: CultivationSystem }) {
  const module = MODULES[system] ?? MODULES.soil;
  const runLen = Math.max(module.length, bed.xMax - bed.xMin);
  const lineW = Math.max(0.05, bed.zMax - bed.zMin);
  const count = Math.min(24, Math.max(1, Math.round(runLen / module.length)));
  const step = runLen / count;
  const z = (bed.zMin + bed.zMax) / 2;

  return (
    <group>
      {Array.from({ length: count }, (_, index) => (
        <GltfPart
          key={`${system}-${bed.bayIndex}-${bed.bedIndex}-${index}`}
          file={module.file}
          position={[bed.xMin + index * step, bed.elevationM, z]}
          rotation={[0, Math.PI / 2, 0]}
          scale={[lineW / module.width, 1, step / module.length]}
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
