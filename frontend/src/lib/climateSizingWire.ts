/** Map frontend climate sizing to WebSocket snake_case payload. */

import type { ClimateEquipmentSizing } from "@/types/greenhouse";
import type { WSClimateEquipmentSizing } from "@/types/simulation";

export function mapClimateSizingToWs(sizing: ClimateEquipmentSizing): WSClimateEquipmentSizing {
  return {
    exhaust_fan_count: sizing.exhaustFanCount,
    exhaust_fan_diameter_m: sizing.exhaustFanDiameterM,
    roof_exhaust_fan_count: sizing.roofExhaustFanCount,
    roof_exhaust_fan_diameter_m: sizing.roofExhaustFanDiameterM,
    circulation_fan_count: sizing.circulationFanCount,
    circulation_fan_diameter_m: sizing.circulationFanDiameterM,
    pad_wall_width_m: sizing.padWallWidthM,
    pad_wall_height_m: sizing.padWallHeightM,
    ac_unit_count: sizing.acUnitCount,
    ac_unit_width_m: sizing.acUnitWidthM,
    roof_vent_count: sizing.roofVentCount,
    roof_vent_width_m: sizing.roofVentWidthM,
    side_vent_count: sizing.sideVentCount,
    side_vent_height_m: sizing.sideVentHeightM,
    heater_unit_count: sizing.heaterUnitCount,
    pipe_row_count: sizing.pipeRowCount,
    fog_line_count: sizing.fogLineCount,
    exhaust_fan_rated_flow_m3h: sizing.exhaustFanRatedFlowM3h,
    roof_exhaust_fan_rated_flow_m3h: sizing.roofExhaustFanRatedFlowM3h,
    circulation_fan_rated_flow_m3h: sizing.circulationFanRatedFlowM3h,
    circulation_fan_motor_w: sizing.circulationFanMotorW,
    ac_rated_cooling_kw_per_unit: sizing.acRatedCoolingKwPerUnit,
    ac_shr: sizing.acShr,
    ac_cop: sizing.acCop,
    ac_supply_airflow_m3h: sizing.acSupplyAirflowM3h,
    heater_rated_kw_per_unit: sizing.heaterRatedKwPerUnit,
    geothermal_rated_kw: sizing.geothermalRatedKw,
    geothermal_cop: sizing.geothermalCop,
    hot_water_heating_kw: sizing.hotWaterHeatingKw,
    pad_efficiency: sizing.padEfficiency,
    fog_nozzle_flow_lh_per_line: sizing.fogNozzleFlowLhPerLine,
    fog_evaporation_efficiency: sizing.fogEvaporationEfficiency,
    leakage_ach: sizing.leakageAch,
  };
}
