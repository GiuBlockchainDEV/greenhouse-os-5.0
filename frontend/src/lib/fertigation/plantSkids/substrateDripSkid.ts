import type { PlantSkidBlueprint } from "@/types/fertigation";

/** Rockwool slab drip once-through · compact fertigation hut + drain trench. */
export const substrateDripPlantSkid: PlantSkidBlueprint = {
  id: "substrate-drip",
  zoneKind: "fertigation_hut",
  engineeringRef: "UF/IFAS CV263 rockwool twin rows + UF CV195 proportioner hut",
  bounds: { widthM: 18, depthM: 12 },
  stockTanks: [
    { id: "stk-a", labelKey: "skid.stockA", position: [-6.8, 0, -1.2], volumeL: 115, color: "#2563eb" },
    { id: "stk-b", labelKey: "skid.stockB", position: [-5.4, 0, -1.2], volumeL: 115, color: "#7c3aed" },
    { id: "stk-acid", labelKey: "skid.stockAcid", position: [-4, 0, -1.2], volumeL: 60, color: "#dc2626" },
  ],
  rolePoses: {
    source: { position: [-7, 0, -2.2] },
    sourceFilter: { position: [-5.5, 0, -2.2] },
    boosterPump: { position: [-4, 0, -2.2] },
    injector: { position: [-2.5, 0, -2.2] },
    mixSensor: { position: [-1, 0, -2.2] },
    flowMeter: { position: [0.5, 0, -2.2] },
    masterValve: { position: [2, 0, -2.2] },
    manifold: { position: [3.5, 0, -2.2] },
    crop: { position: [6.2, 0, 3.4] },
  },
};