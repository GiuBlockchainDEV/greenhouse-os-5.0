import { useEffect, useMemo } from "react";
import * as THREE from "three";

import { heatmapFragmentShader, heatmapVertexShader } from "@/components/3d/shaders/heatmapShader";
import {
  computeHeatmapStats,
  matrixValueAt,
  type HeatmapValueMode,
} from "@/lib/heatmapData";
import { resolveHeatmapInputs } from "@/lib/previewMicroclimate";
import { useGreenhouseStore } from "@/store/useGreenhouseStore";

function buildHeatmapTexture(
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

  // Texture U = length (rows), texture V = width (cols) to match plane UV mapping.
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

export function HeatmapPlane() {
  const heatmapMode = useGreenhouseStore((s) => s.heatmapMode);
  const dimensions = useGreenhouseStore((s) => s.dimensions);
  const simulationResults = useGreenhouseStore((s) => s.simulationResults);
  const climateScenario = useGreenhouseStore((s) => s.climateScenario);
  const covering = useGreenhouseStore((s) => s.covering);
  const climateEquipment = useGreenhouseStore((s) => s.climateEquipment);

  const { length, width } = dimensions;

  const heatmapSource = useMemo(
    () =>
      resolveHeatmapInputs(
        length,
        width,
        simulationResults,
        climateScenario,
        covering,
        climateEquipment,
      ),
    [length, width, simulationResults, climateScenario, covering, climateEquipment],
  );

  const valueMode: HeatmapValueMode = heatmapMode === "vpd" ? "vpd" : "temperature";

  const shaderData = useMemo(() => {
    if (heatmapMode === "off") {
      return null;
    }
    return buildHeatmapTexture(heatmapSource.matrix, valueMode, heatmapSource.internalRh);
  }, [heatmapMode, heatmapSource, valueMode]);

  useEffect(() => {
    return () => {
      shaderData?.texture.dispose();
    };
  }, [shaderData]);

  const uniforms = useMemo(() => {
    if (!shaderData) {
      return null;
    }
    return {
      heatmapTexture: { value: shaderData.texture },
      opacity: { value: 0.94 },
      colorMode: { value: heatmapMode === "vpd" ? 1 : 0 },
      minValue: { value: shaderData.min },
      maxValue: { value: shaderData.max },
    };
  }, [shaderData, heatmapMode]);

  const segmentsX = Math.max(heatmapSource.matrix.length - 1, 1);
  const segmentsZ = Math.max((heatmapSource.matrix[0]?.length ?? 1) - 1, 1);

  if (heatmapMode === "off" || !shaderData || !uniforms) {
    return null;
  }

  return (
    <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, 0.18, 0]} renderOrder={10}>
      <planeGeometry args={[length, width, segmentsX, segmentsZ]} />
      <shaderMaterial
        vertexShader={heatmapVertexShader}
        fragmentShader={heatmapFragmentShader}
        uniforms={uniforms}
        transparent
        depthWrite={false}
        polygonOffset
        polygonOffsetFactor={-2}
        polygonOffsetUnits={-2}
      />
    </mesh>
  );
}
