import { useEffect, useMemo } from "react";
import * as THREE from "three";

import {
  HEATMAP_OVERLAY_OPACITY,
  HEATMAP_SURFACE_RENDER_ORDER,
  heatmapSurfaceLayout,
} from "@/components/3d/heatmapOverlayConfig";
import { heatmapFragmentShader, heatmapVertexShader } from "@/components/3d/shaders/heatmapShader";
import {
  computeHeatmapVisualRange,
  heatmapColorMode,
  matrixValueAt,
  type HeatmapClimatePreview,
  type HeatmapSurfaceValues,
  type HeatmapValueMode,
} from "@/lib/heatmapData";
import { VISIBLE_HEATMAP_SURFACE_KINDS, type HeatmapSurfaceKind } from "@/lib/equipmentAwareHeatmap";
import { heatmapTextureRemap } from "@/lib/heatmapSurfaceUv";
import { greenhouseEnvelope } from "@/lib/greenhouseEnvelope";
import { isHeatmapAvailable } from "@/lib/heatmapInfluence";
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
  surfaceKind: HeatmapSurfaceKind,
): { texture: THREE.DataTexture; min: number; max: number } {
  const rows = surface.temperature.length;
  const cols = rows > 0 ? (surface.temperature[0]?.length ?? 0) : 0;
  const displayRange = computeHeatmapVisualRange(surface, mode, preview);

  if (rows === 0 || cols === 0) {
    const fallback = new THREE.DataTexture(new Uint8Array([128]), 1, 1, THREE.RedFormat, THREE.UnsignedByteType);
    fallback.needsUpdate = true;
    return { texture: fallback, min: displayRange.min, max: displayRange.max };
  }

  const { flipRow, flipCol } = heatmapTextureRemap(surfaceKind);

  const range = Math.max(displayRange.max - displayRange.min, 0.001);
  const values = new Uint8Array(rows * cols);
  for (let row = 0; row < rows; row++) {
    const texRow = flipRow ? rows - 1 - row : row;
    for (let col = 0; col < cols; col++) {
      const texCol = flipCol ? cols - 1 - col : col;
      const raw = matrixValueAt(surface, mode, preview.internalRh, row, col);
      const normalized = Math.min(1, Math.max(0, (raw - displayRange.min) / range));
      values[texCol * rows + texRow] = Math.round(normalized * 255);
    }
  }

  const texture = new THREE.DataTexture(values, rows, cols, THREE.RedFormat, THREE.UnsignedByteType);
  texture.minFilter = THREE.LinearFilter;
  texture.magFilter = THREE.LinearFilter;
  texture.flipY = true;
  texture.needsUpdate = true;

  return { texture, min: displayRange.min, max: displayRange.max };
}

interface HeatmapSurfaceProps {
  surfaceKind: HeatmapSurfaceKind;
  surface: HeatmapSurfaceValues;
  mode: HeatmapValueMode;
  preview: HeatmapClimatePreview;
  colorMode: number;
  position: [number, number, number];
  rotation: [number, number, number];
  planeSize: [number, number];
}

function HeatmapSurface({
  surfaceKind,
  surface,
  mode,
  preview,
  colorMode,
  position,
  rotation,
  planeSize,
}: HeatmapSurfaceProps) {
  const surfaceKey = surfaceKind;
  const shaderData = useMemo(
    () => buildHeatmapTexture(surface, mode, preview, surfaceKind),
    [surface, mode, preview, surfaceKind],
  );

  useEffect(() => {
    return () => {
      shaderData.texture.dispose();
    };
  }, [shaderData]);

  const segmentsU = Math.max(surface.temperature.length - 1, 1);
  const segmentsV = Math.max((surface.temperature[0]?.length ?? 1) - 1, 1);
  const renderOrder = HEATMAP_SURFACE_RENDER_ORDER[surfaceKind];

  return (
    <mesh
      key={surfaceKey}
      position={position}
      rotation={rotation}
      renderOrder={renderOrder}
      frustumCulled={false}
    >
      <planeGeometry args={[planeSize[0], planeSize[1], segmentsU, segmentsV]} />
      <shaderMaterial
        attach="material"
        key={`${surfaceKey}-mat-${mode}`}
        vertexShader={heatmapVertexShader}
        fragmentShader={heatmapFragmentShader}
        uniforms={{
          heatmapTexture: { value: shaderData.texture },
          opacity: { value: HEATMAP_OVERLAY_OPACITY },
          colorMode: { value: colorMode },
          minValue: { value: 0 },
          maxValue: { value: 1 },
        }}
        transparent
        depthWrite={false}
        depthTest={false}
        blending={THREE.NormalBlending}
        side={THREE.DoubleSide}
      />
    </mesh>
  );
}

const VISIBLE_HEATMAP_SURFACES = VISIBLE_HEATMAP_SURFACE_KINDS;

export function HeatmapPlane() {
  const heatmapMode = useGreenhouseStore((s) => s.heatmapMode);
  const dimensions = useGreenhouseStore((s) => s.dimensions);
  const structure = useGreenhouseStore((s) => s.structure);
  const climateScenario = useGreenhouseStore((s) => s.climateScenario);
  const covering = useGreenhouseStore((s) => s.covering);
  const shadingScreen = useGreenhouseStore((s) => s.shadingScreen);
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
        shadingScreen,
        climateScenario,
      ),
    [dimensions, structure, climateEquipment, crop, covering, shadingScreen, climateScenario],
  );

  const field = useMemo(
    () =>
      resolveHeatmapField(
        dimensions,
        structure,
        climateEquipment,
        crop,
        covering,
        shadingScreen,
        climateScenario,
        simulationResults,
      ),
    [dimensions, structure, climateEquipment, crop, covering, shadingScreen, climateScenario, simulationResults, revision],
  );

  const valueMode = heatmapValueMode(heatmapMode);
  const colorMode = heatmapColorMode(valueMode);

  if (
    heatmapMode === "off" ||
    !isHeatmapAvailable(climateEquipment.cooling, climateEquipment.heating)
  ) {
    return null;
  }

  const { length, width } = greenhouseEnvelope(structure, dimensions);

  const geom = {
    length,
    width,
    eaveHeight: dimensions.eaveHeight,
    ridgeHeight: dimensions.ridgeHeight,
  };

  return (
    <group renderOrder={28}>
      {VISIBLE_HEATMAP_SURFACES.map((surfaceKind) => {
        const layout = heatmapSurfaceLayout(surfaceKind, geom);
        return (
          <HeatmapSurface
            key={`${surfaceKind}-${revision}-${valueMode}`}
            surfaceKind={surfaceKind}
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
