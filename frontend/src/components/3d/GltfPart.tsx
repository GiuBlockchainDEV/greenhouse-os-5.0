import { useMemo } from "react";
import { useGLTF } from "@react-three/drei";
import * as THREE from "three";

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

function tuneLoadedScene(root: THREE.Object3D): void {
  root.traverse((child) => {
    if (!(child instanceof THREE.Mesh)) {
      return;
    }
    const mesh = child;
    mesh.castShadow = true;
    mesh.receiveShadow = true;
    const geometry = mesh.geometry;
    if (!geometry.getAttribute("normal")) {
      geometry.computeVertexNormals();
    }
    const material = mesh.material;
    const tune = (entry: THREE.MeshStandardMaterial | THREE.MeshPhysicalMaterial) => {
      entry.flatShading = false;
      entry.envMapIntensity = 1.15;
    };
    if (Array.isArray(material)) {
      material.forEach((entry) => {
        if (entry instanceof THREE.MeshStandardMaterial || entry instanceof THREE.MeshPhysicalMaterial) {
          tune(entry);
        }
      });
      return;
    }
    if (material instanceof THREE.MeshStandardMaterial || material instanceof THREE.MeshPhysicalMaterial) {
      tune(material);
    }
  });
}

/** One authored greenhouse component. The scene is cloned so the same file can repeat. */
export function GltfPart({ file, position, rotation, scale }: GltfPartProps) {
  const { scene } = useGLTF(modelUrl(file));
  const object = useMemo(() => {
    const root = scene.clone(true);
    tuneLoadedScene(root);
    return root;
  }, [scene]);

  return (
    <group position={position} rotation={rotation} scale={scale}>
      <primitive object={object} />
    </group>
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
  "fertigation-filter-system.glb",
  "fertigation-water-tank.glb",
  "fertigation-source-skid.glb",
];

FILES.forEach((file) => {
  useGLTF.preload(modelUrl(file));
});