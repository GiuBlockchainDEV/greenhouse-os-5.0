"""FastAPI routes for the Gemini AI copilot."""

from fastapi import APIRouter

from app.ai.gateway import MultiAIGateway
from app.ai.schemas import AIChatRequest, AIChatResponse, AnalyzeRequest, ProviderInfo

router = APIRouter(prefix="/ai", tags=["AI Copilot"])
_gateway = MultiAIGateway()


@router.get("/providers", response_model=list[ProviderInfo])
async def list_providers() -> list[ProviderInfo]:
    """List Gemini provider status."""
    return _gateway.list_providers()


@router.post("/chat", response_model=AIChatResponse)
async def ai_chat(request: AIChatRequest) -> AIChatResponse:
    """Send a natural-language message to Gemini with greenhouse context."""
    return await _gateway.chat(request)


@router.post("/analyze", response_model=AIChatResponse)
async def analyze_greenhouse(request: AnalyzeRequest) -> AIChatResponse:
    """Run a preset structural, thermal, or efficiency analysis in the user's locale."""
    return await _gateway.analyze(request)
