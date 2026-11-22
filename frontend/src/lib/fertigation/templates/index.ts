import { dwcRecircTemplate } from "@/lib/fertigation/templates/dwcRecirc";
import { inlineDripTemplate } from "@/lib/fertigation/templates/inlineDrip";
import { nftDualTemplate } from "@/lib/fertigation/templates/nftDual";
import { nftSharedTemplate } from "@/lib/fertigation/templates/nftShared";
import { substrateDripTemplate } from "@/lib/fertigation/templates/substrateDrip";
import type { FertigationTemplateDefinition, FertigationTemplateId } from "@/types/fertigation";

const ORDER: FertigationTemplateId[] = [
  "nft-dual",
  "nft-shared",
  "dwc-recirc",
  "substrate-drip",
  "inline-drip",
];

export const FERTIGATION_TEMPLATES: Record<
  FertigationTemplateId,
  FertigationTemplateDefinition
> = {
  "nft-dual": nftDualTemplate,
  "nft-shared": nftSharedTemplate,
  "inline-drip": inlineDripTemplate,
  "substrate-drip": substrateDripTemplate,
  "dwc-recirc": dwcRecircTemplate,
};

export const FERTIGATION_TEMPLATE_LIST: FertigationTemplateDefinition[] = ORDER.map(
  (id) => FERTIGATION_TEMPLATES[id],
);

export function fertigationTemplateById(
  id: FertigationTemplateId,
): FertigationTemplateDefinition {
  return FERTIGATION_TEMPLATES[id];
}