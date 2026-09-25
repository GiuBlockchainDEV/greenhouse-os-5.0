import { useMemo } from "react";
import * as THREE from "three";

import { claddingLook, ALUMINUM } from "@/components/3d/claddingMaterials";
import { ExhaustGableWall } from "@/components/3d/ExhaustGableWall";
import { GreenhouseFrame } from "@/components/3d/GreenhouseFrame";
import {
  bayApexHeight,
  bayCenterZ,
  expandBayArchTypes,
  roofRiseM,
} from "@/lib/structureUtils";
import { isHeatmapAvailable } from "@/lib/heatmapInfluence";
import { useGreenhouseStore } from "@/store/useGreenhouseStore";
import type { ArchType, CoveringMaterial } from "@/types/greenhouse";

function createTriangularBayRoof(
  length: number,
  bayWidth: number,
  eaveHeight: number,
  ridgeHeight: number,
  zCenter: number,
): THREE.BufferGeometry {
  const halfLength = length / 2;
  const halfBay = bayWidth / 2;

  const vertices = new Float32Array([
    -halfLength, eaveHeight, zCenter - halfBay,
    halfLength, eaveHeight, zCenter - halfBay,
    halfLength, ridgeHeight, zCenter,
    -halfLength, ridgeHeight, zCenter,
    -halfLength, eaveHeight, zCenter + halfBay,
    halfLength, eaveHeight, zCenter + halfBay,
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
  ridgeHeight: number,
  zCenter: number,
  segments = 24,
): THREE.BufferGeometry {
  const rise = roofRiseM(eaveHeight, ridgeHeight);
  const halfBay = bayWidth / 2;
  const halfLength = length / 2;
  const positions: number[] = [];
  const indices: number[] = [];

  for (let row = 0; row <= 1; row++) {
    const x = row === 0 ? -halfLength : halfLength;
    for (let seg = 0; seg <= segments; seg++) {
      const theta = (Math.PI * seg) / segments;
      const z = zCenter + halfBay * Math.cos(theta);
      const y = eaveHeight + rise * Math.sin(theta);
      positions.push(x, y, z);
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

interface BayRoofProps {
  length: number;
  bayWidth: number;
  eaveHeight: number;
  ridgeHeight: number;
  zCenter: number;
  archType: ArchType;
  coveringType: CoveringMaterial["type"];
  heatmapActive: boolean;
}

function BayRoof({
  length,
  bayWidth,
  eaveHeight,
  ridgeHeight,
  zCenter,
  archType,
  coveringType,
  heatmapActive,
}: BayRoofProps) {
  const geometry = useMemo(() => {
    if (archType === "semicircular") {
      return createSemicircularBayRoof(length, bayWidth, eaveHeight, ridgeHeight, zCenter);
    }
    return createTriangularBayRoof(length, bayWidth, eaveHeight, ridgeHeight, zCenter);
  }, [archType, bayWidth, eaveHeight, length, ridgeHeight, zCenter]);

  const apex = bayApexHeight(archType, eaveHeight, ridgeHeight, bayWidth);
  const glass = claddingLook(coveringType, heatmapActive);

  return (
    <group>
      <mesh geometry={geometry} castShadow renderOrder={heatmapActive ? 0 : 1}>
        <meshPhysicalMaterial
          color={glass.color}
          transparent
          opacity={glass.opacity}
          roughness={glass.roughness}
          metalness={0}
          transmission={glass.transmission}
          thickness={glass.thickness}
          ior={glass.ior}
          clearcoat={glass.clearcoat}
          clearcoatRoughness={glass.clearcoatRoughness}
          envMapIntensity={1.15}
          depthWrite={glass.depthWrite}
          side={THREE.DoubleSide}
        />
      </mesh>
      <mesh position={[0, apex, zCenter]} castShadow>
        <boxGeometry args={[length, 0.07, archType === "semicircular" ? 0.07 : 0.09]} />
        <meshStandardMaterial color={ALUMINUM} metalness={0.84} roughness={0.24} />
      </mesh>
    </group>
  );
}

interface WallGlassProps {
  position: [number, number, number];
  args: [number, number, number];
  coveringType: CoveringMaterial["type"];
  heatmapActive: boolean;
}

function WallGlass({ position, args, coveringType, heatmapActive }: WallGlassProps) {
  const glass = claddingLook(coveringType, heatmapActive);
  return (
    <mesh position={position} castShadow renderOrder={heatmapActive ? 0 : 1}>
      <boxGeometry args={args} />
      <meshPhysicalMaterial
        color={glass.color}
        transparent
        opacity={glass.opacity}
        roughness={glass.roughness}
        metalness={0}
        transmission={glass.transmission}
        thickness={glass.thickness}
        ior={glass.ior}
        clearcoat={glass.clearcoat}
        clearcoatRoughness={glass.clearcoatRoughness}
        envMapIntensity={1.15}
        depthWrite={glass.depthWrite}
        side={THREE.DoubleSide}
      />
    </mesh>
  );
}

export function GreenhouseMesh() {
  const dimensions = useGreenhouseStore((state) => state.dimensions);
  const structure = useGreenhouseStore((state) => state.structure);
  const covering = useGreenhouseStore((state) => state.covering);
  const heatmapMode = useGreenhouseStore((state) => state.heatmapMode);
  const climateEquipment = useGreenhouseStore((state) => state.climateEquipment);
  const cooling = climateEquipment.cooling;
  const { length, width, ridgeHeight, eaveHeight } = dimensions;
  const { bayCount, bayWidthM, archType } = structure;
  const heatmapActive = heatmapMode !== "off" && isHeatmapAvailable(cooling);

  const bays = useMemo(
    () =>
      expandBayArchTypes(bayCount, archType).map((bayArchType, index) => ({
        index,
        archType: bayArchType,
        zCenter: bayCenterZ(index, bayWidthM, width),
      })),
    [archType, bayCount, bayWidthM, width],
  );

  return (
    <group position={[0, 0, 0]}>
      <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, 0.13, 0]} receiveShadow>
        <planeGeometry args={[length, width]} />
        <meshStandardMaterial
          color="#cfc8bc"
          roughness={0.94}
          metalness={0}
          transparent={heatmapActive}
          opacity={heatmapActive ? 0.28 : 1}
        />
      </mesh>

      <GreenhouseFrame
        length={length}
        width={width}
        eaveHeight={eaveHeight}
        ridgeHeight={ridgeHeight}
        bayWidthM={bayWidthM}
        bays={bays}
      />

      <WallGlass
        position={[0, eaveHeight / 2, -width / 2]}
        args={[length, eaveHeight, 0.04]}
        coveringType={covering.type}
        heatmapActive={heatmapActive}
      />
      <WallGlass
        position={[0, eaveHeight / 2, width / 2]}
        args={[length, eaveHeight, 0.04]}
        coveringType={covering.type}
        heatmapActive={heatmapActive}
      />
      <WallGlass
        position={[-length / 2, eaveHeight / 2, 0]}
        args={[0.04, eaveHeight, width]}
        coveringType={covering.type}
        heatmapActive={heatmapActive}
      />
      <ExhaustGableWall
        x={length / 2}
        width={width}
        eaveHeight={eaveHeight}
        dimensions={dimensions}
        structure={structure}
        equipment={climateEquipment}
        coveringType={covering.type}
        heatmapActive={heatmapActive}
      />

      {bays.map((bay) => (
        <BayRoof
          key={`bay-roof-${bay.index}`}
          length={length}
          bayWidth={bayWidthM}
          eaveHeight={eaveHeight}
          ridgeHeight={ridgeHeight}
          zCenter={bay.zCenter}
          archType={bay.archType}
          coveringType={covering.type}
          heatmapActive={heatmapActive}
        />
      ))}
    </group>
  );
}
