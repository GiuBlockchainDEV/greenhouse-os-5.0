/** Plant mesh layers: mount (system) + foliage + fruit (crop/stage). */

import * as THREE from "three";
import { mergeGeometries } from "three/addons/utils/BufferGeometryUtils.js";

import type { CropType, CultivationSystem, GrowthStage } from "@/types/greenhouse";

const STEM = new THREE.Color("#5d4037");
const STEM_DARK = new THREE.Color("#3e2723");
const NET_POT = new THREE.Color("#1a1a1a");
const ROOT = new THREE.Color("#efebe9");
const ROCKWOOL = new THREE.Color("#aed581");
const MEDIA = new THREE.Color("#5d4037");
const FRUIT_TOMATO = new THREE.Color("#e53935");
const FRUIT_PEPPER = new THREE.Color("#fb8c00");
const FRUIT_CUCUMBER = new THREE.Color("#43a047");
const FRUIT_STRAWBERRY = new THREE.Color("#c62828");

const LEAF: Record<CropType, THREE.Color> = {
  tomato: new THREE.Color("#388e3c"),
  cucumber: new THREE.Color("#2e7d32"),
  pepper: new THREE.Color("#1b5e20"),
  lettuce: new THREE.Color("#66bb6a"),
  strawberry: new THREE.Color("#4caf50"),
  cannabis: new THREE.Color("#558b2f"),
};

const LEAF_LIGHT: Record<CropType, THREE.Color> = {
  tomato: new THREE.Color("#66bb6a"),
  cucumber: new THREE.Color("#81c784"),
  pepper: new THREE.Color("#43a047"),
  lettuce: new THREE.Color("#a5d6a7"),
  strawberry: new THREE.Color("#81c784"),
  cannabis: new THREE.Color("#9ccc65"),
};

export const SYSTEM_PLANT_SCALE: Record<CultivationSystem, number> = {
  soil: 1.0,
  substrate: 0.92,
  growbed: 0.88,
  nft: 0.75,
  dwc: 0.8,
  drip: 0.95,
  aeroponic: 0.72,
  ebb_flow: 0.86,
};

const HYDROPONIC: CultivationSystem[] = ["nft", "dwc", "aeroponic"];

export interface PlantMeshLayers {
  mount: THREE.BufferGeometry | null;
  foliage: THREE.BufferGeometry;
  fruit: THREE.BufferGeometry | null;
  mountColor: THREE.Color;
  foliageColor: THREE.Color;
  fruitColor: THREE.Color | null;
}

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

function leafBlade(
  width: number,
  length: number,
  color: THREE.Color,
  x: number,
  y: number,
  z: number,
  tiltX: number,
  yaw: number,
  roll = 0,
): THREE.BufferGeometry {
  const g = new THREE.PlaneGeometry(width, length, 1, 2);
  g.rotateX(-Math.PI / 2 + tiltX);
  g.rotateY(yaw);
  g.rotateZ(roll);
  g.translate(x, y, z);
  return paint(g, color);
}

function compoundLeaf(
  crop: CropType,
  x: number,
  y: number,
  z: number,
  yaw: number,
  size: number,
): THREE.BufferGeometry[] {
  const dark = LEAF[crop];
  const light = LEAF_LIGHT[crop];
  const parts: THREE.BufferGeometry[] = [];
  const petiole = new THREE.CylinderGeometry(0.004, 0.006, size * 0.35, 5);
  petiole.translate(x, y + size * 0.12, z);
  petiole.rotateZ(yaw);
  parts.push(paint(petiole, STEM_DARK));

  for (let i = -1; i <= 1; i++) {
    parts.push(
      leafBlade(
        size * 0.22,
        size * 0.34,
        i === 0 ? light : dark,
        x + Math.sin(yaw) * i * size * 0.12,
        y + size * 0.22,
        z + Math.cos(yaw) * i * size * 0.12,
        -0.25 + i * 0.08,
        yaw + i * 0.35,
      ),
    );
  }
  return parts;
}

function stageScale(stage: GrowthStage): number {
  const map: Record<GrowthStage, number> = {
    seedling: 0.35,
    early_vegetative: 0.55,
    mid_season: 1.0,
    late_vegetative: 1.15,
    generative: 1.05,
    harvest: 0.9,
  };
  return map[stage] ?? 1;
}

function buildMount(system: CultivationSystem): THREE.BufferGeometry | null {
  const parts: THREE.BufferGeometry[] = [];

  switch (system) {
    case "nft":
    case "dwc":
    case "aeroponic": {
      const pot = new THREE.CylinderGeometry(0.048, 0.038, 0.075, 12);
      pot.translate(0, 0.038, 0);
      parts.push(paint(pot, NET_POT));
      for (let i = 0; i < 5; i++) {
        const a = (i / 5) * Math.PI * 2;
        const root = new THREE.CylinderGeometry(0.004, 0.002, 0.06 + (i % 2) * 0.02, 4);
        root.translate(Math.cos(a) * 0.02, -0.01, Math.sin(a) * 0.02);
        root.rotateX(0.4 + (i % 3) * 0.15);
        root.rotateZ(a);
        parts.push(paint(root, ROOT));
      }
      break;
    }
    case "substrate": {
      const cube = new THREE.BoxGeometry(0.1, 0.085, 0.1);
      cube.translate(0, 0.042, 0);
      parts.push(paint(cube, ROCKWOOL));
      break;
    }
    case "growbed":
    case "ebb_flow": {
      const m = new THREE.BoxGeometry(0.13, 0.055, 0.13);
      m.translate(0, 0.028, 0);
      parts.push(paint(m, MEDIA));
      break;
    }
    default:
      return null;
  }

  return mergeGeometries(parts);
}

function buildLettuce(stage: GrowthStage, compact: boolean): THREE.BufferGeometry {
  const parts: THREE.BufferGeometry[] = [];
  const scale = stageScale(stage) * (compact ? 0.85 : 1);
  const layers = compact ? 5 : 6;

  for (let ring = 0; ring < layers; ring++) {
    const count = 5 + ring;
    const radius = (0.025 + ring * 0.035) * scale;
    const height = (0.04 + ring * 0.018) * scale;
    for (let i = 0; i < count; i++) {
      const a = (i / count) * Math.PI * 2 + ring * 0.25;
      const w = (0.07 + ring * 0.015) * scale;
      const l = (0.1 + ring * 0.02) * scale;
      parts.push(
        leafBlade(
          w,
          l,
          ring % 2 === 0 ? LEAF.lettuce : LEAF_LIGHT.lettuce,
          Math.cos(a) * radius,
          height,
          Math.sin(a) * radius,
          -0.65 - ring * 0.05,
          a,
          (i % 2) * 0.1,
        ),
      );
    }
  }

  const core = new THREE.SphereGeometry(0.035 * scale, 8, 6);
  core.translate(0, 0.05 * scale, 0);
  parts.push(paint(core, LEAF_LIGHT.lettuce));

  const merged = mergeGeometries(parts) ?? new THREE.BufferGeometry();
  merged.computeVertexNormals();
  return merged;
}

function buildStrawberry(stage: GrowthStage, compact: boolean): THREE.BufferGeometry {
  const parts: THREE.BufferGeometry[] = [];
  const scale = stageScale(stage) * (compact ? 0.9 : 1);

  for (let i = 0; i < 8; i++) {
    const a = (i / 8) * Math.PI * 2;
    parts.push(
      leafBlade(
        0.07 * scale,
        0.11 * scale,
        i % 2 === 0 ? LEAF.strawberry : LEAF_LIGHT.strawberry,
        Math.cos(a) * 0.07 * scale,
        0.05 * scale,
        Math.sin(a) * 0.07 * scale,
        -0.55,
        a,
      ),
    );
  }

  const crown = new THREE.CylinderGeometry(0.015 * scale, 0.022 * scale, 0.04 * scale, 8);
  crown.translate(0, 0.04 * scale, 0);
  parts.push(paint(crown, STEM));

  const merged = mergeGeometries(parts) ?? new THREE.BufferGeometry();
  merged.computeVertexNormals();
  return merged;
}

function buildVineCrop(
  crop: CropType,
  stage: GrowthStage,
  system: CultivationSystem,
): THREE.BufferGeometry {
  const parts: THREE.BufferGeometry[] = [];
  const hydro = HYDROPONIC.includes(system);
  const scale = stageScale(stage) * (hydro ? 0.82 : 1);
  const stemH =
    crop === "cannabis"
      ? 0.5 * scale
      : hydro
        ? 0.22 * scale
        : stage === "seedling"
          ? 0.14 * scale
          : 0.42 * scale;

  const stem = new THREE.CylinderGeometry(0.012, 0.018, stemH, 8);
  stem.translate(0, 0.06 + stemH / 2, 0);
  parts.push(paint(stem, STEM));

  if (hydro && (crop === "tomato" || crop === "cucumber" || crop === "pepper")) {
    const wire = new THREE.CylinderGeometry(0.003, 0.003, stemH * 1.1, 6);
    wire.translate(0.04, 0.06 + stemH / 2, 0);
    parts.push(paint(wire, new THREE.Color("#78909c")));
  }

  const leafLevels = hydro ? 2 : crop === "cannabis" ? 6 : 4;
  for (let level = 0; level < leafLevels; level++) {
    const y = 0.12 + (level / leafLevels) * stemH;
    const leafSize = (0.28 + level * 0.04) * scale;
    for (let side = 0; side < 2; side++) {
      const yaw = side === 0 ? -0.6 : 0.6;
      parts.push(...compoundLeaf(crop, side === 0 ? -0.05 : 0.05, y, 0, yaw + level * 0.3, leafSize));
    }
  }

  if (!hydro && (crop === "tomato" || crop === "cucumber")) {
    const topY = 0.06 + stemH + 0.04;
    parts.push(leafBlade(0.1 * scale, 0.14 * scale, LEAF_LIGHT[crop], 0, topY, 0, -0.4, 0));
    parts.push(leafBlade(0.09 * scale, 0.12 * scale, LEAF[crop], 0.06, topY - 0.02, 0.04, -0.35, 0.8));
    parts.push(leafBlade(0.09 * scale, 0.12 * scale, LEAF[crop], -0.05, topY - 0.02, -0.04, -0.35, -0.7));
  }

  const merged = mergeGeometries(parts) ?? new THREE.BufferGeometry();
  merged.computeVertexNormals();
  return merged;
}

function buildFoliage(
  crop: CropType,
  stage: GrowthStage,
  system: CultivationSystem,
): THREE.BufferGeometry {
  const hydro = HYDROPONIC.includes(system) || system === "substrate";

  if (crop === "lettuce") {
    return buildLettuce(stage, hydro);
  }
  if (crop === "strawberry") {
    return buildStrawberry(stage, hydro);
  }
  return buildVineCrop(crop, stage, system);
}

function buildFruit(crop: CropType, stage: GrowthStage, system: CultivationSystem): THREE.BufferGeometry | null {
  if (stage !== "generative" && stage !== "harvest") return null;
  const parts: THREE.BufferGeometry[] = [];
  const hydro = HYDROPONIC.includes(system);
  const color =
    crop === "tomato"
      ? FRUIT_TOMATO
      : crop === "pepper"
        ? FRUIT_PEPPER
        : crop === "cucumber"
          ? FRUIT_CUCUMBER
          : crop === "strawberry"
            ? FRUIT_STRAWBERRY
            : null;
  if (!color) return null;

  const count = crop === "cucumber" ? (hydro ? 2 : 3) : crop === "strawberry" ? 5 : hydro ? 4 : 6;
  const baseY = hydro ? 0.18 : 0.22;

  for (let i = 0; i < count; i++) {
    const a = (i / count) * Math.PI * 2;
    if (crop === "cucumber") {
      const cyl = new THREE.CylinderGeometry(0.018, 0.022, 0.1 + (i % 2) * 0.03, 8);
      cyl.rotateZ(Math.PI / 2);
      cyl.translate(Math.cos(a) * 0.06, baseY + (i % 2) * 0.04, Math.sin(a) * 0.06);
      parts.push(paint(cyl, color));
    } else if (crop === "strawberry") {
      const sph = new THREE.SphereGeometry(0.024, 8, 8);
      sph.translate(Math.cos(a) * 0.05, 0.1, Math.sin(a) * 0.05);
      parts.push(paint(sph, color));
    } else {
      const sph = new THREE.SphereGeometry(0.028 + (i % 2) * 0.006, 10, 10);
      sph.translate(Math.cos(a) * 0.065, baseY + (i % 3) * 0.035, Math.sin(a) * 0.065);
      parts.push(paint(sph, color));
    }
  }

  const merged = mergeGeometries(parts);
  return merged ?? null;
}

const cache = new Map<string, PlantMeshLayers>();

export function createPlantLayers(
  cropType: CropType,
  system: CultivationSystem,
  growthStage: GrowthStage,
): PlantMeshLayers {
  const key = `${cropType}:${system}:${growthStage}`;
  const hit = cache.get(key);
  if (hit) return hit;

  const layers: PlantMeshLayers = {
    mount: buildMount(system),
    foliage: buildFoliage(cropType, growthStage, system),
    fruit: buildFruit(cropType, growthStage, system),
    mountColor: system === "substrate" ? ROCKWOOL : NET_POT,
    foliageColor: LEAF[cropType],
    fruitColor:
      cropType === "tomato"
        ? FRUIT_TOMATO
        : cropType === "pepper"
          ? FRUIT_PEPPER
          : cropType === "cucumber"
            ? FRUIT_CUCUMBER
            : cropType === "strawberry"
              ? FRUIT_STRAWBERRY
              : null,
  };
  cache.set(key, layers);
  return layers;
}

export function plantScaleForSystem(system: CultivationSystem): number {
  return SYSTEM_PLANT_SCALE[system];
}

/** @deprecated Use createPlantLayers */
export function createPlantGeometry(
  cropType: CropType,
  system: CultivationSystem,
  growthStage: GrowthStage,
): THREE.BufferGeometry {
  const layers = createPlantLayers(cropType, system, growthStage);
  const parts = [layers.foliage, layers.mount, layers.fruit].filter(Boolean) as THREE.BufferGeometry[];
  return mergeGeometries(parts) ?? layers.foliage;
}
