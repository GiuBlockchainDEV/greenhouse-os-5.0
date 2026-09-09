# Black-Box Architecture

[[Home]] · [[01-Platform-Value]] · [[03-Agronomic-Intelligence]]

---

## System Topology

High-level view of the Growa platform. Internal algorithmic cores are intentionally opaque.

```text
┌──────────────────────────────────────────────────────────┐
│                    EXPERIENCE LAYER                       │
│         3D Viewport · Dashboard · GAIA Copilot            │
└────────────────────────────┬─────────────────────────────┘
                             │  REST / WebSocket
┌────────────────────────────▼─────────────────────────────┐
│                    ORCHESTRATION LAYER                    │
│      API Gateway · Session · Export · Auth Bridge         │
└──────┬──────────────┬──────────────┬─────────────────────┘
       │              │              │
┌──────▼──────┐ ┌─────▼─────┐ ┌─────▼─────┐
│  AGRONOMIC  │ │  CLIMATE  │ │   GAIA    │
│  INTELLIGENCE│ │   TWIN    │ │INTELLIGENCE│
│  [BLACK BOX]│ │[BLACK BOX]│ │[BLACK BOX]│
└─────────────┘ └───────────┘ └───────────┘
       │              │              │
┌──────▼──────────────▼──────────────▼─────────────────────┐
│                    DATA GOVERNANCE LAYER                    │
│              Profiles · Designs · Access Control            │
└────────────────────────────────────────────────────────────┘
```

---

## Layer Responsibilities

| Layer | Role | Disclosed |
|-------|------|-----------|
| Experience | User interaction, visualization, localization | Behaviour only |
| Orchestration | Routing, validation, export formatting | API contracts |
| Agronomic Intelligence | Crop microclimate indices | Inputs/outputs |
| Climate Twin | Real-time energy & equipment simulation | Capabilities |
| GAIA Intelligence | AI-assisted climate guidance | Interface |
| Data Governance | Persistence, auth, row-level security | Schema shape |

---

## Sanitized Platform Contract

The entire platform is addressable through a single design context object. Implementation is proprietary.

```typescript
/** Public design context — sanitized interface */
interface GrowaDesignContext {
  geometry: GreenhouseGeometry;
  covering: CoveringMaterial;
  crop: CropProfile;
  location: GeoCoordinate;
  equipment?: ClimateEquipmentProfile;
}

/** Platform orchestrator — black-box entry point */
interface GrowaPlatform {
  previewMicroclimate(ctx: GrowaDesignContext): MicroclimateSnapshot;
  streamSimulation(ctx: GrowaDesignContext): AsyncStream<SimulationFrame>;
  exportSetpoints(ctx: GrowaDesignContext, vendor: VendorFormat): SetpointBundle;
  askGAIA(ctx: GrowaDesignContext, query: string): GuidanceResponse;
}
```

> **Note:** Type names illustrate structure only. Proprietary solvers, coefficients, and calibration data are not disclosed.

---

## Technology Stack (Non-Secret)

| Tier | Stack |
|------|-------|
| Backend | Python · FastAPI · Pydantic |
| Frontend | React · TypeScript · Three.js |
| Real-time | WebSocket |
| Data | PostgreSQL with row-level security |
| AI | Multi-provider gateway with local fallback |

---

*Continue to [[03-Agronomic-Intelligence]]*
