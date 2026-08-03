import { useEffect, useMemo } from "react";
import { useFrame } from "@react-three/fiber";
import * as THREE from "three";

import { heatmapFragmentShader, heatmapVertexShader } from "@/components/3d/shaders/heatmapShader";
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
  texture.needsUpdate = true;

  return { texture, min, max };
}

export function HeatmapPlane() {
  const heatmapMode = useGreenhouseStore((s) => s.heatmapMode);
  const dimensions = useGreenhouseStore((s) => s.dimensions);
  const simulationResults = useGreenhouseStore((s) => s.simulationResults);

  const { length, width } = dimensions;
  const matrix = simulationResults?.heatmap_matrix;
  const internalRh = simulationResults?.microclimate.internal_rh ?? 70;

  const shaderData = useMemo(() => {
    if (heatmapMode === "off" || !matrix || matrix.length === 0) {
      return null;
    }
    const mode = heatmapMode === "vpd" ? "vpd" : "temperature";
    return buildHeatmapTexture(matrix, mode, internalRh);
  }, [heatmapMode, matrix, internalRh]);

  const uniforms = useMemo(
    () => ({
      heatmapTexture: { value: new THREE.DataTexture() },
      opacity: { value: 0.75 },
      colorMode: { value: heatmapMode === "vpd" ? 1 : 0 },
      minValue: { value: 20 },
      maxValue: { value: 35 },
    }),
    [heatmapMode],
  );

  useFrame(() => {
    if (!shaderData) return;
    uniforms.heatmapTexture.value = shaderData.texture;
    uniforms.minValue.value = shaderData.min;
    uniforms.maxValue.value = shaderData.max;
    uniforms.colorMode.value = heatmapMode === "vpd" ? 1 : 0;
  });

  useEffect(() => {
    return () => {
      shaderData?.texture.dispose();
    };
  }, [shaderData]);

  if (heatmapMode === "off" || !shaderData) {
    return null;
  }

  return (
    <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, 0.05, 0]}>
      <planeGeometry args={[length, width, 1, 1]} />
      <shaderMaterial
        vertexShader={heatmapVertexShader}
        fragmentShader={heatmapFragmentShader}
        uniforms={uniforms}
        transparent
        depthWrite={false}
      />
    </mesh>
  );
}
