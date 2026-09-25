import { Clone, useGLTF } from "@react-three/drei";

const LIBRARY = "/models";

export function modelUrl(file: string): string {
  return `${LIBRARY}/${file}`;
}

interface GltfPartProps {
  file: string;
  position?: [number, number, number];
  rotation?: [number, number, number];
  scale?: [number, number, number];
}

/** One authored greenhouse component. The scene is cloned so the same file can repeat. */
export function GltfPart({ file, position, rotation, scale }: GltfPartProps) {
  const { scene } = useGLTF(modelUrl(file));
  return (
    <Clone
      object={scene}
      position={position}
      rotation={rotation}
      scale={scale}
      castShadow
      receiveShadow
    />
  );
}

const FILES = [
  "venlo-bay.glb",
  "gothic-arch.glb",
  "glazing-bar.glb",
  "exhaust-fan.glb",
  "haf-fan.glb",
  "pad-module.glb",
  "ac-unit.glb",
  "duct-straight.glb",
  "duct-elbow.glb",
  "duct-diffuser.glb",
  "roof-vent.glb",
  "side-louver.glb",
  "gable-louver.glb",
  "unit-heater.glb",
  "air-heater.glb",
  "heat-pipe.glb",
  "floor-loop.glb",
  "fog-nozzle.glb",
  "substrate-gutter.glb",
  "nft-channel.glb",
  "soil-bed.glb",
  "dwc-raft.glb",
  "drip-line.glb",
  "growbed.glb",
  "ebb-flow-bench.glb",
  "aeroponic-channel.glb",
];

FILES.forEach((file) => {
  useGLTF.preload(modelUrl(file));
});
