"""Google Gemini generateContent provider."""

import httpx

from app.ai.base import AIMessage, AICompletionResult, AIProvider
from app.ai.schemas import AIProviderType
from app.core.config import settings


class GeminiProvider(AIProvider):
    provider_type = AIProviderType.GEMINI

    @property
    def default_model(self) -> str:
        return settings.gemini_model

    def is_available(self) -> bool:
        return bool(settings.gemini_api_key)

    async def complete(
        self,
        messages: list[AIMessage],
        model: str | None = None,
    ) -> AICompletionResult:
        if not settings.gemini_api_key:
            raise RuntimeError("Gemini API key not configured")

        used_model = model or self.default_model
        combined = "\n\n".join(
            f"[{m.role.upper()}]\n{m.content}" for m in messages
        )

        url = (
            f"{settings.gemini_base_url}/v1beta/models/"
            f"{used_model}:generateContent?key={settings.gemini_api_key}"
        )
        payload = {
            "contents": [{"parts": [{"text": combined}]}],
            "generationConfig": {"temperature": 0.4, "maxOutputTokens": 1024},
        }

        async with httpx.AsyncClient(timeout=60.0) as client:
            response = await client.post(url, json=payload)
            response.raise_for_status()
            data = response.json()

        content = data["candidates"][0]["content"]["parts"][0]["text"]
        return AICompletionResult(
            content=content,
            model=used_model,
            provider=AIProviderType.GEMINI,
        )
