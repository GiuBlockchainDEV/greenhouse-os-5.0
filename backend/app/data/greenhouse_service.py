"""Supabase client and greenhouse persistence service."""

from datetime import datetime, timezone
from uuid import UUID, uuid4

import httpx

from app.core.config import settings
from app.data.schemas import (
    GreenhouseCreate,
    GreenhouseListResponse,
    GreenhouseRecord,
)


class GreenhouseService:
    """
    Greenhouse CRUD service with Supabase PostgREST backend.

    Falls back to in-memory storage when Supabase is not configured,
    enabling local development without external dependencies.
    """

    def __init__(self) -> None:
        self._memory_store: dict[str, GreenhouseRecord] = {}

    @property
    def backend_name(self) -> str:
        return "supabase" if settings.supabase_configured else "in_memory"

    def _headers(self, user_token: str | None = None) -> dict[str, str]:
        key = user_token or settings.supabase_service_role_key or settings.supabase_anon_key
        return {
            "apikey": settings.supabase_anon_key,
            "Authorization": f"Bearer {key}",
            "Content-Type": "application/json",
            "Prefer": "return=representation",
        }

    async def list_greenhouses(self, user_id: UUID) -> GreenhouseListResponse:
        if not settings.supabase_configured:
            items = [g for g in self._memory_store.values() if g.user_id == user_id]
            return GreenhouseListResponse(
                items=sorted(items, key=lambda g: g.updated_at, reverse=True),
                total=len(items),
                storage_backend=self.backend_name,
            )

        url = f"{settings.supabase_url}/rest/v1/greenhouses?user_id=eq.{user_id}&order=updated_at.desc"
        async with httpx.AsyncClient(timeout=15.0) as client:
            response = await client.get(url, headers=self._headers())
            response.raise_for_status()
            rows = response.json()

        items = [GreenhouseRecord.model_validate(row) for row in rows]
        return GreenhouseListResponse(
            items=items,
            total=len(items),
            storage_backend=self.backend_name,
        )

    async def create_greenhouse(
        self,
        user_id: UUID,
        payload: GreenhouseCreate,
    ) -> GreenhouseRecord:
        now = datetime.now(timezone.utc)
        record = GreenhouseRecord(
            id=uuid4(),
            user_id=user_id,
            created_at=now,
            updated_at=now,
            **payload.model_dump(),
        )

        if not settings.supabase_configured:
            self._memory_store[str(record.id)] = record
            return record

        body = {
            "user_id": str(user_id),
            **payload.model_dump(),
        }
        url = f"{settings.supabase_url}/rest/v1/greenhouses"
        async with httpx.AsyncClient(timeout=15.0) as client:
            response = await client.post(url, json=body, headers=self._headers())
            response.raise_for_status()
            rows = response.json()

        return GreenhouseRecord.model_validate(rows[0])

    async def delete_greenhouse(self, user_id: UUID, greenhouse_id: UUID) -> bool:
        if not settings.supabase_configured:
            key = str(greenhouse_id)
            existing = self._memory_store.get(key)
            if existing and existing.user_id == user_id:
                del self._memory_store[key]
                return True
            return False

        url = (
            f"{settings.supabase_url}/rest/v1/greenhouses"
            f"?id=eq.{greenhouse_id}&user_id=eq.{user_id}"
        )
        async with httpx.AsyncClient(timeout=15.0) as client:
            response = await client.delete(url, headers=self._headers())
            response.raise_for_status()
        return True
