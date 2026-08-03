"""Ollama local LLM provider."""

import httpx

from app.ai.base import AIMessage, AICompletionResult, AIProvider
from app.ai.schemas import AIProviderType
from app.core.config import settings


class OllamaProvider(AIProvider):
    provider_type = AIProviderType.OLLAMA

    @property
    def default_model(self) -> str:
        return settings.ollama_model

    def is_available(self) -> bool:
        return settings.ollama_enabled

    async def complete(
        self,
        messages: list[AIMessage],
        model: str | None = None,
    ) -> AICompletionResult:
        payload = {
            "model": model or self.default_model,
            "messages": [{"role": m.role, "content": m.content} for m in messages],
            "stream": False,
            "options": {"temperature": 0.4},
        }

        try:
            async with httpx.AsyncClient(timeout=120.0) as client:
                response = await client.post(
                    f"{settings.ollama_base_url}/api/chat",
                    json=payload,
                )
                response.raise_for_status()
                data = response.json()
        except httpx.ConnectError as exc:
            raise RuntimeError(
                f"Ollama not reachable at {settings.ollama_base_url}"
            ) from exc

        content = data["message"]["content"]
        return AICompletionResult(
            content=content,
            model=model or self.default_model,
            provider=AIProviderType.OLLAMA,
        )
