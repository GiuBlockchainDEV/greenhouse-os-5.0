import type { GreenhouseAIContext } from "@/types/ai";

const SEASON_LABEL: Record<string, string> = {
  simulation: "simulation scenario (heatmap inputs)",
  summer: "summer peak",
  winter: "winter design day",
  shoulder: "spring/autumn shoulder season",
};

export function formatGreenhouseContext(ctx: GreenhouseAIContext): string {
  const siteLine =
    ctx.latitude !== undefined && ctx.longitude !== undefined
      ? `Location: ${ctx.location_label ?? "unspecified"} (${ctx.latitude}°, ${ctx.longitude}°, ${ctx.elevation_m ?? 0} m a.s.l.)`
      : `Location: ${ctx.location_label ?? "unspecified"}`;

  const lines = [
    "=== SITE ===",
    siteLine,
    `Analysis season: ${SEASON_LABEL[ctx.analysis_season ?? "simulation"] ?? ctx.analysis_season}`,
    "",
    "=== CLIMATE SCENARIO (design inputs) ===",
    `Outdoor temp: ${ctx.scenario_external_temp_c}°C | RH: ${ctx.scenario_external_rh_pct}% | Wind: ${ctx.scenario_wind_speed_m_s} m/s`,
    `Solar elevation: ${ctx.scenario_solar_elevation_deg}° | Solar intensity: ${ctx.scenario_solar_intensity_pct}%`,
    "",
    "=== GREENHOUSE STATE ===",
    `Crop: ${ctx.crop_type} | System: ${ctx.cultivation_system} | Stage: ${ctx.growth_stage} | LAI: ${ctx.lai}`,
    `Tiers: ${ctx.tier_count} | Plants/tier: ${ctx.plants_per_tier} | Total plants: ${ctx.total_plants}`,
    `Bed lines/bay: ${ctx.bed_line_count} | Total bed lines: ${ctx.total_bed_lines}`,
    "",
    "=== STRUCTURE ===",
    `Geometry: ${ctx.length_m}m × ${ctx.width_m}m | Eave: ${ctx.eave_height_m}m | Ridge: ${ctx.ridge_height_m}m`,
    `Bays: ${ctx.bay_count} × ${ctx.bay_width_m}m | Arch: ${ctx.arch_type}`,
    `Floor area: ${ctx.floor_area_m2} m² | Volume: ${ctx.volume_m3} m³ | Ridge angle: ${ctx.ridge_angle_deg}°`,
    "",
    "=== ENVELOPE & EQUIPMENT (as configured — do not assume unlisted systems) ===",
    `Covering: ${ctx.covering_type} (τ=${ctx.transmittance}, U=${ctx.u_value} W/m²K)`,
    ctx.shading_screen_installed
      ? `Shade screen: installed, ${ctx.shading_screen_deployment_pct}% deployed (effective τ=${ctx.effective_transmittance.toFixed(2)})`
      : "Shade screen: not installed",
    `Cooling: ${ctx.cooling_system} | Heating: ${ctx.heating_system} | Ventilation: ${ctx.ventilation_system}`,
    `Exhaust fans: ${ctx.exhaust_fan_count} | Circulation fans: ${ctx.circulation_fan_count}`,
    `Roof vents: ${ctx.roof_vent_count} | Side vents: ${ctx.side_vent_count} | AC units: ${ctx.ac_unit_count}`,
    `Pad wall: ${ctx.pad_wall_width_m}×${ctx.pad_wall_height_m}m | Heaters: ${ctx.heater_unit_count}`,
  ];

  lines.push("", "=== SIMULATED MICROCLIMATE (if available) ===");
  if (ctx.has_live_simulation) {
    if (ctx.internal_temp_c !== undefined) lines.push(`Internal temp: ${ctx.internal_temp_c}°C`);
    if (ctx.external_temp_c !== undefined) lines.push(`External temp (sim): ${ctx.external_temp_c}°C`);
    if (ctx.internal_rh_pct !== undefined) lines.push(`Internal RH: ${ctx.internal_rh_pct}%`);
    if (ctx.vpd_kpa !== undefined) lines.push(`VPD: ${ctx.vpd_kpa} kPa`);
    if (ctx.et0_mm_day !== undefined) lines.push(`ET₀: ${ctx.et0_mm_day} mm/day`);
    if (ctx.ventilation_ach !== undefined) lines.push(`Ventilation ACH: ${ctx.ventilation_ach}`);
    if (ctx.q_solar !== undefined) {
      lines.push(
        `Thermal balance W/m² — Q_solar: ${ctx.q_solar}, Q_transpiration: ${ctx.q_transpiration}, Q_ventilation: ${ctx.q_ventilation}, Q_conduction: ${ctx.q_conduction}, Q_net: ${ctx.q_net_delta}`,
      );
    }
  } else {
    lines.push("No live simulation yet — infer from site climate + geometry + equipment.");
  }

  return lines.join("\n");
}
