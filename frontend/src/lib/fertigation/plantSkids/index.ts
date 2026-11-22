import { dwcRecircPlantSkid } from "@/lib/fertigation/plantSkids/dwcRecircSkid";
import { inlineDripPlantSkid } from "@/lib/fertigation/plantSkids/inlineDripSkid";
import { nftDualPlantSkid } from "@/lib/fertigation/plantSkids/nftDualSkid";
import { nftSharedPlantSkid } from "@/lib/fertigation/plantSkids/nftSharedSkid";
import { substrateDripPlantSkid } from "@/lib/fertigation/plantSkids/substrateDripSkid";
import type { FertigationTemplateId, PlantSkidBlueprint } from "@/types/fertigation";

export const PLANT_SKIDS: Record<FertigationTemplateId, PlantSkidBlueprint> = {
  "nft-dual": nftDualPlantSkid,
  "nft-shared": nftSharedPlantSkid,
  "dwc-recirc": dwcRecircPlantSkid,
  "substrate-drip": substrateDripPlantSkid,
  "inline-drip": inlineDripPlantSkid,
};

export function plantSkidForTemplate(templateId: FertigationTemplateId): PlantSkidBlueprint {
  return PLANT_SKIDS[templateId];
}