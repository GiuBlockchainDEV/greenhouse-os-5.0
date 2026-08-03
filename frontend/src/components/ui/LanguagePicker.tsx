import { useTranslation } from "react-i18next";

import { changeAppLocale, LOCALE_LABELS, SUPPORTED_LOCALES } from "@/i18n";
import { useGreenhouseStore } from "@/store/useGreenhouseStore";
import type { SupportedLocale } from "@/types/greenhouse";

export function LanguagePicker() {
  const { t } = useTranslation("common");
  const locale = useGreenhouseStore((state) => state.locale);
  const setLocale = useGreenhouseStore((state) => state.setLocale);

  const handleChange = (nextLocale: SupportedLocale) => {
    setLocale(nextLocale);
    changeAppLocale(nextLocale);
  };

  return (
    <div className="flex flex-col gap-1">
      <label htmlFor="locale-select" className="text-xs font-medium text-greenhouse-300">
        {t("labels.language")}
      </label>
      <select
        id="locale-select"
        value={locale}
        onChange={(event) => handleChange(event.target.value as SupportedLocale)}
        className="rounded-lg border border-greenhouse-700 bg-greenhouse-800 px-3 py-2 text-sm text-white outline-none transition focus:border-greenhouse-400"
      >
        {SUPPORTED_LOCALES.map((code) => (
          <option key={code} value={code}>
            {LOCALE_LABELS[code]}
          </option>
        ))}
      </select>
    </div>
  );
}
