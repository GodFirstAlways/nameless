// admin-dashboard.js - Admin Dashboard Logic (Owner/Co-owner)
//
// This file powers the AdminDashboard.tsx markup through legacy scripts loaded at runtime.
// It assumes window.API_BASE_URL is set by the React dashboard shell.

const API_BASE_URL = window.API_BASE_URL || 'http://localhost:8000';
const api = new AdminAPI(API_BASE_URL);

// ------------------------------------------------------------
// DOM
// ------------------------------------------------------------
let usernameDisplay, userInitial, navItems, tabContents, logoutBtn;

// Overview stats
let totalResellers, totalCustomers, totalKeys, activeUsers;

// Resellers
let resellersList, createResellerForm;

// Stock
let giveStockForm, selectReseller, refreshResellerStockBtn, resellerStockTableBody;

// Keys
let refreshKeysBtn, keysTableBody;

// Apps tab
let refreshAppsCatalogBtn, appsCatalogList;
let appReleaseUploadForm;
let appReleaseAppCode, appReleaseVersion, appReleaseStatus, appReleaseMakeLatest, appReleaseDescription, appReleaseFile, appReleaseNotes;
let appReleasesFilter, refreshAppReleasesBtn, appReleasesList;
let hiddenModuleUploadForm, moduleAppCode, moduleFile, moduleDescription, refreshModulesBtn, modulesList;
let announcementForm, annAppCode, annVersion, annStatus, annTitle, annBody, refreshAnnouncementsBtn, announcementsList;

// ------------------------------------------------------------
// In-memory options
// ------------------------------------------------------------
let __apps = []; // [{app_code, name}]
let __appNameByCode = {}; // app_code -> name
let __statusTags = []; // [{value,label}]
let __versionsByApp = {}; // app_code -> [{id, version, tag, is_latest}]

const FALLBACK_STATUS_TAGS = [
  { value: 'stable', label: 'Stable' },
  { value: 'old_stable', label: 'Old stable' },
  { value: 'unstable', label: 'Unstable' },
  { value: 'maintained', label: 'Maintained' },
  { value: 'legacy_continued', label: 'Legacy continued' },
  { value: 'discontinued', label: 'Discontinued' }
];

// ------------------------------------------------------------
// User profile dropdown
// ------------------------------------------------------------
function initUserMenu() {
  const menu = document.querySelector('.user-menu');
  if (!menu) return;
  const trigger = menu.querySelector('.user-icon');
  const dropdown = menu.querySelector('.dropdown-menu');
  if (!trigger || !dropdown) return;

  trigger.setAttribute('role', 'button');
  trigger.setAttribute('tabindex', '0');
  trigger.setAttribute('aria-haspopup', 'menu');

  function closeMenu() {
    dropdown.classList.remove('open');
  }

  function toggleMenu(e) {
    e.preventDefault();
    e.stopPropagation();
    dropdown.classList.toggle('open');
  }

  trigger.addEventListener('click', toggleMenu);
  trigger.addEventListener('keydown', (e) => {
    if (e.key === 'Enter' || e.key === ' ') toggleMenu(e);
    if (e.key === 'Escape') closeMenu();
  });

  document.addEventListener('click', (e) => {
    if (!menu.contains(e.target)) closeMenu();
  });
}

// ------------------------------------------------------------
// Core init
// ------------------------------------------------------------
function initAdminDashboard() {
  if (window.__adminDashboardInitialized) return;
  window.__adminDashboardInitialized = true;

  // Basic elements
  usernameDisplay = document.getElementById('username');
  userInitial = document.getElementById('userInitial');
  navItems = document.querySelectorAll('.nav-item[data-tab]');
  tabContents = document.querySelectorAll('.tab-content');
  logoutBtn = document.getElementById('logoutBtn');

  // Stats
  totalResellers = document.getElementById('totalResellers');
  totalCustomers = document.getElementById('totalCustomers');
  totalKeys = document.getElementById('totalKeys');
  activeUsers = document.getElementById('activeUsers');

  // Resellers
  resellersList = document.getElementById('resellersList');
  createResellerForm = document.getElementById('createResellerForm');

  // Stock
  giveStockForm = document.getElementById('giveStockForm');
  selectReseller = document.getElementById('selectReseller');
  refreshResellerStockBtn = document.getElementById('refreshResellerStockBtn');
  resellerStockTableBody = document.getElementById('resellerStockTableBody');

  // Keys
  refreshKeysBtn = document.getElementById('refreshKeysBtn');
  keysTableBody = document.getElementById('keysTableBody');

  // Apps tab
  refreshAppsCatalogBtn = document.getElementById('refreshAppsCatalogBtn');
  appsCatalogList = document.getElementById('appsCatalogList');

  appReleaseUploadForm = document.getElementById('appReleaseUploadForm');
  appReleaseAppCode = document.getElementById('appReleaseAppCode');
  appReleaseVersion = document.getElementById('appReleaseVersion');
  appReleaseStatus = document.getElementById('appReleaseStatus');
  appReleaseMakeLatest = document.getElementById('appReleaseMakeLatest');
  appReleaseDescription = document.getElementById('appReleaseDescription');
  appReleaseFile = document.getElementById('appReleaseFile');
  appReleaseNotes = document.getElementById('appReleaseNotes');

  appReleasesFilter = document.getElementById('appReleasesFilter');
  refreshAppReleasesBtn = document.getElementById('refreshAppReleasesBtn');
  appReleasesList = document.getElementById('appReleasesList');

  hiddenModuleUploadForm = document.getElementById('hiddenModuleUploadForm');
  moduleAppCode = document.getElementById('moduleAppCode');
  moduleFile = document.getElementById('moduleFile');
  moduleDescription = document.getElementById('moduleDescription');
  refreshModulesBtn = document.getElementById('refreshModulesBtn');
  modulesList = document.getElementById('modulesList');

  announcementForm = document.getElementById('announcementForm');
  annAppCode = document.getElementById('annAppCode');
  annVersion = document.getElementById('annVersion');
  annStatus = document.getElementById('annStatus');
  annTitle = document.getElementById('annTitle');
  annBody = document.getElementById('annBody');
  refreshAnnouncementsBtn = document.getElementById('refreshAnnouncementsBtn');
  announcementsList = document.getElementById('announcementsList');

  initUserMenu();
  wireNav();
  wireLogout();
  wireButtons();
  wireForms();
  setUserHeader();

  // Load initial data
  loadStats();
  loadAppsOptions().then(() => {
    loadAppsCatalog();
    // Apps tab pre-warm
    loadAppReleases();
    loadModules();
    loadAnnouncements();
  });
  loadResellers();
}

function wireNav() {
  navItems.forEach((nav) => {
    nav.addEventListener('click', (e) => {
      e.preventDefault();
      const tab = nav.getAttribute('data-tab');
      if (tab) switchTab(tab);
    });
  });
}

function wireLogout() {
  if (!logoutBtn) return;
  logoutBtn.addEventListener('click', (e) => {
    e.preventDefault();
    clearAuth();
    window.location.href = '/login';
  });
}

function wireButtons() {
  if (refreshKeysBtn) refreshKeysBtn.addEventListener('click', () => loadKeys());
  if (refreshResellerStockBtn) refreshResellerStockBtn.addEventListener('click', () => loadResellerStock());
  if (selectReseller) selectReseller.addEventListener('change', () => loadResellerStock());

  if (refreshAppsCatalogBtn) refreshAppsCatalogBtn.addEventListener('click', () => loadAppsCatalog());

  if (refreshAppReleasesBtn) refreshAppReleasesBtn.addEventListener('click', () => loadAppReleases());
  if (appReleasesFilter) appReleasesFilter.addEventListener('change', () => loadAppReleases());

  if (refreshModulesBtn) refreshModulesBtn.addEventListener('click', () => loadModules());
  if (refreshAnnouncementsBtn) refreshAnnouncementsBtn.addEventListener('click', () => loadAnnouncements());

  if (annAppCode) {
    annAppCode.addEventListener('change', () => {
      const ac = String(annAppCode.value || '').trim();
      populateAnnouncementVersions(ac);
    });
  }

  if (annVersion) {
    annVersion.addEventListener('change', () => {
      const ac = String(annAppCode?.value || '').trim();
      const ver = String(annVersion.value || '').trim();
      const tag = resolveVersionTag(ac, ver);
      setAnnStatus(tag || '—');
    });
  }
}

function wireForms() {
  if (createResellerForm) createResellerForm.addEventListener('submit', handleCreateReseller);
  if (giveStockForm) giveStockForm.addEventListener('submit', handleGiveStock);
  if (appReleaseUploadForm) appReleaseUploadForm.addEventListener('submit', handleUploadAndPublishRelease);
  if (hiddenModuleUploadForm) hiddenModuleUploadForm.addEventListener('submit', handleUploadHiddenModule);
  if (announcementForm) announcementForm.addEventListener('submit', handlePublishAnnouncement);

  // Delegated actions for releases list
  if (appReleasesList) {
    appReleasesList.addEventListener('click', async (e) => {
      const btn = e.target && e.target.closest ? e.target.closest('button[data-action]') : null;
      if (!btn) return;
      const action = btn.getAttribute('data-action');
      const id = btn.getAttribute('data-id');
      if (!action || !id) return;

      if (action === 'make-latest') {
        await setReleaseLatest(Number(id));
      }
      if (action === 'save') {
        await saveReleaseEdits(Number(id));
      }
    });
  }

  // Delegated actions for announcements
  if (announcementsList) {
    announcementsList.addEventListener('click', async (e) => {
      const btn = e.target && e.target.closest ? e.target.closest('button[data-action]') : null;
      if (!btn) return;
      const action = btn.getAttribute('data-action');
      const id = btn.getAttribute('data-id');
      if (action === 'delete' && id) {
        await deleteAnnouncement(Number(id));
      }
    });
  }

  // Delegated actions for applications catalog
  if (appsCatalogList) {
    appsCatalogList.addEventListener('click', async (e) => {
      const btn = e.target && e.target.closest ? e.target.closest('button[data-action]') : null;
      if (!btn) return;
      const action = btn.getAttribute('data-action');
      const app = btn.getAttribute('data-app');
      if (!action || !app) return;

      if (action === 'toggle-edit') {
        const row = appsCatalogList.querySelector(`[data-app-row="${CSS.escape(app)}"]`);
        const panel = row ? row.querySelector('[data-edit-panel]') : null;
        if (panel) panel.classList.toggle('open');
      } else if (action === 'save-app') {
        await saveAppMeta(app);
      } else if (action === 'delete-app') {
        await deleteApp(app);
      } else if (action === 'open-store') {
        window.location.href = `/dashboard/admin/store?app=${encodeURIComponent(app)}`;
      }
    });
  }
}

function setUserHeader() {
  const username = localStorage.getItem('username') || sessionStorage.getItem('username') || 'Admin';
  if (usernameDisplay) usernameDisplay.textContent = username;
  if (userInitial) userInitial.textContent = (username || 'A').slice(0, 1).toUpperCase();
}

// ------------------------------------------------------------
// Tabs
// ------------------------------------------------------------
function switchTab(tabName) {
  navItems.forEach((nav) => nav.classList.remove('active'));
  const activeNav = document.querySelector(`[data-tab="${tabName}"]`);
  if (activeNav) activeNav.classList.add('active');

  tabContents.forEach((tab) => tab.classList.remove('active'));
  const panel = document.getElementById(`${tabName}-tab`);
  if (panel) panel.classList.add('active');

  loadTabData(tabName);
}

function loadTabData(tabName) {
  switch (tabName) {
    case 'overview':
      loadStats();
      break;
    case 'apps':
      loadAppsOptions().then(() => {
        loadAppsCatalog();
        loadAppReleases();
        loadModules();
        loadAnnouncements();
      });
      break;
    case 'resellers':
      loadResellers();
      break;
    case 'stock':
      loadResellers().then(() => loadResellerStock());
      break;
    case 'keys':
      loadKeys();
      break;
  }
}

// ------------------------------------------------------------
// Loaders
// ------------------------------------------------------------
async function loadStats() {
  try {
    const stats = await api.getStats();
    if (totalResellers) totalResellers.textContent = String(stats.total_resellers ?? 0);
    if (totalCustomers) totalCustomers.textContent = String(stats.total_customers ?? 0);
    if (totalKeys) totalKeys.textContent = String(stats.total_keys ?? 0);
    if (activeUsers) activeUsers.textContent = String(stats.active_users ?? 0);
  } catch (err) {
    showError(err.message || 'Failed to load stats');
  }
}

async function loadResellers() {
  try {
    const data = await api.getResellers();
    const resellers = data.resellers || [];
    renderResellers(resellers);
    populateResellerSelect(resellers);
    return resellers;
  } catch (err) {
    showError(err.message || 'Failed to load resellers');
    return [];
  }
}

function renderResellers(resellers) {
  if (!resellersList) return;
  if (!resellers.length) {
    resellersList.innerHTML = `<div class="empty">No resellers found</div>`;
    return;
  }
  resellersList.innerHTML = resellers
    .map((r) => {
      const created = formatDate(r.created_at);
      return `
        <div class="user-row">
          <div class="user-info">
            <div class="user-name">${escapeHtml(r.username)}</div>
            <div class="user-meta">ID: ${r.id} • Created: ${created}</div>
          </div>
          <div class="user-status ${r.is_active ? 'active' : 'inactive'}">
            ${r.is_active ? 'Active' : 'Inactive'}
          </div>
        </div>
      `;
    })
    .join('');
}

function populateResellerSelect(resellers) {
  if (!selectReseller) return;
  const current = selectReseller.value;
  selectReseller.innerHTML = `<option value="">Select a reseller</option>` + resellers
    .map((r) => `<option value="${r.id}">${escapeHtml(r.username)} (ID ${r.id})</option>`)
    .join('');
  if (current) selectReseller.value = current;
}

async function loadResellerStock() {
  if (!resellerStockTableBody) return;
  const resellerId = selectReseller ? selectReseller.value : '';
  if (!resellerId) {
    resellerStockTableBody.innerHTML = `<tr><td colspan="6" class="loading">Select a reseller and refresh.</td></tr>`;
    return;
  }
  resellerStockTableBody.innerHTML = `<tr><td colspan="6" class="loading">Loading stock...</td></tr>`;
  try {
    const rows = await api.listResellerStock(resellerId);

    if (!rows || !rows.length) {
      resellerStockTableBody.innerHTML = `<tr><td colspan="6">No stock found.</td></tr>`;
      return;
    }

    const grouped = {};
    rows.forEach((r) => {
      const app = normalize_app_code(String(r.app_code || ''));
      if (!grouped[app]) grouped[app] = { app_code: app, lines: [], qty: 0, total: 0, updated_at: null, hwid_tokens_remaining: 0 };
      grouped[app].lines.push(r);
      grouped[app].qty += Number(r.quantity || 0);
      grouped[app].total += Number(r.total_quantity ?? r.quantity ?? 0);

      const u = r.updated_at || r.created_at || null;
      if (!grouped[app].updated_at || (u && new Date(u) > new Date(grouped[app].updated_at))) grouped[app].updated_at = u;
    });

    const apps = Object.values(grouped).sort((a, b) => String(a.app_code).localeCompare(String(b.app_code)));

    resellerStockTableBody.innerHTML = apps
      .map((g) => {
        const detailsHtml = g.lines
          .slice()
          .sort((a, b) => String(a.duration_unit).localeCompare(String(b.duration_unit)) || Number(a.duration_value ?? 0) - Number(b.duration_value ?? 0))
          .map((r) => {
            const dur = r.duration_unit === 'lifetime' ? 'lifetime' : `${r.duration_value} ${r.duration_unit}`;
            const q = Number(r.quantity || 0);
            const tg = Number(r.total_quantity ?? 0);
            return `<div class="stock-line-detail"><span class="muted">${escapeHtml(dur)}</span> • <span>qty ${q}</span> • <span class="muted">total ${tg}</span></div>`;
          })
          .join('');

        return `
          <tr>
            <td>${escapeHtml(getProductName(g.app_code))}</td>
            <td>${Number(g.qty)}</td>
            <td>${Number(g.total)}</td>
            <td>${Number(g.hwid_tokens_remaining ?? 0) || 0}</td>
            <td>${escapeHtml(formatDate(g.updated_at))}</td>
            <td>
              <details class="stock-details">
                <summary>${g.lines.length} line${g.lines.length === 1 ? '' : 's'}</summary>
                ${detailsHtml || '<div class="muted">No lines.</div>'}
              </details>
            </td>
          </tr>
        `;
      })
      .join('');
  } catch (err) {
    resellerStockTableBody.innerHTML = `<tr><td colspan="6">Failed to load stock.</td></tr>`;
    showError(err.message || 'Failed to load stock');
  }
}

async function loadKeys() {
  if (!keysTableBody) return;
  keysTableBody.innerHTML = `<tr><td colspan="8" class="loading">Loading keys...</td></tr>`;
  try {
    const data = await api.getAllKeys();
    const keys = data.keys || data || [];
    if (!keys.length) {
      keysTableBody.innerHTML = `<tr><td colspan="8">No keys found.</td></tr>`;
      return;
    }
    keysTableBody.innerHTML = keys
      .map((k) => {
        return `
          <tr>
            <td class="mono">${escapeHtml(k.code || k.key || '')}</td>
            <td>${escapeHtml(k.prefix || '')}</td>
            <td>${escapeHtml(k.duration || k.duration_unit || '')}</td>
            <td>${escapeHtml(k.created_by || '')}</td>
            <td>${escapeHtml(k.redeemed_by || '')}</td>
            <td>${escapeHtml(formatDate(k.activated_at))}</td>
            <td>${escapeHtml(formatDate(k.expires_at))}</td>
            <td>${k.revoked ? '<span class="badge-warn">Yes</span>' : '<span class="badge-success">No</span>'}</td>
          </tr>
        `;
      })
      .join('');
  } catch (err) {
    keysTableBody.innerHTML = `<tr><td colspan="8">Failed to load keys.</td></tr>`;
    showError(err.message || 'Failed to load keys');
  }
}

// ------------------------------------------------------------
// Apps / Options
// ------------------------------------------------------------
async function loadAppsOptions() {
  try {
    const out = await api.getAppsOptions();
    __apps = Array.isArray(out?.apps) ? out.apps : [];
    __statusTags = Array.isArray(out?.release_status_tags) ? out.release_status_tags : [];

    if (!__apps.length) {
      // fallback: try to derive from versions
      const v = await api.listVersions('');
      const rows = (v && (v.versions || v)) || [];
      const set = new Set();
      (Array.isArray(rows) ? rows : []).forEach((r) => r && r.app_code && set.add(String(r.app_code)));
      __apps = Array.from(set).map((c) => ({ app_code: c, name: c }));
    }

    if (!__statusTags.length) __statusTags = FALLBACK_STATUS_TAGS.slice();

    __appNameByCode = {};
    __apps.forEach((a) => {
      __appNameByCode[String(a.app_code)] = String(a.name || a.app_code);
    });

    populateAppSelects();
    populateStatusSelect();
    populateReleasesFilter();

    // Announcement versions: if an app already selected, load versions.
    if (annAppCode && annAppCode.value) populateAnnouncementVersions(String(annAppCode.value));

    return out;
  } catch (err) {
    // still populate something so UI is usable
    __statusTags = FALLBACK_STATUS_TAGS.slice();
    populateStatusSelect();
    showError(err.message || 'Failed to load app options');
  }
}

function populateAppSelects() {
  const selects = [appReleaseAppCode, moduleAppCode, annAppCode, appReleasesFilter];
  selects.forEach((sel) => {
    if (!sel) return;
    const current = String(sel.value || '');
    const isFilter = sel === appReleasesFilter;

    const base = isFilter ? `<option value="">All apps</option>` : `<option value="">Select…</option>`;
    const opts = __apps
      .slice()
      .sort((a, b) => String(a.app_code).localeCompare(String(b.app_code)))
      .map((a) => {
        const code = String(a.app_code);
        const name = String(a.name || code);
        return `<option value="${escapeHtml(code)}">${escapeHtml(name)}</option>`;
      })
      .join('');

    sel.innerHTML = base + opts;
    if (current) sel.value = current;
  });
}

function populateStatusSelect() {
  if (!appReleaseStatus) return;
  const current = String(appReleaseStatus.value || 'stable');
  appReleaseStatus.innerHTML = __statusTags
    .map((t) => `<option value="${escapeHtml(String(t.value))}">${escapeHtml(String(t.label || t.value))}</option>`)
    .join('');
  if (current) appReleaseStatus.value = current;
}

function populateReleasesFilter() {
  if (!appReleasesFilter) return;
  const current = String(appReleasesFilter.value || '');
  const opts = __apps
    .slice()
    .sort((a, b) => String(a.app_code).localeCompare(String(b.app_code)))
    .map((a) => {
      const code = String(a.app_code);
      const name = String(a.name || code);
      return `<option value="${escapeHtml(code)}">${escapeHtml(name)}</option>`;
    })
    .join('');

  appReleasesFilter.innerHTML = `<option value="">All apps</option>` + opts;
  if (current) appReleasesFilter.value = current;
}

function getProductName(appCode) {
  const ac = normalize_app_code(String(appCode || ''));
  return __appNameByCode[ac] || ac || 'Unknown';
}

// ------------------------------------------------------------
// Applications catalog (view/edit/delete)
// ------------------------------------------------------------

async function loadAppsCatalog() {
  if (!appsCatalogList) return;
  appsCatalogList.innerHTML = `<div class="loading">Loading applications...</div>`;
  try {
    const data = await api.listApps();
    const apps = Array.isArray(data) ? data : data.apps || [];
    renderAppsCatalog(Array.isArray(apps) ? apps : []);
  } catch (err) {
    appsCatalogList.innerHTML = `<div class="empty">Failed to load applications.</div>`;
    showError(err.message || 'Failed to load applications');
  }
}

function renderAppsCatalog(apps) {
  if (!appsCatalogList) return;
  if (!apps.length) {
    appsCatalogList.innerHTML = `<div class="empty">No applications found.</div>`;
    return;
  }

  const statusOptions = [
    { value: 'available', label: 'Available' },
    { value: 'coming_soon', label: 'Coming soon' },
    { value: 'discontinued', label: 'Discontinued' }
  ];

  const statusLabelByValue = statusOptions.reduce((acc, o) => {
    acc[o.value] = o.label;
    return acc;
  }, {});

  appsCatalogList.innerHTML = apps
    .map((a) => {
      const ac = String(a.app_code || '').trim();
      const name = String(a.name || ac);
      const tagline = String(a.tagline || '');
      const status = String(a.status || 'available');
      const rel = Number(a.releases_count || 0);
      const ver = Number(a.versions_count || 0);
      const media = Number(a.media_count || 0);

      const statusHtml = statusOptions
        .map((o) => `<option value="${escapeHtml(o.value)}">${escapeHtml(o.label)}</option>`)
        .join('');

      const avatar = (name || ac || 'A').slice(0, 1).toUpperCase();
      const statusLabel = statusLabelByValue[status] || 'Available';

      return `
        <div class="app-catalog-row" data-app-row="${escapeHtml(ac)}">
          <div class="app-catalog-summary">
            <div class="app-catalog-left">
              <div class="app-avatar" aria-hidden="true">${escapeHtml(avatar)}</div>

              <div class="app-catalog-main">
                <div class="app-catalog-title">
                  <span class="app-catalog-name">${escapeHtml(name)}</span>
                  <span class="app-catalog-code">${escapeHtml(ac)}</span>
                  <span class="app-status-chip ${escapeHtml(status)}" data-status-chip>${escapeHtml(statusLabel)}</span>
                </div>

                <div class="app-catalog-stats">
                  <span class="stat-pill"><span class="stat-label">Releases</span><span class="stat-value">${rel}</span></span>
                  <span class="stat-pill"><span class="stat-label">Versions</span><span class="stat-value">${ver}</span></span>
                  <span class="stat-pill"><span class="stat-label">Media</span><span class="stat-value">${media}</span></span>
                </div>

                ${tagline ? `<div class="app-catalog-tagline">${escapeHtml(tagline)}</div>` : ``}
              </div>
            </div>

            <div class="app-catalog-actions">
              <button type="button" class="icon-btn" title="Open store" data-action="open-store" data-app="${escapeHtml(ac)}">🛒</button>
              <button type="button" class="icon-btn" title="Edit" data-action="toggle-edit" data-app="${escapeHtml(ac)}">✏️</button>
              <button type="button" class="icon-btn icon-btn-primary" title="Save" data-action="save-app" data-app="${escapeHtml(ac)}">💾</button>
              <button type="button" class="icon-btn icon-btn-danger" title="Delete" data-action="delete-app" data-app="${escapeHtml(ac)}">🗑️</button>
            </div>
          </div>

          <div class="app-catalog-edit" data-edit-panel>
            <div class="form-group">
              <label>Name</label>
              <input class="app-catalog-input" data-field="name" value="${escapeHtml(name)}" />
            </div>

            <div class="form-group">
              <label>Status</label>
              <select class="app-catalog-input" data-field="status">${statusHtml}</select>
            </div>

            <div class="form-group app-catalog-wide">
              <label>Tagline</label>
              <input class="app-catalog-input" data-field="tagline" value="${escapeHtml(tagline)}" placeholder="Short tagline (optional)" />
            </div>

            <div class="app-catalog-hint">
              Changes here affect the Store display and tags. Use the pencil button to collapse this section.
            </div>
          </div>
        </div>
      `;
    })
    .join('');

  // Apply selected statuses and collapse edit panels by default
  apps.forEach((a) => {
    const ac = String(a.app_code || '').trim();
    const row = appsCatalogList.querySelector(`[data-app-row="${CSS.escape(ac)}"]`);
    if (!row) return;

    const sel = row.querySelector('select[data-field="status"]');
    if (sel) sel.value = String(a.status || 'available');

    const panel = row.querySelector('[data-edit-panel]');
    if (panel) panel.classList.remove('open');

    // keep chip correct when dropdown changes
    if (sel) {
      sel.addEventListener('change', () => {
        const v = String(sel.value || 'available');
        const chip = row.querySelector('[data-status-chip]');
        if (!chip) return;
        chip.classList.remove('available', 'coming_soon', 'discontinued');
        chip.classList.add(v);
        chip.textContent = (v === 'coming_soon') ? 'Coming soon' : (v === 'discontinued' ? 'Discontinued' : 'Available');
      }, { passive: true });
    }
  });
}

async function saveAppMeta(appCode) {
  const ac = String(appCode || '').trim();
  if (!ac) return;
  const row = appsCatalogList && appsCatalogList.querySelector(`[data-app-row="${CSS.escape(ac)}"]`);
  if (!row) return;

  const nameEl = row.querySelector('[data-field="name"]');
  const statusEl = row.querySelector('[data-field="status"]');
  const taglineEl = row.querySelector('[data-field="tagline"]');

  const patch = {
    name: String(nameEl?.value || '').trim(),
    status: String(statusEl?.value || 'available').trim(),
    tagline: String(taglineEl?.value || '').trim()
  };

  try {
    await api.updateApp(ac, patch);
    showSuccess('Saved');
    await loadAppsOptions();
    await loadAppsCatalog();
  } catch (err) {
    showError(err.message || 'Failed to save');
  }
}

async function deleteApp(appCode) {
  const ac = String(appCode || '').trim();
  if (!ac) return;
  if (!confirm(`Delete application "${ac}"? This removes releases/versions and store media/meta.`)) return;
  try {
    await api.deleteApp(ac);
    showSuccess('Deleted');
    await loadAppsOptions();
    await loadAppsCatalog();
    await loadAppReleases();
    await loadModules();
    await loadAnnouncements();
  } catch (err) {
    showError(err.message || 'Delete failed');
  }
}

// ------------------------------------------------------------
// Releases
// ------------------------------------------------------------
async function handleUploadAndPublishRelease(e) {
  e.preventDefault();
  try {
    const appCode = String(appReleaseAppCode?.value || '').trim();
    const version = String(appReleaseVersion?.value || '').trim();
    const status = String(appReleaseStatus?.value || 'stable').trim();
    const makeLatest = String(appReleaseMakeLatest?.value || 'true') === 'true';
    const desc = String(appReleaseDescription?.value || '').trim();
    const notes = String(appReleaseNotes?.value || '').trim();

    const file = appReleaseFile && appReleaseFile.files && appReleaseFile.files[0];
    if (!appCode) throw new Error('Select an application');
    if (!version) throw new Error('Enter a version');
    if (!file) throw new Error('Select a file');
    if (!notes) throw new Error('Release notes required');

    showToast('Uploading build…', 'info');

    // Upload artifact (public)
    const art = await api.uploadArtifact(file, appCode, desc || file.name, { requiresActiveLicense: true, isPublic: true });
    const artifactId = Number(art.artifact_id || art.id);
    if (!artifactId) throw new Error('Upload did not return an artifact_id');

    // Create release (no manual artifact ID)
    await api.createRelease(appCode, version, notes, artifactId, makeLatest, status, desc || null);

    showSuccess('Published release');

    // Reset form
    if (appReleaseVersion) appReleaseVersion.value = '';
    if (appReleaseDescription) appReleaseDescription.value = '';
    if (appReleaseNotes) appReleaseNotes.value = '';
    if (appReleaseFile) appReleaseFile.value = '';

    await loadAppReleases();
  } catch (err) {
    showError(err.message || 'Failed to publish release');
  }
}

async function loadAppReleases() {
  if (!appReleasesList) return;
  appReleasesList.innerHTML = `<div class="loading">Loading versions...</div>`;
  try {
    const filter = String(appReleasesFilter?.value || '').trim();
    const data = await api.listReleases(filter);
    const releases = Array.isArray(data) ? data : data.releases || data || [];
    renderAppReleases(Array.isArray(releases) ? releases : []);
  } catch (err) {
    appReleasesList.innerHTML = `<div class="empty">Failed to load versions.</div>`;
    showError(err.message || 'Failed to load versions');
  }
}

function renderAppReleases(releases) {
  if (!appReleasesList) return;
  if (!releases.length) {
    appReleasesList.innerHTML = `<div class="empty">No releases yet.</div>`;
    return;
  }

  const rows = releases
    .slice()
    .sort((a, b) => {
      // latest first, then created desc
      const la = a.is_latest ? 1 : 0;
      const lb = b.is_latest ? 1 : 0;
      if (la !== lb) return lb - la;
      return new Date(b.created_at || 0) - new Date(a.created_at || 0);
    })
    .map((r) => {
      const latest = r.is_latest ? `<span class="badge-success">Latest</span>` : '';
      const created = formatDate(r.created_at);
      const currentTag = String(r.tag || 'stable');
      const tagSelect = `<select class="mini-select" data-field="tag" data-id="${r.id}">${__statusTags
        .map((t) => {
          const val = String(t.value);
          const lab = String(t.label || t.value);
          return `<option value="${escapeHtml(val)}" ${val === currentTag ? 'selected' : ''}>${escapeHtml(lab)}</option>`;
        })
        .join('')}</select>`;

      return `
        <div class="release-card" data-release="${r.id}">
          <div class="release-header">
            <div>
              <div class="release-title">${escapeHtml(getProductName(r.app_code))} • ${escapeHtml(r.version)}</div>
              <div class="release-meta">${escapeHtml(created)} • Artifact ${escapeHtml(String(r.artifact_id ?? ''))}</div>
            </div>
            <div class="release-badges">
              ${latest}
              <span class="badge">${escapeHtml(currentTag)}</span>
            </div>
          </div>

          <div class="release-notes">${escapeHtml((r.notes || '').trim())}</div>

          <div class="release-actions">
            <div class="inline-controls">
              <span class="muted">Status</span>
              ${tagSelect}
            </div>
            <div class="inline-controls">
              <button type="button" class="btn-secondary" data-action="save" data-id="${r.id}">Save</button>
              ${r.is_latest ? '' : `<button type="button" class="btn-secondary" data-action="make-latest" data-id="${r.id}">Make latest</button>`}
              <a class="btn-secondary" href="/content/download/${encodeURIComponent(String(r.artifact_id))}" target="_blank" rel="noreferrer">Download</a>
            </div>
          </div>
        </div>
      `;
    })
    .join('');

  appReleasesList.innerHTML = rows;
}

async function setReleaseLatest(releaseId) {
  try {
    await api.updateRelease(releaseId, { make_latest: true });
    showSuccess('Updated latest');
    await loadAppReleases();
  } catch (err) {
    showError(err.message || 'Failed to set latest');
  }
}

async function saveReleaseEdits(releaseId) {
  try {
    const sel = document.querySelector(`select[data-field="tag"][data-id="${releaseId}"]`);
    const tag = sel ? String(sel.value || '').trim() : '';
    if (!tag) throw new Error('Missing tag');

    await api.updateRelease(releaseId, { tag });
    showSuccess('Saved');
    await loadAppReleases();
  } catch (err) {
    showError(err.message || 'Failed to update');
  }
}

// ------------------------------------------------------------
// Hidden modules
// ------------------------------------------------------------
async function handleUploadHiddenModule(e) {
  e.preventDefault();
  try {
    const appCode = String(moduleAppCode?.value || '').trim();
    const file = moduleFile && moduleFile.files && moduleFile.files[0];
    const desc = String(moduleDescription?.value || '').trim();

    if (!appCode) throw new Error('Select an application');
    if (!file) throw new Error('Select a file');

    showToast('Uploading module…', 'info');
    await api.uploadModule(file, appCode, desc || file.name);

    showSuccess('Uploaded module');

    if (moduleFile) moduleFile.value = '';
    if (moduleDescription) moduleDescription.value = '';

    await loadModules();
  } catch (err) {
    showError(err.message || 'Failed to upload module');
  }
}

async function loadModules() {
  if (!modulesList) return;
  modulesList.innerHTML = `<div class="loading">Loading modules...</div>`;
  try {
    const ac = String(moduleAppCode?.value || '').trim();
    const out = await api.listModules(ac);
    const rows = Array.isArray(out) ? out : out.modules || out.items || out || [];
    renderModules(Array.isArray(rows) ? rows : []);
  } catch (err) {
    modulesList.innerHTML = `<div class="empty">No modules (or endpoint missing).</div>`;
    // Do not spam errors if endpoint not implemented yet.
    if (!String(err.message || '').includes('404')) showError(err.message || 'Failed to load modules');
  }
}

function renderModules(rows) {
  if (!modulesList) return;
  if (!rows.length) {
    modulesList.innerHTML = `<div class="empty">No modules uploaded yet.</div>`;
    return;
  }

  modulesList.innerHTML = rows
    .slice(0, 25)
    .map((m) => {
      const created = formatDate(m.created_at || m.createdAt);
      const name = String(m.name || m.filename || '').trim() || `Artifact ${m.id}`;
      const app = normalize_app_code(String(m.app_code || m.appCode || ''));
      const id = Number(m.id || m.artifact_id || 0);
      const dl = m.download_url || `/content/download/${id}`;

      return `
        <div class="module-row">
          <div class="module-left">
            <div class="module-name">${escapeHtml(name)}</div>
            <div class="module-meta">${escapeHtml(getProductName(app))} • ${escapeHtml(created)} • ID ${id}</div>
          </div>
          <div class="module-right">
            <a class="btn-secondary" href="${escapeHtml(dl)}" target="_blank" rel="noreferrer">Download</a>
          </div>
        </div>
      `;
    })
    .join('');
}

// ------------------------------------------------------------
// Announcements
// ------------------------------------------------------------
function setAnnStatus(text) {
  if (!annStatus) return;
  annStatus.textContent = String(text || '—');
}

async function populateAnnouncementVersions(appCode) {
  if (!annVersion) return;
  const ac = String(appCode || '').trim();
  if (!ac) {
    annVersion.innerHTML = `<option value="">Select app first</option>`;
    setAnnStatus('—');
    return;
  }

  annVersion.innerHTML = `<option value="">Loading...</option>`;
  try {
    // Prefer supported versions table.
    let out = await api.listVersions(ac);
    let rows = Array.isArray(out) ? out : out.versions || out || [];

    // If the supported-versions table is empty, fall back to releases (so you can still announce).
    if (!Array.isArray(rows) || rows.length === 0) {
      const r = await api.listReleases(ac);
      rows = Array.isArray(r) ? r : r.releases || r || [];
    }

    const versions = (Array.isArray(rows) ? rows : []).map((v) => ({
      version: String(v.version || ''),
      tag: String(v.tag || ''),
      is_latest: !!(v.is_latest || v.isLatest)
    })).filter((v) => v.version);

    __versionsByApp[ac] = versions;

    if (!versions.length) {
      annVersion.innerHTML = `<option value="">No versions registered</option>`;
      setAnnStatus('—');
      return;
    }

    versions.sort((a, b) => {
      const la = a.is_latest ? 1 : 0;
      const lb = b.is_latest ? 1 : 0;
      if (la !== lb) return lb - la;
      return String(b.version).localeCompare(String(a.version));
    });

    annVersion.innerHTML = `<option value="">Select a version</option>` + versions
      .map((v) => `<option value="${escapeHtml(v.version)}">${escapeHtml(v.version)}${v.is_latest ? ' (latest)' : ''}</option>`)
      .join('');

    setAnnStatus('—');
  } catch (err) {
    annVersion.innerHTML = `<option value="">Failed to load versions</option>`;
    setAnnStatus('—');
    showError(err.message || 'Failed to load versions');
  }
}

function resolveVersionTag(appCode, version) {
  const ac = String(appCode || '').trim();
  const v = String(version || '').trim();
  const list = __versionsByApp[ac] || [];
  const row = list.find((x) => String(x.version) === v);
  return row ? String(row.tag || '') : '';
}

async function handlePublishAnnouncement(e) {
  e.preventDefault();
  try {
    const ac = String(annAppCode?.value || '').trim();
    const ver = String(annVersion?.value || '').trim();
    const title = String(annTitle?.value || '').trim();
    const body = String(annBody?.value || '').trim();

    if (!ac) throw new Error('Select an application');
    if (!ver) throw new Error('Select a version');
    if (!title) throw new Error('Enter a title');
    if (!body) throw new Error('Enter a body');

    showToast('Publishing…', 'info');
    await api.createAnnouncement(ac, ver, title, body);

    showSuccess('Published announcement');

    if (annTitle) annTitle.value = '';
    if (annBody) annBody.value = '';

    await loadAnnouncements();
  } catch (err) {
    showError(err.message || 'Failed to publish announcement');
  }
}

async function loadAnnouncements() {
  if (!announcementsList) return;
  announcementsList.innerHTML = `<div class="loading">Loading announcements...</div>`;
  try {
    const out = await api.listAnnouncements();
    const rows = Array.isArray(out) ? out : out.announcements || out.items || out || [];
    renderAnnouncements(Array.isArray(rows) ? rows : []);
  } catch (err) {
    announcementsList.innerHTML = `<div class="empty">No announcements (or endpoint missing).</div>`;
    if (!String(err.message || '').includes('404')) showError(err.message || 'Failed to load announcements');
  }
}

function renderAnnouncements(rows) {
  if (!announcementsList) return;
  if (!rows.length) {
    announcementsList.innerHTML = `<div class="empty">No announcements yet.</div>`;
    return;
  }

  announcementsList.innerHTML = rows
    .slice(0, 20)
    .map((a) => {
      const id = Number(a.id || 0);
      const app = normalize_app_code(String(a.app_code || a.appCode || ''));
      const ver = String(a.version || '');
      const status = String(a.status_tag || a.status || a.tag || '').trim();
      const created = formatDate(a.created_at || a.createdAt);
      const title = String(a.title || '').trim();
      const body = String(a.body || a.message || '').trim();

      return `
        <div class="announce-row">
          <div class="announce-head">
            <div class="announce-title">${escapeHtml(title)}</div>
            <div class="announce-badges">
              <span class="badge">${escapeHtml(getProductName(app))}</span>
              <span class="badge">${escapeHtml(ver)}</span>
              ${status ? `<span class="badge-warn">${escapeHtml(status)}</span>` : ''}
            </div>
          </div>
          <div class="announce-meta">${escapeHtml(created)} • ID ${id}</div>
          <div class="announce-body">${escapeHtml(body)}</div>
          <div class="announce-actions">
            <button type="button" class="btn-secondary" data-action="delete" data-id="${id}">Delete</button>
          </div>
        </div>
      `;
    })
    .join('');
}

async function deleteAnnouncement(id) {
  try {
    await api.deleteAnnouncement(id);
    showSuccess('Deleted');
    await loadAnnouncements();
  } catch (err) {
    showError(err.message || 'Failed to delete');
  }
}

// ------------------------------------------------------------
// Handlers (Resellers/Stock)
// ------------------------------------------------------------
async function handleCreateReseller(e) {
  e.preventDefault();
  try {
    const username = document.getElementById('resellerUsername').value;
    const password = document.getElementById('resellerPassword').value;
    await api.createReseller(username, password);
    showSuccess('Reseller created');
    e.target.reset();
    loadResellers();
  } catch (err) {
    showError(err.message || 'Failed to create reseller');
  }
}

async function handleGiveStock(e) {
  e.preventDefault();
  try {
    const resellerId = document.getElementById('selectReseller').value;
    const appCode = document.getElementById('appCode').value;
    const durationUnit = document.getElementById('durationUnit').value;
    const durationValue = document.getElementById('durationValue').value;
    const quantity = document.getElementById('quantity').value;

    await api.giveStock(resellerId, appCode, durationUnit, durationValue, quantity);
    showSuccess('Stock granted');
    loadResellerStock();
  } catch (err) {
    showError(err.message || 'Failed to give stock');
  }
}

// ------------------------------------------------------------
// Utils
// ------------------------------------------------------------
function normalize_app_code(s) {
  return String(s || '').trim().toLowerCase();
}

function escapeHtml(unsafe) {
  if (unsafe === null || unsafe === undefined) return '';
  return String(unsafe)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#039;');
}

function formatDate(dateString) {
  if (!dateString) return '';
  try {
    const date = new Date(dateString);
    if (Number.isNaN(date.getTime())) return '';
    return date.toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  } catch (_) {
    return '';
  }
}

function showToast(message, kind = 'success') {
  const notification = document.createElement('div');
  notification.className = 'toast';
  notification.textContent = message;

  const base = `
    position: fixed; top: 100px; right: 32px;
    padding: 12px 16px; border-radius: 12px;
    z-index: 10000; animation: slideIn 0.25s ease;
    border: 1px solid rgba(255,255,255,0.12);
    backdrop-filter: blur(16px);
  `;

  if (kind === 'error') {
    notification.style.cssText = base + 'background: rgba(239, 68, 68, 0.15); color: #fecaca;';
  } else if (kind === 'info') {
    notification.style.cssText = base + 'background: rgba(59, 130, 246, 0.12); color: #bfdbfe;';
  } else {
    notification.style.cssText = base + 'background: rgba(16, 185, 129, 0.12); color: #bbf7d0;';
  }

  document.body.appendChild(notification);
  setTimeout(() => {
    notification.style.animation = 'slideOut 0.25s ease';
    setTimeout(() => notification.remove(), 250);
  }, 2500);
}

function showSuccess(message) {
  showToast(message, 'success');
}

function showError(message) {
  showToast(message, 'error');
}

function clearAuth() {
  localStorage.removeItem('authToken');
  localStorage.removeItem('userType');
  localStorage.removeItem('username');
  localStorage.removeItem('userId');
  localStorage.removeItem('tokenExpiry');

  sessionStorage.removeItem('authToken');
  sessionStorage.removeItem('userType');
  sessionStorage.removeItem('username');
  sessionStorage.removeItem('userId');
  sessionStorage.removeItem('tokenExpiry');
}

// Prevent context menu
document.addEventListener('contextmenu', (e) => e.preventDefault());

// Boot
if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', initAdminDashboard);
} else {
  initAdminDashboard();
}

window.initAdminDashboard = initAdminDashboard;