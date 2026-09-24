import type { CoveringMaterial } from "@/types/greenhouse";

export const ALUMINUM = "#b7c0c8";
export const ALUMINUM_DARK = "#8e99a4";
export const CONCRETE = "#d5d2cb";

export interface CladdingLook {
  color: string;
  opacity: number;
  transmission: number;
  roughness: number;
  thickness: number;
  ior: number;
  clearcoat: number;
  clearcoatRoughness: number;
  depthWrite: boolean;
}

/** Physical cladding response for each commercial covering. Heatmap mode keeps the shell nearly invisible. */
export function claddingLook(
  type: CoveringMaterial["type"],
  heatmapActive: boolean,
): CladdingLook {
  if (heatmapActive) {
    return {
      color: "#ffffff",
      opacity: 0.05,
      transmission: 0.9,
      roughness: 0.02,
      thickness: 0.05,
      ior: 1.45,
      clearcoat: 0,
      clearcoatRoughness: 0.2,
      depthWrite: false,
    };
  }

  switch (type) {
    case "polycarbonate":
      return {
        color: "#eef3f8",
        opacity: 0.62,
        transmission: 0.42,
        roughness: 0.22,
        thickness: 0.16,
        ior: 1.49,
        clearcoat: 0.35,
        clearcoatRoughness: 0.25,
        depthWrite: true,
      };
    case "polyethylene":
      return {
        color: "#f4f1e4",
        opacity: 0.78,
        transmission: 0.18,
        roughness: 0.48,
        thickness: 0.04,
        ior: 1.46,
        clearcoat: 0.12,
        clearcoatRoughness: 0.4,
        depthWrite: true,
      };
    case "etfe":
      return {
        color: "#f7fbff",
        opacity: 0.42,
        transmission: 0.86,
        roughness: 0.06,
        thickness: 0.08,
        ior: 1.4,
        clearcoat: 0.85,
        clearcoatRoughness: 0.08,
        depthWrite: true,
      };
    default:
      return {
        color: "#e4f4ec",
        opacity: 1,
        transmission: 0.9,
        roughness: 0.035,
        thickness: 0.35,
        ior: 1.52,
        clearcoat: 1,
        clearcoatRoughness: 0.04,
        depthWrite: false,
      };
  }
}
