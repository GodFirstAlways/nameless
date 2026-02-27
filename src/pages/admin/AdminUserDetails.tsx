import React, { useEffect, useMemo, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import {
  adminGetUserDetails,
  adminBanUser,
  adminUnbanUser,
  adminFreezeUser,
  adminUnfreezeUser,
  adminSuspendUser,
  adminUnsuspendUser,
  adminGetUserHwidHistory,
  AdminUserDetails,
  HwidHistoryEvent,
} from '../../lib/adminUsersApi';
import { API_BASE_URL } from '../../lib/config';
import './admin-user-details.css';

function fmtDate(iso?: string | null) {
  if (!iso) return '—';
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return iso;
  return d.toLocaleString();
}

export default function AdminUserDetailsPage() {
  const params = useParams<{ id: string }>();
  const navigate = useNavigate();
  const userId = Number(params.id);

  const [loading, setLoading] = useState(true);
  const [err, setErr] = useState<string | null>(null);
  const [data, setData] = useState<AdminUserDetails | null>(null);

  const [suspendMin, setSuspendMin] = useState(60);

	const [hwidReason, setHwidReason] = useState('');
	const [hwidGrantAmount, setHwidGrantAmount] = useState(1);
	const [selectedApp, setSelectedApp] = useState<string>(''); // optional filter for history only
	const [hwidHistory, setHwidHistory] = useState<HwidHistoryEvent[]>([]);
	const [hwidHistoryLoading, setHwidHistoryLoading] = useState(false);
	const [hwidHistoryLoaded, setHwidHistoryLoaded] = useState(false);

async function refresh() {
    setErr(null);
    setLoading(true);
    try {
      const d = await adminGetUserDetails(userId);
      setData(d);
    } catch (e: any) {
      setErr(e?.message ?? 'Failed to load user');
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    if (!Number.isFinite(userId) || userId <= 0) {
      setErr('Invalid user id');
      setLoading(false);
      return;
    }
    void refresh();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [userId]);

  useEffect(() => {
		// History filter defaults to "All".
		setSelectedApp('');
		// eslint-disable-next-line react-hooks/exhaustive-deps
	}, [userId]);

  const totals = useMemo(() => {
    const t = data?.entitlements?.totals || {};
    return Object.entries(t).sort((a, b) => a[0].localeCompare(b[0]));
  }, [data]);


	const appCodes = useMemo(() => {
  const set = new Set<string>();

	  // Server-provided list (preferred)
	  (data as any)?.entitlements?.apps?.forEach?.((a: any) => set.add(String(a)));

  // totals can be {app_code: seconds} or similar
  const t: any = data?.entitlements?.totals || data?.entitlements?.totals_by_app || {};
  Object.keys(t || {}).forEach((k) => set.add(String(k)));

  // tokens can be present on details in some builds
  const tok: any = data?.entitlements?.hwid_tokens_by_app || {};
  Object.keys(tok || {}).forEach((k) => set.add(String(k)));

  (data?.recent_sessions || []).forEach((s: any) => s?.app_code && set.add(String(s.app_code)));
  (data?.purchase_orders || []).forEach((o: any) => o?.app_code && set.add(String(o.app_code)));

  return Array.from(set).map((x) => x.trim()).filter(Boolean).sort((a, b) => a.localeCompare(b));
}, [data]);

	const appToCredit = (data as any)?.entitlements?.apps?.[0] || appCodes[0] || 'nochancext';

function authHeaders(): Record<string, string> {
  const token =
    localStorage.getItem('authToken') ||
    sessionStorage.getItem('authToken') ||
    localStorage.getItem('token') ||
    sessionStorage.getItem('token') ||
    '';
  return token ? { Authorization: `Bearer ${token}` } : {};
}

async function fetchJSON<T>(method: string, path: string, body?: any): Promise<T> {
  const res = await fetch(`${API_BASE_URL}${path}`, {
    method,
    headers: {
      'Content-Type': 'application/json',
      ...authHeaders(),
    },
    body: body !== undefined ? JSON.stringify(body) : undefined,
  });

  let data: any = null;
  const text = await res.text();
  if (text) {
    try { data = JSON.parse(text); } catch { data = text; }
  }
  if (!res.ok) {
    const msg = (data && (data.detail || data.message)) || `HTTP ${res.status}`;
    throw new Error(msg);
  }
  return data as T;
}

	const hwidResetsRemainingByApp = useMemo<Record<string, number>>(() => {
		const out: Record<string, number> = {};
		const byApp: any = (data as any)?.entitlements?.hwid_resets_by_app;
		if (byApp && typeof byApp === 'object') {
			for (const [k, v] of Object.entries(byApp)) {
				const rem = (v && typeof v === 'object' && 'remaining' in (v as any)) ? (v as any).remaining : v;
				out[String(k)] = Number(rem || 0) || 0;
			}
		}
		return out;
	}, [data]);

	const hwidResetsTotalRemaining = useMemo(() => {
		const v = (data as any)?.entitlements?.hwid_resets_total_remaining;
		if (typeof v === 'number') return v;
		return Object.values(hwidResetsRemainingByApp).reduce((a, b) => a + (Number(b) || 0), 0);
	}, [data, hwidResetsRemainingByApp]);

async function grantHwidResets(amount: number) {
  const tokens = Number(amount);
  if (Number.isNaN(tokens) || tokens <= 0) throw new Error('Amount must be > 0');
		// "Resets" are stored server-side as HWID reset tokens. Admin grants increase remaining.
		await fetchJSON('POST', `/admin/users/${userId}/hwid-tokens/grant`, {
			app_code: appToCredit, // auto-select first owned app; no admin selection required
			tokens,
			reason: hwidReason.trim() || undefined,
		});
  await loadHwidHistory();
  await refresh();
}

async function removeUserHwid() {
  const attempts: Array<{ method: string; path: string; body?: any }> = [
    { method: 'POST', path: `/admin/users/${userId}/hwid/clear`, body: { reason: hwidReason.trim() || null } },
			{ method: 'POST', path: `/admin/users/${userId}/hwid/remove`, body: { reason: hwidReason.trim() || null } },
    { method: 'POST', path: `/admin/users/${userId}/hwid/reset`, body: { reason: hwidReason.trim() || null } },
			// Fallback for older builds
			{ method: 'POST', path: `/reseller/users/${userId}/hwid/reset`, body: { app_code: appToCredit } },
  ];

  let lastErr: any = null;
  for (const a of attempts) {
    try {
      await fetchJSON(a.method, a.path, a.body);
      await refresh();
      await loadHwidHistory();
      return;
    } catch (e: any) {
      lastErr = e;
    }
  }
  throw lastErr || new Error('Failed to remove HWID');
}

  async function act<T>(fn: () => Promise<T>) {
    setErr(null);
    try {
      await fn();
      await refresh();
    } catch (e: any) {
      setErr(e?.message ?? 'Action failed');
    }
  }

	  async function loadHwidHistory() {
    setHwidHistoryLoading(true);
    try {
			const resp = await adminGetUserHwidHistory(userId, (selectedApp || '').trim());
      const items = Array.isArray(resp) ? resp : (resp?.events || resp?.items || []);
      setHwidHistory(items);
			setHwidHistoryLoaded(true);
    } catch (e: any) {
      setErr(e?.message ?? 'Failed to load HWID history');
    } finally {
      setHwidHistoryLoading(false);
    }
  }

  return (
    <div className="aud-wrap">
      <div className="aud-top">
        <button className="aud-back" onClick={() => navigate('/dashboard/admin/users')}>← Users</button>
        <div className="aud-title">
          <h1>User Details</h1>
          <div className="aud-sub">Admin inspect + actions</div>
        </div>
        <button className="aud-btn" onClick={() => refresh()} disabled={loading}>Refresh</button>
      </div>

      {err && <div className="aud-error">{err}</div>}

      {loading && <div className="aud-loading">Loading…</div>}

      {!loading && data && (
        <div className="aud-grid">
          <section className="aud-card">
            <h2>Profile</h2>
            <div className="aud-kv">
              <div><span>ID</span><strong>{data.user.id}</strong></div>
              <div><span>Username</span><strong>{data.user.username}</strong></div>
              <div><span>Role</span><strong>{data.user.role}</strong></div>
              <div><span>Created</span><strong>{fmtDate(data.user.created_at)}</strong></div>
              <div><span>Parent</span><strong>{data.user.parent_user_id ?? '—'}</strong></div>
              <div><span>IP</span><strong>{data.user.last_ip ?? '—'}</strong></div>
              <div><span>Active</span><strong>{data.user.is_active ? 'Yes' : 'No'}</strong></div>
            </div>
          </section>

          <section className="aud-card">
            <h2>Status</h2>
            <div className="aud-kv">
              <div><span>Frozen</span><strong>{data.user.admin_state.is_frozen ? 'Yes' : 'No'}</strong></div>
              <div><span>Frozen until</span><strong>{fmtDate(data.user.admin_state.frozen_until)}</strong></div>
              <div><span>Owner-only unfreeze</span><strong>{data.user.admin_state.freeze_owner_only ? 'Yes' : 'No'}</strong></div>
              <div><span>Suspended until</span><strong>{fmtDate(data.user.admin_state.suspended_until)}</strong></div>
              <div><span>Blacklisted</span><strong>{data.user.admin_state.is_blacklisted ? 'Yes' : 'No'}</strong></div>
            </div>
            {data.user.admin_state.note && (
              <div className="aud-note">
                <div className="aud-note-title">Note</div>
                <div className="aud-note-body">{data.user.admin_state.note}</div>
              </div>
            )}
          </section>

          <section className="aud-card">
            <h2>Entitlements</h2>
            {totals.length === 0 ? (
              <div className="aud-muted">No balances yet.</div>
            ) : (
              <table className="aud-table">
                <thead><tr><th>App</th><th>Seconds</th></tr></thead>
                <tbody>
                  {totals.map(([k, v]) => (
                    <tr key={k}><td>{k}</td><td>{v}</td></tr>
                  ))}
                </tbody>
              </table>
            )}
          </section>

          <section className="aud-card">
            <h2>Recent Sessions</h2>
            {data.recent_sessions.length === 0 ? (
              <div className="aud-muted">No sessions found.</div>
            ) : (
				  <div className="aud-table-scroll aud-table-scroll-card">
					<table className="aud-table">
					  <thead><tr><th>App</th><th>HWID</th><th>Last seen</th></tr></thead>
					  <tbody>
						{data.recent_sessions.map((s, idx) => (
						  <tr key={idx}><td>{s.app_code}</td><td className="aud-mono">{s.hwid || '—'}</td><td>{fmtDate(s.last_seen_at)}</td></tr>
						))}
					  </tbody>
					</table>
				  </div>
            )}
          </section>

          <section className="aud-card">
            <h2>Recent Downloads</h2>
            {data.recent_downloads.length === 0 ? (
              <div className="aud-muted">No downloads found.</div>
            ) : (
				  <div className="aud-table-scroll aud-table-scroll-card">
					<table className="aud-table">
					  <thead><tr><th>Artifact</th><th>When</th></tr></thead>
					  <tbody>
						{data.recent_downloads.map((d, idx) => (
						  <tr key={idx}><td>{d.artifact_id}</td><td>{fmtDate(d.created_at)}</td></tr>
						))}
					  </tbody>
					</table>
				  </div>
            )}
          </section>

          <section className="aud-card aud-actions">
            <h2>Admin Actions</h2>
            <div className="aud-actions-grid">
              <div className="aud-action">
                <div className="aud-action-title">Ban / Unban</div>
                <div className="aud-action-sub">Ban toggles User.is_active (blocks login).</div>
                <div className="aud-action-row">
                  <button className="aud-btn" onClick={() => act(() => adminBanUser(userId))}>Ban</button>
                  <button className="aud-btn" onClick={() => act(() => adminUnbanUser(userId))}>Unban</button>
                </div>
              </div>

              <div className="aud-action">
                <div className="aud-action-title">Freeze / Unfreeze</div>
                <div className="aud-action-sub">Freeze blocks API usage; owner-only unfreeze can be enforced.</div>
                <div className="aud-action-row">
                  <button className="aud-btn" onClick={() => act(() => adminFreezeUser(userId, true))}>Freeze (owner-only)</button>
                  <button className="aud-btn" onClick={() => act(() => adminUnfreezeUser(userId))}>Unfreeze</button>
                </div>
              </div>

              <div className="aud-action">
                <div className="aud-action-title">Suspend</div>
                <div className="aud-action-sub">Suspended users cannot authenticate while suspended.</div>
                <div className="aud-action-row">
                  <input
                    className="aud-input"
                    type="number"
                    value={suspendMin}
                    min={1}
                    onChange={(e) => setSuspendMin(Number(e.target.value) || 0)}
                    placeholder="Minutes"
                  />
                  <button className="aud-btn" onClick={() => act(() => adminSuspendUser(userId, suspendMin))}>Suspend</button>
                  <button className="aud-btn" onClick={() => act(() => adminUnsuspendUser(userId))}>Clear</button>
                </div>
              </div>

              
<div className="aud-action aud-action-wide">
  <div className="aud-action-title">HWID Resets &amp; HWID Removal</div>
  <div className="aud-action-sub">
    Grant HWID reset credits, remove a user’s bound HWID, and review HWID-related history.
  </div>

  <div className="aud-appchips" style={{ marginTop: 10 }}>
    {appCodes.length ? (
      <>
        <button
          className={`aud-chip ${selectedApp === '' ? 'aud-chip-active' : ''}`}
          onClick={() => setSelectedApp('')}
          type="button"
        >
          All
        </button>
        {appCodes.map((c) => (
          <button
            key={c}
            className={`aud-chip ${selectedApp === c ? 'aud-chip-active' : ''}`}
            onClick={() => setSelectedApp((prev) => (prev === c ? '' : c))}
            type="button"
          >
            {c}
          </button>
        ))}
      </>
    ) : (
      <div className="aud-muted">No applications detected for this user yet.</div>
    )}
  </div>

  <div className="aud-action-row" style={{ marginTop: 10, alignItems: 'center', flexWrap: 'wrap' as any }}>
    <input
      className="aud-input"
      type="number"
      min={1}
      value={hwidGrantAmount}
      onChange={(e) => setHwidGrantAmount(Number(e.target.value || 1))}
    />
    <button
      className="aud-btn"
      onClick={() => act(() => grantHwidResets(hwidGrantAmount))}
      disabled={hwidHistoryLoading}
    >
      Grant Resets
    </button>
    <button className="aud-btn aud-btn-danger" onClick={() => act(() => removeUserHwid())}>
      Remove HWID
    </button>
    <button className="aud-btn" onClick={() => void loadHwidHistory()} disabled={hwidHistoryLoading}>
      {hwidHistoryLoading ? 'Loading…' : 'Load History'}
    </button>
  </div>

  <div className="aud-action-row" style={{ marginTop: 10 }}>
    <input
      className="aud-input aud-input-wide"
      placeholder="Reason (optional)"
      value={hwidReason}
      onChange={(e) => setHwidReason(e.target.value)}
    />
  </div>

  <div style={{ marginTop: 10 }}>
    <div className="aud-note-title">HWID resets remaining</div>
    <div className="aud-kpis">
      <div className="aud-kpi">
        <span>Total remaining</span>
        <strong>{hwidResetsTotalRemaining}</strong>
      </div>
      <div className="aud-kpi">
        <span>Auto-credit app</span>
        <strong>{appToCredit}</strong>
      </div>
    </div>

    {Object.keys(hwidResetsRemainingByApp || {}).length ? (
      <div className="aud-table-scroll aud-table-scroll-card" style={{ marginTop: 10 }}>
        <table className="aud-table">
          <thead>
            <tr>
              <th>Application</th>
              <th>Remaining</th>
            </tr>
          </thead>
          <tbody>
            {Object.entries(hwidResetsRemainingByApp)
              .sort((a, b) => a[0].localeCompare(b[0]))
              .map(([app, n]) => (
                <tr key={app}>
                  <td>{app}</td>
                  <td>{n}</td>
                </tr>
              ))}
          </tbody>
        </table>
      </div>
    ) : (
      <div className="aud-muted">No HWID reset data available for this user.</div>
    )}
  </div>

  {(hwidHistoryLoaded || hwidHistoryLoading) && (
    <div style={{ marginTop: 10 }}>
      <div className="aud-note-title">HWID history</div>
      {hwidHistory.length === 0 && !hwidHistoryLoading ? (
        <div className="aud-muted">No HWID history events found.</div>
      ) : (
        <div className="aud-table-scroll aud-table-scroll-history">
          <table className="aud-table aud-history-table">
            <thead>
              <tr>
                <th>When</th>
                <th>App</th>
                <th>Action</th>
                <th>Old</th>
                <th>New</th>
                <th>Actor</th>
                <th>IP</th>
                <th>Note</th>
              </tr>
            </thead>
            <tbody>
              {hwidHistory.map((ev, idx) => {
                const x: any = ev as any;
                const actionRaw = x.kind || x.action || x.event_type || 'event';
                const action = String(actionRaw).replace(/_/g, ' ');
                const oldH = x.old_hwid_last12 || x.before_hwid_last12 || x.old_last12 || x.before_hwid || x.old_hwid || null;
                const newH = x.new_hwid_last12 || x.after_hwid_last12 || x.new_last12 || x.after_hwid || x.new_hwid || null;
                const actorObj = x.actor;
                const actorName = (actorObj && typeof actorObj === 'object') ? (actorObj.username ?? actorObj.name ?? actorObj.id) : null;
                const actor = actorName || x.actor_username || x.actor_role || x.actor_user_id || '—';
                const note = x.note || x.reason || x.message || '—';
                const ip = x.ip || x.ip_address || '—';
                const newDisplay = (newH === null || newH === undefined || newH === '') ? (oldH ? 'cleared' : '—') : newH;

                return (
                  <tr key={idx}>
                    <td>{fmtDate(x.created_at || x.timestamp || x.when)}</td>
                    <td>{x.app_code || '—'}</td>
                    <td>{String(action)}</td>
                    <td className="aud-mono">{oldH || '—'}</td>
                    <td className="aud-mono">{newDisplay}</td>
                    <td>{String(actor)}</td>
                    <td className="aud-mono">{ip}</td>
                    <td className="aud-history-note">{String(note)}</td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}
    </div>
  )}
</div>
            </div>
          </section>

          <section className="aud-card">
            <h2>Purchase Orders</h2>
            {data.purchase_orders.length === 0 ? (
              <div className="aud-muted">No purchases found.</div>
            ) : (
              <table className="aud-table">
                <thead><tr><th>Order</th><th>Status</th><th>App</th><th>Created</th></tr></thead>
                <tbody>
                  {data.purchase_orders.map((p, idx) => (
                    <tr key={idx}>
                      <td className="aud-mono">{p.paypal_order_id || p.id}</td>
                      <td>{p.paypal_status || '—'}</td>
                      <td>{p.app_code || '—'}</td>
                      <td>{fmtDate(p.created_at)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </section>
        </div>
      )}
    </div>
  );
}
