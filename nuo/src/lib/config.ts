// Single source of truth for the backend base URL.
//
// Priority (highest -> lowest):
//   1) window.API_BASE_URL (runtime override; also used by any legacy scripts if present)
//   2) VITE_API_BASE_URL or VITE_API_URL (Vite env)
//   3) Host-based default:
//        - if running on localhost -> http://127.0.0.1:8000
//        - otherwise -> your Railway backend
const winBase = (globalThis as any)?.API_BASE_URL as string | undefined;

const envBase =
  (import.meta.env.VITE_API_BASE_URL as string | undefined) ||
  (import.meta.env.VITE_API_URL as string | undefined) ||
  undefined;

function defaultBaseUrl(): string {
  try {
    const host = String(globalThis.location?.hostname || "").toLowerCase();
    const isLocal = host === "localhost" || host === "127.0.0.1" || host === "0.0.0.0";
    return isLocal ? "http://127.0.0.1:8000" : "https://server-production-5141.up.railway.app";
  } catch {
    return "http://127.0.0.1:8000";
  }
}

export const API_BASE_URL: string = (winBase || envBase || defaultBaseUrl()).replace(/\/+$/, "");
