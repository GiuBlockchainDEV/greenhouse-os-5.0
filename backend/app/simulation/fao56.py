"""
FAO-56 Penman-Monteith reference evapotranspiration (ET0) engine.

Implements the standardized FAO-56 method for calculating reference crop
evapotranspiration from meteorological data (Allen et al., 1998).
"""

import math
from datetime import date

from app.simulation.constants import (
    CLEAR_SKY_TRANSMISSIVITY,
    REFERENCE_ALBEDO,
    SOLAR_CONSTANT,
    STEFAN_BOLTZMANN,
)
from app.simulation.psychrometrics import (
    actual_vapor_pressure_from_rh,
    psychrometric_constant,
    saturation_vapor_pressure_kpa,
    slope_saturation_vapor_pressure,
)


def extraterrestrial_radiation(
    latitude_deg: float,
    day_of_year: int,
) -> float:
    """
    Extraterrestrial radiation (Ra) for a given latitude and day of year.

    FAO-56 Eq. 21–23. Result in MJ m^-2 day^-1.

    Args:
        latitude_deg: Site latitude in decimal degrees (-90 to 90).
        day_of_year: Julian day of year (1–366).

    Returns:
        Extraterrestrial radiation Ra in MJ m^-2 day^-1.
    """
    lat_rad = math.radians(latitude_deg)
    dr = 1.0 + 0.033 * math.cos(2.0 * math.pi * day_of_year / 365.0)
    solar_declination = 0.409 * math.sin(2.0 * math.pi * day_of_year / 365.0 - 1.39)
    sunset_hour_angle = math.acos(max(-1.0, min(1.0, -math.tan(lat_rad) * math.tan(solar_declination))))

    ra = (
        (24.0 * 60.0 / math.pi)
        * SOLAR_CONSTANT
        * dr
        * (
            sunset_hour_angle * math.sin(lat_rad) * math.sin(solar_declination)
            + math.cos(lat_rad) * math.cos(solar_declination) * math.sin(sunset_hour_angle)
        )
    )
    return max(0.0, ra)


def daylight_hours(latitude_deg: float, day_of_year: int) -> float:
    """
    Calculate maximum possible daylight hours (N) for a given location and date.

    FAO-56 Eq. 34.

    Args:
        latitude_deg: Site latitude in decimal degrees.
        day_of_year: Julian day of year (1–366).

    Returns:
        Daylight duration in hours.
    """
    lat_rad = math.radians(latitude_deg)
    solar_declination = 0.409 * math.sin(2.0 * math.pi * day_of_year / 365.0 - 1.39)
    sunset_hour_angle = math.acos(max(-1.0, min(1.0, -math.tan(lat_rad) * math.tan(solar_declination))))
    return (24.0 / math.pi) * sunset_hour_angle


def estimate_solar_radiation(
    latitude_deg: float,
    day_of_year: int,
    sunshine_hours: float | None = None,
    solar_radiation_mj_m2_day: float | None = None,
) -> float:
    """
    Estimate daily global solar radiation (Rs) at the surface.

    Uses measured Rs if provided; otherwise applies the Angstrom formula
    with sunshine duration (FAO-56 Eq. 35).

    Args:
        latitude_deg: Site latitude in decimal degrees.
        day_of_year: Julian day of year.
        sunshine_hours: Actual sunshine duration in hours.
        solar_radiation_mj_m2_day: Measured solar radiation if available.

    Returns:
        Global solar radiation Rs in MJ m^-2 day^-1.
    """
    if solar_radiation_mj_m2_day is not None:
        return max(0.0, solar_radiation_mj_m2_day)

    ra = extraterrestrial_radiation(latitude_deg, day_of_year)
    n = daylight_hours(latitude_deg, day_of_year)

    if sunshine_hours is not None and n > 0:
        rs = (0.25 + 0.50 * sunshine_hours / n) * ra
    else:
        rs = CLEAR_SKY_TRANSMISSIVITY * ra

    return max(0.0, rs)


def clear_sky_solar_radiation(
    extraterrestrial_radiation_mj_m2_day: float,
    elevation_m: float = 0.0,
) -> float:
    """
    Estimate clear-sky solar radiation Rso.

    FAO-56 Eq. 37.
    """
    return (0.75 + 2.0e-5 * elevation_m) * extraterrestrial_radiation_mj_m2_day


def net_radiation(
    solar_radiation_mj_m2_day: float,
    extraterrestrial_radiation_mj_m2_day: float,
    temperature_max_c: float,
    temperature_min_c: float,
    relative_humidity_pct: float,
    elevation_m: float = 0.0,
    albedo: float = REFERENCE_ALBEDO,
) -> float:
    """
    Estimate daily net radiation (Rn) at the crop surface.

    FAO-56 Eq. 15–20 simplified for daily calculations.

    Args:
        solar_radiation_mj_m2_day: Global solar radiation Rs in MJ m^-2 day^-1.
        extraterrestrial_radiation_mj_m2_day: Extraterrestrial radiation Ra in MJ m^-2 day^-1.
        temperature_max_c: Maximum daily air temperature in °C.
        temperature_min_c: Minimum daily air temperature in °C.
        relative_humidity_pct: Mean relative humidity percentage.
        elevation_m: Site elevation in meters.
        albedo: Surface albedo (default 0.23 for reference grass).

    Returns:
        Net radiation Rn in MJ m^-2 day^-1.
    """
    temp_mean = (temperature_max_c + temperature_min_c) / 2.0
    temp_max_k = temperature_max_c + 273.16
    temp_min_k = temperature_min_c + 273.16

    ea = actual_vapor_pressure_from_rh(temp_mean, relative_humidity_pct)
    rso = max(clear_sky_solar_radiation(extraterrestrial_radiation_mj_m2_day, elevation_m), 0.01)
    rs_rso_ratio = min(1.0, solar_radiation_mj_m2_day / rso)

    net_shortwave = (1.0 - albedo) * solar_radiation_mj_m2_day

    net_longwave = (
        STEFAN_BOLTZMANN
        * ((temp_max_k**4 + temp_min_k**4) / 2.0)
        * (0.34 - 0.14 * math.sqrt(max(ea, 0.0)))
        * (1.35 * rs_rso_ratio - 0.35)
    )

    return max(0.0, net_shortwave - net_longwave)


def soil_heat_flux_daily(net_radiation_mj_m2_day: float) -> float:
    """
    Daily soil heat flux density (G) for reference ET0 calculations.

    FAO-56 Eq. 42: G ≈ 0 for daily time steps.

    Args:
        net_radiation_mj_m2_day: Net radiation in MJ m^-2 day^-1.

    Returns:
        Soil heat flux G in MJ m^-2 day^-1 (always 0 for daily ET0).
    """
    return 0.0


def penman_monteith_et0(
    temperature_mean_c: float,
    wind_speed_m_s: float,
    relative_humidity_pct: float,
    net_radiation_mj_m2_day: float,
    elevation_m: float = 0.0,
    soil_heat_flux_mj_m2_day: float = 0.0,
) -> float:
    """
    Calculate FAO-56 Penman-Monteith reference evapotranspiration (ET0).

    FAO-56 Eq. 6 (daily form):

        ET0 = [0.408·Δ·(Rn - G) + γ·(900/(T+273))·u2·(es - ea)]
              / [Δ + γ·(1 + 0.34·u2)]

    Args:
        temperature_mean_c: Mean daily air temperature in °C.
        wind_speed_m_s: Wind speed at 2 m height in m s^-1.
        relative_humidity_pct: Mean relative humidity percentage.
        net_radiation_mj_m2_day: Net radiation Rn in MJ m^-2 day^-1.
        elevation_m: Site elevation in meters.
        soil_heat_flux_mj_m2_day: Soil heat flux G in MJ m^-2 day^-1.

    Returns:
        Reference evapotranspiration ET0 in mm day^-1.
    """
    es = saturation_vapor_pressure_kpa(temperature_mean_c)
    ea = actual_vapor_pressure_from_rh(temperature_mean_c, relative_humidity_pct)
    delta = slope_saturation_vapor_pressure(temperature_mean_c)
    gamma = psychrometric_constant(elevation_m)

    u2 = max(0.0, wind_speed_m_s)
    vapor_deficit = max(0.0, es - ea)

    numerator = (
        0.408 * delta * (net_radiation_mj_m2_day - soil_heat_flux_mj_m2_day)
        + gamma * (900.0 / (temperature_mean_c + 273.0)) * u2 * vapor_deficit
    )
    denominator = delta + gamma * (1.0 + 0.34 * u2)

    if denominator <= 0:
        return 0.0

    return max(0.0, numerator / denominator)


def calculate_et0(
    latitude_deg: float,
    temperature_max_c: float,
    temperature_min_c: float,
    relative_humidity_pct: float,
    wind_speed_m_s: float,
    elevation_m: float = 0.0,
    sunshine_hours: float | None = None,
    solar_radiation_mj_m2_day: float | None = None,
    simulation_date: date | None = None,
) -> tuple[float, float, float]:
    """
    Full ET0 pipeline from raw meteorological inputs.

    Args:
        latitude_deg: Site latitude in decimal degrees.
        temperature_max_c: Maximum daily temperature in °C.
        temperature_min_c: Minimum daily temperature in °C.
        relative_humidity_pct: Mean relative humidity percentage.
        wind_speed_m_s: Wind speed at 2 m in m s^-1.
        elevation_m: Site elevation in meters.
        sunshine_hours: Optional sunshine duration in hours.
        solar_radiation_mj_m2_day: Optional measured solar radiation.
        simulation_date: Date for Julian day calculation (defaults to today).

    Returns:
        Tuple of (et0_mm_day, net_radiation_mj_m2_day, solar_radiation_mj_m2_day).
    """
    if simulation_date is None:
        simulation_date = date.today()

    day_of_year = simulation_date.timetuple().tm_yday
    temp_mean = (temperature_max_c + temperature_min_c) / 2.0

    ra = extraterrestrial_radiation(latitude_deg, day_of_year)

    rs = estimate_solar_radiation(
        latitude_deg,
        day_of_year,
        sunshine_hours=sunshine_hours,
        solar_radiation_mj_m2_day=solar_radiation_mj_m2_day,
    )

    rn = net_radiation(
        rs,
        ra,
        temperature_max_c,
        temperature_min_c,
        relative_humidity_pct,
        elevation_m=elevation_m,
    )

    g = soil_heat_flux_daily(rn)

    et0 = penman_monteith_et0(
        temperature_mean_c=temp_mean,
        wind_speed_m_s=wind_speed_m_s,
        relative_humidity_pct=relative_humidity_pct,
        net_radiation_mj_m2_day=rn,
        elevation_m=elevation_m,
        soil_heat_flux_mj_m2_day=g,
    )

    return et0, rn, rs
