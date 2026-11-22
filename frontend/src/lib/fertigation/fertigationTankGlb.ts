/** Native height of `fertigation-water-tank.glb` at reference capacity (m). */
export const FERTIGATION_TANK_REF_HEIGHT_M = 0.5551;

export function fertigationTankHeightM(capacityL: number): number {
  return Math.min(1.65, 0.95 + capacityL / 4500);
}

export function fertigationTankUniformScale(capacityL: number): number {
  return fertigationTankHeightM(capacityL) / FERTIGATION_TANK_REF_HEIGHT_M;
}

/** Side flange elevation for hydraulic connections (m, world Y). */
export function fertigationTankConnectionY(groundY: number, capacityL: number): number {
  const h = fertigationTankHeightM(capacityL);
  return groundY + h * 0.48;
}