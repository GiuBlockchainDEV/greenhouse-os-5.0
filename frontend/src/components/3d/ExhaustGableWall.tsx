import { useMemo } from "react";
import * as THREE from "three";

import { ALUMINUM, claddingLook } from "@/components/3d/claddingMaterials";
import { computeClimateEquipmentLayout } from "@/lib/climateEquipmentLayout";
import type { ClimateEquipment, CoveringMaterial, GreenhouseDimensions, GreenhouseStructure } from "@/types/greenhouse";

interface Rect {
  zMin: number;
  zMax: number;
  yMin: number;
  yMax: number;
}

function subtractRect(base: Rect, cut: Rect): Rect[] {
  const ixMin = Math.max(base.zMin, cut.zMin);
  const ixMax = Math.min(base.zMax, cut.zMax);
  const iyMin = Math.max(base.yMin, cut.yMin);
  const iyMax = Math.min(base.yMax, cut.yMax);
  if (ixMin >= ixMax || iyMin >= iyMax) {
    return [base];
  }
  const out: Rect[] = [];
  if (base.yMax > iyMax) {
    out.push({ zMin: base.zMin, zMax: base.zMax, yMin: iyMax, yMax: base.yMax });
  }
  if (base.yMin < iyMin) {
    out.push({ zMin: base.zMin, zMax: base.zMax, yMin: base.yMin, yMax: iyMin });
  }
  const midYMin = Math.max(base.yMin, iyMin);
  const midYMax = Math.min(base.yMax, iyMax);
  if (base.zMin < ixMin) {
    out.push({ zMin: base.zMin, zMax: ixMin, yMin: midYMin, yMax: midYMax });
  }
  if (base.zMax > ixMax) {
    out.push({ zMin: ixMax, zMax: base.zMax, yMin: midYMin, yMax: midYMax });
  }
  return out.filter((r) => r.zMax - r.zMin > 0.02 && r.yMax - r.yMin > 0.02);
}

function glassSegments(full: Rect, cuts: Rect[]): Rect[] {
  let segments: Rect[] = [full];
  for (const cut of cuts) {
    segments = segments.flatMap((segment) => subtractRect(segment, cut));
  }
  return segments;
}

function createPerforationAlphaMap(repeatX: number, repeatY: number): THREE.CanvasTexture {
  const size = 128;
  const holes = 10;
  const canvas = document.createElement("canvas");
  canvas.width = size;
  canvas.height = size;
  const ctx = canvas.getContext("2d");
  if (!ctx) {
    return new THREE.CanvasTexture(canvas);
  }
  ctx.fillStyle = "#ffffff";
  ctx.fillRect(0, 0, size, size);
  ctx.fillStyle = "#000000";
  const step = size / holes;
  const radius = step * 0.34;
  for (let row = 0; row < holes; row += 1) {
    for (let col = 0; col < holes; col += 1) {
      ctx.beginPath();
      ctx.arc((col + 0.5) * step, (row + 0.5) * step, radius, 0, Math.PI * 2);
      ctx.fill();
    }
  }
  const texture = new THREE.CanvasTexture(canvas);
  texture.wrapS = THREE.RepeatWrapping;
  texture.wrapT = THREE.RepeatWrapping;
  texture.repeat.set(repeatX, repeatY);
  return texture;
}

function PerforatedFanWindow({
  x,
  y,
  z,
  widthM,
  heightM,
}: {
  x: number;
  y: number;
  z: number;
  widthM: number;
  heightM: number;
}) {
  const alphaMap = useMemo(
    () =>
      createPerforationAlphaMap(
        Math.max(2, widthM / 0.14),
        Math.max(2, heightM / 0.14),
      ),
    [heightM, widthM],
  );

  return (
    <group position={[x, y, z]}>
      <mesh position={[0.022, 0, 0]}>
        <boxGeometry args={[0.05, heightM + 0.12, widthM + 0.12]} />
        <meshStandardMaterial color={ALUMINUM} metalness={0.82} roughness={0.28} />
      </mesh>
      <mesh position={[0.04, 0, 0]} rotation={[0, -Math.PI / 2, 0]}>
        <planeGeometry args={[widthM, heightM]} />
        <meshStandardMaterial
          color="#4a5562"
          metalness={0.88}
          roughness={0.38}
          transparent
          alphaMap={alphaMap}
          alphaTest={0.35}
          side={THREE.DoubleSide}
        />
      </mesh>
    </group>
  );
}

interface ExhaustGableWallProps {
  x: number;
  width: number;
  eaveHeight: number;
  dimensions: GreenhouseDimensions;
  structure: GreenhouseStructure;
  equipment: ClimateEquipment;
  coveringType: CoveringMaterial["type"];
  heatmapActive: boolean;
}

/** East gable with cut-outs and perforated metal panels at each exhaust fan. */
export function ExhaustGableWall({
  x,
  width,
  eaveHeight,
  dimensions,
  structure,
  equipment,
  coveringType,
  heatmapActive,
}: ExhaustGableWallProps) {
  const layout = useMemo(
    () => computeClimateEquipmentLayout({ dimensions, structure, equipment }),
    [dimensions, structure, equipment],
  );

  const openings = useMemo(
    () =>
      layout.exhaustFans.map((fan) => {
        const span = fan.diameterM + 0.28;
        return {
          fan,
          rect: {
            zMin: fan.z - span / 2,
            zMax: fan.z + span / 2,
            yMin: fan.y - span / 2,
            yMax: fan.y + span / 2,
          },
          span,
        };
      }),
    [layout.exhaustFans],
  );

  const segments = useMemo(() => {
    const full: Rect = { zMin: -width / 2, zMax: width / 2, yMin: 0, yMax: eaveHeight };
    if (openings.length === 0) return [full];
    return glassSegments(
      full,
      openings.map((item) => item.rect),
    );
  }, [openings, width, eaveHeight]);

  const glass = claddingLook(coveringType, heatmapActive);

  if (openings.length === 0) {
    return (
      <mesh position={[x, eaveHeight / 2, 0]} castShadow renderOrder={heatmapActive ? 0 : 1}>
        <boxGeometry args={[0.04, eaveHeight, width]} />
        <meshPhysicalMaterial
          color={glass.color}
          transparent
          opacity={glass.opacity}
          roughness={glass.roughness}
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

  return (
    <group>
      {segments.map((segment, index) => {
        const w = segment.zMax - segment.zMin;
        const h = segment.yMax - segment.yMin;
        const cz = (segment.zMin + segment.zMax) / 2;
        const cy = (segment.yMin + segment.yMax) / 2;
        return (
          <mesh key={`glass-seg-${index}`} position={[x, cy, cz]} castShadow renderOrder={heatmapActive ? 0 : 1}>
            <boxGeometry args={[0.04, h, w]} />
            <meshPhysicalMaterial
              color={glass.color}
              transparent
              opacity={glass.opacity}
              roughness={glass.roughness}
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
      })}
      {openings.map((item, index) => (
        <PerforatedFanWindow
          key={`fan-window-${index}`}
          x={x}
          y={item.fan.y}
          z={item.fan.z}
          widthM={item.span}
          heightM={item.span}
        />
      ))}
    </group>
  );
}
