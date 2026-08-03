"""Anthropic Messages API provider."""

import httpx

from app.ai.base import AIMessage, AICompletionResult, AIProvider
from app.ai.schemas import AIProviderType
from app.core.config import settings


class AnthropicProvider(AIProvider):
    provider_type = AIProviderType.ANTHROPIC

    @property
    def default_model(self) -> str:
        return settings.anthropic_model

    def is_available(self) -> bool:
        return bool(settings.anthropic_api_key)

    async def complete(
        self,
        messages: list[AIMessage],
        model: str | None = None,
    ) -> AICompletionResult:
        if not settings.anthropic_api_key:
            raise RuntimeError("Anthropic API key not configured")

        system_msg = next((m.content for m in messages if m.role == "system"), "")
        user_messages = [
            {"role": m.role if m.role != "system" else "user", "content": m.content}
            for m in messages
            if m.role != "system"
        ]

        payload = {
            "model": model or self.default_model,
            "max_tokens": 1024,
            "system": system_msg,
            "messages": user_messages,
        }
        headers = {
            "x-api-key": settings.anthropic_api_key,
            "anthropic-version": "2023-06-01",
            "Content-Type": "application/json",
        }

        async with httpx.AsyncClient(timeout=60.0) as client:
            response = await client.post(
                f"{settings.anthropic_base_url}/v1/messages",
                json=payload,
                headers=headers,
            )
            response.raise_for_status()
            data = response.json()

        content = data["content"][0]["text"]
        return AICompletionResult(
            content=content,
            model=model or self.default_model,
            provider=AIProviderType.ANTHROPIC,
        )
