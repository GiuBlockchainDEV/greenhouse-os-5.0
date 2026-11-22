import { plantSkidForTemplate } from "@/lib/fertigation/plantSkids";
import type {
  FertigationEdge,
  FertigationNode,
  FertigationProject,
  FertigationTemplateId,
  PlantSkidBlueprint,
} from "@/types/fertigation";

export interface PlantPose {
  position: [number, number, number];
  groundY: number;
  rotationY?: number;
  belowGrade?: boolean;
}

const ROW_BY_PID_Y = [
  { maxY: 165, z: -3.2 },
  { maxY: 340, z: 0 },
  { maxY: Number.POSITIVE_INFINITY, z: 3.2 },
] as const;

const COLUMN_SPAN_M = 14;

function rowZ(pidY: number): number {
  for (const band of ROW_BY_PID_Y) {
    if (pidY < band.maxY) {
      return band.z;
    }
  }
  return ROW_BY_PID_Y[ROW_BY_PID_Y.length - 1]?.z ?? 0;
}

export interface ResolvedPlantLayout {
  blueprint: PlantSkidBlueprint | null;
  poses: Map<string, PlantPose>;
}

function schematicLayout(nodes: FertigationNode[]): Map<string, PlantPose> {
  const result = new Map<string, PlantPose>();
  if (nodes.length === 0) {
    return result;
  }

  const xs = nodes.map((node) => node.x);
  const minX = Math.min(...xs);
  const maxX = Math.max(...xs);
  const span = Math.max(maxX - minX, 120);

  for (const node of nodes) {
    const t = (node.x - minX) / span;
    const x = t * COLUMN_SPAN_M - COLUMN_SPAN_M / 2;
    const z = rowZ(node.y);
    result.set(node.id, { position: [x, 0, z], groundY: 0 });
  }
  return result;
}

/**
 * Canonical physical skid from typed template blueprints (manufacturer-style layouts).
 * P&ID coordinates are not used when a blueprint exists.
 */
export function resolvePlantLayout(project: FertigationProject): ResolvedPlantLayout {
  const blueprint = plantSkidForTemplate(project.template);

  const poses = new Map<string, PlantPose>();

  if (blueprint) {
    for (const node of project.nodes) {
      const skidPose = blueprint.rolePoses[node.role];
      if (!skidPose) {
        continue;
      }
      /** Below-grade tanks: rim at finished floor (y=0); pit shell shows burial. */
      const groundY = skidPose.groundY ?? 0;
      poses.set(node.id, {
        position: [...skidPose.position],
        groundY,
        rotationY: skidPose.rotationY,
        belowGrade: skidPose.belowGrade,
      });
    }
    for (const node of project.nodes) {
      if (!poses.has(node.id)) {
        const fallback = schematicLayout([node]);
        const entry = fallback.get(node.id);
        if (entry) {
          poses.set(node.id, entry);
        }
      }
    }
    return { blueprint, poses };
  }

  return { blueprint: null, poses: schematicLayout(project.nodes) };
}

export function resolvePlantLayoutByTemplate(
  templateId: FertigationTemplateId,
  nodes: FertigationNode[],
): ResolvedPlantLayout {
  return resolvePlantLayout({
    version: 16,
    id: "preview",
    template: templateId,
    meta: {
      name: "",
      site: "",
      reference: "",
      author: "",
      revision: "",
      createdAt: "",
      updatedAt: "",
    },
    settings: {
      ecSet: 1.8,
      phSet: 5.8,
      ecTolerance: 0.1,
      phTolerance: 0.2,
      qualityHoldS: 60,
      transferAuto: true,
      sourceAuto: true,
      autoMix: true,
      autoCrop: true,
      autoDose: true,
      sourceFillRate: 2,
      sourceFillTargetPct: 55,
      cropTargetPct: 65,
      temperatureC: 22,
      chemicalConcentrationGL: 120,
      acidEffect: 0.02,
      pipeWarningVelocity: 1.8,
    },
    nodes,
    edges: [],
  });
}

/** @deprecated Use resolvePlantLayout for template-aware placement */
export function computePlantLayout(nodes: FertigationNode[]): Map<string, PlantPose> {
  return schematicLayout(nodes);
}

export function plantLayoutCenter(poses: Map<string, PlantPose>): [number, number] {
  if (poses.size === 0) {
    return [0, 0];
  }
  let sumX = 0;
  let sumZ = 0;
  for (const { position } of poses.values()) {
    sumX += position[0];
    sumZ += position[2];
  }
  return [sumX / poses.size, sumZ / poses.size];
}

export function connectionHeightY(
  kind: FertigationNode["kind"],
  circuit: FertigationEdge["circuit"],
  belowGrade?: boolean,
): number {
  if (kind === "tank") {
    return belowGrade ? 0.48 : 0.95;
  }
  if (kind === "crop") {
    return 0.52;
  }
  switch (circuit) {
    case "return":
      return 0.22;
    case "crop":
      return 0.48;
    case "mix":
      return 0.58;
    case "source":
      return 0.32;
    default:
      return 0.4;
  }
}