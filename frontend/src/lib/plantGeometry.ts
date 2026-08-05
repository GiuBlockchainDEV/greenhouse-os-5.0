/** Procedural 3D plant prototypes per crop type — merged geometry with vertex colors. */

import * as THREE from "three";
import { mergeGeometries } from "three/addons/utils/BufferGeometryUtils.js";

import type { CropType, GrowthStage } from "@/types/greenhouse";

const STEM = new THREE.Color("#5c4033");
const FRUIT_TOMATO = new THREE.Color("#d64541");
const FRUIT_PEPPER = new THREE.Color("#f39c12");
const FRUIT_CUCUMBER = new THREE.Color("#27ae60");
const FRUIT_STRAWBERRY = new THREE.Color("#c0392b");
const LEAF_CANNABIS = new THREE.Color("#558b2f");

const LEAF_COLORS: Record<CropType, THREE.Color> = {
  tomato: new THREE.Color("#2e7d32"),
  cucumber: new THREE.Color("#388e3c"),
  pepper: new THREE.Color("#1b5e20"),
  lettuce: new THREE.Color("#66bb6a"),
  strawberry: new THREE.Color("#43a047"),
  cannabis: new THREE.Color("#689f38"),
};

function withColor(geometry: THREE.BufferGeometry, color: THREE.Color): THREE.BufferGeometry {
  const mesh = geometry.clone();
  const count = mesh.attributes.position.count;
  const colors = new Float32Array(count * 3);
  for (let i = 0; i < count; i++) {
    colors[i * 3] = color.r;
    colors[i * 3 + 1] = color.g;
    colors[i * 3 + 2] = color.b;
  }
  mesh.setAttribute("color", new THREE.BufferAttribute(colors, 3));
  return mesh;
}

function part(
  geometry: THREE.BufferGeometry,
  color: THREE.Color,
  x = 0,
  y = 0,
  z = 0,
  rotX = 0,
  rotY = 0,
  rotZ = 0,
): THREE.BufferGeometry {
  const g = geometry.clone();
  g.rotateX(rotX);
  g.rotateY(rotY);
  g.rotateZ(rotZ);
  g.translate(x, y, z);
  return withColor(g, color);
}

function stem(height: number, color = STEM): THREE.BufferGeometry {
  const geo = new THREE.CylinderGeometry(0.018, 0.028, height, 7);
  geo.translate(0, height / 2, 0);
  return withColor(geo, color);
}

function leafCluster(
  color: THREE.Color,
  radius: number,
  y: number,
  flatten = 0.45,
): THREE.BufferGeometry {
  const geo = new THREE.IcosahedronGeometry(radius, 1);
  geo.scale(1, flatten, 1);
  geo.translate(0, y, 0);
  return withColor(geo, color);
}

function hangingFruit(
  color: THREE.Color,
  x: number,
  y: number,
  z: number,
  size: number,
): THREE.BufferGeometry {
  const geo = new THREE.SphereGeometry(size, 7, 7);
  geo.translate(x, y, z);
  return withColor(geo, color);
}

function showsFruit(stage: GrowthStage): boolean {
  return stage === "generative" || stage === "harvest";
}

function buildVinePlant(
  leafColor: THREE.Color,
  fruitColor: THREE.Color,
  stage: GrowthStage,
  config: { stemH: number; canopyR: number; fruitSize: number; fruitCount: number },
): THREE.BufferGeometry {
  const parts: THREE.BufferGeometry[] = [
    stem(config.stemH),
    leafCluster(leafColor, config.canopyR, config.stemH + config.canopyR * 0.35, 0.55),
  ];

  for (let i = 0; i < 4; i++) {
    const angle = (i / 4) * Math.PI * 2 + 0.4;
    const r = config.canopyR * 0.55;
    const y = config.stemH * 0.55 + (i % 2) * 0.06;
    parts.push(
      part(
        new THREE.SphereGeometry(config.canopyR * 0.42, 6, 5),
        leafColor,
        Math.cos(angle) * r,
        y,
        Math.sin(angle) * r,
        0,
        angle,
        0,
      ),
    );
  }

  if (showsFruit(stage)) {
    for (let i = 0; i < config.fruitCount; i++) {
      const angle = (i / config.fruitCount) * Math.PI * 2 + 0.2;
      parts.push(
        hangingFruit(
          fruitColor,
          Math.cos(angle) * 0.1,
          config.stemH * 0.35 + (i % 3) * 0.07,
          Math.sin(angle) * 0.1,
          config.fruitSize,
        ),
      );
    }
  }

  return mergeGeometries(parts) ?? new THREE.BufferGeometry();
}

function buildLettucePlant(leafColor: THREE.Color): THREE.BufferGeometry {
  const parts: THREE.BufferGeometry[] = [];

  for (let ring = 0; ring < 2; ring++) {
    const count = ring === 0 ? 6 : 10;
    const radius = ring === 0 ? 0.06 : 0.14;
    const y = ring === 0 ? 0.05 : 0.1;
    for (let i = 0; i < count; i++) {
      const angle = (i / count) * Math.PI * 2 + ring * 0.3;
      parts.push(
        part(
          new THREE.SphereGeometry(0.11 - ring * 0.02, 6, 4),
          leafColor,
          Math.cos(angle) * radius,
          y,
          Math.sin(angle) * radius,
          -0.35,
          angle,
          0,
        ),
      );
    }
  }

  parts.push(
    part(new THREE.SphereGeometry(0.07, 6, 4), leafColor, 0, 0.04, 0, -0.2, 0, 0),
  );

  return mergeGeometries(parts) ?? new THREE.BufferGeometry();
}

function buildStrawberryPlant(leafColor: THREE.Color, stage: GrowthStage): THREE.BufferGeometry {
  const parts: THREE.BufferGeometry[] = [];

  for (let i = 0; i < 7; i++) {
    const angle = (i / 7) * Math.PI * 2;
    const r = 0.1 + (i % 3) * 0.03;
    parts.push(
      part(
        new THREE.SphereGeometry(0.07, 5, 4),
        leafColor,
        Math.cos(angle) * r,
        0.06,
        Math.sin(angle) * r,
        -0.5,
        angle,
        0,
      ),
    );
  }

  if (showsFruit(stage)) {
    for (let i = 0; i < 5; i++) {
      const angle = (i / 5) * Math.PI * 2;
      parts.push(
        hangingFruit(
          FRUIT_STRAWBERRY,
          Math.cos(angle) * 0.07,
          0.1,
          Math.sin(angle) * 0.07,
          0.035,
        ),
      );
    }
  }

  return mergeGeometries(parts) ?? new THREE.BufferGeometry();
}

function buildCannabisPlant(leafColor: THREE.Color, stage: GrowthStage): THREE.BufferGeometry {
  const stemH = stage === "seedling" ? 0.12 : stage === "harvest" ? 0.38 : 0.48;
  const parts: THREE.BufferGeometry[] = [stem(stemH, new THREE.Color("#6d4c41"))];

  const leafCount = stage === "seedling" ? 4 : 7;
  for (let i = 0; i < leafCount; i++) {
    const t = i / leafCount;
    const y = stemH * (0.35 + t * 0.55);
    const angle = (i / leafCount) * Math.PI * 2;
    const blade = new THREE.BoxGeometry(0.14, 0.008, 0.05);
    parts.push(
      part(blade, LEAF_CANNABIS, Math.cos(angle) * 0.05, y, Math.sin(angle) * 0.05, 0.2, angle, 0),
      part(blade, LEAF_CANNABIS, Math.cos(angle) * 0.05, y, Math.sin(angle) * 0.05, 0.2, angle + Math.PI, 0),
    );
  }

  if (stage !== "seedling") {
    parts.push(leafCluster(leafColor, 0.1, stemH + 0.06, 0.35));
  }

  return mergeGeometries(parts) ?? new THREE.BufferGeometry();
}

const geometryCache = new Map<string, THREE.BufferGeometry>();

export function createPlantGeometry(cropType: CropType, growthStage: GrowthStage): THREE.BufferGeometry {
  const key = `${cropType}:${growthStage}`;
  const cached = geometryCache.get(key);
  if (cached) return cached;

  const leaf = LEAF_COLORS[cropType];
  let geometry: THREE.BufferGeometry;

  switch (cropType) {
    case "tomato":
      geometry = buildVinePlant(leaf, FRUIT_TOMATO, growthStage, {
        stemH: 0.42,
        canopyR: 0.22,
        fruitSize: 0.042,
        fruitCount: 5,
      });
      break;
    case "cucumber":
      geometry = buildVinePlant(leaf, FRUIT_CUCUMBER, growthStage, {
        stemH: 0.35,
        canopyR: 0.26,
        fruitSize: 0.055,
        fruitCount: 3,
      });
      break;
    case "pepper":
      geometry = buildVinePlant(leaf, FRUIT_PEPPER, growthStage, {
        stemH: 0.32,
        canopyR: 0.2,
        fruitSize: 0.038,
        fruitCount: 4,
      });
      break;
    case "lettuce":
      geometry = buildLettucePlant(leaf);
      break;
    case "strawberry":
      geometry = buildStrawberryPlant(leaf, growthStage);
      break;
    case "cannabis":
      geometry = buildCannabisPlant(leaf, growthStage);
      break;
    default:
      geometry = buildVinePlant(leaf, FRUIT_TOMATO, growthStage, {
        stemH: 0.4,
        canopyR: 0.2,
        fruitSize: 0.04,
        fruitCount: 4,
      });
  }

  geometry.computeVertexNormals();
  geometryCache.set(key, geometry);
  return geometry;
}

export function plantHeightM(cropType: CropType, growthStage: GrowthStage): number {
  if (cropType === "lettuce" || cropType === "strawberry") return 0.14;
  if (cropType === "cannabis") {
    if (growthStage === "seedling") return 0.14;
    if (growthStage === "harvest") return 0.42;
    return 0.52;
  }
  if (growthStage === "seedling") return 0.18;
  if (growthStage === "early_vegetative") return 0.28;
  return 0.48;
}
