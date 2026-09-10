/**
 * Calibrated greenhouse microclimate solver.
 * Global temperature/RH use the proven steady-state balance; rated flows and
 * pad outlet states feed the spatial heatmap layer.
 */

import type {
  ClimateEquipment,
  ClimateScenario,
  CoveringMaterial,
  CropConfig,
  GreenhouseDimensions,
  ShadingScreen,
} from "@/types/greenhouse";
import {
  acCapacityFactor,
  computeFanAndPadCoolingC,
  exhaustCapacityFactor,
  fogCapacityFactor,
  heaterCapacityFactor,
  padCapacityFactor,
} from "@/lib/climateEquipmentCapacity";
import {
  cropCoefficient,
  CULTIVATION_ET_FACTOR,
  CULTIVATION_THERMAL_MASS,
  DEFAULT_ET0_MM_DAY,
  effectiveLai,
  LATENT_HEAT_J_KG,
  normalizeCultivationSystem,
} from "@/lib/cultivationFactors";
import { COOLING_CAPACITY_FACTOR } from "@/lib/coolingConstants";
import { effectiveSolarTransmittance } from "@/lib/shadingScreen";
import { solarElevationFactor, solarIntensityFactor } from "@/lib/solarIrradiance";
import { approxWetBulbC, padCoolingTempFloorC } from "@/lib/psychrometrics";
import { SOLAR_ABSORPTION_FRACTION } from "@/lib/thermal/constants";
import {
  circulationRecirculationM3h,
  computeVentilationFlows,
  mixingEffectiveness,
} from "@/lib/thermal/ventilationFlow";
import { padOutletState } from "@/lib/thermal/psychrometricsExtended";
import { resolvePadEfficiency } from "@/lib/thermal/ratedCapacities";
import { calculateVpdKpa } from "@/lib/thermal/vpd";

export const HEATING_SETPOINT_C = 22;
export const MECHANICAL_AC_TEMP_FLOOR_C = 12;

const COOLING_DELTA: Record<string, number> = {
  none: 0,
  fan_and_pad: -6,
  evaporative: -4.5,
  mechanical_ac: -10,
  high_pressure_fog: -5,
};

const COOLING_RH: Record<string, number> = {
  none: 0,
  fan_and_pad: 12,
  evaporative: 10,
  mechanical_ac: -8,
  high_pressure_fog: 15,
};

const VENT_ACH_BASE: Record<string, number> = {
  natural_ridge: 1.2,
  natural_gable: 1.0,
  roof_vents: 2.5,
  side_vents: 2.0,
  forced_exhaust: 4.0,
  combined: 5.5,
};

const HEATING_W_M2: Record<string, number> = {
  none: 0,
  hot_water_pipes: 120,
  unit_heater: 180,
  air_heater: 150,
  geothermal: 90,
};

export interface MicroclimateSolveInput {
  scenario: ClimateScenario;
  covering: CoveringMaterial;
  shadingScreen: ShadingScreen;
  equipment: ClimateEquipment;
  dimensions: GreenhouseDimensions;
  crop: CropConfig;
  et0MmDay?: number;
  runtimeFraction?: number;
  groundTempC?: number;
}

export interface MicroclimateSolveResult {
  internalTemp: number;
  externalTemp: number;
  internalRh: number;
  humidityRatioKgKg: number;
  vpdKpa: number;
  qSolar: number;
  ventilationAch: number;
  mixingEffectiveness: number;
  supplyTempC: number | null;
  supplyHumidityRatioKgKg: number | null;
  recirculationM3h: number;
  ventilationTotalM3h: number;
  thermalBalance: {
    qSolar: number;
    qTranspiration: number;
    qVentilation: number;
    qConduction: number;
    qEquipmentSensible: number;
    qNetDelta: number;
  };
}

function envelopeVolume(
  length: number,
  width: number,
  eaveHeight: number,
  ridgeHeight: number,
): number {
  const rise = Math.max(ridgeHeight - eaveHeight, 0);
  return length * width * eaveHeight + (length * width * rise) / 2;
}

function roofArea(
  length: number,
  width: number,
  eaveHeight: number,
  ridgeHeight: number,
): number {
  const roofRise = Math.max(ridgeHeight - eaveHeight, 0.01);
  const slopeLength = Math.sqrt((width / 2) ** 2 + roofRise ** 2);
  return 2 * slopeLength * length;
}

function envelopeArea(
  length: number,
  width: number,
  eaveHeight: number,
  ridgeHeight: number,
): number {
  const wallArea = 2 * length * eaveHeight + 2 * width * eaveHeight;
  return wallArea + roofArea(length, width, eaveHeight, ridgeHeight);
}

function envelopeConductancePerFloor(
  length: number,
  width: number,
  eaveHeight: number,
  ridgeHeight: number,
  uValue: number,
): number {
  const area = Math.max(length * width, 1);
  return (uValue * envelopeArea(length, width, eaveHeight, ridgeHeight)) / area;
}

function transpirationFluxWm2(et0MmDay: number, crop: CropConfig): number {
  const system = normalizeCultivationSystem(crop.system);
  const etFactor = CULTIVATION_ET_FACTOR[system] ?? 1;
  const kc = cropCoefficient(crop);
  const laiEffective = effectiveLai(crop.lai, system, crop.layout.tierCount);
  const laiFactor = Math.min(laiEffective / 3, 2);
  const etRateMmH = (et0MmDay / 24) * kc * laiFactor * etFactor;
  return -(etRateMmH / 3600) * LATENT_HEAT_J_KG;
}

function applyCoolingTempFloor(
  internalTemp: number,
  externalTemp: number,
  externalRhPct: number,
  cooling: string,
): number {
  if (
    cooling === "fan_and_pad" ||
    cooling === "evaporative" ||
    cooling === "high_pressure_fog"
  ) {
    return Math.max(padCoolingTempFloorC(externalTemp, externalRhPct), internalTemp);
  }
  if (cooling === "mechanical_ac") {
    return Math.max(MECHANICAL_AC_TEMP_FLOOR_C, internalTemp);
  }
  return internalTemp;
}

/** Calibrated solar proxy used for global steady-state balance (W/m²). */
function computeCalibratedSolarWm2(
  scenario: ClimateScenario,
  transmittance: number,
): number {
  return (
    transmittance *
    260 *
    SOLAR_ABSORPTION_FRACTION *
    solarIntensityFactor(scenario) *
    solarElevationFactor(scenario)
  );
}

export function ventilationAchWithSizing(
  equipment: ClimateEquipment,
  scenario: ClimateScenario,
  length: number,
  width: number,
): number {
  const base = VENT_ACH_BASE[equipment.ventilation] ?? 2;
  const windBonus = scenario.windSpeedMS * 0.3;
  const buoyancy = equipment.ventilation.startsWith("natural") ? 0.5 : 0;
  const area = Math.max(length * width, 1);

  const sizing = equipment.sizing;
  const fanArea =
    sizing.exhaustFanCount * Math.PI * (sizing.exhaustFanDiameterM / 2) ** 2 +
    sizing.roofExhaustFanCount * Math.PI * (sizing.roofExhaustFanDiameterM / 2) ** 2;
  const ventArea =
    sizing.roofVentCount * sizing.roofVentWidthM * 1.2 +
    sizing.sideVentCount * sizing.sideVentHeightM * 1.8;

  const forcedBoost =
    (fanArea / area) * 10 +
    sizing.exhaustFanCount * 0.06 +
    (ventArea / area) * 2.5;

  return base + windBonus + buoyancy + forcedBoost;
}

function resolveSupplyState(
  equipment: ClimateEquipment,
  externalTemp: number,
  externalRhPct: number,
  internalTemp: number,
): { supplyTempC: number | null; supplyHumidityRatioKgKg: number | null } {
  if (
    equipment.cooling === "fan_and_pad" ||
    equipment.cooling === "evaporative"
  ) {
    const wetBulb = approxWetBulbC(externalTemp, externalRhPct);
    const padEff =
      resolvePadEfficiency(equipment.sizing) *
      (equipment.cooling === "evaporative" ? 0.75 : 1);
    const outlet = padOutletState(externalTemp, externalRhPct, padEff, wetBulb);
    return {
      supplyTempC: outlet.temperatureC,
      supplyHumidityRatioKgKg: outlet.humidityRatioKgKg,
    };
  }

  if (equipment.cooling === "mechanical_ac") {
    return {
      supplyTempC: Math.max(externalTemp + 4, internalTemp - 8),
      supplyHumidityRatioKgKg: null,
    };
  }

  return { supplyTempC: null, supplyHumidityRatioKgKg: null };
}

export function solveMicroclimate(
  input: MicroclimateSolveInput,
): MicroclimateSolveResult {
  const {
    scenario,
    covering,
    shadingScreen,
    equipment,
    dimensions,
    crop,
    et0MmDay = DEFAULT_ET0_MM_DAY,
    runtimeFraction = 1,
  } = input;

  const { length, width, eaveHeight, ridgeHeight } = dimensions;
  const floorArea = Math.max(length * width, 1);
  const volume = envelopeVolume(length, width, eaveHeight, ridgeHeight);
  const externalTemp = scenario.externalTempC;
  const transmittance = effectiveSolarTransmittance(covering, shadingScreen);
  const qSolar = computeCalibratedSolarWm2(scenario, transmittance);
  const qTranspiration = transpirationFluxWm2(et0MmDay, crop);

  const ach = ventilationAchWithSizing(equipment, scenario, length, width);
  const conductance = envelopeConductancePerFloor(
    length,
    width,
    eaveHeight,
    ridgeHeight,
    covering.uValue,
  );
  const ventCoeff = (1.2 * 1005 * ach * volume) / (3600 * floorArea);
  const totalCoeff = conductance + ventCoeff;

  let internalTemp =
    externalTemp + (qSolar + qTranspiration) / Math.max(totalCoeff, 0.5);

  const sizing = equipment.sizing;
  let coolDelta = COOLING_DELTA[equipment.cooling] ?? 0;
  let rhCool = COOLING_RH[equipment.cooling] ?? 0;
  let qEquipmentSensible = 0;

  if (equipment.cooling === "fan_and_pad") {
    const padCooling = computeFanAndPadCoolingC(
      externalTemp,
      scenario.externalRhPct,
      sizing,
    );
    const padAreaFactor = padCapacityFactor(sizing);
    const fanAreaFactor = exhaustCapacityFactor(sizing);
    const systemScale = 0.75 + padAreaFactor * 0.15 + Math.min(fanAreaFactor, 2.5) * 0.1;
    const effectiveDrop = padCooling.tempDropC * systemScale;
    internalTemp -= effectiveDrop;
    rhCool = padCooling.rhBoostPct * (0.85 + padAreaFactor * 0.15);
    qEquipmentSensible = -(effectiveDrop * totalCoeff);
  } else {
    if (equipment.cooling === "evaporative") {
      coolDelta *= 0.45 + padCapacityFactor(sizing) * 0.75;
    }
    if (equipment.cooling === "mechanical_ac") {
      coolDelta *= 0.45 + acCapacityFactor(sizing) * 0.85;
    }
    if (equipment.cooling === "high_pressure_fog") {
      coolDelta *= 0.45 + fogCapacityFactor(sizing) * 0.85;
    }
    coolDelta *= COOLING_CAPACITY_FACTOR;
    internalTemp += coolDelta;
    qEquipmentSensible = coolDelta * totalCoeff;

    if (equipment.cooling === "mechanical_ac") {
      rhCool -= (acCapacityFactor(sizing) - 1) * 4;
    } else if (equipment.cooling === "high_pressure_fog") {
      rhCool += (fogCapacityFactor(sizing) - 1) * 8;
    }
  }

  internalTemp = applyCoolingTempFloor(
    internalTemp,
    externalTemp,
    scenario.externalRhPct,
    equipment.cooling,
  );

  const heatingBase = HEATING_W_M2[equipment.heating] ?? 0;
  const tempDeficit = HEATING_SETPOINT_C - internalTemp;
  if (heatingBase > 0 && tempDeficit > 0) {
    const heatingFlux =
      heatingBase * Math.min(tempDeficit / 5, 1.5) * heaterCapacityFactor(sizing);
    internalTemp += heatingFlux / Math.max(covering.uValue * 2.5, 1);
    qEquipmentSensible += heatingFlux;
  }

  const system = normalizeCultivationSystem(crop.system);
  const thermalMass = CULTIVATION_THERMAL_MASS[system] ?? 1;
  internalTemp =
    externalTemp + (internalTemp - externalTemp) / Math.max(thermalMass, 1);

  const internalRh = Math.min(
    95,
    Math.max(
      30,
      scenario.externalRhPct + rhCool + (externalTemp - internalTemp),
    ),
  );

  const flows = computeVentilationFlows(
    equipment,
    scenario,
    dimensions,
    volume,
    internalTemp,
    runtimeFraction,
  );
  const recirculationM3h = circulationRecirculationM3h(equipment, runtimeFraction);
  const mixEff = mixingEffectiveness(
    flows.totalM3h,
    recirculationM3h,
    volume,
  );
  const supply = resolveSupplyState(
    equipment,
    externalTemp,
    scenario.externalRhPct,
    internalTemp,
  );

  const qCond =
    -covering.uValue *
    (envelopeArea(length, width, eaveHeight, ridgeHeight) / floorArea) *
    (internalTemp - externalTemp);
  const qVent =
    -(1.2 * 1005 * ach * volume) / (3600 * floorArea) * (internalTemp - externalTemp);
  const qNet =
    qSolar + qTranspiration + qCond + qVent + qEquipmentSensible;

  const vpdKpa = calculateVpdKpa(internalTemp, internalRh);
  const humidityRatioKgKg =
    (0.62198 * (internalRh / 100) * 101.325) /
    (101.325 - (internalRh / 100) * 101.325);

  return {
    internalTemp: Math.round(internalTemp * 10) / 10,
    externalTemp: Math.round(externalTemp * 10) / 10,
    internalRh: Math.round(internalRh * 10) / 10,
    humidityRatioKgKg,
    vpdKpa: Math.round(vpdKpa * 1000) / 1000,
    qSolar: Math.round(qSolar * 10) / 10,
    ventilationAch: Math.round(flows.ach * 100) / 100,
    mixingEffectiveness: mixEff,
    supplyTempC: supply.supplyTempC,
    supplyHumidityRatioKgKg: supply.supplyHumidityRatioKgKg,
    recirculationM3h,
    ventilationTotalM3h: flows.totalM3h,
    thermalBalance: {
      qSolar: Math.round(qSolar * 10) / 10,
      qTranspiration: Math.round(qTranspiration * 10) / 10,
      qVentilation: Math.round(qVent * 10) / 10,
      qConduction: Math.round(qCond * 10) / 10,
      qEquipmentSensible: Math.round(qEquipmentSensible * 10) / 10,
      qNetDelta: Math.round(qNet * 10) / 10,
    },
  };
}
