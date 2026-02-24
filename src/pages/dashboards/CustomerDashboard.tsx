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

export function CustomerDashboard() {
  const navigate = useNavigate();

  useEffect(() => {
    const auth = getAuth();
    if (!auth) {
      navigate('/login', { replace: true });
      return;
    }
    const role = String(auth.role).toLowerCase();
    if (role !== 'customer') {
      navigate(getDashboardPath(role), { replace: true });
      return;
    }

    window.API_BASE_URL = API_BASE_URL;

    // Load legacy dashboard logic (kept intact for reliability)
    loadLegacyScripts([
      '/legacy/scripts/cache.js',
      '/legacy/scripts/customer-api.js',
      '/legacy/scripts/customer-dashboard.js'
    ]).catch((err) => {
      console.error(err);
    });
  }, [navigate]);

  return (
    <div className="dashboard-shell customer-dashboard">
      <header className="dashboard-header">
        <div className="header-left">
          <a href="/" className="logo" aria-label="Back to site">
            ∅
          </a>
          <span className="dashboard-title">Customer Portal</span>
        </div>
        <div className="header-right">
          <a href="/" className="header-link">
            Main site
          </a>
          <div className="user-menu">
            <div className="user-icon" aria-hidden="true">
              <span id="userInitial">U</span>
            </div>
            <div className="dropdown-menu">
              <a href="/" className="dropdown-item">
                <span className="icon">🏠</span>
                Home
              </a>
              <a href="/dashboard/customer" className="dropdown-item">
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
            <a href="#downloads" className="nav-item" data-tab="downloads">
              <span className="nav-icon">⬇️</span>
              <span className="nav-text">Downloads</span>
            </a>
            <a href="#redeem" className="nav-item" data-tab="redeem">
              <span className="nav-icon">🔑</span>
              <span className="nav-text">Redeem</span>
            </a>
            <a href="#hwid" className="nav-item" data-tab="hwid">
              <span className="nav-icon">🔄</span>
              <span className="nav-text">HWID Reset</span>
            </a>
            <a href="#updates" className="nav-item" data-tab="updates">
              <span className="nav-icon">📢</span>
              <span className="nav-text">Updates</span>
            </a>
            <a href="#settings" className="nav-item" data-tab="settings">
              <span className="nav-icon">⚙️</span>
              <span className="nav-text">Settings</span>
            </a>
          </nav>
        </aside>

        <main className="main-content">
          <section id="overview-tab" className="tab-content active">
            <div className="content-header">
              <h1>
                Welcome back, <span id="username">User</span>
              </h1>
              <p className="subtitle">Your time balances and account overview</p>
            </div>

            <div className="info-card time-balances-card">
              <div className="card-header">
                <h3>Your Time Balances</h3>
                <span className="badge" id="totalApps">
                  0
                </span>
              </div>
              <div className="time-balances-list" id="timeBalancesList">
                <div className="loading">Loading time balances...</div>
              </div>
              <div className="total-time">
                <span className="total-label">Total Time Remaining:</span>
                <span className="total-value" id="totalTime">
                  0h 0m
                </span>
              </div>
            </div>
          </section>

          <section id="redeem-tab" className="tab-content">
            <div className="content-header">
              <h1>Redeem</h1>
              <p className="subtitle">Add time to your account</p>
            </div>

            <div className="redeem-container">
              <div className="info-card redeem-card">
                <div className="redeem-content">
                  <div className="redeem-icon-display">🔑</div>
                  <h3 className="redeem-title">Redeem a key</h3>
                  <p className="redeem-description">Paste your key below and redeem instantly.</p>
                  <form id="redeemForm" className="redeem-form">
                    <input
                      type="text"
                      id="licenseKey"
                      name="licenseKey"
                      placeholder="XXXXX-XXXXX-XXXXX-XXXXX"
                      className="redeem-input"
                      required
                      maxLength={50}
                    />
                    <button type="submit" className="redeem-btn">
                      <span>Redeem</span>
                    </button>
                  </form>
                  <div className="redeem-info">
                    <p>Keys are usually formatted like: XXXXX-XXXXX-XXXXX-XXXXX</p>
                    <p>Your time balance updates immediately after redeeming.</p>
                  </div>
                </div>
              </div>
            </div>
          </section>

          <section id="downloads-tab" className="tab-content">
            <div className="content-header">
              <h1>Downloads</h1>
              <p className="subtitle">Download your purchased products</p>
            </div>
            <div className="downloads-grid" id="downloadsGrid">
              <div className="loading">Loading available downloads...</div>
            </div>
          </section>

          <section id="hwid-tab" className="tab-content">
            <div className="content-header">
              <h1>HWID Reset</h1>
              <p className="subtitle">Reset your hardware ID for your products</p>
            </div>

            <div className="hwid-container">
              <div className="info-card">
                <div className="warning-box">
                  <span className="warning-icon">⚠️</span>
                  <div className="warning-content">
                    <h4>Important Information</h4>
                    <p>
                      Resetting your HWID will allow you to use your license on a
                      different machine. This action may have cooldown periods
                      depending on your product.
                    </p>
                  </div>
                </div>

                <div className="hwid-products" id="hwidProducts">
                  <div className="loading">Loading products...</div>
                </div>
              </div>
            </div>
          </section>

          <section id="updates-tab" className="tab-content">
            <div className="content-header">
              <h1>Product Updates</h1>
              <p className="subtitle">Latest news and updates for your products</p>
            </div>
            <div className="updates-container" id="updatesContainer">
              <div className="loading">Loading updates...</div>
            </div>
          </section>

          <section id="settings-tab" className="tab-content">
            <div className="content-header">
              <h1>Account Settings</h1>
              <p className="subtitle">Manage your account information and preferences</p>
            </div>

            <div className="info-card">
              <div className="card-header">
                <h3>Account Information</h3>
              </div>
              <div className="account-info">
                <div className="info-row">
                  <span className="info-label">Username:</span>
                  <span className="info-value" id="accountUsername">
                    -
                  </span>
                </div>
                <div className="info-row">
                  <span className="info-label">User ID:</span>
                  <span className="info-value" id="accountId">
                    -
                  </span>
                </div>
                <div className="info-row">
                  <span className="info-label">Member Since:</span>
                  <span className="info-value" id="memberSince">
                    -
                  </span>
                </div>
                <div className="info-row">
                  <span className="info-label">Active Products:</span>
                  <span className="info-value" id="totalProducts">
                    0
                  </span>
                </div>
                <div className="info-row">
                  <span className="info-label">Keys Redeemed:</span>
                  <span className="info-value" id="keysRedeemedTotal">
                    0
                  </span>
                </div>
                <div className="info-row">
                  <span className="info-label">HWID Resets Remaining:</span>
                  <span className="info-value" id="hwidResetsRemainingTotal">
                    0
                  </span>
                </div>
                <div className="info-row">
                  <span className="info-label">HWID Resets Used:</span>
                  <span className="info-value" id="hwidResetsUsedTotal">
                    0
                  </span>
                </div>

              </div>
            </div>
          </section>
        </main>
      </div>
    </div>
  );
}
