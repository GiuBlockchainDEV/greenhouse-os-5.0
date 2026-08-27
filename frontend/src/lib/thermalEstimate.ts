/**
 * Equipment-aware microclimate preview (mirrors backend thermal.py logic).
 */
import type {
  ClimateEquipment,
  ClimateScenario,
  CoveringMaterial,
  CropConfig,
  GreenhouseDimensions,
} from "@/types/greenhouse";
import { solarElevationFactor, solarIntensityFactor } from "@/lib/solarIrradiance";
import {
  acCapacityFactor,
  exhaustCapacityFactor,
  fogCapacityFactor,
  heaterCapacityFactor,
  padCapacityFactor,
  ventCapacityFactor,
} from "@/lib/climateEquipmentCapacity";

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
  const floorArea = Math.max(length * width, 1);
  return (uValue * envelopeArea(length, width, eaveHeight, ridgeHeight)) / floorArea;
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

  const forcedBoost = (fanArea / area) * 14 + (ventArea / area) * 4 * ventCapacityFactor(sizing);
  const circulationBoost =
    sizing.circulationFanCount * 0.22 * (300 / area);

  return base + windBonus + buoyancy + forcedBoost + circulationBoost;
}

export function estimatePreviewMicroclimate(
  scenario: ClimateScenario,
  covering: CoveringMaterial,
  equipment: ClimateEquipment,
  dimensions: GreenhouseDimensions,
  crop: CropConfig,
): {
  internalTemp: number;
  externalTemp: number;
  internalRh: number;
  qSolar: number;
  vpdKpa: number;
} {
  const { length, width, eaveHeight, ridgeHeight } = dimensions;
  const externalTemp = scenario.externalTempC - 3;
  const qSolar =
    covering.transmittance *
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

  const laiFactor = Math.min(crop.lai / 3, 2);
  const qTranspiration = -(crop.lai > 0 ? laiFactor * 45 : 20);

  let internalTemp =
    externalTemp + (qSolar + qTranspiration) / Math.max(totalCoeff, 0.5);

  const sizing = equipment.sizing;
  const exhaustCapacity = exhaustCapacityFactor(sizing);
  let coolDelta = COOLING_DELTA[equipment.cooling] ?? 0;
  if (equipment.cooling === "fan_and_pad") {
    const padCapacity = padCapacityFactor(sizing);
    coolDelta *= (0.35 + padCapacity * 0.65) * (0.55 + exhaustCapacity * 0.65);
  }
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

  const heatingBase = HEATING_W_M2[equipment.heating] ?? 0;
  if (heatingBase > 0) {
    internalTemp +=
      (heatingBase * heaterCapacityFactor(sizing) * 0.55) /
      Math.max(covering.uValue * 2.5, 1);
  }

  let rhCool = COOLING_RH[equipment.cooling] ?? 0;
  if (equipment.cooling === "fan_and_pad") {
    rhCool += (padCapacityFactor(sizing) - 1) * 6;
    rhCool -= (exhaustCapacity - 1) * 5;
  } else if (equipment.cooling === "mechanical_ac") {
    rhCool -= (acCapacityFactor(sizing) - 1) * 4;
  } else if (equipment.cooling === "high_pressure_fog") {
    rhCool += (fogCapacityFactor(sizing) - 1) * 8;
  }
  const internalRh = Math.min(
    95,
    Math.max(30, scenario.externalRhPct + rhCool + (externalTemp - internalTemp) * 1.8),
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
