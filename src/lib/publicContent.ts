import { API_BASE_URL } from './config';
import { loadCache, saveCache } from './cache';

type MemoryCacheEntry<T> = { value: T; savedAt: number; ttlMs: number; etag?: string };

const memoryCache = new Map<string, MemoryCacheEntry<any>>();

function nowMs() {
  return Date.now();
}

function loadMemoryCache<T>(key: string): MemoryCacheEntry<T> | null {
  const entry = memoryCache.get(key);
  if (!entry) return null;
  if (nowMs() - entry.savedAt > entry.ttlMs) {
    memoryCache.delete(key);
    return null;
  }
  return entry as MemoryCacheEntry<T>;
}

function saveMemoryCache<T>(key: string, value: T, ttlMs: number, etag?: string) {
  memoryCache.set(key, { value, savedAt: nowMs(), ttlMs, ...(etag ? { etag } : {}) });
}


function joinUrl(base: string, path: string) {
  const b = base.replace(/\/$/, '');
  if (!path) return b;
  if (/^https?:\/\//i.test(path)) return path;
  if (path.startsWith('/')) return `${b}${path}`;
  return `${b}/${path}`;
}

async function fetchJson(url: string, headers: Record<string, string> = {}) {
  const res = await fetch(url, { method: 'GET', headers });
  return res;
}

export async function fetchPublicTextWithCache(
  cacheKey: string,
  endpointPath: string,
  ttlMs: number
): Promise<{ text: string; source: 'cache' | 'network' }> {
  const cached = loadCache<string>(cacheKey);
  if (cached?.value) {
    // Stale-while-revalidate: return cache immediately; caller may still call refresh if desired.
    return { text: cached.value, source: 'cache' };
  }

  const url = joinUrl(API_BASE_URL, endpointPath);
  const res = await fetch(url, { method: 'GET' });
  if (!res.ok) throw new Error(`Failed to load content (${res.status})`);
  const text = await res.text();
  const etag = res.headers.get('ETag') || undefined;
  saveCache(cacheKey, text, ttlMs, etag);
  return { text, source: 'network' };
}

export async function refreshPublicText(
  cacheKey: string,
  endpointPath: string,
  ttlMs: number
): Promise<string | null> {
  const cached = loadCache<string>(cacheKey);
  const headers: Record<string, string> = {};
  if (cached?.etag) headers['If-None-Match'] = cached.etag;

  const url = joinUrl(API_BASE_URL, endpointPath);
  const res = await fetch(url, { method: 'GET', headers });

  if (res.status === 304 && cached?.value) {
    // still valid
    saveCache(cacheKey, cached.value, ttlMs, cached.etag);
    return cached.value;
  }

  if (!res.ok) return null;
  const text = await res.text();
  const etag = res.headers.get('ETag') || undefined;
  saveCache(cacheKey, text, ttlMs, etag);
  return text;
}

// Memory-only cache (resets on full page reload). Useful for legal pages where you
// don't want content persisted in localStorage, but still want fast in-app navigation.
export async function fetchPublicTextWithMemoryCache(
  cacheKey: string,
  endpointPath: string,
  ttlMs: number
): Promise<{ text: string; source: 'cache' | 'network' }> {
  const cached = loadMemoryCache<string>(cacheKey);
  if (cached?.value) {
    return { text: cached.value, source: 'cache' };
  }

  const url = joinUrl(API_BASE_URL, endpointPath);
  const res = await fetch(url, { method: 'GET' });
  if (!res.ok) throw new Error(`Failed to load content (${res.status})`);
  const text = await res.text();
  const etag = res.headers.get('ETag') || undefined;
  saveMemoryCache(cacheKey, text, ttlMs, etag);
  return { text, source: 'network' };
}

export async function refreshPublicTextMemory(
  cacheKey: string,
  endpointPath: string,
  ttlMs: number
): Promise<string | null> {
  const cached = loadMemoryCache<string>(cacheKey);
  const headers: Record<string, string> = {};
  if (cached?.etag) headers['If-None-Match'] = cached.etag;

  const url = joinUrl(API_BASE_URL, endpointPath);
  const res = await fetch(url, { method: 'GET', headers });

  if (res.status === 304 && cached?.value) {
    saveMemoryCache(cacheKey, cached.value, ttlMs, cached.etag);
    return cached.value;
  }

  if (!res.ok) return null;
  const text = await res.text();
  const etag = res.headers.get('ETag') || undefined;
  saveMemoryCache(cacheKey, text, ttlMs, etag);
  return text;
}


export type PublicMediaItem = { id?: number; type: 'image' | 'video'; url: string; featured?: boolean; order?: number };

export async function fetchProductImagesWithCache(appCode: string, ttlMs: number) {
  // Canonical endpoint is /public/products/{app_code}/images.
  // If it returns 200 with an empty list, we stop there (do NOT spam fallback endpoints).
  const cacheKey = `product_images:${appCode}`;
  const cached = loadCache<string[]>(cacheKey);

  const url = joinUrl(API_BASE_URL, `/public/products/${encodeURIComponent(appCode)}/images`);
  const headers: Record<string, string> = {};
  if (cached?.etag) headers['If-None-Match'] = cached.etag;

  const res = await fetchJson(url, headers);
  if (res.status === 304 && cached?.value) {
    saveCache(cacheKey, cached.value, ttlMs, cached.etag);
    return cached.value.map((u) => joinUrl(API_BASE_URL, u));
  }

  if (res.ok) {
    const out = await res.json();
    const list: string[] = Array.isArray(out) ? out : Array.isArray(out?.images) ? out.images : [];
    const etag = res.headers.get('ETag') || undefined;
    saveCache(cacheKey, list, ttlMs, etag);
    // Return absolute URLs; list may be empty (caller can fallback to bundled images).
    return list.map((u) => joinUrl(API_BASE_URL, u));
  }

  // fallback to cache (if any)
  return cached?.value ? cached.value.map((u) => joinUrl(API_BASE_URL, u)) : null;
}

export async function fetchProductMediaWithCache(appCode: string, ttlMs: number): Promise<PublicMediaItem[] | null> {
  const cacheKey = `product_media:${appCode}`;
  const cached = loadCache<PublicMediaItem[]>(cacheKey);

  const url = joinUrl(API_BASE_URL, `/public/products/${encodeURIComponent(appCode)}/media`);
  const headers: Record<string, string> = {};
  if (cached?.etag) headers['If-None-Match'] = cached.etag;

  const res = await fetchJson(url, headers);
  if (res.status === 304 && cached?.value) {
    saveCache(cacheKey, cached.value, ttlMs, cached.etag);
    return cached.value.map((m) => ({ ...m, url: joinUrl(API_BASE_URL, m.url) }));
  }
  if (!res.ok) {
    return cached?.value ? cached.value.map((m) => ({ ...m, url: joinUrl(API_BASE_URL, m.url) })) : null;
  }

  const out = await res.json();
  const media: any[] = Array.isArray(out?.media) ? out.media : Array.isArray(out) ? out : [];
  const list: PublicMediaItem[] = media
    .filter((m) => m && (m.type === 'image' || m.type === 'video') && typeof m.url === 'string')
    .map((m) => ({
      id: typeof m.id === 'number' ? m.id : undefined,
      type: m.type,
      url: String(m.url),
      featured: !!m.featured,
      order: typeof m.order === 'number' ? m.order : undefined
    }));

  const etag = res.headers.get('ETag') || undefined;
  saveCache(cacheKey, list, ttlMs, etag);
  return list.map((m) => ({ ...m, url: joinUrl(API_BASE_URL, m.url) }));
}

export type ProductMeta = { app_code: string; name: string; tagline: string; description: string; status: string };

export async function fetchProductMetaWithCache(appCode: string, ttlMs: number): Promise<ProductMeta | null> {
  const cacheKey = `product_meta:${appCode}`;
  const cached = loadCache<ProductMeta>(cacheKey);

  const url = joinUrl(API_BASE_URL, `/public/products/${encodeURIComponent(appCode)}/meta`);
  const headers: Record<string, string> = {};
  if (cached?.etag) headers['If-None-Match'] = cached.etag;

  const res = await fetchJson(url, headers);
  if (res.status === 304 && cached?.value) {
    saveCache(cacheKey, cached.value, ttlMs, cached.etag);
    return cached.value;
  }
  if (!res.ok) return cached?.value ?? null;

  const out = await res.json();
  if (!out || typeof out !== 'object') return cached?.value ?? null;

  const meta: ProductMeta = {
    app_code: String((out as any).app_code ?? appCode),
    name: String((out as any).name ?? ''),
    tagline: String((out as any).tagline ?? ''),
    description: String((out as any).description ?? ''),
    status: String((out as any).status ?? 'available')
  };

  const etag = res.headers.get('ETag') || undefined;
  saveCache(cacheKey, meta, ttlMs, etag);
  return meta;
}


export type PlanPriceMap = { currency: string; prices: Record<string, number> };

export async function fetchPlanPricesWithCache(appCode: string, ttlMs: number): Promise<PlanPriceMap | null> {
  const cacheKey = `plan_prices:${appCode}`;
  const cached = loadCache<PlanPriceMap>(cacheKey);

  const endpointCandidates = [`/public/products/${encodeURIComponent(appCode)}/pricing`];

  const headers: Record<string, string> = {};
  if (cached?.etag) headers['If-None-Match'] = cached.etag;

  for (const path of endpointCandidates) {
    try {
      const url = joinUrl(API_BASE_URL, path);
      const res = await fetchJson(url, cached?.etag ? headers : {});
      if (res.status === 304 && cached?.value) {
        saveCache(cacheKey, cached.value, ttlMs, cached.etag);
        return cached.value;
      }
      if (!res.ok) continue;

      const out = await res.json();
      // Accept multiple shapes
      // 1) {currency, prices:{plan_id: number}}
      if (out && typeof out === 'object' && out.currency && out.prices && typeof out.prices === 'object') {
        const currency = String(out.currency);
        const prices: Record<string, number> = {};
        for (const [k, v] of Object.entries(out.prices)) {
          const n = Number(v);
          if (!Number.isFinite(n)) continue;
          prices[String(k)] = n;
        }
        if (Object.keys(prices).length) {
          const value = { currency, prices };
          const etag = res.headers.get('ETag') || undefined;
          saveCache(cacheKey, value, ttlMs, etag);
          return value;
        }
      }

      // 2) {plans:[{id, price, currency}]}
      if (out && typeof out === 'object' && Array.isArray(out.plans)) {
        const prices: Record<string, number> = {};
        let currency = 'USD';
        for (const p of out.plans) {
          if (!p?.id) continue;
          const n = Number(p.price ?? p.amount ?? p.value);
          if (!Number.isFinite(n)) continue;
          prices[String(p.id)] = n;
          if (p.currency) currency = String(p.currency);
        }
        if (Object.keys(prices).length) {
          const value = { currency, prices };
          const etag = res.headers.get('ETag') || undefined;
          saveCache(cacheKey, value, ttlMs, etag);
          return value;
        }
      }

      // 3) [{id, price, currency}]
      if (Array.isArray(out)) {
        const prices: Record<string, number> = {};
        let currency = 'USD';
        for (const p of out) {
          if (!p?.id) continue;
          const n = Number(p.price ?? p.amount ?? p.value);
          if (!Number.isFinite(n)) continue;
          prices[String(p.id)] = n;
          if (p.currency) currency = String(p.currency);
        }
        if (Object.keys(prices).length) {
          const value = { currency, prices };
          const etag = res.headers.get('ETag') || undefined;
          saveCache(cacheKey, value, ttlMs, etag);
          return value;
        }
      }
    } catch {
      // try next
    }
  }

  return cached?.value || null;
}

export function formatMoney(currency: string, amount: number) {
  // Use Intl; fallback to basic formatting
  try {
    return new Intl.NumberFormat(undefined, {
      style: 'currency',
      currency,
      minimumFractionDigits: 2,
      maximumFractionDigits: 2
    }).format(amount);
  } catch {
    return `${currency} ${amount.toFixed(2)}`;
  }
}
