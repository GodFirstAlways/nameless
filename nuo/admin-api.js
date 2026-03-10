// admin-api.js - Admin API Service Layer
// Handles all API calls for admin dashboard (OWNER/CO_OWNER)
//
// Notes:
// - JSON requests use application/json
// - Form/file uploads use FormData; DO NOT set Content-Type manually (browser sets boundary)
//   See MDN FormData docs: https://developer.mozilla.org/en-US/docs/Web/API/FormData

class AdminAPI {
  constructor(baseURL) {
    this.baseURL = baseURL || (window.API_BASE_URL || 'http://localhost:8000');
  }

  getToken() {
    return localStorage.getItem('authToken') || sessionStorage.getItem('authToken') || '';
  }

  authHeader() {
    const token = this.getToken();
    return { Authorization: `Bearer ${token}` };
  }

  jsonHeaders() {
    return { ...this.authHeader(), 'Content-Type': 'application/json' };
  }

  async readError(response) {
    const data = await response.json().catch(() => null);
    if (data && (data.detail || data.message)) return String(data.detail || data.message);
    return `HTTP ${response.status}: ${response.statusText}`;
  }

  async expectJSON(response) {
    if (!response.ok) throw new Error(await this.readError(response));
    return await response.json();
  }

  async requestJSON(method, path, bodyObj) {
    const url = `${this.baseURL}${path}`;
    const upper = String(method || 'GET').toUpperCase();

    const doRequest = async () => {
      const response = await fetch(url, {
        method: upper,
        headers: this.jsonHeaders(),
        body: bodyObj !== undefined ? JSON.stringify(bodyObj) : undefined
      });
      return await this.expectJSON(response);
    };

    // Lightweight in-memory cache to avoid spamming the server (see cache.js).
    if (upper === 'GET' && typeof window !== 'undefined' && typeof window.__apiCacheGet === 'function') {
      return await window.__apiCacheGet(url, doRequest);
    }

    // Any write should invalidate cached GETs.
    if (upper !== 'GET' && typeof window !== 'undefined' && typeof window.__apiCacheClear === 'function') {
      window.__apiCacheClear();
    }

    return await doRequest();
  }

  async requestForm(method, path, formData) {
    const response = await fetch(`${this.baseURL}${path}`, {
      method,
      headers: this.authHeader(),
      body: formData
    });
    return await this.expectJSON(response);
  }

  // ---------------------------------------------------------------------------
  // Core admin ops
  // ---------------------------------------------------------------------------

  async getStats() {
    return await this.requestJSON('GET', '/admin/stats');
  }

  async getUsersTree() {
    return await this.requestJSON('GET', '/admin/users/tree');
  }

  async getAllKeys() {
    return await this.requestJSON('GET', '/admin/keys');
  }

  // ---------------------------------------------------------------------------
  // Resellers
  // ---------------------------------------------------------------------------

  async createReseller(username, password) {
    return await this.requestJSON('POST', '/admin/resellers', { username, password });
  }

  async getResellers() {
    return await this.requestJSON('GET', '/admin/resellers');
  }

  async giveStock(reseller_id, app_code, duration_unit, duration_value, quantity) {
    const unit = String(duration_unit || '').toLowerCase();
    const dv = unit === 'lifetime' ? null : duration_value === '' || duration_value === null ? null : Number(duration_value);

    return await this.requestJSON('POST', `/admin/resellers/${reseller_id}/stock`, {
      reseller_user_id: Number(reseller_id),
      app_code,
      duration_unit: unit,
      duration_value: dv,
      quantity: Number(quantity)
    });
  }

  async listResellerStock(resellerId) {
    const qs = new URLSearchParams({ reseller_id: String(resellerId) }).toString();
    return await this.requestJSON('GET', `/admin/reseller-stock?${qs}`);
  }

  // ---------------------------------------------------------------------------
  // HWID Tokens (reset credits)
  // ---------------------------------------------------------------------------

  async getUserHwidTokens(userId) {
    return await this.requestJSON('GET', `/admin/users/${userId}/hwid-tokens`);
  }

  // ---------------------------------------------------------------------------
  // Apps / Releases
  // ---------------------------------------------------------------------------

  async getAppsOptions() {
    // Preferred: single source of truth from server.
    try {
      return await this.requestJSON('GET', '/admin/apps/options');
    } catch (_) {
      // Back-compat: derive from versions + releases.
      const apps = new Set();
      try {
        const v = await this.listVersions('');
        const rows = (v && (v.versions || v)) || [];
        (Array.isArray(rows) ? rows : []).forEach((r) => r && r.app_code && apps.add(String(r.app_code)));
      } catch (_) {
        /* ignore */
      }
      try {
        const r = await this.listReleases('');
        const rows = (r && (r.releases || r)) || r || [];
        (Array.isArray(rows) ? rows : []).forEach((x) => x && x.app_code && apps.add(String(x.app_code)));
      } catch (_) {
        /* ignore */
      }
      return {
        apps: Array.from(apps).map((c) => ({ app_code: c, name: c })),
        release_status_tags: [
          { value: 'stable', label: 'Stable' },
          { value: 'old_stable', label: 'Old stable' },
          { value: 'unstable', label: 'Unstable' },
          { value: 'maintained', label: 'Maintained' },
          { value: 'legacy_continued', label: 'Legacy continued' },
          { value: 'discontinued', label: 'Discontinued' }
        ]
      };
    }
  }

  // Applications catalog (store-facing app list)
  async listApps() {
    return await this.requestJSON('GET', '/admin/apps');
  }

  async updateApp(appCode, patch) {
    const ac = encodeURIComponent(String(appCode || '').trim());
    return await this.requestJSON('PATCH', `/admin/apps/${ac}`, patch || {});
  }

  async deleteApp(appCode) {
    const ac = encodeURIComponent(String(appCode || '').trim());
    return await this.requestJSON('DELETE', `/admin/apps/${ac}`);
  }

  async listReleases(appCode = '') {
    const qs = appCode ? `?${new URLSearchParams({ app_code: appCode }).toString()}` : '';
    return await this.requestJSON('GET', `/admin/releases${qs}`);
  }

  async createRelease(appCode, version, notes, artifactId, makeLatest = true, tag = 'stable', description = null) {
    return await this.requestJSON('POST', '/admin/releases', {
      app_code: appCode,
      version,
      notes,
      artifact_id: Number(artifactId),
      make_latest: Boolean(makeLatest),
      tag,
      description
    });
  }

  async updateRelease(releaseId, patch) {
    // patch: {notes?, tag?, description?, make_latest?}
    return await this.requestJSON('PATCH', `/admin/releases/${releaseId}`, patch);
  }

  async uploadArtifact(file, appCode, description, opts = {}) {
    // opts: {requiresActiveLicense?: boolean, isPublic?: boolean}
    const formData = new FormData();
    formData.append('file', file);
    formData.append('app_code', appCode);
    if (description) formData.append('description', description);

    if (opts && typeof opts.requiresActiveLicense === 'boolean') {
      formData.append('requires_active_license', String(Boolean(opts.requiresActiveLicense)));
    }
    if (opts && typeof opts.isPublic === 'boolean') {
      formData.append('is_public', String(Boolean(opts.isPublic)));
    }

    return await this.requestForm('POST', '/admin/artifacts', formData);
  }

  // Hidden module upload (unlisted, still entitlement-gated)
  async uploadModule(file, appCode, description) {
    const fd = new FormData();
    fd.append('file', file);
    fd.append('app_code', appCode);
    if (description) fd.append('description', description);
    return await this.requestForm('POST', '/admin/modules', fd);
  }

  async listModules(appCode = '') {
    const qs = appCode ? `?${new URLSearchParams({ app_code: appCode }).toString()}` : '';
    return await this.requestJSON('GET', `/admin/modules${qs}`);
  }

  // ---------------------------------------------------------------------------
  // Supported Versions
  // ---------------------------------------------------------------------------

  async listVersions(appCode = '') {
    const qs = appCode ? `?${new URLSearchParams({ app_code: appCode }).toString()}` : '';
    return await this.requestJSON('GET', `/admin/versions${qs}`);
  }

  // ---------------------------------------------------------------------------
  // Announcements
  // ---------------------------------------------------------------------------

  async listAnnouncements() {
    return await this.requestJSON('GET', '/admin/announcements');
  }

  async createAnnouncement(appCode, version, title, body) {
    return await this.requestJSON('POST', '/admin/announcements', {
      app_code: appCode,
      version,
      title,
      body
    });
  }

  async deleteAnnouncement(announcementId) {
    return await this.requestJSON('DELETE', `/admin/announcements/${announcementId}`);
  }
}

window.AdminAPI = AdminAPI;
