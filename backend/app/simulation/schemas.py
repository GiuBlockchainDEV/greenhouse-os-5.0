"""Pydantic v2 schemas for simulation inputs and outputs."""

from datetime import date
from enum import Enum

from pydantic import BaseModel, Field, model_validator


class GrowthStage(str, Enum):
    """Standardized crop growth stages for agronomic modeling."""

    SEEDLING = "seedling"
    EARLY_VEGETATIVE = "early_vegetative"
    MID_SEASON = "mid_season"
    LATE_VEGETATIVE = "late_vegetative"
    GENERATIVE = "generative"
    HARVEST = "harvest"


class CropType(str, Enum):
    """Supported greenhouse crop types."""

    TOMATO = "tomato"
    CUCUMBER = "cucumber"
    PEPPER = "pepper"
    LETTUCE = "lettuce"
    STRAWBERRY = "strawberry"
    CANNABIS = "cannabis"


class ClimateInput(BaseModel):
    """Meteorological inputs for FAO-56 and agronomic calculations."""

    latitude_deg: float = Field(..., ge=-90.0, le=90.0, description="Site latitude in decimal degrees")
    longitude_deg: float = Field(..., ge=-180.0, le=180.0, description="Site longitude in decimal degrees")
    elevation_m: float = Field(default=0.0, ge=0.0, description="Site elevation above sea level in meters")
    temperature_max_c: float = Field(..., ge=-50.0, le=60.0, description="Maximum daily air temperature in °C")
    temperature_min_c: float = Field(..., ge=-50.0, le=60.0, description="Minimum daily air temperature in °C")
    relative_humidity_pct: float = Field(..., ge=0.0, le=100.0, description="Mean relative humidity percentage")
    wind_speed_m_s: float = Field(default=2.0, ge=0.0, le=50.0, description="Wind speed at 2 m height in m/s")
    sunshine_hours: float | None = Field(default=None, ge=0.0, le=24.0, description="Sunshine duration in hours")
    solar_radiation_mj_m2_day: float | None = Field(
        default=None,
        ge=0.0,
        description="Measured daily solar radiation in MJ/m²/day",
    )
    simulation_date: date | None = Field(default=None, description="Simulation date for Julian day calculations")

    @model_validator(mode="after")
    def validate_temperature_range(self) -> "ClimateInput":
        if self.temperature_min_c > self.temperature_max_c:
            raise ValueError("temperature_min_c must be less than or equal to temperature_max_c")
        return self


class CoveringMaterial(BaseModel):
    """Greenhouse covering material optical and thermal properties."""

    type: str = Field(default="glass", description="Covering material type")
    transmittance: float = Field(default=0.85, ge=0.0, le=1.0, description="PAR/solar transmittance (0–1)")
    u_value: float = Field(default=5.8, ge=0.0, description="Thermal transmittance W/m²/K")


class SimulationRequest(BaseModel):
    """Complete simulation request payload."""

    climate: ClimateInput
    covering: CoveringMaterial = Field(default_factory=CoveringMaterial)
    crop_type: CropType = Field(default=CropType.TOMATO)
    growth_stage: GrowthStage = Field(default=GrowthStage.MID_SEASON)


class ET0Result(BaseModel):
    """FAO-56 Penman-Monteith reference evapotranspiration output."""

    et0_mm_day: float = Field(..., description="Reference ET0 in mm/day")
    net_radiation_mj_m2_day: float = Field(..., description="Net radiation Rn in MJ/m²/day")
    solar_radiation_mj_m2_day: float = Field(..., description="Global solar radiation Rs in MJ/m²/day")
    daylight_hours: float = Field(..., description="Maximum daylight hours for the date/location")


class AgronomicMetrics(BaseModel):
    """Advanced agronomic microclimate metrics."""

    vpd_kpa: float = Field(..., description="Vapor Pressure Deficit in kPa")
    vpd_stress_index: float = Field(..., ge=0.0, le=1.0, description="Normalized VPD stress (0=optimal)")
    dli_mol_m2_day: float = Field(..., description="Daily Light Integral in mol/m²/day")
    dli_adequacy_index: float = Field(..., description="Ratio of actual DLI to crop requirement")
    temperature_mean_c: float = Field(..., description="Mean daily air temperature in °C")
    saturation_vapor_pressure_kpa: float = Field(..., description="Saturation vapor pressure es in kPa")
    actual_vapor_pressure_kpa: float = Field(..., description="Actual vapor pressure ea in kPa")


class SimulationResponse(BaseModel):
    """Aggregated simulation results."""

    et0: ET0Result
    agronomic: AgronomicMetrics
    crop_type: CropType
    growth_stage: GrowthStage
