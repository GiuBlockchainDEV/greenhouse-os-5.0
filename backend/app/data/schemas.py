"""Pydantic schemas for greenhouse persistence."""

from datetime import datetime
from uuid import UUID

from pydantic import BaseModel, Field


class GreenhouseDimensionsDB(BaseModel):
    length: float
    width: float
    ridge_height: float
    eave_height: float


class CoveringMaterialDB(BaseModel):
    type: str
    transmittance: float
    u_value: float


class CropConfigDB(BaseModel):
    crop_type: str
    cultivation_system: str
    lai: float
    growth_stage: str


class GreenhouseCreate(BaseModel):
    name: str = Field(..., min_length=1, max_length=200)
    description: str | None = None
    latitude: float = Field(..., ge=-90.0, le=90.0)
    longitude: float = Field(..., ge=-180.0, le=180.0)
    dimensions: GreenhouseDimensionsDB
    covering_material: CoveringMaterialDB
    crop_config: CropConfigDB
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
