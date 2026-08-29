"""Gemini AI copilot schemas."""

from enum import Enum

from pydantic import BaseModel, Field


class AIProviderType(str, Enum):
    GEMINI = "gemini"


class AIAnalysisType(str, Enum):
    STRUCTURAL = "structural"
    THERMAL = "thermal"
    EFFICIENCY = "efficiency"


class GreenhouseContext(BaseModel):
    """Greenhouse state passed to AI for context-aware responses."""

    crop_type: str = Field(default="tomato")
    cultivation_system: str = Field(default="nft")
    growth_stage: str = Field(default="mid_season")
    lai: float = Field(default=3.2, ge=0.0)
    tier_count: int = Field(default=1, ge=1, le=6)
    plants_per_tier: int = Field(default=100, ge=0)
    total_plants: int = Field(default=0, ge=0)
    bed_line_count: int = Field(default=0, ge=0)
    total_bed_lines: int = Field(default=0, ge=0)
    cooling_system: str = Field(default="none")
    heating_system: str = Field(default="none")
    ventilation_system: str = Field(default="natural_ridge")
    length_m: float = Field(default=30.0, gt=0.0)
    width_m: float = Field(default=10.0, gt=0.0)
    eave_height_m: float = Field(default=3.0, gt=0.0)
    ridge_height_m: float = Field(default=4.5, gt=0.0)
    bay_count: int = Field(default=1, ge=1)
    bay_width_m: float = Field(default=10.0, gt=0.0)
    arch_type: str = Field(default="triangular")
    floor_area_m2: float = Field(default=300.0, gt=0.0)
    volume_m3: float = Field(default=900.0, gt=0.0)
    ridge_angle_deg: float = Field(default=0.0, ge=0.0)
    covering_type: str = Field(default="glass")
    transmittance: float = Field(default=0.85, ge=0.0, le=1.0)
    u_value: float = Field(default=5.8, ge=0.0)
    exhaust_fan_count: int = Field(default=0, ge=0)
    exhaust_fan_diameter_m: float = Field(default=1.2, ge=0.0)
    circulation_fan_count: int = Field(default=0, ge=0)
    roof_vent_count: int = Field(default=0, ge=0)
    side_vent_count: int = Field(default=0, ge=0)
    ac_unit_count: int = Field(default=0, ge=0)
    pad_wall_width_m: float = Field(default=8.0, ge=0.0)
    pad_wall_height_m: float = Field(default=2.0, ge=0.0)
    heater_unit_count: int = Field(default=0, ge=0)
    internal_temp_c: float | None = None
    external_temp_c: float | None = None
    internal_rh_pct: float | None = None
    vpd_kpa: float | None = None
    et0_mm_day: float | None = None
    ventilation_ach: float | None = None
    q_solar: float | None = None
    q_transpiration: float | None = None
    q_ventilation: float | None = None
    q_conduction: float | None = None
    q_net_delta: float | None = None
    latitude: float | None = None
    longitude: float | None = None


class ClimateSetpoint(BaseModel):
    parameter: str
    current_value: float
    recommended_value: float
    unit: str
    rationale: str


class AIChatRequest(BaseModel):
    message: str = Field(..., min_length=1, max_length=4000)
    context: GreenhouseContext = Field(default_factory=GreenhouseContext)
    locale: str = Field(default="en", pattern="^(en|it|es|fr)$")
    model: str | None = Field(default=None, description="Override default Gemini model")


class AnalyzeRequest(BaseModel):
    analysis_type: AIAnalysisType
    context: GreenhouseContext = Field(default_factory=GreenhouseContext)
    locale: str = Field(default="en", pattern="^(en|it|es|fr)$")
    model: str | None = None


class AIChatResponse(BaseModel):
    provider: AIProviderType = AIProviderType.GEMINI
    model: str
    content: str
    setpoints: list[ClimateSetpoint] = Field(default_factory=list)
    used_local_engine: bool = Field(default=False)
    analysis_type: AIAnalysisType | None = None


class ProviderInfo(BaseModel):
    id: AIProviderType
    name: str
    default_model: str
    available: bool
    requires_api_key: bool
