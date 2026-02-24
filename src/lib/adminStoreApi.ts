import { API_BASE_URL } from './config';
import { getAuth } from './auth';

function joinUrl(base: string, path: string) {
  const b = base.replace(/\/$/, '');
  if (!path) return b;
  if (/^https?:\/\//i.test(path)) return path;
  if (path.startsWith('/')) return `${b}${path}`;
  return `${b}/${path}`;
}

function authHeaders(): Record<string, string> {
  const a = getAuth();
  if (!a?.token) throw new Error('Not authenticated');
  return { Authorization: `Bearer ${a.token}` };
}

export type AdminPlan = {
  plan_id: string;
  app_code: string;
  duration_unit: string;
  duration_value?: number | null;
  prefix: string;
  amount: string;
  currency: string;
};

export async function adminGetPlanSpecs(): Promise<AdminPlan[]> {
  const url = joinUrl(API_BASE_URL, '/admin/store/plan-specs');
  const res = await fetch(url, { headers: authHeaders() });
  if (!res.ok) throw new Error(`Failed to load plan specs (${res.status})`);
  const out = await res.json();
  return Array.isArray(out?.plans) ? out.plans : [];
}

export async function adminUpsertPrice(payload: { plan_id: string; amount: string; currency: string; is_active: boolean }) {
  const url = joinUrl(API_BASE_URL, '/admin/store/prices/upsert');
  const res = await fetch(url, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', ...authHeaders() },
    body: JSON.stringify(payload)
  });
  if (!res.ok) {
    const out = await res.json().catch(() => ({}));
    throw new Error(out?.detail || `Failed to update price (${res.status})`);
  }
  return res.json();
}

export async function adminGetContent(key: 'tos' | 'privacy' | 'reseller_tiers') {
  const url = joinUrl(API_BASE_URL, `/admin/store/content/${encodeURIComponent(key)}`);
  const res = await fetch(url, { headers: authHeaders() });
  if (!res.ok) throw new Error(`Failed to load content (${res.status})`);
  return res.json();
}

export async function adminSetContent(key: 'tos' | 'privacy' | 'reseller_tiers', body: string) {
  const url = joinUrl(API_BASE_URL, `/admin/store/content/${encodeURIComponent(key)}`);
  const res = await fetch(url, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', ...authHeaders() },
    body: JSON.stringify({ body, content_type: 'text/plain' })
  });
  if (!res.ok) {
    const out = await res.json().catch(() => ({}));
    throw new Error(out?.detail || `Failed to update content (${res.status})`);
  }
  return res.json();
}

export type AdminMediaItem = { id: number; type: 'image' | 'video'; url: string; filename: string; order: number; featured: boolean };

export async function adminListMedia(appCode: string): Promise<AdminMediaItem[]> {
  const url = joinUrl(API_BASE_URL, `/admin/store/products/${encodeURIComponent(appCode)}/media`);
  const res = await fetch(url, { headers: authHeaders() });
  if (!res.ok) throw new Error(`Failed to load media (${res.status})`);
  const out = await res.json();
  const media = Array.isArray(out?.media) ? out.media : [];
  return media
    .filter((m: any) => m && typeof m.id === 'number' && (m.type === 'image' || m.type === 'video'))
    .map((m: any) => ({
      id: m.id,
      type: m.type,
      url: joinUrl(API_BASE_URL, String(m.url)),
      filename: String(m.filename ?? ''),
      order: Number(m.order ?? 0),
      featured: !!m.featured
    }));
}

export async function adminUploadMedia(appCode: string, opts: { video?: File | null; images?: File[]; featured?: 'video' | 'first' | 'none' }) {
  const url = joinUrl(API_BASE_URL, `/admin/store/products/${encodeURIComponent(appCode)}/media`);
  const fd = new FormData();
  if (opts.video) fd.append('video', opts.video);
  (opts.images || []).forEach((f) => fd.append('images', f));
  fd.append('featured', opts.featured || 'first');

  const res = await fetch(url, { method: 'POST', headers: authHeaders(), body: fd });
  if (!res.ok) {
    const out = await res.json().catch(() => ({}));
    throw new Error(out?.detail || `Upload failed (${res.status})`);
  }
  return res.json();
}

export async function adminSetMediaOrder(appCode: string, order: number[], featured_id?: number | null) {
  const url = joinUrl(API_BASE_URL, `/admin/store/products/${encodeURIComponent(appCode)}/media/order`);
  const res = await fetch(url, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', ...authHeaders() },
    body: JSON.stringify({ order, featured_id: featured_id ?? null })
  });
  if (!res.ok) {
    const out = await res.json().catch(() => ({}));
    throw new Error(out?.detail || `Failed to reorder (${res.status})`);
  }
  return res.json();
}

export async function adminDeleteMedia(appCode: string, mediaId: number) {
  const url = joinUrl(API_BASE_URL, `/admin/store/products/${encodeURIComponent(appCode)}/media/${mediaId}`);
  const res = await fetch(url, { method: 'DELETE', headers: authHeaders() });
  if (!res.ok) {
    const out = await res.json().catch(() => ({}));
    throw new Error(out?.detail || `Delete failed (${res.status})`);
  }
  return res.json();
}

export type AdminProductMeta = { app_code: string; name: string; tagline: string; description: string; status: string };

export async function adminGetProductMeta(appCode: string): Promise<AdminProductMeta> {
  const url = joinUrl(API_BASE_URL, `/admin/store/products/${encodeURIComponent(appCode)}/meta`);
  const res = await fetch(url, { headers: authHeaders() });
  if (!res.ok) throw new Error(`Failed to load product meta (${res.status})`);
  return res.json();
}

export async function adminSetProductMeta(appCode: string, payload: Partial<AdminProductMeta>) {
  const url = joinUrl(API_BASE_URL, `/admin/store/products/${encodeURIComponent(appCode)}/meta`);
  const res = await fetch(url, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', ...authHeaders() },
    body: JSON.stringify(payload)
  });
  if (!res.ok) {
    const out = await res.json().catch(() => ({}));
    throw new Error(out?.detail || `Failed to update product meta (${res.status})`);
  }
  return res.json();
}
