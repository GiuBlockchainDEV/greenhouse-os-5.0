export type AIProviderType = "openai" | "anthropic" | "gemini" | "ollama";

export interface GreenhouseAIContext {
  crop_type: string;
  cultivation_system: string;
  growth_stage: string;
  lai: number;
  tier_count: number;
  plants_per_tier: number;
  cooling_system: string;
  heating_system: string;
  ventilation_system: string;
  length_m: number;
  width_m: number;
  covering_type: string;
  transmittance: number;
  internal_temp_c?: number;
  external_temp_c?: number;
  internal_rh_pct?: number;
  vpd_kpa?: number;
  et0_mm_day?: number;
  dli_mol_m2_day?: number;
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
  provider: AIProviderType;
  model?: string;
  message: string;
  context: GreenhouseAIContext;
  locale: string;
}

export interface OptimizeClimateRequest {
  provider: AIProviderType;
  model?: string;
  context: GreenhouseAIContext;
  locale: string;
}

export interface AIChatResponse {
  provider: AIProviderType;
  model: string;
  content: string;
  setpoints: ClimateSetpoint[];
  used_local_engine: boolean;
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
  timestamp: number;
}

export type CopilotStatus = "idle" | "loading" | "error";
