import { useTranslation } from "react-i18next";

import type { AIProviderType, ProviderInfo } from "@/types/ai";

const PROVIDER_ORDER: AIProviderType[] = ["openai", "anthropic", "gemini", "ollama"];

interface ProviderSelectorProps {
  provider: AIProviderType;
  providers: ProviderInfo[];
  onChange: (provider: AIProviderType) => void;
}

export function ProviderSelector({ provider, providers, onChange }: ProviderSelectorProps) {
  const { t } = useTranslation("ai_copilot");

  const availabilityMap = new Map(providers.map((p) => [p.id, p]));

  return (
    <div className="flex flex-col gap-1">
      <label htmlFor="ai-provider" className="ui-section-title">
        {t("providers.label")}
      </label>
      <select
        id="ai-provider"
        value={provider}
        onChange={(e) => onChange(e.target.value as AIProviderType)}
        className="ui-select"
      >
        {PROVIDER_ORDER.map((id) => {
          const info = availabilityMap.get(id);
          const available = info?.available ?? false;
          return (
            <option key={id} value={id}>
              {t(`providers.${id}`)}
              {!available ? ` (${t("providers.unavailable")})` : ""}
            </option>
          );
        })}
      </select>
    </div>
  );
}
