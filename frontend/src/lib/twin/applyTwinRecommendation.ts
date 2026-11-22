import { normalizeHafFanCount } from "@/lib/climateEquipmentLayout";
import { useGreenhouseStore } from "@/store/useGreenhouseStore";
import type { TwinRecommendation } from "@/lib/twin/offlineTwinAdvisor";

export function applyTwinRecommendation(recommendation: TwinRecommendation): void {
  const store = useGreenhouseStore.getState();
  const { action } = recommendation;

  switch (action.kind) {
    case "climateScenario":
      if (Object.keys(action.patch).length > 0) {
        store.setClimateScenario(action.patch);
      }
      break;
    case "shadingScreen": {
      const screenPatch = { ...action.patch };
      if ((screenPatch.deploymentPct ?? 0) > 0) {
        screenPatch.installed = true;
      }
      store.setShadingScreen(screenPatch);
      break;
    }
    case "equipmentSizing": {
      const patch = { ...action.patch };
      if (patch.circulationFanCount !== undefined) {
        patch.circulationFanCount = normalizeHafFanCount(
          patch.circulationFanCount,
          store.structure.bayCount,
        ).total;
      }
      store.setClimateEquipmentSizing(patch);
      break;
    }
    case "equipmentMode":
      store.setClimateEquipment(action.patch);
      break;
    default:
      break;
  }
}