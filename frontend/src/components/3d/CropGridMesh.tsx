import { useMemo } from "react";

import { CultivationBedsGroup } from "@/lib/cultivationBedModels";
import { CultivationPathwaysGroup } from "@/lib/cultivationPathwayModels";
import { computeCultivationLayout } from "@/lib/cultivationLayout";
import { greenhouseEnvelope } from "@/lib/greenhouseEnvelope";
import { useGreenhouseStore } from "@/store/useGreenhouseStore";

/** Renders cultivation infrastructure only (beds/gutters/rafts) — plants are not shown in 3D. */
export function CropGridMesh() {
  const dimensions = useGreenhouseStore((s) => s.dimensions);
  const structure = useGreenhouseStore((s) => s.structure);
  const crop = useGreenhouseStore((s) => s.crop);

  const envelope = greenhouseEnvelope(structure, dimensions);

  const layoutResult = useMemo(
    () =>
      computeCultivationLayout({
        length: envelope.length,
        totalWidth: envelope.width,
        bayCount: structure.bayCount,
        bayWidthM: structure.bayWidthM,
        eaveHeight: dimensions.eaveHeight,
        cropType: crop.type,
        system: crop.system,
        layout: crop.layout,
        lai: crop.lai,
        growthStage: crop.growthStage,
      }),
    [
      envelope.length,
      envelope.width,
      dimensions.eaveHeight,
      structure.bayCount,
      structure.bayWidthM,
      crop.type,
      crop.system,
      crop.layout,
      crop.lai,
      crop.growthStage,
    ],
  );

  if (layoutResult.beds.length === 0 && layoutResult.pathways.length === 0) {
    return null;
  }

  return (
    <group>
      <CultivationPathwaysGroup pathways={layoutResult.pathways} />
      <CultivationBedsGroup beds={layoutResult.beds} system={crop.system} />
    </group>
  );
}
