import {
  baseSettings,
  createFertigationEdge,
  createFertigationNode,
} from "@/lib/fertigation/projectFactory";
import { nftSharedPlantSkid } from "@/lib/fertigation/plantSkids/nftSharedSkid";
import type { FertigationTemplateDefinition } from "@/types/fertigation";

export const nftSharedTemplate: FertigationTemplateDefinition = {
  id: "nft-shared",
  nameKey: "templates.nftShared.name",
  subtitleKey: "templates.nftShared.subtitle",
  category: "recirculating",
  projectMeta: {
    name: "Shared-reservoir NFT pilot",
    site: "Engineering reference",
    reference: "GR-FRT-002",
  },
  settings: baseSettings({ ecSet: 1.75 }),
  plantSkid: nftSharedPlantSkid,
  buildGraph: () => ({
    nodes: [
      createFertigationNode("source", "SRC-101", "source", 65, 75, { label: "RO / fresh water" }),
      createFertigationNode("filter", "F-101", "sourceFilter", 255, 75),
      createFertigationNode("valve", "XV-101", "fillValve", 445, 75),
      createFertigationNode("tank", "TK-301", "mixTank", 635, 75, {
        label: "Shared operating tank",
        params: { capacityL: 4200, initialPct: 68, initialEC: 1.52, initialPH: 6.1 },
      }),
      createFertigationNode("pump", "P-301", "mixPump", 65, 250, {
        label: "Nutrient mixing",
        params: { flowDesign: 5, headM: 15, motorKW: 1.5, staticLiftM: 0.5 },
      }),
      createFertigationNode("injector", "INJ-301", "injector", 255, 250),
      createFertigationNode("sensor", "AIT-301", "mixSensor", 445, 250),
      createFertigationNode("flowmeter", "FIT-301", "mixFlow", 635, 250),
      createFertigationNode("pump", "P-303", "cropPump", 255, 425, {
        label: "Independent NFT pump",
        params: { flowDesign: 7.5, headM: 13, staticLiftM: 2 },
      }),
      createFertigationNode("crop", "NFT-301", "crop", 445, 425),
      createFertigationNode("return", "RET-301", "cropReturn", 635, 425),
    ],
    edges: [
      createFertigationEdge("e01", "src-101", "f-101", "source", 50, 10),
      createFertigationEdge("e02", "f-101", "xv-101", "source", 50, 8),
      createFertigationEdge("e03", "xv-101", "tk-301", "source", 50, 8),
      createFertigationEdge("e04", "tk-301", "p-301", "mix", 40, 5, { route: "loop-down" }),
      createFertigationEdge("e05", "p-301", "inj-301", "mix", 40, 7),
      createFertigationEdge("e06", "inj-301", "ait-301", "mix", 40, 5),
      createFertigationEdge("e07", "ait-301", "fit-301", "mix", 40, 4),
      createFertigationEdge("e08", "fit-301", "tk-301", "mix", 40, 8, { route: "loop-up" }),
      createFertigationEdge("e11", "tk-301", "p-303", "crop", 50, 8, { route: "loop-down" }),
      createFertigationEdge("e12", "p-303", "nft-301", "crop", 50, 15),
      createFertigationEdge("e13", "nft-301", "ret-301", "crop", 50, 30),
      createFertigationEdge("e14", "ret-301", "tk-301", "return", 63, 25, { route: "loop-below" }),
    ],
  }),
};