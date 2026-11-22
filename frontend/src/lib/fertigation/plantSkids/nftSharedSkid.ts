import type { PlantSkidBlueprint } from "@/types/fertigation";

/** Single-sump NFT · below-grade reservoir at greenhouse headwall. */
export const nftSharedPlantSkid: PlantSkidBlueprint = {
  id: "nft-shared",
  zoneKind: "pump_house",
  engineeringRef: "Virginia Tech SPES-463 NFT reservoir lowest point + Grow-Tek tank pit",
  bounds: { widthM: 20, depthM: 13 },
  stockTanks: [
    { id: "stk-a", labelKey: "skid.stockA", position: [-5.5, 0, -1.8], volumeL: 120, color: "#2563eb" },
    { id: "stk-b", labelKey: "skid.stockB", position: [-4.2, 0, -1.8], volumeL: 120, color: "#7c3aed" },
    { id: "stk-acid", labelKey: "skid.stockAcid", position: [-2.9, 0, -1.8], volumeL: 60, color: "#dc2626" },
  ],
  rolePoses: {
    source: { position: [-7.2, 0, -5.2] },
    sourceFilter: { position: [-5.6, 0, -5.2] },
    fillValve: { position: [-4, 0, -5.2] },
    mixTank: { position: [0.2, 0, -3.4], belowGrade: true },
    mixPump: { position: [-4.4, 0, -0.8] },
    injector: { position: [-2.8, 0, -0.8] },
    mixSensor: { position: [-1.2, 0, -0.8] },
    mixFlow: { position: [0.4, 0, -0.8] },
    cropPump: { position: [3.2, 0, 0.4] },
    crop: { position: [6.6, 0, 4.8] },
    cropReturn: { position: [8.2, 0, 4] },
  },
};