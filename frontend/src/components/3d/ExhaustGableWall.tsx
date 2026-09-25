import { useMemo } from "react";
import * as THREE from "three";

import { claddingLook } from "@/components/3d/claddingMaterials";
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

/** East gable glazing with empty openings at each exhaust fan (no infill — the GLB sits in the hole). */
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

  const cutouts = useMemo(
    () =>
      layout.exhaustFans.map((fan) => {
        const span = fan.diameterM + 0.28;
        return {
          zMin: fan.z - span / 2,
          zMax: fan.z + span / 2,
          yMin: fan.y - span / 2,
          yMax: fan.y + span / 2,
        };
      }),
    [layout.exhaustFans],
  );

  const segments = useMemo(() => {
    const full: Rect = { zMin: -width / 2, zMax: width / 2, yMin: 0, yMax: eaveHeight };
    if (cutouts.length === 0) return [full];
    return glassSegments(full, cutouts);
  }, [cutouts, width, eaveHeight]);

  const glass = claddingLook(coveringType, heatmapActive);

  if (cutouts.length === 0) {
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
    </group>
  );
}
