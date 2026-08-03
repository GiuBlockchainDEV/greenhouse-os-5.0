"""Industrial climate computer export schemas."""

from enum import Enum

from pydantic import BaseModel, Field


class ClimateComputerFormat(str, Enum):
    PRIVA = "priva"
    RIDDER = "ridder"
    HOOGENDOORN = "hoogendoorn"


class ExportSetpoint(BaseModel):
    tag: str
    name: str
    value: float
    unit: str
    min_value: float | None = None
    max_value: float | None = None


class ExportRule(BaseModel):
    condition: str
    action: str
    priority: int = Field(default=1, ge=1, le=10)


class ClimateComputerExport(BaseModel):
    format: ClimateComputerFormat
    version: str = "1.0"
    greenhouse_name: str
    exported_at: str
    setpoints: list[ExportSetpoint]
    rules: list[ExportRule] = Field(default_factory=list)
    metadata: dict[str, str | float | int] = Field(default_factory=dict)


class ExportRequest(BaseModel):
    format: ClimateComputerFormat = ClimateComputerFormat.PRIVA
    greenhouse_name: str = "Virtual Twin"
    internal_temp_c: float = Field(default=25.0)
    internal_rh_pct: float = Field(default=70.0)
    vpd_kpa: float = Field(default=1.0)
    et0_mm_day: float = Field(default=4.0)
    ventilation_ach: float = Field(default=2.0)
    crop_type: str = Field(default="tomato")
    growth_stage: str = Field(default="mid_season")
