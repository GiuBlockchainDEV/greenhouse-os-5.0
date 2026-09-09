# Intellectual Property Declaration

[[Home]] · [[00-IP-Deposit-Cover]] · [[11-Module-Index]]

---

## Ownership Statement

**Software name:** GreenhouseOS 5.0  
**Copyright holder:** GreenhouseOS Contributors  
**Copyright year:** 2026  
**License:** Business Source License 1.1 (BUSL-1.1)  
**Change date:** 2029-08-03 (converts to Apache License 2.0)

The authors declare that GreenhouseOS 5.0 is original software created by the GreenhouseOS Contributors. All architectural designs, algorithm implementations, user interface concepts, and documentation described in this vault are proprietary to the copyright holder, subject to the BUSL-1.1 license terms.

---

## Originality Claims

The following elements represent **original creative and technical work**:

### 1. Unified Virtual Twin Architecture

Integration of real-time FAO-56 agronomic physics, quasi-steady-state thermal energy balance, equipment-aware spatial heatmaps, and industrial climate-computer export within a single browser-based 3D design environment. No prior open-source greenhouse design tool combines all four pillars (see [[01-Executive-Summary]]) in one platform.

### 2. No-Form 3D Design Paradigm

Direct manipulation of greenhouse geometry via in-viewport TransformControls gizmos, eliminating traditional form-based configuration. Parameter changes propagate simultaneously to 3D mesh, thermal solver, and heatmap shader.

### 3. Frontend–Backend Thermal Parity

Deliberate synchronization of physical coefficients (ventilation ACH boosts, latent heat conversion, RH coupling, cooling capacity factor) between Python backend and TypeScript frontend solvers, enabling sub-50 ms client preview with server-validated results.

### 4. Equipment-Aware Spatial Heatmap

Custom GLSL shader system that visualizes per-cell temperature and VPD influenced by the spatial layout of climate equipment (pad walls, AC duct networks, HAF fans, ridge vents, heating pipes). The influence rules are documented in [[04-Thermal-Simulation]] and `docs/THERMAL_EQUIPMENT_AUDIT.csv`.

### 5. Multi-AI Gateway with Deterministic Fallback

Decoupled provider abstraction supporting four AI backends with automatic fallback to a rule-based local optimizer that produces industrial climate-computer-compatible setpoints without cloud dependency.

### 6. Industrial Climate Computer Export

Vendor-specific JSON generation (Priva, Ridder, Hoogendoorn) from simulation-derived microclimate data, bridging agronomic modeling with operational greenhouse automation.

### 7. Multilingual No-Form UX

Complete internationalization (English, Italian, Spanish, French) across 5 namespaces, integrated with a 3D design workflow that has no traditional form fields.

---

## Third-Party Components

GreenhouseOS incorporates the following open-source libraries under their respective licenses:

| Library | License | Usage |
|---------|---------|-------|
| FastAPI | MIT | Backend HTTP framework |
| Pydantic | MIT | Data validation |
| React | MIT | Frontend UI framework |
| Three.js | MIT | 3D rendering |
| @react-three/fiber | MIT | React Three.js bindings |
| Zustand | MIT | State management |
| react-i18next | MIT | Internationalization |
| @supabase/supabase-js | MIT | Database client |
| Tailwind CSS | MIT | Utility-first CSS |

Third-party components are used as libraries; the original architecture, physics integration, and application logic are proprietary.

---

## Trade Secret Considerations

The following are considered **trade secrets** and are not disclosed in this vault:

- Exact calibration coefficients in `THERMAL_EQUIPMENT_AUDIT.csv` (referenced but not reproduced)
- AI system prompt full text (structure described, content withheld)
- Performance optimization techniques in the WebSocket handler
- Specific crop coefficient tuning values per cultivar

---

## Deposit Scope

This vault documents:

- **113 source files** (~15,231 lines of code)
- **6 completed development milestones**
- **4 physics engines** (FAO-56, VPD, DLI, thermal balance)
- **4 AI provider integrations** + local fallback
- **3 industrial export formats**
- **4 supported locales**
- **1 database migration** with RLS

---

## Certification

This document was compiled on **2026-09-09** as a technical annex for intellectual property registration purposes. It contains no credentials, production infrastructure details, customer data, or full source code listings, in accordance with [[10-Security-Redaction-Policy]].

---

*Return to [[Home]]*
