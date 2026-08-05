/** Procedural plant meshes — crop type × cultivation system × growth stage. */

import * as THREE from "three";
import { mergeGeometries } from "three/addons/utils/BufferGeometryUtils.js";

import type { CropType, CultivationSystem, GrowthStage } from "@/types/greenhouse";

const STEM = new THREE.Color("#5c4033");
const NET_POT = new THREE.Color("#1f2937");
const ROCKWOOL = new THREE.Color("#aed581");
const FRUIT_TOMATO = new THREE.Color("#d64541");
const FRUIT_PEPPER = new THREE.Color("#e67e22");
const FRUIT_CUCUMBER = new THREE.Color("#2ecc71");
const FRUIT_STRAWBERRY = new THREE.Color("#c0392b");

const LEAF: Record<CropType, THREE.Color> = {
  tomato: new THREE.Color("#2e7d32"),
  cucumber: new THREE.Color("#43a047"),
  pepper: new THREE.Color("#1b5e20"),
  lettuce: new THREE.Color("#81c784"),
  strawberry: new THREE.Color("#4caf50"),
  cannabis: new THREE.Color("#689f38"),
};

/** Visual scale modifier per cultivation system. */
export const SYSTEM_PLANT_SCALE: Record<CultivationSystem, number> = {
  soil: 1.0,
  substrate: 0.92,
  growbed: 0.88,
  nft: 0.7,
  dwc: 0.75,
  drip: 0.95,
  aeroponic: 0.68,
  ebb_flow: 0.82,
};

function paint(geometry: THREE.BufferGeometry, color: THREE.Color): THREE.BufferGeometry {
  const geo = geometry.clone();
  const position = geo.attributes.position;
  if (!position) return geo;
  const count = position.count;
  const colors = new Float32Array(count * 3);
  for (let i = 0; i < count; i++) {
    colors[i * 3] = color.r;
    colors[i * 3 + 1] = color.g;
    colors[i * 3 + 2] = color.b;
  }
  geo.setAttribute("color", new THREE.BufferAttribute(colors, 3));
  return geo;
}

function place(
  geometry: THREE.BufferGeometry,
  color: THREE.Color,
  x: number,
  y: number,
  z: number,
  rotX = 0,
  rotY = 0,
  rotZ = 0,
): THREE.BufferGeometry {
  const geo = geometry.clone();
  geo.rotateX(rotX);
  geo.rotateY(rotY);
  geo.rotateZ(rotZ);
  geo.translate(x, y, z);
  return paint(geo, color);
}

function leafBlade(
  color: THREE.Color,
  length: number,
  width: number,
  x: number,
  y: number,
  z: number,
  tiltX: number,
  yaw: number,
): THREE.BufferGeometry {
  return place(new THREE.BoxGeometry(width, 0.014, length), color, x, y, z, tiltX, yaw, 0);
}

function stem(height: number): THREE.BufferGeometry {
  const geo = new THREE.CylinderGeometry(0.012, 0.022, height, 8);
  geo.translate(0, height / 2, 0);
  return paint(geo, STEM);
}

function fruitSphere(color: THREE.Color, x: number, y: number, z: number, r: number): THREE.BufferGeometry {
  const geo = new THREE.SphereGeometry(r, 8, 8);
  geo.translate(x, y, z);
  return paint(geo, color);
}

function fruitCylinder(color: THREE.Color, x: number, y: number, z: number, len: number): THREE.BufferGeometry {
  const geo = new THREE.CylinderGeometry(0.025, 0.028, len, 7);
  geo.translate(x, y, z);
  geo.rotateZ(Math.PI / 2);
  return paint(geo, color);
}

function netPot(): THREE.BufferGeometry {
  const outer = new THREE.CylinderGeometry(0.055, 0.045, 0.07, 10);
  outer.translate(0, 0.035, 0);
  return paint(outer, NET_POT);
}

function rockwoolCube(): THREE.BufferGeometry {
  const cube = new THREE.BoxGeometry(0.1, 0.08, 0.1);
  cube.translate(0, 0.04, 0);
  return paint(cube, ROCKWOOL);
}

function horizontalCanopy(color: THREE.Color, y: number, armLength: number, arms = 4): THREE.BufferGeometry {
  const parts: THREE.BufferGeometry[] = [];
  for (let i = 0; i < arms; i++) {
    const yaw = (i / arms) * Math.PI;
    parts.push(leafBlade(color, armLength, armLength * 0.42, 0, y, 0, -0.55, yaw));
    parts.push(leafBlade(color, armLength * 0.75, armLength * 0.32, 0, y + 0.02, 0, -0.75, yaw + 0.4));
  }
  return mergeGeometries(parts) ?? new THREE.BufferGeometry();
}

function leafWhorl(
  color: THREE.Color,
  y: number,
  armLength: number,
  count: number,
  tilt: number,
): THREE.BufferGeometry {
  const parts: THREE.BufferGeometry[] = [];
  for (let i = 0; i < count; i++) {
    const yaw = (i / count) * Math.PI * 2;
    parts.push(leafBlade(color, armLength, armLength * 0.38, 0, y, 0, tilt, yaw));
  }
  return mergeGeometries(parts) ?? new THREE.BufferGeometry();
}

function hasFruit(stage: GrowthStage): boolean {
  return stage === "generative" || stage === "harvest";
}

function buildVineCrop(
  leafColor: THREE.Color,
  fruitColor: THREE.Color,
  stage: GrowthStage,
  stemH: number,
  fruitShape: "sphere" | "cylinder",
): THREE.BufferGeometry {
  const parts: THREE.BufferGeometry[] = [stem(stemH)];

  [0.35, 0.55, 0.72].forEach((ratio, index) => {
    parts.push(leafWhorl(leafColor, stemH * ratio, 0.14 + index * 0.02, 4, -0.35 - index * 0.08));
  });
  parts.push(horizontalCanopy(leafColor, stemH + 0.04, 0.2, 4));

  if (hasFruit(stage)) {
    for (let i = 0; i < 4; i++) {
      const yaw = (i / 4) * Math.PI * 2;
      const fx = Math.cos(yaw) * 0.09;
      const fy = stemH * 0.38 + (i % 2) * 0.08;
      const fz = Math.sin(yaw) * 0.09;
      parts.push(
        fruitShape === "cylinder"
          ? fruitCylinder(fruitColor, fx, fy, fz, 0.14)
          : fruitSphere(fruitColor, fx, fy, fz, 0.038),
      );
    }
  }

  return mergeGeometries(parts) ?? new THREE.BufferGeometry();
}

function buildBushCrop(
  leafColor: THREE.Color,
  fruitColor: THREE.Color,
  stage: GrowthStage,
): THREE.BufferGeometry {
  const parts: THREE.BufferGeometry[] = [stem(0.28)];
  parts.push(horizontalCanopy(leafColor, 0.22, 0.16, 5));
  parts.push(horizontalCanopy(leafColor, 0.32, 0.14, 4));
  if (hasFruit(stage)) {
    for (let i = 0; i < 5; i++) {
      const yaw = (i / 5) * Math.PI * 2;
      parts.push(
        fruitSphere(
          fruitColor,
          Math.cos(yaw) * 0.08,
          0.2 + (i % 2) * 0.06,
          Math.sin(yaw) * 0.08,
          0.042,
        ),
      );
    }
  }
  return mergeGeometries(parts) ?? new THREE.BufferGeometry();
}

function buildLettuce(leafColor: THREE.Color): THREE.BufferGeometry {
  const parts: THREE.BufferGeometry[] = [];
  for (let ring = 0; ring < 3; ring++) {
    const count = 5 + ring * 3;
    const radius = 0.04 + ring * 0.05;
    const y = 0.02 + ring * 0.025;
    for (let i = 0; i < count; i++) {
      const yaw = (i / count) * Math.PI * 2 + ring * 0.25;
      parts.push(
        leafBlade(
          leafColor,
          0.1 + ring * 0.03,
          0.07 + ring * 0.015,
          Math.cos(yaw) * radius,
          y,
          Math.sin(yaw) * radius,
          -0.6 - ring * 0.15,
          yaw,
        ),
      );
    }
  }
  return mergeGeometries(parts) ?? new THREE.BufferGeometry();
}

function buildStrawberry(leafColor: THREE.Color, stage: GrowthStage): THREE.BufferGeometry {
  const parts: THREE.BufferGeometry[] = [];
  for (let i = 0; i < 5; i++) {
    const yaw = (i / 5) * Math.PI * 2;
    parts.push(
      leafBlade(leafColor, 0.09, 0.06, Math.cos(yaw) * 0.05, 0.04, Math.sin(yaw) * 0.05, -0.55, yaw),
      leafBlade(leafColor, 0.07, 0.05, Math.cos(yaw + 0.5) * 0.04, 0.06, Math.sin(yaw + 0.5) * 0.04, -0.7, yaw + 0.5),
    );
  }
  if (hasFruit(stage)) {
    for (let i = 0; i < 4; i++) {
      const yaw = (i / 4) * Math.PI * 2;
      parts.push(fruitSphere(FRUIT_STRAWBERRY, Math.cos(yaw) * 0.05, 0.11, Math.sin(yaw) * 0.05, 0.032));
    }
  }
  return mergeGeometries(parts) ?? new THREE.BufferGeometry();
}

function buildCannabis(leafColor: THREE.Color, stage: GrowthStage): THREE.BufferGeometry {
  const stemH = stage === "seedling" ? 0.14 : stage === "harvest" ? 0.4 : 0.5;
  const parts: THREE.BufferGeometry[] = [stem(stemH)];
  const leafCount = stage === "seedling" ? 3 : 6;
  for (let i = 0; i < leafCount; i++) {
    const y = stemH * (0.3 + (i / leafCount) * 0.55);
    const yaw = (i / leafCount) * Math.PI * 2;
    parts.push(
      leafBlade(leafColor, 0.16, 0.07, Math.cos(yaw) * 0.04, y, Math.sin(yaw) * 0.04, 0.15, yaw),
      leafBlade(leafColor, 0.14, 0.06, Math.cos(yaw) * 0.03, y + 0.02, Math.sin(yaw) * 0.03, 0.35, yaw + 0.6),
    );
  }
  if (stage !== "seedling") {
    parts.push(horizontalCanopy(leafColor, stemH + 0.03, 0.12, 5));
  }
  return mergeGeometries(parts) ?? new THREE.BufferGeometry();
}

function buildCropBody(cropType: CropType, leaf: THREE.Color, stage: GrowthStage): THREE.BufferGeometry {
  switch (cropType) {
    case "tomato":
      return buildVineCrop(leaf, FRUIT_TOMATO, stage, 0.44, "sphere");
    case "cucumber":
      return buildVineCrop(leaf, FRUIT_CUCUMBER, stage, 0.38, "cylinder");
    case "pepper":
      return buildBushCrop(leaf, FRUIT_PEPPER, stage);
    case "lettuce":
      return buildLettuce(leaf);
    case "strawberry":
      return buildStrawberry(leaf, stage);
    case "cannabis":
      return buildCannabis(leaf, stage);
    default:
      return buildVineCrop(leaf, FRUIT_TOMATO, stage, 0.4, "sphere");
  }
}

function buildPlantingBase(system: CultivationSystem): THREE.BufferGeometry | null {
  switch (system) {
    case "nft":
    case "dwc":
    case "aeroponic":
      return netPot();
    case "substrate":
      return rockwoolCube();
    default:
      return null;
  }
}

const cache = new Map<string, THREE.BufferGeometry>();

export function createPlantGeometry(
  cropType: CropType,
  system: CultivationSystem,
  growthStage: GrowthStage,
): THREE.BufferGeometry {
  const key = `${cropType}:${system}:${growthStage}`;
  const hit = cache.get(key);
  if (hit) return hit;

  const leaf = LEAF[cropType];
  const parts: THREE.BufferGeometry[] = [buildCropBody(cropType, leaf, growthStage)];
  const base = buildPlantingBase(system);
  if (base) parts.unshift(base);

  const geometry = mergeGeometries(parts) ?? new THREE.BufferGeometry();
  geometry.computeVertexNormals();
  cache.set(key, geometry);
  return geometry;
}

export function plantScaleForSystem(system: CultivationSystem): number {
  return SYSTEM_PLANT_SCALE[system];
}
