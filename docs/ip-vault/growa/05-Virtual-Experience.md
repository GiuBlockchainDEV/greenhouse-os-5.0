# Virtual Experience

[[Home]] · [[04-Climate-Twin]] · [[06-GAIA-Intelligence]]

---

## Capability Summary

The **Virtual Experience** layer delivers a premium No-Form 3D design environment. Users manipulate greenhouse geometry, crop layout, and climate equipment directly in the viewport while receiving immediate visual and physics feedback.

---

## Experience Modules

| Module | User-Facing Capability |
|--------|------------------------|
| Parametric greenhouse | Real-time structural geometry from dimensions |
| Crop field | Instanced foliage grid scaled to crop profile |
| Equipment visualisation | Fans, pads, ducts, heaters in 3D context |
| Climate heatmap | Temperature and VPD floor overlay |
| Design controls | Sliders and gizmos — no traditional forms |
| Metrics HUD | Live OPEX, energy, and agronomic readouts |

---

## Black-Box Interface

```typescript
/** 3D experience controller — rendering internals are proprietary */
interface VirtualExperience {
  render(design: GrowaDesignContext, snapshot: TwinSnapshot): void;
  setInteractionMode(mode: "orbit" | "scale" | "translate"): void;
  setHeatmapMode(mode: "temperature" | "vpd" | "off"): void;
}
```

---

## Shader & Rendering (Abstracted)

Custom GPU shaders translate simulation heatmap data into colour-mapped floor overlays. Vertex and fragment logic, colour ramps, and equipment-aware spatial blending are **trade secrets** and are not reproduced here.

---

## Internationalisation

Full UI localisation in **English, Italian, Spanish, and French** across all experience modules.

---

*Continue to [[06-GAIA-Intelligence]]*
