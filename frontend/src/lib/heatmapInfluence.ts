/**
 * System-aware heatmap perturbation rules — keeps each cooling/heating mode physically consistent.
 */

import type { CoolingSystem, HeatingSystem } from "@/types/greenhouse";
import { MECHANICAL_AC_TEMP_FLOOR_C, HEATING_SETPOINT_C } from "@/lib/thermalEstimate";
import { padCoolingTempFloorC } from "@/lib/psychrometrics";

export function heatmapTemperatureFloorC(
  cooling: CoolingSystem,
  externalTempC: number,
  externalRhPct: number,
): number | null {
  switch (cooling) {
    case "fan_and_pad":
    case "evaporative":
    case "high_pressure_fog":
      return padCoolingTempFloorC(externalTempC, externalRhPct);
    case "mechanical_ac":
      return MECHANICAL_AC_TEMP_FLOOR_C;
    default:
      return null;
  }
}

export function applyHeatmapTemperatureFloor(
  tempC: number,
  cooling: CoolingSystem,
  externalTempC: number,
  externalRhPct: number,
): number {
  const floor = heatmapTemperatureFloorC(cooling, externalTempC, externalRhPct);
  return floor === null ? tempC : Math.max(floor, tempC);
}

export function isHeatingInfluenceActive(
  baseTempC: number,
  heating: HeatingSystem,
): boolean {
  return heating !== "none" && HEATING_SETPOINT_C - baseTempC > 0.5;
}

export function usesEvaporativePad(cooling: CoolingSystem): boolean {
  return cooling === "fan_and_pad" || cooling === "evaporative";
}

export function usesFogCooling(cooling: CoolingSystem): boolean {
  return cooling === "high_pressure_fog";
}

export function usesMechanicalAc(cooling: CoolingSystem): boolean {
  return cooling === "mechanical_ac";
}
