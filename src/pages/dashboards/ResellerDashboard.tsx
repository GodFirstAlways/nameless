import { useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { API_BASE_URL } from '../../lib/config';
import { getAuth, getDashboardPath } from '../../lib/auth';
import { loadLegacyScripts } from '../../lib/loadLegacyScripts';

declare global {
  interface Window {
    API_BASE_URL?: string;
  }
}

export function ResellerDashboard() {
  const navigate = useNavigate();

  useEffect(() => {
    const auth = getAuth();
    if (!auth) {
      navigate('/login', { replace: true });
      return;
    }
    const role = String(auth.role).toLowerCase();
    if (role !== 'reseller') {
      navigate(getDashboardPath(role), { replace: true });
      return;
    }

    window.API_BASE_URL = API_BASE_URL;
    loadLegacyScripts([
      '/legacy/scripts/cache.js',
      '/legacy/scripts/reseller-api.js',
      '/legacy/scripts/reseller-dashboard.js'
    ])
      .then(() => (window as any).initResellerDashboard?.())
      .catch((err) => console.error(err));
  }, [navigate]);

  return (
    <div className="dashboard-shell">
      <header className="dashboard-header">
        <div className="header-left">
          <a href="/" className="logo" aria-label="Back to site">
            ∅
          </a>
          <span className="dashboard-title">Reseller Portal</span>
        </div>
        <div className="header-right">
          <a href="/" className="header-link">
            Main site
          </a>
          <div className="user-menu">
            <div className="user-icon" aria-hidden="true">
              <span id="userInitial">R</span>
            </div>
            <div className="dropdown-menu">
              <a href="/" className="dropdown-item">
                <span className="icon">🏠</span>
                Home
              </a>
              <a href="/dashboard/reseller" className="dropdown-item">
                <span className="icon">📊</span>
                Dashboard
              </a>
              <a href="#" className="dropdown-item" id="settingsBtn">
                <span className="icon">⚙️</span>
                Settings
              </a>
              <div className="dropdown-divider"></div>
              <a href="#" className="dropdown-item logout" id="logoutBtn">
                <span className="icon">🚪</span>
                Logout
              </a>
            </div>
          </div>
        </div>
      </header>

      <div className="dashboard-container">
        <aside className="sidebar">
          <nav className="sidebar-nav">
            <a href="#overview" className="nav-item active" data-tab="overview">
              <span className="nav-icon">🏠</span>
              <span className="nav-text">Overview</span>
            </a>
            <a href="#stock" className="nav-item" data-tab="stock">
              <span className="nav-icon">📦</span>
              <span className="nav-text">Stock &amp; Generate</span>
            </a>
            <a href="#users" className="nav-item" data-tab="users">
              <span className="nav-icon">👥</span>
              <span className="nav-text">Users</span>
            </a>
            <a href="#updates" className="nav-item" data-tab="updates">
              <span className="nav-icon">📢</span>
              <span className="nav-text">Updates</span>
            </a>
          </nav>
        </aside>

        <main className="main-content">
          <section id="overview-tab" className="tab-content active">
            <div className="content-header">
              <h1>
                Welcome back, <span id="username">Reseller</span>
              </h1>
              <p className="subtitle">Your reseller dashboard overview</p>
            </div>

            <div className="stats-grid">
              <div className="stat-card">
                <div className="stat-content">
                  <div className="stat-icon">📊</div>
                  <div className="stat-details">
                    <div className="stat-value" id="totalSales">
                      0
                    </div>
                    <div className="stat-label">Keys Generated</div>
                  </div>
                </div>
              </div>
              <div className="stat-card">
                <div className="stat-content">
                  <div className="stat-icon">🔑</div>
                  <div className="stat-details">
                    <div className="stat-value" id="activeKeys">
                      0
                    </div>
                    <div className="stat-label">Available Stock</div>
                  </div>
                </div>
              </div>
              <div className="stat-card">
                <div className="stat-content">
                  <div className="stat-icon">👥</div>
                  <div className="stat-details">
                    <div className="stat-value" id="totalUsers">
                      0
                    </div>
                    <div className="stat-label">HWID Credits</div>
                  </div>
                </div>
              </div>
            </div>

            <div className="cards-grid">
              <div className="info-card">
                <div className="card-header">
                  <h3>Recent Activity</h3>
                </div>
                <div className="activity-list" id="activityList">
                  <div className="loading">Loading activity...</div>
                </div>
              </div>

              <div className="info-card">
                <div className="card-header">
                  <h3>Quick Actions</h3>
                </div>
                <div className="quick-actions-list">
                  <button className="action-btn" onClick={() => (window as any).switchTab?.('stock')}>
                    <span className="action-icon">🔑</span>
                    <span className="action-text">Generate Keys</span>
                  </button>
                  <button className="action-btn" onClick={() => (window as any).switchTab?.('users')}>
                    <span className="action-icon">👥</span>
                    <span className="action-text">Manage Users</span>
                  </button>
                </div>
              </div>
            </div>
          </section>

          <section id="stock-tab" className="tab-content">
            <div className="content-header">
              <h1>Stock Management</h1>
              <p className="subtitle">Generate keys and view your stock limits</p>
            </div>

            <div className="info-card generation-card">
              <div className="card-header">
                <h3>Generate New Keys</h3>
              </div>

              <form id="keyGenForm" className="key-gen-form">
                <div className="form-group">
                  <label>Application</label>
                  <div className="product-selector" id="productSelector">
                    <div className="selected-product" id="selectedProduct">
                      <span className="placeholder">Select an application</span>
                      <span className="dropdown-arrow">▼</span>
                    </div>
                    <div className="product-dropdown" id="productDropdown">
                      <div className="loading-small">Loading applications...</div>
                    </div>
                  </div>
                  <input type="hidden" id="selectedProductId" name="product_id" required />
                </div>

                <div className="form-row">
                  <div className="form-group">
                    <label htmlFor="quantity">Quantity</label>
                    <input type="number" id="quantity" name="quantity" min={1} max={100} defaultValue={1} required />
                  </div>
                  <div className="form-group">
                    <label htmlFor="duration">Duration</label>
                    <select id="duration" name="duration" required defaultValue="">
                      <option value="">Select Duration</option>
                      <option value="1day">1 Day</option>
                      <option value="1week">1 Week</option>
                      <option value="1month">1 Month</option>
                      <option value="3months">3 Months</option>
                      <option value="lifetime">Lifetime</option>
                    </select>
                  </div>
                </div>

                <button type="submit" className="generate-btn">
                  <span>Generate Keys</span>
                  <div className="loader"></div>
                </button>
              </form>

              <div className="generated-keys" id="generatedKeys" style={{ display: 'none' }}>
                <div className="keys-header">
                  <h4>Generated Keys</h4>
                  <button className="copy-all-btn" id="copyAllBtn">
                    Copy All
                  </button>
                </div>
                <div className="keys-list" id="generatedKeysList"></div>
              </div>
            </div>

            <div className="stock-section-header">
              <h2>Your Stock Inventory</h2>
              <p>Available keys per product and duration</p>
            </div>

            <div className="stock-overview" id="stockOverview">
              <div className="loading">Loading stock information...</div>
            </div>
          </section>

          <section id="users-tab" className="tab-content">
            <div className="content-header">
              <h1>User Management</h1>
              <p className="subtitle">Manage customers who activated your keys</p>
            </div>

            <div className="bulk-actions-bar" id="bulkActionsBar" style={{ display: 'none' }}>
              <div className="bulk-info">
                <span id="selectedCount">0</span> user(s) selected
              </div>
              <div className="bulk-buttons">
                <button className="bulk-btn" onClick={() => (window as any).bulkAction?.('freeze')}>
                  Freeze Time (Selected)
                </button>
                <button className="bulk-btn" onClick={() => (window as any).bulkAction?.('unfreeze')}>
                  Unfreeze Time (Selected)
                </button>
                <button className="bulk-btn" onClick={() => (window as any).bulkAction?.('clear-hwid')}>
                  Clear HWID
                </button>
                <button className="bulk-btn secondary" onClick={() => (window as any).clearSelection?.()}>
                  Clear Selection
                </button>
              </div>
            </div>

            <div className="info-card">
              <div className="card-header">
                <h3>Users</h3>
                <div className="search-box">
                  <input type="text" id="userSearch" placeholder="Search by username..." />
                </div>
              </div>
              <div className="users-table-container">
                <table className="users-table">
                  <thead>
                    <tr>
                      <th className="checkbox-cell">
                        <input type="checkbox" id="selectAll" onChange={() => (window as any).toggleSelectAll?.()} />
                      </th>
                      <th>Username</th>
                      <th>Product</th>
                      <th>Time Remaining</th>
                      <th>HWID</th>
                      <th>Status</th>
                      <th>Actions</th>
                    </tr>
                  </thead>
                  <tbody id="usersTableBody">
                    <tr>
                      <td colSpan={7} className="loading">
                        Loading users...
                      </td>
                    </tr>
                  </tbody>
                </table>
              </div>

              <div className="pagination" id="pagination">
                <button className="page-btn" id="prevPage">
                  Previous
                </button>
                <span className="page-info" id="pageInfo">
                  Page 1 of 1
                </span>
                <button className="page-btn" id="nextPage">
                  Next
                </button>
              </div>
            </div>
          </section>

          <section id="updates-tab" className="tab-content">
            <div className="content-header">
              <h1>Product Updates</h1>
              <p className="subtitle">Latest news and updates for all products</p>
            </div>
            <div className="updates-container" id="updatesContainer">
              <div className="loading">Loading updates...</div>
            </div>
          </section>
        </main>
      </div>

      <div className="modal" id="addTimeModal">
        <div className="modal-content">
          <div className="modal-header">
            <h3>Add Time</h3>
            <button className="modal-close" onClick={() => (window as any).closeModal?.('addTimeModal')}>
              &times;
            </button>
          </div>
          <div className="modal-body">
            <p>
              Add time for <strong id="addTimeUsername"></strong>
            </p>
            <div className="form-group">
              <label htmlFor="addTimeProduct">Product</label>
              <select id="addTimeProduct" required></select>
            </div>
            <div className="form-group">
              <label htmlFor="addTimeDuration">Duration</label>
              <select id="addTimeDuration" required defaultValue="1440">
                <option value="1440">1 Day (1,440 min)</option>
                <option value="10080">1 Week (10,080 min)</option>
                <option value="43200">1 Month (43,200 min)</option>
                <option value="129600">3 Months (129,600 min)</option>
              </select>
            </div>
            <div className="form-group">
              <label>
                <input type="checkbox" id="useCompensation" /> Use HWID reset credits (if available)
              </label>
            </div>
            <div className="warning-box" id="stockWarning" style={{ display: 'none' }}>
              ⚠️ No HWID reset credits available. This will deduct from your stock!
            </div>
          </div>
          <div className="modal-footer">
            <button className="btn-secondary" onClick={() => (window as any).closeModal?.('addTimeModal')}>
              Cancel
            </button>
            <button className="btn-primary" id="confirmAddTime">
              Add Time
            </button>
          </div>
        </div>
      </div>

      <div className="modal" id="freezeTimeModal">
        <div className="modal-content">
          <div className="modal-header">
            <h3>Freeze Time</h3>
            <button className="modal-close" onClick={() => (window as any).closeModal?.('freezeTimeModal')}>
              &times;
            </button>
          </div>
          <div className="modal-body">
            <p>
              Manage time freeze for <strong id="freezeTimeUsername"></strong>. This only affects time sold by you.
            </p>
            <div className="form-group">
              <label htmlFor="freezeTimeProduct">Product</label>
              <select id="freezeTimeProduct"></select>
            </div>
            <div className="warning-box" id="freezeTimeInfo"></div>
          </div>
          <div className="modal-footer">
            <button className="btn-secondary" onClick={() => (window as any).closeModal?.('freezeTimeModal')}>
              Cancel
            </button>
            <button
              type="button"
              className="btn-primary"
              id="confirmFreezeTime"
              onClick={() => (window as any).handleConfirmFreezeTime?.()}
            >
              Freeze
            </button>
            <button
              type="button"
              className="btn-secondary"
              id="confirmUnfreezeTime"
              onClick={() => (window as any).handleConfirmUnfreezeTime?.()}
            >
              Unfreeze
            </button>
          </div>
        </div>
      </div>

      <div className="actions-menu" id="actionsMenu" style={{ display: 'none' }}>
        <div className="menu-item" onClick={() => (window as any).menuAction?.('freeze')}>
          <span className="menu-icon">❄️</span>
          <span className="menu-text">
            Freeze
          </span>
        </div>
        <div className="menu-item" onClick={() => (window as any).menuAction?.('unfreeze')}>
          <span className="menu-icon">☀️</span>
          <span className="menu-text">Unfreeze</span>
        </div>
        <div className="menu-item" onClick={() => (window as any).menuAction?.('clear-hwid')}>
          <span className="menu-icon">🔄</span>
          <span className="menu-text">Clear HWID</span>
        </div>
      </div>
    </div>
  );
}