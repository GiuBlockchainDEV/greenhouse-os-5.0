import { useEffect, useMemo } from "react";
import * as THREE from "three";

import { heatmapFragmentShader, heatmapVertexShader } from "@/components/3d/shaders/heatmapShader";
import {
  computeHeatmapStats,
  matrixValueAt,
  type HeatmapValueMode,
} from "@/lib/heatmapData";
import type { HeatmapSurfaceKind } from "@/lib/equipmentAwareHeatmap";
import { resolveHeatmapField } from "@/lib/previewMicroclimate";
import { useGreenhouseStore } from "@/store/useGreenhouseStore";

export function buildHeatmapTexture(
  matrix: number[][],
  mode: HeatmapValueMode,
  internalRh: number,
): { texture: THREE.DataTexture; min: number; max: number } {
  const rows = matrix.length;
  const cols = rows > 0 ? (matrix[0]?.length ?? 0) : 0;
  const stats = computeHeatmapStats(matrix, mode, internalRh);

  if (rows === 0 || cols === 0) {
    const fallback = new THREE.DataTexture(new Float32Array([25]), 1, 1, THREE.RedFormat, THREE.FloatType);
    fallback.needsUpdate = true;
    return { texture: fallback, min: stats.min, max: stats.max };
  }

  const values: number[] = [];
  for (let col = 0; col < cols; col++) {
    for (let row = 0; row < rows; row++) {
      values.push(matrixValueAt(matrix, mode, internalRh, row, col));
    }
  }

  const data = new Float32Array(values);
  const texture = new THREE.DataTexture(data, rows, cols, THREE.RedFormat, THREE.FloatType);
  texture.minFilter = THREE.LinearFilter;
  texture.magFilter = THREE.LinearFilter;
  texture.flipY = true;
  texture.needsUpdate = true;

  return { texture, min: stats.min, max: stats.max };
}

interface HeatmapSurfaceProps {
  matrix: number[][];
  mode: HeatmapValueMode;
  internalRh: number;
  colorMode: number;
  position: [number, number, number];
  rotation: [number, number, number];
  planeSize: [number, number];
}

function HeatmapSurface({
  matrix,
  mode,
  internalRh,
  colorMode,
  position,
  rotation,
  planeSize,
}: HeatmapSurfaceProps) {
  const shaderData = useMemo(
    () => buildHeatmapTexture(matrix, mode, internalRh),
    [matrix, mode, internalRh],
  );

  useEffect(() => {
    return () => {
      shaderData.texture.dispose();
    };
  }, [shaderData]);

  const uniforms = useMemo(
    () => ({
      heatmapTexture: { value: shaderData.texture },
      opacity: { value: 0.92 },
      colorMode: { value: colorMode },
      minValue: { value: shaderData.min },
      maxValue: { value: shaderData.max },
    }),
    [shaderData, colorMode],
  );

  const segmentsU = Math.max(matrix.length - 1, 1);
  const segmentsV = Math.max((matrix[0]?.length ?? 1) - 1, 1);

  return (
    <mesh position={position} rotation={rotation} renderOrder={12}>
      <planeGeometry args={[planeSize[0], planeSize[1], segmentsU, segmentsV]} />
      <shaderMaterial
        vertexShader={heatmapVertexShader}
        fragmentShader={heatmapFragmentShader}
        uniforms={uniforms}
        transparent
        depthWrite={false}
        side={THREE.DoubleSide}
        polygonOffset
        polygonOffsetFactor={-2}
        polygonOffsetUnits={-2}
      />
    </mesh>
  );
}

const SURFACE_LAYOUT: Record<
  HeatmapSurfaceKind,
  (d: { length: number; width: number; eaveHeight: number; ridgeHeight: number }) => {
    position: [number, number, number];
    rotation: [number, number, number];
    planeSize: [number, number];
  }
> = {
  floor: ({ length, width }) => ({
    position: [0, 0.2, 0],
    rotation: [-Math.PI / 2, 0, 0],
    planeSize: [length, width],
  }),
  roof: ({ length, width, ridgeHeight }) => ({
    position: [0, ridgeHeight - 0.12, 0],
    rotation: [-Math.PI / 2, 0, 0],
    planeSize: [length, width],
  }),
  wall_west: ({ length, width, eaveHeight }) => ({
    position: [-length / 2 + 0.08, eaveHeight / 2, 0],
    rotation: [0, Math.PI / 2, 0],
    planeSize: [width, eaveHeight],
  }),
  wall_east: ({ length, width, eaveHeight }) => ({
    position: [length / 2 - 0.08, eaveHeight / 2, 0],
    rotation: [0, -Math.PI / 2, 0],
    planeSize: [width, eaveHeight],
  }),
  wall_north: ({ length, width, eaveHeight }) => ({
    position: [0, eaveHeight / 2, -width / 2 + 0.08],
    rotation: [0, 0, 0],
    planeSize: [length, eaveHeight],
  }),
  wall_south: ({ length, width, eaveHeight }) => ({
    position: [0, eaveHeight / 2, width / 2 - 0.08],
    rotation: [0, Math.PI, 0],
    planeSize: [length, eaveHeight],
  }),
};

export function HeatmapPlane() {
  const heatmapMode = useGreenhouseStore((s) => s.heatmapMode);
  const dimensions = useGreenhouseStore((s) => s.dimensions);
  const structure = useGreenhouseStore((s) => s.structure);
  const simulationResults = useGreenhouseStore((s) => s.simulationResults);
  const climateScenario = useGreenhouseStore((s) => s.climateScenario);
  const covering = useGreenhouseStore((s) => s.covering);
  const climateEquipment = useGreenhouseStore((s) => s.climateEquipment);
  const crop = useGreenhouseStore((s) => s.crop);

  const field = useMemo(
    () =>
      resolveHeatmapField(
        dimensions,
        structure,
        climateEquipment,
        crop,
        covering,
        climateScenario,
        simulationResults,
      ),
    [
      dimensions,
      structure,
      climateEquipment,
      crop,
      covering,
      climateScenario,
      simulationResults,
    ],
  );

  const valueMode: HeatmapValueMode = heatmapMode === "vpd" ? "vpd" : "temperature";
  const colorMode = heatmapMode === "vpd" ? 1 : 0;

  if (heatmapMode === "off") {
    return null;
  }

  const geom = {
    length: dimensions.length,
    width: dimensions.width,
    eaveHeight: dimensions.eaveHeight,
    ridgeHeight: dimensions.ridgeHeight,
  };

  return (
    <group>
      {(Object.keys(SURFACE_LAYOUT) as HeatmapSurfaceKind[]).map((surfaceKind) => {
        const layout = SURFACE_LAYOUT[surfaceKind](geom);
        return (
          <HeatmapSurface
            key={surfaceKind}
            matrix={field.surfaces[surfaceKind]}
            mode={valueMode}
            internalRh={field.internalRh}
            colorMode={colorMode}
            position={layout.position}
            rotation={layout.rotation}
            planeSize={layout.planeSize}
          />
        );
      })}
    </group>
  );
}
