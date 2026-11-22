import type { PlantSkidBlueprint } from "@/types/fertigation";

/** Dual-reservoir NFT headwall · Priva NutriLine / Grow-Tek commercial pump station pattern. */
export const nftDualPlantSkid: PlantSkidBlueprint = {
  id: "nft-dual",
  zoneKind: "pump_house",
  engineeringRef:
    "Grow-Tek NFT pump area + GPN sanitation isolation reservoir; Priva NutriJet mixing chamber loop",
  bounds: { widthM: 22, depthM: 14 },
  stockTanks: [
    {
      id: "stk-a",
      labelKey: "skid.stockA",
      position: [-6.2, 0, -2.2],
      volumeL: 120,
      color: "#2563eb",
    },
    {
      id: "stk-b",
      labelKey: "skid.stockB",
      position: [-4.8, 0, -2.2],
      volumeL: 120,
      color: "#7c3aed",
    },
    {
      id: "stk-acid",
      labelKey: "skid.stockAcid",
      position: [-3.4, 0, -2.2],
      volumeL: 60,
      color: "#dc2626",
    },
  ],
  rolePoses: {
    source: { position: [-8, 0, -5.6] },
    sourceFilter: { position: [-6.4, 0, -5.6] },
    fillValve: { position: [-4.8, 0, -5.6] },
    mixTank: { position: [-1.2, 0, -3.6], belowGrade: true },
    cropTank: { position: [1.8, 0, -3.6], belowGrade: true },
    mixPump: { position: [-4.8, 0, -1.1] },
    injector: { position: [-3.2, 0, -1.1] },
    mixSensor: { position: [-1.6, 0, -1.1] },
    mixFlow: { position: [0, 0, -1.1] },
    transferPump: { position: [2.6, 0, 0.6] },
    cropPump: { position: [4.8, 0, 0.6] },
    crop: { position: [7.4, 0, 5.2] },
    cropReturn: { position: [9, 0, 4.4] },
  },
};