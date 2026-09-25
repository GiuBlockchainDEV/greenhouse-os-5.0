import { useMemo } from "react";
import * as THREE from "three";

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
import type { AcDuctDiffuser, AcDuctSegment } from "@/lib/acDuctLayout";
import { useGreenhouseStore } from "@/store/useGreenhouseStore";

const STEEL = "#c5ccd3";
const STEEL_DARK = "#6d7680";
const CELLULOSE = "#c4a36a";
const CABINET = "#e7eaee";
const COPPER = "#b87333";
const STAINLESS = "#d7dde3";

function FanRotor({ radius }: { radius: number }) {
  return (
    <group>
      <mesh>
        <cylinderGeometry args={[radius * 0.14, radius * 0.18, 0.1, 12]} />
        <meshStandardMaterial color="#2a3138" metalness={0.72} roughness={0.32} />
      </mesh>
      {Array.from({ length: 4 }, (_, index) => (
        <group key={`blade-${index}`} rotation={[0, 0, (Math.PI * index) / 2]}>
          <mesh position={[radius * 0.46, 0, 0.01]} rotation={[0.55, 0, 0]}>
            <boxGeometry args={[radius * 0.82, 0.035, 0.012]} />
            <meshStandardMaterial color={STEEL} metalness={0.84} roughness={0.22} />
          </mesh>
        </group>
      ))}
    </group>
  );
}

function FanShroud({ radius, depth }: { radius: number; depth: number }) {
  return (
    <group>
      <mesh rotation={[Math.PI / 2, 0, 0]}>
        <cylinderGeometry args={[radius + 0.07, radius + 0.07, depth, 28, 1, true]} />
        <meshStandardMaterial color={STEEL} metalness={0.78} roughness={0.28} side={THREE.DoubleSide} />
      </mesh>
      <mesh rotation={[Math.PI / 2, 0, 0]} position={[0, 0, depth * 0.45]}>
        <torusGeometry args={[radius + 0.02, 0.028, 8, 28]} />
        <meshStandardMaterial color={STEEL_DARK} metalness={0.7} roughness={0.34} />
      </mesh>
      <mesh rotation={[Math.PI / 2, 0, 0]}>
        <torusGeometry args={[radius * 0.55, 0.012, 6, 24]} />
        <meshStandardMaterial color={STEEL_DARK} metalness={0.65} roughness={0.4} />
      </mesh>
    </group>
  );
}

function ExhaustFan({ fan }: { fan: FanPlacement }) {
  const radius = fan.diameterM / 2;
  return (
    <group position={[fan.x, fan.y, fan.z]} rotation={[0, -Math.PI / 2, 0]}>
      <FanShroud radius={radius} depth={0.32} />
      <mesh position={[0, 0, 0.16]}>
        <cylinderGeometry args={[radius + 0.1, radius * 0.72, 0.14, 24, 1, true]} />
        <meshStandardMaterial color={STEEL} metalness={0.76} roughness={0.3} side={THREE.DoubleSide} />
      </mesh>
      <FanRotor radius={radius * 0.86} />
    </group>
  );
}

function RoofExhaustFan({ fan }: { fan: RoofExhaustFanPlacement }) {
  const radius = fan.diameterM / 2;
  return (
    <group position={[fan.x, fan.y, fan.z]} rotation={[0, -Math.PI / 2, 0]}>
      <FanShroud radius={radius} depth={0.22} />
      <FanRotor radius={radius * 0.84} />
    </group>
  );
}

function CirculationFan({ fan }: { fan: CirculationFanPlacement }) {
  const radius = fan.diameterM / 2;
  return (
    <group position={[fan.x, fan.y, fan.z]} rotation={[0, fan.yaw, 0]}>
      <mesh position={[0, 0.42, 0]}>
        <boxGeometry args={[0.16, 0.04, 0.16]} />
        <meshStandardMaterial color={STEEL_DARK} metalness={0.7} roughness={0.35} />
      </mesh>
      <mesh position={[0, 0.22, 0]}>
        <cylinderGeometry args={[0.015, 0.015, 0.4, 8]} />
        <meshStandardMaterial color={STEEL_DARK} metalness={0.65} roughness={0.4} />
      </mesh>
      <group rotation={[0, 0, Math.PI / 2]}>
        <FanShroud radius={radius} depth={0.28} />
        <FanRotor radius={radius * 0.82} />
      </group>
      <mesh position={[radius + 0.08, 0, 0]} rotation={[0, 0, -Math.PI / 2]}>
        <cylinderGeometry args={[0.045, 0.02, 0.16, 8]} />
        <meshStandardMaterial color="#1f2937" metalness={0.4} roughness={0.55} />
      </mesh>
    </group>
  );
}

function PadWall({ pad }: { pad: PadWallPlacement }) {
  return (
    <group position={[pad.x, pad.y, pad.zCenter]}>
      <mesh>
        <boxGeometry args={[0.1, pad.heightM, pad.widthM]} />
        <meshStandardMaterial color={CELLULOSE} roughness={0.96} metalness={0} />
      </mesh>
      {Array.from({ length: Math.max(2, Math.floor(pad.widthM / 1.2)) }, (_, index) => {
        const ribCount = Math.max(2, Math.floor(pad.widthM / 1.2));
        const offset = -pad.widthM / 2 + (pad.widthM / (ribCount + 1)) * (index + 1);
        return (
          <mesh key={`rib-${index}`} position={[0.06, 0, offset]}>
            <boxGeometry args={[0.02, pad.heightM * 0.96, 0.015]} />
            <meshStandardMaterial color="#8d6a3a" roughness={0.9} />
          </mesh>
        );
      })}
      <mesh position={[0, pad.heightM / 2 + 0.05, 0]}>
        <boxGeometry args={[0.14, 0.08, pad.widthM + 0.08]} />
        <meshStandardMaterial color={STEEL} metalness={0.78} roughness={0.28} />
      </mesh>
      <mesh position={[0, -pad.heightM / 2 - 0.04, 0]}>
        <boxGeometry args={[0.18, 0.08, pad.widthM + 0.08]} />
        <meshStandardMaterial color={STEEL_DARK} metalness={0.62} roughness={0.4} />
      </mesh>
    </group>
  );
}

function AcDuctSegmentMesh({ segment }: { segment: AcDuctSegment }) {
  const start = new THREE.Vector3(segment.start.x, segment.start.y, segment.start.z);
  const end = new THREE.Vector3(segment.end.x, segment.end.y, segment.end.z);
  const axis = end.clone().sub(start);
  const length = axis.length();
  if (length < 0.05) return null;

  const center = start.clone().add(end).multiplyScalar(0.5);
  const quaternion = new THREE.Quaternion().setFromUnitVectors(
    new THREE.Vector3(0, 1, 0),
    axis.normalize(),
  );

  return (
    <mesh position={center} quaternion={quaternion}>
      <cylinderGeometry args={[segment.diameterM / 2, segment.diameterM / 2, length, 12]} />
      <meshStandardMaterial color={STEEL} metalness={0.72} roughness={0.32} />
    </mesh>
  );
}

function AcDuctDiffuserMesh({ diffuser }: { diffuser: AcDuctDiffuser }) {
  return (
    <group position={[diffuser.x, diffuser.y, diffuser.z]} rotation={[0, diffuser.yaw, 0]}>
      <mesh>
        <boxGeometry args={[0.42, 0.06, 0.28]} />
        <meshStandardMaterial color={CABINET} metalness={0.35} roughness={0.45} />
      </mesh>
      {Array.from({ length: 4 }, (_, index) => (
        <mesh
          key={`louver-${index}`}
          position={[-0.14 + index * 0.09, -0.04, 0.12]}
          rotation={[0.42, 0, 0]}
        >
          <boxGeometry args={[0.06, 0.02, 0.14]} />
          <meshStandardMaterial color={STEEL_DARK} metalness={0.55} roughness={0.38} />
        </mesh>
      ))}
      <mesh position={[0, -0.02, 0.2]} rotation={[Math.PI / 2, 0, 0]}>
        <coneGeometry args={[0.035, 0.1, 6]} />
        <meshStandardMaterial color={STEEL_DARK} metalness={0.5} roughness={0.4} />
      </mesh>
    </group>
  );
}

function AcDuctNetworkMesh({
  segments,
  diffusers,
}: {
  segments: AcDuctSegment[];
  diffusers: AcDuctDiffuser[];
}) {
  if (segments.length === 0 && diffusers.length === 0) return null;

  return (
    <group>
      {segments.map((segment, index) => (
        <AcDuctSegmentMesh key={`ac-duct-${index}`} segment={segment} />
      ))}
      {diffusers.map((diffuser, index) => (
        <AcDuctDiffuserMesh key={`ac-diffuser-${index}`} diffuser={diffuser} />
      ))}
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
        <meshStandardMaterial color={CABINET} metalness={0.28} roughness={0.42} />
      </mesh>
      <mesh position={[0, unit.heightM * 0.08, facingInward * (unit.depthM * 0.5 + 0.02)]}>
        <boxGeometry args={[unit.widthM * 0.82, unit.heightM * 0.55, 0.04]} />
        <meshStandardMaterial color="#1c242c" metalness={0.45} roughness={0.55} />
      </mesh>
      <mesh position={[0, unit.heightM * 0.42, facingInward * (unit.depthM * 0.15)]} rotation={[Math.PI / 2, 0, 0]}>
        <cylinderGeometry args={[unit.widthM * 0.18, unit.widthM * 0.18, 0.06, 16]} />
        <meshStandardMaterial color={STEEL_DARK} metalness={0.6} roughness={0.35} />
      </mesh>
    </group>
  );
}

function ClimateVent({ vent }: { vent: VentPlacement }) {
  if (vent.kind === "roof") {
    return (
      <group position={[vent.x, vent.y, vent.z]} rotation={[vent.rotationX ?? 0, 0, 0]}>
        <mesh>
          <boxGeometry args={[vent.widthM, 0.08, 0.9]} />
          <meshStandardMaterial color={STEEL} metalness={0.72} roughness={0.3} />
        </mesh>
        <mesh position={[0, 0.12, 0]} rotation={[0.45, 0, 0]}>
          <boxGeometry args={[vent.widthM * 0.92, 0.04, 0.85]} />
          <meshPhysicalMaterial
            color="#e7f4ee"
            transparent
            opacity={0.55}
            roughness={0.06}
            transmission={0.7}
            thickness={0.02}
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
          <meshStandardMaterial color={STEEL} metalness={0.7} roughness={0.32} />
        </mesh>
        {Array.from({ length: 8 }, (_, index) => (
          <mesh
            key={`louver-${index}`}
            position={[0.05, -vent.heightM / 2 + 0.15 + index * 0.18, 0]}
            rotation={[0.5, 0, 0]}
          >
            <boxGeometry args={[0.03, 0.08, vent.widthM * 0.88]} />
            <meshStandardMaterial color={STEEL_DARK} metalness={0.62} roughness={0.36} />
          </mesh>
        ))}
      </group>
    );
  }

  return (
    <group position={[vent.x, vent.y, vent.z]}>
      <mesh>
        <boxGeometry args={[vent.widthM, vent.heightM, 0.08]} />
        <meshStandardMaterial color={STEEL} metalness={0.7} roughness={0.32} />
      </mesh>
      {Array.from({ length: 6 }, (_, index) => (
        <mesh
          key={`side-louver-${index}`}
          position={[0, -vent.heightM / 2 + 0.12 + index * 0.22, 0.05]}
          rotation={[0.55, 0, 0]}
        >
          <boxGeometry args={[vent.widthM * 0.88, 0.06, 0.02]} />
          <meshStandardMaterial color={STEEL_DARK} metalness={0.62} roughness={0.36} />
        </mesh>
      ))}
    </group>
  );
}

function HeaterUnit({ heater, houseLength }: { heater: HeaterPlacement; houseLength: number }) {
  if (heater.kind === "pipe" || heater.kind === "geothermal") {
    const color = heater.kind === "pipe" ? COPPER : "#2a3036";
    const y = heater.kind === "pipe" ? heater.y : 0.08;
    return (
      <group position={[0, y, heater.z]}>
        <mesh rotation={[0, 0, Math.PI / 2]} castShadow>
          <cylinderGeometry args={[0.022, 0.022, houseLength * 0.94, 10]} />
          <meshStandardMaterial color={color} metalness={0.78} roughness={0.26} />
        </mesh>
        <mesh position={[0, 0.07, 0.06]} rotation={[0, 0, Math.PI / 2]} castShadow>
          <cylinderGeometry args={[0.022, 0.022, houseLength * 0.94, 10]} />
          <meshStandardMaterial color={color} metalness={0.78} roughness={0.26} />
        </mesh>
      </group>
    );
  }

  if (heater.kind === "air") {
    return (
      <group position={[heater.x, heater.y, heater.z]}>
        <mesh castShadow>
          <boxGeometry args={[0.85, 0.5, 0.38]} />
          <meshStandardMaterial color={CABINET} metalness={0.35} roughness={0.4} />
        </mesh>
        <mesh position={[0, 0, 0.22]} rotation={[Math.PI / 2, 0, 0]}>
          <cylinderGeometry args={[0.16, 0.16, 0.06, 16]} />
          <meshStandardMaterial color={STEEL_DARK} metalness={0.6} roughness={0.35} />
        </mesh>
        <mesh position={[0.28, 0.38, 0]}>
          <cylinderGeometry args={[0.04, 0.04, 0.35, 8]} />
          <meshStandardMaterial color="#3f3f46" metalness={0.4} roughness={0.5} />
        </mesh>
      </group>
    );
  }

  return (
    <group position={[heater.x, heater.y, heater.z]}>
      <mesh castShadow>
        <boxGeometry args={[0.7, 0.36, 0.48]} />
        <meshStandardMaterial color={CABINET} metalness={0.4} roughness={0.38} />
      </mesh>
      <mesh position={[0.38, 0, 0]} rotation={[0, 0, Math.PI / 2]}>
        <cylinderGeometry args={[0.14, 0.18, 0.16, 16]} />
        <meshStandardMaterial color={STEEL} metalness={0.7} roughness={0.3} />
      </mesh>
      <mesh position={[0, 0.28, 0]}>
        <cylinderGeometry args={[0.012, 0.012, 0.22, 6]} />
        <meshStandardMaterial color={STEEL_DARK} metalness={0.6} roughness={0.4} />
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
            <meshStandardMaterial color={STAINLESS} metalness={0.82} roughness={0.22} />
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
                  <meshStandardMaterial color="#b08d57" metalness={0.7} roughness={0.32} />
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

  const layout = useMemo(
    () =>
      computeClimateEquipmentLayout({
        dimensions,
        structure,
        equipment,
      }),
    [dimensions, structure, equipment],
  );

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
      <AcDuctNetworkMesh
        segments={layout.acDucts.segments}
        diffusers={layout.acDucts.diffusers}
      />
      {layout.vents.map((vent, index) => (
        <ClimateVent key={`vent-${index}`} vent={vent} />
      ))}
      {layout.heaters.map((heater, index) => (
        <HeaterUnit key={`heater-${index}`} heater={heater} houseLength={dimensions.length} />
      ))}
      <FogLines lines={layout.fogLines} length={dimensions.length} />
    </group>
  );
}
