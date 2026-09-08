"""Greenhouse thermodynamic energy balance engine."""

import math

from app.simulation.schemas import ThermalBalance, ThermalInput, ThermalResult
from app.simulation.thermal_physics import HEATING_SETPOINT_C, solve_microclimate
from app.simulation.vpd import calculate_vpd_kpa


def compute_thermal_balance(params: ThermalInput) -> ThermalResult:
    """Compute greenhouse energy balance fluxes and internal microclimate."""
    length = params.geometry.length
    width = params.geometry.width
    state = solve_microclimate(params)

    q_net_delta = (
        state.q_solar_w_m2
        + state.q_transpiration_w_m2
        + state.q_ventilation_w_m2
        + state.q_conduction_w_m2
        + state.q_equipment_w_m2
    )

    heatmap = _generate_heatmap(
        rows=max(int(length / 2), 4),
        cols=max(int(width / 2), 4),
        base_temp=state.internal_temp_c,
        t_external=params.external_temp_c,
        rh_external=params.external_rh_pct,
        q_solar=state.q_solar_w_m2,
        length=length,
        width=width,
        eave_height=params.geometry.eave_height,
        equipment=params.equipment,
        supply_temp_c=state.supply_temp_c,
        mixing=state.mixing_effectiveness,
        heating_setpoint_c=params.heating_setpoint_c,
    )

    return ThermalResult(
        thermal_balance=ThermalBalance(
            q_solar=state.q_solar_w_m2,
            q_transpiration=state.q_transpiration_w_m2,
            q_ventilation=state.q_ventilation_w_m2,
            q_conduction=state.q_conduction_w_m2,
            q_net_delta=round(q_net_delta, 1),
        ),
        internal_temp_c=state.internal_temp_c,
        external_temp_c=round(params.external_temp_c, 1),
        internal_rh_pct=state.internal_rh_pct,
        vpd_kpa=round(calculate_vpd_kpa(state.internal_temp_c, relative_humidity_pct=state.internal_rh_pct), 3),
        ventilation_ach=state.ventilation_ach,
        heatmap_matrix=heatmap,
    )


def _generate_heatmap(
    rows: int,
    cols: int,
    base_temp: float,
    t_external: float,
    rh_external: float,
    q_solar: float,
    length: float,
    width: float,
    eave_height: float,
    equipment,
    supply_temp_c: float | None,
    mixing: float,
    heating_setpoint_c: float = HEATING_SETPOINT_C,
) -> list[list[float]]:
    """Generate flow-aware floor temperature grid with energy-conserving re-centering."""
    matrix: list[list[float]] = []
    half_l = length / 2.0
    half_w = width / 2.0
    heating_active = equipment.heating != "none" and heating_setpoint_c - base_temp > 0.5
    solar_amplitude = q_solar * 0.012
    temp_values: list[float] = []

    for row in range(rows):
        row_data: list[float] = []
        x = -half_l + (row / max(rows - 1, 1)) * length
        x_norm = (x + half_l) / max(length, 0.1)
        for col in range(cols):
            z = -half_w + (col / max(cols - 1, 1)) * width
            z_norm = abs(z) / max(half_w, 0.1)
            edge = math.sqrt((x_norm - 0.5) ** 2 + (z_norm - 0.5) ** 2)

            temp = base_temp + solar_amplitude * (0.5 - edge)
            temp += edge * (t_external - base_temp) * 0.35

            if equipment.cooling in {"fan_and_pad", "evaporative"} and supply_temp_c is not None:
                transit = 1.0 - min(1.0, x_norm / 0.95)
                temp += (supply_temp_c - base_temp) * transit

            if equipment.cooling == "mechanical_ac" and supply_temp_c is not None:
                cross_wave = 0.55 + 0.45 * math.sin(x_norm * math.pi * 4.0)
                temp += (supply_temp_c - base_temp) * (1.0 - z_norm * 0.45) * cross_wave * 0.65

            if heating_active and supply_temp_c is not None:
                temp += (supply_temp_c - base_temp) * (1.0 - edge) * 0.25

            temp = base_temp + (temp - base_temp) * (1.0 - mixing * 0.35)
            row_data.append(temp)
            temp_values.append(temp)
        matrix.append(row_data)

    mean_temp = sum(temp_values) / max(len(temp_values), 1)
    shift = base_temp - mean_temp
    return [
        [round(value + shift, 2) for value in row]
        for row in matrix
    ]
