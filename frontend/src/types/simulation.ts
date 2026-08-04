export type WSEventType =
  | "UPDATE_SIMULATION"
  | "SIMULATION_RESULTS"
  | "ERROR"
  | "PING"
  | "PONG";

export type WSConnectionStatus =
  | "idle"
  | "connecting"
  | "connected"
  | "disconnected"
  | "error";

export interface WSLocation {
  lat: number;
  lon: number;
  elevation_m?: number;
}

export interface WSGeometry {
  length: number;
  width: number;
  ridge_height: number;
  eave_height: number;
  bay_count: number;
  bay_width_m: number;
  arch_type: string;
  bay_arch_types: string[];
}

export interface WSMaterials {
  covering_type: string;
  transmittance: number;
  u_value: number;
}

export interface WSCultivationLayout {
  tier_count: number;
  gutter_length_m: number;
  plants_per_tier: number;
  pathway_width_m: number;
  side_clearance_m: number;
}

export interface WSCrop {
  type: string;
  system: string;
  lai: number;
  growth_stage: string;
  layout: WSCultivationLayout;
}

export interface WSClimateEquipmentSizing {
  exhaust_fan_count: number;
  exhaust_fan_diameter_m: number;
  pad_wall_width_m: number;
  pad_wall_height_m: number;
  ac_unit_count: number;
  ac_unit_width_m: number;
  roof_vent_count: number;
  roof_vent_width_m: number;
  side_vent_count: number;
  side_vent_height_m: number;
  heater_unit_count: number;
  pipe_row_count: number;
  fog_line_count: number;
}

export interface WSClimateEquipment {
  cooling: string;
  heating: string;
  ventilation: string;
  sizing: WSClimateEquipmentSizing;
}

export interface WSClimateOverride {
  external_temp_c?: number;
  external_rh_pct?: number;
  wind_speed_m_s?: number;
}

export interface WSUpdatePayload {
  event: "UPDATE_SIMULATION";
  data: {
    location: WSLocation;
    geometry: WSGeometry;
    materials: WSMaterials;
    crop: WSCrop;
    equipment: WSClimateEquipment;
    climate?: WSClimateOverride;
  };
}

export interface WSThermalBalance {
  q_solar: number;
  q_transpiration: number;
  q_ventilation: number;
  q_conduction: number;
  q_net_delta: number;
}

export interface WSMicroclimate {
  internal_temp: number;
  external_temp: number;
  internal_rh: number;
  vpd_kpa: number;
  et0_fao56: number;
}

export interface WSSimulationResults {
  event: "SIMULATION_RESULTS";
  data: {
    thermal_balance: WSThermalBalance;
    microclimate: WSMicroclimate;
    heatmap_matrix: number[][];
    computation_ms: number;
    ventilation_ach: number;
  };
}

export interface WSErrorPayload {
  event: "ERROR";
  message: string;
}

export type WSIncomingMessage = WSSimulationResults | WSErrorPayload | { event: "PONG" };
