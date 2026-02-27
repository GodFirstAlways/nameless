type CacheEntry<T> = {
  value: T;
  savedAt: number; // epoch ms
  ttlMs: number;
  etag?: string;
};

function nowMs() {
  return Date.now();
}

export function loadCache<T>(key: string): CacheEntry<T> | null {
  try {
    const raw = localStorage.getItem(key);
    if (!raw) return null;
    const parsed = JSON.parse(raw) as CacheEntry<T>;
    if (!parsed || typeof parsed.savedAt !== 'number' || typeof parsed.ttlMs !== 'number') return null;

    const age = nowMs() - parsed.savedAt;
    if (age > parsed.ttlMs) {
      localStorage.removeItem(key);
      return null;
    }
    return parsed;
  } catch {
    return null;
  }
}

export function saveCache<T>(key: string, value: T, ttlMs: number, etag?: string) {
  try {
    const entry: CacheEntry<T> = { value, savedAt: nowMs(), ttlMs, ...(etag ? { etag } : {}) };
    localStorage.setItem(key, JSON.stringify(entry));
  } catch {
    // ignore quota / JSON failures
  }
}

export function clearCache(key: string) {
  try {
    localStorage.removeItem(key);
  } catch {
    // ignore
  }
}
