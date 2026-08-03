"""Decoupled Multi-AI gateway orchestrator."""

from app.ai.base import AIMessage, AIProvider
from app.ai.local_optimizer import generate_local_optimization
from app.ai.prompts import OPTIMIZE_PROMPT, SYSTEM_PROMPT, format_context
from app.ai.providers import (
    AnthropicProvider,
    GeminiProvider,
    OllamaProvider,
    OpenAIProvider,
)
from app.ai.schemas import (
    AIChatRequest,
    AIChatResponse,
    AIProviderType,
    OptimizeClimateRequest,
    ProviderInfo,
)

PROVIDER_LABELS: dict[AIProviderType, str] = {
    AIProviderType.OPENAI: "OpenAI",
    AIProviderType.ANTHROPIC: "Anthropic",
    AIProviderType.GEMINI: "Google Gemini",
    AIProviderType.OLLAMA: "Ollama (Local)",
}


class MultiAIGateway:
    """
    Routes AI requests to the selected provider with automatic fallback
    to the local FAO-56 rule-based optimizer when external APIs are unavailable.
    """

    def __init__(self) -> None:
        self._providers: dict[AIProviderType, AIProvider] = {
            AIProviderType.OPENAI: OpenAIProvider(),
            AIProviderType.ANTHROPIC: AnthropicProvider(),
            AIProviderType.GEMINI: GeminiProvider(),
            AIProviderType.OLLAMA: OllamaProvider(),
        }

    def get_provider(self, provider_type: AIProviderType) -> AIProvider:
        provider = self._providers.get(provider_type)
        if provider is None:
            raise ValueError(f"Unknown provider: {provider_type}")
        return provider

    def list_providers(self) -> list[ProviderInfo]:
        result: list[ProviderInfo] = []
        for ptype, provider in self._providers.items():
            result.append(ProviderInfo(
                id=ptype,
                name=PROVIDER_LABELS[ptype],
                default_model=provider.default_model,
                available=provider.is_available(),
                requires_api_key=ptype != AIProviderType.OLLAMA,
            ))
        return result

    async def chat(self, request: AIChatRequest) -> AIChatResponse:
        """Process a natural-language copilot message."""
        context_block = format_context(request.context)
        user_content = f"{context_block}\n\n--- USER REQUEST ---\n{request.message}"

        messages = [
            AIMessage(role="system", content=SYSTEM_PROMPT),
            AIMessage(role="user", content=user_content),
        ]

        provider = self.get_provider(request.provider)

        if provider.is_available():
            try:
                result = await provider.complete(messages, request.model)
                _, setpoints = generate_local_optimization(request.context, request.locale)
                return AIChatResponse(
                    provider=result.provider,
                    model=result.model,
                    content=result.content,
                    setpoints=setpoints if "optim" in request.message.lower() else [],
                    used_local_engine=False,
                )
            except Exception:
                pass

        content, setpoints = generate_local_optimization(request.context, request.locale)
        return AIChatResponse(
            provider=request.provider,
            model="greenhouseos-local-optimizer",
            content=content,
            setpoints=setpoints,
            used_local_engine=True,
        )

    async def optimize_climate(self, request: OptimizeClimateRequest) -> AIChatResponse:
        """Generate structured climate optimization recommendations."""
        context_block = format_context(request.context)
        user_content = f"{context_block}\n\n{OPTIMIZE_PROMPT}"

        messages = [
            AIMessage(role="system", content=SYSTEM_PROMPT),
            AIMessage(role="user", content=user_content),
        ]

        provider = self.get_provider(request.provider)

        if provider.is_available():
            try:
                result = await provider.complete(messages, request.model)
                _, setpoints = generate_local_optimization(request.context, request.locale)
                return AIChatResponse(
                    provider=result.provider,
                    model=result.model,
                    content=result.content,
                    setpoints=setpoints,
                    used_local_engine=False,
                )
            except Exception:
                pass

        content, setpoints = generate_local_optimization(request.context, request.locale)
        return AIChatResponse(
            provider=request.provider,
            model="greenhouseos-local-optimizer",
            content=content,
            setpoints=setpoints,
            used_local_engine=True,
        )
