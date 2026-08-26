import { useEffect, useMemo } from "react";
import * as THREE from "three";

import { heatmapFragmentShader, heatmapVertexShader } from "@/components/3d/shaders/heatmapShader";
import { generateFallbackHeatmap } from "@/lib/heatmapFallback";
import { useGreenhouseStore } from "@/store/useGreenhouseStore";

const SATURATION_VPOR_PRESSURE = (tempC: number): number =>
  0.6108 * Math.exp((17.27 * tempC) / (tempC + 237.3));

function buildHeatmapTexture(
  matrix: number[][],
  mode: "temperature" | "vpd",
  internalRh: number,
): { texture: THREE.DataTexture; min: number; max: number } {
  const rows = matrix.length;
  const cols = rows > 0 ? (matrix[0]?.length ?? 0) : 0;

  if (rows === 0 || cols === 0) {
    const fallback = new THREE.DataTexture(new Float32Array([25]), 1, 1, THREE.RedFormat, THREE.FloatType);
    fallback.needsUpdate = true;
    return { texture: fallback, min: 20, max: 30 };
  }

  const values: number[] = [];
  for (let row = 0; row < rows; row++) {
    for (let col = 0; col < cols; col++) {
      const temp = matrix[row]?.[col] ?? 25;
      if (mode === "vpd") {
        const es = SATURATION_VPOR_PRESSURE(temp);
        const ea = es * (internalRh / 100);
        values.push(Math.max(0, es - ea));
      } else {
        values.push(temp);
      }
    }
  }

  const min = Math.min(...values);
  const max = Math.max(...values);
  const data = new Float32Array(values);

  const texture = new THREE.DataTexture(data, cols, rows, THREE.RedFormat, THREE.FloatType);
  texture.minFilter = THREE.LinearFilter;
  texture.magFilter = THREE.LinearFilter;
  texture.flipY = true;
  texture.needsUpdate = true;

  return { texture, min, max };
}

export function HeatmapPlane() {
  const heatmapMode = useGreenhouseStore((s) => s.heatmapMode);
  const dimensions = useGreenhouseStore((s) => s.dimensions);
  const simulationResults = useGreenhouseStore((s) => s.simulationResults);

  const { length, width } = dimensions;
  const micro = simulationResults?.microclimate;
  const thermal = simulationResults?.thermal_balance;

  const internalTemp = micro?.internal_temp ?? 24;
  const externalTemp = micro?.external_temp ?? 18;
  const internalRh = micro?.internal_rh ?? 70;
  const qSolar = thermal?.q_solar ?? 220;

  const matrix = useMemo(() => {
    const liveMatrix = simulationResults?.heatmap_matrix;
    if (liveMatrix && liveMatrix.length > 0) {
      return liveMatrix;
    }
    return generateFallbackHeatmap(length, width, internalTemp, externalTemp, qSolar);
  }, [simulationResults?.heatmap_matrix, length, width, internalTemp, externalTemp, qSolar]);

  const shaderData = useMemo(() => {
    if (heatmapMode === "off") {
      return null;
    }
    const mode = heatmapMode === "vpd" ? "vpd" : "temperature";
    return buildHeatmapTexture(matrix, mode, internalRh);
  }, [heatmapMode, matrix, internalRh]);

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
      opacity: { value: 0.88 },
      colorMode: { value: heatmapMode === "vpd" ? 1 : 0 },
      minValue: { value: shaderData.min },
      maxValue: { value: shaderData.max },
    };
  }, [shaderData, heatmapMode]);

  if (heatmapMode === "off" || !shaderData || !uniforms) {
    return null;
  }

  return (
    <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, 0.12, 0]} renderOrder={5}>
      <planeGeometry args={[length, width, 1, 1]} />
      <shaderMaterial
        vertexShader={heatmapVertexShader}
        fragmentShader={heatmapFragmentShader}
        uniforms={uniforms}
        transparent
        depthWrite={false}
        polygonOffset
        polygonOffsetFactor={-1}
        polygonOffsetUnits={-1}
      />
    </mesh>
  );
}
