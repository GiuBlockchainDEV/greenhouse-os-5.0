import { effectiveSolarTransmittance } from "@/lib/shadingScreen";
import { useGreenhouseStore } from "@/store/useGreenhouseStore";
import type { GreenhouseAIContext } from "@/types/ai";
import type { GaiaAnalysisSeason } from "@/types/greenhouse";

interface BuildContextOptions {
  analysisSeason?: GaiaAnalysisSeason;
}

export function buildGreenhouseContext(options: BuildContextOptions = {}): GreenhouseAIContext {
  const state = useGreenhouseStore.getState();
  const sim = state.simulationResults;
  const sizing = state.climateEquipment.sizing;
  const scenario = state.climateScenario;
  const season = options.analysisSeason ?? "simulation";

  return {
    crop_type: state.crop.type,
    cultivation_system: state.crop.system,
    growth_stage: state.crop.growthStage,
    lai: state.crop.lai,
    tier_count: state.crop.layout.tierCount,
    plants_per_tier: state.metrics.plantsPerTier,
    total_plants: state.metrics.totalPlants,
    bed_line_count: state.metrics.bedLineCount,
    total_bed_lines: state.metrics.totalBedLines,
    cooling_system: state.climateEquipment.cooling,
    heating_system: state.climateEquipment.heating,
    ventilation_system: state.climateEquipment.ventilation,
    length_m: state.dimensions.length,
    width_m: state.dimensions.width,
    eave_height_m: state.dimensions.eaveHeight,
    ridge_height_m: state.dimensions.ridgeHeight,
    bay_count: state.structure.bayCount,
    bay_width_m: state.structure.bayWidthM,
    arch_type: state.structure.archType,
    floor_area_m2: state.metrics.floorAreaM2,
    volume_m3: state.metrics.volumeM3,
    ridge_angle_deg: state.metrics.ridgeAngleDeg,
    covering_type: state.covering.type,
    transmittance: state.covering.transmittance,
    u_value: state.covering.uValue,
    shading_screen_installed: state.shadingScreen.installed,
    shading_screen_deployment_pct: state.shadingScreen.deploymentPct,
    effective_transmittance: effectiveSolarTransmittance(state.covering, state.shadingScreen),
    exhaust_fan_count: sizing.exhaustFanCount,
    exhaust_fan_diameter_m: sizing.exhaustFanDiameterM,
    circulation_fan_count: sizing.circulationFanCount,
    roof_vent_count: sizing.roofVentCount,
    side_vent_count: sizing.sideVentCount,
    ac_unit_count: sizing.acUnitCount,
    pad_wall_width_m: sizing.padWallWidthM,
    pad_wall_height_m: sizing.padWallHeightM,
    heater_unit_count: sizing.heaterUnitCount,
    internal_temp_c: sim?.microclimate.internal_temp,
    external_temp_c: sim?.microclimate.external_temp,
    internal_rh_pct: sim?.microclimate.internal_rh,
    vpd_kpa: sim?.microclimate.vpd_kpa,
    et0_mm_day: sim?.microclimate.et0_fao56,
    ventilation_ach: sim?.ventilation_ach,
    q_solar: sim?.thermal_balance.q_solar,
    q_transpiration: sim?.thermal_balance.q_transpiration,
    q_ventilation: sim?.thermal_balance.q_ventilation,
    q_conduction: sim?.thermal_balance.q_conduction,
    q_net_delta: sim?.thermal_balance.q_net_delta,
    latitude: state.location.lat,
    longitude: state.location.lon,
    elevation_m: state.location.elevationM,
    location_label: state.location.label,
    analysis_season: season,
    scenario_external_temp_c: scenario.externalTempC,
    scenario_external_rh_pct: scenario.externalRhPct,
    scenario_wind_speed_m_s: scenario.windSpeedMS,
    scenario_solar_elevation_deg: scenario.solarElevationDeg,
    scenario_solar_intensity_pct: scenario.solarIntensityPct,
    has_live_simulation: sim !== null,
  };
}
