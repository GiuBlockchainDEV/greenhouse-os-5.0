# GLB library builder

Regenerates `growa_greenhouse_glb_library/*.glb` from procedural geometry. The workflow follows installed agent skills from [awesome-3d-skills](https://github.com/zhuyansen/awesome-3d-skills) (Three.js geometry, pipes, greenhouse trays, metal PBR).

## Requirements

```bash
pip install -r requirements-build.txt
```

## Build

```bash
python3 growa_greenhouse_glb_library/scripts/build_library.py
```

`exhaust-fan.glb` is preserved (authored high-detail asset). All other modules are rebuilt and `manifest.json` triangle counts are updated.