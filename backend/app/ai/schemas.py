"""Multi-AI gateway schemas."""

from enum import Enum

from pydantic import BaseModel, Field


class AIProviderType(str, Enum):
    OPENAI = "openai"
    ANTHROPIC = "anthropic"
    GEMINI = "gemini"
    OLLAMA = "ollama"


class GreenhouseContext(BaseModel):
    """Greenhouse state passed to AI for context-aware responses."""

    crop_type: str = Field(default="tomato")
    growth_stage: str = Field(default="mid_season")
    lai: float = Field(default=3.2, ge=0.0)
    length_m: float = Field(default=30.0, gt=0.0)
    width_m: float = Field(default=10.0, gt=0.0)
    covering_type: str = Field(default="glass")
    transmittance: float = Field(default=0.85, ge=0.0, le=1.0)
    internal_temp_c: float | None = None
    external_temp_c: float | None = None
    internal_rh_pct: float | None = None
    vpd_kpa: float | None = None
    et0_mm_day: float | None = None
    dli_mol_m2_day: float | None = None
    latitude: float | None = None
    longitude: float | None = None


class ClimateSetpoint(BaseModel):
    """Industrial climate-computer compatible setpoint."""

    parameter: str
    current_value: float
    recommended_value: float
    unit: str
    rationale: str


class AIChatRequest(BaseModel):
    provider: AIProviderType = Field(default=AIProviderType.OPENAI)
    model: str | None = Field(default=None, description="Override default model for provider")
    message: str = Field(..., min_length=1, max_length=4000)
    context: GreenhouseContext = Field(default_factory=GreenhouseContext)
    locale: str = Field(default="en", pattern="^(en|it|es|fr)$")


class OptimizeClimateRequest(BaseModel):
    provider: AIProviderType = Field(default=AIProviderType.OPENAI)
    model: str | None = None
    context: GreenhouseContext = Field(default_factory=GreenhouseContext)
    locale: str = Field(default="en", pattern="^(en|it|es|fr)$")


class AIChatResponse(BaseModel):
    provider: AIProviderType
    model: str
    content: str
    setpoints: list[ClimateSetpoint] = Field(default_factory=list)
    used_local_engine: bool = Field(default=False)


class ProviderInfo(BaseModel):
    id: AIProviderType
    name: str
    default_model: str
    available: bool
    requires_api_key: bool
