import type { FertigationProject, FertigationTemplateId } from "@/types/fertigation";
import type { GreenhouseStoreSnapshot } from "@/types/greenhouse";

export type TwinWorkspaceMode = "greenhouse" | "fertigation";
export type TwinFertigationStudioView = "plant3d" | "pid";

export const TWIN_PROJECT_STORAGE_KEY = "greenhouseos-twin-project-v1";

export interface TwinFertigationSlice {
  marketPresetId: string;
  templateId: FertigationTemplateId;
  syncWithGreenhouse: boolean;
  studioView: TwinFertigationStudioView;
  activeProject: FertigationProject | null;
}

export interface TwinProjectBundle {
  version: 1;
  savedAt: string;
  workspaceMode: TwinWorkspaceMode;
  greenhouse: GreenhouseStoreSnapshot;
  fertigation: TwinFertigationSlice;
}