/** Clearance baked into east gable cutouts around each exhaust fan (see `ExhaustGableWall`). */
export const EXHAUST_FAN_OPENING_PAD_M = 0.28;

export function exhaustFanOpeningSpanM(diameterM: number): number {
  return diameterM + EXHAUST_FAN_OPENING_PAD_M;
}