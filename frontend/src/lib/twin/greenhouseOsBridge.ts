/** postMessage payloads shared with the embedded Growa P&ID iframe. */

export const GREENHOUSE_OS_MESSAGE = "GREENHOUSE_OS_CLIMATE" as const;

export interface GreenhouseOsClimateMessage {
  type: typeof GREENHOUSE_OS_MESSAGE;
  vpdKpa: number | null;
  internalTempC: number | null;
  internalRhPct: number | null;
  transpirationWm2: number | null;
  crop: string;
  system: string;
  floorAreaM2: number;
}

export function buildGreenhouseOsClimateMessage(input: {
  vpdKpa?: number;
  internalTempC?: number;
  internalRhPct?: number;
  transpirationWm2?: number;
  crop: string;
  system: string;
  floorAreaM2: number;
}): GreenhouseOsClimateMessage {
  return {
    type: GREENHOUSE_OS_MESSAGE,
    vpdKpa: input.vpdKpa ?? null,
    internalTempC: input.internalTempC ?? null,
    internalRhPct: input.internalRhPct ?? null,
    transpirationWm2: input.transpirationWm2 ?? null,
    crop: input.crop,
    system: input.system,
    floorAreaM2: input.floorAreaM2,
  };
}