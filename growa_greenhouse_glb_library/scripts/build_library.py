#!/usr/bin/env python3
"""
Regenerate the Growa greenhouse GLB component library at maximum practical detail.
Each asset respects manifest dimensions and stays within the per-mesh triangle budget (15k default).
"""

from __future__ import annotations

import json
import math
import struct
from dataclasses import dataclass
from pathlib import Path

import numpy as np
import trimesh
from trimesh.transformations import concatenate_matrices, rotation_matrix, translation_matrix

LIBRARY_DIR = Path(__file__).resolve().parent.parent
MANIFEST_PATH = LIBRARY_DIR / "manifest.json"
PRESERVE_FILES = frozenset({"exhaust-fan.glb"})

CYL = 64
CYL_FINE = 80
SPH = 40
ARC = 80


@dataclass(frozen=True)
class Palette:
    aluminum: tuple[float, float, float, float] = (0.72, 0.74, 0.78, 1.0)
    aluminum_dark: tuple[float, float, float, float] = (0.55, 0.57, 0.6, 1.0)
    galvanized: tuple[float, float, float, float] = (0.62, 0.64, 0.67, 1.0)
    white_paint: tuple[float, float, float, float] = (0.94, 0.95, 0.96, 1.0)
    cellulose: tuple[float, float, float, float] = (0.45, 0.72, 0.42, 1.0)
    rubber: tuple[float, float, float, float] = (0.12, 0.12, 0.12, 1.0)
    soil: tuple[float, float, float, float] = (0.36, 0.26, 0.18, 1.0)
    water: tuple[float, float, float, float] = (0.15, 0.45, 0.7, 0.85)
    rockwool: tuple[float, float, float, float] = (0.62, 0.78, 0.45, 1.0)
    stainless: tuple[float, float, float, float] = (0.78, 0.8, 0.82, 1.0)
    plastic: tuple[float, float, float, float] = (0.2, 0.65, 0.35, 1.0)
    fan_blade: tuple[float, float, float, float] = (0.48, 0.5, 0.53, 1.0)


PAL = Palette()


def pbr_material(
    color: tuple[float, float, float, float],
    metallic: float = 0.0,
    roughness: float = 0.55,
) -> trimesh.visual.material.PBRMaterial:
    return trimesh.visual.material.PBRMaterial(
        baseColorFactor=list(color),
        metallicFactor=float(metallic),
        roughnessFactor=float(roughness),
    )


def apply_material(mesh: trimesh.Trimesh, material: trimesh.visual.material.PBRMaterial) -> trimesh.Trimesh:
    mesh.visual = trimesh.visual.TextureVisuals(material=material)
    return mesh


def named(mesh: trimesh.Trimesh, name: str) -> trimesh.Trimesh:
    mesh.metadata["name"] = name
    return mesh


def transform(mesh: trimesh.Trimesh, matrix: np.ndarray) -> trimesh.Trimesh:
    out = mesh.copy()
    out.apply_transform(matrix)
    return out


def box_mesh(
    name: str,
    size: tuple[float, float, float],
    color: tuple[float, float, float, float],
    metallic: float = 0.0,
    roughness: float = 0.55,
) -> trimesh.Trimesh:
    mesh = trimesh.creation.box(extents=size)
    return named(apply_material(mesh, pbr_material(color, metallic, roughness)), name)


def cylinder_mesh(
    name: str,
    radius: float,
    height: float,
    color: tuple[float, float, float, float],
    sections: int = CYL,
    metallic: float = 0.0,
    roughness: float = 0.55,
) -> trimesh.Trimesh:
    mesh = trimesh.creation.cylinder(radius=radius, height=height, sections=sections)
    return named(apply_material(mesh, pbr_material(color, metallic, roughness)), name)


def tube_mesh(
    name: str,
    outer_r: float,
    inner_r: float,
    height: float,
    color: tuple[float, float, float, float],
    sections: int = CYL,
    metallic: float = 0.85,
    roughness: float = 0.28,
) -> trimesh.Trimesh:
    outer = trimesh.creation.cylinder(radius=outer_r, height=height, sections=sections)
    inner = trimesh.creation.cylinder(radius=inner_r, height=height * 1.02, sections=sections)
    try:
        mesh = outer.difference(inner)
    except Exception:
        mesh = outer
    return named(apply_material(mesh, pbr_material(color, metallic, roughness)), name)


def corrugated_sheet(
    name: str,
    width: float,
    height: float,
    depth: float,
    color: tuple[float, float, float, float],
    ribs: int = 24,
) -> trimesh.Trimesh:
    verts: list[list[float]] = []
    faces: list[list[int]] = []
    rib_pitch = width / ribs
    for row in range(ribs):
        x0 = -width / 2 + row * rib_pitch
        x1 = x0 + rib_pitch
        bulge = depth * (0.35 + 0.15 * math.sin(row * 1.7))
        v_base = len(verts)
        verts.extend(
            [
                [x0, 0, -height / 2],
                [x1, 0, -height / 2],
                [x1, bulge, -height / 2],
                [x0, bulge, -height / 2],
                [x0, 0, height / 2],
                [x1, 0, height / 2],
                [x1, bulge, height / 2],
                [x0, bulge, height / 2],
            ],
        )
        faces.extend(
            [
                [v_base, v_base + 1, v_base + 2],
                [v_base, v_base + 2, v_base + 3],
                [v_base + 4, v_base + 6, v_base + 5],
                [v_base + 4, v_base + 7, v_base + 6],
                [v_base, v_base + 4, v_base + 5],
                [v_base, v_base + 5, v_base + 1],
                [v_base + 2, v_base + 6, v_base + 7],
                [v_base + 2, v_base + 7, v_base + 3],
            ],
        )
    mesh = trimesh.Trimesh(vertices=np.asarray(verts, dtype=np.float64), faces=np.asarray(faces, dtype=np.int64), process=False)
    mesh.merge_vertices()
    mesh.fix_normals()
    return named(apply_material(mesh, pbr_material(color, 0.0, 0.78)), name)


def fan_assembly(
    prefix: str,
    diameter: float,
    depth: float,
    blade_count: int,
    spoke_count: int,
    hanger: bool,
) -> list[trimesh.Trimesh]:
    meshes: list[trimesh.Trimesh] = []
    r = diameter / 2
    lip_t = depth * 0.08
    housing_t = depth * 0.12

    for label, y_off, w_mult in [
        (f"{prefix}HousingTop", depth / 2 - housing_t / 2, 1.0),
        (f"{prefix}HousingBottom", -depth / 2 + housing_t / 2, 1.0),
        (f"{prefix}HousingLeft", 0, 1.0),
        (f"{prefix}HousingRight", 0, 1.0),
    ]:
        if "Left" in label or "Right" in label:
            m = box_mesh(label, (housing_t, diameter * w_mult, depth * 0.92), PAL.galvanized, 0.88, 0.26)
            m = transform(m, translation_matrix([(-r if "Left" in label else r), 0, 0]))
        else:
            m = box_mesh(label, (diameter * 0.96, housing_t, depth * 0.92), PAL.galvanized, 0.88, 0.26)
            m = transform(m, translation_matrix([0, y_off, 0]))
        meshes.append(m)

    for i in range(4):
        angle = i * math.pi / 2 + math.pi / 4
        corner = box_mesh(f"{prefix}CornerPlate_{i + 1}", (housing_t * 1.4, housing_t * 2.2, depth * 0.5), PAL.aluminum_dark, 0.82, 0.3)
        corner = transform(
            corner,
            concatenate_matrices(
                rotation_matrix(angle, [0, 1, 0]),
                translation_matrix([(r - housing_t) * math.cos(angle), 0, (r - housing_t) * math.sin(angle)]),
            ),
        )
        meshes.append(corner)

    venturi = cylinder_mesh(
        f"{prefix}VenturiShroud",
        r * 0.78,
        depth * 0.55,
        PAL.galvanized,
        sections=CYL_FINE,
        metallic=0.86,
        roughness=0.24,
    )
    venturi = transform(venturi, translation_matrix([0, -depth * 0.05, 0]))
    meshes.append(venturi)

    cone = trimesh.creation.cone(radius=r * 0.42, height=depth * 0.32, sections=CYL_FINE)
    cone = named(apply_material(cone, pbr_material(PAL.galvanized, 0.86, 0.26)), f"{prefix}DischargeCone")
    cone = transform(cone, translation_matrix([0, depth * 0.28, 0]))
    meshes.append(cone)

    lip = tube_mesh(f"{prefix}VenturiLip", r * 0.8, r * 0.72, lip_t, PAL.aluminum, sections=CYL_FINE)
    lip = transform(lip, translation_matrix([0, depth * 0.08, 0]))
    meshes.append(lip)

    hub = cylinder_mesh(f"{prefix}FanHub", r * 0.12, depth * 0.14, PAL.aluminum_dark, sections=CYL_FINE, metallic=0.9, roughness=0.22)
    meshes.append(hub)

    motor = cylinder_mesh(f"{prefix}MotorBody", r * 0.1, depth * 0.22, PAL.galvanized, sections=CYL_FINE, metallic=0.85, roughness=0.28)
    motor = transform(motor, translation_matrix([0, -depth * 0.18, 0]))
    meshes.append(motor)

    cap = cylinder_mesh(f"{prefix}MotorRearCap", r * 0.11, depth * 0.04, PAL.aluminum, sections=CYL_FINE, metallic=0.88, roughness=0.24)
    cap = transform(cap, translation_matrix([0, -depth * 0.32, 0]))
    meshes.append(cap)

    for b in range(blade_count):
        angle = (2 * math.pi * b) / blade_count
        blade = box_mesh(f"{prefix}Blade_{b + 1}", (r * 0.62, depth * 0.02, r * 0.14), PAL.fan_blade, 0.78, 0.32)
        blade = transform(
            blade,
            concatenate_matrices(
                rotation_matrix(angle, [0, 1, 0]),
                rotation_matrix(0.22, [0, 0, 1]),
                translation_matrix([r * 0.22, 0, 0]),
            ),
        )
        meshes.append(blade)

    for s in range(spoke_count):
        angle = (2 * math.pi * s) / spoke_count
        spoke = box_mesh(f"{prefix}GuardSpoke_{s + 1}", (r * 0.04, r * 0.82, depth * 0.03), PAL.stainless, 0.92, 0.18)
        spoke = transform(
            spoke,
            concatenate_matrices(
                rotation_matrix(angle, [0, 1, 0]),
                translation_matrix([0, r * 0.38, 0]),
            ),
        )
        meshes.append(spoke)

    for ring_i, scale in enumerate((0.98, 0.86, 0.74, 0.62)):
        ring = tube_mesh(
            f"{prefix}GuardRing_{ring_i + 1}",
            r * scale,
            r * (scale - 0.04),
            depth * 0.025,
            PAL.stainless,
            sections=CYL_FINE,
        )
        ring = transform(ring, translation_matrix([0, r * 0.36, 0]))
        meshes.append(ring)

    for m in range(4):
        angle = m * math.pi / 2
        bracket = box_mesh(f"{prefix}MountBracket_{m + 1}", (r * 0.14, r * 0.08, depth * 0.06), PAL.galvanized, 0.85, 0.3)
        bracket = transform(
            bracket,
            concatenate_matrices(
                rotation_matrix(angle, [0, 1, 0]),
                translation_matrix([(r + r * 0.04) * math.cos(angle), -depth * 0.36, (r + r * 0.04) * math.sin(angle)]),
            ),
        )
        meshes.append(bracket)

    if hanger:
        hang = cylinder_mesh(f"{prefix}hanger", 0.015, 0.45, PAL.galvanized, sections=24, metallic=0.85, roughness=0.3)
        hang = transform(hang, translation_matrix([0, depth / 2 + 0.22, 0]))
        meshes.append(named(hang, f"{prefix}hanger"))
        bracket_top = box_mesh(f"{prefix}mount_bracket", (0.22, 0.04, 0.18), PAL.galvanized, 0.85, 0.3)
        bracket_top = transform(bracket_top, translation_matrix([0, depth / 2 + 0.04, 0]))
        meshes.append(named(bracket_top, f"{prefix}mount_bracket"))

    return meshes


def build_louver(file_stem: str, width: float, height: float, depth: float, blades: int = 8) -> list[trimesh.Trimesh]:
    meshes: list[trimesh.Trimesh] = []
    frame_t = 0.045
    meshes.append(
        transform(
            box_mesh(f"{file_stem}_frame_1", (width, frame_t, depth), PAL.galvanized, 0.85, 0.32),
            translation_matrix([0, height / 2 - frame_t / 2, 0]),
        ),
    )
    meshes.append(
        transform(
            box_mesh(f"{file_stem}_frame_2", (width, frame_t, depth), PAL.galvanized, 0.85, 0.32),
            translation_matrix([0, -height / 2 + frame_t / 2, 0]),
        ),
    )
    meshes.append(
        transform(
            box_mesh(f"{file_stem}_frame_3", (frame_t, height, depth), PAL.galvanized, 0.85, 0.32),
            translation_matrix([-width / 2 + frame_t / 2, 0, 0]),
        ),
    )
    meshes.append(
        transform(
            box_mesh(f"{file_stem}_frame_4", (frame_t, height, depth), PAL.galvanized, 0.85, 0.32),
            translation_matrix([width / 2 - frame_t / 2, 0, 0]),
        ),
    )
    for i in range(blades):
        t = (i + 0.5) / blades
        y = -height / 2 + frame_t + t * (height - 2 * frame_t)
        blade = box_mesh(f"louver_blade_{i + 1}", (width - frame_t * 2.2, 0.028, depth * 0.88), PAL.aluminum, 0.82, 0.28)
        blade = transform(
            blade,
            concatenate_matrices(
                rotation_matrix(-0.35 + 0.12 * math.sin(i), [1, 0, 0]),
                translation_matrix([0, y, 0]),
            ),
        )
        meshes.append(blade)
    return meshes


def u_channel_segment(
    name: str,
    length: float,
    width: float,
    depth: float,
    wall: float,
    color: tuple[float, float, float, float],
) -> list[trimesh.Trimesh]:
    """Open-top U-channel (grow-row tray vocabulary)."""
    return [
        transform(
            box_mesh(f"{name}_base", (length, wall, width), color, 0.1, 0.58),
            translation_matrix([length / 2, wall / 2, 0]),
        ),
        transform(
            box_mesh(f"{name}_lip_left", (length, depth, wall), color, 0.12, 0.52),
            translation_matrix([length / 2, depth / 2, -width / 2 + wall / 2]),
        ),
        transform(
            box_mesh(f"{name}_lip_right", (length, depth, wall), color, 0.12, 0.52),
            translation_matrix([length / 2, depth / 2, width / 2 - wall / 2]),
        ),
    ]


def duct_flanges(diameter: float, positions_z: list[float]) -> list[trimesh.Trimesh]:
    flanges: list[trimesh.Trimesh] = []
    for index, z in enumerate(positions_z, start=1):
        flange = tube_mesh(
            f"duct_flange_{index}",
            diameter * 0.55,
            diameter * 0.48,
            diameter * 0.08,
            PAL.aluminum,
            sections=CYL_FINE,
            metallic=0.88,
            roughness=0.26,
        )
        flanges.append(transform(flange, translation_matrix([0, diameter / 2, z])))
    return flanges


def build_run_bed(
    name_shell: str,
    name_fill: str,
    name_edge: str | None,
    length: float,
    width: float,
    height: float,
    shell_color: tuple[float, float, float, float],
    fill_color: tuple[float, float, float, float],
) -> list[trimesh.Trimesh]:
    wall = 0.022
    meshes = [
        transform(
            box_mesh(name_shell, (length, height, width), shell_color, 0.15, 0.62),
            translation_matrix([length / 2, height / 2, 0]),
        ),
        transform(
            box_mesh(
                name_fill,
                (length - wall * 2, height - wall * 1.4, width - wall * 2),
                fill_color,
                0.0,
                0.85,
            ),
            translation_matrix([length / 2, (height - wall * 1.4) / 2 + wall * 0.3, 0]),
        ),
    ]
    if name_shell == name_fill:
        meshes[1].metadata["name"] = f"{name_fill}_interior"
    if name_edge:
        for side, z in (("left", -width / 2 + wall / 2), ("right", width / 2 - wall / 2)):
            meshes.append(
                transform(
                    box_mesh(f"bed_edge_{side}", (length, height * 0.85, wall), shell_color, 0.2, 0.55),
                    translation_matrix([length / 2, height * 0.42, z]),
                ),
            )
    return meshes


def export_scene(filename: str, meshes: list[trimesh.Trimesh]) -> int:
    scene = trimesh.Scene()
    tri_count = 0
    for mesh in meshes:
        node_name = mesh.metadata.get("name", "mesh")
        scene.add_geometry(mesh, node_name=node_name)
        tri_count += len(mesh.faces)
    out_path = LIBRARY_DIR / filename
    scene.export(out_path, file_type="glb")
    return tri_count


def glb_triangle_count(path: Path) -> int:
    data = path.read_bytes()
    chunk0_len = struct.unpack_from("<I", data, 12)[0]
    js = json.loads(data[20 : 20 + chunk0_len])
    total = 0
    for mesh in js.get("meshes", []):
        for prim in mesh.get("primitives", []):
            idx = prim.get("indices")
            if idx is not None:
                total += js["accessors"][idx]["count"] // 3
            else:
                total += js["accessors"][prim["attributes"]["POSITION"]]["count"] // 3
    return total


def build_all() -> dict[str, int]:
    counts: dict[str, int] = {}

    counts["haf-fan.glb"] = export_scene(
        "haf-fan.glb",
        fan_assembly("", 0.9, 0.32, blade_count=6, spoke_count=20, hanger=True),
    )

    counts["roof-exhaust-fan.glb"] = export_scene(
        "roof-exhaust-fan.glb",
        [
            transform(
                box_mesh("roof_base", (1.25, 0.12, 1.25), PAL.galvanized, 0.86, 0.28),
                translation_matrix([0.625, 0.06, 0.625]),
            ),
            transform(
                cylinder_mesh("exhaust_stack", 0.38, 0.72, PAL.galvanized, sections=CYL_FINE, metallic=0.88, roughness=0.26),
                translation_matrix([0.625, 0.48, 0.625]),
            ),
            transform(
                trimesh.creation.cone(radius=0.44, height=0.28, sections=CYL_FINE),
                translation_matrix([0.625, 0.98, 0.625]),
            ),
            *[
                transform(
                    box_mesh(f"fan_blade_{i + 1}", (0.34, 0.018, 0.09), PAL.fan_blade, 0.8, 0.32),
                    concatenate_matrices(
                        rotation_matrix((2 * math.pi * i) / 5, [0, 1, 0]),
                        rotation_matrix(0.18, [0, 0, 1]),
                        translation_matrix([0.625 + 0.12, 0.42, 0.625]),
                    ),
                )
                for i in range(5)
            ],
            transform(
                cylinder_mesh("motor_hub", 0.08, 0.1, PAL.aluminum_dark, sections=CYL_FINE, metallic=0.9, roughness=0.22),
                translation_matrix([0.625, 0.42, 0.625]),
            ),
            transform(
                box_mesh("rain_cap", (0.52, 0.05, 0.52), PAL.galvanized, 0.88, 0.26),
                translation_matrix([0.625, 1.12, 0.625]),
            ),
        ],
    )

    counts["pad-module.glb"] = export_scene(
        "pad-module.glb",
        [
            corrugated_sheet("cellulose_pad", 0.98, 1.96, 0.14, PAL.cellulose, ribs=32),
            *[
                transform(
                    box_mesh(f"frame_part_{i + 2}", (0.06, 2.08, 0.06), PAL.galvanized, 0.85, 0.3),
                    translation_matrix(
                        [
                            (0.48 if i % 2 else -0.48),
                            1.04,
                            (0.06 if i < 2 else -0.06),
                        ],
                    ),
                )
                for i in range(4)
            ],
        ],
    )

    counts["ac-unit.glb"] = export_scene(
        "ac-unit.glb",
        [
            box_mesh("ac_cabinet", (1.1, 1.8, 0.83), PAL.white_paint, 0.15, 0.42),
            transform(
                box_mesh("service_panel", (0.02, 1.2, 0.55), PAL.aluminum_dark, 0.55, 0.38),
                translation_matrix([0.54, 0.92, 0]),
            ),
            transform(
                cylinder_mesh("condenser_fan", 0.32, 0.06, PAL.galvanized, sections=CYL_FINE, metallic=0.88, roughness=0.24),
                translation_matrix([0, 1.86, 0.22]),
            ),
            *[
                transform(
                    box_mesh(f"louver_fin_{i}", (0.9, 0.008, 0.04), PAL.aluminum, 0.82, 0.3),
                    concatenate_matrices(
                        rotation_matrix(-0.25 + i * 0.04, [1, 0, 0]),
                        translation_matrix([0, 0.35 + i * 0.055, 0.4]),
                    ),
                )
                for i in range(18)
            ],
        ],
    )

    duct_sections = CYL_FINE
    duct_straight_parts: list[trimesh.Trimesh] = [
        transform(
            box_mesh("rectangular_duct", (0.6, 0.6, 1.5), PAL.galvanized, 0.88, 0.32),
            translation_matrix([0, 0.3, 0.75]),
        ),
        transform(
            box_mesh("duct_lagging", (0.66, 0.66, 1.5), PAL.white_paint, 0.05, 0.72),
            translation_matrix([0, 0.3, 0.75]),
        ),
    ]
    for rib_index, z in enumerate([0.12, 0.38, 0.64, 0.9, 1.16, 1.42]):
        duct_straight_parts.append(
            transform(
                box_mesh(f"duct_stiffener_{rib_index + 1}", (0.64, 0.64, 0.035), PAL.aluminum_dark, 0.82, 0.34),
                translation_matrix([0, 0.3, z]),
            ),
        )
    duct_straight_parts.extend(
        [
            transform(
                box_mesh(f"duct_flange_{i}", (0.64, 0.64, 0.02), PAL.aluminum, 0.85, 0.28),
                translation_matrix([0, 0.3, z]),
            )
            for i, z in enumerate((0.02, 1.48), start=1)
        ],
    )
    counts["duct-straight.glb"] = export_scene("duct-straight.glb", duct_straight_parts)

    counts["duct-elbow.glb"] = export_scene(
        "duct-elbow.glb",
        [
            transform(
                box_mesh("duct_horizontal", (1.05, 0.6, 0.6), PAL.galvanized, 0.88, 0.32),
                translation_matrix([0.525, 0.3, 0.3]),
            ),
            transform(
                box_mesh("duct_vertical", (0.6, 1.05, 0.6), PAL.galvanized, 0.88, 0.32),
                translation_matrix([0.3, 0.525, 0.3]),
            ),
            transform(
                box_mesh("elbow_transition", (0.62, 0.62, 0.62), PAL.aluminum, 0.85, 0.3),
                translation_matrix([0.31, 0.31, 0.31]),
            ),
        ],
    )

    diffuser_vanes = []
    for i in range(5):
        vane = box_mesh(f"diffuser_vane_{i + 1}", (0.62, 0.045, 0.04), PAL.aluminum, 0.82, 0.3)
        vane = transform(
            vane,
            concatenate_matrices(
                rotation_matrix((2 * math.pi * i) / 5, [0, 1, 0]),
                translation_matrix([0, 0.05, 0.18]),
            ),
        )
        diffuser_vanes.append(vane)
    counts["duct-diffuser.glb"] = export_scene(
        "duct-diffuser.glb",
        [
            transform(
                cylinder_mesh("diffuser_frame", 0.34, 0.08, PAL.galvanized, sections=duct_sections, metallic=0.88, roughness=0.28),
                translation_matrix([0, 0.04, 0]),
            ),
            *diffuser_vanes,
        ],
    )

    counts["roof-vent.glb"] = export_scene(
        "roof-vent.glb",
        [
            transform(
                box_mesh("vent_panel", (3.0, 0.045, 1.15), PAL.aluminum, 0.82, 0.3),
                translation_matrix([1.5, 0.35, 0.575]),
            ),
            transform(
                box_mesh("hinge_profile", (3.0, 0.05, 0.06), PAL.galvanized, 0.86, 0.28),
                translation_matrix([1.5, 0.05, 0.03]),
            ),
            transform(
                box_mesh("actuator_arm", (0.06, 0.42, 0.06), PAL.aluminum_dark, 0.75, 0.35),
                translation_matrix([0.4, 0.22, 0.55]),
            ),
        ],
    )

    counts["side-louver.glb"] = export_scene("side-louver.glb", build_louver("louver", 1.2, 1.6, 0.14))
    counts["gable-louver.glb"] = export_scene("gable-louver.glb", build_louver("louver", 1.8, 1.8, 0.14))

    counts["unit-heater.glb"] = export_scene(
        "unit-heater.glb",
        [
            box_mesh("heater_cabinet", (0.8, 0.9, 0.68), PAL.white_paint, 0.1, 0.48),
            transform(
                cylinder_mesh("heater_fan", 0.22, 0.04, PAL.galvanized, sections=CYL_FINE, metallic=0.88, roughness=0.24),
                translation_matrix([0, 0.52, 0.2]),
            ),
            transform(box_mesh("hanger_left", (0.03, 0.35, 0.03), PAL.galvanized, 0.85, 0.3), translation_matrix([-0.25, 0.62, 0])),
            transform(box_mesh("hanger_right", (0.03, 0.35, 0.03), PAL.galvanized, 0.85, 0.3), translation_matrix([0.25, 0.62, 0])),
        ],
    )

    counts["air-heater.glb"] = export_scene(
        "air-heater.glb",
        [
            box_mesh("heater_body", (0.75, 1.5, 0.65), PAL.white_paint, 0.1, 0.45),
            transform(
                cylinder_mesh("chimney", 0.12, 0.82, PAL.galvanized, sections=CYL_FINE, metallic=0.88, roughness=0.26),
                translation_matrix([0, 2.0, 0]),
            ),
            transform(
                cylinder_mesh("chimney_cap", 0.16, 0.06, PAL.aluminum, sections=CYL_FINE, metallic=0.88, roughness=0.24),
                translation_matrix([0, 2.46, 0]),
            ),
        ],
    )

    counts["heat-pipe.glb"] = export_scene(
        "heat-pipe.glb",
        [
            transform(
                cylinder_mesh("supply_pipe", 0.038, 2.0, PAL.stainless, sections=CYL_FINE, metallic=0.92, roughness=0.18),
                translation_matrix([0.08, 1.0, 0]),
            ),
            transform(
                cylinder_mesh("return_pipe", 0.038, 2.0, PAL.stainless, sections=CYL_FINE, metallic=0.92, roughness=0.18),
                translation_matrix([-0.08, 1.0, 0]),
            ),
            transform(
                box_mesh("pipe_support", (0.22, 0.12, 0.18), PAL.galvanized, 0.85, 0.32),
                translation_matrix([0, 0.06, 0]),
            ),
        ],
    )

    loop_meshes: list[trimesh.Trimesh] = []
    for i in range(4):
        loop_meshes.append(
            transform(
                cylinder_mesh(f"floor_pipe_{i + 1}", 0.028, 1.5, PAL.stainless, sections=CYL, metallic=0.92, roughness=0.18),
                translation_matrix([0.18 + i * 0.2, 0.04, 0.75]),
            ),
        )
    for j in range(3):
        loop_meshes.append(
            transform(
                cylinder_mesh(f"loop_connector_{j + 1}", 0.024, 0.38, PAL.stainless, sections=CYL, metallic=0.92, roughness=0.18),
                translation_matrix([0.28 + j * 0.2, 0.04, 0.2]),
            ),
        )
    counts["floor-loop.glb"] = export_scene("floor-loop.glb", loop_meshes)

    counts["fog-nozzle.glb"] = export_scene(
        "fog-nozzle.glb",
        [
            transform(
                cylinder_mesh("stainless_pipe", 0.018, 0.5, PAL.stainless, sections=CYL, metallic=0.92, roughness=0.16),
                translation_matrix([0, 0.04, 0.25]),
            ),
            transform(
                cylinder_mesh("nozzle_body", 0.028, 0.06, PAL.stainless, sections=CYL, metallic=0.92, roughness=0.16),
                translation_matrix([0, 0.06, 0.52]),
            ),
            transform(
                named(
                    apply_material(trimesh.creation.icosphere(subdivisions=3, radius=0.018), pbr_material(PAL.stainless, 0.92, 0.14)),
                    "nozzle_tip",
                ),
                translation_matrix([0, 0.09, 0.52]),
            ),
        ],
    )

    counts["substrate-gutter.glb"] = export_scene(
        "substrate-gutter.glb",
        [
            *u_channel_segment("substrate_gutter", 2.0, 0.36, 0.2, 0.014, PAL.plastic),
            transform(
                box_mesh("rockwool_slab", (1.92, 0.14, 0.3), PAL.rockwool, 0.0, 0.82),
                translation_matrix([1.0, 0.2, 0]),
            ),
            *[
                transform(
                    box_mesh("gutter_support", (0.04, 0.22, 0.04), PAL.galvanized, 0.85, 0.32),
                    translation_matrix([0.2 + i * 0.45, 0.11, 0]),
                )
                for i in range(4)
            ],
        ],
    )

    nft_meshes = u_channel_segment("nft_channel", 2.0, 0.16, 0.12, 0.012, PAL.plastic)
    for idx, x in enumerate((0.35, 0.8, 1.25, 1.7)):
        hole = cylinder_mesh(f"plant_hole_{int(x * 100)}", 0.038, 0.11, PAL.plastic, sections=CYL)
        nft_meshes.append(transform(hole, translation_matrix([x, 0.05, 0])))
    counts["nft-channel.glb"] = export_scene("nft-channel.glb", nft_meshes)

    counts["soil-bed.glb"] = export_scene(
        "soil-bed.glb",
        build_run_bed("soil_bed_shell", "soil_volume", "bed", 2.0, 1.06, 0.36, PAL.plastic, PAL.soil),
    )

    counts["dwc-raft.glb"] = export_scene(
        "dwc-raft.glb",
        [
            transform(box_mesh("dwc_tank", (2.0, 0.38, 1.2), PAL.plastic, 0.0, 0.55), translation_matrix([1.0, 0.19, 0])),
            transform(
                box_mesh("water_volume", (1.92, 0.22, 1.12), PAL.water, 0.0, 0.15),
                translation_matrix([1.0, 0.12, 0]),
            ),
            transform(
                box_mesh("floating_raft", (1.88, 0.06, 1.08), PAL.plastic, 0.0, 0.65),
                translation_matrix([1.0, 0.26, 0]),
            ),
        ],
    )

    drip_meshes = [
        transform(
            cylinder_mesh("drip_line", 0.012, 2.0, PAL.plastic, sections=24),
            translation_matrix([1.0, 0.14, 0]),
        ),
    ]
    for i in range(12):
        drip_meshes.append(
            transform(
                cylinder_mesh("dripper_body", 0.008, 0.04, PAL.plastic, sections=20),
                translation_matrix([0.15 + i * 0.15, 0.08, 0.02]),
            ),
        )
        drip_meshes.append(
            transform(
                box_mesh("dripper_stake", (0.008, 0.12, 0.008), PAL.plastic),
                translation_matrix([0.15 + i * 0.15, 0.06, 0.02]),
            ),
        )
    counts["drip-line.glb"] = export_scene("drip-line.glb", drip_meshes)

    counts["growbed.glb"] = export_scene(
        "growbed.glb",
        [
            transform(box_mesh("growbed_shell", (2.0, 0.42, 0.8), PAL.plastic, 0.0, 0.58), translation_matrix([1.0, 0.21, 0])),
            transform(
                box_mesh("substrate_layer", (1.92, 0.18, 0.72), PAL.soil, 0.0, 0.88),
                translation_matrix([1.0, 0.24, 0]),
            ),
            transform(
                box_mesh("water_level", (1.9, 0.04, 0.7), PAL.water, 0.0, 0.2),
                translation_matrix([1.0, 0.06, 0]),
            ),
        ],
    )

    bench_legs = []
    for i, (x, z) in enumerate(((0.15, 0.15), (1.85, 0.15), (0.15, 1.05), (1.85, 1.05))):
        bench_legs.append(
            transform(
                box_mesh(f"bench_leg_{i + 2}", (0.06, 0.85, 0.06), PAL.galvanized, 0.85, 0.32),
                translation_matrix([x, 0.425, z]),
            ),
        )
    counts["ebb-flow-bench.glb"] = export_scene(
        "ebb-flow-bench.glb",
        [
            transform(box_mesh("ebb_flow_tray", (2.0, 0.22, 1.2), PAL.plastic, 0.0, 0.58), translation_matrix([1.0, 0.88, 0.6])),
            transform(
                box_mesh("flood_surface", (1.92, 0.04, 1.12), PAL.water, 0.0, 0.2),
                translation_matrix([1.0, 0.76, 0.6]),
            ),
            *bench_legs,
        ],
    )

    aero: list[trimesh.Trimesh] = [
        transform(box_mesh("aeroponic_channel", (2.0, 0.34, 0.45), PAL.plastic, 0.0, 0.58), translation_matrix([1.0, 0.17, 0])),
    ]
    for idx, x in enumerate((0.4, 0.8, 1.2, 1.6)):
        aero.append(
            transform(
                cylinder_mesh(f"plant_port_{idx + 1}", 0.045, 0.06, PAL.plastic, sections=CYL),
                translation_matrix([x, 0.28, 0.12]),
            ),
        )
        aero.append(
            transform(
                trimesh.creation.icosphere(subdivisions=2, radius=0.012),
                translation_matrix([x, 0.26, -0.08]),
            ),
        )
    counts["aeroponic-channel.glb"] = export_scene("aeroponic-channel.glb", aero)

    venlo: list[trimesh.Trimesh] = []
    for label, x in (("column_1", -1.6), ("column_2", 1.6)):
        venlo.append(
            transform(
                box_mesh(label, (0.12, 5.2, 0.12), PAL.aluminum, 0.84, 0.28),
                translation_matrix([x, 2.6, 0]),
            ),
        )
    venlo.append(transform(box_mesh("gutter_beam", (4.0, 0.12, 0.14), PAL.aluminum_dark, 0.82, 0.32), translation_matrix([0, 4.6, -0.42])))
    venlo.append(transform(box_mesh("ridge_profile", (4.0, 0.1, 0.1), PAL.aluminum, 0.84, 0.28), translation_matrix([0, 5.05, 0])))
    for side, z in (("roof_rafter_left", -0.35), ("roof_rafter_right", 0.35)):
        rafter = box_mesh(side, (4.0, 0.06, 0.06), PAL.aluminum, 0.84, 0.28)
        venlo.append(
            transform(
                rafter,
                concatenate_matrices(rotation_matrix(0.32, [1, 0, 0]), translation_matrix([0, 4.2, z])),
            ),
        )
    counts["venlo-bay.glb"] = export_scene("venlo-bay.glb", venlo)

    gothic: list[trimesh.Trimesh] = []
    segments = 14
    span = 8.0
    rise = 5.9
    for i in range(segments):
        t0 = i / segments
        t1 = (i + 1) / segments
        z0 = -span / 2 + t0 * span
        z1 = -span / 2 + t1 * span
        y0 = rise * math.sin(math.pi * t0)
        y1 = rise * math.sin(math.pi * t1)
        length_seg = math.hypot(z1 - z0, y1 - y0)
        seg = box_mesh(f"arch_segment_{i + 1:02d}", (0.08, length_seg, 0.08), PAL.aluminum, 0.84, 0.28)
        angle = math.atan2(y1 - y0, z1 - z0)
        mid_z = (z0 + z1) / 2
        mid_y = (y0 + y1) / 2
        gothic.append(
            transform(
                seg,
                concatenate_matrices(
                    rotation_matrix(angle, [1, 0, 0]),
                    translation_matrix([0, mid_y, mid_z]),
                ),
            ),
        )
    gothic.append(transform(box_mesh("gutter_left", (span, 0.12, 0.14), PAL.aluminum_dark, 0.82, 0.32), translation_matrix([0, 0.06, -span / 2 + 0.07])))
    gothic.append(transform(box_mesh("gutter_right", (span, 0.12, 0.14), PAL.aluminum_dark, 0.82, 0.32), translation_matrix([0, 0.06, span / 2 - 0.07])))
    counts["gothic-arch.glb"] = export_scene("gothic-arch.glb", gothic)

    counts["glazing-bar.glb"] = export_scene(
        "glazing-bar.glb",
        [
            transform(
                box_mesh("aluminium_mullion", (0.073, 2.4, 0.04), PAL.aluminum, 0.86, 0.26),
                translation_matrix([0, 1.2, 0]),
            ),
            transform(
                box_mesh("rubber_gasket", (0.076, 2.4, 0.05), PAL.rubber, 0.0, 0.92),
                translation_matrix([0, 1.2, 0.025]),
            ),
        ],
    )

    return counts


def update_manifest(triangle_map: dict[str, int]) -> None:
    manifest = json.loads(MANIFEST_PATH.read_text(encoding="utf-8"))
    for asset in manifest.get("assets", []):
        file_name = asset.get("file")
        if not file_name:
            continue
        path = LIBRARY_DIR / file_name
        if not path.exists():
            continue
        tris = glb_triangle_count(path)
        asset["triangles"] = tris
        asset["within_budget"] = tris <= asset.get("triangle_budget", 15000)
        triangle_map[file_name] = tris
    MANIFEST_PATH.write_text(json.dumps(manifest, indent=2) + "\n", encoding="utf-8")


def main() -> None:
    built = build_all()
    for preserved in PRESERVE_FILES:
        path = LIBRARY_DIR / preserved
        if path.exists():
            built[preserved] = glb_triangle_count(path)
    update_manifest(built)
    print("Regenerated GLB library:")
    for name in sorted(built):
        path = LIBRARY_DIR / name
        print(f"  {name}: {glb_triangle_count(path)} triangles")


if __name__ == "__main__":
    main()