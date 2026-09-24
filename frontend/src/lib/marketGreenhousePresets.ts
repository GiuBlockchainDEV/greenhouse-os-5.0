/**
 * Commercial greenhouse models that can be loaded instead of a custom design.
 * Dimensions follow published bay modules (Venlo 8.00 / 9.60 / 12.80 m, gothic multispan).
 */

import { DEFAULT_CLIMATE_SIZING, normalizeHafFanCount } from "@/lib/climateEquipmentLayout";
import type {
  ClimateEquipment,
  CoveringMaterial,
  CropType,
  CultivationSystem,
  GreenhouseStructure,
} from "@/types/greenhouse";

export const CUSTOM_GREENHOUSE_PRESET_ID = "custom";

export interface MarketGreenhousePreset {
  id: string;
  manufacturer: string;
  model: string;
  structure: GreenhouseStructure;
  lengthM: number;
  eaveM: number;
  ridgeM: number;
  covering: CoveringMaterial;
  screen: boolean;
  crop: CropType;
  system: CultivationSystem;
  lai: number;
  bedsPerBay: number;
  equipment: ClimateEquipment;
}

const COVER: Record<CoveringMaterial["type"], CoveringMaterial> = {
  glass: { type: "glass", transmittance: 0.85, uValue: 5.8 },
  polycarbonate: { type: "polycarbonate", transmittance: 0.78, uValue: 3.3 },
  polyethylene: { type: "polyethylene", transmittance: 0.72, uValue: 6.5 },
  etfe: { type: "etfe", transmittance: 0.92, uValue: 4.2 },
};

interface Spec {
  id: string;
  manufacturer: string;
  model: string;
  bays: number;
  bayM: number;
  arch: GreenhouseStructure["archType"];
  lengthM: number;
  eaveM: number;
  ridgeM: number;
  cover: CoveringMaterial["type"];
  screen: boolean;
  crop: CropType;
  system: CultivationSystem;
  lai: number;
  beds: number;
  cooling: ClimateEquipment["cooling"];
  heating: ClimateEquipment["heating"];
  ventilation: ClimateEquipment["ventilation"];
}

function equipmentFor(spec: Spec): ClimateEquipment {
  const width = spec.bays * spec.bayM;
  const area = width * spec.lengthM;
  const sizing = { ...DEFAULT_CLIMATE_SIZING };
  sizing.circulationFanCount = normalizeHafFanCount(spec.bays * 4, spec.bays).total;
  sizing.padWallWidthM = Number((width * 0.9).toFixed(1));
  sizing.padWallHeightM = Math.min(2, Math.max(1.2, spec.eaveM - 0.8));
  sizing.exhaustFanCount =
    spec.cooling === "fan_and_pad" || spec.ventilation === "forced_exhaust" || spec.ventilation === "combined"
      ? Math.min(24, Math.max(2, Math.round(width / 3)))
      : 0;
  sizing.roofExhaustFanCount = spec.ventilation === "combined" ? Math.max(1, Math.round(spec.bays / 2)) : 0;
  sizing.acUnitCount = spec.cooling === "mechanical_ac" ? Math.max(2, Math.round(area / 1800)) : 0;
  sizing.fogLineCount = spec.cooling === "high_pressure_fog" ? spec.bays : 0;
  const usesRoof =
    spec.ventilation === "roof_vents" ||
    spec.ventilation === "natural_ridge" ||
    spec.ventilation === "combined";
  sizing.roofVentCount = usesRoof ? Math.min(24, Math.max(spec.bays, Math.round(spec.lengthM / 10))) : 0;
  const usesSide = spec.ventilation === "side_vents" || spec.ventilation === "combined";
  sizing.sideVentCount = usesSide ? Math.max(2, spec.bays) : 0;
  sizing.pipeRowCount = spec.heating === "hot_water_pipes" ? Math.min(6, Math.max(2, spec.bays)) : 0;
  sizing.heaterUnitCount =
    spec.heating === "unit_heater" || spec.heating === "air_heater"
      ? Math.max(2, Math.round(area / 700))
      : 0;
  return {
    cooling: spec.cooling,
    heating: spec.heating,
    ventilation: spec.ventilation,
    sizing,
  };
}

function preset(spec: Spec): MarketGreenhousePreset {
  return {
    id: spec.id,
    manufacturer: spec.manufacturer,
    model: spec.model,
    structure: { bayCount: spec.bays, bayWidthM: spec.bayM, archType: spec.arch },
    lengthM: spec.lengthM,
    eaveM: spec.eaveM,
    ridgeM: spec.ridgeM,
    covering: COVER[spec.cover],
    screen: spec.screen,
    crop: spec.crop,
    system: spec.system,
    lai: spec.lai,
    bedsPerBay: spec.beds,
    equipment: equipmentFor(spec),
  };
}

const SPECS: Spec[] = [
  { id: "vdh-venlo-8", manufacturer: "Van der Hoeven", model: "Venlo 8.00", bays: 8, bayM: 8, arch: "triangular", lengthM: 96, eaveM: 5, ridgeM: 6.6, cover: "glass", screen: true, crop: "tomato", system: "substrate", lai: 3.4, beds: 4, cooling: "none", heating: "hot_water_pipes", ventilation: "roof_vents" },
  { id: "dalsem-venlo-96", manufacturer: "Dalsem", model: "Venlo 9.60", bays: 6, bayM: 9.6, arch: "triangular", lengthM: 120, eaveM: 5.5, ridgeM: 7.3, cover: "glass", screen: true, crop: "tomato", system: "substrate", lai: 3.5, beds: 5, cooling: "none", heating: "hot_water_pipes", ventilation: "roof_vents" },
  { id: "kubo-ultra-clima", manufacturer: "Kubo", model: "Ultra-Clima", bays: 8, bayM: 8, arch: "triangular", lengthM: 128, eaveM: 6.5, ridgeM: 8.1, cover: "glass", screen: true, crop: "tomato", system: "substrate", lai: 3.6, beds: 4, cooling: "mechanical_ac", heating: "hot_water_pipes", ventilation: "combined" },
  { id: "certhon-suprimair", manufacturer: "Certhon", model: "SuprimAir", bays: 6, bayM: 9.6, arch: "triangular", lengthM: 144, eaveM: 7, ridgeM: 8.8, cover: "glass", screen: true, crop: "pepper", system: "substrate", lai: 3.2, beds: 5, cooling: "mechanical_ac", heating: "hot_water_pipes", ventilation: "combined" },
  { id: "havecon-highwire", manufacturer: "Havecon", model: "High-wire Venlo", bays: 10, bayM: 8, arch: "triangular", lengthM: 160, eaveM: 6.5, ridgeM: 8.1, cover: "glass", screen: true, crop: "tomato", system: "substrate", lai: 3.8, beds: 4, cooling: "none", heating: "hot_water_pipes", ventilation: "roof_vents" },
  { id: "vdh-moduleair", manufacturer: "Van der Hoeven", model: "ModuleAir", bays: 8, bayM: 9.6, arch: "triangular", lengthM: 115, eaveM: 6, ridgeM: 7.8, cover: "glass", screen: true, crop: "cucumber", system: "substrate", lai: 3.3, beds: 5, cooling: "none", heating: "hot_water_pipes", ventilation: "combined" },
  { id: "alweco-cabrio", manufacturer: "Alweco", model: "Cabrio", bays: 6, bayM: 8, arch: "triangular", lengthM: 80, eaveM: 4.5, ridgeM: 6.1, cover: "glass", screen: true, crop: "lettuce", system: "nft", lai: 2.2, beds: 6, cooling: "none", heating: "hot_water_pipes", ventilation: "roof_vents" },
  { id: "deforche-1280", manufacturer: "Deforche", model: "Venlo 12.80", bays: 4, bayM: 12.8, arch: "triangular", lengthM: 100, eaveM: 6, ridgeM: 8.2, cover: "glass", screen: true, crop: "tomato", system: "substrate", lai: 3.4, beds: 6, cooling: "none", heating: "hot_water_pipes", ventilation: "roof_vents" },
  { id: "richel-960", manufacturer: "Richel", model: "960 Multispan", bays: 4, bayM: 9.6, arch: "semicircular", lengthM: 50, eaveM: 4, ridgeM: 6.8, cover: "polyethylene", screen: false, crop: "tomato", system: "soil", lai: 3, beds: 4, cooling: "none", heating: "none", ventilation: "combined" },
  { id: "richel-ov90", manufacturer: "Richel", model: "OV90", bays: 5, bayM: 9.6, arch: "semicircular", lengthM: 60, eaveM: 4.5, ridgeM: 7.2, cover: "polyethylene", screen: true, crop: "pepper", system: "substrate", lai: 3.1, beds: 4, cooling: "fan_and_pad", heating: "none", ventilation: "forced_exhaust" },
  { id: "harnois-ovaltech", manufacturer: "Harnois", model: "Ovaltech", bays: 1, bayM: 9.6, arch: "semicircular", lengthM: 30, eaveM: 2.4, ridgeM: 4.6, cover: "polyethylene", screen: false, crop: "cucumber", system: "soil", lai: 2.6, beds: 4, cooling: "none", heating: "none", ventilation: "side_vents" },
  { id: "haygrove-multibay", manufacturer: "Haygrove", model: "Multibay", bays: 8, bayM: 8, arch: "semicircular", lengthM: 100, eaveM: 2.5, ridgeM: 4.4, cover: "polyethylene", screen: false, crop: "strawberry", system: "substrate", lai: 2.4, beds: 4, cooling: "none", heating: "none", ventilation: "side_vents" },
  { id: "rovero-rollair", manufacturer: "Rovero", model: "Roll-Air", bays: 4, bayM: 9.6, arch: "semicircular", lengthM: 64, eaveM: 3.2, ridgeM: 5.6, cover: "polyethylene", screen: true, crop: "lettuce", system: "nft", lai: 2, beds: 5, cooling: "none", heating: "none", ventilation: "combined" },
  { id: "lucchini-atlantic", manufacturer: "Idromeccanica Lucchini", model: "Atlantic", bays: 4, bayM: 9, arch: "semicircular", lengthM: 48, eaveM: 3.5, ridgeM: 6, cover: "polyethylene", screen: false, crop: "tomato", system: "soil", lai: 3, beds: 4, cooling: "none", heating: "air_heater", ventilation: "combined" },
  { id: "europrogress-multy", manufacturer: "Europrogress", model: "MultyAtlant", bays: 5, bayM: 8, arch: "semicircular", lengthM: 40, eaveM: 3, ridgeM: 5.2, cover: "polyethylene", screen: false, crop: "pepper", system: "soil", lai: 2.8, beds: 4, cooling: "none", heating: "none", ventilation: "combined" },
  { id: "jhuete-multitunnel", manufacturer: "J. Huete", model: "Multitúnel", bays: 6, bayM: 8, arch: "semicircular", lengthM: 56, eaveM: 4, ridgeM: 6.2, cover: "polyethylene", screen: true, crop: "tomato", system: "substrate", lai: 3.2, beds: 4, cooling: "fan_and_pad", heating: "none", ventilation: "forced_exhaust" },
  { id: "novagric-gothic", manufacturer: "Novagric", model: "Gótico", bays: 4, bayM: 9.6, arch: "semicircular", lengthM: 64, eaveM: 4, ridgeM: 6.6, cover: "polyethylene", screen: true, crop: "pepper", system: "substrate", lai: 3, beds: 4, cooling: "fan_and_pad", heating: "none", ventilation: "forced_exhaust" },
  { id: "cravo-retractable", manufacturer: "Cravo", model: "Retractable roof", bays: 6, bayM: 8, arch: "triangular", lengthM: 72, eaveM: 4, ridgeM: 5.6, cover: "polyethylene", screen: false, crop: "lettuce", system: "nft", lai: 2.1, beds: 6, cooling: "none", heating: "none", ventilation: "side_vents" },
  { id: "nexus-gothic", manufacturer: "Nexus", model: "Gothic gutter-connect", bays: 4, bayM: 9, arch: "semicircular", lengthM: 44, eaveM: 3.7, ridgeM: 6, cover: "polycarbonate", screen: true, crop: "cannabis", system: "substrate", lai: 2.8, beds: 4, cooling: "mechanical_ac", heating: "unit_heater", ventilation: "combined" },
  { id: "conley-widespan", manufacturer: "Conley's", model: "Commercial wide span", bays: 3, bayM: 12, arch: "triangular", lengthM: 48, eaveM: 3.7, ridgeM: 6.5, cover: "polycarbonate", screen: true, crop: "tomato", system: "substrate", lai: 3, beds: 6, cooling: "none", heating: "unit_heater", ventilation: "roof_vents" },
  { id: "bc-commercial", manufacturer: "BC Greenhouse", model: "Commercial gothic", bays: 2, bayM: 8, arch: "semicircular", lengthM: 24, eaveM: 2.4, ridgeM: 4.2, cover: "polycarbonate", screen: false, crop: "cucumber", system: "soil", lai: 2.4, beds: 3, cooling: "none", heating: "unit_heater", ventilation: "side_vents" },
  { id: "texlon-etfe", manufacturer: "Vector Foiltec", model: "Texlon ETFE", bays: 4, bayM: 8, arch: "triangular", lengthM: 40, eaveM: 6, ridgeM: 8, cover: "etfe", screen: false, crop: "lettuce", system: "nft", lai: 2, beds: 5, cooling: "none", heating: "hot_water_pipes", ventilation: "natural_ridge" },
  { id: "agra-mega", manufacturer: "Agra Tech", model: "Mega Tunnel", bays: 3, bayM: 9, arch: "semicircular", lengthM: 36, eaveM: 2.4, ridgeM: 4.8, cover: "polyethylene", screen: false, crop: "strawberry", system: "substrate", lai: 2.2, beds: 4, cooling: "none", heating: "none", ventilation: "side_vents" },
  { id: "prospiant-venlo", manufacturer: "Prospiant", model: "Glass gutter Venlo", bays: 6, bayM: 8, arch: "triangular", lengthM: 64, eaveM: 4.5, ridgeM: 6, cover: "glass", screen: true, crop: "tomato", system: "substrate", lai: 3.2, beds: 4, cooling: "none", heating: "hot_water_pipes", ventilation: "roof_vents" },
];

export const MARKET_GREENHOUSE_PRESETS: MarketGreenhousePreset[] = SPECS.map(preset);

export function marketPresetById(id: string): MarketGreenhousePreset | undefined {
  return MARKET_GREENHOUSE_PRESETS.find((item) => item.id === id);
}

export function marketPresetLabel(presetItem: MarketGreenhousePreset): string {
  return `${presetItem.manufacturer} ${presetItem.model}`;
}
