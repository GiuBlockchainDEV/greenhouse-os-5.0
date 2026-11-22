import { useTranslation } from "react-i18next";

import { useFertigationStore } from "@/store/useFertigationStore";
import { useGreenhouseStore } from "@/store/useGreenhouseStore";

export function TwinLinkBadge() {
  const { t } = useTranslation("common");
  const sync = useFertigationStore((s) => s.syncWithGreenhouse);
  const status = useGreenhouseStore((s) => s.simulationStatus);
  const micro = useGreenhouseStore((s) => s.simulationResults?.microclimate);

  if (!sync) {
    return (
      <span className="rounded-md bg-surface-muted px-2 py-1 text-[10px] font-semibold text-label">
        {t("workspace.twinUnlinked")}
      </span>
    );
  }

  const detail =
    status === "connected" && micro
      ? `${micro.internal_temp.toFixed(1)}°C · VPD ${micro.vpd_kpa.toFixed(2)}`
      : t("workspace.twinPreview");

  return (
    <span
      className="hidden max-w-[14rem] truncate rounded-md border border-status-optimal/30 bg-emerald-50 px-2 py-1 text-[10px] font-semibold text-status-optimalDark sm:inline"
      title={detail}
    >
      {t("workspace.twinLinked")} · {detail}
    </span>
  );
}