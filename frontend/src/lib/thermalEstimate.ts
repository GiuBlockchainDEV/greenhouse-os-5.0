/**
 * Equipment-aware microclimate preview (mirrors backend thermal.py logic).
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
  cropCoefficient,
  CULTIVATION_THERMAL_MASS,
  DEFAULT_ET0_MM_DAY,
  effectiveLai,
  LATENT_HEAT_J_KG,
  normalizeCultivationSystem,
  CULTIVATION_ET_FACTOR,
} from "@/lib/cultivationFactors";
import { effectiveSolarTransmittance } from "@/lib/shadingScreen";
import { solarElevationFactor, solarIntensityFactor } from "@/lib/solarIrradiance";
import {
  acCapacityFactor,
  computeFanAndPadCoolingC,
  fogCapacityFactor,
  heaterCapacityFactor,
  padCapacityFactor,
} from "@/lib/climateEquipmentCapacity";
import { padCoolingTempFloorC } from "@/lib/psychrometrics";

/** Matches backend ThermalInput.heating_setpoint_c default. */
export const HEATING_SETPOINT_C = 22;

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

const MECHANICAL_AC_TEMP_FLOOR_C = 12;

function floorArea(length: number, width: number): number {
  return length * width;
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

/** W/m² floor equivalent envelope conductance (matches backend thermal.py). */
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
  const etFactor = CULTIVATION_ET_FACTOR[system] ?? 1.0;
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

export function ventilationAchWithSizing(
  equipment: ClimateEquipment,
  scenario: ClimateScenario,
  length: number,
  width: number,
): number {
  const base = VENT_ACH_BASE[equipment.ventilation] ?? 2;
  const windBonus = scenario.windSpeedMS * 0.3;
  const buoyancy = equipment.ventilation.startsWith("natural") ? 0.5 : 0;
  const area = Math.max(floorArea(length, width), 1);

  const sizing = equipment.sizing;
  const fanArea =
    sizing.exhaustFanCount * Math.PI * (sizing.exhaustFanDiameterM / 2) ** 2 +
    sizing.roofExhaustFanCount * Math.PI * (sizing.roofExhaustFanDiameterM / 2) ** 2;
  const ventArea =
    sizing.roofVentCount * sizing.roofVentWidthM * 1.2 +
    sizing.sideVentCount * sizing.sideVentHeightM * 1.8;

  const forcedBoost = (fanArea / area) * 8 + (ventArea / area) * 2.5;
  const circulationBoost = Math.min(sizing.circulationFanCount, 24) * 0.15;

  return base + windBonus + buoyancy + forcedBoost + circulationBoost;
}

export function estimatePreviewMicroclimate(
  scenario: ClimateScenario,
  covering: CoveringMaterial,
  shadingScreen: ShadingScreen,
  equipment: ClimateEquipment,
  dimensions: GreenhouseDimensions,
  crop: CropConfig,
  et0MmDay = DEFAULT_ET0_MM_DAY,
): {
  internalTemp: number;
  externalTemp: number;
  internalRh: number;
  qSolar: number;
  vpdKpa: number;
} {
  const { length, width, eaveHeight, ridgeHeight } = dimensions;
  const externalTemp = scenario.externalTempC;
  const solarTransmittance = effectiveSolarTransmittance(covering, shadingScreen);
  const qSolar =
    solarTransmittance *
    260 *
    0.72 *
    solarIntensityFactor(scenario) *
    solarElevationFactor(scenario);

  const ach = ventilationAchWithSizing(equipment, scenario, length, width);
  const volume = envelopeVolume(length, width, eaveHeight, ridgeHeight);
  const conductance = envelopeConductancePerFloor(
    length,
    width,
    eaveHeight,
    ridgeHeight,
    covering.uValue,
  );
  const ventCoeff =
    (1.2 * 1005 * ach * volume) / (3600 * Math.max(length * width, 1));
  const totalCoeff = conductance + ventCoeff;

  const qTranspiration = transpirationFluxWm2(et0MmDay, crop);

  let internalTemp =
    externalTemp + (qSolar + qTranspiration) / Math.max(totalCoeff, 0.5);

  const sizing = equipment.sizing;
  let coolDelta = COOLING_DELTA[equipment.cooling] ?? 0;
  let rhCool = COOLING_RH[equipment.cooling] ?? 0;

  if (equipment.cooling === "fan_and_pad") {
    const padCooling = computeFanAndPadCoolingC(
      externalTemp,
      scenario.externalRhPct,
      sizing,
    );
    internalTemp -= padCooling.tempDropC;
    rhCool = padCooling.rhBoostPct;
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
    internalTemp += coolDelta;

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
    internalTemp +=
      heatingFlux / Math.max(covering.uValue * 2.5, 1);
  }

  const system = normalizeCultivationSystem(crop.system);
  const thermalMass = CULTIVATION_THERMAL_MASS[system] ?? 1.0;
  internalTemp =
    externalTemp + (internalTemp - externalTemp) / Math.max(thermalMass, 1.0);

  const internalRh = Math.min(
    95,
    Math.max(
      30,
      scenario.externalRhPct + rhCool + (externalTemp - internalTemp) * 1.0,
    ),
  );

  const es = 0.6108 * Math.exp((17.27 * internalTemp) / (internalTemp + 237.3));
  const ea = es * (internalRh / 100);
  const vpdKpa = Math.max(0, es - ea);

  return {
    internalTemp: Math.round(internalTemp * 10) / 10,
    externalTemp: Math.round(externalTemp * 10) / 10,
    internalRh: Math.round(internalRh * 10) / 10,
    qSolar: Math.round(qSolar * 10) / 10,
    vpdKpa: Math.round(vpdKpa * 1000) / 1000,
  };
}
