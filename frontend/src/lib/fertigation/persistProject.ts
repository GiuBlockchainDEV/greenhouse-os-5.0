import { FERTIGATION_PROJECT_STORAGE_KEY } from "@/lib/fertigation/componentCatalog";
import type { FertigationProject } from "@/types/fertigation";

export function persistFertigationProjectToStorage(project: FertigationProject): void {
  try {
    localStorage.setItem(FERTIGATION_PROJECT_STORAGE_KEY, JSON.stringify(project));
  } catch {
    /* quota / private mode */
  }
}

export function readFertigationProjectFromStorage(): FertigationProject | null {
  try {
    const raw = localStorage.getItem(FERTIGATION_PROJECT_STORAGE_KEY);
    if (!raw) {
      return null;
    }
    return JSON.parse(raw) as FertigationProject;
  } catch {
    return null;
  }
}