import { useMemo } from "react";

import { CultivationBedsGroup } from "@/lib/cultivationBedModels";
import { computeCultivationLayout } from "@/lib/cultivationLayout";
import { useGreenhouseStore } from "@/store/useGreenhouseStore";

/** Renders cultivation infrastructure only (beds/gutters/rafts) — plants are not shown in 3D. */
export function CropGridMesh() {
  const dimensions = useGreenhouseStore((s) => s.dimensions);
  const structure = useGreenhouseStore((s) => s.structure);
  const crop = useGreenhouseStore((s) => s.crop);

  const layoutResult = useMemo(
    () =>
      computeCultivationLayout({
        length: dimensions.length,
        totalWidth: dimensions.width,
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
      dimensions.length,
      dimensions.width,
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

  if (layoutResult.beds.length === 0) {
    return null;
  }

  return <CultivationBedsGroup beds={layoutResult.beds} system={crop.system} />;
}
