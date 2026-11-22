import { Text } from "@react-three/drei";
import { useTranslation } from "react-i18next";

import type { PlantSkidBlueprint, PlantSkidZoneKind } from "@/types/fertigation";

function zoneLabelKey(zone: PlantSkidZoneKind): string {
  switch (zone) {
    case "pump_house":
      return "skid.zonePumpHouse";
    case "pipe_gallery":
      return "skid.zonePipeGallery";
    case "fertigation_hut":
      return "skid.zoneHut";
    default:
      return "skid.zoneCropHall";
  }
}

function StockTote({
  position,
  volumeL,
  color,
  label,
}: {
  position: [number, number, number];
  volumeL: number;
  color: string;
  label: string;
}) {
  const w = volumeL > 130 ? 0.62 : 0.48;
  const h = 0.85;
  const d = 0.42;
  return (
    <group position={position}>
      <mesh position={[0, h / 2, 0]} castShadow receiveShadow>
        <boxGeometry args={[w, h, d]} />
        <meshStandardMaterial color={color} metalness={0.25} roughness={0.55} />
      </mesh>
      <mesh position={[0, h * 0.55, 0]}>
        <boxGeometry args={[w * 0.88, h * 0.72, d * 0.9]} />
        <meshStandardMaterial color="#1e293b" transparent opacity={0.15} />
      </mesh>
      <Text position={[0, h + 0.12, 0]} fontSize={0.12} color="#0f172a" anchorX="center" anchorY="bottom">
        {label}
      </Text>
    </group>
  );
}

function PumpHouseShell({ width, depth }: { width: number; depth: number }) {
  const pitW = Math.min(5.2, width * 0.35);
  const pitD = 2.8;
  return (
    <group>
      <mesh position={[-1, -0.38, -3.6]} receiveShadow>
        <boxGeometry args={[pitW, 0.76, pitD]} />
        <meshStandardMaterial color="#cbd5e1" roughness={0.85} metalness={0.05} />
      </mesh>
      <mesh position={[-3.2, 0.02, -5.4]} receiveShadow>
        <boxGeometry args={[width * 0.55, 0.04, 1.4]} />
        <meshStandardMaterial color="#e2e8f0" roughness={0.9} />
      </mesh>
      <mesh position={[4.8, 1.05, 4.8]} castShadow>
        <boxGeometry args={[width * 0.38, 0.08, depth * 0.22]} />
        <meshStandardMaterial color="#94a3b8" metalness={0.35} roughness={0.45} />
      </mesh>
    </group>
  );
}

function PipeGalleryShell({ width }: { width: number }) {
  return (
    <group>
      <mesh position={[0, 0.02, 0]} receiveShadow>
        <boxGeometry args={[width, 0.05, 2.6]} />
        <meshStandardMaterial color="#64748b" roughness={0.75} metalness={0.2} />
      </mesh>
      <mesh position={[0, 0.55, -2.4]} castShadow receiveShadow>
        <boxGeometry args={[width * 0.92, 1.1, 0.08]} />
        <meshStandardMaterial color="#475569" metalness={0.4} roughness={0.5} />
      </mesh>
      {[-3, 0, 3].map((offset) => (
        <mesh key={offset} position={[offset, 0.48, -1.8]} castShadow>
          <boxGeometry args={[0.55, 0.95, 0.35]} />
          <meshStandardMaterial color="#334155" metalness={0.45} roughness={0.5} />
        </mesh>
      ))}
    </group>
  );
}

function FertigationHutShell({ width }: { width: number }) {
  return (
    <group>
      <mesh position={[-1.5, 1.1, -1.8]} castShadow receiveShadow>
        <boxGeometry args={[width * 0.55, 2.2, 3.2]} />
        <meshStandardMaterial color="#f8fafc" roughness={0.92} metalness={0.03} />
      </mesh>
      <mesh position={[5.5, 0.04, 3.2]} receiveShadow>
        <boxGeometry args={[4.5, 0.06, 0.35]} />
        <meshStandardMaterial color="#64748b" roughness={0.8} />
      </mesh>
    </group>
  );
}

export function FertigationSkidStructure({ blueprint }: { blueprint: PlantSkidBlueprint }) {
  const { t } = useTranslation("fertigation");

  return (
    <group>
      {blueprint.zoneKind === "pump_house" ? (
        <PumpHouseShell width={blueprint.bounds.widthM} depth={blueprint.bounds.depthM} />
      ) : null}
      {blueprint.zoneKind === "pipe_gallery" ? <PipeGalleryShell width={blueprint.bounds.widthM} /> : null}
      {blueprint.zoneKind === "fertigation_hut" ? (
        <FertigationHutShell width={blueprint.bounds.widthM} />
      ) : null}

      {blueprint.stockTanks.map((stock) => (
        <StockTote
          key={stock.id}
          position={stock.position}
          volumeL={stock.volumeL}
          color={stock.color}
          label={t(stock.labelKey)}
        />
      ))}

      <Text
        position={[-blueprint.bounds.widthM / 2 + 0.8, 0.08, -blueprint.bounds.depthM / 2 + 0.5]}
        rotation={[-Math.PI / 2, 0, 0]}
        fontSize={0.18}
        color="#475569"
        anchorX="left"
      >
        {t(zoneLabelKey(blueprint.zoneKind))}
      </Text>
      <Text
        position={[blueprint.bounds.widthM / 2 - 0.4, 0.55, blueprint.bounds.depthM / 2 - 0.8]}
        fontSize={0.11}
        color="#64748b"
        anchorX="right"
        maxWidth={6}
      >
        {t("skid.reference")}
      </Text>
    </group>
  );
}