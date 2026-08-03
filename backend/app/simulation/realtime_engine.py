"""Real-time simulation pipeline combining FAO-56 and thermal energy balance."""

import time
from datetime import date

from app.simulation.engine import SimulationEngine
from app.simulation.fao56 import daylight_hours, estimate_solar_radiation
from app.simulation.schemas import (
    ClimateInput,
    CoveringMaterial,
    CropType,
    GeometryInput,
    CropInput,
    GrowthStage,
    SimulationRequest,
    ThermalInput,
)
from app.simulation.thermal import compute_thermal_balance
from app.simulation.websocket_schemas import (
    WSCrop,
    WSGeometry,
    WSLocation,
    WSMaterials,
    WSMicroclimate,
    WSSimulationResults,
    WSSimulationResultsData,
    WSThermalBalance,
    WSUpdateData,
)


class RealtimeSimulationEngine:
    """
    High-speed simulation engine for WebSocket real-time loop.

    Target computation time: <50 ms per UPDATE_SIMULATION event.
    """

    def __init__(self) -> None:
        self._fao_engine = SimulationEngine()

    def run(self, payload: WSUpdateData) -> WSSimulationResults:
        """
        Execute FAO-56 + thermal balance pipeline for a WebSocket update.

        Args:
            payload: Validated WebSocket UPDATE_SIMULATION data.

        Returns:
            SIMULATION_RESULTS event payload with timing metadata.
        """
        start = time.perf_counter()

        climate_override = payload.climate
        sim_date = date.today()
        day_of_year = sim_date.timetuple().tm_yday

        t_max = climate_override.external_temp_c if climate_override.external_temp_c is not None else 30.0
        t_min = t_max - 6.0
        rh = climate_override.external_rh_pct if climate_override.external_rh_pct is not None else 65.0
        wind = climate_override.wind_speed_m_s if climate_override.wind_speed_m_s is not None else 2.0

        fao_request = SimulationRequest(
            climate=ClimateInput(
                latitude_deg=payload.location.lat,
                longitude_deg=payload.location.lon,
                elevation_m=payload.location.elevation_m,
                temperature_max_c=t_max,
                temperature_min_c=t_min,
                relative_humidity_pct=rh,
                wind_speed_m_s=wind,
            ),
            covering=CoveringMaterial(
                type=payload.materials.covering_type,
                transmittance=payload.materials.transmittance,
                u_value=payload.materials.u_value,
            ),
            crop_type=CropType(payload.crop.type),
            growth_stage=GrowthStage(payload.crop.growth_stage),
        )

        fao_result = self._fao_engine.run(fao_request)

        daylight = daylight_hours(payload.location.lat, day_of_year)
        solar = estimate_solar_radiation(payload.location.lat, day_of_year)

        thermal_input = ThermalInput(
            geometry=GeometryInput(
                length=payload.geometry.length,
                width=payload.geometry.width,
                ridge_height=payload.geometry.ridge_height,
                eave_height=payload.geometry.eave_height,
            ),
            materials=CoveringMaterial(
                type=payload.materials.covering_type,
                transmittance=payload.materials.transmittance,
                u_value=payload.materials.u_value,
            ),
            crop=CropInput(
                type=payload.crop.type,
                system=payload.crop.system,
                lai=payload.crop.lai,
                growth_stage=payload.crop.growth_stage,
            ),
            external_temp_c=(t_max + t_min) / 2.0,
            external_rh_pct=rh,
            wind_speed_m_s=wind,
            solar_radiation_mj_m2_day=solar,
            daylight_hours=daylight,
            et0_mm_day=fao_result.et0.et0_mm_day,
        )

        thermal = compute_thermal_balance(thermal_input)
        elapsed_ms = (time.perf_counter() - start) * 1000.0

        return WSSimulationResults(
            data=WSSimulationResultsData(
                thermal_balance=WSThermalBalance(
                    q_solar=thermal.thermal_balance.q_solar,
                    q_transpiration=thermal.thermal_balance.q_transpiration,
                    q_ventilation=thermal.thermal_balance.q_ventilation,
                    q_conduction=thermal.thermal_balance.q_conduction,
                    q_net_delta=thermal.thermal_balance.q_net_delta,
                ),
                microclimate=WSMicroclimate(
                    internal_temp=thermal.internal_temp_c,
                    external_temp=thermal.external_temp_c,
                    internal_rh=thermal.internal_rh_pct,
                    vpd_kpa=thermal.vpd_kpa,
                    et0_fao56=fao_result.et0.et0_mm_day,
                ),
                heatmap_matrix=thermal.heatmap_matrix,
                computation_ms=round(elapsed_ms, 2),
                ventilation_ach=thermal.ventilation_ach,
            ),
        )
