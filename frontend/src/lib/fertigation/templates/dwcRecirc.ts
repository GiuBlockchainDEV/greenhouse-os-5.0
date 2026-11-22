import {
  baseSettings,
  createFertigationEdge,
  createFertigationNode,
} from "@/lib/fertigation/projectFactory";
import type { FertigationTemplateDefinition } from "@/types/fertigation";

/** DWC rafts with conditioning tank + circulation (shared reservoir topology). */
export const dwcRecircTemplate: FertigationTemplateDefinition = {
  id: "dwc-recirc",
  nameKey: "templates.dwcRecirc.name",
  subtitleKey: "templates.dwcRecirc.subtitle",
  category: "recirculating",
  projectMeta: {
    name: "DWC deep-flow · recirculating",
    site: "GreenhouseOS reference",
    reference: "GR-FRT-005",
  },
  settings: baseSettings({ ecSet: 1.65, phSet: 6.0, cropTargetPct: 75 }),
  buildGraph: () => ({
    nodes: [
      createFertigationNode("source", "SRC-101", "source", 65, 75),
      createFertigationNode("filter", "F-101", "sourceFilter", 255, 75),
      createFertigationNode("valve", "XV-101", "fillValve", 445, 75),
      createFertigationNode("tank", "TK-301", "mixTank", 635, 75, {
        label: "DWC sump / conditioning",
        params: { capacityL: 6500, initialPct: 72, initialEC: 1.6, initialPH: 6.02 },
      }),
      createFertigationNode("pump", "P-301", "mixPump", 65, 250, {
        params: { flowDesign: 11, headM: 12, motorKW: 2.2, staticLiftM: 0.4 },
      }),
      createFertigationNode("injector", "INJ-301", "injector", 255, 250),
      createFertigationNode("sensor", "AIT-301", "mixSensor", 445, 250),
      createFertigationNode("pump", "P-303", "cropPump", 255, 425, {
        label: "Raft circulation",
        params: { flowDesign: 9, headM: 10, motorKW: 1.5, staticLiftM: 0.8 },
      }),
      createFertigationNode("crop", "DWC-301", "crop", 445, 425, {
        label: "Floating rafts",
        params: {
          system: "dwc",
          areaM2: 2200,
          channels: 18,
          uptakeLpd: 480,
          evaporationLpd: 210,
          residenceSeconds: 180,
        },
      }),
      createFertigationNode("return", "RET-301", "cropReturn", 635, 425),
    ],
    edges: [
      createFertigationEdge("e01", "src-101", "f-101", "source", 50, 10),
      createFertigationEdge("e02", "f-101", "xv-101", "source", 50, 8),
      createFertigationEdge("e03", "xv-101", "tk-301", "source", 50, 8),
      createFertigationEdge("e04", "tk-301", "p-301", "mix", 40, 5, { route: "loop-down" }),
      createFertigationEdge("e05", "p-301", "inj-301", "mix", 40, 6),
      createFertigationEdge("e06", "inj-301", "ait-301", "mix", 40, 5),
      createFertigationEdge("e07", "ait-301", "tk-301", "mix", 40, 8, { route: "loop-up" }),
      createFertigationEdge("e11", "tk-301", "p-303", "crop", 50, 8, { route: "loop-down" }),
      createFertigationEdge("e12", "p-303", "dwc-301", "crop", 50, 18),
      createFertigationEdge("e13", "dwc-301", "ret-301", "crop", 50, 24),
      createFertigationEdge("e14", "ret-301", "tk-301", "return", 63, 20, { route: "loop-below" }),
    ],
  }),
};