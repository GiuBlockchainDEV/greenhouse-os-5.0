import type { FertigationNode } from "@/types/fertigation";

/** Maps P&ID editor coordinates to a compact Three.js layout (meters). */
export function pidNodeToWorld(node: FertigationNode): [number, number, number] {
  const x = (node.x - 448) / 18;
  const z = (node.y - 247) / 18;
  return [x, 0, z];
}

export function pidLayoutCenter(nodes: FertigationNode[]): [number, number] {
  if (nodes.length === 0) {
    return [0, 0];
  }
  let sumX = 0;
  let sumZ = 0;
  for (const node of nodes) {
    const [x, , z] = pidNodeToWorld(node);
    sumX += x;
    sumZ += z;
  }
  return [sumX / nodes.length, sumZ / nodes.length];
}