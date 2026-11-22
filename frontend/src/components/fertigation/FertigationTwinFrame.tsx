import { useTranslation } from "react-i18next";

import { useFertigationStore } from "@/store/useFertigationStore";

const TWIN_ASSET = "/growa-digital-twin-simulato-v20.html";

export function FertigationTwinFrame() {
  const { t } = useTranslation("fertigation");
  const projectRevision = useFertigationStore((state) => state.projectRevision);

  return (
    <iframe
      key={`fertigation-twin-${projectRevision}`}
      title={t("frame.title")}
      src={`${TWIN_ASSET}?embed=greenhouse-os`}
      className="h-full w-full rounded-2xl border border-border bg-white shadow-card"
      sandbox="allow-scripts allow-same-origin allow-forms allow-downloads allow-modals allow-popups"
      referrerPolicy="no-referrer"
    />
  );
}