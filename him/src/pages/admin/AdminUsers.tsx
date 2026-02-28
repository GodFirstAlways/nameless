import React, { useEffect, useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { adminListUsers, adminGiveTimeAll, AdminUserRow } from '../../lib/adminUsersApi';
import './admin-users.css';

type Scope = 'all' | 'resellers' | 'customers' | 'reseller_customers';

function roleLabel(role: string) {
  const r = (role || '').toLowerCase();
  if (r === 'owner') return 'Owner';
  if (r === 'co_owner') return 'Co-owner';
  if (r === 'reseller') return 'Reseller';
  if (r === 'staff') return 'Staff';
  return 'Customer';
}

export default function AdminUsers() {
  const nav = useNavigate();
  const [scope, setScope] = useState<Scope>('all');
  const [resellerId, setResellerId] = useState<string>('');
  const [q, setQ] = useState<string>('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string>('');
  const [users, setUsers] = useState<AdminUserRow[]>([]);
  const [openMenu, setOpenMenu] = useState<number | null>(null);

  const [giveApp, setGiveApp] = useState('nochancext');
  const [giveMinutes, setGiveMinutes] = useState<number>(10);
  const [giveMsg, setGiveMsg] = useState<string>('');

  const parsedResellerId = useMemo(() => {
    const v = resellerId.trim();
    if (!v) return undefined;
    const n = Number(v);
    return Number.isFinite(n) && n > 0 ? n : undefined;
  }, [resellerId]);

  async function load() {
    setLoading(true);
    setError('');
    try {
      const opts: any = { scope, q: q.trim() || undefined };
      if (scope === 'reseller_customers') {
        if (typeof parsedResellerId !== 'number') throw new Error('Enter a valid reseller ID');
        opts.reseller_id = parsedResellerId;
      }
      const list = await adminListUsers(opts);
      setUsers(list);
    } catch (e: any) {
      setError(e?.message || 'Failed to load users');
      setUsers([]);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [scope, parsedResellerId]);

  const filtered = useMemo(() => {
    const qq = q.trim().toLowerCase();
    if (!qq) return users;
    return users.filter(u => String(u.id).includes(qq) || (u.username || '').toLowerCase().includes(qq));
  }, [users, q]);

  async function onGiveTimeAll() {
    setGiveMsg('');
    try {
      const app = giveApp.trim();
      if (!app) throw new Error('app_code is required');
      if (!Number.isFinite(giveMinutes) || giveMinutes <= 0) throw new Error('minutes must be > 0');
      const out = await adminGiveTimeAll(app, giveMinutes);
      setGiveMsg(`Credited ${out?.users_updated ?? 0} users`);
    } catch (e: any) {
      setGiveMsg(e?.message || 'Failed');
    }
  }

  return (
    <div className="au-wrap">
      <header className="au-header">
        <div>
          <h1 className="au-title">Users</h1>
          <div className="au-sub">Filter, inspect, and take actions</div>
        </div>
        <div className="au-actions">
          <button className="au-btn" onClick={load} disabled={loading}>Refresh</button>
          <button className="au-btn au-btn-primary" onClick={() => nav('/dashboard/admin')}>Back</button>
        </div>
      </header>

      <div className="au-grid">
        <aside className="au-sidebar">
          <div className="au-card">
            <div className="au-card-title">Scope</div>
            <label className="au-radio"><input type="radio" checked={scope === 'all'} onChange={() => setScope('all')} /> All</label>
            <label className="au-radio"><input type="radio" checked={scope === 'resellers'} onChange={() => setScope('resellers')} /> Resellers only</label>
            <label className="au-radio"><input type="radio" checked={scope === 'customers'} onChange={() => setScope('customers')} /> Customers only</label>
            <label className="au-radio"><input type="radio" checked={scope === 'reseller_customers'} onChange={() => setScope('reseller_customers')} /> Customers for reseller</label>
            <input
              className="au-input"
              placeholder="Reseller ID"
              value={resellerId}
              onChange={(e) => setResellerId(e.target.value)}
              disabled={scope !== 'reseller_customers'}
            />
          </div>

          <div className="au-card">
            <div className="au-card-title">Search</div>
            <input className="au-input" placeholder="username or id" value={q} onChange={(e) => setQ(e.target.value)} />
            <div className="au-hint">Search filters the loaded list instantly.</div>
          </div>

          <div className="au-card">
            <div className="au-card-title">Give time to all</div>
            <div className="au-row">
              <input className="au-input" placeholder="app_code" value={giveApp} onChange={(e) => setGiveApp(e.target.value)} />
              <input
                className="au-input"
                type="number"
                min={1}
                value={giveMinutes}
                onChange={(e) => setGiveMinutes(Number(e.target.value))}
              />
            </div>
            <button className="au-btn au-btn-danger" onClick={onGiveTimeAll}>Credit minutes</button>
            {giveMsg ? <div className="au-msg">{giveMsg}</div> : null}
          </div>
        </aside>

        <main className="au-main">
          {error ? <div className="au-error">{error}</div> : null}

          <div className="au-tablewrap">
            <table className="au-table">
              <thead>
                <tr>
                  <th>Role</th>
                  <th>Username</th>
                  <th>IP</th>
                  <th>Created</th>
                  <th>Parent</th>
                  <th>Status</th>
                  <th></th>
                </tr>
              </thead>
              <tbody>
                {loading ? (
                  <tr><td colSpan={7} className="au-muted">Loading...</td></tr>
                ) : filtered.length === 0 ? (
                  <tr><td colSpan={7} className="au-muted">No users</td></tr>
                ) : (
                  filtered.map((u) => (
                    <tr key={u.id}>
                      <td><span className={`au-badge au-badge-${(u.role || 'customer').toLowerCase()}`}>{roleLabel(u.role)}</span></td>
                      <td className="au-mono">{u.username} <span className="au-id">#{u.id}</span></td>
                      <td className="au-mono">{u.last_ip || '—'}</td>
                      <td className="au-mono">{(u.created_at || '').slice(0, 10) || '—'}</td>
                      <td className="au-mono">{u.parent_username ? `${u.parent_username} (#${u.parent_user_id})` : '—'}</td>
                      <td>
                        {!u.is_active ? <span className="au-pill au-pill-bad">Banned</span> : null}
                        {u.admin_state?.suspended_until ? <span className="au-pill au-pill-warn">Suspended</span> : null}
                        {u.admin_state?.is_frozen ? <span className="au-pill au-pill-warn">Frozen</span> : null}
                        {!u.is_active && !u.admin_state?.is_frozen && !u.admin_state?.suspended_until ? <span className="au-pill au-pill-bad">Disabled</span> : null}
                        {u.is_active && !u.admin_state?.is_frozen && !u.admin_state?.suspended_until ? <span className="au-pill au-pill-ok">OK</span> : null}
                      </td>
                      <td className="au-menu-cell">
                        <button className="au-menu-btn" onClick={() => setOpenMenu(openMenu === u.id ? null : u.id)}>⋯</button>
                        {openMenu === u.id ? (
                          <div className="au-menu" onMouseLeave={() => setOpenMenu(null)}>
                            <button className="au-menu-item" onClick={() => nav(`/dashboard/admin/users/${u.id}`)}>View details</button>
                          </div>
                        ) : null}
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </main>
      </div>
    </div>
  );
}
