// Single source of truth for the backend base URL.
// Priority:
//   1) window.API_BASE_URL (injected by index.html for legacy scripts + runtime override)
//   2) VITE_API_BASE_URL (standard Vite env)
//   3) localhost fallback (dev convenience)
const winBase = (globalThis as any)?.API_BASE_URL as string | undefined;
const envBase = (import.meta.env.VITE_API_BASE_URL as string | undefined) ?? undefined;

export const API_BASE_URL: string = (winBase || envBase || 'http://localhost:8000').replace(/\/+$/, '');
