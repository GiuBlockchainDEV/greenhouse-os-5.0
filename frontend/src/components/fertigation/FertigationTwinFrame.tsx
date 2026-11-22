import { useTranslation } from "react-i18next";

const TWIN_ASSET = "/growa-digital-twin-simulato-v20.html";

export function FertigationTwinFrame() {
  const { t } = useTranslation("common");

  return (
    <iframe
      title={t("workspace.fertigationTitle")}
      src={TWIN_ASSET}
      className="h-full w-full rounded-2xl border border-border bg-white shadow-card"
      sandbox="allow-scripts allow-same-origin allow-forms allow-downloads allow-modals allow-popups"
      referrerPolicy="no-referrer"
    />
  );
}