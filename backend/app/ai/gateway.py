"""Google Gemini AI gateway."""

from app.ai.base import AIMessage
from app.ai.prompts import (
    analysis_prompt,
    format_context,
    gaia_unavailable_message,
    system_prompt,
)
from app.ai.providers import GeminiProvider
from app.ai.schemas import (
    AIAnalysisType,
    AIChatRequest,
    AIChatResponse,
    AnalyzeRequest,
    AIProviderType,
    ProviderInfo,
)


class MultiAIGateway:
    """Routes AI requests to Google Gemini."""

    def __init__(self) -> None:
        self._provider = GeminiProvider()

    def list_providers(self) -> list[ProviderInfo]:
        return [
            ProviderInfo(
                id=AIProviderType.GEMINI,
                name="GAIA",
                default_model=self._provider.default_model,
                available=self._provider.is_available(),
                requires_api_key=True,
            )
        ]

    async def _complete(
        self,
        locale: str,
        user_content: str,
        model: str | None = None,
    ) -> AIChatResponse:
        if not self._provider.is_available():
            return AIChatResponse(
                model="gemini-unconfigured",
                content=gaia_unavailable_message(locale),
                used_local_engine=True,
            )

        messages = [
            AIMessage(role="system", content=system_prompt(locale)),
            AIMessage(role="user", content=user_content),
        ]

        try:
            result = await self._provider.complete(messages, model)
            return AIChatResponse(
                provider=AIProviderType.GEMINI,
                model=result.model,
                content=result.content,
                used_local_engine=False,
            )
        except Exception as exc:
            return AIChatResponse(
                model="gemini-error",
                content=f"{gaia_unavailable_message(locale)}\n\n({exc})",
                used_local_engine=True,
            )

    async def chat(self, request: AIChatRequest) -> AIChatResponse:
        context_block = format_context(request.context)
        user_content = f"{context_block}\n\n--- USER REQUEST ---\n{request.message}"
        return await self._complete(request.locale, user_content, request.model)

    async def analyze(self, request: AnalyzeRequest) -> AIChatResponse:
        context_block = format_context(request.context)
        prompt = analysis_prompt(request.analysis_type, request.locale)
        user_content = f"{context_block}\n\n--- ANALYSIS TASK ---\n{prompt}"
        response = await self._complete(request.locale, user_content, request.model)
        response.analysis_type = request.analysis_type
        return response
