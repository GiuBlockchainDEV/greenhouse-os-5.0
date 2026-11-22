import {
  baseSettings,
  createFertigationEdge,
  createFertigationNode,
} from "@/lib/fertigation/projectFactory";
import type { FertigationTemplateDefinition } from "@/types/fertigation";

export const inlineDripTemplate: FertigationTemplateDefinition = {
  id: "inline-drip",
  nameKey: "templates.inlineDrip.name",
  subtitleKey: "templates.inlineDrip.subtitle",
  category: "once_through",
  projectMeta: {
    name: "8-sector greenhouse fertigation",
    site: "Engineering reference",
    reference: "GR-FRT-003",
  },
  settings: baseSettings({
    ecSet: 2.1,
    sourceFillRate: 3,
    chemicalConcentrationGL: 250,
    autoCrop: false,
  }),
  buildGraph: () => ({
    nodes: [
      createFertigationNode("source", "SRC-101", "source", 65, 75, {
        label: "Well / RO feed",
        params: { availableFlow: 13, sourcePressure: 2.8 },
      }),
      createFertigationNode("filter", "F-101", "sourceFilter", 255, 75, {
        label: "Pre-dosing filter",
        params: { nominalFlow: 12, cleanDP: 0.15 },
      }),
      createFertigationNode("pump", "P-101", "boosterPump", 445, 75, {
        label: "Booster VFD",
        params: { flowDesign: 10, headM: 34, motorKW: 3, staticLiftM: 3 },
      }),
      createFertigationNode("injector", "INJ-101", "injector", 635, 75, {
        label: "4-channel Venturi",
        params: { maxRateLh: 65 },
      }),
      createFertigationNode("sensor", "AIT-101", "mixSensor", 825, 75, { label: "EC / pH sample ring" }),
      createFertigationNode("flowmeter", "FIT-101", "flowMeter", 65, 250, { label: "Main water meter" }),
      createFertigationNode("valve", "XV-101", "masterValve", 255, 250, {
        label: "Master solenoid",
        params: { actuation: "automatic", open: true, failMode: "closed" },
      }),
      createFertigationNode("manifold", "MAN-101", "manifold", 445, 250, { label: "8-zone manifold" }),
      createFertigationNode("crop", "DRIP-101", "crop", 635, 250, {
        label: "Greenhouse irrigation",
        params: {
          system: "drip",
          areaM2: 8000,
          channels: 8,
          uptakeLpd: 0,
          evaporationLpd: 0,
          residenceSeconds: 1,
        },
      }),
      createFertigationNode("valve", "XV-102", "bypassValve", 255, 425, {
        label: "Locked manual bypass",
        params: { actuation: "manual", open: false, failMode: "closed" },
      }),
      createFertigationNode("valve", "XV-103", "isolationBefore", 65, 425, {
        label: "Upstream isolation",
        params: { actuation: "manual", open: true },
      }),
      createFertigationNode("valve", "XV-104", "isolationAfter", 445, 425, {
        label: "Downstream isolation",
        params: { actuation: "manual", open: true },
      }),
    ],
    edges: [
      createFertigationEdge("e01", "src-101", "f-101", "source", 50, 20),
      createFertigationEdge("e02", "f-101", "p-101", "source", 50, 8),
      createFertigationEdge("e03", "p-101", "inj-101", "inline", 40, 4),
      createFertigationEdge("e04", "inj-101", "ait-101", "inline", 40, 6),
      createFertigationEdge("e05", "ait-101", "fit-101", "inline", 40, 5, { route: "loop-down" }),
      createFertigationEdge("e06", "fit-101", "xv-103", "inline", 40, 4, { route: "loop-down" }),
      createFertigationEdge("e07", "xv-103", "xv-101", "inline", 40, 3, { route: "loop-up" }),
      createFertigationEdge("e08", "xv-101", "xv-104", "inline", 40, 3, { route: "loop-down" }),
      createFertigationEdge("e09", "xv-104", "man-101", "inline", 40, 5, { route: "loop-up" }),
      createFertigationEdge("e10", "man-101", "drip-101", "inline", 40, 25),
      createFertigationEdge("e11", "fit-101", "xv-102", "bypass", 40, 5, { route: "loop-down" }),
      createFertigationEdge("e12", "xv-102", "man-101", "bypass", 40, 6, { route: "loop-up" }),
    ],
  }),
};