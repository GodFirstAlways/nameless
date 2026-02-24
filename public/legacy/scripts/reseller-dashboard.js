// reseller-dashboard.js - Reseller Dashboard Logic (V2)

// Initialize API service
const API_BASE_URL = window.API_BASE_URL || 'http://localhost:8000';
const api = new ResellerAPI(API_BASE_URL);

// DOM Elements - will be initialized after DOM loads
let usernameDisplay, totalSales, activeKeys, totalUsers, activityList;
let stockOverview, productSelector, selectedProduct, productDropdown;
let selectedProductId, keyGenForm, generatedKeys, generatedKeysList;
let usersTableBody, userSearch, updatesContainer, logoutBtn, userInitial;
let bulkActionsBar, selectedCount, actionsMenu, navItems, tabContents;

// State
let currentPage = 1;
const usersPerPage = 10;
let allUsers = [];
let filteredUsers = [];
let selectedUsers = new Set();
let currentMenuUserId = null;
let availableProducts = [];



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

// In React dev/StrictMode the dashboard can mount/unmount and the legacy scripts can
// remain loaded. That can leave element-bound listeners attached to old DOM nodes.
// Use document-level delegation for modal confirm buttons so actions still fire.
function initModalConfirmDelegation() {
  if (window.__resellerModalDelegationInitialized) return;
  window.__resellerModalDelegationInitialized = true;

  document.addEventListener(
    'click',
    (e) => {
      const t = e.target;
      const freezeBtn = t && t.closest ? t.closest('#confirmFreezeTime') : null;
      if (freezeBtn) {
        e.preventDefault();
        handleConfirmFreezeTime();
        return;
      }

      const unfreezeBtn = t && t.closest ? t.closest('#confirmUnfreezeTime') : null;
      if (unfreezeBtn) {
        e.preventDefault();
        handleConfirmUnfreezeTime();
      }
    },
    true
  );
}

function initResellerDashboard() {
  if (window.__resellerDashboardInitialized) return;
  window.__resellerDashboardInitialized = true;
  // Get DOM Elements
  usernameDisplay = document.getElementById('username');
  totalSales = document.getElementById('totalSales');
  activeKeys = document.getElementById('activeKeys');
  totalUsers = document.getElementById('totalUsers');
  activityList = document.getElementById('activityList');
  stockOverview = document.getElementById('stockOverview');
  productSelector = document.getElementById('productSelector');
  selectedProduct = document.getElementById('selectedProduct');
  productDropdown = document.getElementById('productDropdown');
  selectedProductId = document.getElementById('selectedProductId');
  keyGenForm = document.getElementById('keyGenForm');
  generatedKeys = document.getElementById('generatedKeys');
  generatedKeysList = document.getElementById('generatedKeysList');
  usersTableBody = document.getElementById('usersTableBody');
  userSearch = document.getElementById('userSearch');
  updatesContainer = document.getElementById('updatesContainer');
  logoutBtn = document.getElementById('logoutBtn');
  userInitial = document.getElementById('userInitial');
  bulkActionsBar = document.getElementById('bulkActionsBar');
  selectedCount = document.getElementById('selectedCount');
  actionsMenu = document.getElementById('actionsMenu');
  navItems = document.querySelectorAll('.nav-item');
  tabContents = document.querySelectorAll('.tab-content');

  // Authentication check
  checkAuth();
  initUserMenu();
  initModalConfirmDelegation();
  initAccountSettingsUI();

  // Tab Navigation
  navItems.forEach(item => {
    item.addEventListener('click', (e) => {
      e.preventDefault();
      const tabName = item.dataset.tab;
      switchTab(tabName);
    });
  });

  // Product selector dropdown toggle
  selectedProduct.addEventListener('click', () => {
    productDropdown.classList.toggle('show');
  });

  // Close dropdown when clicking outside
  document.addEventListener('click', (e) => {
    if (!productSelector.contains(e.target)) {
      productDropdown.classList.remove('show');
    }
  });

  // Key generation form
  keyGenForm.addEventListener('submit', handleKeyGeneration);

  // User search
  userSearch.addEventListener('input', handleUserSearch);

  // Users table delegation
  // (Avoid inline onclick/onchange attributes that can silently break when
  // scripts are injected as modules inside the React SPA.)
  if (usersTableBody) {
    usersTableBody.addEventListener('change', (e) => {
      const t = e.target;
      const cb = t && t.closest ? t.closest('input.user-select') : null;
      if (!cb) return;
      const uid = cb.getAttribute('data-user-id');
      if (uid) toggleUserSelection(uid);
    });

    usersTableBody.addEventListener('click', (e) => {
      const t = e.target;
      const btn = t && t.closest ? t.closest('button.actions-trigger') : null;
      if (!btn) return;
      const uid = btn.getAttribute('data-user-id');
      if (!uid) return;
      const u = allUsers.find(x => String(x.user_id) === String(uid));
      openActionsMenu(e, uid, u ? u.username : '', u ? u.status : '');
    });
  }

  // Pagination buttons
  document.getElementById('prevPage').addEventListener('click', handlePrevPage);
  document.getElementById('nextPage').addEventListener('click', handleNextPage);
  
  // Copy all keys button
  document.getElementById('copyAllBtn').addEventListener('click', copyAllGeneratedKeys);
  
  // Modal event listeners
  // Note: Ban/Unban and Add-Time actions are intentionally disabled for resellers.
  // Freeze time (per-reseller buckets)
  const freezeProductSel = document.getElementById('freezeTimeProduct');
  if (freezeProductSel) {
    freezeProductSel.addEventListener('change', updateFreezeTimeInfo);
  }
  const freezeBtn = document.getElementById('confirmFreezeTime');
  if (freezeBtn) {
    freezeBtn.addEventListener('click', handleConfirmFreezeTime);
  }
  const unfreezeBtn = document.getElementById('confirmUnfreezeTime');
  if (unfreezeBtn) {
    unfreezeBtn.addEventListener('click', handleConfirmUnfreezeTime);
  }

  // Logout
  logoutBtn.addEventListener('click', (e) => {
    e.preventDefault();
    if (window.AuthCheck) {
      window.AuthCheck.clearAuth();
    }
    window.location.href = '/login';
  });

  // Close actions menu when clicking outside
  document.addEventListener('click', (e) => {
    if (!actionsMenu.contains(e.target) && !e.target.closest('.actions-trigger')) {
      actionsMenu.style.display = 'none';
    }
  });

  // Initial load
  loadStats();
  loadActivity();
}

// Support running inside a SPA where scripts may load after DOMContentLoaded
  
// Account settings modal (dashboard "Settings" button)
function initAccountSettingsUI() {
  const btn = document.getElementById("settingsBtn");
  if (!btn) return;
  btn.addEventListener("click", async (e) => {
    e.preventDefault();
    await openResellerSettingsModal();
  });
}

async function openResellerSettingsModal() {
  const who = await api.getWhoami();
  const stats = await api.getStats();

  const modalId = "resellerSettingsModal";
  let modal = document.getElementById(modalId);

  const byApp = who.keys_redeemed_by_app || {};
  const tokensByApp = who.hwid_resets_by_app || who.hwid_tokens_by_app || {};
  const tokenTotal = Object.values(tokensByApp).reduce((acc, v) => {
    if (v == null) return acc;
    if (typeof v === 'number') return acc + v;
    if (typeof v === 'object') return acc + Number(v.remaining ?? v.balance ?? v.total ?? 0);
    return acc;
  }, 0);

  const tokenRows = Object.keys(tokensByApp)
    .sort()
    .map((app) => {
      const obj = tokensByApp[app];
      const remaining = typeof obj === 'object' ? Number(obj.remaining ?? obj.balance ?? obj.total ?? 0) : Number(obj ?? 0);
      return `<tr><td>${escapeHtml(getProductName(app))}</td><td>${remaining || 0}</td></tr>`;
    })
    .join("");
  const byAppRows = Object.keys(byApp)
    .sort()
    .map((app) => {
      const redeemed = Number(byApp[app] ?? 0) || 0;
      return `<tr><td>${escapeHtml(getProductName(app))}</td><td>${redeemed}</td></tr>`;
    })
    .join("");

  const contentHtml = `
    <div class="modal-content">
      <div class="modal-header">
        <h2>Account Settings</h2>
        <button class="modal-close" id="resellerSettingsCloseBtn">&times;</button>
      </div>
      <div class="modal-body">
        <div class="settings-grid">
          <div class="settings-item"><span class="settings-label">Username</span><span class="settings-value">${escapeHtml(who.username)}</span></div>
          <div class="settings-item"><span class="settings-label">User ID</span><span class="settings-value">${escapeHtml(who.user_id)}</span></div>

                    <div class="settings-item"><span class="settings-label">HWID Tokens (Total)</span><span class="settings-value">${Number(tokenTotal || 0) || 0}</span></div>

          <div class="settings-item"><span class="settings-label">Keys Generated</span><span class="settings-value">${Number(stats.keys_generated ?? who.keys_generated ?? 0) || 0}</span></div>
          <div class="settings-item"><span class="settings-label">Keys Redeemed</span><span class="settings-value">${Number(stats.keys_redeemed ?? who.keys_redeemed ?? 0) || 0}</span></div>
        </div>

        <h3 class="settings-subtitle">Redemptions By Product</h3>
        <div class="table-wrapper">
          <table class="settings-table">
            <thead><tr><th>Product</th><th>Redeemed</th></tr></thead>
            <tbody>
              ${byAppRows || '<tr><td colspan="2">No redemptions yet.</td></tr>'}
            </tbody>
          </table>
        </div>

        <h3 class="settings-subtitle">HWID Tokens By Product</h3>
        <div class="table-wrapper">
          <table class="settings-table">
            <thead><tr><th>Product</th><th>Tokens</th></tr></thead>
            <tbody>
              ${tokenRows || '<tr><td colspan="2">No HWID tokens assigned.</td></tr>'}
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

  const closeBtn = document.getElementById("resellerSettingsCloseBtn");
  closeBtn?.addEventListener("click", () => (modal.style.display = "none"));

  modal.addEventListener("click", (evt) => {
    if (evt.target === modal) modal.style.display = "none";
  });
}

// Basic escaping (for injected HTML)
function escapeHtml(str) {
  return String(str ?? "")
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
}

if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', initResellerDashboard);
} else {
  initResellerDashboard();
}

window.initResellerDashboard = initResellerDashboard;

// Ensure modal confirm buttons always work even if React remounts the DOM.
// Safe to call multiple times (guarded internally).
initModalConfirmDelegation();

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
      loadStats();
      loadActivity();
      break;
    case 'stock':
      loadStock();
      loadProductsForSelector();
      break;
    case 'users':
      loadUsers();
      break;
    case 'updates':
      loadUpdates();
      break;
  }
}

// Check authentication
function checkAuth() {
  const token = localStorage.getItem('authToken') || sessionStorage.getItem('authToken');
  const userType = localStorage.getItem('userType') || sessionStorage.getItem('userType');
  
  const allowedRoles = ['owner', 'co_owner', 'reseller'];
  
  if (!token || !allowedRoles.includes(userType)) {
    window.location.href = '/login';
    return;
  }
  
  const username = localStorage.getItem('username') || sessionStorage.getItem('username') || 'User';
  userInitial.textContent = username.charAt(0).toUpperCase();
  
  const dashboardTitle = document.querySelector('.dashboard-title');
  if (dashboardTitle) {
    if (userType === 'owner' || userType === 'co_owner') {
      dashboardTitle.textContent = 'Admin Portal';
    } else {
      dashboardTitle.textContent = 'Reseller Portal';
    }
  }
  
  usernameDisplay.textContent = username;
}

// Load statistics
async function loadStats() {
  try {
    const [stats, who] = await Promise.all([
      api.getStats(),
      api.getWhoami().catch(() => null),
    ]);

    // Keys generated (total)
    totalSales.textContent = stats.keys_generated ?? 0;

    // HWID tokens total (sum across apps)
    const tokensByApp = (who && (who.hwid_resets_by_app || who.hwid_tokens_by_app)) || {};
    const tokenTotal = Object.values(tokensByApp).reduce((acc, v) => {
      if (v == null) return acc;
      if (typeof v === 'number') return acc + v;
      if (typeof v === 'object') return acc + Number(v.remaining ?? v.balance ?? v.total ?? 0);
      return acc;
    }, 0);
    totalUsers.textContent = String(Number(tokenTotal || 0) || 0);

    // Stock available
    loadAvailableKeysCount();
  } catch (error) {
    console.error("Error loading stats:", error);
  }
}

async function loadAvailableKeysCount() {
  try {
    const data = await api.getStock();
    const products = data.products || [];
    
    let totalAvailable = 0;
    for (const product of products) {
      if (!product?.unlocked) continue;
      const limits = product?.limits || {};
      for (const dur of ['1day','1week','1month','3months','lifetime']) {
        const row = limits[dur];
        if (!row) continue;
        const avail = Number(row.available ?? 0);
        if (!Number.isNaN(avail)) totalAvailable += avail;
      }
    }
    
    if (activeKeys) {
      activeKeys.textContent = String(totalAvailable);
    }
  } catch (error) {
    console.warn('Failed to load available keys count:', error);
    if (activeKeys) {
      activeKeys.textContent = '0';
    }
  }
}

// Load activity
async function loadActivity() {
  try {
    const data = await api.getActivity();
    const activities = data.activities || [];
    
    if (activities.length === 0) {
      activityList.innerHTML = '<div class="empty-state">No recent activity</div>';
      return;
    }
    
    activityList.innerHTML = activities.map(activity => `
      <div class="activity-item">
        <div>${activity.description}</div>
        <div class="activity-time">${formatDateTime(activity.timestamp)}</div>
      </div>
    `).join('');
  } catch (error) {
    console.error('Error loading activity:', error);
    activityList.innerHTML = '<div class="error-state">Failed to load activity</div>';
  }
}

// Load stock overview
async function loadStock() {
  try {
    const data = await api.getStock();
    const products = data.products || [];
    
    if (products.length === 0) {
      stockOverview.innerHTML = '<div class="empty-state">No stock information available</div>';
      return;
    }
    
    stockOverview.innerHTML = products.map(product => {
      if (!product.unlocked) {
        return `
          <div class="stock-card locked">
            <div class="stock-header">
              <h3>${product.product_name}</h3>
              <span class="locked-badge">🔒 Locked</span>
            </div>
          </div>
        `;
      }
      
      const limits = product.limits;
      const hwidLine = product.hwid
        ? `<div class="stock-submeta">HWID: <code>${escapeHtml(String(product.hwid))}</code></div>`
        : `<div class="stock-submeta">HWID: <span style="opacity:0.75">—</span></div>`;
      return `
        <div class="stock-card">
          <div class="stock-header">
            <h3>${product.product_name}</h3>
            <span class="compensation-badge">HWID Tokens: ${limits.compensation || 0}</span>
          </div>
          ${hwidLine}
          <table class="stock-table">
            <thead>
              <tr>
                <th>Duration</th>
                <th>Available</th>
                <th>Used</th>
                <th>Total</th>
              </tr>
            </thead>
            <tbody>
              <tr>
                <td>1 Day</td>
                <td class="available-cell">${limits['1day']?.available || 0}</td>
                <td class="used-cell">${limits['1day']?.used || 0}</td>
                <td>${limits['1day']?.total || 0}</td>
              </tr>
              <tr>
                <td>1 Week</td>
                <td class="available-cell">${limits['1week']?.available || 0}</td>
                <td class="used-cell">${limits['1week']?.used || 0}</td>
                <td>${limits['1week']?.total || 0}</td>
              </tr>
              <tr>
                <td>1 Month</td>
                <td class="available-cell">${limits['1month']?.available || 0}</td>
                <td class="used-cell">${limits['1month']?.used || 0}</td>
                <td>${limits['1month']?.total || 0}</td>
              </tr>
              <tr>
                <td>Lifetime</td>
                <td class="available-cell">${limits['lifetime']?.available || 0}</td>
                <td class="used-cell">${limits['lifetime']?.used || 0}</td>
                <td>${limits['lifetime']?.total || 0}</td>
              </tr>
            </tbody>
          </table>
        </div>
      `;
    }).join('');
    
    // Update stats: total available keys across all unlocked products/durations
    // Only update if we're actually on the stock tab to prevent flash on other tabs
    try {
      let totalAvailable = 0;
      for (const product of products) {
        if (!product?.unlocked) continue;
        const limits = product?.limits || {};
        for (const dur of ['1day','1week','1month','3months','lifetime']) {
          const row = limits[dur];
          if (!row) continue;
          const avail = Number(row.available ?? 0);
          if (!Number.isNaN(avail)) totalAvailable += avail;
        }
      }
      // Only update the stat if stock tab is currently active
      const stockTab = document.getElementById('stock-tab');
      const overviewTab = document.getElementById('overview-tab');
      if (activeKeys && (stockTab?.classList.contains('active') || !overviewTab?.classList.contains('active'))) {
        activeKeys.textContent = String(totalAvailable);
      }
    } catch (e) {
      console.warn('Failed to compute total available keys:', e);
    }
    
  } catch (error) {
    console.error('Error loading stock:', error);
    stockOverview.innerHTML = '<div class="error-state">Failed to load stock</div>';
  }
}

// Load products for fancy selector
async function loadProductsForSelector() {
  try {
    const data = await api.getStock();
    availableProducts = data.products || [];
    
    productDropdown.innerHTML = availableProducts.map(product => `
      <div class="product-option ${product.unlocked ? 'unlocked' : 'locked'}" 
           data-product-id="${product.product_id}"
           onclick="selectProduct('${product.product_id}', '${product.product_name}', ${product.unlocked})">
        <div class="product-icon">${getProductIcon(product.product_id)}</div>
        <div class="product-info">
          <div class="product-name">${product.product_name}</div>
          ${!product.unlocked ? '<div class="locked-label">🔒 Locked</div>' : ''}
        </div>
        ${product.unlocked ? '<div class="glow-effect"></div>' : ''}
      </div>
    `).join('');
    
  } catch (error) {
    console.error('Error loading products:', error);
    productDropdown.innerHTML = '<div class="error-small">Failed to load products</div>';
  }
}

function selectProduct(productId, productName, unlocked) {
  if (!unlocked) {
    showError('This product is locked');
    return;
  }
  
  selectedProductId.value = productId;
  selectedProduct.querySelector('.placeholder').textContent = productName;
  selectedProduct.classList.add('has-selection');
  productDropdown.classList.remove('show');
}

// Key generation handler function
async function handleKeyGeneration(e) {
  e.preventDefault();
  
  const productId = selectedProductId.value;
  const quantity = parseInt(document.getElementById('quantity').value);
  const duration = document.getElementById('duration').value;
  
  if (!productId || !quantity || !duration) {
    showError('Please fill in all fields');
    return;
  }
  
  const generateBtn = keyGenForm.querySelector('.generate-btn');
  generateBtn.classList.add('loading');
  generateBtn.disabled = true;
  
  try {
    const data = await api.generateKeys(productId, quantity, duration);
    const keys = data.keys || [];
    
    displayGeneratedKeys(keys);
    loadStock(); // Reload stock
    showSuccess(`Successfully generated ${keys.length} key(s)`);
    
    // Reset form
    keyGenForm.reset();
    selectedProductId.value = '';
    selectedProduct.querySelector('.placeholder').textContent = 'Select an application';
    selectedProduct.classList.remove('has-selection');
    
  } catch (error) {
    console.error('Error generating keys:', error);
    showError(error.message || 'Failed to generate keys');
  } finally {
    generateBtn.classList.remove('loading');
    generateBtn.disabled = false;
  }
}

function displayGeneratedKeys(keys) {
  generatedKeysList.innerHTML = keys.map(key => `
    <div class="generated-key-item">
      <span class="key-text">${key}</span>
      <button class="copy-key-btn" onclick="copyToClipboard('${key}')">Copy</button>
    </div>
  `).join('');
  
  generatedKeys.style.display = 'block';
}

// Copy all keys function (called from onclick in HTML or dynamically added buttons)
function copyAllGeneratedKeys() {
  const keyElements = document.querySelectorAll('.key-text');
  const keysText = Array.from(keyElements).map(el => el.textContent).join('\n');
  copyToClipboard(keysText, true);
}

// Load users
async function loadUsers() {
  try {
    const data = await api.getUsers();
    allUsers = data.users || [];
    filteredUsers = allUsers;
    renderUsers();
    // Update reseller stats: total users connected to this reseller
    if (typeof totalUsersEl !== 'undefined' && totalUsersEl) {
      totalUsersEl.textContent = String(allUsers.length);
    }
  } catch (error) {
    console.error('Error loading users:', error);
    usersTableBody.innerHTML = '<tr><td colspan="7" class="error-state">Failed to load users</td></tr>';
  }
}

function renderUsers() {
  if (filteredUsers.length === 0) {
    usersTableBody.innerHTML = '<tr><td colspan="7" class="empty-state">No users found</td></tr>';
    updatePagination(0);
    return;
  }
  
  const start = (currentPage - 1) * usersPerPage;
  const end = start + usersPerPage;
  const paginatedUsers = filteredUsers.slice(start, end);
  
  usersTableBody.innerHTML = paginatedUsers.map(user => {
    const isSelected = selectedUsers.has(String(user.user_id));
    const timeDisplay = formatUserTime(user.balances || []);
    
    return `
      <tr class="${isSelected ? 'selected' : ''}">
        <td class="checkbox-cell">
          <input
            type="checkbox"
            class="user-select"
            data-user-id="${user.user_id}"
            ${isSelected ? 'checked' : ''}
          >
        </td>
        <td>${user.username}</td>
        <td>${user.products.map(p => getProductName(p)).join(', ')}</td>
        <td class="time-cell">${timeDisplay}</td>
        <td><code>${user.hwid || 'Not bound'}</code></td>
        <td><span class="user-status ${user.status}">${user.status}</span></td>
        <td>
          <button class="actions-trigger" data-user-id="${user.user_id}" type="button" aria-label="User actions">
            ⋮
          </button>
        </td>
      </tr>
    `;
  }).join('');
  
  updatePagination(filteredUsers.length);
  updateBulkActionsBar();
}

function formatUserTime(balances) {
  if (!Array.isArray(balances) || balances.length === 0) {
    return 'No time';
  }

  // Show total remaining time per product, plus reseller-scoped breakdown.
  return balances.map(b => {
    const name = getProductName(b.app_code);
    const total = formatSeconds(b.seconds, b.unlimited);
    const mineActive = formatSeconds(b.my_seconds, b.my_unlimited);
    const mineFrozen = formatSeconds(b.my_frozen_seconds, b.my_frozen_unlimited);

    const parts = [];
    if (mineActive !== '0m') parts.push(`mine: ${mineActive}`);
    if (mineFrozen !== '0m') parts.push(`frozen: ${mineFrozen}`);
    const extra = parts.length ? ` <span class="muted">(${parts.join(', ')})</span>` : '';

    return `${name}: ${total}${extra}`;
  }).join('<br>');
}

function updatePagination(totalUsers) {
  const totalPages = Math.ceil(totalUsers / usersPerPage);
  document.getElementById('pageInfo').textContent = `Page ${currentPage} of ${totalPages || 1}`;
  
  document.getElementById('prevPage').disabled = currentPage === 1;
  document.getElementById('nextPage').disabled = currentPage === totalPages || totalPages === 0;
}

// Pagination functions
function handlePrevPage() {
  if (currentPage > 1) {
    currentPage--;
    renderUsers();
  }
}

function handleNextPage() {
  const totalPages = Math.ceil(filteredUsers.length / usersPerPage);
  if (currentPage < totalPages) {
    currentPage++;
    renderUsers();
  }
}

// User search handler function
function handleUserSearch(e) {
  const searchTerm = e.target.value.toLowerCase();
  filteredUsers = allUsers.filter(user => 
    user.username.toLowerCase().includes(searchTerm)
  );
  currentPage = 1;
  renderUsers();
}

// Selection management
function toggleSelectAll() {
  const checkbox = document.getElementById('selectAll');
  if (checkbox.checked) {
    filteredUsers.forEach(user => selectedUsers.add(String(user.user_id)));
  } else {
    selectedUsers.clear();
  }
  renderUsers();
}

function toggleUserSelection(userId) {
  const uid = String(userId);
  if (selectedUsers.has(uid)) {
    selectedUsers.delete(uid);
  } else {
    selectedUsers.add(uid);
  }
  updateBulkActionsBar();
  
  // Update select all checkbox
  const selectAllCheckbox = document.getElementById('selectAll');
  selectAllCheckbox.checked = selectedUsers.size === filteredUsers.length && filteredUsers.length > 0;
}

function updateBulkActionsBar() {
  if (selectedUsers.size > 0) {
    bulkActionsBar.style.display = 'flex';
    selectedCount.textContent = selectedUsers.size;
  } else {
    bulkActionsBar.style.display = 'none';
  }
}

function clearSelection() {
  selectedUsers.clear();
  renderUsers();
}

// Actions menu
function openActionsMenu(event, userId, username, status) {
  event.stopPropagation();
  currentMenuUserId = String(userId);
  
  // Time freezing is per-reseller bucket (not an account status).
  
  // Position menu near click
  const rect = event.target.getBoundingClientRect();
  actionsMenu.style.display = 'block';
  actionsMenu.style.top = `${rect.bottom + 5}px`;
  actionsMenu.style.left = `${rect.left - 100}px`;
}

async function menuAction(action) {
  actionsMenu.style.display = 'none';
  
  const user = allUsers.find(u => String(u.user_id) === String(currentMenuUserId));
  if (!user) return;
  
  switch(action) {
    case 'freeze':
      openFreezeTimeModal(currentMenuUserId, user.username, user.balances || []);
      break;
    case 'unfreeze':
      if (!confirm('Unfreeze time for this customer? (only time sold by you)')) return;
      try {
        await api.unfreezeUser(currentMenuUserId);
        showSuccess('Time unfrozen');
        loadUsers();
      } catch (error) {
        console.error('Error unfreezing user:', error);
        showError(error.message || 'Failed to unfreeze');
      }
      break;
    case 'clear-hwid':
      await clearUserHwid(currentMenuUserId, user.products);
      break;
  }
}

// Bulk actions
async function bulkAction(action) {
  if (selectedUsers.size === 0) return;
  
  const userIds = Array.from(selectedUsers);
  
  switch(action) {
    case 'freeze':
      if (!confirm(`Freeze time for ${userIds.length} user(s)? (only time sold by you)`)) return;
      for (const userId of userIds) {
        try {
          await api.freezeUser(userId);
        } catch (error) {
          console.error(`Error freezing user ${userId}:`, error);
        }
      }
      showSuccess(`Froze time for ${userIds.length} user(s)`);
      break;
    case 'unfreeze':
      if (!confirm(`Unfreeze time for ${userIds.length} user(s)? (only time sold by you)`)) return;
      for (const userId of userIds) {
        try {
          await api.unfreezeUser(userId);
        } catch (error) {
          console.error(`Error unfreezing user ${userId}:`, error);
        }
      }
      showSuccess(`Unfroze time for ${userIds.length} user(s)`);
      break;
    case 'clear-hwid':
      if (!confirm(`Clear HWID for ${userIds.length} user(s)?`)) return;

      // Backend requires an app_code to charge the reseller token bucket against.
      const allCodes = Array.from(new Set(filteredUsers.flatMap(u => (u.products || [])).filter(Boolean)));
      const suggested = allCodes.length ? String(allCodes[0]) : '';
      const hint = allCodes.length ? `\n\nAvailable product codes: ${allCodes.join(', ')}` : '';
      const appCode = (prompt(`Product code to charge HWID tokens against for this bulk action:${hint}`, suggested) || '').trim();
      if (!appCode) {
        showError('Product code is required to clear HWID');
        return;
      }

      for (const userId of userIds) {
        try {
          await api.clearHwid(userId, appCode);
        } catch (error) {
          console.error(`Error clearing HWID for user ${userId}:`, error);
        }
      }
      showSuccess(`Cleared HWID for ${userIds.length} user(s)`);
      break;
  }
  
  clearSelection();
  loadUsers();
}

function openAddTimeModal(userId, username, products) {
  currentMenuUserId = userId;
  document.getElementById('addTimeUsername').textContent = username;
  
  // Populate product dropdown
  const productSelect = document.getElementById('addTimeProduct');
  productSelect.innerHTML = products.map(p => 
    `<option value="${p}">${getProductName(p)}</option>`
  ).join('');
  
  document.getElementById('addTimeModal').classList.add('show');
}

// Freeze time modal (per-reseller bucket freeze/unfreeze)
let currentFreezeBalances = [];

function openFreezeTimeModal(userId, username, balances) {
  currentMenuUserId = userId;
  currentFreezeBalances = Array.isArray(balances) ? balances : [];

  const nameEl = document.getElementById('freezeTimeUsername');
  if (nameEl) nameEl.textContent = username;

  const productSelect = document.getElementById('freezeTimeProduct');
  if (!productSelect) {
    showError('Freeze modal not available (missing UI element)');
    return;
  }

  // Only show products where *this reseller* has any bucket (active or frozen).
  const eligible = currentFreezeBalances.filter(b =>
    (Number(b.my_seconds || 0) > 0) || !!b.my_unlimited || (Number(b.my_frozen_seconds || 0) > 0) || !!b.my_frozen_unlimited
  );

  productSelect.innerHTML = [
    `<option value="">All products (my time)</option>`,
    ...eligible.map(b => `<option value="${b.app_code}">${getProductName(b.app_code)}</option>`)
  ].join('');

  // Default to "All products" to avoid accidental single-product freeze.
  productSelect.value = '';

  updateFreezeTimeInfo();
  document.getElementById('freezeTimeModal').classList.add('show');
}

function updateFreezeTimeInfo() {
  const infoEl = document.getElementById('freezeTimeInfo');
  const sel = document.getElementById('freezeTimeProduct');
  if (!infoEl || !sel) return;

  const appCode = sel.value || null;
  if (!appCode) {
    // Aggregate across apps
    const agg = currentFreezeBalances.reduce((acc, b) => {
      acc.my_seconds += Number(b.my_seconds || 0);
      acc.my_unlimited = acc.my_unlimited || !!b.my_unlimited;
      acc.my_frozen_seconds += Number(b.my_frozen_seconds || 0);
      acc.my_frozen_unlimited = acc.my_frozen_unlimited || !!b.my_frozen_unlimited;
      return acc;
    }, { my_seconds: 0, my_unlimited: false, my_frozen_seconds: 0, my_frozen_unlimited: false });

    infoEl.innerHTML = `This only affects time sold by you.<br>` +
      `My active: <strong>${formatSeconds(agg.my_seconds, agg.my_unlimited)}</strong> • ` +
      `My frozen: <strong>${formatSeconds(agg.my_frozen_seconds, agg.my_frozen_unlimited)}</strong>`;
    return;
  }

  const bal = currentFreezeBalances.find(b => String(b.app_code) === String(appCode));
  if (!bal) {
    infoEl.textContent = 'No balance data for this product.';
    return;
  }

  infoEl.innerHTML = `This only affects time sold by you for <strong>${getProductName(appCode)}</strong>.<br>` +
    `Total remaining: <strong>${formatSeconds(bal.seconds, bal.unlimited)}</strong><br>` +
    `My active: <strong>${formatSeconds(bal.my_seconds, bal.my_unlimited)}</strong> • ` +
    `My frozen: <strong>${formatSeconds(bal.my_frozen_seconds, bal.my_frozen_unlimited)}</strong>`;
}

function closeModal(modalId) {
  document.getElementById(modalId).classList.remove('show');
}

// Modal action handler functions
async function handleConfirmAddTime() {
  const productId = document.getElementById('addTimeProduct').value;
  const minutes = parseInt(document.getElementById('addTimeDuration').value);
  const useComp = document.getElementById('useCompensation').checked;
  
  try {
    await api.addTime(currentMenuUserId, productId, minutes, useComp);
    showSuccess('Time added successfully');
    closeModal('addTimeModal');
    loadUsers();
  } catch (error) {
    console.error('Error adding time:', error);
    showError(error.message || 'Failed to add time');
  }
}

async function handleConfirmFreezeTime() {
  const sel = document.getElementById('freezeTimeProduct');
  const appCode = sel ? (sel.value || null) : null;
  try {
    await api.freezeUser(currentMenuUserId, appCode);
    showSuccess(appCode ? `Froze your time for ${getProductName(appCode)}` : 'Froze your time for all products');
    closeModal('freezeTimeModal');
    loadUsers();
  } catch (error) {
    console.error('Error freezing time:', error);
    showError(error.message || 'Failed to freeze time');
  }
}

async function handleConfirmUnfreezeTime() {
  const sel = document.getElementById('freezeTimeProduct');
  const appCode = sel ? (sel.value || null) : null;
  try {
    await api.unfreezeUser(currentMenuUserId, appCode);
    showSuccess(appCode ? `Unfroze your time for ${getProductName(appCode)}` : 'Unfroze your time for all products');
    closeModal('freezeTimeModal');
    loadUsers();
  } catch (error) {
    console.error('Error unfreezing time:', error);
    showError(error.message || 'Failed to unfreeze time');
  }
}

// Show stock warning when compensation unchecked
function handleCompensationChange(e) {
  document.getElementById('stockWarning').style.display = e.target.checked ? 'none' : 'block';
}

// User management functions
async function freezeUser(userId) {
  if (!confirm('Freeze this user?')) return;
  
  try {
    await api.freezeUser(userId);
    showSuccess('User frozen');
    loadUsers();
  } catch (error) {
    console.error('Error freezing user:', error);
    showError('Failed to freeze user');
  }
}

async function unfreezeUser(userId) {
  try {
    await api.unfreezeUser(userId);
    showSuccess('User unfrozen');
    loadUsers();
  } catch (error) {
    console.error('Error unfreezing user:', error);
    showError('Failed to unfreeze user');
  }
}

async function clearUserHwid(userId, products) {
  if (!confirm('Clear this customer\'s HWID?')) return;

  // Backend requires an app_code to charge the token bucket against.
  // Default to the first product in the user's list to make it quick.
  const list = Array.isArray(products) ? products.filter(Boolean) : [];
  const suggested = list.length ? String(list[0]) : '';
  const hint = list.length ? `\n\nAvailable product codes: ${list.join(', ')}` : '';
  const appCode = (prompt(`Product code to charge HWID token against:${hint}`, suggested) || '').trim();
  if (!appCode) {
    showError('Product code is required to clear HWID');
    return;
  }

  try {
    await api.clearHwid(userId, appCode);
    showSuccess('HWID cleared');
    loadUsers();
  } catch (error) {
    console.error('Error clearing HWID:', error);
    showError(error.message || 'Failed to clear HWID');
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

// Helper Functions
function getProductName(productId) {
  const products = {
    'nochancext': 'NoChance External',
    'funext': 'Fun External',
    'rebel': 'Rebel',
    'universal': 'Universal Spoofer'
  };
  return products[productId] || productId;
}

function getProductIcon(productId) {
  const icons = {
    'nochancext': '🎮',
    'funext': '🎯',
    'rebel': '⚔️',
    'universal': '🛡️'
  };
  return icons[productId] || '📦';
}

function formatSeconds(seconds, unlimited) {
  if (unlimited) return 'Lifetime';
  const s = Number(seconds || 0);
  if (!s || s <= 0) return '0m';
  const days = Math.floor(s / 86400);
  const hours = Math.floor((s % 86400) / 3600);
  const mins = Math.floor((s % 3600) / 60);
  if (days > 0) return `${days}d ${hours}h`;
  if (hours > 0) return `${hours}h ${mins}m`;
  return `${mins}m`;
}

function formatTime(minutes) {
  if (!minutes || minutes <= 0) return '0m';
  
  const days = Math.floor(minutes / 1440);
  const hours = Math.floor((minutes % 1440) / 60);
  const mins = minutes % 60;
  
  if (days > 0) return `${days}d ${hours}h`;
  if (hours > 0) return `${hours}h ${mins}m`;
  return `${mins}m`;
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

function formatDateTime(dateString) {
  if (!dateString) return 'N/A';
  const date = new Date(dateString);
  return date.toLocaleString('en-US', {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit'
  });
}

function copyToClipboard(text, isMultiple = false) {
  navigator.clipboard.writeText(text).then(() => {
    showSuccess(isMultiple ? 'All keys copied!' : 'Key copied!');
  }).catch(err => {
    console.error('Failed to copy:', err);
    showError('Failed to copy');
  });
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


// Expose modal confirm handlers for React onClick (survives remount/HMR)
window.handleConfirmFreezeTime = handleConfirmFreezeTime;
window.handleConfirmUnfreezeTime = handleConfirmUnfreezeTime;

window.menuAction = menuAction;

window.bulkAction = bulkAction;

window.switchTab = switchTab;

window.clearSelection = clearSelection;

window.toggleSelectAll = toggleSelectAll;

// ---------------------------------------------------------------------------
// IMPORTANT: When this dashboard is rendered inside the React SPA, legacy
// scripts may be injected as ES modules depending on the loader implementation.
// In that case, top-level function declarations are *not* automatically
// attached to `window`. Any UI that uses inline HTML handlers (onclick/onchange)
// or calls through (window as any).fn?.(...) will silently do nothing.
//
// The User Management tab uses inline handlers for the per-user action menu and
// row selection, so we explicitly export the required functions here.
// ---------------------------------------------------------------------------

// Inline HTML event handlers used in the dynamically-rendered Users table
window.openActionsMenu = openActionsMenu;
window.toggleUserSelection = toggleUserSelection;

// Inline HTML handlers used in other parts of the legacy dashboard
window.selectProduct = selectProduct;
window.copyToClipboard = copyToClipboard;
