import type { TwinRecommendation } from "@/lib/twin/offlineTwinAdvisor";

/** Recommendations that mutate equipment, screens, or scenario (not empty no-ops). */
export function isActionableTwinRecommendation(rec: TwinRecommendation): boolean {
  if (rec.id === "stable-ok") {
    return false;
  }
  if (rec.action.kind === "climateScenario") {
    return Object.keys(rec.action.patch).length > 0;
  }
  return true;
}

/** Engineering fixes the user expects from “apply fixes” (excludes low-priority what-if tweaks). */
export function isFixPackTwinRecommendation(rec: TwinRecommendation): boolean {
  if (!isActionableTwinRecommendation(rec)) {
    return false;
  }
  if (rec.priority === "low") {
    return false;
  }
  return true;
}