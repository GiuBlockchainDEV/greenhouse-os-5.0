import { useMemo } from "react";

import {
  AcUnitModel,
  DiffuserModel,
  DuctSegmentModel,
  ExhaustFanModel,
  FogLineModel,
  HafFanModel,
  HeaterModel,
  PadWallModel,
  RoofExhaustFanModel,
  VentModel,
} from "@/components/3d/equipmentGlb";
import { computeClimateEquipmentLayout } from "@/lib/climateEquipmentLayout";
import { useGreenhouseStore } from "@/store/useGreenhouseStore";

export function ClimateEquipmentMesh() {
  const dimensions = useGreenhouseStore((s) => s.dimensions);
  const structure = useGreenhouseStore((s) => s.structure);
  const equipment = useGreenhouseStore((s) => s.climateEquipment);

  const layout = useMemo(
    () =>
      computeClimateEquipmentLayout({
        dimensions,
        structure,
        equipment,
      }),
    [dimensions, structure, equipment],
  );

  return (
    <group>
      {layout.exhaustFans.map((fan, index) => (
        <ExhaustFanModel key={`fan-${index}`} fan={fan} />
      ))}
      {layout.roofExhaustFans.map((fan, index) => (
        <RoofExhaustFanModel key={`roof-fan-${index}`} fan={fan} />
      ))}
      {layout.circulationFans.map((fan, index) => (
        <HafFanModel key={`circ-fan-${index}`} fan={fan} />
      ))}
      {layout.padWalls.map((pad, index) => (
        <PadWallModel key={`pad-${index}`} pad={pad} />
      ))}
      {layout.acUnits.map((unit, index) => (
        <AcUnitModel key={`ac-${index}`} unit={unit} />
      ))}
      {layout.acDucts.segments.map((segment, index) => (
        <DuctSegmentModel key={`duct-${index}`} segment={segment} />
      ))}
      {layout.acDucts.diffusers.map((diffuser, index) => (
        <DiffuserModel key={`diffuser-${index}`} diffuser={diffuser} />
      ))}
      {layout.vents.map((vent, index) => (
        <VentModel key={`vent-${index}`} vent={vent} />
      ))}
      {layout.heaters.map((heater, index) => (
        <HeaterModel key={`heater-${index}`} heater={heater} houseLength={dimensions.length} />
      ))}
      {layout.fogLines.map((line, index) => (
        <FogLineModel key={`fog-${index}`} line={line} length={dimensions.length} />
      ))}
    </group>
  );
}
