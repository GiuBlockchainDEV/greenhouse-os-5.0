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

function repeats(span: number, moduleLength: number, cap: number): { count: number; step: number } {
  const count = Math.min(cap, Math.max(1, Math.round(span / moduleLength)));
  return { count, step: span / count };
}

export function ExhaustFanModel({ fan }: { fan: FanPlacement }) {
  const scale = fan.diameterM / 1.45;
  return (
    <GltfPart
      file="exhaust-fan.glb"
      position={[fan.x, fan.y, fan.z]}
      rotation={[0, -Math.PI / 2, 0]}
      scale={[scale, scale, scale]}
    />
  );
}

export function RoofExhaustFanModel({ fan }: { fan: RoofExhaustFanPlacement }) {
  const scale = fan.diameterM / 1.25;
  return (
    <GltfPart
      file="roof-exhaust-fan.glb"
      position={[fan.x, fan.y, fan.z]}
      scale={[scale, scale, scale]}
    />
  );
}

export function HafFanModel({ fan }: { fan: CirculationFanPlacement }) {
  const scale = fan.diameterM / 0.9;
  return (
    <GltfPart
      file="haf-fan.glb"
      position={[fan.x, fan.y + 0.45 * scale, fan.z]}
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

export function HeaterModel({ heater, houseLength }: { heater: HeaterPlacement; houseLength: number }) {
  if (heater.kind === "pipe") {
    const { count, step } = repeats(houseLength, 2, 40);
    return (
      <group>
        {Array.from({ length: count }, (_, index) => (
          <GltfPart
            key={`pipe-${heater.z}-${index}`}
            file="heat-pipe.glb"
            position={[-houseLength / 2 + index * step, heater.y, heater.z]}
            rotation={[0, Math.PI / 2, 0]}
            scale={[1, 1, step / 2]}
          />
        ))}
      </group>
    );
  }
  if (heater.kind === "geothermal") {
    const { count, step } = repeats(houseLength, 1.64, 40);
    return (
      <group>
        {Array.from({ length: count }, (_, index) => (
          <GltfPart
            key={`loop-${heater.z}-${index}`}
            file="floor-loop.glb"
            position={[-houseLength / 2 + index * step, 0, heater.z]}
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
  const step = (length * 0.9) / Math.max(1, count);
  return (
    <group>
      {Array.from({ length: count }, (_, index) => (
        <GltfPart
          key={`fog-${line.z}-${index}`}
          file="fog-nozzle.glb"
          position={[-length * 0.45 + index * step, line.y, line.z]}
          rotation={[0, Math.PI / 2, 0]}
          scale={[1, 1, step / 0.5]}
        />
      ))}
    </group>
  );
}
