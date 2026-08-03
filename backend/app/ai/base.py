"""Abstract base and shared types for AI providers."""

from abc import ABC, abstractmethod
from dataclasses import dataclass

from app.ai.schemas import AIProviderType


@dataclass(frozen=True)
class AIMessage:
    role: str
    content: str


@dataclass(frozen=True)
class AICompletionResult:
    content: str
    model: str
    provider: AIProviderType


class AIProvider(ABC):
    """Abstract interface for decoupled AI provider implementations."""

    provider_type: AIProviderType

    @abstractmethod
    async def complete(
        self,
        messages: list[AIMessage],
        model: str | None = None,
    ) -> AICompletionResult:
        """Generate a completion from the provider."""

    @abstractmethod
    def is_available(self) -> bool:
        """Return True if the provider is configured and reachable."""

    @property
    @abstractmethod
    def default_model(self) -> str:
        """Default model identifier for this provider."""
