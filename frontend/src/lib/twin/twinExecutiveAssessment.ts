import type { TwinRecommendation } from "@/lib/twin/offlineTwinAdvisor";
import type { CropConfig } from "@/types/greenhouse";

export interface TwinMicroclimateSnapshot {
  internalTemp: number;
  internalRh: number;
  vpdKpa: number;
  externalTemp: number;
  opexEurDay: number;
}

export type TwinVerdict = "proceed" | "caution" | "redesign";

export interface TwinExecutiveAssessment {
  score: number;
  verdict: TwinVerdict;
  headlineKey: string;
  detailKeys: string[];
  annualOpexEur: number;
  atRiskEur: number;
  savingsIfFixedEur: number;
  botrytisRiskPct: number;
  vpdInBand: boolean;
}

const GROWING_DAYS_PER_YEAR = 220;

const CROP_VPD: Record<CropConfig["type"], { min: number; max: number }> = {
  tomato: { min: 0.8, max: 1.25 },
  cucumber: { min: 0.7, max: 1.15 },
  pepper: { min: 0.75, max: 1.2 },
  lettuce: { min: 0.6, max: 0.95 },
  strawberry: { min: 0.65, max: 1.0 },
  cannabis: { min: 0.9, max: 1.35 },
};

function estimateBotrytisRiskPct(internalRh: number, internalTempC: number, vpdKpa: number): number {
  const rhStress = Math.max(0, internalRh - 78) * 1.4;
  const tempStress =
    internalTempC < 16
      ? (16 - internalTempC) * 2
      : internalTempC > 27
        ? (internalTempC - 27) * 3
        : 0;
  const vpdStress = vpdKpa < 0.45 ? 12 : 0;
  return Math.min(100, Math.round(rhStress + tempStress + vpdStress));
}

export function assessTwinExecutive(params: {
  view: TwinMicroclimateSnapshot;
  crop: CropConfig;
  recommendations: TwinRecommendation[];
}): TwinExecutiveAssessment {
  const { view, crop, recommendations } = params;
  const band = CROP_VPD[crop.type];
  const vpdInBand = view.vpdKpa >= band.min && view.vpdKpa <= band.max;
  const botrytisRiskPct = estimateBotrytisRiskPct(view.internalRh, view.internalTemp, view.vpdKpa);

  let score = 72;
  if (vpdInBand) score += 12;
  else score -= 18;
  if (view.internalTemp >= 20 && view.internalTemp <= 28) score += 10;
  else if (view.internalTemp > 30) score -= 22;
  else if (view.internalTemp < 18) score -= 8;
  score -= Math.min(30, botrytisRiskPct * 0.35);
  score -= Math.min(15, Math.max(0, view.externalTemp - 38) * 2);
  score = Math.max(5, Math.min(98, Math.round(score)));

  const annualOpexEur = Math.round(view.opexEurDay * GROWING_DAYS_PER_YEAR);
  const highCount = recommendations.filter((r) => r.priority === "high").length;
  const savingsIfFixedEur = Math.round(annualOpexEur * Math.min(0.22, 0.06 * highCount + 0.04 * recommendations.length));
  const atRiskEur = Math.round(annualOpexEur * (Math.max(0, 100 - score) / 100) * 0.35);

  let verdict: TwinVerdict = "proceed";
  let headlineKey = "executive.headline.proceed";
  const detailKeys: string[] = [];

  if (score < 48) {
    verdict = "redesign";
    headlineKey = "executive.headline.redesign";
    detailKeys.push("executive.detail.heatStress");
    if (botrytisRiskPct > 30) detailKeys.push("executive.detail.botrytis");
    if (!vpdInBand) detailKeys.push("executive.detail.vpd");
  } else if (score < 72) {
    verdict = "caution";
    headlineKey = "executive.headline.caution";
    if (view.internalTemp > 28) detailKeys.push("executive.detail.cooling");
    if (highCount > 0) detailKeys.push("executive.detail.fixPack");
    if (detailKeys.length === 0) detailKeys.push("executive.detail.tune");
  } else {
    detailKeys.push("executive.detail.stable");
    if (savingsIfFixedEur > 0 && recommendations.length > 0) {
      detailKeys.push("executive.detail.optimize");
    }
  }

  return {
    score,
    verdict,
    headlineKey,
    detailKeys,
    annualOpexEur,
    atRiskEur,
    savingsIfFixedEur,
    botrytisRiskPct,
    vpdInBand,
  };
}