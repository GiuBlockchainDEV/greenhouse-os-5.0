"""Pydantic schemas for greenhouse persistence."""

from datetime import datetime
from uuid import UUID

from pydantic import BaseModel, Field


class GreenhouseDimensionsDB(BaseModel):
    length: float
    width: float
    ridge_height: float
    eave_height: float


class GreenhouseStructureDB(BaseModel):
    bay_count: int = Field(default=1, ge=1, le=20)
    bay_width_m: float = Field(default=10.0, gt=0.0)
    arch_type: str = Field(default="triangular")


class CoveringMaterialDB(BaseModel):
    type: str
    transmittance: float
    u_value: float


class CultivationLayoutDB(BaseModel):
    tier_count: int = Field(default=1, ge=1, le=6)
    gutter_length_m: float = Field(default=30.0)
    plants_per_tier: int = Field(default=100, ge=1)
    aisle_width_m: float = Field(default=0.8)


class ClimateEquipmentDB(BaseModel):
    cooling: str = Field(default="none")
    heating: str = Field(default="none")
    ventilation: str = Field(default="natural_ridge")


class CropConfigDB(BaseModel):
    crop_type: str
    cultivation_system: str
    lai: float
    growth_stage: str
    layout: CultivationLayoutDB = Field(default_factory=CultivationLayoutDB)


class GreenhouseCreate(BaseModel):
    name: str = Field(..., min_length=1, max_length=200)
    description: str | None = None
    latitude: float = Field(..., ge=-90.0, le=90.0)
    longitude: float = Field(..., ge=-180.0, le=180.0)
    dimensions: GreenhouseDimensionsDB
    structure: GreenhouseStructureDB = Field(default_factory=GreenhouseStructureDB)
    covering_material: CoveringMaterialDB
    crop_config: CropConfigDB
    climate_equipment: ClimateEquipmentDB = Field(default_factory=ClimateEquipmentDB)
    is_public: bool = False


class GreenhouseRecord(GreenhouseCreate):
    id: UUID
    user_id: UUID
    created_at: datetime
    updated_at: datetime


class GreenhouseListResponse(BaseModel):
    items: list[GreenhouseRecord]
    total: int
    storage_backend: str
