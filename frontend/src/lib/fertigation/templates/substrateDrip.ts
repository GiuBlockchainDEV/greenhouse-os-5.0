import {
  baseSettings,
  createFertigationEdge,
  createFertigationNode,
} from "@/lib/fertigation/projectFactory";
import type { FertigationTemplateDefinition } from "@/types/fertigation";

/** Rockwool / slab drain-to-waste with 8 sectors (Priva-style field delivery). */
export const substrateDripTemplate: FertigationTemplateDefinition = {
  id: "substrate-drip",
  nameKey: "templates.substrateDrip.name",
  subtitleKey: "templates.substrateDrip.subtitle",
  category: "once_through",
  projectMeta: {
    name: "Substrate drip · slab gutters",
    site: "GreenhouseOS reference",
    reference: "GR-FRT-004",
  },
  settings: baseSettings({
    ecSet: 2.0,
    phSet: 5.6,
    chemicalConcentrationGL: 180,
    autoCrop: false,
  }),
  buildGraph: () => ({
    nodes: [
      createFertigationNode("source", "SRC-101", "source", 65, 75, { label: "RO / blended water" }),
      createFertigationNode("filter", "F-101", "sourceFilter", 255, 75),
      createFertigationNode("pump", "P-101", "boosterPump", 445, 75, {
        label: "Irrigation booster",
        params: { flowDesign: 8.5, headM: 28, motorKW: 2.2, staticLiftM: 2.5 },
      }),
      createFertigationNode("injector", "INJ-101", "injector", 635, 75),
      createFertigationNode("sensor", "AIT-101", "mixSensor", 825, 75),
      createFertigationNode("flowmeter", "FIT-101", "flowMeter", 65, 250),
      createFertigationNode("valve", "XV-101", "masterValve", 255, 250),
      createFertigationNode("manifold", "MAN-101", "manifold", 445, 250, {
        label: "Gutter sectors",
        params: { sectors: 6, sectorFlowM3h: 1.8 },
      }),
      createFertigationNode("crop", "SUB-101", "crop", 635, 250, {
        label: "Substrate slabs",
        params: {
          system: "substrate",
          areaM2: 4200,
          channels: 6,
          uptakeLpd: 2200,
          evaporationLpd: 120,
          residenceSeconds: 2,
        },
      }),
    ],
    edges: [
      createFertigationEdge("e01", "src-101", "f-101", "source", 50, 16),
      createFertigationEdge("e02", "f-101", "p-101", "source", 50, 6),
      createFertigationEdge("e03", "p-101", "inj-101", "inline", 40, 4),
      createFertigationEdge("e04", "inj-101", "ait-101", "inline", 40, 6),
      createFertigationEdge("e05", "ait-101", "fit-101", "inline", 40, 5, { route: "loop-down" }),
      createFertigationEdge("e06", "fit-101", "xv-101", "inline", 40, 3),
      createFertigationEdge("e07", "xv-101", "man-101", "inline", 40, 4),
      createFertigationEdge("e08", "man-101", "sub-101", "inline", 40, 22),
    ],
  }),
};