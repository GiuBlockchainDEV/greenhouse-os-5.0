export type AIProviderType = "gemini";

export type AIAnalysisType = "structural" | "thermal" | "efficiency";

export interface GreenhouseAIContext {
  crop_type: string;
  cultivation_system: string;
  growth_stage: string;
  lai: number;
  tier_count: number;
  plants_per_tier: number;
  total_plants: number;
  bed_line_count: number;
  total_bed_lines: number;
  cooling_system: string;
  heating_system: string;
  ventilation_system: string;
  length_m: number;
  width_m: number;
  eave_height_m: number;
  ridge_height_m: number;
  bay_count: number;
  bay_width_m: number;
  arch_type: string;
  floor_area_m2: number;
  volume_m3: number;
  ridge_angle_deg: number;
  covering_type: string;
  transmittance: number;
  u_value: number;
  exhaust_fan_count: number;
  exhaust_fan_diameter_m: number;
  circulation_fan_count: number;
  roof_vent_count: number;
  side_vent_count: number;
  ac_unit_count: number;
  pad_wall_width_m: number;
  pad_wall_height_m: number;
  heater_unit_count: number;
  internal_temp_c?: number;
  external_temp_c?: number;
  internal_rh_pct?: number;
  vpd_kpa?: number;
  et0_mm_day?: number;
  ventilation_ach?: number;
  q_solar?: number;
  q_transpiration?: number;
  q_ventilation?: number;
  q_conduction?: number;
  q_net_delta?: number;
  latitude?: number;
  longitude?: number;
}

export interface ClimateSetpoint {
  parameter: string;
  current_value: number;
  recommended_value: number;
  unit: string;
  rationale: string;
}

export interface AIChatRequest {
  message: string;
  context: GreenhouseAIContext;
  locale: string;
  model?: string;
}

export interface AnalyzeRequest {
  analysis_type: AIAnalysisType;
  context: GreenhouseAIContext;
  locale: string;
  model?: string;
}

export interface AIChatResponse {
  provider: AIProviderType;
  model: string;
  content: string;
  setpoints: ClimateSetpoint[];
  used_local_engine: boolean;
  analysis_type?: AIAnalysisType;
}

export interface ProviderInfo {
  id: AIProviderType;
  name: string;
  default_model: string;
  available: boolean;
  requires_api_key: boolean;
}

export interface CopilotMessage {
  id: string;
  role: "user" | "assistant";
  content: string;
  setpoints?: ClimateSetpoint[];
  usedLocalEngine?: boolean;
  analysisType?: AIAnalysisType;
  timestamp: number;
}

export type CopilotStatus = "idle" | "loading" | "error";
