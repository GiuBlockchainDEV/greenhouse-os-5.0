import { useMemo } from "react";
import { Edges } from "@react-three/drei";
import * as THREE from "three";

import { useGreenhouseStore } from "@/store/useGreenhouseStore";
import type { ArchType } from "@/types/greenhouse";

const WALL_OPACITY = 0.18;
const FRAME_COLOR = "#4ade80";
const GLASS_COLOR = "#86efac";

function createTriangularRoofGeometry(
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

  const indices = [0, 1, 2, 0, 2, 3, 4, 5, 2, 4, 2, 3];

  const geometry = new THREE.BufferGeometry();
  geometry.setAttribute("position", new THREE.BufferAttribute(vertices, 3));
  geometry.setIndex(indices);
  geometry.computeVertexNormals();
  return geometry;
}

function createSemicircularBayRoof(
  length: number,
  bayWidth: number,
  eaveHeight: number,
  zCenter: number,
  segments = 20,
): THREE.BufferGeometry {
  const radius = bayWidth / 2;
  const halfLength = length / 2;
  const positions: number[] = [];
  const indices: number[] = [];

  for (let row = 0; row <= 1; row++) {
    const x = row === 0 ? -halfLength : halfLength;
    for (let seg = 0; seg <= segments; seg++) {
      const theta = (Math.PI * seg) / segments;
      const localZ = radius * Math.cos(theta);
      const y = eaveHeight + radius * Math.sin(theta);
      positions.push(x, y, zCenter + localZ - radius);
    }
  }

  const rowStride = segments + 1;
  for (let seg = 0; seg < segments; seg++) {
    const a = seg;
    const b = seg + 1;
    const c = seg + rowStride;
    const d = seg + rowStride + 1;
    indices.push(a, b, c, b, d, c);
  }

  const geometry = new THREE.BufferGeometry();
  geometry.setAttribute("position", new THREE.Float32BufferAttribute(positions, 3));
  geometry.setIndex(indices);
  geometry.computeVertexNormals();
  return geometry;
}

function BayDivider({
  length,
  eaveHeight,
  ridgeHeight,
  archType,
  bayWidth,
  z,
}: {
  length: number;
  eaveHeight: number;
  ridgeHeight: number;
  archType: ArchType;
  bayWidth: number;
  z: number;
}) {
  const height = archType === "semicircular" ? eaveHeight + bayWidth / 2 : ridgeHeight;

  return (
    <mesh position={[0, height / 2, z]}>
      <boxGeometry args={[length, height, 0.06]} />
      <meshStandardMaterial color={FRAME_COLOR} metalness={0.6} roughness={0.3} />
    </mesh>
  );
}

export function GreenhouseMesh() {
  const dimensions = useGreenhouseStore((state) => state.dimensions);
  const structure = useGreenhouseStore((state) => state.structure);
  const covering = useGreenhouseStore((state) => state.covering);
  const { length, width, ridgeHeight, eaveHeight } = dimensions;
  const { bayCount, bayWidthM, archType } = structure;

  const triangularRoof = useMemo(
    () =>
      archType === "triangular"
        ? createTriangularRoofGeometry(length, width, eaveHeight, ridgeHeight)
        : null,
    [archType, length, width, eaveHeight, ridgeHeight],
  );

  const semicircularRoofs = useMemo(() => {
    if (archType !== "semicircular") return [];
    return Array.from({ length: bayCount }, (_, index) => {
      const zCenter = -width / 2 + bayWidthM / 2 + index * bayWidthM;
      return {
        key: `arch-${index}`,
        geometry: createSemicircularBayRoof(length, bayWidthM, eaveHeight, zCenter),
      };
    });
  }, [archType, bayCount, bayWidthM, length, eaveHeight, width]);

  const bayDividerPositions = useMemo(() => {
    if (bayCount <= 1) return [];
    const positions: number[] = [];
    for (let index = 1; index < bayCount; index++) {
      positions.push(-width / 2 + index * bayWidthM);
    }
    return positions;
  }, [bayCount, bayWidthM, width]);

  const glassOpacity = 0.12 + covering.transmittance * 0.2;
  const roofMaterial = (
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
  );

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

      {archType === "triangular" && triangularRoof && (
        <mesh geometry={triangularRoof}>
          {roofMaterial}
          <Edges color={FRAME_COLOR} threshold={15} />
        </mesh>
      )}

      {semicircularRoofs.map(({ key, geometry }) => (
        <mesh key={key} geometry={geometry}>
          {roofMaterial}
          <Edges color={FRAME_COLOR} threshold={15} />
        </mesh>
      ))}

      {bayDividerPositions.map((z) => (
        <BayDivider
          key={`divider-${z}`}
          length={length}
          eaveHeight={eaveHeight}
          ridgeHeight={ridgeHeight}
          archType={archType}
          bayWidth={bayWidthM}
          z={z}
        />
      ))}

      {Array.from({ length: Math.floor(length / 3) + 1 }, (_, index) => {
        const x = -length / 2 + index * 3;
        return (
          <mesh key={`frame-${index}`} position={[x, eaveHeight, 0]}>
            <boxGeometry args={[0.06, 0.06, width]} />
            <meshStandardMaterial color={FRAME_COLOR} metalness={0.6} roughness={0.3} />
          </mesh>
        );
      })}

      {archType === "triangular" && (
        <mesh position={[0, ridgeHeight, 0]}>
          <boxGeometry args={[length, 0.08, 0.08]} />
          <meshStandardMaterial color={FRAME_COLOR} metalness={0.7} roughness={0.2} />
        </mesh>
      )}

      {archType === "semicircular" &&
        Array.from({ length: bayCount }, (_, index) => {
          const zCenter = -width / 2 + bayWidthM / 2 + index * bayWidthM;
          const apex = eaveHeight + bayWidthM / 2;
          return (
            <mesh key={`ridge-${index}`} position={[0, apex, zCenter]}>
              <boxGeometry args={[length, 0.06, 0.06]} />
              <meshStandardMaterial color={FRAME_COLOR} metalness={0.7} roughness={0.2} />
            </mesh>
          );
        })}
    </group>
  );
}
