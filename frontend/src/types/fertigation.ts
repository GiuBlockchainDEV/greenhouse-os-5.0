import type { CropType, CultivationSystem } from "@/types/greenhouse";

export type FertigationComponentKind =
  | "source"
  | "filter"
  | "tank"
  | "pump"
  | "valve"
  | "injector"
  | "sensor"
  | "flowmeter"
  | "manifold"
  | "crop"
  | "return"
  | "junction";

export type FertigationTemplateId =
  | "nft-dual"
  | "nft-shared"
  | "inline-drip"
  | "substrate-drip"
  | "dwc-recirc";

export type FertigationPresetCategory = "recirculating" | "once_through";

export type FertigationComponentDefaults = Record<
  string,
  string | number | boolean | number[] | string[] | boolean[]
>;

export interface FertigationComponentCatalogItem {
  kind: FertigationComponentKind;
  nameKey: string;
  categoryKey: string;
  prefix: string;
  glyph: string;
  descriptionKey: string;
  defaults: FertigationComponentDefaults;
}

export interface FertigationNode {
  id: string;
  kind: FertigationComponentKind;
  tag: string;
  role: string;
  label: string;
  x: number;
  y: number;
  params: FertigationComponentDefaults;
}

export interface FertigationEdge {
  id: string;
  from: string;
  to: string;
  circuit: string;
  diameterMm: number;
  lengthM: number;
  roughnessMm: number;
  enabled: boolean;
  route?: string;
}

export interface FertigationSettings {
  ecSet: number;
  phSet: number;
  ecTolerance: number;
  phTolerance: number;
  qualityHoldS: number;
  transferAuto: boolean;
  sourceAuto: boolean;
  autoMix: boolean;
  autoCrop: boolean;
  autoDose: boolean;
  sourceFillRate: number;
  sourceFillTargetPct: number;
  cropTargetPct: number;
  temperatureC: number;
  chemicalConcentrationGL: number;
  acidEffect: number;
  pipeWarningVelocity: number;
}

export interface FertigationProjectMeta {
  name: string;
  site: string;
  reference: string;
  author: string;
  revision: string;
  createdAt: string;
  updatedAt: string;
}

export interface FertigationProject {
  version: number;
  id: string;
  template: FertigationTemplateId;
  meta: FertigationProjectMeta;
  settings: FertigationSettings;
  nodes: FertigationNode[];
  edges: FertigationEdge[];
}

export type PlantSkidZoneKind = "pump_house" | "pipe_gallery" | "crop_hall" | "fertigation_hut";

export interface PlantSkidPose {
  position: [number, number, number];
  groundY?: number;
  rotationY?: number;
  /** True for working reservoirs set in a below-grade sleeve (commercial NFT). */
  belowGrade?: boolean;
}

export interface PlantSkidStockTankVisual {
  id: string;
  labelKey: string;
  position: [number, number, number];
  volumeL: number;
  color: string;
}

export interface PlantSkidBlueprint {
  id: FertigationTemplateId;
  zoneKind: PlantSkidZoneKind;
  /** Engineering reference for living docs (URL or citation). */
  engineeringRef: string;
  rolePoses: Record<string, PlantSkidPose>;
  stockTanks: PlantSkidStockTankVisual[];
  bounds: { widthM: number; depthM: number };
}

export interface FertigationTemplateDefinition {
  id: FertigationTemplateId;
  nameKey: string;
  subtitleKey: string;
  category: FertigationPresetCategory;
  projectMeta: Pick<FertigationProjectMeta, "name" | "site" | "reference">;
  settings: FertigationSettings;
  buildGraph: () => { nodes: FertigationNode[]; edges: FertigationEdge[] };
  plantSkid: PlantSkidBlueprint;
}

export interface MarketFertigationPreset {
  id: string;
  manufacturer: string;
  model: string;
  templateId: FertigationTemplateId;
  category: FertigationPresetCategory;
  matchedSystems: CultivationSystem[];
  matchedCrops: CropType[];
  reference: string;
}