"""Greenhouse data persistence API routes."""

from uuid import UUID

from fastapi import APIRouter, Header, HTTPException

from app.data.greenhouse_service import GreenhouseService
from app.data.schemas import GreenhouseCreate, GreenhouseListResponse, GreenhouseRecord

router = APIRouter(prefix="/greenhouses", tags=["Greenhouses"])
_service = GreenhouseService()


def _parse_user_id(x_user_id: str | None) -> UUID:
    if not x_user_id:
        raise HTTPException(status_code=401, detail="X-User-Id header required")
    try:
        return UUID(x_user_id)
    except ValueError as exc:
        raise HTTPException(status_code=400, detail="Invalid X-User-Id format") from exc


@router.get("", response_model=GreenhouseListResponse)
async def list_greenhouses(
    x_user_id: str | None = Header(default=None),
) -> GreenhouseListResponse:
    """List greenhouses for the authenticated user."""
    user_id = _parse_user_id(x_user_id)
    return await _service.list_greenhouses(user_id)


@router.post("", response_model=GreenhouseRecord, status_code=201)
async def create_greenhouse(
    payload: GreenhouseCreate,
    x_user_id: str | None = Header(default=None),
) -> GreenhouseRecord:
    """Save a greenhouse design to Supabase (or in-memory fallback)."""
    user_id = _parse_user_id(x_user_id)
    return await _service.create_greenhouse(user_id, payload)


@router.delete("/{greenhouse_id}", status_code=204)
async def delete_greenhouse(
    greenhouse_id: UUID,
    x_user_id: str | None = Header(default=None),
) -> None:
    """Delete a greenhouse design."""
    user_id = _parse_user_id(x_user_id)
    deleted = await _service.delete_greenhouse(user_id, greenhouse_id)
    if not deleted:
        raise HTTPException(status_code=404, detail="Greenhouse not found")
