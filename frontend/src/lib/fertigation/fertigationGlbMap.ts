import type { FertigationComponentKind, FertigationNode } from "@/types/fertigation";

export interface FertigationGlbPlacement {
  file: string;
  scale: [number, number, number];
  yOffset: number;
  rotationY?: number;
}

const BASE: Record<FertigationComponentKind, FertigationGlbPlacement> = {
  source: { file: "pad-module.glb", scale: [0.45, 0.5, 0.55], yOffset: 0 },
  filter: { file: "side-louver.glb", scale: [0.35, 0.55, 0.4], yOffset: 0 },
  tank: { file: "dwc-raft.glb", scale: [0.55, 0.5, 0.55], yOffset: 0.05 },
  pump: { file: "heat-pipe.glb", scale: [0.5, 0.55, 0.5], yOffset: 0.05 },
  valve: { file: "roof-vent.glb", scale: [0.22, 0.28, 0.22], yOffset: 0.35 },
  injector: { file: "fog-nozzle.glb", scale: [0.65, 0.7, 0.65], yOffset: 0.1 },
  sensor: { file: "duct-diffuser.glb", scale: [0.25, 0.35, 0.25], yOffset: 0.45 },
  flowmeter: { file: "duct-diffuser.glb", scale: [0.32, 0.4, 0.32], yOffset: 0.25 },
  manifold: { file: "duct-straight.glb", scale: [0.5, 0.35, 0.35], yOffset: 0.2, rotationY: Math.PI / 2 },
  crop: { file: "nft-channel.glb", scale: [1.2, 1, 0.35], yOffset: 0.15, rotationY: 0 },
  return: { file: "duct-elbow.glb", scale: [0.3, 0.3, 0.3], yOffset: 0.15 },
  junction: { file: "duct-elbow.glb", scale: [0.18, 0.18, 0.18], yOffset: 0.2 },
};

function cropFile(node: FertigationNode): string {
  const system = String(node.params.system ?? "nft");
  if (system === "drip" || system === "inline") {
    return "drip-line.glb";
  }
  if (system === "substrate") {
    return "substrate-gutter.glb";
  }
  if (system === "dwc") {
    return "dwc-raft.glb";
  }
  if (system === "soil") {
    return "soil-bed.glb";
  }
  return "nft-channel.glb";
}

export function glbPlacementForNode(node: FertigationNode): FertigationGlbPlacement {
  const base = BASE[node.kind];
  if (node.kind !== "crop") {
    return base;
  }
  const channels = Math.max(4, Number(node.params.channels) || 8);
  const span = Math.min(3.2, 1.1 + channels * 0.04);
  return {
    ...base,
    file: cropFile(node),
    scale: [span, 1, node.params.system === "drip" ? 0.2 : 0.35],
  };
}