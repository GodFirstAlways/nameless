import { useEffect, useMemo, useState, type FormEvent } from 'react';
import { useNavigate } from 'react-router-dom';
import { API_BASE_URL } from '../../lib/config';
import { clearAuth, getAuth, getDashboardPath } from '../../lib/auth';

type ProductBalance = { app_code: string; balance_seconds: number; unlimited: boolean; has_time?: boolean };
type CustomerAccount = {
  user_id: number;
  username: string;
  role: string;
  member_since: string;
  hwid: string | null;
  active_products: ProductBalance[];
  total_unlimited: boolean;
  total_balance_seconds: number;
  hwid_resets_by_app?: Record<string, { remaining: number; used: number }>;
  hwid_resets_total_remaining?: number;
  hwid_resets_total_used?: number;
};

type DownloadsV2 = {
  products: Array<{
    app_code: string;
    name: string;
    has_access: boolean;
    latest_version?: string | null;
    description?: string | null;
    tag?: string | null;
    download_url?: string | null;
  }>;
};

type Announcement = {
  app_code?: string;
  title?: string;
  body?: string;
  version?: string;
  created_at?: string;
  status_tag?: string;
  is_latest?: boolean;
};

function joinUrl(base: string, path: string) {
  const b = base.replace(/\/$/, '');
  if (!path) return b;
  if (/^https?:\/\//i.test(path)) return path;
  if (path.startsWith('/')) return `${b}${path}`;
  return `${b}/${path}`;
}

function formatDuration(seconds: number, unlimited: boolean) {
  if (unlimited) return 'Unlimited';
  const s = Math.max(0, Math.floor(seconds || 0));
  const h = Math.floor(s / 3600);
  const m = Math.floor((s % 3600) / 60);
  const d = Math.floor(h / 24);
  const hh = h % 24;
  if (d > 0) return `${d}d ${hh}h ${m}m`;
  return `${h}h ${m}m`;
}

export function CustomerDashboard() {
  const navigate = useNavigate();

  const [activeTab, setActiveTab] = useState<'overview' | 'downloads' | 'redeem' | 'hwid' | 'updates' | 'settings'>(
    'overview'
  );

  const [account, setAccount] = useState<CustomerAccount | null>(null);
  const [downloads, setDownloads] = useState<DownloadsV2 | null>(null);
  const [announcements, setAnnouncements] = useState<Announcement[]>([]);
  const [loading, setLoading] = useState(true);
  const [notice, setNotice] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [redeemKey, setRedeemKey] = useState('');

  const auth = useMemo(() => getAuth(), []);
  const token = auth?.token;

  function authHeaders(extra?: Record<string, string>) {
    const h: Record<string, string> = { ...(extra || {}) };
    if (token) h.Authorization = `Bearer ${token}`;
    return h;
  }

  async function fetchJson(path: string, init?: RequestInit) {
    const res = await fetch(joinUrl(API_BASE_URL, path), {
      ...(init || {}),
      headers: authHeaders({ 'Content-Type': 'application/json', ...(init?.headers as any) })
    });
    if (res.status === 401) {
      clearAuth();
      navigate('/login', { replace: true });
      throw new Error('Unauthorized');
    }
    return res;
  }

  async function loadAll() {
    setLoading(true);
    setError(null);
    setNotice(null);

    try {
      const aRes = await fetchJson('/customer/account', { method: 'GET' });
      if (!aRes.ok) throw new Error(`Failed to load account (${aRes.status})`);
      const acct = (await aRes.json()) as CustomerAccount;

      const [dRes, uRes] = await Promise.all([
        fetchJson('/customer/downloads-v2', { method: 'GET' }),
        fetch(joinUrl(API_BASE_URL, '/public/announcements'), { method: 'GET' })
      ]);

      let d: DownloadsV2 | null = null;
      if (dRes.ok) d = (await dRes.json()) as DownloadsV2;

      let anns: Announcement[] = [];
      if (uRes.ok) {
        const out = await uRes.json();
        anns = Array.isArray(out?.announcements) ? out.announcements : [];
      }

      setAccount(acct);
      setDownloads(d);
      setAnnouncements(anns);
    } catch (e: any) {
      setError(String(e?.message || e || 'Failed to load dashboard'));
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    const a = getAuth();
    if (!a) {
      navigate('/login', { replace: true });
      return;
    }
    const role = String(a.role).toLowerCase();
    if (role !== 'customer') {
      navigate(getDashboardPath(role), { replace: true });
      return;
    }
    void loadAll();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [navigate]);

  const totals = useMemo(() => {
    const products = account?.active_products || [];
    const totalApps = products.length;
    const totalSeconds = account?.total_unlimited ? 0 : account?.total_balance_seconds || 0;
    return { totalApps, totalSeconds };
  }, [account]);

  async function onRedeem(e: FormEvent) {
    e.preventDefault();
    setNotice(null);
    setError(null);

    const key = redeemKey.trim();
    if (!key) return;

    try {
      const res = await fetchJson('/customer/redeem', {
        method: 'POST',
        body: JSON.stringify({ license_key: key })
      });
      const out = await res.json().catch(() => null);
      if (!res.ok) {
        const msg = out?.detail ? String(out.detail) : `Redeem failed (${res.status})`;
        throw new Error(msg);
      }
      setNotice('Key redeemed successfully.');
      setRedeemKey('');
      await loadAll();
      setActiveTab('overview');
    } catch (e: any) {
      setError(String(e?.message || e || 'Redeem failed'));
    }
  }

  async function onHwidReset(appCode: string) {
    setNotice(null);
    setError(null);
    try {
      const res = await fetchJson('/customer/hwid/reset', {
        method: 'POST',
        body: JSON.stringify({ app_code: appCode })
      });
      const out = await res.json().catch(() => null);
      if (!res.ok) {
        const msg = out?.detail ? String(out.detail) : `HWID reset failed (${res.status})`;
        throw new Error(msg);
      }
      setNotice('HWID reset complete.');
      await loadAll();
      setActiveTab('settings');
    } catch (e: any) {
      setError(String(e?.message || e || 'HWID reset failed'));
    }
  }

  const products = account?.active_products || [];

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
              <span>{(account?.username || auth?.username || 'U').slice(0, 1).toUpperCase()}</span>
            </div>
          </div>
        </div>
      </header>

      <div className="dashboard-container">
        <aside className="sidebar">
          <nav className="sidebar-nav">
            {([
              ['overview', '🏠', 'Overview'],
              ['downloads', '⬇️', 'Downloads'],
              ['redeem', '🔑', 'Redeem'],
              ['hwid', '🔄', 'HWID Reset'],
              ['updates', '📢', 'Updates'],
              ['settings', '⚙️', 'Settings']
            ] as const).map(([key, icon, label]) => (
              <button
                key={key}
                type="button"
                className={`nav-item ${activeTab === key ? 'active' : ''}`}
                onClick={() => setActiveTab(key)}
              >
                <span className="nav-icon">{icon}</span>
                <span className="nav-text">{label}</span>
              </button>
            ))}
          </nav>
        </aside>

        <main className="main-content">
          {(notice || error) && (
            <div className="info-card" style={{ marginBottom: 16 }}>
              {notice && <div style={{ color: 'rgb(34 197 94)' }}>{notice}</div>}
              {error && <div style={{ color: 'rgb(239 68 68)' }}>{error}</div>}
            </div>
          )}

          {loading && (
            <div className="info-card">
              <div className="loading">Loading...</div>
            </div>
          )}

          {!loading && activeTab === 'overview' && (
            <section className="tab-content active">
              <div className="content-header">
                <h1>
                  Welcome back, <span>{account?.username || 'User'}</span>
                </h1>
                <p className="subtitle">Your time balances and account overview</p>
              </div>

              <div className="info-card time-balances-card">
                <div className="card-header">
                  <h3>Your Time Balances</h3>
                  <span className="badge">{totals.totalApps}</span>
                </div>

                <div className="time-balances-list">
                  {products.length === 0 ? (
                    <div className="loading">No active products yet.</div>
                  ) : (
                    products.map((p) => (
                      <div
                        key={p.app_code}
                        className={`time-balance-item ${p.unlimited || p.balance_seconds > 0 ? '' : 'expired'}`}
                      >
                        <div className="time-balance-header">
                          <div className="app-info">
                            <h4 className="app-name">{p.app_code}</h4>
                            <span className="app-status">{p.unlimited || p.balance_seconds > 0 ? 'Active' : 'Expired'}</span>
                          </div>
                          <div className="time-display">
                            <span className="time-value">{formatDuration(p.balance_seconds, p.unlimited)}</span>
                          </div>
                        </div>
                      </div>
                    ))
                  )}
                </div>

                <div className="total-time">
                  <span className="total-label">Total Time Remaining:</span>
                  <span className="total-value">
                    {account?.total_unlimited ? 'Unlimited' : formatDuration(totals.totalSeconds, false)}
                  </span>
                </div>
              </div>
            </section>
          )}

          {!loading && activeTab === 'redeem' && (
            <section className="tab-content active">
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
                    <form className="redeem-form" onSubmit={onRedeem}>
                      <input
                        type="text"
                        value={redeemKey}
                        onChange={(e) => setRedeemKey(e.target.value)}
                        placeholder="XXXXX-XXXXX-XXXXX-XXXXX"
                        className="redeem-input"
                        required
                        maxLength={80}
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
          )}

          {!loading && activeTab === 'downloads' && (
            <section className="tab-content active">
              <div className="content-header">
                <h1>Downloads</h1>
                <p className="subtitle">Download your purchased products</p>
              </div>

              <div className="downloads-grid">
                {(downloads?.products || []).length === 0 ? (
                  <div className="loading">No downloads available.</div>
                ) : (
                  (downloads?.products || []).map((p) => (
                    <div key={p.app_code} className="download-card accessible">
                      <div className="download-content" style={{ padding: 16 }}>
                        <h3 style={{ fontSize: 18, fontWeight: 700 }}>{p.name || p.app_code}</h3>
                        <div style={{ opacity: 0.8, marginTop: 6 }}>
                          {p.latest_version ? `Latest: ${p.latest_version}` : ''}
                        </div>
                        {p.description && <div style={{ opacity: 0.8, marginTop: 10 }}>{p.description}</div>}
                        <div style={{ marginTop: 14 }}>
                          {p.download_url ? (
                            <a className="download-btn" href={p.download_url} target="_blank" rel="noreferrer">
                              Download
                            </a>
                          ) : (
                            <div style={{ opacity: 0.7 }}>No download link.</div>
                          )}
                        </div>
                      </div>
                    </div>
                  ))
                )}
              </div>
            </section>
          )}

          {!loading && activeTab === 'hwid' && (
            <section className="tab-content active">
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
                        Resetting your HWID will allow you to use your license on a different machine. This action may have
                        cooldown periods depending on your product.
                      </p>
                    </div>
                  </div>

                  <div className="hwid-products">
                    {products.length === 0 ? (
                      <div className="loading">No products.</div>
                    ) : (
                      products
                        .filter((p) => p.unlimited || p.balance_seconds > 0)
                        .map((p) => {
                          const rem = account?.hwid_resets_by_app?.[p.app_code]?.remaining ?? 0;
                          const used = account?.hwid_resets_by_app?.[p.app_code]?.used ?? 0;
                          return (
                            <div key={p.app_code} className="hwid-product">
                              <div className="hwid-product-header">
                                <div className="hwid-product-info">
                                  <h4>{p.app_code}</h4>
                                  <p>
                                    Resets remaining: <b>{rem}</b> • Used: <b>{used}</b>
                                  </p>
                                </div>
                                <button
                                  className="hwid-reset-btn"
                                  disabled={account?.hwid === null && rem <= 0}
                                  onClick={() => onHwidReset(p.app_code)}
                                  type="button"
                                >
                                  Reset HWID
                                </button>
                              </div>
                            </div>
                          );
                        })
                    )}
                  </div>
                </div>
              </div>
            </section>
          )}

          {!loading && activeTab === 'updates' && (
            <section className="tab-content active">
              <div className="content-header">
                <h1>Product Updates</h1>
                <p className="subtitle">Latest news and updates for your products</p>
              </div>
              <div className="updates-container">
                {announcements.length === 0 ? (
                  <div className="loading">No announcements.</div>
                ) : (
                  announcements.map((a, idx) => (
                    <div key={`${a.created_at || ''}-${idx}`} className="info-card" style={{ marginBottom: 14 }}>
                      <div style={{ display: 'flex', justifyContent: 'space-between', gap: 10 }}>
                        <div>
                          <div style={{ fontWeight: 800 }}>{a.title || 'Announcement'}</div>
                          <div style={{ opacity: 0.7, marginTop: 6 }}>
                            {(a.app_code ? `${a.app_code} • ` : '')}
                            {a.version ? `v${a.version} • ` : ''}
                            {a.created_at ? new Date(a.created_at).toLocaleString() : ''}
                          </div>
                        </div>
                        <div style={{ opacity: 0.75 }}>
                          {a.status_tag ? a.status_tag : ''}
                          {a.is_latest ? ' • latest' : ''}
                        </div>
                      </div>
                      {a.body && <div style={{ marginTop: 10, opacity: 0.85 }}>{a.body}</div>}
                    </div>
                  ))
                )}
              </div>
            </section>
          )}

          {!loading && activeTab === 'settings' && (
            <section className="tab-content active">
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
                    <span className="info-value">{account?.username || '-'}</span>
                  </div>
                  <div className="info-row">
                    <span className="info-label">User ID:</span>
                    <span className="info-value">{account?.user_id ?? '-'}</span>
                  </div>
                  <div className="info-row">
                    <span className="info-label">Member Since:</span>
                    <span className="info-value">{account?.member_since ? new Date(account.member_since).toLocaleDateString() : '-'}</span>
                  </div>
                  <div className="info-row">
                    <span className="info-label">Active Products:</span>
                    <span className="info-value">{products.length}</span>
                  </div>
                  <div className="info-row">
                    <span className="info-label">HWID:</span>
                    <span className="info-value">{account?.hwid ?? 'Not set'}</span>
                  </div>
                  <div className="info-row">
                    <span className="info-label">HWID Resets Remaining:</span>
                    <span className="info-value">{account?.hwid_resets_total_remaining ?? 0}</span>
                  </div>
                  <div className="info-row">
                    <span className="info-label">HWID Resets Used:</span>
                    <span className="info-value">{account?.hwid_resets_total_used ?? 0}</span>
                  </div>

                  <div style={{ marginTop: 14 }}>
                    <button
                      type="button"
                      className="download-btn"
                      onClick={() => {
                        clearAuth();
                        navigate('/login', { replace: true });
                      }}
                    >
                      Log out
                    </button>
                  </div>
                </div>
              </div>
            </section>
          )}
        </main>
      </div>
    </div>
  );
}
