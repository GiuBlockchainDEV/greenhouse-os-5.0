import {
  baseSettings,
  createFertigationEdge,
  createFertigationNode,
} from "@/lib/fertigation/projectFactory";
import { nftDualPlantSkid } from "@/lib/fertigation/plantSkids/nftDualSkid";
import type { FertigationTemplateDefinition } from "@/types/fertigation";

export const nftDualTemplate: FertigationTemplateDefinition = {
  id: "nft-dual",
  nameKey: "templates.nftDual.name",
  subtitleKey: "templates.nftDual.subtitle",
  category: "recirculating",
  projectMeta: {
    name: "Al Wukair · NFT House 01",
    site: "Qatar · Concept engineering",
    reference: "GR-FRT-001",
  },
  settings: baseSettings(),
  plantSkid: nftDualPlantSkid,
  buildGraph: () => ({
    nodes: [
      createFertigationNode("source", "SRC-101", "source", 65, 75, { label: "Well / RO supply" }),
      createFertigationNode("filter", "F-101", "sourceFilter", 255, 75, { label: "Source filtration" }),
      createFertigationNode("valve", "XV-101", "fillValve", 445, 75, { label: "Make-up inlet" }),
      createFertigationNode("tank", "TK-301", "mixTank", 635, 75, {
        label: "Mixing reservoir",
        params: { capacityL: 3000, initialPct: 64, initialEC: 1.48, initialPH: 6.15 },
      }),
      createFertigationNode("pump", "P-301", "mixPump", 65, 250, {
        label: "Mixing circulation",
        params: { flowDesign: 5.8, headM: 16, motorKW: 1.5, staticLiftM: 0.6 },
      }),
      createFertigationNode("injector", "INJ-301", "injector", 255, 250, { label: "A / B / C / D Venturi" }),
      createFertigationNode("sensor", "AIT-301", "mixSensor", 445, 250, { label: "EC / pH analyser" }),
      createFertigationNode("flowmeter", "FIT-301", "mixFlow", 635, 250, { label: "Mixing flow proof" }),
      createFertigationNode("pump", "P-302", "transferPump", 65, 425, {
        label: "Validated transfer",
        params: { flowDesign: 3.2, headM: 18, motorKW: 1.1 },
      }),
      createFertigationNode("tank", "TK-302", "cropTank", 255, 425, {
        label: "NFT operating tank",
        params: { capacityL: 2300, initialPct: 70, initialEC: 1.63, initialPH: 6.06 },
      }),
      createFertigationNode("pump", "P-303", "cropPump", 445, 425, {
        label: "Crop circulation",
        params: { flowDesign: 7.5, headM: 13, motorKW: 1.5, staticLiftM: 2.2 },
      }),
      createFertigationNode("crop", "NFT-301", "crop", 635, 425, {
        label: "NFT cultivation",
        params: {
          system: "nft",
          areaM2: 350,
          channels: 24,
          uptakeLpd: 640,
          evaporationLpd: 50,
          residenceSeconds: 40,
        },
      }),
      createFertigationNode("return", "RET-301", "cropReturn", 825, 425, { label: "Gravity return" }),
    ],
    edges: [
      createFertigationEdge("e01", "src-101", "f-101", "source", 50, 12),
      createFertigationEdge("e02", "f-101", "xv-101", "source", 50, 8),
      createFertigationEdge("e03", "xv-101", "tk-301", "source", 50, 8),
      createFertigationEdge("e04", "tk-301", "p-301", "mix", 40, 5, { route: "loop-down" }),
      createFertigationEdge("e05", "p-301", "inj-301", "mix", 40, 7),
      createFertigationEdge("e06", "inj-301", "ait-301", "mix", 40, 5),
      createFertigationEdge("e07", "ait-301", "fit-301", "mix", 40, 4),
      createFertigationEdge("e08", "fit-301", "tk-301", "mix", 40, 8, { route: "loop-up" }),
      createFertigationEdge("e09", "tk-301", "p-302", "transfer", 32, 8, { route: "loop-down" }),
      createFertigationEdge("e10", "p-302", "tk-302", "transfer", 32, 9),
      createFertigationEdge("e11", "tk-302", "p-303", "crop", 50, 5),
      createFertigationEdge("e12", "p-303", "nft-301", "crop", 50, 20),
      createFertigationEdge("e13", "nft-301", "ret-301", "crop", 50, 30),
      createFertigationEdge("e14", "ret-301", "tk-302", "return", 63, 25, { route: "loop-below" }),
    ],
  }),
};