"""Orchestrates FAO-56 ET0, VPD, and DLI calculations into unified simulation results."""

from datetime import date

from app.simulation.dli import calculate_dli_from_solar_radiation, dli_adequacy_index
from app.simulation.fao56 import calculate_et0, daylight_hours
from app.simulation.psychrometrics import (
    actual_vapor_pressure_from_rh,
    saturation_vapor_pressure_kpa,
)
from app.simulation.schemas import (
    AgronomicMetrics,
    CropType,
    ET0Result,
    GrowthStage,
    SimulationRequest,
    SimulationResponse,
)
from app.simulation.vpd import calculate_vpd_kpa, vpd_stress_index

CROP_DLI_REQUIREMENTS: dict[CropType, float] = {
    CropType.TOMATO: 20.0,
    CropType.CUCUMBER: 17.0,
    CropType.PEPPER: 22.0,
    CropType.LETTUCE: 12.0,
    CropType.STRAWBERRY: 15.0,
    CropType.CANNABIS: 35.0,
}

CROP_VPD_OPTIMAL_MAX: dict[GrowthStage, float] = {
    GrowthStage.SEEDLING: 0.8,
    GrowthStage.EARLY_VEGETATIVE: 1.0,
    GrowthStage.MID_SEASON: 1.2,
    GrowthStage.LATE_VEGETATIVE: 1.2,
    GrowthStage.GENERATIVE: 1.5,
    GrowthStage.HARVEST: 1.0,
}


class SimulationEngine:
    """
    Production simulation engine combining FAO-56 physics with agronomic metrics.

    Provides actionable VPD, DLI, and ET0 outputs for greenhouse climate control
    and crop management decisions.
    """

    def run(self, request: SimulationRequest) -> SimulationResponse:
        """
        Execute a full simulation pipeline for the given request.

        Args:
            request: Validated simulation input parameters.

        Returns:
            Complete simulation response with ET0 and agronomic metrics.
        """
        climate = request.climate
        sim_date = climate.simulation_date or date.today()
        day_of_year = sim_date.timetuple().tm_yday
        temp_mean = (climate.temperature_max_c + climate.temperature_min_c) / 2.0

        et0_mm, net_radiation, solar_radiation = calculate_et0(
            latitude_deg=climate.latitude_deg,
            temperature_max_c=climate.temperature_max_c,
            temperature_min_c=climate.temperature_min_c,
            relative_humidity_pct=climate.relative_humidity_pct,
            wind_speed_m_s=climate.wind_speed_m_s,
            elevation_m=climate.elevation_m,
            sunshine_hours=climate.sunshine_hours,
            solar_radiation_mj_m2_day=climate.solar_radiation_mj_m2_day,
            simulation_date=sim_date,
        )

        daylight = daylight_hours(climate.latitude_deg, day_of_year)

        es = saturation_vapor_pressure_kpa(temp_mean)
        ea = actual_vapor_pressure_from_rh(temp_mean, climate.relative_humidity_pct)
        vpd = calculate_vpd_kpa(temp_mean, relative_humidity_pct=climate.relative_humidity_pct)

        vpd_max = CROP_VPD_OPTIMAL_MAX.get(request.growth_stage, 1.2)
        stress = vpd_stress_index(vpd, crop_optimal_max_kpa=vpd_max)

        dli = calculate_dli_from_solar_radiation(
            solar_radiation,
            transmittance=request.covering.transmittance,
        )
        crop_dli_req = CROP_DLI_REQUIREMENTS.get(request.crop_type, 20.0)
        dli_index = dli_adequacy_index(dli, crop_dli_req)

        return SimulationResponse(
            et0=ET0Result(
                et0_mm_day=round(et0_mm, 3),
                net_radiation_mj_m2_day=round(net_radiation, 3),
                solar_radiation_mj_m2_day=round(solar_radiation, 3),
                daylight_hours=round(daylight, 2),
            ),
            agronomic=AgronomicMetrics(
                vpd_kpa=round(vpd, 3),
                vpd_stress_index=round(stress, 3),
                dli_mol_m2_day=round(dli, 3),
                dli_adequacy_index=round(dli_index, 3),
                temperature_mean_c=round(temp_mean, 2),
                saturation_vapor_pressure_kpa=round(es, 3),
                actual_vapor_pressure_kpa=round(ea, 3),
            ),
            crop_type=request.crop_type,
            growth_stage=request.growth_stage,
        )
