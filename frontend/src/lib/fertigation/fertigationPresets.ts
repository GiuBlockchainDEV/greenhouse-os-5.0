import type { CultivationSystem } from "@/types/greenhouse";
import type { FertigationTemplateId, MarketFertigationPreset } from "@/types/fertigation";

export const CUSTOM_FERTIGATION_PRESET_ID = "custom";

export const MARKET_FERTIGATION_PRESETS: MarketFertigationPreset[] = [
  {
    id: "priva-nft-dual",
    manufacturer: "Priva",
    model: "NutriJet · dual tank NFT",
    templateId: "nft-dual",
    category: "recirculating",
    matchedSystems: ["nft", "aeroponic"],
    matchedCrops: ["lettuce", "strawberry"],
    reference: "GR-PRIVA-NFT-01",
  },
  {
    id: "ridder-nft-shared",
    manufacturer: "Ridder",
    model: "Synopta · single sump NFT",
    templateId: "nft-shared",
    category: "recirculating",
    matchedSystems: ["nft"],
    matchedCrops: ["lettuce", "strawberry", "cannabis"],
    reference: "GR-RIDDER-NFT-02",
  },
  {
    id: "hoogendoorn-dwc",
    manufacturer: "Hoogendoorn",
    model: "IIVO · DWC recirc",
    templateId: "dwc-recirc",
    category: "recirculating",
    matchedSystems: ["dwc", "ebb_flow"],
    matchedCrops: ["lettuce", "strawberry"],
    reference: "GR-HOOG-DWC-01",
  },
  {
    id: "van-der-hoeven-substrate",
    manufacturer: "Van der Hoeven",
    model: "Van der Aalsvoort · slab drip",
    templateId: "substrate-drip",
    category: "once_through",
    matchedSystems: ["substrate", "growbed"],
    matchedCrops: ["tomato", "pepper", "cucumber"],
    reference: "GR-VDH-SUB-01",
  },
  {
    id: "netafim-multisector",
    manufacturer: "Netafim",
    model: "NMC · 8-sector inline",
    templateId: "inline-drip",
    category: "once_through",
    matchedSystems: ["drip", "soil"],
    matchedCrops: ["tomato", "pepper", "cucumber", "cannabis"],
    reference: "GR-NETAFIM-08",
  },
  {
    id: "growa-qatar-nft",
    manufacturer: "Growa",
    model: "Concept NFT · Qatar house",
    templateId: "nft-dual",
    category: "recirculating",
    matchedSystems: ["nft"],
    matchedCrops: ["lettuce", "tomato"],
    reference: "GR-FRT-001",
  },
];

export function fertigationPresetById(id: string): MarketFertigationPreset | undefined {
  return MARKET_FERTIGATION_PRESETS.find((item) => item.id === id);
}

export function fertigationPresetLabel(preset: MarketFertigationPreset): string {
  return `${preset.manufacturer} ${preset.model}`;
}

const SYSTEM_TEMPLATE_PRIORITY: Record<CultivationSystem, FertigationTemplateId[]> = {
  nft: ["nft-dual", "nft-shared"],
  dwc: ["dwc-recirc", "nft-shared"],
  ebb_flow: ["dwc-recirc", "nft-shared"],
  substrate: ["substrate-drip", "inline-drip"],
  growbed: ["substrate-drip", "inline-drip"],
  drip: ["inline-drip", "substrate-drip"],
  soil: ["inline-drip"],
  aeroponic: ["nft-dual", "nft-shared"],
};

export function suggestedFertigationPresetForSystem(
  system: CultivationSystem,
): MarketFertigationPreset | undefined {
  const candidates = SYSTEM_TEMPLATE_PRIORITY[system] ?? ["inline-drip"];
  for (const templateId of candidates) {
    const match = MARKET_FERTIGATION_PRESETS.find((p) => p.templateId === templateId);
    if (match && match.matchedSystems.includes(system)) {
      return match;
    }
  }
  return MARKET_FERTIGATION_PRESETS.find((p) => p.templateId === candidates[0]);
}