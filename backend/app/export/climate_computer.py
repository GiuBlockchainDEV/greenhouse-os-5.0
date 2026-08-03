"""Export engine for Priva, Ridder, and Hoogendoorn climate computers."""

from datetime import datetime, timezone

from app.export.schemas import (
    ClimateComputerExport,
    ClimateComputerFormat,
    ExportRequest,
    ExportRule,
    ExportSetpoint,
)

VPD_RH_TARGETS: dict[str, tuple[float, float]] = {
    "seedling": (75.0, 85.0),
    "early_vegetative": (70.0, 80.0),
    "mid_season": (65.0, 75.0),
    "late_vegetative": (65.0, 75.0),
    "generative": (60.0, 70.0),
    "harvest": (65.0, 75.0),
}


def _base_setpoints(req: ExportRequest) -> list[ExportSetpoint]:
    rh_min, rh_max = VPD_RH_TARGETS.get(req.growth_stage, (65.0, 75.0))
    rh_target = (rh_min + rh_max) / 2.0

    vent_pct = min(80.0, max(10.0, req.ventilation_ach * 8.0))
    pipe_temp = max(18.0, req.internal_temp_c - 2.0)

    return [
        ExportSetpoint(
            tag="climate.temperature.setpoint",
            name="Air Temperature Setpoint",
            value=round(req.internal_temp_c, 1),
            unit="°C",
            min_value=15.0,
            max_value=35.0,
        ),
        ExportSetpoint(
            tag="climate.humidity.setpoint",
            name="Relative Humidity Setpoint",
            value=round(rh_target, 1),
            unit="%",
            min_value=rh_min,
            max_value=rh_max,
        ),
        ExportSetpoint(
            tag="climate.vpd.target",
            name="VPD Target",
            value=round(req.vpd_kpa, 2),
            unit="kPa",
            min_value=0.4,
            max_value=1.8,
        ),
        ExportSetpoint(
            tag="ventilation.leeward.position",
            name="Leeward Vent Opening",
            value=round(vent_pct, 0),
            unit="%",
            min_value=0.0,
            max_value=100.0,
        ),
        ExportSetpoint(
            tag="heating.pipe.temperature",
            name="Heating Pipe Temperature",
            value=round(pipe_temp, 1),
            unit="°C",
            min_value=0.0,
            max_value=60.0,
        ),
        ExportSetpoint(
            tag="irrigation.et_reference",
            name="Reference ET₀",
            value=round(req.et0_mm_day, 2),
            unit="mm/day",
        ),
    ]


def _base_rules(req: ExportRequest) -> list[ExportRule]:
    return [
        ExportRule(
            condition=f"VPD > {req.vpd_kpa + 0.3:.1f}",
            action="INCREASE ventilation_leeward BY 10%",
            priority=1,
        ),
        ExportRule(
            condition=f"VPD < {max(req.vpd_kpa - 0.3, 0.4):.1f}",
            action="INCREASE humidity_setpoint BY 5%",
            priority=2,
        ),
        ExportRule(
            condition=f"temperature > {req.internal_temp_c + 3:.0f}",
            action="ACTIVATE shade_screen TO 70%",
            priority=1,
        ),
    ]


def _format_tag(format_type: ClimateComputerFormat, base_tag: str) -> str:
    prefixes = {
        ClimateComputerFormat.PRIVA: "PRIVA",
        ClimateComputerFormat.RIDDER: "RIDDER",
        ClimateComputerFormat.HOOGENDOORN: "HOOGENDOORN",
    }
    prefix = prefixes[format_type]
    return f"{prefix}.{base_tag}"


def export_climate_computer(req: ExportRequest) -> ClimateComputerExport:
    """
    Generate standardized JSON export for industrial climate computers.

    Supports Priva Compass, Ridder Synopta, and Hoogendoorn iSii formats.
    """
    setpoints = _base_setpoints(req)
    rules = _base_rules(req)

    if req.format != ClimateComputerFormat.PRIVA:
        setpoints = [
            ExportSetpoint(
                tag=_format_tag(req.format, sp.tag),
                name=sp.name,
                value=sp.value,
                unit=sp.unit,
                min_value=sp.min_value,
                max_value=sp.max_value,
            )
            for sp in setpoints
        ]

    format_labels = {
        ClimateComputerFormat.PRIVA: "Priva Compass",
        ClimateComputerFormat.RIDDER: "Ridder Synopta",
        ClimateComputerFormat.HOOGENDOORN: "Hoogendoorn iSii",
    }

    return ClimateComputerExport(
        format=req.format,
        greenhouse_name=req.greenhouse_name,
        exported_at=datetime.now(timezone.utc).isoformat(),
        setpoints=setpoints,
        rules=rules,
        metadata={
            "platform": "GreenhouseOS 5.0",
            "target_system": format_labels[req.format],
            "crop_type": req.crop_type,
            "growth_stage": req.growth_stage,
        },
    )
