import type { FertigationProject } from "@/types/fertigation";
import type { CropType, CultivationSystem, VolumeMetrics } from "@/types/greenhouse";

interface GreenhouseCropContext {
  system: CultivationSystem;
  cropType: CropType;
  metrics: VolumeMetrics;
  marketPresetLabel?: string;
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
  const uptakeLpd = Math.round(metrics.totalPlants * uptakePerPlant);
  const evaporationLpd = Math.round(areaM2 * (system === "nft" ? 0.15 : 0.08));

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
  }

  if (marketPresetLabel) {
    next.meta.name = `${next.meta.name} · ${marketPresetLabel}`;
  }

  next.meta.updatedAt = new Date().toISOString();
  return next;
}