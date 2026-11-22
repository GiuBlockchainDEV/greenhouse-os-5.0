const LAUNCH_STORAGE_KEY = "greenhouseos-twin-launch-v1";

export function hasCompletedTwinLaunch(): boolean {
  try {
    return localStorage.getItem(LAUNCH_STORAGE_KEY) === "done";
  } catch {
    return false;
  }
}

export function markTwinLaunchComplete(): void {
  try {
    localStorage.setItem(LAUNCH_STORAGE_KEY, "done");
  } catch {
    /* quota */
  }
}

export function resetTwinLaunchForDebug(): void {
  try {
    localStorage.removeItem(LAUNCH_STORAGE_KEY);
  } catch {
    /* ignore */
  }
}