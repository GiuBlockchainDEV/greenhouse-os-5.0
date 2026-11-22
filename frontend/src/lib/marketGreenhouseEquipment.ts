/**
 * Equipment count heuristics for commercial greenhouse presets.
 * Counts are capped to match backend WebSocket limits and divisibility rules (HAF per bay).
 */

import {
  DEFAULT_CLIMATE_SIZING,
  maxExhaustFanCount,
  maxRoofVentCount,
  normalizeHafFanCount,
} from "@/lib/climateEquipmentLayout";
import type { ClimateEquipment } from "@/types/greenhouse";

/** Mirrors `ClimateEquipmentSizingInput` in backend (`schemas.py`). */
export const MARKET_PRESET_WS_LIMITS = {
  exhaustFanCount: 12,
  roofExhaustFanCount: 20,
  circulationFanCount: 24,
  roofVentCount: 12,
  sideVentCount: 10,
  acUnitCount: 8,
  heaterUnitCount: 8,
  pipeRowCount: 8,
  fogLineCount: 10,
} as const;

export interface MarketGreenhouseSpecSlice {
  bays: number;
  bayM: number;
  lengthM: number;
  eaveM: number;
  ridgeM: number;
  cover: "glass" | "polycarbonate" | "polyethylene" | "etfe";
  cooling: ClimateEquipment["cooling"];
  heating: ClimateEquipment["heating"];
  ventilation: ClimateEquipment["ventilation"];
}

function clampCount(value: number, max: number): number {
  return Math.min(max, Math.max(0, Math.floor(value)));
}

function needsGableExhaust(
  cooling: ClimateEquipment["cooling"],
  ventilation: ClimateEquipment["ventilation"],
): boolean {
  if (cooling === "fan_and_pad" || cooling === "evaporative") {
    return true;
  }
  if (ventilation === "forced_exhaust") {
    return true;
  }
  if (ventilation === "combined") {
    return true;
  }
  return false;
}

function needsPadWall(cooling: ClimateEquipment["cooling"]): boolean {
  return cooling === "fan_and_pad" || cooling === "evaporative";
}

function needsRoofVents(ventilation: ClimateEquipment["ventilation"]): boolean {
  return (
    ventilation === "roof_vents" ||
    ventilation === "natural_ridge" ||
    ventilation === "combined"
  );
}

function needsSideVents(ventilation: ClimateEquipment["ventilation"]): boolean {
  return ventilation === "side_vents" || ventilation === "combined";
}

/** Largest HAF total ≤ ceiling that satisfies even rows and per-bay divisibility. */
export function capHafFanCount(requested: number, bayCount: number, ceiling = MARKET_PRESET_WS_LIMITS.circulationFanCount): number {
  const bays = Math.max(1, bayCount);
  const normalized = normalizeHafFanCount(requested, bays).total;
  if (normalized <= ceiling && normalized > 0) {
    return normalized;
  }
  for (let total = Math.min(ceiling, Math.floor(ceiling / 2) * 2); total >= 2 * bays; total -= 2) {
    const perRow = total / 2;
    if (perRow % bays === 0) {
      return total;
    }
  }
  return 2 * bays;
}

function hafFanCountFor(spec: MarketGreenhouseSpecSlice): number {
  const bays = spec.bays;
  const highTech =
    spec.cover === "glass" ||
    spec.cover === "etfe" ||
    spec.cooling === "mechanical_ac" ||
    spec.cooling === "high_pressure_fog";

  let requested = highTech ? bays * 4 : bays * 2;
  if (spec.lengthM < 45) {
    requested = Math.min(requested, bays * 2);
  }
  if (spec.heating === "none" && spec.cooling === "fan_and_pad" && spec.cover === "polyethylene") {
    requested = Math.min(requested, bays * 2);
  }
  return capHafFanCount(requested, bays);
}

function gableExhaustCount(spec: MarketGreenhouseSpecSlice, greenhouseWidthM: number): number {
  if (!needsGableExhaust(spec.cooling, spec.ventilation)) {
    return 0;
  }
  const layoutMax = maxExhaustFanCount(greenhouseWidthM, DEFAULT_CLIMATE_SIZING.exhaustFanDiameterM);
  let target = Math.min(layoutMax, Math.max(2, Math.round(greenhouseWidthM / 3.2)));

  if (spec.cooling === "mechanical_ac") {
    target = Math.min(target, Math.max(2, spec.bays));
  }
  if (spec.cooling === "high_pressure_fog" && spec.ventilation === "roof_vents") {
    return 0;
  }
  return clampCount(target, MARKET_PRESET_WS_LIMITS.exhaustFanCount);
}

function roofExhaustCount(spec: MarketGreenhouseSpecSlice): number {
  if (spec.ventilation !== "combined") {
    return 0;
  }
  const base = Math.max(1, Math.round(spec.bays / 2));
  const semiClosed = spec.cooling === "mechanical_ac";
  const target = semiClosed ? Math.min(base, Math.max(1, Math.ceil(spec.bays / 3))) : base;
  return clampCount(target, MARKET_PRESET_WS_LIMITS.roofExhaustFanCount);
}

export function equipmentSizingForMarketSpec(spec: MarketGreenhouseSpecSlice) {
  const width = spec.bays * spec.bayM;
  const area = width * spec.lengthM;
  const sizing = { ...DEFAULT_CLIMATE_SIZING };

  sizing.circulationFanCount = hafFanCountFor(spec);
  sizing.exhaustFanCount = gableExhaustCount(spec, width);
  sizing.roofExhaustFanCount = roofExhaustCount(spec);

  if (needsPadWall(spec.cooling)) {
    sizing.padWallWidthM = Number(Math.min(width * 0.95, width * 0.9).toFixed(1));
    sizing.padWallHeightM = Math.min(2.8, Math.max(1.2, spec.eaveM - 0.8));
  } else {
    sizing.padWallWidthM = 0;
    sizing.padWallHeightM = DEFAULT_CLIMATE_SIZING.padWallHeightM;
  }

  sizing.acUnitCount =
    spec.cooling === "mechanical_ac"
      ? clampCount(Math.max(2, Math.round(area / 1800)), MARKET_PRESET_WS_LIMITS.acUnitCount)
      : 0;

  sizing.fogLineCount =
    spec.cooling === "high_pressure_fog"
      ? clampCount(spec.bays, MARKET_PRESET_WS_LIMITS.fogLineCount)
      : 0;

  if (needsRoofVents(spec.ventilation)) {
    const target = Math.min(maxRoofVentCount(spec.bays, spec.lengthM), Math.max(spec.bays, Math.round(spec.lengthM / 10)));
    sizing.roofVentCount = clampCount(target, MARKET_PRESET_WS_LIMITS.roofVentCount);
  } else {
    sizing.roofVentCount = 0;
  }

  sizing.sideVentCount = needsSideVents(spec.ventilation)
    ? clampCount(Math.max(2, spec.bays), MARKET_PRESET_WS_LIMITS.sideVentCount)
    : 0;

  sizing.pipeRowCount =
    spec.heating === "hot_water_pipes"
      ? clampCount(Math.min(6, Math.max(2, spec.bays)), MARKET_PRESET_WS_LIMITS.pipeRowCount)
      : 0;

  sizing.heaterUnitCount =
    spec.heating === "unit_heater" || spec.heating === "air_heater"
      ? clampCount(Math.max(2, Math.round(area / 700)), MARKET_PRESET_WS_LIMITS.heaterUnitCount)
      : 0;

  return sizing;
}

export function buildClimateEquipmentForMarketSpec(spec: MarketGreenhouseSpecSlice): ClimateEquipment {
  return {
    cooling: spec.cooling,
    heating: spec.heating,
    ventilation: spec.ventilation,
    sizing: equipmentSizingForMarketSpec(spec),
  };
}

/** Recompute preset-derived equipment counts after the user edits bays or dimensions. */
export function resyncMarketEquipmentSizing(input: {
  structure: { bayCount: number; bayWidthM: number };
  dimensions: { length: number; eaveHeight: number; ridgeHeight: number };
  coveringType: MarketGreenhouseSpecSlice["cover"];
  equipment: Pick<ClimateEquipment, "cooling" | "heating" | "ventilation">;
  existingSizing: ClimateEquipment["sizing"];
}) {
  const fresh = equipmentSizingForMarketSpec({
    bays: input.structure.bayCount,
    bayM: input.structure.bayWidthM,
    lengthM: input.dimensions.length,
    eaveM: input.dimensions.eaveHeight,
    ridgeM: input.dimensions.ridgeHeight,
    cover: input.coveringType,
    cooling: input.equipment.cooling,
    heating: input.equipment.heating,
    ventilation: input.equipment.ventilation,
  });
  return { ...input.existingSizing, ...fresh };
}