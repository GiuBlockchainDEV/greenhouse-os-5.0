"""FastAPI routes for the Multi-AI copilot gateway."""

from fastapi import APIRouter

from app.ai.gateway import MultiAIGateway
from app.ai.schemas import AIChatRequest, AIChatResponse, OptimizeClimateRequest, ProviderInfo

router = APIRouter(prefix="/ai", tags=["AI Copilot"])
_gateway = MultiAIGateway()


@router.get("/providers", response_model=list[ProviderInfo])
async def list_providers() -> list[ProviderInfo]:
    """List available AI providers and their configuration status."""
    return _gateway.list_providers()


@router.post("/chat", response_model=AIChatResponse)
async def ai_chat(request: AIChatRequest) -> AIChatResponse:
    """Send a natural-language message to the AI copilot with greenhouse context."""
    return await _gateway.chat(request)


@router.post("/optimize-climate", response_model=AIChatResponse)
async def optimize_climate(request: OptimizeClimateRequest) -> AIChatResponse:
    """Request autonomous microclimate optimization with structured setpoint output."""
    return await _gateway.optimize_climate(request)
