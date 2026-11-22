import { estimatePreviewMicroclimate } from "@/lib/thermalEstimate";
import { MARKET_PRESET_WS_LIMITS } from "@/lib/marketGreenhouseEquipment";
import type {
  ClimateEquipment,
  ClimateEquipmentSizing,
  ClimateScenario,
  CoveringMaterial,
  CropConfig,
  GreenhouseDimensions,
  ShadingScreen,
} from "@/types/greenhouse";
import type { WSMicroclimate } from "@/types/simulation";

export type TwinRecommendationPriority = "high" | "medium" | "low";

export type TwinRecommendationAction =
  | { kind: "climateScenario"; patch: Partial<ClimateScenario> }
  | { kind: "shadingScreen"; patch: Partial<ShadingScreen> }
  | { kind: "equipmentSizing"; patch: Partial<ClimateEquipmentSizing> }
  | { kind: "equipmentMode"; patch: Partial<Pick<ClimateEquipment, "cooling" | "ventilation">> };

export interface TwinRecommendation {
  id: string;
  priority: TwinRecommendationPriority;
  parameter: string;
  currentValue: number;
  recommendedValue: number;
  unit: string;
  rationale: string;
  impactHint: string;
  action: TwinRecommendationAction;
}

const CROP_VPD_TARGET: Record<CropConfig["type"], { min: number; max: number }> = {
  tomato: { min: 0.8, max: 1.25 },
  cucumber: { min: 0.7, max: 1.15 },
  pepper: { min: 0.75, max: 1.2 },
  lettuce: { min: 0.6, max: 0.95 },
  strawberry: { min: 0.65, max: 1.0 },
  cannabis: { min: 0.9, max: 1.35 },
};

function pushUnique(
  list: TwinRecommendation[],
  item: TwinRecommendation,
): void {
  if (!list.some((entry) => entry.id === item.id)) {
    list.push(item);
  }
}

export function computeOfflineTwinRecommendations(input: {
  crop: CropConfig;
  equipment: ClimateEquipment;
  scenario: ClimateScenario;
  covering: CoveringMaterial;
  shadingScreen: ShadingScreen;
  dimensions: GreenhouseDimensions;
  micro?: WSMicroclimate | null;
  physicsConnected: boolean;
}): TwinRecommendation[] {
  const preview = estimatePreviewMicroclimate(
    input.scenario,
    input.covering,
    input.shadingScreen,
    input.equipment,
    input.dimensions,
    input.crop,
    input.micro?.et0_fao56,
  );

  const internalTemp = input.micro?.internal_temp ?? preview.internalTemp;
  const internalRh = input.micro?.internal_rh ?? preview.internalRh;
  const vpd = input.micro?.vpd_kpa ?? preview.vpdKpa;
  const botrytis = input.micro?.botrytis_risk_index ?? 0;
  const dliIndex = input.micro?.dli_adequacy_index ?? 1;

  const vpdBand = CROP_VPD_TARGET[input.crop.type];
  const sizing = input.equipment.sizing;
  const recs: TwinRecommendation[] = [];

  if (internalTemp > 28) {
    const nextScreen = Math.min(85, input.shadingScreen.deploymentPct + 20);
    if (input.shadingScreen.installed && nextScreen > input.shadingScreen.deploymentPct) {
      pushUnique(recs, {
        id: "temp-shade",
        priority: "high",
        parameter: "shade_screen_pct",
        currentValue: input.shadingScreen.deploymentPct,
        recommendedValue: nextScreen,
        unit: "%",
        rationale: "High canopy temperature — deploy thermal screen to cut solar load.",
        impactHint: "≈ −1.5 to −2.5 °C peak",
        action: {
          kind: "shadingScreen",
          patch: { installed: true, deploymentPct: nextScreen },
        },
      });
    }
    if (sizing.exhaustFanCount < MARKET_PRESET_WS_LIMITS.exhaustFanCount) {
      const next = Math.min(MARKET_PRESET_WS_LIMITS.exhaustFanCount, sizing.exhaustFanCount + 2);
      pushUnique(recs, {
        id: "temp-exhaust",
        priority: "high",
        parameter: "exhaust_fan_count",
        currentValue: sizing.exhaustFanCount,
        recommendedValue: next,
        unit: "#",
        rationale: "Stack temperature exceeds generative stage comfort — add gable exhaust capacity.",
        impactHint: "≈ −1 to −2 °C",
        action: { kind: "equipmentSizing", patch: { exhaustFanCount: next } },
      });
    }
  }

  if (vpd < vpdBand.min - 0.05) {
    const nextVent = Math.min(
      MARKET_PRESET_WS_LIMITS.roofVentCount,
      sizing.roofVentCount + 1,
    );
    if (nextVent > sizing.roofVentCount) {
      pushUnique(recs, {
        id: "vpd-low-vent",
        priority: "medium",
        parameter: "roof_vent_count",
        currentValue: sizing.roofVentCount,
        recommendedValue: nextVent,
        unit: "#",
        rationale: "VPD is below crop band — increase ridge exchange to pull humidity out.",
        impactHint: `Target ${vpdBand.min}–${vpdBand.max} kPa`,
        action: { kind: "equipmentSizing", patch: { roofVentCount: nextVent } },
      });
    }
    if (input.scenario.windSpeedMS < 1.5) {
      pushUnique(recs, {
        id: "vpd-low-wind",
        priority: "low",
        parameter: "wind_speed_m_s",
        currentValue: input.scenario.windSpeedMS,
        recommendedValue: Math.min(4, input.scenario.windSpeedMS + 0.8),
        unit: "m/s",
        rationale: "Low wind reduces leak ventilation — stress-test with higher exterior wind.",
        impactHint: "Scenario what-if",
        action: {
          kind: "climateScenario",
          patch: { windSpeedMS: Math.min(4, input.scenario.windSpeedMS + 0.8) },
        },
      });
    }
  }

  if (vpd > vpdBand.max + 0.08 || (input.scenario.externalTempC > 36 && vpd > vpdBand.max)) {
    const nextRh = Math.min(88, input.scenario.externalRhPct + 8);
    pushUnique(recs, {
      id: "vpd-high-rh",
      priority: "medium",
      parameter: "pad_or_fog",
      currentValue: vpd,
      recommendedValue: vpdBand.max,
      unit: "kPa",
      rationale: "VPD is high — favor evaporative cooling or fog if not already active.",
      impactHint: "Adds humidity near pads/fog lines",
      action:
        input.equipment.cooling === "none"
          ? { kind: "equipmentMode", patch: { cooling: "evaporative" } }
          : { kind: "climateScenario", patch: { externalRhPct: nextRh } },
    });
  }

  const previewBotrytis =
    botrytis > 0
      ? botrytis
      : Math.min(
          100,
          Math.max(0, internalRh - 70) * 1.1 + Math.max(0, internalTemp - 26) * 4,
        );

  if (previewBotrytis >= 28) {
    const nextHaf = Math.min(
      MARKET_PRESET_WS_LIMITS.circulationFanCount,
      sizing.circulationFanCount + 2,
    );
    pushUnique(recs, {
      id: "botrytis-haf",
      priority: "high",
      parameter: "circulation_fan_count",
      currentValue: sizing.circulationFanCount,
      recommendedValue: nextHaf,
      unit: "#",
      rationale: "Botrytis risk index elevated — improve air movement and avoid stagnant pockets.",
      impactHint: `RH ${internalRh.toFixed(0)}% · risk ${previewBotrytis.toFixed(0)}`,
      action: { kind: "equipmentSizing", patch: { circulationFanCount: nextHaf } },
    });
  }

  if (dliIndex < 0.85 && input.shadingScreen.deploymentPct > 25) {
    pushUnique(recs, {
      id: "dli-screen",
      priority: "medium",
      parameter: "shade_screen_pct",
      currentValue: input.shadingScreen.deploymentPct,
      recommendedValue: Math.max(0, input.shadingScreen.deploymentPct - 15),
      unit: "%",
      rationale: "DLI adequacy below target while screen is deployed — recover light for photosynthesis.",
      impactHint: `Adequacy ${dliIndex.toFixed(2)}`,
      action: {
        kind: "shadingScreen",
        patch: {
          deploymentPct: Math.max(0, input.shadingScreen.deploymentPct - 15),
        },
      },
    });
  }

  if (input.physicsConnected && recs.length === 0 && Math.abs(vpd - (vpdBand.min + vpdBand.max) / 2) < 0.08) {
    pushUnique(recs, {
      id: "stable-ok",
      priority: "low",
      parameter: "microclimate",
      currentValue: vpd,
      recommendedValue: vpd,
      unit: "kPa",
      rationale: "Microclimate is within crop VPD band — no deterministic change required.",
      impactHint: "Stable",
      action: { kind: "climateScenario", patch: {} },
    });
  }

  return recs.sort((a, b) => {
    const rank = { high: 0, medium: 1, low: 2 };
    return rank[a.priority] - rank[b.priority];
  });
}