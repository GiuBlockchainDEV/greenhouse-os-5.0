"""Physical and psychrometric constants per FAO-56 and ASHRAE standards."""

from typing import Final

# Stefan-Boltzmann constant (MJ K^-4 m^-2 day^-1)
STEFAN_BOLTZMANN: Final[float] = 4.903e-9

# Latent heat of vaporization at 20 °C (MJ kg^-1)
LATENT_HEAT_VAPORIZATION: Final[float] = 2.45

# Specific heat of air at constant pressure (MJ kg^-1 °C^-1)
SPECIFIC_HEAT_AIR: Final[float] = 1.013e-3

# Ratio of molecular weight of water to dry air
MOLECULAR_WEIGHT_RATIO: Final[float] = 0.622

# Standard atmospheric pressure at sea level (kPa)
STANDARD_ATM_PRESSURE_KPA: Final[float] = 101.3

# Solar constant (MJ m^-2 min^-1)
SOLAR_CONSTANT: Final[float] = 0.0820

# Albedo for reference grass surface
REFERENCE_ALBEDO: Final[float] = 0.23

# Typical fraction of extraterrestrial radiation reaching earth on clear days
CLEAR_SKY_TRANSMISSIVITY: Final[float] = 0.75

# PAR fraction of global solar radiation (mol photons per MJ)
PAR_FRACTION: Final[float] = 2.08

# Conversion: seconds per hour
SECONDS_PER_HOUR: Final[float] = 3600.0

# Conversion: μmol to mol
UMOL_TO_MOL: Final[float] = 1e-6
