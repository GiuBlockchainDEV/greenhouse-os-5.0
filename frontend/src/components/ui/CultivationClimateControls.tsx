import { useTranslation } from "react-i18next";

import { useGreenhouseStore } from "@/store/useGreenhouseStore";
import type {
  CoolingSystem,
  CultivationSystem,
  GrowthStage,
  HeatingSystem,
  VentilationSystem,
} from "@/types/greenhouse";

const CULTIVATION_SYSTEMS: CultivationSystem[] = [
  "soil",
  "substrate",
  "growbed",
  "nft",
  "dwc",
  "drip",
  "aeroponic",
  "ebb_flow",
];

const GROWTH_STAGES: GrowthStage[] = [
  "seedling",
  "early_vegetative",
  "mid_season",
  "late_vegetative",
  "generative",
  "harvest",
];

const COOLING_SYSTEMS: CoolingSystem[] = [
  "none",
  "fan_and_pad",
  "evaporative",
  "mechanical_ac",
  "high_pressure_fog",
];

const HEATING_SYSTEMS: HeatingSystem[] = [
  "none",
  "hot_water_pipes",
  "unit_heater",
  "air_heater",
  "geothermal",
];

const VENTILATION_SYSTEMS: VentilationSystem[] = [
  "natural_ridge",
  "natural_gable",
  "roof_vents",
  "side_vents",
  "forced_exhaust",
  "combined",
];

interface SliderRowProps {
  label: string;
  value: number;
  unit: string;
  min: number;
  max: number;
  step: number;
  onChange: (value: number) => void;
}

function SliderRow({ label, value, unit, min, max, step, onChange }: SliderRowProps) {
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
        onChange={(event) => onChange(Number(event.target.value))}
        className="h-1.5 w-full cursor-pointer appearance-none rounded-full bg-greenhouse-700 accent-greenhouse-400"
      />
    </label>
  );
}

interface SelectRowProps {
  label: string;
  value: string;
  options: { value: string; label: string }[];
  onChange: (value: string) => void;
}

function SelectRow({ label, value, options, onChange }: SelectRowProps) {
  return (
    <label className="flex flex-col gap-1">
      <span className="text-xs text-greenhouse-300">{label}</span>
      <select
        value={value}
        onChange={(event) => onChange(event.target.value)}
        className="rounded-lg border border-greenhouse-700 bg-greenhouse-900 px-3 py-2 text-sm text-white outline-none focus:border-greenhouse-400"
      >
        {options.map((option) => (
          <option key={option.value} value={option.value}>
            {option.label}
          </option>
        ))}
      </select>
    </label>
  );
}

export function CultivationClimateControls() {
  const { t: tCommon } = useTranslation("common");
  const { t: tCrops } = useTranslation("crops");
  const { t: tSim } = useTranslation("simulation");

  const crop = useGreenhouseStore((state) => state.crop);
  const climateEquipment = useGreenhouseStore((state) => state.climateEquipment);
  const setCrop = useGreenhouseStore((state) => state.setCrop);
  const setCropLayout = useGreenhouseStore((state) => state.setCropLayout);
  const setClimateEquipment = useGreenhouseStore((state) => state.setClimateEquipment);

  return (
    <>
      <section className="flex flex-col gap-2 border-t border-greenhouse-700 pt-4">
        <h4 className="text-xs font-semibold uppercase tracking-wide text-greenhouse-400">
          {tCrops("labels.cultivationSystem")}
        </h4>
        <SelectRow
          label={tCrops("labels.cultivationSystem")}
          value={crop.system}
          options={CULTIVATION_SYSTEMS.map((system) => ({
            value: system,
            label: tCrops(`systems.${system}`),
          }))}
          onChange={(value) => setCrop({ system: value as CultivationSystem })}
        />
        <SelectRow
          label={tCrops("labels.growthStage")}
          value={crop.growthStage}
          options={GROWTH_STAGES.map((stage) => ({
            value: stage,
            label: tCrops(`stages.${stage}`),
          }))}
          onChange={(value) => setCrop({ growthStage: value as GrowthStage })}
        />
        <SliderRow
          label={tCrops("labels.lai")}
          value={crop.lai}
          unit=""
          min={0.5}
          max={8}
          step={0.1}
          onChange={(value) => setCrop({ lai: value })}
        />
      </section>

      <section className="flex flex-col gap-2 border-t border-greenhouse-700 pt-4">
        <h4 className="text-xs font-semibold uppercase tracking-wide text-greenhouse-400">
          {tCrops("labels.tierLayout")}
        </h4>
        <SliderRow
          label={tCrops("labels.tierCount")}
          value={crop.layout.tierCount}
          unit=""
          min={1}
          max={6}
          step={1}
          onChange={(value) => setCropLayout({ tierCount: value })}
        />
        <SliderRow
          label={tCrops("labels.plantsPerTier")}
          value={crop.layout.plantsPerTier}
          unit=""
          min={10}
          max={500}
          step={10}
          onChange={(value) => setCropLayout({ plantsPerTier: value })}
        />
        <SliderRow
          label={tCrops("labels.aisleWidth")}
          value={crop.layout.aisleWidthM}
          unit={tCommon("units.meters")}
          min={0.4}
          max={2.5}
          step={0.1}
          onChange={(value) => setCropLayout({ aisleWidthM: value })}
        />
      </section>

      <section className="flex flex-col gap-2 border-t border-greenhouse-700 pt-4">
        <h4 className="text-xs font-semibold uppercase tracking-wide text-greenhouse-400">
          {tSim("equipment.title")}
        </h4>
        <SelectRow
          label={tSim("equipment.cooling")}
          value={climateEquipment.cooling}
          options={COOLING_SYSTEMS.map((system) => ({
            value: system,
            label: tSim(`equipment.coolingOptions.${system}`),
          }))}
          onChange={(value) =>
            setClimateEquipment({ cooling: value as CoolingSystem })
          }
        />
        <SelectRow
          label={tSim("equipment.heating")}
          value={climateEquipment.heating}
          options={HEATING_SYSTEMS.map((system) => ({
            value: system,
            label: tSim(`equipment.heatingOptions.${system}`),
          }))}
          onChange={(value) =>
            setClimateEquipment({ heating: value as HeatingSystem })
          }
        />
        <SelectRow
          label={tSim("equipment.ventilation")}
          value={climateEquipment.ventilation}
          options={VENTILATION_SYSTEMS.map((system) => ({
            value: system,
            label: tSim(`equipment.ventilationOptions.${system}`),
          }))}
          onChange={(value) =>
            setClimateEquipment({ ventilation: value as VentilationSystem })
          }
        />
      </section>
    </>
  );
}
