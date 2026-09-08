/**
 * Qatar-corrected steady-state greenhouse microclimate solver.
 * Single source of truth for preview microclimate and spatial field inputs.
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
  CULTIVATION_ET_FACTOR,
  DEFAULT_ET0_MM_DAY,
  effectiveLai,
  LATENT_HEAT_J_KG,
  normalizeCultivationSystem,
} from "@/lib/cultivationFactors";
import { effectiveSolarTransmittance } from "@/lib/shadingScreen";
import { solarElevationFactor, solarIntensityFactor } from "@/lib/solarIrradiance";
import { approxWetBulbC } from "@/lib/psychrometrics";
import {
  CP_AIR_J_KG_K,
  DEFAULT_GROUND_TEMP_OFFSET_C,
  DEFAULT_GROUND_U_W_M2_K,
  HEATING_SETPOINT_C,
  NUMERICAL_TEMP_GUARD_C,
  NUMERICAL_TEMP_GUARD_MAX_C,
  RHO_AIR_KG_M3,
  SOLAR_ABSORPTION_FRACTION,
} from "@/lib/thermal/constants";
import {
  computeCoolingLoads,
  computeHeatingLoad,
  hafMotorHeatWm2,
} from "@/lib/thermal/equipmentLoads";
import {
  humidityRatioKgKg,
  rhPctFromHumidityRatio,
  saturationHumidityRatioKgKg,
} from "@/lib/thermal/psychrometricsExtended";
import {
  circulationRecirculationM3h,
  computeVentilationFlows,
  mixingEffectiveness,
} from "@/lib/thermal/ventilationFlow";
import { calculateVpdKpa } from "@/lib/thermal/vpd";

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

function computeSolarIrradianceWm2(
  scenario: ClimateScenario,
  transmittance: number,
): number {
  const ghi =
    1000 *
    solarIntensityFactor(scenario) *
    solarElevationFactor(scenario);
  return ghi * transmittance * SOLAR_ABSORPTION_FRACTION;
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

function transpirationMoistureKgSm2s(et0MmDay: number, crop: CropConfig): number {
  const system = normalizeCultivationSystem(crop.system);
  const etFactor = CULTIVATION_ET_FACTOR[system] ?? 1;
  const kc = cropCoefficient(crop);
  const laiEffective = effectiveLai(crop.lai, system, crop.layout.tierCount);
  const laiFactor = Math.min(laiEffective / 3, 2);
  const etRateMmH = (et0MmDay / 24) * kc * laiFactor * etFactor;
  return etRateMmH / 3600;
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
    groundTempC,
  } = input;

  const { length, width, eaveHeight, ridgeHeight } = dimensions;
  const floorArea = Math.max(length * width, 1);
  const volume = envelopeVolume(length, width, eaveHeight, ridgeHeight);
  const envelopeA = envelopeArea(length, width, eaveHeight, ridgeHeight);
  const externalTemp = scenario.externalTempC;
  const transmittance = effectiveSolarTransmittance(covering, shadingScreen);
  const qSolar = computeSolarIrradianceWm2(scenario, transmittance);
  const qTranspiration = transpirationFluxWm2(et0MmDay, crop);
  const mDotCrop = transpirationMoistureKgSm2s(et0MmDay, crop);
  const wOut = humidityRatioKgKg(externalTemp, scenario.externalRhPct);
  const groundT = groundTempC ?? externalTemp + DEFAULT_GROUND_TEMP_OFFSET_C;

  let internalTemp = externalTemp;
  let wIn = wOut;

  for (let iteration = 0; iteration < 24; iteration++) {
    const flows = computeVentilationFlows(
      equipment,
      scenario,
      dimensions,
      volume,
      internalTemp,
      runtimeFraction,
    );
    const conductance = (covering.uValue * envelopeA) / floorArea;
    const ventCoeff =
      (RHO_AIR_KG_M3 * CP_AIR_J_KG_K * flows.totalM3h) / (3600 * floorArea);
    const groundCoeff = (DEFAULT_GROUND_U_W_M2_K * floorArea) / floorArea;
    const totalCoeff = conductance + ventCoeff + groundCoeff;

    const qCond =
      -covering.uValue * (envelopeA / floorArea) * (internalTemp - externalTemp);
    const qGround = -DEFAULT_GROUND_U_W_M2_K * (internalTemp - groundT);
    const qVent =
      -(RHO_AIR_KG_M3 * CP_AIR_J_KG_K * flows.totalM3h) /
      (3600 * floorArea) *
      (internalTemp - externalTemp);

    const cooling = computeCoolingLoads(
      equipment,
      externalTemp,
      scenario.externalRhPct,
      internalTemp,
      floorArea,
      flows.mechanicalM3h,
      runtimeFraction,
    );
    const heating = computeHeatingLoad(
      equipment,
      internalTemp,
      HEATING_SETPOINT_C,
      floorArea,
      runtimeFraction,
    );
    const qMotor = hafMotorHeatWm2(equipment.sizing, floorArea, runtimeFraction);

    const qEquipment =
      cooling.sensibleWm2 + heating.sensibleWm2 + qMotor;
    const qNet =
      qSolar +
      qTranspiration +
      qCond +
      qGround +
      qVent +
      qEquipment;

    internalTemp += qNet / Math.max(totalCoeff, 0.35);

    const mDotVent =
      (RHO_AIR_KG_M3 * flows.totalM3h / 3600) * (wOut - wIn) / floorArea;
    const moistureNet =
      mDotCrop +
      cooling.moistureSourceKgSm2s +
      mDotVent;
    const dryAirMass = (RHO_AIR_KG_M3 * volume) / floorArea;
    wIn += (moistureNet / Math.max(dryAirMass, 0.5)) * 0.35;

    const wSat = saturationHumidityRatioKgKg(internalTemp);
    wIn = Math.max(0.0005, Math.min(wSat * 0.98, wIn));
  }

  internalTemp = Math.max(
    NUMERICAL_TEMP_GUARD_C,
    Math.min(NUMERICAL_TEMP_GUARD_MAX_C, internalTemp),
  );

  if (
    equipment.cooling === "fan_and_pad" ||
    equipment.cooling === "evaporative" ||
    equipment.cooling === "high_pressure_fog"
  ) {
    const wetBulb = approxWetBulbC(externalTemp, scenario.externalRhPct);
    internalTemp = Math.max(wetBulb, internalTemp);
  }

  const finalFlows = computeVentilationFlows(
    equipment,
    scenario,
    dimensions,
    volume,
    internalTemp,
    runtimeFraction,
  );
  const recirculationM3h = circulationRecirculationM3h(equipment, runtimeFraction);
  const mixEff = mixingEffectiveness(
    finalFlows.totalM3h,
    recirculationM3h,
    volume,
  );

  const coolingFinal = computeCoolingLoads(
    equipment,
    externalTemp,
    scenario.externalRhPct,
    internalTemp,
    floorArea,
    finalFlows.mechanicalM3h,
    runtimeFraction,
  );
  const heatingFinal = computeHeatingLoad(
    equipment,
    internalTemp,
    HEATING_SETPOINT_C,
    floorArea,
    runtimeFraction,
  );
  const qMotor = hafMotorHeatWm2(equipment.sizing, floorArea, runtimeFraction);
  const qCond =
    -covering.uValue * (envelopeA / floorArea) * (internalTemp - externalTemp);
  const qVent =
    -(RHO_AIR_KG_M3 * CP_AIR_J_KG_K * finalFlows.totalM3h) /
    (3600 * floorArea) *
    (internalTemp - externalTemp);
  const qEquipment =
    coolingFinal.sensibleWm2 + heatingFinal.sensibleWm2 + qMotor;

  const internalRh = rhPctFromHumidityRatio(internalTemp, wIn);
  const vpdKpa = calculateVpdKpa(internalTemp, internalRh);

  return {
    internalTemp: Math.round(internalTemp * 10) / 10,
    externalTemp: Math.round(externalTemp * 10) / 10,
    internalRh: Math.round(internalRh * 10) / 10,
    humidityRatioKgKg: wIn,
    vpdKpa: Math.round(vpdKpa * 1000) / 1000,
    qSolar: Math.round(qSolar * 10) / 10,
    ventilationAch: Math.round(finalFlows.ach * 100) / 100,
    mixingEffectiveness: mixEff,
    supplyTempC: coolingFinal.supplyTempC ?? heatingFinal.supplyTempC,
    supplyHumidityRatioKgKg: coolingFinal.supplyHumidityRatioKgKg,
    recirculationM3h,
    ventilationTotalM3h: finalFlows.totalM3h,
    thermalBalance: {
      qSolar: Math.round(qSolar * 10) / 10,
      qTranspiration: Math.round(qTranspiration * 10) / 10,
      qVentilation: Math.round(qVent * 10) / 10,
      qConduction: Math.round(qCond * 10) / 10,
      qEquipmentSensible: Math.round(qEquipment * 10) / 10,
      qNetDelta: Math.round(
        (qSolar + qTranspiration + qVent + qCond + qEquipment) * 10,
      ) / 10,
    },
  };
}

export { HEATING_SETPOINT_C };
