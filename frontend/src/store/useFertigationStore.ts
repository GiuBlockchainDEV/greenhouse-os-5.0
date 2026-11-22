import { create } from "zustand";
import { devtools } from "zustand/middleware";

import {
  CUSTOM_FERTIGATION_PRESET_ID,
  fertigationPresetById,
  suggestedFertigationPresetForSystem,
} from "@/lib/fertigation/fertigationPresets";
import { freshFertigationProject } from "@/lib/fertigation/projectFactory";
import { persistFertigationProjectToStorage } from "@/lib/fertigation/persistProject";
import { applyGreenhouseContextToProject } from "@/lib/fertigation/syncFromGreenhouse";
import { FERTIGATION_TEMPLATES } from "@/lib/fertigation/templates";
import { marketPresetById, marketPresetLabel } from "@/lib/marketGreenhousePresets";
import { useGreenhouseStore } from "@/store/useGreenhouseStore";
import type { FertigationProject, FertigationTemplateId } from "@/types/fertigation";

export type FertigationStudioView = "plant3d" | "pid";

interface FertigationState {
  marketPresetId: string;
  templateId: FertigationTemplateId;
  syncWithGreenhouse: boolean;
  projectRevision: number;
  activeProject: FertigationProject | null;
  studioView: FertigationStudioView;
  setStudioView: (view: FertigationStudioView) => void;
  applyMarketPreset: (presetId: string) => void;
  applyTemplate: (templateId: FertigationTemplateId) => void;
  setSyncWithGreenhouse: (value: boolean) => void;
  pushProjectToTwin: () => void;
  alignPresetWithGreenhouseCrop: () => void;
}

function buildAndPersist(
  templateId: FertigationTemplateId,
  syncWithGreenhouse: boolean,
): FertigationProject {
  let project = freshFertigationProject(templateId);
  if (syncWithGreenhouse) {
    const gh = useGreenhouseStore.getState();
    const ghMarket = marketPresetById(gh.marketPresetId);
    const micro = gh.simulationResults?.microclimate;
    const thermal = gh.simulationResults?.thermal_balance;
    project = applyGreenhouseContextToProject(project, {
      system: gh.crop.system,
      cropType: gh.crop.type,
      metrics: gh.metrics,
      marketPresetLabel: ghMarket ? marketPresetLabel(ghMarket) : undefined,
      vpdKpa: micro?.vpd_kpa,
      internalTempC: micro?.internal_temp,
      internalRhPct: micro?.internal_rh,
      transpirationWm2: thermal?.q_transpiration,
      et0MmDay: micro?.et0_fao56,
    });
  }
  persistFertigationProjectToStorage(project);
  return project;
}

export const useFertigationStore = create<FertigationState>()(
  devtools(
    (set, get) => ({
      marketPresetId: "growa-qatar-nft",
      templateId: "nft-dual",
      syncWithGreenhouse: true,
      projectRevision: 0,
      activeProject: null,
      studioView: "plant3d",

      setStudioView: (view) => set({ studioView: view }, false, "setStudioView"),

      pushProjectToTwin: () => {
        const project = buildAndPersist(get().templateId, get().syncWithGreenhouse);
        set(
          (state) => ({
            activeProject: project,
            projectRevision: state.projectRevision + 1,
          }),
          false,
          "pushProjectToTwin",
        );
      },

      applyMarketPreset: (presetId) => {
        if (presetId === CUSTOM_FERTIGATION_PRESET_ID) {
          set({ marketPresetId: CUSTOM_FERTIGATION_PRESET_ID }, false, "applyMarketPreset/custom");
          get().pushProjectToTwin();
          return;
        }
        const preset = fertigationPresetById(presetId);
        if (!preset) {
          return;
        }
        set(
          {
            marketPresetId: presetId,
            templateId: preset.templateId,
          },
          false,
          "applyMarketPreset",
        );
        get().pushProjectToTwin();
      },

      applyTemplate: (templateId) => {
        if (!FERTIGATION_TEMPLATES[templateId]) {
          return;
        }
        set(
          {
            marketPresetId: CUSTOM_FERTIGATION_PRESET_ID,
            templateId,
          },
          false,
          "applyTemplate",
        );
        get().pushProjectToTwin();
      },

      setSyncWithGreenhouse: (value) => {
        set({ syncWithGreenhouse: value }, false, "setSyncWithGreenhouse");
        get().pushProjectToTwin();
      },

      alignPresetWithGreenhouseCrop: () => {
        const cropSystem = useGreenhouseStore.getState().crop.system;
        const suggested = suggestedFertigationPresetForSystem(cropSystem);
        if (!suggested) {
          return;
        }
        set(
          {
            marketPresetId: suggested.id,
            templateId: suggested.templateId,
          },
          false,
          "alignPresetWithGreenhouseCrop",
        );
        get().pushProjectToTwin();
      },
    }),
    { name: "FertigationStore" },
  ),
);