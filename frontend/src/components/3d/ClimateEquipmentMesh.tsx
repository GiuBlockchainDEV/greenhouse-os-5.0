import { useMemo } from "react";
import * as THREE from "three";

import { computeCultivationLayout } from "@/lib/cultivationLayout";
import {
  computeClimateEquipmentLayout,
  type AcUnitPlacement,
  type CirculationFanPlacement,
  type FanPlacement,
  type FogLinePlacement,
  type HeaterPlacement,
  type PadWallPlacement,
  type RoofExhaustFanPlacement,
  type VentPlacement,
} from "@/lib/climateEquipmentLayout";
import { useGreenhouseStore } from "@/store/useGreenhouseStore";

const FRAME_COLOR = "#059669";
const METAL_COLOR = "#64748b";
const PAD_COLOR = "#0ea5e9";
const AC_COLOR = "#94a3b8";
const HEATER_COLOR = "#f97316";
const FOG_COLOR = "#67e8f9";

const CIRC_FAN_COLOR = "#38bdf8";

function FanBlades({ radius, depth = 0.02 }: { radius: number; depth?: number }) {
  return (
    <>
      {Array.from({ length: 6 }, (_, index) => (
        <mesh
          key={`blade-${index}`}
          rotation={[0, 0, (Math.PI * 2 * index) / 6]}
          position={[0, 0, depth / 2 + 0.04]}
        >
          <boxGeometry args={[radius * 1.5, 0.08, depth]} />
          <meshStandardMaterial color={FRAME_COLOR} metalness={0.4} roughness={0.5} />
        </mesh>
      ))}
    </>
  );
}

function ExhaustFan({ fan }: { fan: FanPlacement }) {
  const radius = fan.diameterM / 2;
  return (
    <group position={[fan.x, fan.y, fan.z]} rotation={[0, -Math.PI / 2, 0]}>
      <mesh>
        <boxGeometry args={[fan.diameterM + 0.25, fan.diameterM + 0.25, 0.35]} />
        <meshStandardMaterial color={METAL_COLOR} metalness={0.65} roughness={0.35} />
      </mesh>
      <mesh position={[0, 0, 0.2]}>
        <cylinderGeometry args={[radius * 0.85, radius * 0.85, 0.06, 16]} />
        <meshStandardMaterial color="#334155" metalness={0.5} roughness={0.4} />
      </mesh>
      <FanBlades radius={radius} />
    </group>
  );
}

function RoofExhaustFan({ fan }: { fan: RoofExhaustFanPlacement }) {
  const radius = fan.diameterM / 2;
  return (
    <group position={[fan.x, fan.y, fan.z]} rotation={[0, -Math.PI / 2, 0]}>
      <mesh>
        <boxGeometry args={[fan.diameterM + 0.16, fan.diameterM + 0.16, 0.22]} />
        <meshStandardMaterial color="#475569" metalness={0.6} roughness={0.38} />
      </mesh>
      <mesh position={[0, 0, 0.12]}>
        <cylinderGeometry args={[radius * 0.82, radius * 0.82, 0.05, 16]} />
        <meshStandardMaterial color="#334155" metalness={0.5} roughness={0.4} />
      </mesh>
      <FanBlades radius={radius} />
    </group>
  );
}

function CirculationFan({ fan }: { fan: CirculationFanPlacement }) {
  const radius = fan.diameterM / 2;
  return (
    <group position={[fan.x, fan.y, fan.z]} rotation={[0, fan.yaw, 0]}>
      <mesh position={[0, 0.42, 0]}>
        <boxGeometry args={[0.22, 0.07, 0.22]} />
        <meshStandardMaterial color={METAL_COLOR} metalness={0.55} roughness={0.4} />
      </mesh>
      <mesh position={[0, 0.28, 0]}>
        <cylinderGeometry args={[0.012, 0.012, 0.28, 6]} />
        <meshStandardMaterial color="#334155" metalness={0.5} roughness={0.45} />
      </mesh>
      <group rotation={[0, 0, Math.PI / 2]}>
        <mesh>
          <boxGeometry args={[fan.diameterM + 0.12, fan.diameterM + 0.12, 0.32]} />
          <meshStandardMaterial color={CIRC_FAN_COLOR} metalness={0.45} roughness={0.42} />
        </mesh>
        <mesh position={[0, 0, 0.18]}>
          <cylinderGeometry args={[radius * 0.88, radius * 0.88, 0.05, 14]} />
          <meshStandardMaterial color="#0f172a" metalness={0.45} roughness={0.4} />
        </mesh>
        <FanBlades radius={radius} />
      </group>
      <mesh position={[fan.diameterM * 0.35, 0, 0]} rotation={[0, 0, Math.PI / 2]}>
        <coneGeometry args={[0.04, 0.12, 6]} />
        <meshStandardMaterial color={FRAME_COLOR} metalness={0.35} roughness={0.5} />
      </mesh>
    </group>
  );
}

function PadWall({ pad }: { pad: PadWallPlacement }) {
  return (
    <group position={[pad.x, pad.y, pad.zCenter]}>
      <mesh>
        <boxGeometry args={[0.12, pad.heightM, pad.widthM]} />
        <meshStandardMaterial
          color={PAD_COLOR}
          transparent
          opacity={0.75}
          roughness={0.85}
          metalness={0.05}
        />
      </mesh>
      {Array.from({ length: Math.max(3, Math.floor(pad.widthM / 0.5)) }, (_, index) => {
        const offset = -pad.widthM / 2 + 0.25 + index * 0.5;
        return (
          <mesh key={`rib-${index}`} position={[0.07, 0, offset]}>
            <boxGeometry args={[0.03, pad.heightM, 0.04]} />
            <meshStandardMaterial color={FRAME_COLOR} metalness={0.5} roughness={0.4} />
          </mesh>
        );
      })}
      <mesh position={[0, pad.heightM / 2 + 0.04, 0]}>
        <boxGeometry args={[0.16, 0.08, pad.widthM + 0.1]} />
        <meshStandardMaterial color={METAL_COLOR} metalness={0.6} roughness={0.35} />
      </mesh>
    </group>
  );
}

function AcUnit({ unit }: { unit: AcUnitPlacement }) {
  const facingInward = unit.wall === "south" ? -1 : 1;
  return (
    <group
      position={[unit.x, unit.y, unit.z]}
      rotation={[0, unit.wall === "south" ? Math.PI : 0, 0]}
    >
      <mesh position={[0, 0, facingInward * (unit.depthM * 0.15)]}>
        <boxGeometry args={[unit.widthM, unit.heightM, unit.depthM]} />
        <meshStandardMaterial color={AC_COLOR} metalness={0.55} roughness={0.35} />
      </mesh>
      <mesh position={[0, 0, facingInward * (unit.depthM * 0.5 + 0.02)]}>
        <boxGeometry args={[unit.widthM * 0.85, unit.heightM * 0.7, 0.04]} />
        <meshStandardMaterial color="#475569" metalness={0.7} roughness={0.25} />
      </mesh>
      {Array.from({ length: 5 }, (_, index) => (
        <mesh
          key={`fin-${index}`}
          position={[
            -unit.widthM * 0.35 + index * (unit.widthM * 0.18),
            0,
            facingInward * (unit.depthM * 0.5 + 0.04),
          ]}
        >
          <boxGeometry args={[0.03, unit.heightM * 0.65, 0.02]} />
          <meshStandardMaterial color="#1e293b" metalness={0.6} roughness={0.3} />
        </mesh>
      ))}
    </group>
  );
}

function ClimateVent({ vent }: { vent: VentPlacement }) {
  if (vent.kind === "roof") {
    return (
      <group position={[vent.x, vent.y, vent.z]} rotation={[vent.rotationX ?? 0, 0, 0]}>
        <mesh>
          <boxGeometry args={[vent.widthM, 0.08, 0.9]} />
          <meshStandardMaterial color={METAL_COLOR} metalness={0.55} roughness={0.35} />
        </mesh>
        <mesh position={[0, 0.12, 0]} rotation={[0.45, 0, 0]}>
          <boxGeometry args={[vent.widthM * 0.92, 0.04, 0.85]} />
          <meshStandardMaterial
            color={FRAME_COLOR}
            transparent
            opacity={0.35}
            metalness={0.2}
            roughness={0.2}
            side={THREE.DoubleSide}
          />
        </mesh>
      </group>
    );
  }

  if (vent.kind === "gable") {
    return (
      <group position={[vent.x, vent.y, vent.z]} rotation={[0, -Math.PI / 2, 0]}>
        <mesh>
          <boxGeometry args={[0.08, vent.heightM, vent.widthM]} />
          <meshStandardMaterial color={METAL_COLOR} metalness={0.5} roughness={0.4} />
        </mesh>
        {Array.from({ length: 8 }, (_, index) => (
          <mesh
            key={`louver-${index}`}
            position={[0.05, -vent.heightM / 2 + 0.15 + index * 0.18, 0]}
            rotation={[0.5, 0, 0]}
          >
            <boxGeometry args={[0.04, 0.12, vent.widthM * 0.9]} />
            <meshStandardMaterial color={FRAME_COLOR} metalness={0.35} roughness={0.45} />
          </mesh>
        ))}
      </group>
    );
  }

  return (
    <group position={[vent.x, vent.y, vent.z]}>
      <mesh>
        <boxGeometry args={[vent.widthM, vent.heightM, 0.08]} />
        <meshStandardMaterial color={METAL_COLOR} metalness={0.5} roughness={0.4} />
      </mesh>
      {Array.from({ length: 6 }, (_, index) => (
        <mesh
          key={`side-louver-${index}`}
          position={[0, -vent.heightM / 2 + 0.12 + index * 0.22, 0.05]}
          rotation={[0.55, 0, 0]}
        >
          <boxGeometry args={[vent.widthM * 0.9, 0.08, 0.03]} />
          <meshStandardMaterial color={FRAME_COLOR} metalness={0.35} roughness={0.45} />
        </mesh>
      ))}
    </group>
  );
}

function HeaterUnit({ heater }: { heater: HeaterPlacement }) {
  if (heater.kind === "geothermal") {
    return (
      <group position={[heater.x, heater.y, heater.z]}>
        <mesh rotation={[Math.PI / 2, 0, 0]}>
          <torusGeometry args={[0.45, 0.04, 8, 24]} />
          <meshStandardMaterial color="#0891b2" metalness={0.6} roughness={0.35} />
        </mesh>
      </group>
    );
  }

  if (heater.kind === "air") {
    return (
      <group position={[heater.x, heater.y, heater.z]}>
        <mesh>
          <boxGeometry args={[0.9, 0.55, 0.35]} />
          <meshStandardMaterial color={HEATER_COLOR} metalness={0.45} roughness={0.4} />
        </mesh>
        <mesh position={[0, 0, 0.2]}>
          <cylinderGeometry args={[0.22, 0.22, 0.05, 12]} />
          <meshStandardMaterial color="#431407" metalness={0.3} roughness={0.5} />
        </mesh>
      </group>
    );
  }

  return (
    <group position={[heater.x, heater.y, heater.z]}>
      <mesh>
        <boxGeometry args={[0.75, 0.4, 0.55]} />
        <meshStandardMaterial color={HEATER_COLOR} metalness={0.5} roughness={0.35} />
      </mesh>
      <mesh position={[0, -0.28, 0]}>
        <boxGeometry args={[0.06, 0.12, 0.06]} />
        <meshStandardMaterial color={METAL_COLOR} metalness={0.6} roughness={0.35} />
      </mesh>
    </group>
  );
}

function FogLines({
  lines,
  length,
}: {
  lines: FogLinePlacement[];
  length: number;
}) {
  if (lines.length === 0) return null;

  return (
    <group>
      {lines.map((line, lineIndex) => (
        <group key={`fog-line-${lineIndex}`} position={[0, line.y, line.z]}>
          <mesh rotation={[0, 0, Math.PI / 2]}>
            <cylinderGeometry args={[0.028, 0.028, length * 0.92, 8]} />
            <meshStandardMaterial
              color={FOG_COLOR}
              emissive={FOG_COLOR}
              emissiveIntensity={0.35}
              metalness={0.45}
              roughness={0.28}
            />
          </mesh>
          {Array.from({ length: line.nozzleCount }, (_, nozzleIndex) => {
            const x =
              line.nozzleCount === 1
                ? 0
                : -length * 0.45 + (nozzleIndex * length * 0.9) / (line.nozzleCount - 1);
            return (
              <group key={`nozzle-${lineIndex}-${nozzleIndex}`} position={[x, -0.08, 0]}>
                <mesh>
                  <coneGeometry args={[0.045, 0.12, 8]} />
                  <meshStandardMaterial
                    color={FOG_COLOR}
                    emissive={FOG_COLOR}
                    emissiveIntensity={0.5}
                    metalness={0.5}
                    roughness={0.2}
                  />
                </mesh>
                <mesh position={[0, -0.08, 0]}>
                  <cylinderGeometry args={[0.01, 0.018, 0.06, 6]} />
                  <meshStandardMaterial
                    color="#cffafe"
                    transparent
                    opacity={0.55}
                    roughness={0.15}
                  />
                </mesh>
              </group>
            );
          })}
        </group>
      ))}
    </group>
  );
}

export function ClimateEquipmentMesh() {
  const dimensions = useGreenhouseStore((s) => s.dimensions);
  const structure = useGreenhouseStore((s) => s.structure);
  const equipment = useGreenhouseStore((s) => s.climateEquipment);
  const crop = useGreenhouseStore((s) => s.crop);

  const layout = useMemo(() => {
    const cultivation = computeCultivationLayout({
      length: dimensions.length,
      totalWidth: dimensions.width,
      bayCount: structure.bayCount,
      bayWidthM: structure.bayWidthM,
      eaveHeight: dimensions.eaveHeight,
      cropType: crop.type,
      system: crop.system,
      layout: crop.layout,
      lai: crop.lai,
      growthStage: crop.growthStage,
    });

    return computeClimateEquipmentLayout({
      dimensions,
      structure,
      equipment,
      cultivationBeds: cultivation.beds,
      bedLineCount: cultivation.bedLineCount,
    });
  }, [dimensions, structure, equipment, crop]);

  return (
    <group>
      {layout.exhaustFans.map((fan, index) => (
        <ExhaustFan key={`fan-${index}`} fan={fan} />
      ))}
      {layout.roofExhaustFans.map((fan, index) => (
        <RoofExhaustFan key={`roof-fan-${index}`} fan={fan} />
      ))}
      {layout.circulationFans.map((fan, index) => (
        <CirculationFan key={`circ-fan-${index}`} fan={fan} />
      ))}
      {layout.padWalls.map((pad, index) => (
        <PadWall key={`pad-${index}`} pad={pad} />
      ))}
      {layout.acUnits.map((unit, index) => (
        <AcUnit key={`ac-${index}`} unit={unit} />
      ))}
      {layout.vents.map((vent, index) => (
        <ClimateVent key={`vent-${index}`} vent={vent} />
      ))}
      {layout.heaters.map((heater, index) => (
        <HeaterUnit key={`heater-${index}`} heater={heater} />
      ))}
      <FogLines lines={layout.fogLines} length={dimensions.length} />
    </group>
  );
}
