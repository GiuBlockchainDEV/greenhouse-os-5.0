import { applyTwinRecommendation } from "@/lib/twin/applyTwinRecommendation";
import type { TwinRecommendation } from "@/lib/twin/offlineTwinAdvisor";

/** Apply every high-priority advisor action in one engineering pass. */
export function applyTwinFixPack(recommendations: TwinRecommendation[]): number {
  let applied = 0;
  for (const rec of recommendations) {
    if (rec.priority !== "high" || rec.id === "stable-ok") {
      continue;
    }
    applyTwinRecommendation(rec);
    applied += 1;
  }
  return applied;
}