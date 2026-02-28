// customer-api.js - Customer API Service Layer
// Handles all API calls for customer dashboard

class CustomerAPI {
  constructor(baseURL) {
    // Allow the React app to set a global API base url (see window.API_BASE_URL)
    this.baseURL = baseURL || (window.API_BASE_URL || 'http://localhost:8000');
  }

  getAuthHeaders() {
    const token = localStorage.getItem('authToken') || sessionStorage.getItem('authToken');
    return {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${token}`
    };
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

    const upper = String(method || '').toUpperCase();
    if (upper === 'GET' && typeof window !== 'undefined' && typeof window.__apiCacheGet === 'function') {
      return await window.__apiCacheGet(url, doFetch);
    }
    if (upper !== 'GET' && typeof window !== 'undefined' && typeof window.__apiCacheClear === 'function') {
      window.__apiCacheClear();
    }
    return await doFetch();
  }

  // Get customer account information
  async getAccountInfo() {
    return await this.requestJSON('GET', '/customer/account');
  }  // Get time balances
  async getTimeBalances() {
    const rows = await this.requestJSON('GET', '/customer/time-balances');

    // Backend returns: [{ app_code, balance_seconds, unlimited }]
    // UI expects: { balances: [{ application_id, remaining_minutes }] }
    const balances = (rows || []).map(r => {
      const unlimited = !!r.unlimited;
      const seconds = Number(r.balance_seconds || 0);
      const minutes = unlimited ? 99999999 : Math.floor(seconds / 60);
      return {
        application_id: r.app_code,
        remaining_minutes: minutes,
        unlimited: unlimited
      };
    });

    return { balances };
  }

  // Get available downloads
  async getDownloads() {
    // IMPORTANT:
    // Use the version-aware endpoint so the customer dashboard lists only
    // PRODUCTS with published releases, instead of listing every raw Artifact.
    // This prevents internal modules (DLLs uploaded as artifacts) from showing
    // up on the customer downloads dashboard.
    const data = await this.requestJSON('GET', '/customer/downloads-v2?include_all_versions=true');
    const rows = (data && data.products) ? data.products : [];

    // Backend returns: { products: [{ app_code, name, latest_version, download_url, releases: [...] }] }
    // UI expects: { products: [{ product_id (artifact id), name, version, download_url, has_access, versions: [...] }] }
    const products = (rows || []).map(p => {
      const releases = Array.isArray(p.releases) ? p.releases : [];
      const latest = releases.find(r => r && r.is_latest) || releases[0] || null;
      const latestArtifactId = latest ? String(latest.artifact_id) : null;

      return {
        // Keep tracking working: /customer/downloads/{productId}/track expects an Artifact ID.
        product_id: latestArtifactId || String(p.app_code || ''),
        id: latestArtifactId || String(p.app_code || ''),
        app_code: p.app_code,
        name: p.name || p.app_code,
        version: p.latest_version || (latest ? latest.version : '1.0.0'),
        description: p.description || '',
        image_url: '',
        download_url: p.download_url || (latest ? latest.download_url : ''),
        has_access: !!p.has_access,
        versions: releases.map(r => ({
          version: r.version,
          status: r.tag || 'legacy',
          notes: r.notes || '',
          release_date: r.created_at,
          is_latest: !!r.is_latest,
          download_url: r.download_url,
          artifact_id: r.artifact_id,
          release_id: r.release_id
        }))
      };
    });

    return { products };
  }

  // Track a download
  async trackDownload(productId) {
    return await this.requestJSON('POST', `/customer/downloads/${productId}/track`);
  }

  // Get products available for HWID reset
  async getHwidProducts() {
    const data = await this.requestJSON('GET', '/customer/hwid/products');

    // Backend returns: { hwid, products: [{ app_code, balance_seconds, unlimited, has_time }] }
    // UI expects product_id + cooldown fields
    const products = (data.products || []).map(p => ({
      product_id: p.app_code,
      has_time: !!p.has_time,
      unlimited: !!p.unlimited,
      balance_seconds: Number(p.balance_seconds || 0),
      last_reset: null,
      cooldown_hours: 0,
      bound: !!data.hwid,
      current_hwid: data.hwid || null
    }));

    return { hwid: data.hwid || null, products };
  }

  // Reset HWID for a product
  async resetHwid(appCode = null) {
    // Some backends ignore app_code, but sending it keeps the API future-proof.
    const body = appCode ? { app_code: appCode } : undefined;
    return await this.requestJSON('POST', '/customer/hwid/reset', body);
  }

  // Redeem a license key (NOTE: backend expects "code" not "license_key")
  async redeemKey(licenseKey) {
    return await this.requestJSON('POST', '/customer/redeem', { code: licenseKey });
  }

  // Get product updates
    async getUpdates(appCode = null) {
    // Prefer server-managed announcements (admin announcement manager).
    // Fallback to /updates (release notes) if announcements are not available yet.
    const qs = appCode ? `?app_code=${encodeURIComponent(appCode)}` : '';
    try {
      const data = await this.requestJSON('GET', `/public/announcements${qs}`);
      const rows = (data && (data.announcements || data.items)) ? (data.announcements || data.items) : [];
      const updates = (rows || []).map(a => ({
        title: a.title || `${a.app_code || ''} ${a.version || ''}`.trim(),
        app_code: a.app_code || '',
        version: a.version || '',
        status_tag: a.status_tag || a.status || '',
        created_at: a.created_at || a.updated_at || '',
        content: a.body || a.content || a.message || ''
      }));
      return { updates };
    } catch (_) {
      const qs2 = appCode ? `?app_code=${encodeURIComponent(appCode)}&latest_only=true` : '';
      const rows = await this.requestJSON('GET', `/updates${qs2}`);
      const updates = (rows || []).map(r => ({
        title: r.tag ? `${r.app_code} • ${r.tag}` : `${r.app_code} v${r.version}`,
        app_code: r.app_code || '',
        version: r.version || '',
        status_tag: r.tag || '',
        created_at: r.created_at,
        content: r.notes || r.description || ''
      }));
      return { updates };
    }
  }

  // Get owned keys
  async getKeys() {
    return await this.requestJSON('GET', '/customer/keys');
  }
}

window.CustomerAPI = CustomerAPI;
