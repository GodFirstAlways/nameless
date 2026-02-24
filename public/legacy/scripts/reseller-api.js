// reseller-api.js - Reseller API Service Layer
// Handles all API calls for reseller dashboard

class ResellerAPI {
  constructor(baseURL) {
    this.baseURL = baseURL || window.API_BASE_URL || 'http://localhost:8000';
  }

  getAuthHeaders() {
    const token = localStorage.getItem('authToken') || sessionStorage.getItem('authToken');
    const headers = {
      'Content-Type': 'application/json'
    };
    if (token) {
      headers['Authorization'] = `Bearer ${token}`;
    }
    return headers;
  }

  // Shared seconds -> human formatter (kept local to API mapping)
  formatSeconds(seconds, unlimited) {
    if (unlimited) return 'lifetime';
    const s = Number(seconds || 0);
    if (!s || s <= 0) return '0m';
    const days = Math.floor(s / 86400);
    const hours = Math.floor((s % 86400) / 3600);
    const mins = Math.floor((s % 3600) / 60);
    if (days > 0) return `${days}d ${hours}h`;
    if (hours > 0) return `${hours}h ${mins}m`;
    return `${mins}m`;
  }

  async handleResponse(response) {
    if (!response.ok) {
      const error = await response.json().catch(() => ({}));
      throw new Error(error.detail || error.message || `HTTP ${response.status}: ${response.statusText}`);
    }
    return response.json();
  }

  async requestJSON(method, path, bodyObj) {
    const url = `${this.baseURL}${path}`;
    const doFetch = async () => {
      const response = await fetch(url, {
        method,
        headers: this.getAuthHeaders(),
        body: bodyObj !== undefined ? JSON.stringify(bodyObj) : undefined,
      });
      return await this.handleResponse(response);
    };

    if (method === 'GET' && typeof window !== 'undefined' && typeof window.__apiCacheGet === 'function') {
      return await window.__apiCacheGet(url, doFetch);
    }

    if (method !== 'GET' && typeof window !== 'undefined' && typeof window.__apiCacheClear === 'function') {
      window.__apiCacheClear();
    }

    return await doFetch();
  }

  // Get reseller whoami (products + quota + stock)
  async getWhoami() {
    return await this.requestJSON('GET', '/reseller/whoami');
  }
  // Get reseller statistics
  async getStats() {
    // Server returns: { keys_generated, keys_redeemed, ... }
    // Keep the raw fields so the dashboard can use them directly.
    return await this.requestJSON('GET', '/reseller/stats');
  }

  // Get recent activity
  async getActivity() {
    const rows = await this.requestJSON('GET', '/reseller/activity');

    // Backend returns an array of redemptions.
    // UI expects: { activities: [{ description, timestamp }] }
    const activities = (rows || []).map(r => {
      const userLabel = r.username ? `${r.username} (ID ${r.user_id})` : `User ${r.user_id}`;
      const app = (r.app_code || '').toLowerCase();
      const credited = this.formatSeconds(r.credited_seconds, r.unlimited);
      const keyHint = r.key_last8 ? ` • key ...${r.key_last8}` : '';
      return {
        timestamp: r.redeemed_at,
        description: `${userLabel} redeemed ${app} (${credited})${keyHint}`
      };
    });

    return { activities };
  }

  // Get stock information
  async getStock() {
    const [data, who] = await Promise.all([
      this.requestJSON('GET', '/reseller/stock'),
      // whoami is optional; if server doesn't support it, fall back gracefully
      this.getWhoami().catch(() => null),
    ]);

    // Transform backend shape -> UI-friendly shape expected by reseller-dashboard.js
    // Backend: { unused_keys, apps:[{app_code,total_quantity}], stock:[{app_code,duration_unit,duration_value,quantity}] }
    const knownProducts = [
      { id: 'nochancext', name: 'NoChance External' },
      { id: 'funext', name: 'Fun External' },
      { id: 'rebel', name: 'Rebel' },
      { id: 'universal', name: 'Universal Spoofer' }
    ];

    const totals = {};
    (data.apps || []).forEach(a => { totals[a.app_code] = a.total_quantity || 0; });

    // Build per-app limits the UI expects
    const byApp = {};
    (data.stock || []).forEach(line => {
      const app = line.app_code;
      if (!byApp[app]) byApp[app] = {};
      const unit = String(line.duration_unit || '').toLowerCase();
      const val = line.duration_value == null ? null : Number(line.duration_value);

      let key = null;
      if (unit === 'lifetime') key = 'lifetime';
      else if (unit === 'day' && val === 1) key = '1day';
      else if (unit === 'week' && val === 1) key = '1week';
      else if (unit === 'month' && val === 1) key = '1month';
      else if (unit === 'month' && val === 3) key = '3months';
      else if (unit && val) key = `${val}${unit}`; // fallback

      if (!key) return;
      const qty = Number(line.quantity || 0);
      const tot = Number(line.total_quantity != null ? line.total_quantity : qty);
      const used = Number(line.used != null ? line.used : Math.max(tot - qty, 0));

      byApp[app][key] = {
        available: qty,
        used: used,
        total: tot
      };
    });

    // Optional HWID info by product (if server provides it)
    const hwidByApp = (who && (who.hwid_by_app || who.hwid_by_product || who.hwid_bindings_by_app)) || {};
    const tokensByApp = (who && (who.hwid_resets_by_app || who.hwid_tokens_by_app)) || {};

    const products = knownProducts.map(p => {
      const unlocked = (totals[p.id] || 0) > 0;
      const limits = byApp[p.id] || {};
      // Show HWID tokens on the product card if available
      const tokenObj = tokensByApp[p.id];
      const tokenRemaining = tokenObj && typeof tokenObj === 'object' ? (tokenObj.remaining ?? tokenObj.balance ?? tokenObj.total ?? 0) : (tokenObj ?? 0);
      limits.compensation = Number(tokenRemaining || 0) || 0;
      return {
        product_id: p.id,
        product_name: p.name,
        unlocked: unlocked,
        limits: limits,
        hwid: hwidByApp[p.id] || null
      };
    });

    return {
      ...data,
      products
    };
  }

  // Generate keys (new format: prefix, duration_unit, duration_value)
  async generateKeys(productId, quantity, durationCode) {
    // productId is the prefix/app code (e.g. 'nochancext')
    // durationCode is one of: 1day, 1week, 1month, 3months, lifetime
    const mapDuration = (code) => {
      switch (code) {
        case '1day': return { unit: 'day', value: 1 };
        case '1week': return { unit: 'week', value: 1 };
        case '1month': return { unit: 'month', value: 1 };
        case '3months': return { unit: 'month', value: 3 };
        case 'lifetime': return { unit: 'lifetime', value: null };
        default: return null;
      }
    };

    const mapped = mapDuration(durationCode);
    if (!mapped) {
      throw new Error('Invalid duration selected');
    }

    const qty = Number(quantity || 1);
    if (!qty || qty < 1) {
      throw new Error('Quantity must be at least 1');
    }

    const keys = [];

    // Note: backend currently generates 1 key per request.
    // Generating many keys quickly may hit server rate limits (20/minute).
    for (let i = 0; i < qty; i++) {
      const data = await this.requestJSON('POST', '/reseller/keys/generate', {
        prefix: productId,
        duration_unit: mapped.unit,
        duration_value: mapped.value
      });
      // Backend returns KeyOut { code: '...' }
      keys.push(data.code || data.key || data.license_key || '');
    }

    return { keys };
  }
  // Get all users under this reseller
  async getUsers() {
    const rows = await this.requestJSON('GET', '/reseller/users/summary');

    // Backend returns: [{ id, username, is_active, hwid, products:[{app_code, seconds, unlimited, my_seconds, my_unlimited, my_frozen_seconds, my_frozen_unlimited}] }]
    // UI expects: { users: [{ user_id, username, products, balances, hwid, status }] }
    const users = (rows || []).map(u => {
      const balances = Array.isArray(u.products) ? u.products : [];
      return {
        user_id: u.id,
        username: u.username,
        products: balances.map(b => b.app_code),
        balances: balances,
        hwid: u.hwid,
        status: u.is_active ? 'active' : 'banned'
      };
    });

    return { users };
  }

  // Create a new customer
  async createCustomer(username, password) {
    return await this.requestJSON('POST', '/reseller/customers', {
      username: username,
      password: password
    });
  }

  // Ban a user
  async banUser(userId) {
    return await this.requestJSON('POST', `/reseller/users/${userId}/ban`);
  }

  // Unban a user
  async unbanUser(userId) {
    return await this.requestJSON('POST', `/reseller/users/${userId}/unban`);
  }

  // Freeze a user
  async freezeUser(userId, appCode = null) {
    // Optional appCode freezes ONLY buckets sold by this reseller for that product.
    // If omitted, freezes this reseller's buckets across all products.
    const qs = appCode ? `?app_code=${encodeURIComponent(appCode)}` : '';
    return await this.requestJSON('POST', `/reseller/users/${userId}/freeze${qs}`);
  }

  // Unfreeze a user
  async unfreezeUser(userId, appCode = null) {
    const qs = appCode ? `?app_code=${encodeURIComponent(appCode)}` : '';
    return await this.requestJSON('POST', `/reseller/users/${userId}/unfreeze${qs}`);
  }

  // Clear customer's HWID (consumes a reseller HWID reset token on the server).
  // NOTE: Current backend requires app_code (which token bucket to charge).
  async clearHwid(userId, appCode) {
    const code = String(appCode || '').trim();
    if (!code) throw new Error('Product code required to clear HWID');
    return await this.requestJSON('POST', `/reseller/users/${userId}/hwid/reset`, { app_code: code });
  }

  // Extend time for user (app_code + add_seconds)
  async extendUser(userId, appCode, addSeconds) {
    return await this.requestJSON('POST', `/reseller/users/${userId}/extend`, {
      app_code: appCode,
      add_seconds: addSeconds
    });
  }

  // Back-compat name used by reseller-dashboard.js
  async addTime(userId, appCode, minutes /* number */, _useCompensation /* bool */) {
    const mins = Number(minutes || 0);
    if (!mins || mins <= 0) throw new Error('Invalid duration');
    return await this.extendUser(userId, appCode, Math.floor(mins * 60));
  }

  // Get product updates
    async getUpdates(appCode = null) {
    const qs = appCode ? `?app_code=${encodeURIComponent(appCode)}` : '';
    try {
      const data = await this.requestJSON('GET', `/public/announcements${qs}`);
      const rows = (data && (data.announcements || data.items)) ? (data.announcements || data.items) : [];
      const updates = (rows || []).map(a => ({
        title: a.title || `${a.app_code || ''} ${a.version || ''}`.trim(),
        product_id: a.app_code || '',
        app_code: a.app_code || '',
        version: a.version || '',
        status_tag: a.status_tag || a.status || '',
        created_at: a.created_at || a.updated_at || '',
        content: a.body || a.content || a.message || ''
      }));
      return { updates };
    } catch (_) {
      const rows = await this.requestJSON('GET', '/updates');
      const updates = (rows || []).map(r => ({
        title: r.tag ? `${r.app_code} • ${r.tag}` : `${r.app_code} v${r.version}`,
        product_id: r.app_code,
        app_code: r.app_code,
        version: r.version,
        status_tag: r.tag || '',
        created_at: r.created_at,
        content: r.notes || r.description || ''
      }));
      return { updates };
    }
  }
}

window.ResellerAPI = ResellerAPI;
