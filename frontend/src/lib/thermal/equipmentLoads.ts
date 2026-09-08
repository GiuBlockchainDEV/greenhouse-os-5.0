/** Rated equipment capacities and sensible/latent loads. */

import type { ClimateEquipment, ClimateEquipmentSizing } from "@/types/greenhouse";
import { LATENT_HEAT_J_KG } from "@/lib/thermal/constants";
import { padOutletState } from "@/lib/thermal/psychrometricsExtended";
import {
  resolveAcCoolingKw,
  resolveAcShr,
  resolveCirculationMotorW,
  resolveFogEvaporationEfficiency,
  resolveFogFlowLhPerLine,
  resolveGeothermalCop,
  resolveGeothermalKw,
  resolveHeaterKwPerUnit,
  resolveHotWaterHeatingKw,
  resolvePadEfficiency,
} from "@/lib/thermal/ratedCapacities";
import { approxWetBulbC } from "@/lib/psychrometrics";

export interface EquipmentLoadResult {
  sensibleWm2: number;
  latentWm2: number;
  moistureSourceKgSm2s: number;
  supplyTempC: number | null;
  supplyHumidityRatioKgKg: number | null;
}

export function acCapacityDerating(outdoorTempC: number): number {
  if (outdoorTempC <= 35) return 1;
  return Math.max(0.35, 1 - (outdoorTempC - 35) * 0.025);
}

export function ratedAcCoolingKw(sizing: ClimateEquipmentSizing): number {
  return resolveAcCoolingKw(sizing);
}

export function ratedHeaterKw(
  heating: ClimateEquipment["heating"],
  sizing: ClimateEquipmentSizing,
): number {
  switch (heating) {
    case "unit_heater":
    case "air_heater":
      return sizing.heaterUnitCount * resolveHeaterKwPerUnit(sizing);
    case "geothermal":
      return resolveGeothermalKw(sizing) * (resolveGeothermalCop(sizing) / 4.2);
    case "hot_water_pipes":
      return resolveHotWaterHeatingKw(sizing);
    default:
      return 0;
  }
}

export function hafMotorHeatWm2(
  sizing: ClimateEquipmentSizing,
  floorAreaM2: number,
  runtimeFraction = 1,
): number {
  if (sizing.circulationFanCount <= 0) return 0;
  const totalW = sizing.circulationFanCount * resolveCirculationMotorW(sizing) * runtimeFraction;
  return totalW / Math.max(floorAreaM2, 1);
}

export function computeCoolingLoads(
  equipment: ClimateEquipment,
  externalTempC: number,
  externalRhPct: number,
  internalTempC: number,
  floorAreaM2: number,
  mechanicalFlowM3h: number,
  runtimeFraction = 1,
): EquipmentLoadResult {
  const sizing = equipment.sizing;
  const zero: EquipmentLoadResult = {
    sensibleWm2: 0,
    latentWm2: 0,
    moistureSourceKgSm2s: 0,
    supplyTempC: null,
    supplyHumidityRatioKgKg: null,
  };

  switch (equipment.cooling) {
    case "fan_and_pad":
    case "evaporative": {
      const wetBulb = approxWetBulbC(externalTempC, externalRhPct);
      const padEff =
        equipment.cooling === "fan_and_pad"
          ? resolvePadEfficiency(sizing)
          : resolvePadEfficiency(sizing) * 0.75;
      const outlet = padOutletState(externalTempC, externalRhPct, padEff, wetBulb);
      const mDotAirKgS = (1.2 * mechanicalFlowM3h) / 3600;
      const cp = 1005;
      const sensible =
        (mDotAirKgS * cp * (outlet.temperatureC - internalTempC)) /
        Math.max(floorAreaM2, 1);
      const wIn = outlet.humidityRatioKgKg;
      const wInternal =
        (0.62198 * (externalRhPct / 100) * 101.325) /
        (101.325 - (externalRhPct / 100) * 101.325);
      const moisture = Math.max(0, (mDotAirKgS * (wIn - wInternal)) / Math.max(floorAreaM2, 1));
      return {
        sensibleWm2: sensible * runtimeFraction,
        latentWm2: moisture * LATENT_HEAT_J_KG,
        moistureSourceKgSm2s: moisture,
        supplyTempC: outlet.temperatureC,
        supplyHumidityRatioKgKg: outlet.humidityRatioKgKg,
      };
    }
    case "mechanical_ac": {
      const shr = resolveAcShr(sizing);
      const ratedKw = ratedAcCoolingKw(sizing) * acCapacityDerating(externalTempC);
      const qTotalW = ratedKw * 1000 * runtimeFraction;
      const qSens = qTotalW * shr;
      const qLat = qTotalW * (1 - shr);
      const deficit = Math.max(0, internalTempC - externalTempC);
      const appliedSens = Math.min(qSens, deficit * 1200 * floorAreaM2);
      return {
        sensibleWm2: -appliedSens / Math.max(floorAreaM2, 1),
        latentWm2: -qLat / Math.max(floorAreaM2, 1),
        moistureSourceKgSm2s: -qLat / LATENT_HEAT_J_KG / Math.max(floorAreaM2, 1),
        supplyTempC: Math.max(externalTempC + 4, internalTempC - 8),
        supplyHumidityRatioKgKg: null,
      };
    }
    case "high_pressure_fog": {
      const nozzleFlowLh = sizing.fogLineCount * resolveFogFlowLhPerLine(sizing);
      const mDotWaterKgS =
        (nozzleFlowLh / 3600) * resolveFogEvaporationEfficiency(sizing);
      const qLat = mDotWaterKgS * LATENT_HEAT_J_KG;
      return {
        sensibleWm2: -qLat / Math.max(floorAreaM2, 1),
        latentWm2: qLat / Math.max(floorAreaM2, 1),
        moistureSourceKgSm2s: mDotWaterKgS / Math.max(floorAreaM2, 1),
        supplyTempC: null,
        supplyHumidityRatioKgKg: null,
      };
    }
    default:
      return zero;
  }
}

export function computeHeatingLoad(
  equipment: ClimateEquipment,
  internalTempC: number,
  setpointC: number,
  floorAreaM2: number,
  runtimeFraction = 1,
): EquipmentLoadResult {
  const deficit = setpointC - internalTempC;
  if (deficit <= 0 || equipment.heating === "none") {
    return {
      sensibleWm2: 0,
      latentWm2: 0,
      moistureSourceKgSm2s: 0,
      supplyTempC: null,
      supplyHumidityRatioKgKg: null,
    };
  }
  const ratedKw = ratedHeaterKw(equipment.heating, equipment.sizing);
  const appliedKw = Math.min(ratedKw, ratedKw * Math.min(deficit / 5, 1.5)) * runtimeFraction;
  return {
    sensibleWm2: (appliedKw * 1000) / Math.max(floorAreaM2, 1),
    latentWm2: 0,
    moistureSourceKgSm2s: 0,
    supplyTempC: internalTempC + Math.min(12, deficit * 0.6),
    supplyHumidityRatioKgKg: null,
  };
}

// Re-export for UI summaries
export {
  resolveAcCop,
  resolveAcSupplyAirflowM3h,
  resolveCirculationFlowM3h,
  resolveExhaustFlowM3h,
} from "@/lib/thermal/ratedCapacities";
