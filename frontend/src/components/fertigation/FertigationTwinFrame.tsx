import { useEffect, useRef } from "react";
import { useTranslation } from "react-i18next";

import { estimatePreviewMicroclimate } from "@/lib/previewMicroclimate";
import { buildGreenhouseOsClimateMessage } from "@/lib/twin/greenhouseOsBridge";
import { useFertigationStore } from "@/store/useFertigationStore";
import { useGreenhouseStore } from "@/store/useGreenhouseStore";

const TWIN_ASSET =
  "/growa-digital-twin-simulato-v20.html?embed=greenhouse-os&mode=design";

export function FertigationTwinFrame() {
  const { t } = useTranslation("fertigation");
  const projectRevision = useFertigationStore((state) => state.projectRevision);
  const iframeRef = useRef<HTMLIFrameElement>(null);

  useEffect(() => {
    const postClimate = () => {
      const iframe = iframeRef.current;
      if (!iframe?.contentWindow) {
        return;
      }
      const gh = useGreenhouseStore.getState();
      const micro = gh.simulationResults?.microclimate;
      const thermal = gh.simulationResults?.thermal_balance;
      const preview = estimatePreviewMicroclimate(
        gh.climateScenario,
        gh.covering,
        gh.shadingScreen,
        gh.climateEquipment,
        gh.dimensions,
        gh.crop,
        micro?.et0_fao56,
      );
      const message = buildGreenhouseOsClimateMessage({
        vpdKpa: micro?.vpd_kpa ?? preview.vpdKpa,
        internalTempC: micro?.internal_temp ?? preview.internalTemp,
        internalRhPct: micro?.internal_rh ?? preview.internalRh,
        transpirationWm2: thermal?.q_transpiration,
        crop: gh.crop.type,
        system: gh.crop.system,
        floorAreaM2: gh.metrics.floorAreaM2,
      });
      iframe.contentWindow.postMessage(message, window.location.origin);
    };

    const onLoad = () => postClimate();
    const iframe = iframeRef.current;
    iframe?.addEventListener("load", onLoad);
    postClimate();

    const unsub = useGreenhouseStore.subscribe(postClimate);

    return () => {
      iframe?.removeEventListener("load", onLoad);
      unsub();
    };
  }, [projectRevision]);

  return (
    <iframe
      ref={iframeRef}
      key={`fertigation-twin-${projectRevision}`}
      title={t("frame.title")}
      src={TWIN_ASSET}
      className="h-full w-full rounded-2xl border border-border bg-white shadow-card"
      sandbox="allow-scripts allow-same-origin allow-forms allow-downloads allow-modals allow-popups"
      referrerPolicy="no-referrer"
    />
  );
}