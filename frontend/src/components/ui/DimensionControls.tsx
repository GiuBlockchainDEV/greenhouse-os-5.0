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
      <span className="flex justify-between text-xs text-label">
        <span>{label}</span>
        <span className="font-mono font-semibold text-gray-800">
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
        className="ui-range-track disabled:opacity-40"
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
    <aside className="ui-card flex h-full flex-col gap-5 overflow-y-auto p-5">
      <div>
        <h3 className="text-sm font-bold text-gray-900">{tControls("viewport.title")}</h3>
        <p className="mt-1 text-xs text-label">{tControls("viewport.hint")}</p>
      </div>

      <section className="flex flex-col gap-3">
        <h4 className="ui-section-title">
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
        <div className="ui-card-muted px-3 py-2">
          <p className="text-xs text-label">{tControls("structure.totalWidth")}</p>
          <p className="font-mono text-sm font-semibold text-gray-800">
            {metrics.totalWidthM} {tCommon("units.meters")}
          </p>
        </div>
        <label className="flex flex-col gap-1">
          <span className="text-xs text-label">{tControls("structure.archType")}</span>
          <select
            value={structure.archType}
            onChange={(event) =>
              setStructure({ archType: event.target.value as ArchType })
            }
            className="ui-select"
          >
            {ARCH_TYPES.map((type) => (
              <option key={type} value={type}>
                {tControls(`structure.archTypes.${type}`)}
              </option>
            ))}
          </select>
          <p className="text-[10px] text-gray-400">{tControls("structure.archAllBays")}</p>
        </label>
      </section>

      <section className="ui-divider flex flex-col gap-3 pt-4">
        <h4 className="ui-section-title">{tControls("dimensions.title")}</h4>
        <SliderRow
          label={tControls("dimensions.length")}
          value={dimensions.length}
          unit={tCommon("units.meters")}
          min={DIMENSION_LIMITS.length.min}
          max={DIMENSION_LIMITS.length.max}
          step={DIMENSION_LIMITS.length.step}
          onChange={(value) => handleDimensionChange("length", value)}
        />
      </section>

      <section className="ui-divider flex flex-col gap-3 pt-4">
        <h4 className="ui-section-title">{tControls("dimensions.heightTitle")}</h4>
        <p className="text-[10px] leading-relaxed text-label">
          {tControls("dimensions.heightHint")}
        </p>
        <SliderRow
          label={tControls("dimensions.eaveHeight")}
          value={dimensions.eaveHeight}
          unit={tCommon("units.meters")}
          min={DIMENSION_LIMITS.eaveHeight.min}
          max={DIMENSION_LIMITS.eaveHeight.max}
          step={DIMENSION_LIMITS.eaveHeight.step}
          onChange={(value) => handleDimensionChange("eaveHeight", value)}
        />
        <SliderRow
          label={tControls("dimensions.ridgeHeight")}
          value={dimensions.ridgeHeight}
          unit={tCommon("units.meters")}
          min={DIMENSION_LIMITS.ridgeHeight.min}
          max={DIMENSION_LIMITS.ridgeHeight.max}
          step={DIMENSION_LIMITS.ridgeHeight.step}
          onChange={(value) => handleDimensionChange("ridgeHeight", value)}
        />
      </section>

      <section className="ui-divider flex flex-col gap-2 pt-4">
        <h4 className="ui-section-title">
          {tControls("covering.title")}
        </h4>
        <select
          value={covering.type}
          onChange={(event) =>
            setCovering({ type: event.target.value as CoveringMaterial["type"] })
          }
          className="ui-select"
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

      <section className="ui-divider flex flex-col gap-2 pt-4">
        <h4 className="ui-section-title">
          {tCrops("labels.cropType")}
        </h4>
        <select
          value={crop.type}
          onChange={(event) => setCrop({ type: event.target.value as CropType })}
          className="ui-select"
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
        className="ui-btn-secondary mt-auto w-full py-2 text-sm"
      >
        {tCommon("actions.reset")}
      </button>
    </aside>
  );
}
