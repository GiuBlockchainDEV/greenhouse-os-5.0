# Installed 3D agent skills

Sourced from [awesome-3d-skills](https://github.com/zhuyansen/awesome-3d-skills) for GreenhouseOS GLB generation and the R3F viewport:

| Skill | Use in this repo |
| --- | --- |
| `threejs-geometry` | High-segment cylinders, instancing, merge rules |
| `threejs-asset-pipeline` | GLB inspection and weld/dedup before ship |
| `threejs-materials` | PBR metalness/roughness on equipment |
| `procedural-geometry` | Engineered scale, no decorative greebles |
| `pipes` | Duct flanges, stiffeners, service colours |
| `greenhouse` | U-channel trays, grow-row spacing vocabulary |
| `metal` | Galvanized vs painted vs stainless assignments |

Regenerate models: `python3 growa_greenhouse_glb_library/scripts/build_library.py`