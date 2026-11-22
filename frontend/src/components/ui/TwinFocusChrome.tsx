import { useTranslation } from "react-i18next";

interface TwinFocusChromeProps {
  designOpen: boolean;
  onToggleDesign: () => void;
}

export function TwinFocusChrome({ designOpen, onToggleDesign }: TwinFocusChromeProps) {
  const { t } = useTranslation("experience");

  return (
    <button
      type="button"
      onClick={onToggleDesign}
      className={`pointer-events-auto absolute bottom-36 left-4 z-30 rounded-full px-4 py-2 text-xs font-bold shadow-lg transition ${
        designOpen
          ? "bg-gray-900 text-white"
          : "border border-white/70 bg-white/95 text-gray-900 hover:bg-white"
      }`}
    >
      {designOpen ? t("design.close") : t("design.open")}
    </button>
  );
}