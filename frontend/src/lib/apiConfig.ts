/** Backend origin for production (empty in dev → Vite proxy). */
const API_ORIGIN = (import.meta.env.VITE_API_BASE_URL as string | undefined)?.replace(/\/$/, "") ?? "";

export function apiUrl(path: string): string {
  const normalized = path.startsWith("/") ? path : `/${path}`;
  return `${API_ORIGIN}${normalized}`;
}

export function wsUrl(path: string): string {
  const wsOverride = import.meta.env.VITE_WS_BASE_URL as string | undefined;
  if (wsOverride) {
    const base = wsOverride.replace(/\/$/, "");
    const normalized = path.startsWith("/") ? path : `/${path}`;
    return `${base}${normalized}`;
  }

  if (API_ORIGIN) {
    const httpUrl = new URL(API_ORIGIN);
    const protocol = httpUrl.protocol === "https:" ? "wss:" : "ws:";
    const normalized = path.startsWith("/") ? path : `/${path}`;
    return `${protocol}//${httpUrl.host}${normalized}`;
  }

  const protocol = window.location.protocol === "https:" ? "wss:" : "ws:";
  const normalized = path.startsWith("/") ? path : `/${path}`;
  return `${protocol}//${window.location.host}${normalized}`;
}

export const API_V1 = apiUrl("/api/v1");
