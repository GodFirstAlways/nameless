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

export function AdminDashboard() {
  const navigate = useNavigate();

  useEffect(() => {
    const auth = getAuth();
    if (!auth) {
      navigate('/login', { replace: true });
      return;
    }
    const role = String(auth.role).toLowerCase();
    if (role !== 'owner' && role !== 'co_owner') {
      navigate(getDashboardPath(role), { replace: true });
      return;
    }

    window.API_BASE_URL = API_BASE_URL;
    loadLegacyScripts(['/legacy/scripts/cache.js', '/legacy/scripts/admin-api.js', '/legacy/scripts/admin-dashboard.js']).catch(
      (err) => console.error(err)
    );
  }, [navigate]);

  return (
    <div className="dashboard-shell">
      <header className="dashboard-header">
        <div className="header-left">
          <a href="/" className="logo" aria-label="Back to site">
            ∅
          </a>
          <span className="dashboard-title">Admin Portal</span>
        </div>
        <div className="header-right">
          <a href="/" className="header-link">
            Main site
          </a>
          <div className="user-menu">
            <div className="user-icon" aria-hidden="true">
              <span id="userInitial">A</span>
            </div>
            <div className="dropdown-menu">
              <a href="/" className="dropdown-item">
                <span className="icon">🏠</span>
                Home
              </a>
              <a href="/dashboard/admin" className="dropdown-item">
                <span className="icon">📊</span>
                Dashboard
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

            <a href="#apps" className="nav-item" data-tab="apps">
              <span className="nav-icon">🧩</span>
              <span className="nav-text">Apps / Extensions</span>
            </a>

            <a href="/dashboard/admin/store" className="nav-item">
              <span className="nav-icon">🛒</span>
              <span className="nav-text">Store</span>
            </a>

            <a href="#resellers" className="nav-item" data-tab="resellers">
              <span className="nav-icon">👥</span>
              <span className="nav-text">Resellers</span>
            </a>
            <a href="#stock" className="nav-item" data-tab="stock">
              <span className="nav-icon">📦</span>
              <span className="nav-text">Stock</span>
            </a>

            <a href="#keys" className="nav-item" data-tab="keys">
              <span className="nav-icon">🔑</span>
              <span className="nav-text">License Keys</span>
            </a>

            <a
              href="/dashboard/admin/users"
              className="nav-item"
              onClick={(e) => {
                e.preventDefault();
                navigate('/dashboard/admin/users');
              }}
            >
              <span className="nav-icon">🌳</span>
              <span className="nav-text">User Tree</span>
            </a>
          </nav>
        </aside>

        <main className="main-content">
          <section id="overview-tab" className="tab-content active">
            <div className="content-header">
              <h1>
                Welcome back, <span id="username">Admin</span>
              </h1>
              <p className="subtitle">System overview and statistics</p>
            </div>

            <div className="stats-grid">
              <div className="stat-card">
                <div className="stat-icon">👥</div>
                <div className="stat-content">
                  <div className="stat-value" id="totalResellers">
                    0
                  </div>
                  <div className="stat-label">Total Resellers</div>
                </div>
              </div>
              <div className="stat-card">
                <div className="stat-icon">👤</div>
                <div className="stat-content">
                  <div className="stat-value" id="totalCustomers">
                    0
                  </div>
                  <div className="stat-label">Total Customers</div>
                </div>
              </div>
              <div className="stat-card">
                <div className="stat-icon">🔑</div>
                <div className="stat-content">
                  <div className="stat-value" id="totalKeys">
                    0
                  </div>
                  <div className="stat-label">Total Keys Generated</div>
                </div>
              </div>
              <div className="stat-card">
                <div className="stat-icon">⚡</div>
                <div className="stat-content">
                  <div className="stat-value" id="activeUsers">
                    0
                  </div>
                  <div className="stat-label">Active Users</div>
                </div>
              </div>
            </div>
          </section>

          <section id="apps-tab" className="tab-content">
            <div className="content-header">
              <h1>Apps / Extensions</h1>
              <p className="subtitle">Upload app releases, manage version status, upload unlisted modules, and publish announcements</p>
            </div>

            <div className="apps-grid">
              <div className="info-card">
                <div className="card-header">
                  <h3>Applications</h3>
                  <button type="button" className="btn-secondary" id="refreshAppsCatalogBtn">
                    Refresh
                  </button>
                </div>
                <p className="muted mb-4">
                  View current applications and quickly edit store metadata or remove an app completely (pre-launch cleanup).
                </p>
                <div id="appsCatalogList" className="apps-catalog-list">
                  <div className="loading">Loading applications...</div>
                </div>
              </div>

              <div className="info-card">
                <div className="card-header">
                  <h3>Upload Application Version</h3>
                  <span className="badge">Release</span>
                </div>
                <form id="appReleaseUploadForm" className="admin-form">
                  <div className="form-row">
                    <div className="form-group">
                      <label htmlFor="appReleaseAppCode">Application</label>
                      <select id="appReleaseAppCode" required>
                        <option value="">Loading...</option>
                      </select>
                    </div>
                    <div className="form-group">
                      <label htmlFor="appReleaseVersion">Version</label>
                      <input type="text" id="appReleaseVersion" placeholder="1.0.0" required maxLength={128} />
                    </div>
                    <div className="form-group">
                      <label htmlFor="appReleaseStatus">Status</label>
                      <select id="appReleaseStatus" required>
                        <option value="stable">Stable</option>
                      </select>
                    </div>
                  </div>

                  <div className="form-row">
                    <div className="form-group">
                      <label htmlFor="appReleaseMakeLatest">Latest</label>
                      <select id="appReleaseMakeLatest" defaultValue="true">
                        <option value="true">Mark as latest</option>
                        <option value="false">Do not change latest</option>
                      </select>
                    </div>
                    <div className="form-group">
                      <label htmlFor="appReleaseDescription">Short description</label>
                      <input type="text" id="appReleaseDescription" placeholder="Shown on download cards" />
                    </div>
                    <div className="form-group">
                      <label htmlFor="appReleaseFile">File</label>
                      <input type="file" id="appReleaseFile" required />
                    </div>
                  </div>

                  <div className="form-group">
                    <label htmlFor="appReleaseNotes">Notes</label>
                    <textarea id="appReleaseNotes" rows={5} placeholder="What changed?" required></textarea>
                  </div>

                  <button type="submit" className="btn-primary">
                    Upload & Publish
                  </button>
                </form>
              </div>

              <div className="info-card">
                <div className="card-header">
                  <h3>Manage Versions</h3>
                  <div className="flex gap-2 items-center">
                    <select id="appReleasesFilter" defaultValue="">
                      <option value="">All apps</option>
                    </select>
                    <button type="button" className="btn-secondary" id="refreshAppReleasesBtn">
                      Refresh
                    </button>
                  </div>
                </div>
                <div id="appReleasesList" className="releases-list">
                  <div className="loading">Loading versions...</div>
                </div>
              </div>

              <div className="info-card">
                <div className="card-header">
                  <h3>Hidden Modules</h3>
                  <span className="badge-warn">Unlisted</span>
                </div>
                <p className="muted mb-4">Upload DLL/SYS/any file that the app can download with an active license. These do not appear on the customer downloads page.</p>

                <form id="hiddenModuleUploadForm" className="admin-form">
                  <div className="form-row">
                    <div className="form-group">
                      <label htmlFor="moduleAppCode">Application</label>
                      <select id="moduleAppCode" required>
                        <option value="">Loading...</option>
                      </select>
                    </div>
                    <div className="form-group">
                      <label htmlFor="moduleFile">File</label>
                      <input type="file" id="moduleFile" required />
                    </div>
                    <div className="form-group">
                      <label htmlFor="moduleDescription">Label</label>
                      <input type="text" id="moduleDescription" placeholder="e.g. driver.sys / module.dll" />
                    </div>
                  </div>
                  <button type="submit" className="btn-primary">Upload Hidden Module</button>
                </form>

                <div className="card-header mt-6">
                  <h3>Recent Modules</h3>
                  <button type="button" className="btn-secondary" id="refreshModulesBtn">Refresh</button>
                </div>
                <div id="modulesList" className="modules-list">
                  <div className="loading">Loading modules...</div>
                </div>
              </div>

              <div className="info-card">
                <div className="card-header">
                  <h3>Announcements</h3>
                  <span className="badge">Store</span>
                </div>

                <form id="announcementForm" className="admin-form">
                  <div className="form-row">
                    <div className="form-group">
                      <label htmlFor="annAppCode">Application</label>
                      <select id="annAppCode" required>
                        <option value="">Loading...</option>
                      </select>
                    </div>
                    <div className="form-group">
                      <label htmlFor="annVersion">Version</label>
                      <select id="annVersion" required>
                        <option value="">Select app first</option>
                      </select>
                    </div>
                    <div className="form-group">
                      <label>Status</label>
                      <div id="annStatus" className="status-pill">—</div>
                    </div>
                  </div>

                  <div className="form-group">
                    <label htmlFor="annTitle">Title</label>
                    <input type="text" id="annTitle" required placeholder="Announcement title" />
                  </div>

                  <div className="form-group">
                    <label htmlFor="annBody">Body</label>
                    <textarea id="annBody" rows={5} required placeholder="What do you want users to know?"></textarea>
                  </div>

                  <button type="submit" className="btn-primary">Publish Announcement</button>
                </form>

                <div className="card-header mt-6">
                  <h3>Recent Announcements</h3>
                  <button type="button" className="btn-secondary" id="refreshAnnouncementsBtn">Refresh</button>
                </div>
                <div id="announcementsList" className="announcements-list">
                  <div className="loading">Loading announcements...</div>
                </div>
              </div>
            </div>
          </section>

          <section id="resellers-tab" className="tab-content">
            <div className="content-header">
              <h1>Reseller Management</h1>
              <p className="subtitle">Create and manage reseller accounts</p>
            </div>

            <div className="info-card">
              <div className="card-header">
                <h3>Create New Reseller</h3>
              </div>
              <form id="createResellerForm" className="admin-form">
                <div className="form-row">
                  <div className="form-group">
                    <label htmlFor="resellerUsername">Username</label>
                    <input type="text" id="resellerUsername" required minLength={3} />
                  </div>
                  <div className="form-group">
                    <label htmlFor="resellerPassword">Password</label>
                    <input type="password" id="resellerPassword" required minLength={6} />
                  </div>
                </div>
                <button type="submit" className="btn-primary">
                  Create Reseller
                </button>
              </form>
            </div>

            <div className="info-card">
              <div className="card-header">
                <h3>Active Resellers</h3>
              </div>
              <div className="resellers-list" id="resellersList">
                <div className="loading">Loading resellers...</div>
              </div>
            </div>
          </section>

          <section id="stock-tab" className="tab-content">
            <div className="content-header">
              <h1>Stock Management</h1>
              <p className="subtitle">Allocate stock to resellers</p>
            </div>

            <div className="info-card">
              <div className="card-header">
                <h3>Give Stock to Reseller</h3>
              </div>
              <form id="giveStockForm" className="admin-form">
                <div className="form-row">
                  <div className="form-group">
                    <label htmlFor="selectReseller">Reseller</label>
                    <select id="selectReseller" required>
                      <option value="">Select a reseller</option>
                    </select>
                  </div>
                  <div className="form-group">
                    <label htmlFor="appCode">Product</label>
                    <select id="appCode" required defaultValue="nochancext">
                      <option value="nochancext">NoChance External</option>
                      <option value="funext">Fun External</option>
                      <option value="rebel">Rebel</option>
                    </select>
                  </div>
                </div>

                <div className="form-row">
                  <div className="form-group">
                    <label htmlFor="durationUnit">Duration Type</label>
                    <select id="durationUnit" required defaultValue="day">
                      <option value="day">Day</option>
                      <option value="week">Week</option>
                      <option value="month">Month</option>
                      <option value="lifetime">Lifetime</option>
                    </select>
                  </div>
                  <div className="form-group">
                    <label htmlFor="durationValue">Duration Value</label>
                    <input type="number" id="durationValue" defaultValue={1} min={1} required />
                  </div>
                  <div className="form-group">
                    <label htmlFor="quantity">Quantity</label>
                    <input type="number" id="quantity" defaultValue={10} min={0} max={10000} required />
                  </div>
                </div>

                <div className="form-row">
                  <div className="form-group">
                    <label htmlFor="hwidPerKey">HWID resets (optional; if Quantity is 0, this is the total to grant)</label>
                    <input type="number" id="hwidPerKey" defaultValue={0} min={0} />
                  </div>
                </div>

                <button type="submit" className="btn-primary">
                  Give Stock
                </button>
              </form>
            </div>

            <div className="info-card">
              <div className="card-header">
                <h3>Reseller Stock</h3>
                <button type="button" className="btn-secondary" id="refreshResellerStockBtn">
                  Refresh
                </button>
              </div>
              <div className="users-table-container">
                <table className="users-table">
                  <thead>
                    <tr>
                      <th>Product</th>
                      <th>Quantity</th>
                      <th>Total</th>
                      <th>HWID tokens</th>
                      <th>Updated</th>
                      <th>Details</th>
                    </tr>
                  </thead>
                  <tbody id="resellerStockTableBody">
                    <tr>
                      <td colSpan={6} className="loading">
                        Loading stock...
                      </td>
                    </tr>
                  </tbody>
                </table>
              </div>
            </div>
          </section>

          <section id="keys-tab" className="tab-content">
            <div className="content-header">
              <h1>License Keys</h1>
              <p className="subtitle">View all generated keys and redemption status</p>
            </div>

            <div className="info-card">
              <div className="card-header">
                <h3>All Keys</h3>
                <button type="button" className="btn-secondary" id="refreshKeysBtn">
                  Refresh
                </button>
              </div>
              <div className="users-table-container">
                <table className="users-table">
                  <thead>
                    <tr>
                      <th>Code</th>
                      <th>Prefix</th>
                      <th>Duration</th>
                      <th>Created By</th>
                      <th>Redeemed By</th>
                      <th>Activated</th>
                      <th>Expires</th>
                      <th>Revoked</th>
                    </tr>
                  </thead>
                  <tbody id="keysTableBody">
                    <tr>
                      <td colSpan={8} className="loading">
                        Loading keys...
                      </td>
                    </tr>
                  </tbody>
                </table>
              </div>
            </div>
          </section>
        </main>
      </div>
    </div>
  );
}
