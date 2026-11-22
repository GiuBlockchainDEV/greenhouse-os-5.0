import { MARKET_GREENHOUSE_PRESETS } from "@/lib/marketGreenhousePresets";
import { MARKET_PRESET_WS_LIMITS } from "@/lib/marketGreenhouseEquipment";
import { hafFansPerBayPerRow } from "@/lib/climateEquipmentLayout";

export interface MarketPresetValidationIssue {
  presetId: string;
  field: string;
  message: string;
}

export function validateMarketGreenhousePresets(): MarketPresetValidationIssue[] {
  const issues: MarketPresetValidationIssue[] = [];
  for (const preset of MARKET_GREENHOUSE_PRESETS) {
    const s = preset.equipment.sizing;
    if (s.exhaustFanCount > MARKET_PRESET_WS_LIMITS.exhaustFanCount) {
      issues.push({
        presetId: preset.id,
        field: "exhaustFanCount",
        message: `${s.exhaustFanCount} exceeds WS limit ${MARKET_PRESET_WS_LIMITS.exhaustFanCount}`,
      });
    }
    if (s.circulationFanCount > MARKET_PRESET_WS_LIMITS.circulationFanCount) {
      issues.push({
        presetId: preset.id,
        field: "circulationFanCount",
        message: `${s.circulationFanCount} exceeds WS limit ${MARKET_PRESET_WS_LIMITS.circulationFanCount}`,
      });
    }
    if (s.roofVentCount > MARKET_PRESET_WS_LIMITS.roofVentCount) {
      issues.push({
        presetId: preset.id,
        field: "roofVentCount",
        message: `${s.roofVentCount} exceeds WS limit ${MARKET_PRESET_WS_LIMITS.roofVentCount}`,
      });
    }
    const widthM = preset.structure.bayCount * preset.structure.bayWidthM;
    if (preset.lengthM < widthM * 0.5) {
      issues.push({
        presetId: preset.id,
        field: "lengthM",
        message: "Length is unusually short relative to width",
      });
    }
    if (s.circulationFanCount > 0) {
      const perBay = hafFansPerBayPerRow(s.circulationFanCount, preset.structure.bayCount);
      if (perBay < 1) {
        issues.push({
          presetId: preset.id,
          field: "circulationFanCount",
          message: "HAF fans per bay per row is zero",
        });
      }
    }
    if (preset.equipment.cooling === "mechanical_ac" && s.exhaustFanCount > preset.structure.bayCount + 2) {
      issues.push({
        presetId: preset.id,
        field: "exhaustFanCount",
        message: "Semi-closed AC house has excessive gable exhaust count",
      });
    }
    if (preset.equipment.cooling !== "fan_and_pad" && preset.equipment.cooling !== "evaporative" && s.padWallWidthM > 2) {
      issues.push({
        presetId: preset.id,
        field: "padWallWidthM",
        message: "Pad wall width set without evaporative cooling",
      });
    }
  }
  return issues;
}