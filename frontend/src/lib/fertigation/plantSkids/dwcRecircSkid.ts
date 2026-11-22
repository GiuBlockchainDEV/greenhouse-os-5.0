import type { PlantSkidBlueprint } from "@/types/fertigation";

/** DWC deep-flow · large sump + raft circulation loop. */
export const dwcRecircPlantSkid: PlantSkidBlueprint = {
  id: "dwc-recirc",
  zoneKind: "pump_house",
  engineeringRef: "SPES-463 NFT/DWC reservoir as lowest point with submersible or pad pump",
  bounds: { widthM: 20, depthM: 14 },
  stockTanks: [
    { id: "stk-a", labelKey: "skid.stockA", position: [-5.2, 0, -1.6], volumeL: 150, color: "#2563eb" },
    { id: "stk-b", labelKey: "skid.stockB", position: [-3.8, 0, -1.6], volumeL: 150, color: "#7c3aed" },
    { id: "stk-acid", labelKey: "skid.stockAcid", position: [-2.4, 0, -1.6], volumeL: 80, color: "#dc2626" },
  ],
  rolePoses: {
    source: { position: [-7, 0, -5] },
    sourceFilter: { position: [-5.4, 0, -5] },
    fillValve: { position: [-3.8, 0, -5] },
    mixTank: { position: [0, 0, -3.8], belowGrade: true },
    mixPump: { position: [-4.2, 0, -0.6] },
    injector: { position: [-2.6, 0, -0.6] },
    mixSensor: { position: [-1, 0, -0.6] },
    cropPump: { position: [3.4, 0, 0.2] },
    crop: { position: [7, 0, 5.4] },
    cropReturn: { position: [8.6, 0, 4.6] },
  },
};