import { create } from "zustand";

export type WorkspaceMode = "greenhouse" | "fertigation";

interface WorkspaceState {
  mode: WorkspaceMode;
  setMode: (mode: WorkspaceMode) => void;
}

export const useWorkspaceStore = create<WorkspaceState>((set) => ({
  mode: "greenhouse",
  setMode: (mode) => set({ mode }),
}));