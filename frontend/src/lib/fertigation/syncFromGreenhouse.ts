import type { FertigationProject } from "@/types/fertigation";
import type { CropType, CultivationSystem, VolumeMetrics } from "@/types/greenhouse";

export interface GreenhouseCropContext {
  system: CultivationSystem;
  cropType: CropType;
  metrics: VolumeMetrics;
  marketPresetLabel?: string;
  vpdKpa?: number;
  internalTempC?: number;
  internalRhPct?: number;
  transpirationWm2?: number;
  et0MmDay?: number;
}

function cultivationSystemToCropParam(
  system: CultivationSystem,
): string {
  if (system === "substrate" || system === "growbed") {
    return "substrate";
  }
  if (system === "ebb_flow") {
    return "dwc";
  }
  return system;
}

export function applyGreenhouseContextToProject(
  project: FertigationProject,
  context: GreenhouseCropContext,
): FertigationProject {
  const { metrics, system, cropType, marketPresetLabel } = context;
  const areaM2 = Math.round(Math.max(50, metrics.cultivationAreaM2));
  const channels = Math.max(1, metrics.totalBedLines);
  const uptakePerPlant = cropType === "lettuce" ? 0.12 : 0.22;
  const vpdFactor =
    context.vpdKpa !== undefined ? Math.min(1.35, Math.max(0.75, context.vpdKpa / 1.0)) : 1;
  const uptakeLpd = Math.round(metrics.totalPlants * uptakePerPlant * vpdFactor);
  const transpirationBoost =
    context.transpirationWm2 !== undefined
      ? Math.min(1.4, Math.max(0.6, Math.abs(context.transpirationWm2) / 90))
      : 1;
  const etBoost =
    context.et0MmDay !== undefined
      ? Math.min(1.3, Math.max(0.7, context.et0MmDay / 5))
      : 1;
  const evaporationLpd = Math.round(
    areaM2 * (system === "nft" ? 0.15 : 0.08) * transpirationBoost * etBoost,
  );

  const next = structuredClone(project);
  const cropNode = next.nodes.find((node) => node.role === "crop");
  if (cropNode) {
    cropNode.params = {
      ...cropNode.params,
      system: cultivationSystemToCropParam(system),
      areaM2,
      channels,
      uptakeLpd,
      evaporationLpd: Math.max(20, evaporationLpd),
    };
    if (context.vpdKpa !== undefined) {
      cropNode.params.greenhouseVpdKpa = context.vpdKpa;
    }
    if (context.internalTempC !== undefined) {
      cropNode.params.greenhouseTempC = context.internalTempC;
    }
    if (context.internalRhPct !== undefined) {
      cropNode.params.greenhouseRhPct = context.internalRhPct;
    }
  }

  if (marketPresetLabel) {
    next.meta.name = `${next.meta.name} · ${marketPresetLabel}`;
  }

  next.meta.updatedAt = new Date().toISOString();
  return next;
}