"""Google Gemini generateContent provider."""

import httpx

from app.ai.base import AICompletionResult, AIMessage, AIProvider
from app.ai.schemas import AIProviderType
from app.core.config import settings

MAX_OUTPUT_TOKENS = 16384
THINKING_ATTEMPTS = ("LOW", "MINIMAL")


class GeminiProvider(AIProvider):
    provider_type = AIProviderType.GEMINI

    @property
    def default_model(self) -> str:
        return settings.gemini_model

    def is_available(self) -> bool:
        return bool(settings.gemini_api_key.strip())

    async def complete(
        self,
        messages: list[AIMessage],
        model: str | None = None,
    ) -> AICompletionResult:
        api_key = settings.gemini_api_key.strip()
        if not api_key:
            raise RuntimeError("Gemini API key not configured")

        used_model = model or self.default_model
        system_parts = [message.content for message in messages if message.role == "system"]
        user_parts = [message.content for message in messages if message.role != "system"]
        system_text = "\n\n".join(system_parts)
        user_text = "\n\n".join(user_parts)
        url = (
            f"{settings.gemini_base_url.rstrip('/')}/v1beta/models/"
            f"{used_model}:generateContent"
        )

        last_detail = "empty_response"
        async with httpx.AsyncClient(timeout=55.0) as client:
            for thinking_level in THINKING_ATTEMPTS:
                response = await client.post(
                    url,
                    headers={"x-goog-api-key": api_key},
                    json=_payload(system_text, user_text, thinking_level),
                )
                data = _json_body(response)
                if response.status_code >= 400:
                    error = data.get("error") if isinstance(data, dict) else None
                    message = error.get("message") if isinstance(error, dict) else None
                    raise RuntimeError(message or f"HTTP {response.status_code}")

                content, finish_reason, blocked = _extract_answer(data)
                if content:
                    return AICompletionResult(
                        content=content,
                        model=used_model,
                        provider=AIProviderType.GEMINI,
                    )
                last_detail = f"blocked:{blocked}" if blocked else f"empty_response:{finish_reason}"

        raise RuntimeError(last_detail)


def _payload(system_text: str, user_text: str, thinking_level: str) -> dict:
    body: dict = {
        "contents": [{"role": "user", "parts": [{"text": user_text}]}],
        "generationConfig": {
            "maxOutputTokens": MAX_OUTPUT_TOKENS,
            "thinkingConfig": {"thinkingLevel": thinking_level},
        },
    }
    if system_text:
        body["systemInstruction"] = {"parts": [{"text": system_text}]}
    return body


def _json_body(response: httpx.Response) -> dict:
    try:
        data = response.json()
    except ValueError:
        return {}
    return data if isinstance(data, dict) else {}


def _extract_answer(data: dict) -> tuple[str, str, str | None]:
    feedback = data.get("promptFeedback")
    blocked = feedback.get("blockReason") if isinstance(feedback, dict) else None
    candidates = data.get("candidates")
    if not isinstance(candidates, list) or not candidates:
        return "", "no_candidate", blocked if isinstance(blocked, str) else None

    candidate = candidates[0] if isinstance(candidates[0], dict) else {}
    content = candidate.get("content") if isinstance(candidate, dict) else {}
    parts = content.get("parts") if isinstance(content, dict) else []
    texts: list[str] = []
    if isinstance(parts, list):
        for part in parts:
            if not isinstance(part, dict) or part.get("thought") is True:
                continue
            text = part.get("text")
            if isinstance(text, str) and text.strip():
                texts.append(text)
    finish = candidate.get("finishReason") if isinstance(candidate, dict) else None
    finish_reason = finish if isinstance(finish, str) else "unknown"
    blocked_reason = blocked if isinstance(blocked, str) else None
    return "".join(texts).strip(), finish_reason, blocked_reason
