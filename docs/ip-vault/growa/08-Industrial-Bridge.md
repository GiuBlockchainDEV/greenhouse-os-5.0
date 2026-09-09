# Industrial Bridge

[[Home]] · [[07-Data-Governance]] · [[09-Interface-Contracts]]

---

## Capability Summary

The **Industrial Bridge** module translates virtual twin outputs into climate-control setpoint bundles compatible with leading greenhouse automation vendors.

---

## Supported Vendor Formats

| Vendor | Export Type |
|--------|-------------|
| Priva | JSON setpoint payload |
| Ridder | JSON climate rules |
| Hoogendoorn | JSON process computer setpoints |

---

## Export Content (Abstracted)

| Category | Examples |
|----------|----------|
| Temperature | Day/night targets, ramp rates |
| Humidity | RH targets per growth stage |
| Ventilation | Min/max positions, CO₂ overrides |
| Screens | Thermal screen conditions |
| Heating / cooling | Enable thresholds |

---

## Black-Box Interface

```typescript
/** Industrial bridge — vendor tag mappings are proprietary */
interface IndustrialBridge {
  export(
    context: GrowaDesignContext,
    snapshot: TwinSnapshot,
    vendor: "priva" | "ridder" | "hoogendoorn"
  ): VendorSetpointBundle;
}
```

> **Trade secret:** Vendor-specific tag prefixes, unit conversions, and crop-stage mapping tables are not disclosed.

---

## Dashboard Metrics

The platform surfaces design-phase estimates for OPEX, energy intensity, and carbon footprint. These are engineering projections, not operational billing data.

---

*Continue to [[09-Interface-Contracts]]*
