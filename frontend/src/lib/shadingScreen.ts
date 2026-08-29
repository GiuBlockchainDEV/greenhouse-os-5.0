import type { CoveringMaterial, ShadingScreen } from "@/types/greenhouse";

/** Solar transmittance of a fully closed aluminized thermal shade screen. */
export const CLOSED_SCREEN_TRANSMITTANCE = 0.3;

/** Combined cover + screen solar transmittance (0–1). */
export function effectiveSolarTransmittance(
  covering: Pick<CoveringMaterial, "transmittance">,
  screen: ShadingScreen,
): number {
  if (!screen.installed || screen.deploymentPct <= 0) {
    return covering.transmittance;
  }

  const deploy = Math.min(100, Math.max(0, screen.deploymentPct)) / 100;
  const screenFactor = 1 - deploy * (1 - CLOSED_SCREEN_TRANSMITTANCE);
  return covering.transmittance * screenFactor;
}
