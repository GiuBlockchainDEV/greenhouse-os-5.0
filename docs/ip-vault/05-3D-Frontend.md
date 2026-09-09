# 3D Frontend — Virtual Twin & No-Form UX

[[Home]] · [[02-System-Overview]] · [[04-Thermal-Simulation]]

---

## Overview

The frontend delivers a **No-Form UX** paradigm: greenhouse design parameters are edited directly in a 3D viewport via gizmos and sliders, with immediate visual and physics feedback. Built on **React Three Fiber** (R3F) atop Three.js.

**Primary implementations:**
- `frontend/src/components/3d/Viewport3D.tsx`
- `frontend/src/components/3d/GreenhouseScene.tsx`
- `frontend/src/components/3d/GreenhouseMesh.tsx`
- `frontend/src/store/useGreenhouseStore.ts`

---

## State Management (Zustand)

The `useGreenhouseStore` holds all greenhouse design parameters as a single reactive source of truth:

| Slice | Fields | Derived |
|-------|--------|---------|
| Geometry | length, width, ridgeHeight, eaveHeight | floorAreaM2, volumeM3, ridgeAngleDeg |
| Covering | type, transmittance, uValue | Glass opacity in 3D mesh |
| Crop | type, system, lai, growthStage | HUD labels via i18n |
| Location | lat, lon, elevationM | HUD coordinates |
| Climate equipment | fans, vents, pads, AC, fog, heating | Layout positions, rated capacities |
| Simulation results | thermal balance, heatmap matrix | Shader uniforms, HUD metrics |

Dimension changes trigger React re-renders, rebuilding roof geometry via `useMemo` and updating wall/roof scales.

---

## 3D Rendering Pipeline

```text
Viewport3D (Canvas)
    ├── OrbitControls (damped camera)
    ├── Grid (infinite ground plane)
    ├── GreenhouseMesh
    │       ├── Glass walls (meshPhysicalMaterial + transmission)
    │       ├── Gable roof (custom BufferGeometry)
    │       └── Structural frame (ridge beam + arch ribs)
    ├── CropGridMesh (InstancedMesh foliage)
    ├── ClimateEquipmentMesh (fans, pads, ducts, heaters)
    └── HeatmapShader (floor temperature/VPD overlay)
```

---

## No-Form TransformControls

Direct in-viewport geometry editing via `@react-three/drei` TransformControls:

| Mode | Action |
|------|--------|
| Scale | Maps X/Y/Z scale to length/ridge/eave height and width |
| Translate | Reposition (resets to origin on release) |
| Off | Standard orbit navigation only |

OrbitControls are disabled during gizmo drag to prevent camera conflict.

**Implementation:** `frontend/src/components/3d/GreenhouseScene.tsx`

---

## GLSL Heatmap Shader

Custom `ShaderMaterial` renders simulation `heatmap_matrix` as a floor overlay:

- **Temperature mode** — Blue → green → yellow → red gradient (0–50 °C)
- **VPD mode** — Optimal green → stress orange → severe red

Data uploaded via `THREE.DataTexture` (Float32, RedFormat).

**Files:**
- `frontend/src/components/3d/HeatmapShader.tsx`
- `frontend/src/components/3d/shaders/heatmapShader.ts`
- `frontend/src/lib/heatmapFallback.ts`
- `frontend/src/lib/heatmapRevision.ts`

---

## InstancedMesh Crop Grid

High-performance foliage rendering using `THREE.InstancedMesh`:

- Grid spacing per crop type (lettuce 0.25 m, tomato 0.5 m, etc.)
- Instance scale from LAI × growth stage
- Crop-specific color palette

**Implementation:** `frontend/src/components/3d/CropGridMesh.tsx`, `frontend/src/lib/plantGeometry.ts`

---

## Mechanical AC Duct Network

When cooling mode is `mechanical_ac`, each wall-mounted unit drives an internal supply network:

| Element | Rule |
|---------|------|
| Trunk | Short tap from each AC unit to its wall header |
| Headers | Full greenhouse length along north and/or south wall |
| Cross ducts | Every ~5.5 m, span full width |
| Diffusers | Every 4 m on headers and along cross ducts |
| Diameter | Scales with `ac_unit_width_m` (0.18–0.24 m) |

**Layout:** `frontend/src/lib/acDuctLayout.ts`  
**3D mesh:** `frontend/src/components/3d/ClimateEquipmentMesh.tsx`

---

## UI Components

| Component | Path | Function |
|-----------|------|----------|
| HUDOverlay | `components/ui/HUDOverlay.tsx` | Real-time metrics overlay |
| ClimateDashboard | `components/ui/ClimateDashboard.tsx` | OPEX, energy, CO₂, export |
| DimensionControls | `components/ui/DimensionControls.tsx` | Structure sliders |
| CultivationClimateControls | `components/ui/CultivationClimateControls.tsx` | Crop & equipment controls |
| HeatmapControls | `components/ui/HeatmapControls.tsx` | Heatmap mode toggle |
| LanguagePicker | `components/ui/LanguagePicker.tsx` | Locale selector |
| GizmoToolbar | `components/ui/GizmoToolbar.tsx` | Transform mode selector |

---

## Internationalization (i18n)

| Locale | Code | Namespaces |
|--------|------|------------|
| English | en | common, simulation, crops, 3d_controls, ai_copilot |
| Italian | it | common, simulation, crops, 3d_controls, ai_copilot |
| Spanish | es | common, simulation, crops, 3d_controls, ai_copilot |
| French | fr | common, simulation, crops, 3d_controls, ai_copilot |

Locale selection syncs between the Zustand store and `i18next.changeLanguage()`.

**Implementation:** `frontend/src/i18n.ts`, `frontend/src/locales/`

---

## Client-Side Thermal Preview

The frontend runs a parallel thermal solver (`frontend/src/lib/thermal/`) for instant preview without WebSocket round-trip:

- `solveMicroclimate.ts` — steady-state solver
- `ventilationFlow.ts` — flow-based ventilation
- `equipmentLoads.ts` — equipment heat/cool loads
- `spatialField.ts` — per-cell heatmap generation
- `ratedCapacities.ts` — equipment capacity resolution

Coefficients are synchronized with the backend per [[04-Thermal-Simulation]].

---

*Continue to [[06-AI-Gateway]]*
