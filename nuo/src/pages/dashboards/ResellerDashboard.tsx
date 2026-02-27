import { useEffect, useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { API_BASE_URL } from '../../lib/config';
import { clearAuth, getAuth, getDashboardPath } from '../../lib/auth';

type ResellerWhoAmI = {
  user_id: number;
  username: string;
  role: string;
  member_since: string;
  quota: number;
  products: string[];
  stock: Array<{ app_code: string; duration_unit: string; duration_value: number | null; quantity: number }>;
  keys_redeemed_by_app: Record<string, number>;
  hwid_by_app: Record<string, string>;
  hwid_resets_by_app: Record<string, { remaining: number; used: number }>;
};

type CustomerSummary = {
  user_id: number;
  username: string;
  role: string;
  parent: number | null;
  created_at: string;
  is_banned?: boolean;
  is_frozen?: boolean;
};

function joinUrl(base: string, path: string) {
  const b = base.replace(/\/$/, '');
  if (!path) return b;
  if (/^https?:\/\//i.test(path)) return path;
  if (path.startsWith('/')) return `${b}${path}`;
  return `${b}/${path}`;
}

export function ResellerDashboard() {
  const navigate = useNavigate();

  const auth = useMemo(() => getAuth(), []);
  const token = auth?.token;

  const [me, setMe] = useState<ResellerWhoAmI | null>(null);
  const [customers, setCustomers] = useState<CustomerSummary[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  function headers(extra?: Record<string, string>) {
    const h: Record<string, string> = { ...(extra || {}) };
    if (token) h.Authorization = `Bearer ${token}`;
    return h;
  }

  async function load() {
    setLoading(true);
    setError(null);
    try {
      const [a, b] = await Promise.all([
        fetch(joinUrl(API_BASE_URL, '/reseller/whoami'), { headers: headers() }),
        fetch(joinUrl(API_BASE_URL, '/reseller/users/summary'), { headers: headers() })
      ]);

      if (a.status === 401 || b.status === 401) {
        clearAuth();
        navigate('/login', { replace: true });
        return;
      }

      if (!a.ok) throw new Error(`Failed to load reseller profile (${a.status})`);
      const meOut = (await a.json()) as ResellerWhoAmI;

      let cust: CustomerSummary[] = [];
      if (b.ok) cust = (await b.json()) as CustomerSummary[];

      setMe(meOut);
      setCustomers(Array.isArray(cust) ? cust : []);
    } catch (e: any) {
      setError(String(e?.message || e || 'Failed to load'));
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
    if (role !== 'reseller') {
      navigate(getDashboardPath(role), { replace: true });
      return;
    }
    void load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
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
        </div>
      </header>

      <div className="dashboard-container">
        <main className="main-content" style={{ padding: 18 }}>
          {loading && (
            <div className="info-card">
              <div className="loading">Loading...</div>
            </div>
          )}

          {error && (
            <div className="info-card" style={{ marginBottom: 12 }}>
              <div style={{ color: 'rgb(239 68 68)' }}>{error}</div>
            </div>
          )}

          {!loading && me && (
            <>
              <div className="info-card" style={{ marginBottom: 14 }}>
                <div className="card-header">
                  <h3>Account</h3>
                </div>
                <div className="account-info">
                  <div className="info-row">
                    <span className="info-label">Username:</span>
                    <span className="info-value">{me.username}</span>
                  </div>
                  <div className="info-row">
                    <span className="info-label">User ID:</span>
                    <span className="info-value">{me.user_id}</span>
                  </div>
                  <div className="info-row">
                    <span className="info-label">Quota:</span>
                    <span className="info-value">{me.quota || 0}</span>
                  </div>
                </div>
              </div>

              <div className="info-card" style={{ marginBottom: 14 }}>
                <div className="card-header">
                  <h3>Stock</h3>
                </div>
                {me.stock?.length ? (
                  <div style={{ display: 'grid', gap: 10 }}>
                    {me.stock.map((s, idx) => (
                      <div key={`${s.app_code}-${idx}`} className="time-balance-item">
                        <div className="time-balance-header">
                          <div className="app-info">
                            <h4 className="app-name">{s.app_code}</h4>
                            <span className="app-status">
                              {s.duration_unit}
                              {s.duration_value != null ? `:${s.duration_value}` : ''} • qty {s.quantity}
                            </span>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className="loading">No stock lines.</div>
                )}
              </div>

              <div className="info-card">
                <div className="card-header">
                  <h3>Customers</h3>
                </div>
                {customers.length ? (
                  <div style={{ display: 'grid', gap: 10 }}>
                    {customers.map((c) => (
                      <div key={c.user_id} className="time-balance-item">
                        <div className="time-balance-header">
                          <div className="app-info">
                            <h4 className="app-name">{c.username}</h4>
                            <span className="app-status">id {c.user_id}</span>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className="loading">No customers yet.</div>
                )}
              </div>
            </>
          )}
        </main>
      </div>
    </div>
  );
}
