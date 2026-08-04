import { useTranslation } from "react-i18next";

import { CultivationClimateControls } from "@/components/ui/CultivationClimateControls";
import { useGreenhouseStore } from "@/store/useGreenhouseStore";
import type { ArchType, CoveringMaterial, CropType, DimensionUpdate } from "@/types/greenhouse";

const DIMENSION_LIMITS = {
  length: { min: 6, max: 120, step: 1 },
  ridgeHeight: { min: 2.5, max: 12, step: 0.1 },
  eaveHeight: { min: 2, max: 10, step: 0.1 },
} as const;

const STRUCTURE_LIMITS = {
  bayCount: { min: 1, max: 15, step: 1 },
  bayWidthM: { min: 4, max: 12, step: 0.5 },
} as const;

type DimensionKey = keyof typeof DIMENSION_LIMITS;

const ARCH_TYPES: ArchType[] = ["triangular", "semicircular"];

const COVERING_TYPES: CoveringMaterial["type"][] = [
  "glass",
  "polycarbonate",
  "polyethylene",
  "etfe",
];

const CROP_TYPES: CropType[] = [
  "tomato",
  "cucumber",
  "pepper",
  "lettuce",
  "strawberry",
  "cannabis",
];

interface SliderRowProps {
  label: string;
  value: number;
  unit: string;
  min: number;
  max: number;
  step: number;
  onChange: (value: number) => void;
  disabled?: boolean;
}

function SliderRow({
  label,
  value,
  unit,
  min,
  max,
  step,
  onChange,
  disabled = false,
}: SliderRowProps) {
  return (
    <label className="flex flex-col gap-1">
      <span className="flex justify-between text-xs text-greenhouse-300">
        <span>{label}</span>
        <span className="font-mono text-white">
          {value.toFixed(step < 1 ? 1 : 0)} {unit}
        </span>
      </span>
      <input
        type="range"
        min={min}
        max={max}
        step={step}
        value={value}
        disabled={disabled}
        onChange={(event) => onChange(Number(event.target.value))}
        className="h-1.5 w-full cursor-pointer appearance-none rounded-full bg-greenhouse-700 accent-greenhouse-400 disabled:opacity-40"
      />
    </label>
  );
}

export function DimensionControls() {
  const { t: tCommon } = useTranslation("common");
  const { t: tControls } = useTranslation("3d_controls");
  const { t: tCrops } = useTranslation("crops");

  const structure = useGreenhouseStore((state) => state.structure);
  const dimensions = useGreenhouseStore((state) => state.dimensions);
  const metrics = useGreenhouseStore((state) => state.metrics);
  const covering = useGreenhouseStore((state) => state.covering);
  const crop = useGreenhouseStore((state) => state.crop);
  const setStructure = useGreenhouseStore((state) => state.setStructure);
  const setDimensions = useGreenhouseStore((state) => state.setDimensions);
  const setCovering = useGreenhouseStore((state) => state.setCovering);
  const setCrop = useGreenhouseStore((state) => state.setCrop);
  const resetToDefaults = useGreenhouseStore((state) => state.resetToDefaults);

  const handleDimensionChange = (key: DimensionKey, value: number) => {
    const update: DimensionUpdate = { [key]: value };
    if (key === "eaveHeight" && value > dimensions.ridgeHeight) {
      update.ridgeHeight = value + 0.5;
    }
    if (key === "ridgeHeight" && value < dimensions.eaveHeight) {
      update.eaveHeight = value - 0.5;
    }
    setDimensions(update);
  };

  return (
    <aside className="flex h-full flex-col gap-5 overflow-y-auto rounded-xl border border-greenhouse-700 bg-greenhouse-800/60 p-5">
      <div>
        <h3 className="text-sm font-semibold text-white">{tControls("viewport.title")}</h3>
        <p className="mt-1 text-xs text-greenhouse-300/80">{tControls("viewport.hint")}</p>
      </div>

      <section className="flex flex-col gap-3">
        <h4 className="text-xs font-semibold uppercase tracking-wide text-greenhouse-400">
          {tControls("structure.title")}
        </h4>
        <SliderRow
          label={tControls("structure.bayCount")}
          value={structure.bayCount}
          unit=""
          min={STRUCTURE_LIMITS.bayCount.min}
          max={STRUCTURE_LIMITS.bayCount.max}
          step={STRUCTURE_LIMITS.bayCount.step}
          onChange={(value) => setStructure({ bayCount: value })}
        />
        <SliderRow
          label={tControls("structure.bayWidth")}
          value={structure.bayWidthM}
          unit={tCommon("units.meters")}
          min={STRUCTURE_LIMITS.bayWidthM.min}
          max={STRUCTURE_LIMITS.bayWidthM.max}
          step={STRUCTURE_LIMITS.bayWidthM.step}
          onChange={(value) => setStructure({ bayWidthM: value })}
        />
        <div className="rounded-lg border border-greenhouse-700/60 bg-greenhouse-900/50 px-3 py-2">
          <p className="text-xs text-greenhouse-400">{tControls("structure.totalWidth")}</p>
          <p className="font-mono text-sm text-white">
            {metrics.totalWidthM} {tCommon("units.meters")}
          </p>
        </div>
        <label className="flex flex-col gap-1">
          <span className="text-xs text-greenhouse-300">{tControls("structure.archType")}</span>
          <select
            value={structure.archType}
            onChange={(event) =>
              setStructure({ archType: event.target.value as ArchType })
            }
            className="rounded-lg border border-greenhouse-700 bg-greenhouse-900 px-3 py-2 text-sm text-white outline-none focus:border-greenhouse-400"
          >
            {ARCH_TYPES.map((type) => (
              <option key={type} value={type}>
                {tControls(`structure.archTypes.${type}`)}
              </option>
            ))}
          </select>
          <p className="text-[10px] text-greenhouse-500">{tControls("structure.archAllBays")}</p>
        </label>
      </section>

      <section className="flex flex-col gap-3 border-t border-greenhouse-700 pt-4">
        {(Object.keys(DIMENSION_LIMITS) as DimensionKey[]).map((key) => {
          const limits = DIMENSION_LIMITS[key];
          return (
            <SliderRow
              key={key}
              label={tControls(`dimensions.${key}`)}
              value={dimensions[key]}
              unit={tCommon("units.meters")}
              min={limits.min}
              max={limits.max}
              step={limits.step}
              onChange={(value) => handleDimensionChange(key, value)}
            />
          );
        })}
      </section>

      <section className="flex flex-col gap-2 border-t border-greenhouse-700 pt-4">
        <h4 className="text-xs font-semibold uppercase tracking-wide text-greenhouse-400">
          {tControls("covering.title")}
        </h4>
        <select
          value={covering.type}
          onChange={(event) =>
            setCovering({ type: event.target.value as CoveringMaterial["type"] })
          }
          className="rounded-lg border border-greenhouse-700 bg-greenhouse-900 px-3 py-2 text-sm text-white outline-none focus:border-greenhouse-400"
        >
          {COVERING_TYPES.map((type) => (
            <option key={type} value={type}>
              {tControls(`covering.${type}`)}
            </option>
          ))}
        </select>
        <SliderRow
          label={tControls("covering.transmittance")}
          value={covering.transmittance}
          unit=""
          min={0.3}
          max={0.95}
          step={0.01}
          onChange={(value) => setCovering({ transmittance: value })}
        />
      </section>

      <section className="flex flex-col gap-2 border-t border-greenhouse-700 pt-4">
        <h4 className="text-xs font-semibold uppercase tracking-wide text-greenhouse-400">
          {tCrops("labels.cropType")}
        </h4>
        <select
          value={crop.type}
          onChange={(event) => setCrop({ type: event.target.value as CropType })}
          className="rounded-lg border border-greenhouse-700 bg-greenhouse-900 px-3 py-2 text-sm text-white outline-none focus:border-greenhouse-400"
        >
          {CROP_TYPES.map((type) => (
            <option key={type} value={type}>
              {tCrops(`types.${type}`)}
            </option>
          ))}
        </select>
      </section>

      <CultivationClimateControls />

      <button
        type="button"
        onClick={resetToDefaults}
        className="mt-auto rounded-lg border border-greenhouse-500/40 bg-greenhouse-700/50 px-4 py-2 text-sm font-medium text-greenhouse-300 transition hover:border-greenhouse-400 hover:bg-greenhouse-700 hover:text-white"
      >
        {tCommon("actions.reset")}
      </button>
    </aside>
  );
}
