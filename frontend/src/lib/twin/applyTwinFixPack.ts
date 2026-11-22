import { applyTwinRecommendation } from "@/lib/twin/applyTwinRecommendation";
import type { TwinRecommendation } from "@/lib/twin/offlineTwinAdvisor";
import { isFixPackTwinRecommendation } from "@/lib/twin/twinRecommendationUtils";

export interface TwinFixPackResult {
  applied: number;
  labels: string[];
}

/** Apply high/medium advisor actions in one pass (skips low-priority what-if only). */
export function applyTwinFixPack(recommendations: TwinRecommendation[]): TwinFixPackResult {
  const labels: string[] = [];
  let applied = 0;
  for (const rec of recommendations) {
    if (!isFixPackTwinRecommendation(rec)) {
      continue;
    }
    applyTwinRecommendation(rec);
    applied += 1;
    labels.push(rec.parameter);
  }
  return { applied, labels };
}