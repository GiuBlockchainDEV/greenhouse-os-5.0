import type { PlantSkidBlueprint } from "@/types/fertigation";

/** Netafim NetaJet / inline bypass on pressurized main · pipe gallery + zone manifold. */
export const inlineDripPlantSkid: PlantSkidBlueprint = {
  id: "inline-drip",
  zoneKind: "pipe_gallery",
  engineeringRef: "Netafim NetaJet 4G inline/bypass on main; Agrowtek VXP zone manifold",
  bounds: { widthM: 22, depthM: 12 },
  stockTanks: [
    { id: "stk-a", labelKey: "skid.stockA", position: [-8.5, 0, 2.4], volumeL: 200, color: "#2563eb" },
    { id: "stk-b", labelKey: "skid.stockB", position: [-7.1, 0, 2.4], volumeL: 200, color: "#7c3aed" },
    { id: "stk-acid", labelKey: "skid.stockAcid", position: [-5.7, 0, 2.4], volumeL: 100, color: "#dc2626" },
  ],
  rolePoses: {
    source: { position: [-9.2, 0, 0] },
    sourceFilter: { position: [-7.6, 0, 0] },
    boosterPump: { position: [-6, 0, 0] },
    injector: { position: [-4.4, 0, 0] },
    mixSensor: { position: [-2.8, 0, 0] },
    flowMeter: { position: [-1.2, 0, 0] },
    isolationBefore: { position: [-1, 0, -2.6] },
    masterValve: { position: [0.4, 0, 0] },
    bypassValve: { position: [1.8, 0, -2.6] },
    isolationAfter: { position: [4.2, 0, -2.6] },
    manifold: { position: [2.6, 0, 0] },
    crop: { position: [6.8, 0, 4.2] },
  },
};