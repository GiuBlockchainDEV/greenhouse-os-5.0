import { useMemo } from "react";
import { Edges } from "@react-three/drei";
import * as THREE from "three";

import { useGreenhouseStore } from "@/store/useGreenhouseStore";

const WALL_OPACITY = 0.18;
const FRAME_COLOR = "#4ade80";
const GLASS_COLOR = "#86efac";

function createRoofGeometry(
  length: number,
  width: number,
  eaveHeight: number,
  ridgeHeight: number,
): THREE.BufferGeometry {
  const halfLength = length / 2;
  const halfWidth = width / 2;

  const vertices = new Float32Array([
    -halfLength, eaveHeight, -halfWidth,
    halfLength, eaveHeight, -halfWidth,
    halfLength, ridgeHeight, 0,
    -halfLength, ridgeHeight, 0,
    -halfLength, eaveHeight, halfWidth,
    halfLength, eaveHeight, halfWidth,
  ]);

  const indices = [
    0, 1, 2, 0, 2, 3,
    4, 5, 2, 4, 2, 3,
  ];

  const geometry = new THREE.BufferGeometry();
  geometry.setAttribute("position", new THREE.BufferAttribute(vertices, 3));
  geometry.setIndex(indices);
  geometry.computeVertexNormals();
  return geometry;
}

export function GreenhouseMesh() {
  const dimensions = useGreenhouseStore((state) => state.dimensions);
  const covering = useGreenhouseStore((state) => state.covering);
  const { length, width, ridgeHeight, eaveHeight } = dimensions;

  const roofGeometry = useMemo(
    () => createRoofGeometry(length, width, eaveHeight, ridgeHeight),
    [length, width, eaveHeight, ridgeHeight],
  );

  const glassOpacity = 0.12 + covering.transmittance * 0.2;

  return (
    <group position={[0, 0, 0]}>
      <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, 0.01, 0]} receiveShadow>
        <planeGeometry args={[length + 4, width + 4]} />
        <meshStandardMaterial color="#1a3822" roughness={0.9} />
      </mesh>

      <mesh position={[0, eaveHeight / 2, -width / 2]}>
        <boxGeometry args={[length, eaveHeight, 0.08]} />
        <meshPhysicalMaterial
          color={GLASS_COLOR}
          transparent
          opacity={WALL_OPACITY}
          roughness={0.05}
          metalness={0.1}
          transmission={glassOpacity}
          thickness={0.5}
        />
        <Edges color={FRAME_COLOR} threshold={15} />
      </mesh>

      <mesh position={[0, eaveHeight / 2, width / 2]}>
        <boxGeometry args={[length, eaveHeight, 0.08]} />
        <meshPhysicalMaterial
          color={GLASS_COLOR}
          transparent
          opacity={WALL_OPACITY}
          roughness={0.05}
          metalness={0.1}
          transmission={glassOpacity}
          thickness={0.5}
        />
        <Edges color={FRAME_COLOR} threshold={15} />
      </mesh>

      <mesh position={[-length / 2, eaveHeight / 2, 0]}>
        <boxGeometry args={[0.08, eaveHeight, width]} />
        <meshPhysicalMaterial
          color={GLASS_COLOR}
          transparent
          opacity={WALL_OPACITY}
          roughness={0.05}
          metalness={0.1}
          transmission={glassOpacity}
          thickness={0.5}
        />
        <Edges color={FRAME_COLOR} threshold={15} />
      </mesh>

      <mesh position={[length / 2, eaveHeight / 2, 0]}>
        <boxGeometry args={[0.08, eaveHeight, width]} />
        <meshPhysicalMaterial
          color={GLASS_COLOR}
          transparent
          opacity={WALL_OPACITY}
          roughness={0.05}
          metalness={0.1}
          transmission={glassOpacity}
          thickness={0.5}
        />
        <Edges color={FRAME_COLOR} threshold={15} />
      </mesh>

      <mesh geometry={roofGeometry}>
        <meshPhysicalMaterial
          color={GLASS_COLOR}
          transparent
          opacity={WALL_OPACITY + 0.05}
          roughness={0.03}
          metalness={0.15}
          transmission={glassOpacity + 0.1}
          side={THREE.DoubleSide}
          thickness={0.3}
        />
        <Edges color={FRAME_COLOR} threshold={15} />
      </mesh>

      {Array.from({ length: Math.floor(length / 3) + 1 }, (_, index) => {
        const x = -length / 2 + index * 3;
        return (
          <mesh key={`frame-${index}`} position={[x, eaveHeight, 0]}>
            <boxGeometry args={[0.06, 0.06, width]} />
            <meshStandardMaterial color={FRAME_COLOR} metalness={0.6} roughness={0.3} />
          </mesh>
        );
      })}

      <mesh position={[0, ridgeHeight, 0]}>
        <boxGeometry args={[length, 0.08, 0.08]} />
        <meshStandardMaterial color={FRAME_COLOR} metalness={0.7} roughness={0.2} />
      </mesh>
    </group>
  );
}
