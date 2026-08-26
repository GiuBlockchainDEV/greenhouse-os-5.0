import { useEffect, useMemo } from "react";
import * as THREE from "three";

import { heatmapFragmentShader, heatmapVertexShader } from "@/components/3d/shaders/heatmapShader";
import {
  computeHeatmapDisplayRange,
  heatmapColorMode,
  matrixValueAt,
  type HeatmapClimatePreview,
  type HeatmapSurfaceValues,
  type HeatmapValueMode,
} from "@/lib/heatmapData";
import type { HeatmapSurfaceKind } from "@/lib/equipmentAwareHeatmap";
import { heatmapInputRevision } from "@/lib/heatmapRevision";
import { resolveHeatmapField } from "@/lib/previewMicroclimate";
import { useGreenhouseStore } from "@/store/useGreenhouseStore";
import type { HeatmapMode } from "@/types/viewport";

function heatmapValueMode(mode: HeatmapMode): HeatmapValueMode {
  if (mode === "off") return "temperature";
  return mode;
}

function buildHeatmapTexture(
  surface: HeatmapSurfaceValues,
  mode: HeatmapValueMode,
  preview: HeatmapClimatePreview,
): { texture: THREE.DataTexture; min: number; max: number } {
  const rows = surface.temperature.length;
  const cols = rows > 0 ? (surface.temperature[0]?.length ?? 0) : 0;
  const displayRange = computeHeatmapDisplayRange(mode);

  if (rows === 0 || cols === 0) {
    const fallback = new THREE.DataTexture(new Float32Array([25]), 1, 1, THREE.RedFormat, THREE.FloatType);
    fallback.needsUpdate = true;
    return { texture: fallback, min: displayRange.min, max: displayRange.max };
  }

  const values: number[] = [];
  for (let col = 0; col < cols; col++) {
    for (let row = 0; row < rows; row++) {
      values.push(matrixValueAt(surface, mode, preview.internalRh, row, col));
    }
  }

  const data = new Float32Array(values);
  const texture = new THREE.DataTexture(data, rows, cols, THREE.RedFormat, THREE.FloatType);
  texture.minFilter = THREE.LinearFilter;
  texture.magFilter = THREE.LinearFilter;
  texture.flipY = true;
  texture.needsUpdate = true;

  return { texture, min: displayRange.min, max: displayRange.max };
}

interface HeatmapSurfaceProps {
  surfaceKey: string;
  surface: HeatmapSurfaceValues;
  mode: HeatmapValueMode;
  preview: HeatmapClimatePreview;
  colorMode: number;
  position: [number, number, number];
  rotation: [number, number, number];
  planeSize: [number, number];
}

function HeatmapSurface({
  surfaceKey,
  surface,
  mode,
  preview,
  colorMode,
  position,
  rotation,
  planeSize,
}: HeatmapSurfaceProps) {
  const shaderData = useMemo(
    () => buildHeatmapTexture(surface, mode, preview),
    [surface, mode, preview, surfaceKey],
  );

  useEffect(() => {
    return () => {
      shaderData.texture.dispose();
    };
  }, [shaderData]);

  const segmentsU = Math.max(surface.temperature.length - 1, 1);
  const segmentsV = Math.max((surface.temperature[0]?.length ?? 1) - 1, 1);

  return (
    <mesh key={surfaceKey} position={position} rotation={rotation} renderOrder={25}>
      <planeGeometry args={[planeSize[0], planeSize[1], segmentsU, segmentsV]} />
      <shaderMaterial
        attach="material"
        key={`${surfaceKey}-mat-${mode}`}
        vertexShader={heatmapVertexShader}
        fragmentShader={heatmapFragmentShader}
        uniforms={{
          heatmapTexture: { value: shaderData.texture },
          opacity: { value: 0.96 },
          colorMode: { value: colorMode },
          minValue: { value: shaderData.min },
          maxValue: { value: shaderData.max },
        }}
        transparent
        depthWrite={false}
        depthTest={true}
        side={THREE.DoubleSide}
        polygonOffset
        polygonOffsetFactor={-4}
        polygonOffsetUnits={-4}
      />
    </mesh>
  );
}

const VISIBLE_HEATMAP_SURFACES: Exclude<HeatmapSurfaceKind, "roof">[] = [
  "floor",
  "wall_west",
  "wall_east",
  "wall_north",
  "wall_south",
];

const SURFACE_LAYOUT: Record<
  (typeof VISIBLE_HEATMAP_SURFACES)[number],
  (d: { length: number; width: number; eaveHeight: number; ridgeHeight: number }) => {
    position: [number, number, number];
    rotation: [number, number, number];
    planeSize: [number, number];
  }
> = {
  floor: ({ length, width }) => ({
    position: [0, 0.22, 0],
    rotation: [-Math.PI / 2, 0, 0],
    planeSize: [length * 0.98, width * 0.98],
  }),
  wall_west: ({ length, width, eaveHeight }) => ({
    position: [-length / 2 + 0.045, eaveHeight / 2, 0],
    rotation: [0, Math.PI / 2, 0],
    planeSize: [width * 0.98, eaveHeight * 0.98],
  }),
  wall_east: ({ length, width, eaveHeight }) => ({
    position: [length / 2 - 0.045, eaveHeight / 2, 0],
    rotation: [0, -Math.PI / 2, 0],
    planeSize: [width * 0.98, eaveHeight * 0.98],
  }),
  wall_north: ({ length, width, eaveHeight }) => ({
    position: [0, eaveHeight / 2, -width / 2 + 0.045],
    rotation: [0, 0, 0],
    planeSize: [length * 0.98, eaveHeight * 0.98],
  }),
  wall_south: ({ length, width, eaveHeight }) => ({
    position: [0, eaveHeight / 2, width / 2 - 0.045],
    rotation: [0, Math.PI, 0],
    planeSize: [length * 0.98, eaveHeight * 0.98],
  }),
};

export function HeatmapPlane() {
  const heatmapMode = useGreenhouseStore((s) => s.heatmapMode);
  const dimensions = useGreenhouseStore((s) => s.dimensions);
  const structure = useGreenhouseStore((s) => s.structure);
  const climateScenario = useGreenhouseStore((s) => s.climateScenario);
  const covering = useGreenhouseStore((s) => s.covering);
  const climateEquipment = useGreenhouseStore((s) => s.climateEquipment);
  const crop = useGreenhouseStore((s) => s.crop);
  const simulationResults = useGreenhouseStore((s) => s.simulationResults);

  const revision = useMemo(
    () =>
      heatmapInputRevision(
        dimensions,
        structure,
        climateEquipment,
        crop,
        covering,
        climateScenario,
      ),
    [dimensions, structure, climateEquipment, crop, covering, climateScenario],
  );

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
    [dimensions, structure, climateEquipment, crop, covering, climateScenario, simulationResults, revision],
  );

  const valueMode = heatmapValueMode(heatmapMode);
  const colorMode = heatmapColorMode(valueMode);

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
    <group renderOrder={25}>
      {VISIBLE_HEATMAP_SURFACES.map((surfaceKind) => {
        const layout = SURFACE_LAYOUT[surfaceKind](geom);
        return (
          <HeatmapSurface
            key={`${surfaceKind}-${revision}-${valueMode}`}
            surfaceKey={`${surfaceKind}-${revision}-${valueMode}`}
            surface={field.surfaces[surfaceKind]}
            mode={valueMode}
            preview={field.preview}
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
