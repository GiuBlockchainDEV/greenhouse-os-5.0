import type { ClimateComputerExport, ClimateComputerFormat } from "@/types/supabase";
import { normalizeBayArchTypes } from "@/lib/structureUtils";
import { useGreenhouseStore } from "@/store/useGreenhouseStore";

interface ExportParams {
  format: ClimateComputerFormat;
}

export async function exportClimateComputer(
  params: ExportParams,
): Promise<ClimateComputerExport> {
  const state = useGreenhouseStore.getState();
  const sim = state.simulationResults;

  const body = {
    format: params.format,
    greenhouse_name: state.name,
    internal_temp_c: sim?.microclimate.internal_temp ?? 25,
    internal_rh_pct: sim?.microclimate.internal_rh ?? 70,
    vpd_kpa: sim?.microclimate.vpd_kpa ?? 1.0,
    et0_mm_day: sim?.microclimate.et0_fao56 ?? 4.0,
    ventilation_ach: sim?.ventilation_ach ?? 2.0,
    crop_type: state.crop.type,
    growth_stage: state.crop.growthStage,
    cultivation_system: state.crop.system,
    tier_count: state.crop.layout.tierCount,
    cooling_system: state.climateEquipment.cooling,
    heating_system: state.climateEquipment.heating,
    ventilation_system: state.climateEquipment.ventilation,
  };

  const response = await fetch("/api/v1/export/climate-computer", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });

  if (!response.ok) {
    throw new Error(`Export failed: HTTP ${response.status}`);
  }

  return response.json() as Promise<ClimateComputerExport>;
}

export function downloadExport(data: ClimateComputerExport, filename: string): void {
  const blob = new Blob([JSON.stringify(data, null, 2)], { type: "application/json" });
  const url = URL.createObjectURL(blob);
  const anchor = document.createElement("a");
  anchor.href = url;
  anchor.download = filename;
  anchor.click();
  URL.revokeObjectURL(url);
}

export function computeOpexMetrics(
  floorAreaM2: number,
  qSolar: number,
  qNet: number,
): { energyKwhM2Day: number; opexEurDay: number; co2KgDay: number } {
  const energyKwhM2Day = Math.max(0, (Math.abs(qNet) + qSolar * 0.3) * 24 / 1000);
  const opexEurDay = Number((energyKwhM2Day * floorAreaM2 * 0.18).toFixed(2));
  const co2KgDay = Number((energyKwhM2Day * floorAreaM2 * 0.4).toFixed(2));
  return { energyKwhM2Day: Number(energyKwhM2Day.toFixed(3)), opexEurDay, co2KgDay };
}

export async function saveGreenhouseDesign(userId: string): Promise<void> {
  const state = useGreenhouseStore.getState();

  const body = {
    name: state.name,
    latitude: state.location.lat,
    longitude: state.location.lon,
    dimensions: {
      length: state.dimensions.length,
      width: state.dimensions.width,
      ridge_height: state.dimensions.ridgeHeight,
      eave_height: state.dimensions.eaveHeight,
    },
    structure: {
      bay_count: state.structure.bayCount,
      bay_width_m: state.structure.bayWidthM,
      bay_arch_types: normalizeBayArchTypes(
        state.structure.bayCount,
        state.structure.bayArchTypes,
      ),
    },
    covering_material: {
      type: state.covering.type,
      transmittance: state.covering.transmittance,
      u_value: state.covering.uValue,
    },
    crop_config: {
      crop_type: state.crop.type,
      cultivation_system: state.crop.system,
      lai: state.crop.lai,
      growth_stage: state.crop.growthStage,
      layout: {
        tier_count: state.crop.layout.tierCount,
        gutter_length_m: state.crop.layout.gutterLengthM,
        plants_per_tier: state.crop.layout.plantsPerTier,
        aisle_width_m: state.crop.layout.aisleWidthM,
      },
    },
    climate_equipment: {
      cooling: state.climateEquipment.cooling,
      heating: state.climateEquipment.heating,
      ventilation: state.climateEquipment.ventilation,
    },
  };

  const response = await fetch("/api/v1/greenhouses", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "X-User-Id": userId,
    },
    body: JSON.stringify(body),
  });

  if (!response.ok) {
    throw new Error(`Save failed: HTTP ${response.status}`);
  }
}
