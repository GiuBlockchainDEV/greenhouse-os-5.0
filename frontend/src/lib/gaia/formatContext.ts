import type { GreenhouseAIContext } from "@/types/ai";

export function formatGreenhouseContext(ctx: GreenhouseAIContext): string {
  const lines = [
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
    "=== ENVELOPE & EQUIPMENT ===",
    `Covering: ${ctx.covering_type} (τ=${ctx.transmittance}, U=${ctx.u_value} W/m²K)`,
    `Cooling: ${ctx.cooling_system} | Heating: ${ctx.heating_system} | Ventilation: ${ctx.ventilation_system}`,
    `Exhaust fans: ${ctx.exhaust_fan_count} × Ø${ctx.exhaust_fan_diameter_m}m | Circulation: ${ctx.circulation_fan_count}`,
    `Roof vents: ${ctx.roof_vent_count} | Side vents: ${ctx.side_vent_count} | AC units: ${ctx.ac_unit_count}`,
    `Pad wall: ${ctx.pad_wall_width_m}×${ctx.pad_wall_height_m}m | Heaters: ${ctx.heater_unit_count}`,
  ];

  if (ctx.latitude !== undefined && ctx.longitude !== undefined) {
    lines.push(`Location: ${ctx.latitude}°, ${ctx.longitude}°`);
  }

  lines.push("", "=== MICROCLIMATE ===");

  if (ctx.internal_temp_c !== undefined) lines.push(`Internal temp: ${ctx.internal_temp_c}°C`);
  if (ctx.external_temp_c !== undefined) lines.push(`External temp: ${ctx.external_temp_c}°C`);
  if (ctx.internal_rh_pct !== undefined) lines.push(`Internal RH: ${ctx.internal_rh_pct}%`);
  if (ctx.vpd_kpa !== undefined) lines.push(`VPD: ${ctx.vpd_kpa} kPa`);
  if (ctx.et0_mm_day !== undefined) lines.push(`ET₀: ${ctx.et0_mm_day} mm/day`);
  if (ctx.ventilation_ach !== undefined) lines.push(`Ventilation ACH: ${ctx.ventilation_ach}`);

  if (ctx.q_solar !== undefined) {
    lines.push(
      "",
      "=== THERMAL BALANCE (W/m²) ===",
      `Q_solar: ${ctx.q_solar} | Q_transpiration: ${ctx.q_transpiration}`,
      `Q_ventilation: ${ctx.q_ventilation} | Q_conduction: ${ctx.q_conduction}`,
      `Q_net_delta: ${ctx.q_net_delta}`,
    );
  }

  return lines.join("\n");
}
