import type { FertigationNode } from "@/types/fertigation";

/** Maps P&ID editor coordinates to a compact Three.js layout (meters). */
export function pidNodeToWorld(node: FertigationNode): [number, number, number] {
  const x = (node.x - 448) / 14;
  const z = (node.y - 247) / 14;
  return [x, 0, z];
}