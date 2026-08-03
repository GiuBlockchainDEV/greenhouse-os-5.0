import { useTranslation } from "react-i18next";

import { normalizeBayArchTypes } from "@/lib/structureUtils";
import { useGreenhouseStore } from "@/store/useGreenhouseStore";

export function HUDOverlay() {
  const { t: tCommon } = useTranslation("common");
  const { t: tSim } = useTranslation("simulation");
  const { t: tCrops } = useTranslation("crops");
  const { t: tControls } = useTranslation("3d_controls");

  const structure = useGreenhouseStore((state) => state.structure);
  const bayArchTypes = normalizeBayArchTypes(structure.bayCount, structure.bayArchTypes);
  const name = useGreenhouseStore((state) => state.name);
  const metrics = useGreenhouseStore((state) => state.metrics);
  const crop = useGreenhouseStore((state) => state.crop);
  const climateEquipment = useGreenhouseStore((state) => state.climateEquipment);
  const location = useGreenhouseStore((state) => state.location);

  return (
    <div className="pointer-events-none absolute inset-x-0 top-0 z-10 flex justify-between p-4">
      <div className="rounded-xl border border-greenhouse-700/80 bg-greenhouse-900/85 px-4 py-3 backdrop-blur-sm">
        <h2 className="text-sm font-semibold text-greenhouse-300">{name}</h2>
        <p className="mt-1 font-mono text-xs text-white/70">
          {location.lat.toFixed(4)}°, {location.lon.toFixed(4)}°
        </p>
        <p className="mt-2 text-xs text-white/60">
          {tCrops(`types.${crop.type}`)} · {tCrops(`systems.${crop.system}`)} ·{" "}
          {tCrops(`stages.${crop.growthStage}`)}
        </p>
        <p className="mt-1 text-xs text-white/50">
          {structure.bayCount} {tControls("structure.baysShort")} ·{" "}
          {bayArchTypes
            .map((type, index) =>
              tControls("structure.bayArchShort", {
                n: index + 1,
                type: tControls(`structure.archTypes.${type}`),
              }),
            )
            .join(" · ")}
        </p>
        <p className="mt-1 text-xs text-white/40">
          {crop.layout.tierCount} {tCrops("labels.tiersShort")} ·{" "}
          {tSim(`equipment.coolingOptions.${climateEquipment.cooling}`)}
        </p>
      </div>

      <div className="rounded-xl border border-greenhouse-700/80 bg-greenhouse-900/85 px-4 py-3 backdrop-blur-sm">
        <dl className="grid grid-cols-3 gap-x-6 gap-y-1 text-xs">
          <div>
            <dt className="text-greenhouse-400">{tSim("metrics.floorArea")}</dt>
            <dd className="font-mono font-medium text-white">
              {metrics.floorAreaM2} {tCommon("units.squareMeters")}
            </dd>
          </div>
          <div>
            <dt className="text-greenhouse-400">{tSim("metrics.cultivationArea")}</dt>
            <dd className="font-mono font-medium text-white">
              {metrics.cultivationAreaM2} {tCommon("units.squareMeters")}
            </dd>
          </div>
          <div>
            <dt className="text-greenhouse-400">{tSim("metrics.totalPlants")}</dt>
            <dd className="font-mono font-medium text-white">{metrics.totalPlants}</dd>
          </div>
          <div>
            <dt className="text-greenhouse-400">{tSim("metrics.volume")}</dt>
            <dd className="font-mono font-medium text-white">
              {metrics.volumeM3} {tCommon("units.cubicMeters")}
            </dd>
          </div>
          <div>
            <dt className="text-greenhouse-400">{tSim("metrics.ridgeAngle")}</dt>
            <dd className="font-mono font-medium text-white">
              {metrics.ridgeAngleDeg}
              {tCommon("units.degrees")}
            </dd>
          </div>
        </dl>
      </div>
    </div>
  );
}
