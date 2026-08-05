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

function ReadOnlyMetricRow({ label, value, unit }: { label: string; value: number; unit: string }) {
  return (
    <div className="flex justify-between rounded-lg border border-greenhouse-700/80 bg-greenhouse-900/60 px-3 py-2 text-xs">
      <span className="text-greenhouse-300">{label}</span>
      <span className="font-mono text-white">
        {value.toLocaleString()} {unit}
      </span>
    </div>
  );
}

export function CultivationClimateControls() {
  const { t: tCommon } = useTranslation("common");
  const { t: tCrops } = useTranslation("crops");
  const { t: tSim } = useTranslation("simulation");

  const crop = useGreenhouseStore((state) => state.crop);
  const metrics = useGreenhouseStore((state) => state.metrics);
  const climateEquipment = useGreenhouseStore((state) => state.climateEquipment);
  const setCrop = useGreenhouseStore((state) => state.setCrop);
  const setCropLayout = useGreenhouseStore((state) => state.setCropLayout);
  const setClimateEquipment = useGreenhouseStore((state) => state.setClimateEquipment);
  const setClimateEquipmentSizing = useGreenhouseStore(
    (state) => state.setClimateEquipmentSizing,
  );
  const sizing = climateEquipment.sizing;

  const showFans =
    climateEquipment.cooling === "fan_and_pad" ||
    climateEquipment.ventilation === "forced_exhaust" ||
    climateEquipment.ventilation === "combined";
  const showPad =
    climateEquipment.cooling === "fan_and_pad" ||
    climateEquipment.cooling === "evaporative";
  const showAc = climateEquipment.cooling === "mechanical_ac";
  const showFog = climateEquipment.cooling === "high_pressure_fog";
  const showRoofVents =
    climateEquipment.ventilation === "roof_vents" ||
    climateEquipment.ventilation === "combined";
  const showSideVents =
    climateEquipment.ventilation === "side_vents" ||
    climateEquipment.ventilation === "combined";
  const showHeaters =
    climateEquipment.heating === "unit_heater" ||
    climateEquipment.heating === "air_heater";
  const showGeothermal = climateEquipment.heating === "geothermal";

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
          label={tCrops("labels.plantDensity")}
          value={crop.layout.plantDensity}
          unit=""
          min={0.7}
          max={1.3}
          step={0.05}
          onChange={(value) => setCropLayout({ plantDensity: value })}
        />
        <ReadOnlyMetricRow
          label={tCrops("labels.totalPlants")}
          value={metrics.totalPlants}
          unit=""
        />
        <ReadOnlyMetricRow
          label={tCrops("labels.plantsPerTier")}
          value={metrics.plantsPerTier}
          unit=""
        />
        <SliderRow
          label={tCrops("labels.pathwayWidth")}
          value={crop.layout.pathwayWidthM}
          unit={tCommon("units.meters")}
          min={0.8}
          max={2.5}
          step={0.1}
          onChange={(value) => setCropLayout({ pathwayWidthM: value })}
        />
        <SliderRow
          label={tCrops("labels.sideClearance")}
          value={crop.layout.sideClearanceM}
          unit={tCommon("units.meters")}
          min={0.3}
          max={1.5}
          step={0.1}
          onChange={(value) => setCropLayout({ sideClearanceM: value })}
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

        {(showFans || showPad || showAc || showFog || showRoofVents || showSideVents || showHeaters || showGeothermal) && (
          <div className="mt-2 flex flex-col gap-2 rounded-lg border border-greenhouse-700/60 bg-greenhouse-950/40 p-3">
            <h5 className="text-[11px] font-semibold uppercase tracking-wide text-greenhouse-500">
              {tSim("equipment.sizingTitle")}
            </h5>
            {showFans && (
              <>
                <SliderRow
                  label={tSim("equipment.sizing.exhaustFanCount")}
                  value={sizing.exhaustFanCount}
                  unit=""
                  min={0}
                  max={12}
                  step={1}
                  onChange={(value) => setClimateEquipmentSizing({ exhaustFanCount: value })}
                />
                <SliderRow
                  label={tSim("equipment.sizing.exhaustFanDiameter")}
                  value={sizing.exhaustFanDiameterM}
                  unit={tCommon("units.meters")}
                  min={0.8}
                  max={1.8}
                  step={0.1}
                  onChange={(value) => setClimateEquipmentSizing({ exhaustFanDiameterM: value })}
                />
              </>
            )}
            {showPad && (
              <>
                <SliderRow
                  label={tSim("equipment.sizing.padWallWidth")}
                  value={sizing.padWallWidthM}
                  unit={tCommon("units.meters")}
                  min={2}
                  max={20}
                  step={0.5}
                  onChange={(value) => setClimateEquipmentSizing({ padWallWidthM: value })}
                />
                <SliderRow
                  label={tSim("equipment.sizing.padWallHeight")}
                  value={sizing.padWallHeightM}
                  unit={tCommon("units.meters")}
                  min={1.2}
                  max={3.5}
                  step={0.1}
                  onChange={(value) => setClimateEquipmentSizing({ padWallHeightM: value })}
                />
              </>
            )}
            {showAc && (
              <>
                <SliderRow
                  label={tSim("equipment.sizing.acUnitCount")}
                  value={sizing.acUnitCount}
                  unit=""
                  min={0}
                  max={8}
                  step={1}
                  onChange={(value) => setClimateEquipmentSizing({ acUnitCount: value })}
                />
                <SliderRow
                  label={tSim("equipment.sizing.acUnitWidth")}
                  value={sizing.acUnitWidthM}
                  unit={tCommon("units.meters")}
                  min={1}
                  max={3}
                  step={0.1}
                  onChange={(value) => setClimateEquipmentSizing({ acUnitWidthM: value })}
                />
              </>
            )}
            {showFog && (
              <SliderRow
                label={tSim("equipment.sizing.fogLineCount")}
                value={sizing.fogLineCount}
                unit=""
                min={0}
                max={10}
                step={1}
                onChange={(value) => setClimateEquipmentSizing({ fogLineCount: value })}
              />
            )}
            {showRoofVents && (
              <>
                <SliderRow
                  label={tSim("equipment.sizing.roofVentCount")}
                  value={sizing.roofVentCount}
                  unit=""
                  min={0}
                  max={12}
                  step={1}
                  onChange={(value) => setClimateEquipmentSizing({ roofVentCount: value })}
                />
                <SliderRow
                  label={tSim("equipment.sizing.roofVentWidth")}
                  value={sizing.roofVentWidthM}
                  unit={tCommon("units.meters")}
                  min={1}
                  max={4}
                  step={0.1}
                  onChange={(value) => setClimateEquipmentSizing({ roofVentWidthM: value })}
                />
              </>
            )}
            {showSideVents && (
              <>
                <SliderRow
                  label={tSim("equipment.sizing.sideVentCount")}
                  value={sizing.sideVentCount}
                  unit=""
                  min={0}
                  max={10}
                  step={1}
                  onChange={(value) => setClimateEquipmentSizing({ sideVentCount: value })}
                />
                <SliderRow
                  label={tSim("equipment.sizing.sideVentHeight")}
                  value={sizing.sideVentHeightM}
                  unit={tCommon("units.meters")}
                  min={0.8}
                  max={2.5}
                  step={0.1}
                  onChange={(value) => setClimateEquipmentSizing({ sideVentHeightM: value })}
                />
              </>
            )}
            {showHeaters && (
              <SliderRow
                label={tSim("equipment.sizing.heaterUnitCount")}
                value={sizing.heaterUnitCount}
                unit=""
                min={0}
                max={8}
                step={1}
                onChange={(value) => setClimateEquipmentSizing({ heaterUnitCount: value })}
              />
            )}
            {showGeothermal && (
              <SliderRow
                label={tSim("equipment.sizing.pipeRowCount")}
                value={sizing.pipeRowCount}
                unit=""
                min={0}
                max={8}
                step={1}
                onChange={(value) => setClimateEquipmentSizing({ pipeRowCount: value })}
              />
            )}
          </div>
        )}
      </section>
    </>
  );
}
