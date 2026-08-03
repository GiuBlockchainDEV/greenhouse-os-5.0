"""OpenAI Chat Completions provider."""

import httpx

from app.ai.base import AIMessage, AICompletionResult, AIProvider
from app.ai.schemas import AIProviderType
from app.core.config import settings


class OpenAIProvider(AIProvider):
    provider_type = AIProviderType.OPENAI

    @property
    def default_model(self) -> str:
        return settings.openai_model

    def is_available(self) -> bool:
        return bool(settings.openai_api_key)

    async def complete(
        self,
        messages: list[AIMessage],
        model: str | None = None,
    ) -> AICompletionResult:
        if not settings.openai_api_key:
            raise RuntimeError("OpenAI API key not configured")

        payload = {
            "model": model or self.default_model,
            "messages": [{"role": m.role, "content": m.content} for m in messages],
            "temperature": 0.4,
            "max_tokens": 1024,
        }
        headers = {
            "Authorization": f"Bearer {settings.openai_api_key}",
            "Content-Type": "application/json",
        }

        async with httpx.AsyncClient(timeout=60.0) as client:
            response = await client.post(
                f"{settings.openai_base_url}/chat/completions",
                json=payload,
                headers=headers,
            )
            response.raise_for_status()
            data = response.json()

        content = data["choices"][0]["message"]["content"]
        used_model = data.get("model", model or self.default_model)
        return AICompletionResult(
            content=content,
            model=used_model,
            provider=AIProviderType.OPENAI,
        )
