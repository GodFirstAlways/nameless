// customer-dashboard.js - Customer Dashboard Logic (V2 - Time Balances)

// Initialize API service
// (The React app can set window.API_BASE_URL; fallback keeps local dev working.)
const API_BASE_URL = window.API_BASE_URL || 'http://localhost:8000';
const api = new CustomerAPI(API_BASE_URL);

// DOM Elements - will be initialized after DOM loads
let usernameDisplay, accountUsername, accountId, memberSince, totalProducts;
let totalApps, totalTime, timeBalancesList, downloadsGrid, hwidProducts;
let updatesContainer, logoutBtn, userInitial, navItems, tabContents;
let redeemForm;

// Populated by /customer/account when first needed. Keeping this at module scope fixes
// the "HWID tab fails to fetch unless Settings is opened first" issue caused by an
// undeclared variable in some browser runtimes.
let accountInfoCache = null;



// User profile dropdown: click-to-toggle + click-outside close.
// Fixes the "menu disappears when moving the mouse" issue on dashboards.
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

function initCustomerDashboard() {
  if (window.__customerDashboardInitialized) return;
  window.__customerDashboardInitialized = true;
  // Get DOM Elements
  usernameDisplay = document.getElementById('username');
  accountUsername = document.getElementById('accountUsername');
  accountId = document.getElementById('accountId');
  memberSince = document.getElementById('memberSince');
  totalProducts = document.getElementById('totalProducts');
  totalApps = document.getElementById('totalApps');
  totalTime = document.getElementById('totalTime');
  timeBalancesList = document.getElementById('timeBalancesList');
  downloadsGrid = document.getElementById('downloadsGrid');
  hwidProducts = document.getElementById('hwidProducts');
  updatesContainer = document.getElementById('updatesContainer');
  logoutBtn = document.getElementById('logoutBtn');
  userInitial = document.getElementById('userInitial');
  navItems = document.querySelectorAll('.nav-item');
  tabContents = document.querySelectorAll('.tab-content');
  redeemForm = document.getElementById('redeemForm');

  // Authentication check
  checkAuth();
  initUserMenu();
  initAccountSettingsUI();

  // Tab Navigation
  navItems.forEach(item => {
    item.addEventListener('click', (e) => {
      e.preventDefault();
      const tabName = item.dataset.tab;
      switchTab(tabName);
    });
  });

  // Redeem form handler
  redeemForm.addEventListener('submit', handleRedeemKey);

  // Logout handler
  logoutBtn.addEventListener('click', (e) => {
    e.preventDefault();
    if (window.AuthCheck) {
      window.AuthCheck.clearAuth();
    }
    window.location.href = '/login';
  });

  // Initial load
  loadTimeBalances();
}

// Support running inside a SPA where scripts may load after DOMContentLoaded
// Account settings modal (dashboard "Settings" button)
function initAccountSettingsUI() {
  const btn = document.getElementById("settingsBtn");
  if (!btn) return;
  btn.addEventListener("click", async (e) => {
    e.preventDefault();
    await openAccountSettingsModal();
  });
}

async function openAccountSettingsModal() {
  const data = accountInfoCache || (await api.getAccountInfo());
  accountInfoCache = data;

  const activeProducts = Array.isArray(data.active_products) ? data.active_products : [];
  const activeCount =
    typeof data.active_products_count === "number"
      ? data.active_products_count
      : activeProducts.filter((p) => p && p.has_time).length;

  const modalId = "accountSettingsModal";
  let modal = document.getElementById(modalId);

  const byApp = data.hwid_resets_by_app || {};
  const byAppRows = Object.keys(byApp)
    .sort()
    .map((app) => {
      const row = byApp[app] || {};
      const remaining = Number(row.remaining ?? 0) || 0;
      const used = Number(row.used ?? 0) || 0;
      return `<tr><td>${escapeHtml(getProductName(app))}</td><td>${remaining}</td><td>${used}</td></tr>`;
    })
    .join("");

  const contentHtml = `
    <div class="modal-content">
      <div class="modal-header">
        <h2>Account Settings</h2>
        <button class="modal-close" id="accountSettingsCloseBtn">&times;</button>
      </div>
      <div class="modal-body">
        <div class="settings-grid">
          <div class="settings-item"><span class="settings-label">Username</span><span class="settings-value">${escapeHtml(data.username)}</span></div>
          <div class="settings-item"><span class="settings-label">User ID</span><span class="settings-value">${escapeHtml(data.user_id)}</span></div>
          <div class="settings-item"><span class="settings-label">HWID</span><span class="settings-value">${data.hwid ? `<code>${escapeHtml(String(data.hwid))}</code>` : '—'}</span></div>
          <div class="settings-item"><span class="settings-label">Keys Redeemed</span><span class="settings-value">${Number(data.keys_redeemed_total ?? 0) || 0}</span></div>
          <div class="settings-item"><span class="settings-label">Active Products</span><span class="settings-value">${activeCount}</span></div>
          <div class="settings-item"><span class="settings-label">HWID Resets Remaining</span><span class="settings-value">${Number(data.hwid_resets_total_remaining ?? 0) || 0}</span></div>
          <div class="settings-item"><span class="settings-label">HWID Resets Used</span><span class="settings-value">${Number(data.hwid_resets_total_used ?? 0) || 0}</span></div>
        </div>

        <h3 class="settings-subtitle">HWID Resets By Product</h3>
        <div class="table-wrapper">
          <table class="settings-table">
            <thead><tr><th>Product</th><th>Remaining</th><th>Used</th></tr></thead>
            <tbody>
              ${byAppRows || '<tr><td colspan="3">No reset tokens.</td></tr>'}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  `;

  if (!modal) {
    modal = document.createElement("div");
    modal.id = modalId;
    modal.className = "modal";
    modal.innerHTML = contentHtml;
    document.body.appendChild(modal);
  } else {
    modal.innerHTML = contentHtml;
  }

  modal.style.display = "block";

  const closeBtn = document.getElementById("accountSettingsCloseBtn");
  closeBtn?.addEventListener("click", () => (modal.style.display = "none"));

  modal.addEventListener("click", (evt) => {
    if (evt.target === modal) modal.style.display = "none";
  });
}

if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', initCustomerDashboard);
} else {
  initCustomerDashboard();
}
// Expose init for troubleshooting / manual reload
window.initCustomerDashboard = initCustomerDashboard;

function switchTab(tabName) {
  navItems.forEach(nav => nav.classList.remove('active'));
  document.querySelector(`[data-tab="${tabName}"]`).classList.add('active');
  
  tabContents.forEach(tab => tab.classList.remove('active'));
  document.getElementById(`${tabName}-tab`).classList.add('active');
  
  loadTabData(tabName);
}

function loadTabData(tabName) {
  switch(tabName) {
    case 'overview':
      loadTimeBalances();
      break;
    case 'downloads':
      loadDownloads();
      break;
    case 'redeem':
      // Nothing to load, form is static
      break;
    case 'hwid':
      loadHwidProducts();
      break;
    case 'updates':
      loadUpdates();
      break;
    case 'settings':
      loadAccountInfo();
      break;
  }
}

// Check authentication
function checkAuth() {
  const token = localStorage.getItem('authToken') || sessionStorage.getItem('authToken');
  const userType = localStorage.getItem('userType') || sessionStorage.getItem('userType');
  
  if (!token || userType !== 'customer') {
    window.location.href = '/login';
    return;
  }
  
  const username = localStorage.getItem('username') || sessionStorage.getItem('username') || 'User';
  userInitial.textContent = username.charAt(0).toUpperCase();
  usernameDisplay.textContent = username;
}

// Load account info
async function loadAccountInfo() {
  try {
    const data = await api.getAccountInfo();
    accountInfoCache = data;

    accountUsername.textContent = data.username;
    accountId.textContent = data.user_id;
    memberSince.textContent = formatDate(data.member_since || data.created_at);

    const activeProducts = Array.isArray(data.active_products) ? data.active_products : [];
    const activeCount =
      typeof data.active_products_count === "number"
        ? data.active_products_count
        : activeProducts.filter((p) => p && p.has_time).length;

    totalProducts.textContent = String(activeCount);

    const keysRedeemedEl = document.getElementById("keysRedeemedTotal");
    if (keysRedeemedEl) keysRedeemedEl.textContent = String(data.keys_redeemed_total ?? 0);

    const hwidRemainEl = document.getElementById("hwidResetsRemainingTotal");
    if (hwidRemainEl) hwidRemainEl.textContent = String(data.hwid_resets_total_remaining ?? 0);

    const hwidUsedEl = document.getElementById("hwidResetsUsedTotal");
    if (hwidUsedEl) hwidUsedEl.textContent = String(data.hwid_resets_total_used ?? 0);
  } catch (error) {
    console.error("Error loading account info:", error);
    showError("Failed to load account information");
  }
}

// Load time balances (replaces loadKeys)
async function loadTimeBalances() {
  try {
    const data = await api.getTimeBalances();
    const balances = data.balances || [];
    
    totalApps.textContent = balances.length;
    
    if (balances.length === 0) {
      timeBalancesList.innerHTML = '<div class="empty-state">No active time balances</div>';
      totalTime.textContent = '0h 0m';
      return;
    }
    
    // Calculate total time across all apps
    let totalMinutes = 0;
    balances.forEach(balance => {
      if (!balance.unlimited) totalMinutes += (balance.remaining_minutes || 0);
    });
    
    // Display total time
    const hasLifetime = balances.some(b => b.unlimited);
    totalTime.textContent = hasLifetime ? "Lifetime" : formatTime(totalMinutes);
    
    // Display individual app balances
    timeBalancesList.innerHTML = balances.map(balance => {
      const timeRemaining = balance.unlimited ? "Lifetime" : formatTime(balance.remaining_minutes || 0);
      const isExpired = (!balance.unlimited) && (balance.remaining_minutes <= 0);
      
      return `
        <div class="time-balance-item ${isExpired ? 'expired' : ''}">
          <div class="balance-header">
            <div class="balance-icon">${getProductIcon(balance.application_id)}</div>
            <div class="balance-info">
              <h4>${getProductName(balance.application_id)}</h4>
              <span class="balance-status ${isExpired ? 'expired' : 'active'}">
                ${isExpired ? 'Expired' : 'Active'}
              </span>
            </div>
          </div>
          <div class="balance-time">
            <span class="time-value">${timeRemaining}</span>
            <span class="time-label">remaining</span>
          </div>
        </div>
      `;
    }).join('');
    
  } catch (error) {
    console.error('Error loading time balances:', error);
    timeBalancesList.innerHTML = '<div class="error-state">Failed to load time balances</div>';
    totalTime.textContent = '0h 0m';
  }
}

// Load downloads with access control
async function loadDownloads() {
  try {
    const data = await api.getDownloads();
    const products = data.products || [];
    
    if (products.length === 0) {
      downloadsGrid.innerHTML = '<div class="empty-state">No products available</div>';
      return;
    }
    
    downloadsGrid.innerHTML = products.map(product => {
      const hasAccess = product.has_access || false;
      
      return `
        <div class="download-card ${hasAccess ? 'accessible' : 'locked'}">
          <div class="download-image">
            <img src="${product.image_url || '/legacy/images/product-placeholder.png'}" alt="${product.name}" 
                 onerror="this.src='/legacy/images/product-placeholder.png'">
            ${!hasAccess ? '<div class="lock-overlay"><span>🔒</span></div>' : ''}
          </div>
          <div class="download-details">
            <h3 class="download-name">${product.name}</h3>
            <span class="download-version">v${product.version}</span>
            <p class="download-desc">${product.description || 'No description available'}</p>
            <button class="download-btn ${hasAccess ? 'accessible' : 'locked'}" 
                    onclick="${hasAccess ? `downloadProduct('${product.product_id}', '${product.download_url}')` : ''}"
                    ${!hasAccess ? 'disabled' : ''}>
              <span class="btn-icon">${hasAccess ? '⬇️' : '🔒'}</span>
              <span class="btn-text">${hasAccess ? 'Download' : 'No Access'}</span>
            </button>
            ${hasAccess ? renderVersionHistory(product) : ''}
          </div>
        </div>
      `;
    }).join('');
    
  } catch (error) {
    console.error('Error loading downloads:', error);
    downloadsGrid.innerHTML = '<div class="error-state">Failed to load downloads</div>';
  }
}

// Load HWID products
async function loadHwidProducts() {
  try {
    const data = await api.getHwidProducts();
    const products = data.products || [];

    // Pull reset token balances from /customer/account
    if (!accountInfoCache) {
      try {
        accountInfoCache = await api.getAccountInfo();
      } catch (_) {
        accountInfoCache = null;
      }
    }
    const tokenByApp = (accountInfoCache && accountInfoCache.hwid_resets_by_app) ? accountInfoCache.hwid_resets_by_app : {};

    if (products.length === 0) {
      hwidProducts.innerHTML = '<div class="empty-state">No products available for HWID management</div>';
      return;
    }

    // Top summary (optional)
    const totalRemaining = accountInfoCache?.hwid_resets_total_remaining ?? Object.values(tokenByApp).reduce((a, v) => a + (Number(v?.remaining ?? 0) || 0), 0);
    const totalUsed = accountInfoCache?.hwid_resets_total_used ?? Object.values(tokenByApp).reduce((a, v) => a + (Number(v?.used ?? 0) || 0), 0);

    let html = `
      <div class="hwid-summary">
        <div class="hwid-summary-title">HWID Resets</div>
        <div class="hwid-summary-metrics">
          <span><strong>${totalRemaining}</strong> remaining</span>
          <span><strong>${totalUsed}</strong> used</span>
        </div>
      </div>
    `;

    html += products
      .map((product) => {
        const appCode = product.product_id;
        const token = tokenByApp?.[appCode] || {};
        const remaining = Number(token.remaining ?? 0) || 0;
        const used = Number(token.used ?? 0) || 0;

        const canReset = remaining > 0;

        const boundText = product.bound ? `Bound HWID: <code>${escapeHtml(product.current_hwid || '')}</code>` : "No HWID bound yet";

        return `
          <div class="hwid-product">
            <div class="hwid-product-info">
              <div class="hwid-icon">${getProductIcon(appCode)}</div>
              <div class="hwid-details">
                <h4>${escapeHtml(getProductName(appCode))}</h4>
                <div class="hwid-meta">${boundText}</div>
                <div class="hwid-tokens">
                  Resets: <strong>${remaining}</strong> remaining · <strong>${used}</strong> used
                </div>
              </div>
            </div>
            <button
              class="hwid-reset-btn"
              onclick="resetHwid('${escapeAttr(appCode)}')"
              ${!canReset ? "disabled" : ""}
            >
              ${canReset ? "Reset HWID" : "No Resets"}
            </button>
          </div>
        `;
      })
      .join("");

    hwidProducts.innerHTML = html;
  } catch (error) {
    console.error("Error loading HWID products:", error);
    showError("Failed to load HWID products");
  }
}

// Load updates
async function loadUpdates() {
  try {
    const data = await api.getUpdates();
    const updates = data.updates || [];

    if (updates.length === 0) {
      updatesContainer.innerHTML = '<div class="empty-state">No announcements yet</div>';
      return;
    }

    const formatBody = (s) => escapeHtml(s || '').split('\\n').join('<br>');

    updatesContainer.innerHTML = updates
      .map((u) => {
        const appCode = String(u.app_code || u.product_id || '').trim();
        const version = String(u.version || '').trim();
        const status = String(u.status_tag || '').trim();

        const statusChip = status
          ? `<span class="update-chip update-chip-status ${escapeHtml(status)}">${escapeHtml(status.replace(/_/g, ' '))}</span>`
          : '';

        const versionChip = version ? `<span class="update-chip">v${escapeHtml(version)}</span>` : '';

        return `
          <div class="update-item">
            <div class="update-header">
              <div class="update-titleblock">
                <div class="update-title-row">
                  <h3 class="update-title-text">${escapeHtml(u.title || '')}</h3>
                  ${appCode ? `<span class="update-chip">${escapeHtml(appCode)}</span>` : ''}
                  ${versionChip}
                  ${statusChip}
                </div>
              </div>
              <div class="update-date">${formatDate(u.created_at)}</div>
            </div>
            <div class="update-content">${formatBody(u.content || '')}</div>
          </div>
        `;
      })
      .join('');
  } catch (error) {
    console.error('Error loading updates:', error);
    updatesContainer.innerHTML = '<div class="error-state">Failed to load announcements</div>';
  }
}

// Download product
async function downloadProduct(productId, downloadUrl) {
  try {
    await api.trackDownload(productId);
    window.location.href = downloadUrl;
  } catch (error) {
    console.error('Error downloading product:', error);
    showError('Failed to initiate download');
  }
}

// Reset HWID
async function resetHwid(productId) {
  if (!confirm('Are you sure you want to reset your HWID for this product?')) {
    return;
  }
  
  try {
    await api.resetHwid(productId);
    accountInfoCache = null;
    showSuccess('HWID reset successfully!');
    await loadAccountInfo();
    loadHwidProducts();
  } catch (error) {
    console.error('Error resetting HWID:', error);
    showError(error.message || 'Failed to reset HWID');
  }
}

// Handle key redemption
async function handleRedeemKey(e) {
  e.preventDefault();
  
  const licenseKeyInput = document.getElementById('licenseKey');
  const licenseKey = licenseKeyInput.value.trim();
  
  if (!licenseKey) {
    showError('Please enter a license key');
    return;
  }
  
  const redeemBtn = redeemForm.querySelector('.redeem-btn');
  const originalText = redeemBtn.innerHTML;
  
  // Show loading state
  redeemBtn.disabled = true;
  redeemBtn.innerHTML = '<span>Activating...</span>';
  
  try {
    const data = await api.redeemKey(licenseKey);
    
    showSuccess(`Successfully activated: ${data.product_name || 'License Key'}!`);
    
    // Clear the form
    licenseKeyInput.value = '';
    
    // Reload time balances to show the new product
    loadTimeBalances();
    
  } catch (error) {
    console.error('Error redeeming key:', error);
    showError(error.message || 'Invalid or already used key');
  } finally {
    // Restore button state
    redeemBtn.disabled = false;
    redeemBtn.innerHTML = originalText;
  }
}

// ==================
// VERSION HISTORY FUNCTIONS
// ==================

/**
 * Render version history section for a product
 */
function renderVersionHistory(product) {
  if (!product.versions || product.versions.length <= 1) {
    return '';
  }

  const versions = (product.versions || []).slice().sort((a, b) => {
    const da = new Date(a.release_date || a.date || 0).getTime();
    const db = new Date(b.release_date || b.date || 0).getTime();
    return db - da;
  });

  const itemsHTML = versions
    .map((v) => {
      const version = String(v.version || '').trim();
      const isLatest = !!v.is_latest;
      const status = String(v.status || '').trim() || (isLatest ? 'latest' : 'legacy');
      const dateStr = formatDate(v.date || v.release_date || v.created_at);

      const badgeClass = isLatest ? 'latest' : status;
      const badgeLabel = isLatest ? 'latest' : (status || 'legacy');

      const isCurrent = version && String(product.version || '').trim() === version;

      return `
        <div class="version-item ${isCurrent ? 'is-current' : ''}">
          <div class="version-info">
            <div class="version-number">v${escapeHtml(version)}</div>
            <div class="version-date">${escapeHtml(dateStr)}</div>
            ${v.notes ? `<div class="version-notes">${escapeHtml(v.notes)}</div>` : ''}
          </div>
          <span class="version-badge ${escapeHtml(badgeClass)}">${escapeHtml(badgeLabel.replace(/_/g,' '))}${isCurrent ? ' • current' : ''}</span>
          <button
            class="version-download-btn"
            onclick="downloadVersion('${escapeAttr(product.product_id || product.id)}', '${escapeAttr(version)}', '${escapeAttr(v.download_url)}')">
            Download
          </button>
        </div>
      `;
    })
    .join('');

  return `
    <div class="version-history-toggle" onclick="toggleVersionHistory(this)">
      <span>All versions</span>
      <span class="toggle-icon">▼</span>
    </div>
    <div class="version-history-content">
      ${itemsHTML}
    </div>
  `;
}

/**
 * Toggle version history visibility
 */
function toggleVersionHistory(toggleButton) {
  const content = toggleButton.nextElementSibling;
  const isExpanded = content.classList.contains('expanded');
  
  // Toggle expanded state
  toggleButton.classList.toggle('expanded');
  content.classList.toggle('expanded');
  
  // Update aria label for accessibility
  toggleButton.setAttribute('aria-expanded', !isExpanded);
}

/**
 * Download a specific version
 */
async function downloadVersion(productId, version, downloadUrl) {
  try {
    console.log(`Downloading ${productId} v${version}`);
    
    // Track the download
    await api.trackDownload(productId, version);
    
    // Show notification
    showSuccess(`Downloading version ${version}...`);
    
    // Trigger download
    window.location.href = downloadUrl;
    
  } catch (error) {
    console.error('Error downloading version:', error);
    showError('Failed to initiate download');
  }
}

// Helper Functions
function getProductName(productId) {
  const products = {
    nochancext: "NoChance External",
    funext: "Fun External",
    rebel: "Rebel External",
  };
  return products[productId] || productId;
}

function getProductIcon(productId) {
  const icons = {
    'nochance': '🎮',
    'amusement': '🎯',
    'spoofer': '🛡️'
  };
  return icons[productId] || '📦';
}

function formatTime(minutes) {
  if (!minutes || minutes <= 0) return '0h 0m';
  
  const days = Math.floor(minutes / 1440);
  const hours = Math.floor((minutes % 1440) / 60);
  const mins = minutes % 60;
  
  if (days > 0) {
    return `${days}d ${hours}h ${mins}m`;
  } else if (hours > 0) {
    return `${hours}h ${mins}m`;
  } else {
    return `${mins}m`;
  }
}

function formatDate(dateString) {
  if (!dateString) return 'N/A';
  const date = new Date(dateString);
  return date.toLocaleDateString('en-US', { 
    year: 'numeric', 
    month: 'short', 
    day: 'numeric' 
  });
}

function checkCooldown(lastResetDate, cooldownHours) {
  if (!lastResetDate) return true;
  const lastReset = new Date(lastResetDate);
  const now = new Date();
  const hoursSinceReset = (now - lastReset) / (1000 * 60 * 60);
  return hoursSinceReset >= cooldownHours;
}

function getRemainingCooldown(lastResetDate, cooldownHours) {
  const lastReset = new Date(lastResetDate);
  const now = new Date();
  const hoursSinceReset = (now - lastReset) / (1000 * 60 * 60);
  const hoursRemaining = Math.ceil(cooldownHours - hoursSinceReset);
  
  if (hoursRemaining < 24) {
    return `${hoursRemaining} hour${hoursRemaining !== 1 ? 's' : ''}`;
  } else {
    const daysRemaining = Math.ceil(hoursRemaining / 24);
    return `${daysRemaining} day${daysRemaining !== 1 ? 's' : ''}`;
  }
}

function showSuccess(message) {
  const notification = document.createElement('div');
  notification.textContent = message;
  notification.style.cssText = `
    position: fixed; top: 100px; right: 32px;
    background: rgba(16, 185, 129, 0.9); color: white;
    padding: 16px 24px; border-radius: 12px;
    box-shadow: 0 8px 32px rgba(16, 185, 129, 0.3);
    z-index: 10000; animation: slideIn 0.3s ease;
  `;
  document.body.appendChild(notification);
  setTimeout(() => {
    notification.style.animation = 'slideOut 0.3s ease';
    setTimeout(() => notification.remove(), 300);
  }, 3000);
}

function showError(message) {
  const notification = document.createElement('div');
  notification.textContent = message;
  notification.style.cssText = `
    position: fixed; top: 100px; right: 32px;
    background: rgba(239, 68, 68, 0.9); color: white;
    padding: 16px 24px; border-radius: 12px;
    box-shadow: 0 8px 32px rgba(239, 68, 68, 0.3);
    z-index: 10000; animation: slideIn 0.3s ease;
  `;
  document.body.appendChild(notification);
  setTimeout(() => {
    notification.style.animation = 'slideOut 0.3s ease';
    setTimeout(() => notification.remove(), 300);
  }, 3000);
}

// Disable right-click
document.addEventListener('contextmenu', e => e.preventDefault());

function escapeHtml(str) {
  return String(str ?? "")
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
}

function escapeAttr(str) {
  return String(str ?? "").replace(/'/g, "\'");
}
