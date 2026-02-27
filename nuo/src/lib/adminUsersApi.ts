// src/lib/adminUsersApi.ts
//
// Fixes:
// - No top-level await/return (ESM restriction)
// - Correct joinUrl regex
// - Adds a small fetch wrapper with better error messages
// - Normalizes backend shapes: list_users returns [] while search returns {results: []}
// - Adds safe userId parsing (string | number) + guard (prevents /admin/users/NaN -> 422)
// - Better 422 messaging so you can see what FastAPI complained about

import { API_BASE_URL } from './config';
import { getAuth } from './auth';

/** Join base + path safely */
function joinUrl(base: string, path: string) {
  const b = (base || '').replace(/\/+$/, ''); // strip trailing slashes
  if (!path) return b;
  if (/^https?:\/\//i.test(path)) return path;
  const p = path.startsWith('/') ? path : `/${path}`;
  return `${b}${p}`;
}

/** Add query params */
function withQuery(url: string, params?: Record<string, unknown>) {
  if (!params) return url;
  const q = new URLSearchParams();
  for (const [k, v] of Object.entries(params)) {
    if (v === undefined || v === null || v === '') continue;
    q.set(k, String(v));
  }
  const qs = q.toString();
  return qs ? `${url}?${qs}` : url;
}

function authHeaders(): Record<string, string> {
  const a = getAuth();
  if (!a?.token) throw new Error('Not authenticated');
  return {
    Authorization: `Bearer ${a.token}`,
    Accept: 'application/json',
  };
}

/**
 * Accepts route params (string), numbers, etc.
 * Returns a positive int or null.
 */
export function parseUserId(userId: unknown): number | null {
  if (typeof userId === 'number') {
    if (Number.isFinite(userId) && Number.isInteger(userId) && userId > 0) return userId;
    return null;
  }
  if (typeof userId === 'string') {
    const s = userId.trim();
    if (!s) return null;
    // Only digits => safer than Number("1e3") etc.
    if (!/^\d+$/.test(s)) return null;
    const n = Number(s);
    if (Number.isFinite(n) && Number.isInteger(n) && n > 0) return n;
    return null;
  }
  return null;
}

function assertValidUserId(userId: unknown) {
  const parsed = parseUserId(userId);
  if (!parsed) throw new Error(`Invalid userId: ${String(userId)}`);
  return parsed;
}

async function readJsonSafe(res: Response): Promise<any> {
  const text = await res.text().catch(() => '');
  if (!text) return null;
  try {
    return JSON.parse(text);
  } catch {
    // Non-JSON response (e.g. HTML error page)
    return { detail: text };
  }
}

function extractErrorMessage(out: any, res: Response) {
  // FastAPI usually returns {detail: "..."} or {detail: [{loc,msg,type}]}
  const detail = out?.detail;

  if (typeof detail === 'string' && detail.trim()) return detail.trim();

  if (Array.isArray(detail) && detail.length) {
    // Pydantic validation errors
    const first = detail[0];
    const loc = Array.isArray(first?.loc) ? first.loc.join('.') : '';
    const msg = first?.msg || first?.message || 'Validation error';
    return loc ? `${msg} (${loc})` : msg;
  }

  if (typeof out?.message === 'string' && out.message.trim()) return out.message.trim();

  return `Request failed (${res.status})`;
}

async function apiRequest<T>(
  path: string,
  opts?: {
    method?: 'GET' | 'POST' | 'PUT' | 'PATCH' | 'DELETE';
    query?: Record<string, unknown>;
    body?: unknown;
    headers?: Record<string, string>;
    noAuth?: boolean;
  }
): Promise<T> {
  const url = withQuery(joinUrl(API_BASE_URL, path), opts?.query);

  const headers: Record<string, string> = {
    ...(opts?.noAuth ? {} : authHeaders()),
    ...(opts?.headers || {}),
  };

  let body: BodyInit | undefined = undefined;
  if (opts?.body !== undefined) {
    headers['Content-Type'] = headers['Content-Type'] || 'application/json';
    body = JSON.stringify(opts.body);
  }

  const res = await fetch(url, {
    method: opts?.method || 'GET',
    headers,
    body,
  });

  const out = await readJsonSafe(res);

  if (!res.ok) {
    throw new Error(extractErrorMessage(out, res));
  }

  return out as T;
}

// ----------------------------
// Types (match your backend)
// ----------------------------

export type AdminState = {
  is_blacklisted: boolean;
  is_frozen: boolean;
  frozen_until: string | null;
  freeze_owner_only: boolean;
  suspended_until: string | null;
  note: string | null;
};

export type AdminUserRow = {
  id: number;
  username: string;
  role: string;
  created_at: string | null;
  parent_user_id: number | null;
  parent_username: string | null;
  last_ip: string | null;
  is_active: boolean;
  admin_state: AdminState;
};

export type AdminUsersListResponse = AdminUserRow[] | { users: AdminUserRow[] };

export type AdminUserDetails = {
  // backend shape
  user: AdminUserRow;
  admin_state?: AdminState | Record<string, any>;
  entitlements?: any;
  activity?: { sessions: any[]; downloads: any[] };
  payments?: { orders: any[] };

  // compatibility fields (used by some UI pages)
  sessions?: any[];
  downloads?: any[];
  purchase_orders?: any[];
  notes?: string | null;

  // legacy keys used by AdminUserDetails.tsx in this repo
  totals_by_app?: any;
  balances?: any[];
  recent_sessions?: any[];
  recent_downloads?: any[];
  recent_purchase_orders?: any[];
};

// ----------------------------
// Normalizers
// ----------------------------

function normalizeUsersList(out: any): AdminUserRow[] {
  if (Array.isArray(out)) return out;
  if (Array.isArray(out?.users)) return out.users;
  // If someone accidentally uses /users/search here, support it too:
  if (Array.isArray(out?.results)) return out.results;
  return [];
}

function normalizeUserDetails(raw: any): AdminUserDetails {
  // Backend returns:
  // { user: {...}, admin_state: {...}, entitlements: {...}, activity: {sessions, downloads}, payments: {orders} }

  const adminState = raw?.admin_state ?? raw?.user?.admin_state ?? null;

  const baseUser = raw?.user ?? raw;
  const user: AdminUserRow = {
    ...(baseUser || {}),
    // Make sure admin_state is available at user.admin_state for UI components
    admin_state: (baseUser?.admin_state ?? adminState ?? {
      is_blacklisted: false,
      is_frozen: false,
      frozen_until: null,
      freeze_owner_only: false,
      suspended_until: null,
      note: null,
    }) as any,
  };

  const entitlements = raw?.entitlements ?? {
    totals_by_app: raw?.totals_by_app ?? raw?.totals ?? {},
    balances: raw?.balances ?? [],
  };

  // Add alias keys expected by some UI code
  (entitlements as any).totals = (entitlements as any).totals ?? (entitlements as any).totals_by_app ?? {};

  const activity = raw?.activity ?? {
    sessions: raw?.sessions ?? raw?.recent_sessions ?? [],
    downloads: raw?.downloads ?? raw?.recent_downloads ?? [],
  };

  const payments = raw?.payments ?? {
    orders: raw?.purchase_orders ?? raw?.orders ?? raw?.recent_purchase_orders ?? [],
  };

  const totalsByApp = (entitlements as any)?.totals_by_app ?? raw?.totals_by_app ?? (entitlements as any)?.totals ?? {};
  const balances = (entitlements as any)?.balances ?? raw?.balances ?? [];

  const recentSessions = activity?.sessions ?? [];
  const recentDownloads = activity?.downloads ?? [];
  const recentOrders = payments?.orders ?? [];

  return {
    ...raw,
    user,
    admin_state: adminState ?? undefined,
    entitlements,
    activity,
    payments,

    // compatibility mirrors
    sessions: recentSessions,
    downloads: recentDownloads,
    purchase_orders: recentOrders,
    notes: raw?.notes ?? raw?.note ?? null,

    // legacy keys used by this repo's AdminUserDetails.tsx
    totals_by_app: totalsByApp,
    balances: balances,
    recent_sessions: recentSessions,
    recent_downloads: recentDownloads,
    recent_purchase_orders: recentOrders,
  };
}

// ----------------------------
// API functions
// ----------------------------

export async function adminListUsers(args?: {
  scope?: 'all' | 'resellers' | 'customers' | 'staff' | 'reseller_customers';
  reseller_id?: number | null;
  q?: string | null;
  limit?: number;
  offset?: number;
}): Promise<AdminUserRow[]> {
  const out = await apiRequest<AdminUsersListResponse>('/admin/users', {
    method: 'GET',
    query: {
      scope: args?.scope ?? 'all',
      reseller_id: args?.reseller_id ?? undefined,
      q: args?.q ?? undefined,
      limit: args?.limit ?? undefined,
      offset: args?.offset ?? undefined,
    },
  });
  return normalizeUsersList(out);
}

export async function adminSearchUsers(query: string, limit = 25): Promise<AdminUserRow[]> {
  const out = await apiRequest<{ results: AdminUserRow[] }>('/admin/users/search', {
    method: 'GET',
    query: { query, limit },
  });
  return Array.isArray(out?.results) ? out.results : [];
}

/**
 * Accepts number OR string route param.
 * Example: adminGetUserDetails(params.userId)
 */
export async function adminGetUserDetails(userId: unknown): Promise<AdminUserDetails> {
  const id = assertValidUserId(userId);
  const raw = await apiRequest<any>(`/admin/users/${id}`, { method: 'GET' });
  return normalizeUserDetails(raw);
}

export async function adminBanUser(userId: unknown, reason?: string) {
  const id = assertValidUserId(userId);
  return apiRequest<{ ok: boolean; message: string }>(`/admin/users/${id}/ban`, {
    method: 'POST',
    body: { reason: reason || null },
  });
}

export async function adminUnbanUser(userId: unknown) {
  const id = assertValidUserId(userId);
  return apiRequest<{ ok: boolean; message: string }>(`/admin/users/${id}/unban`, {
    method: 'POST',
  });
}

export async function adminFreezeUser(userId: unknown, minutes?: number, reason?: string) {
  const id = assertValidUserId(userId);
  return apiRequest<{ ok: boolean; message: string }>(`/admin/users/${id}/freeze`, {
    method: 'POST',
    body: {
      minutes: typeof minutes === 'number' ? minutes : null,
      reason: reason || null,
    },
  });
}

export async function adminUnfreezeUser(userId: unknown) {
  const id = assertValidUserId(userId);
  return apiRequest<{ ok: boolean; message: string }>(`/admin/users/${id}/unfreeze`, {
    method: 'POST',
  });
}

export async function adminSuspendUser(userId: unknown, minutes: number, reason?: string) {
  const id = assertValidUserId(userId);
  return apiRequest<{ ok: boolean; message: string }>(`/admin/users/${id}/suspend`, {
    method: 'POST',
    body: { minutes, reason: reason || null },
  });
}

export async function adminUnsuspendUser(userId: unknown) {
  const id = assertValidUserId(userId);
  return apiRequest<{ ok: boolean; message: string }>(`/admin/users/${id}/unsuspend`, {
    method: 'POST',
  });
}

export async function adminSetUserNote(userId: unknown, note: string) {
  const id = assertValidUserId(userId);
  return apiRequest<{ ok: boolean; message: string }>(`/admin/users/${id}/note`, {
    method: 'POST',
    body: { note },
  });
}

export async function adminGiveTime(userId: unknown, app_code: string, minutes: number, reason?: string) {
  const id = assertValidUserId(userId);
  return apiRequest<{ ok: boolean; message: string }>(`/admin/users/${id}/give-time`, {
    method: 'POST',
    body: { app_code, minutes, reason: reason || null },
  });
}

export async function adminGiveTimeAll(app_code: string, minutes: number, reason?: string) {
  return apiRequest<{ ok: boolean; message: string }>(`/admin/users/give-time-all`, {
    method: 'POST',
    body: { app_code, minutes, reason: reason || null },
  });
}

// Optional (based on your backend routes)
export type ResellerRow = {
  id: number;
  username: string;
  key_quota: number;
  parent_user_id: number | null;
  is_active: boolean;
  created_at: string | null;
};

export async function adminListResellers(): Promise<ResellerRow[]> {
  const out = await apiRequest<{ resellers: ResellerRow[] }>('/admin/resellers', { method: 'GET' });
  return Array.isArray(out?.resellers) ? out.resellers : [];
}

export async function adminCreateReseller(payload: { username: string; password: string; key_quota: number }) {
  return apiRequest<any>('/admin/resellers', {
    method: 'POST',
    body: payload,
  });
}


// --- HWID tools (per-product) ---

export type HwidHistoryEvent = {
  id?: number | string;
  app_code?: string;
  created_at?: string;
  action?: string;
  actor_role?: string;
  actor?: string;
  reason?: string;
  before_hwid?: string | null;
  after_hwid?: string | null;
  before_remaining?: number | null;
  after_remaining?: number | null;
};

export async function adminSetUserHwid(userId: unknown, app_code: string, hwid: string | null, reason?: string) {
  const id = assertValidUserId(userId);
  return apiRequest<{ ok: boolean; message?: string }>(`/admin/users/${id}/hwid/set`, {
    method: 'POST',
    body: { app_code, hwid, reason: reason || null },
  });
}

export async function adminSetUserHwidResets(userId: unknown, app_code: string, remaining: number, reason?: string) {
  const id = assertValidUserId(userId);
  return apiRequest<{ ok: boolean; message?: string }>(`/admin/users/${id}/hwid-resets`, {
    method: 'PUT',
    body: { app_code, remaining, reason: reason || null },
  });
}

export async function adminGetUserHwidHistory(userId: unknown, app_code?: string): Promise<HwidHistoryEvent[]> {
  const id = assertValidUserId(userId);
  return apiRequest<HwidHistoryEvent[]>(`/admin/users/${id}/hwid-resets/history`, {
    method: 'GET',
    query: { app_code },
  });
}
