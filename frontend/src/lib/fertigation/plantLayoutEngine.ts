import type { FertigationEdge, FertigationNode } from "@/types/fertigation";

export interface PlantPose {
  position: [number, number, number];
  /** Base elevation of the equipment footprint (m). */
  groundY: number;
}

const ROW_BY_PID_Y = [
  { maxY: 165, z: -3.2 },
  { maxY: 340, z: 0 },
  { maxY: Number.POSITIVE_INFINITY, z: 3.2 },
] as const;

const COLUMN_SPAN_M = 14;

function rowZ(pidY: number): number {
  for (const band of ROW_BY_PID_Y) {
    if (pidY < band.maxY) {
      return band.z;
    }
  }
  return ROW_BY_PID_Y[ROW_BY_PID_Y.length - 1]?.z ?? 0;
}

/**
 * Converts P&ID schematic bands into a left-to-right plant skid:
 * make-up row (rear), conditioning / mixing (center), crop delivery (front).
 */
export function computePlantLayout(nodes: FertigationNode[]): Map<string, PlantPose> {
  const result = new Map<string, PlantPose>();
  if (nodes.length === 0) {
    return result;
  }

  const xs = nodes.map((node) => node.x);
  const minX = Math.min(...xs);
  const maxX = Math.max(...xs);
  const span = Math.max(maxX - minX, 120);

  for (const node of nodes) {
    const t = (node.x - minX) / span;
    const x = t * COLUMN_SPAN_M - COLUMN_SPAN_M / 2;
    const z = rowZ(node.y);
    result.set(node.id, { position: [x, 0, z], groundY: 0 });
  }
  return result;
}

export function plantLayoutCenter(poses: Map<string, PlantPose>): [number, number] {
  if (poses.size === 0) {
    return [0, 0];
  }
  let sumX = 0;
  let sumZ = 0;
  for (const { position } of poses.values()) {
    sumX += position[0];
    sumZ += position[2];
  }
  return [sumX / poses.size, sumZ / poses.size];
}

export function connectionHeightY(
  kind: FertigationNode["kind"],
  circuit: FertigationEdge["circuit"],
): number {
  if (kind === "tank") {
    return 0.95;
  }
  if (kind === "crop") {
    return 0.52;
  }
  switch (circuit) {
    case "return":
      return 0.22;
    case "crop":
      return 0.48;
    case "mix":
      return 0.58;
    case "source":
      return 0.32;
    default:
      return 0.4;
  }
}