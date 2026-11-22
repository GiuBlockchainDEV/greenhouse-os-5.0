import * as THREE from "three";

import { GltfPart } from "@/components/3d/GltfPart";
import type { AcDuctDiffuser, AcDuctSegment } from "@/lib/acDuctLayout";
import type {
  AcUnitPlacement,
  CirculationFanPlacement,
  FanPlacement,
  FogLinePlacement,
  HeaterPlacement,
  PadWallPlacement,
  RoofExhaustFanPlacement,
  VentPlacement,
} from "@/lib/climateEquipmentLayout";
import { exhaustFanOpeningSpanM } from "@/lib/exhaustFanGable";

/** Author fanex asset size (m): square face width and height. */
const EXHAUST_FAN_FACE_M = 0.978;

function EastGableExhaustFanModel({
  fan,
  wallInsetM,
}: {
  fan: FanPlacement;
  wallInsetM: number;
}) {
  const openingSpanM = exhaustFanOpeningSpanM(fan.diameterM);
  const scale = openingSpanM / EXHAUST_FAN_FACE_M;
  /** East gable glazing plane matches `fan.x + wallInset` (see `ExhaustGableWall`). */
  const wallX = fan.x + wallInsetM;
  const openingCenterY = fan.y;
  const openingCenterZ = fan.z;
  /** Asset origin is floor-center; opening cutout is geometric center at `(y, z)`. */
  const y = openingCenterY - openingSpanM / 2;
  return (
    <GltfPart
      file="exhaust-fan.glb"
      position={[wallX, y, openingCenterZ]}
      rotation={[0, Math.PI / 2, 0]}
      scale={[scale, scale, scale]}
    />
  );
}

export function ExhaustFanModel({ fan }: { fan: FanPlacement }) {
  return <EastGableExhaustFanModel fan={fan} wallInsetM={0.12} />;
}

export function RoofExhaustFanModel({ fan }: { fan: RoofExhaustFanPlacement }) {
  return <EastGableExhaustFanModel fan={fan} wallInsetM={0.08} />;
}

/** Author circulation-fan GLB: rotor span ≈ 0.85 m, hanger at top (y ≈ 0.98 m). */
const CIRCULATION_FAN_ROTOR_M = 0.85;
const CIRCULATION_FAN_HEIGHT_M = 0.98;

export function HafFanModel({ fan }: { fan: CirculationFanPlacement }) {
  const scale = fan.diameterM / CIRCULATION_FAN_ROTOR_M;
  /** `fan.y` is the truss hang line; asset base is at y = 0. */
  const y = fan.y - CIRCULATION_FAN_HEIGHT_M * scale;
  return (
    <GltfPart
      file="haf-fan.glb"
      position={[fan.x, y, fan.z]}
      rotation={[0, fan.yaw - Math.PI / 2, 0]}
      scale={[scale, scale, scale]}
    />
  );
}

export function PadWallModel({ pad }: { pad: PadWallPlacement }) {
  const modules = Math.max(1, Math.round(pad.widthM / 1.08));
  const step = pad.widthM / modules;
  return (
    <group position={[pad.x, 0, pad.zCenter]}>
      {Array.from({ length: modules }, (_, index) => (
        <GltfPart
          key={`pad-${index}`}
          file="pad-module.glb"
          position={[0, 0, -pad.widthM / 2 + (index + 0.5) * step]}
          rotation={[0, Math.PI / 2, 0]}
          scale={[step / 1.08, pad.heightM / 2.08, 1]}
        />
      ))}
    </group>
  );
}

export function AcUnitModel({ unit }: { unit: AcUnitPlacement }) {
  const scale = Math.max(0.6, unit.widthM / 1.1);
  return (
    <GltfPart
      file="ac-unit.glb"
      position={[unit.x, 0, unit.z]}
      rotation={[0, unit.wall === "south" ? 0 : Math.PI, 0]}
      scale={[scale, scale, scale]}
    />
  );
}

export function DuctSegmentModel({ segment }: { segment: AcDuctSegment }) {
  const start = new THREE.Vector3(segment.start.x, segment.start.y, segment.start.z);
  const end = new THREE.Vector3(segment.end.x, segment.end.y, segment.end.z);
  const delta = end.clone().sub(start);
  const length = delta.length();
  if (length < 0.05) return null;
  const horizontal = Math.hypot(delta.x, delta.z);
  const elbow = horizontal > 0.35 && Math.abs(delta.y) > 0.35;
  const native = elbow ? 1.06 : 1.5;
  const section = Math.max(0.35, segment.diameterM / 0.6);
  const quaternion = new THREE.Quaternion().setFromUnitVectors(
    new THREE.Vector3(0, 0, 1),
    delta.normalize(),
  );
  return (
    <group position={start} quaternion={quaternion}>
      <GltfPart
        file={elbow ? "duct-elbow.glb" : "duct-straight.glb"}
        scale={[section, section, length / native]}
      />
    </group>
  );
}

export function DiffuserModel({ diffuser }: { diffuser: AcDuctDiffuser }) {
  return (
    <GltfPart
      file="duct-diffuser.glb"
      position={[diffuser.x, diffuser.y, diffuser.z]}
      rotation={[0, diffuser.yaw, 0]}
    />
  );
}

export function VentModel({ vent }: { vent: VentPlacement }) {
  if (vent.kind === "roof") {
    return (
      <GltfPart
        file="roof-vent.glb"
        position={[vent.x - vent.widthM / 2, vent.y, vent.z]}
        rotation={[vent.rotationX ?? 0, Math.PI / 2, 0]}
        scale={[1, 1, vent.widthM / 3]}
      />
    );
  }
  if (vent.kind === "gable") {
    return (
      <GltfPart
        file="gable-louver.glb"
        position={[vent.x, vent.y - vent.heightM / 2, vent.z]}
        rotation={[0, Math.PI / 2, 0]}
        scale={[vent.widthM / 1.8, vent.heightM / 1.8, 1]}
      />
    );
  }
  return (
    <GltfPart
      file="side-louver.glb"
      position={[vent.x, vent.y - vent.heightM / 2, vent.z]}
      scale={[vent.widthM / 1.2, vent.heightM / 1.6, 1]}
    />
  );
}

function distributedRunPositions(
  houseLength: number,
  moduleLength: number,
  maxInstances: number,
  endInsetM = 0.35,
): { count: number; step: number; xStart: number } {
  const xMin = -houseLength / 2 + endInsetM;
  const xMax = houseLength / 2 - endInsetM;
  const runLen = Math.max(0, xMax - xMin);
  const count = Math.min(maxInstances, Math.max(1, Math.ceil(runLen / moduleLength)));
  const step = count > 0 ? runLen / count : runLen;
  return { count, step, xStart: xMin };
}

export function HeaterModel({ heater, houseLength }: { heater: HeaterPlacement; houseLength: number }) {
  if (heater.kind === "pipe") {
    const { count, step, xStart } = distributedRunPositions(houseLength, 2, 40);
    return (
      <group>
        {Array.from({ length: count }, (_, index) => (
          <GltfPart
            key={`pipe-${heater.z}-${index}`}
            file="heat-pipe.glb"
            position={[xStart + index * step, heater.y, heater.z]}
            rotation={[0, Math.PI / 2, 0]}
            scale={[1, 1, step / 2]}
          />
        ))}
      </group>
    );
  }
  if (heater.kind === "geothermal") {
    const { count, step, xStart } = distributedRunPositions(houseLength, 1.64, 40);
    return (
      <group>
        {Array.from({ length: count }, (_, index) => (
          <GltfPart
            key={`loop-${heater.z}-${index}`}
            file="floor-loop.glb"
            position={[xStart + index * step, 0, heater.z]}
            rotation={[0, Math.PI / 2, 0]}
            scale={[1, 1, step / 1.64]}
          />
        ))}
      </group>
    );
  }
  if (heater.kind === "air") {
    return <GltfPart file="air-heater.glb" position={[heater.x, 0, heater.z]} />;
  }
  return (
    <GltfPart
      file="unit-heater.glb"
      position={[heater.x, heater.y + 0.45, heater.z]}
    />
  );
}

export function FogLineModel({ line, length }: { line: FogLinePlacement; length: number }) {
  const count = Math.min(line.nozzleCount, 48);
  const usable = length * 0.84;
  const step = usable / Math.max(1, count);
  const xStart = -usable / 2;
  return (
    <group>
      {Array.from({ length: count }, (_, index) => (
        <GltfPart
          key={`fog-${line.z}-${index}`}
          file="fog-nozzle.glb"
          position={[xStart + index * step, line.y, line.z]}
          rotation={[0, Math.PI / 2, 0]}
          scale={[1, 1, step / 0.5]}
        />
      ))}
    </group>
  );
}
