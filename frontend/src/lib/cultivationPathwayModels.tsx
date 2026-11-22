import type { PathwayKind, PathwayZone } from "@/lib/cultivationLayout";

const PATHWAY_COLORS: Record<PathwayKind, string> = {
  center: "#b8b0a4",
  between_lines: "#c5beb2",
  gutter: "#a9a196",
  head: "#bcb5a8",
  cross: "#d2ccc0",
};

function PathwaySlab({ zone }: { zone: PathwayZone }) {
  const width = Math.max(0.05, zone.xMax - zone.xMin);
  const depth = Math.max(0.05, zone.zMax - zone.zMin);
  const x = (zone.xMin + zone.xMax) / 2;
  const z = (zone.zMin + zone.zMax) / 2;
  const color = PATHWAY_COLORS[zone.kind];

  return (
    <mesh position={[x, 0.145, z]} receiveShadow>
      <boxGeometry args={[width, 0.02, depth]} />
      <meshStandardMaterial color={color} roughness={0.88} metalness={0.02} />
    </mesh>
  );
}

export function CultivationPathwaysGroup({ pathways }: { pathways: PathwayZone[] }) {
  if (pathways.length === 0) {
    return null;
  }
  return (
    <group>
      {pathways.map((zone, index) => (
        <PathwaySlab
          key={`path-${zone.bayIndex}-${zone.kind}-${index}-${zone.xMin.toFixed(2)}`}
          zone={zone}
        />
      ))}
    </group>
  );
}