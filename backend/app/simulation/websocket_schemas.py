"""WebSocket event schemas for real-time simulation."""

from enum import Enum

from pydantic import BaseModel, Field


class WSEventType(str, Enum):
    """Supported WebSocket event types."""

    UPDATE_SIMULATION = "UPDATE_SIMULATION"
    SIMULATION_RESULTS = "SIMULATION_RESULTS"
    ERROR = "ERROR"
    PING = "PING"
    PONG = "PONG"


class WSLocation(BaseModel):
    lat: float = Field(..., ge=-90.0, le=90.0)
    lon: float = Field(..., ge=-180.0, le=180.0)
    elevation_m: float = Field(default=0.0, ge=0.0)


class WSGeometry(BaseModel):
    length: float = Field(..., gt=0.0, le=200.0)
    width: float = Field(..., gt=0.0, le=80.0)
    ridge_height: float = Field(..., gt=0.0, le=20.0)
    eave_height: float = Field(..., gt=0.0, le=15.0)


class WSMaterials(BaseModel):
    covering_type: str = Field(default="glass")
    transmittance: float = Field(default=0.85, ge=0.0, le=1.0)
    u_value: float = Field(default=5.8, ge=0.0)


class WSCrop(BaseModel):
    type: str = Field(default="tomato")
    system: str = Field(default="hydroponic_nft")
    lai: float = Field(default=3.2, ge=0.0, le=10.0)
    growth_stage: str = Field(default="mid_season")


class WSClimateOverride(BaseModel):
    """Optional external climate overrides for real-time simulation."""

    external_temp_c: float | None = Field(default=None, ge=-20.0, le=55.0)
    external_rh_pct: float | None = Field(default=None, ge=0.0, le=100.0)
    wind_speed_m_s: float | None = Field(default=None, ge=0.0, le=30.0)


class WSUpdateData(BaseModel):
    location: WSLocation
    geometry: WSGeometry
    materials: WSMaterials = Field(default_factory=WSMaterials)
    crop: WSCrop = Field(default_factory=WSCrop)
    climate: WSClimateOverride = Field(default_factory=WSClimateOverride)


class WSUpdateSimulation(BaseModel):
    event: WSEventType = WSEventType.UPDATE_SIMULATION
    data: WSUpdateData


class WSThermalBalance(BaseModel):
    q_solar: float
    q_transpiration: float
    q_ventilation: float
    q_conduction: float
    q_net_delta: float


class WSMicroclimate(BaseModel):
    internal_temp: float
    external_temp: float
    internal_rh: float
    vpd_kpa: float
    et0_fao56: float


class WSSimulationResultsData(BaseModel):
    thermal_balance: WSThermalBalance
    microclimate: WSMicroclimate
    heatmap_matrix: list[list[float]]
    computation_ms: float
    ventilation_ach: float


class WSSimulationResults(BaseModel):
    event: WSEventType = WSEventType.SIMULATION_RESULTS
    data: WSSimulationResultsData


class WSErrorPayload(BaseModel):
    event: WSEventType = WSEventType.ERROR
    message: str
