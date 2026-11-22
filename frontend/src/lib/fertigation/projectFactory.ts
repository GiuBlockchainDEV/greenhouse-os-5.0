import { FERTIGATION_BASE_SETTINGS, FERTIGATION_COMPONENT_CATALOG } from "@/lib/fertigation/componentCatalog";
import { FERTIGATION_TEMPLATES } from "@/lib/fertigation/templates";
import type {
  FertigationComponentDefaults,
  FertigationComponentKind,
  FertigationEdge,
  FertigationNode,
  FertigationProject,
  FertigationSettings,
  FertigationTemplateId,
} from "@/types/fertigation";

function clone<T>(value: T): T {
  return JSON.parse(JSON.stringify(value)) as T;
}

function slugTag(tag: string): string {
  return tag.toLowerCase().replace(/[^a-z0-9]+/g, "-");
}

interface NodeOverrides {
  label?: string;
  params?: FertigationComponentDefaults;
}

export function createFertigationNode(
  kind: FertigationComponentKind,
  tag: string,
  role: string,
  x: number,
  y: number,
  overrides: NodeOverrides = {},
): FertigationNode {
  const item = FERTIGATION_COMPONENT_CATALOG[kind];
  return {
    id: slugTag(tag),
    kind,
    tag,
    role,
    label: overrides.label ?? item.nameKey,
    x,
    y,
    params: {
      ...clone(item.defaults),
      ...(overrides.params ?? {}),
    },
  };
}

export function createFertigationEdge(
  id: string,
  from: string,
  to: string,
  circuit: string,
  diameterMm = 40,
  lengthM = 6,
  extra: Partial<FertigationEdge> = {},
): FertigationEdge {
  return {
    id,
    from: slugTag(from),
    to: slugTag(to),
    circuit,
    diameterMm,
    lengthM,
    roughnessMm: 0.02,
    enabled: true,
    ...extra,
  };
}

export function freshFertigationProject(templateId: FertigationTemplateId): FertigationProject {
  const template = FERTIGATION_TEMPLATES[templateId];
  const now = new Date().toISOString();
  const graph = template.buildGraph();
  return {
    version: 16,
    id: `growa-${Date.now()}`,
    template: templateId,
    meta: {
      ...template.projectMeta,
      author: "GreenhouseOS",
      revision: "A",
      createdAt: now,
      updatedAt: now,
    },
    settings: clone(template.settings),
    nodes: clone(graph.nodes),
    edges: clone(graph.edges),
  };
}

export function baseSettings(overrides: Partial<FertigationSettings> = {}): FertigationSettings {
  return { ...FERTIGATION_BASE_SETTINGS, ...overrides };
}