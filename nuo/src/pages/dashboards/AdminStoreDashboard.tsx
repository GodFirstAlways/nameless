import { useEffect, useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { getAuth, getDashboardPath } from '../../lib/auth';
import {
  adminGetPlanSpecs,
  adminUpsertPrice,
  adminGetContent,
  adminSetContent,
  adminListMedia,
  adminUploadMedia,
  adminSetMediaOrder,
  adminDeleteMedia,
  adminGetProductMeta,
  adminSetProductMeta,
  type AdminPlan,
  type AdminMediaItem,
  type AdminProductMeta
} from '../../lib/adminStoreApi';

function uniq<T>(arr: T[]): T[] {
  return Array.from(new Set(arr));
}

export function AdminStoreDashboard() {
  const navigate = useNavigate();
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState<string | null>(null);

  // Content
  const [tos, setTos] = useState('');
  const [privacy, setPrivacy] = useState('');

  // Plans/pricing
  const [plans, setPlans] = useState<AdminPlan[]>([]);
  const [appCode, setAppCode] = useState<string>('nochancext');

  // Media
  const [media, setMedia] = useState<AdminMediaItem[]>([]);
  const [videoFile, setVideoFile] = useState<File | null>(null);
  const [imageFiles, setImageFiles] = useState<File[]>([]);
  const [featuredMode, setFeaturedMode] = useState<'video' | 'first' | 'none'>('first');

  // Product meta
  const [meta, setMeta] = useState<AdminProductMeta | null>(null);

  const appCodes = useMemo(() => {
    const codes = plans.map((p) => p.app_code).filter(Boolean);
    const unique = uniq(codes);
    const withSelected = appCode && !unique.includes(appCode) ? [...unique, appCode] : unique;
    return withSelected.length ? withSelected : ['nochancext'];
  }, [plans, appCode]);

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
  }, [navigate]);

  async function loadAll(selectedApp?: string) {
    setBusy(true);
    setErr(null);
    try {
      const [plansOut, tosOut, privacyOut] = await Promise.all([
        adminGetPlanSpecs(),
        adminGetContent('tos'),
        adminGetContent('privacy')
      ]);
      setPlans(plansOut);
      setTos(String(tosOut?.body ?? ''));
      setPrivacy(String(privacyOut?.body ?? ''));

      const app = selectedApp || (plansOut[0]?.app_code ?? appCode);
      setAppCode(app);

      const [mediaOut, metaOut] = await Promise.all([adminListMedia(app), adminGetProductMeta(app)]);
      setMedia(mediaOut);
      setMeta(metaOut);
    } catch (e: any) {
      setErr(e?.message || 'Failed to load store data');
    } finally {
      setBusy(false);
    }
  }

  useEffect(() => {
    const qs = new URLSearchParams(window.location.search);
    const preferred = String(qs.get('app') || qs.get('app_code') || '').trim();
    loadAll(preferred || undefined).catch(() => {});
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  async function onSelectApp(newApp: string) {
    setAppCode(newApp);
    setBusy(true);
    setErr(null);
    try {
      const [mediaOut, metaOut] = await Promise.all([adminListMedia(newApp), adminGetProductMeta(newApp)]);
      setMedia(mediaOut);
      setMeta(metaOut);
    } catch (e: any) {
      setErr(e?.message || 'Failed to load app data');
    } finally {
      setBusy(false);
    }
  }

  function reorderLocal(from: number, to: number) {
    if (to < 0 || to >= media.length) return media;
    const copy = [...media];
    const [it] = copy.splice(from, 1);
    copy.splice(to, 0, it);
    // normalize order numbers locally
    return copy.map((m, idx) => ({ ...m, order: idx }));
  }

  async function persistOrder(next: AdminMediaItem[], featuredId?: number | null) {
    setBusy(true);
    setErr(null);
    try {
      const orderIds = next.map((m) => m.id);
      const featured = featuredId ?? (next.find((m) => m.featured)?.id ?? null);
      await adminSetMediaOrder(appCode, orderIds, featured);
      const refreshed = await adminListMedia(appCode);
      setMedia(refreshed);
    } catch (e: any) {
      setErr(e?.message || 'Failed to save order');
    } finally {
      setBusy(false);
    }
  }

  async function setFeatured(id: number) {
    const next = media.map((m) => ({ ...m, featured: m.id === id }));
    await persistOrder(next, id);
  }

  async function moveUp(i: number) {
    const next = reorderLocal(i, i - 1);
    setMedia(next);
    await persistOrder(next);
  }

  async function moveDown(i: number) {
    const next = reorderLocal(i, i + 1);
    setMedia(next);
    await persistOrder(next);
  }

  async function removeMedia(id: number) {
    setBusy(true);
    setErr(null);
    try {
      await adminDeleteMedia(appCode, id);
      const refreshed = await adminListMedia(appCode);
      setMedia(refreshed);
    } catch (e: any) {
      setErr(e?.message || 'Delete failed');
    } finally {
      setBusy(false);
    }
  }

  async function upload() {
    if (!videoFile && !imageFiles.length) return;
    setBusy(true);
    setErr(null);
    try {
      await adminUploadMedia(appCode, { video: videoFile, images: imageFiles, featured: featuredMode });
      setVideoFile(null);
      setImageFiles([]);
      const refreshed = await adminListMedia(appCode);
      setMedia(refreshed);
    } catch (e: any) {
      setErr(e?.message || 'Upload failed');
    } finally {
      setBusy(false);
    }
  }

  async function saveContent() {
    setBusy(true);
    setErr(null);
    try {
      await Promise.all([adminSetContent('tos', tos), adminSetContent('privacy', privacy)]);
    } catch (e: any) {
      setErr(e?.message || 'Failed to save content');
    } finally {
      setBusy(false);
    }
  }

  async function saveMeta() {
    if (!meta) return;
    setBusy(true);
    setErr(null);
    try {
      await adminSetProductMeta(appCode, meta);
      const refreshed = await adminGetProductMeta(appCode);
      setMeta(refreshed);
    } catch (e: any) {
      setErr(e?.message || 'Failed to save meta');
    } finally {
      setBusy(false);
    }
  }

  const appPlans = useMemo(() => plans.filter((p) => p.app_code === appCode), [plans, appCode]);

  return (
    <div className="min-h-screen bg-gradient-to-br from-black via-gray-900 to-black text-white pt-24 pb-12">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 space-y-10">
        <div className="flex items-center justify-between gap-4">
          <div>
            <h1 className="text-3xl font-bold">Admin Store</h1>
            <p className="text-gray-300">Manage TOS/Privacy, pricing, and product media.</p>
          </div>
          <div className="flex gap-3">
            <button
              className="px-4 py-2 rounded-lg border border-white/10 bg-white/5 hover:bg-white/10"
              onClick={() => navigate('/dashboard/admin')}
            >
              Back to Admin
            </button>
            <button
              className="px-4 py-2 rounded-lg border border-white/10 bg-cyan-500/20 hover:bg-cyan-500/30"
              disabled={busy}
              onClick={() => loadAll(appCode)}
            >
              Refresh
            </button>
          </div>
        </div>

        {err && (
          <div className="p-4 rounded-xl border border-red-500/30 bg-red-500/10 text-red-200">{err}</div>
        )}

        {/* App selector */}
        <div className="p-5 rounded-2xl border border-white/10 bg-white/5">
          <div className="flex flex-wrap items-center gap-4">
            <div className="text-sm text-gray-300">Selected app</div>
            <select
              className="px-3 py-2 rounded-lg bg-black/40 border border-white/10"
              value={appCode}
              onChange={(e) => onSelectApp(e.target.value)}
            >
              {appCodes.map((c) => (
                <option key={c} value={c}>
                  {c}
                </option>
              ))}
            </select>
            <div className="text-xs text-gray-400">
              Tip: add a new plan spec on the server to make a new app appear here.
            </div>
          </div>
        </div>

        {/* Product meta */}
        <div className="p-5 rounded-2xl border border-white/10 bg-white/5 space-y-4">
          <div className="flex items-center justify-between">
            <h2 className="text-xl font-semibold">Product info</h2>
            <button
              className="px-4 py-2 rounded-lg border border-white/10 bg-white/5 hover:bg-white/10"
              onClick={saveMeta}
              disabled={busy || !meta}
            >
              Save product info
            </button>
          </div>

          {!meta ? (
            <div className="text-gray-400">No meta loaded.</div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="text-sm text-gray-300">Name</label>
                <input
                  className="mt-1 w-full px-3 py-2 rounded-lg bg-black/40 border border-white/10"
                  value={meta.name}
                  onChange={(e) => setMeta({ ...meta, name: e.target.value })}
                />
              </div>
              <div>
                <label className="text-sm text-gray-300">Tagline</label>
                <input
                  className="mt-1 w-full px-3 py-2 rounded-lg bg-black/40 border border-white/10"
                  value={meta.tagline}
                  onChange={(e) => setMeta({ ...meta, tagline: e.target.value })}
                />
              </div>
              <div className="md:col-span-2">
                <label className="text-sm text-gray-300">Description</label>
                <textarea
                  className="mt-1 w-full px-3 py-2 rounded-lg bg-black/40 border border-white/10 min-h-[120px]"
                  value={meta.description}
                  onChange={(e) => setMeta({ ...meta, description: e.target.value })}
                />
              </div>
              <div>
                <label className="text-sm text-gray-300">Status</label>
                <select
                  className="mt-1 w-full px-3 py-2 rounded-lg bg-black/40 border border-white/10"
                  value={meta.status}
                  onChange={(e) => setMeta({ ...meta, status: e.target.value })}
                >
                  <option value="available">available</option>
                  <option value="coming_soon">coming_soon</option>
                </select>
              </div>
              <div className="text-xs text-gray-400 flex items-end">
                This overrides the website’s built-in product text for this app.
              </div>
            </div>
          )}
        </div>

        {/* Pricing */}
        <div className="p-5 rounded-2xl border border-white/10 bg-white/5 space-y-4">
          <h2 className="text-xl font-semibold">Pricing</h2>
          {appPlans.length ? (
            <div className="space-y-3">
              {appPlans.map((p) => (
                <PriceRow key={p.plan_id} plan={p} onSave={adminUpsertPrice} busy={busy} onError={setErr} />
              ))}
            </div>
          ) : (
            <div className="text-gray-400">No plans found for this app.</div>
          )}
        </div>

        {/* Media manager */}
        <div className="p-5 rounded-2xl border border-white/10 bg-white/5 space-y-4">
          <div className="flex items-center justify-between">
            <h2 className="text-xl font-semibold">Media</h2>
            <div className="text-xs text-gray-400">Video is optional; order controls display order on the product page.</div>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
            <div className="lg:col-span-1 space-y-3">
              <div>
                <label className="text-sm text-gray-300">Upload video</label>
                <input
                  type="file"
                  accept="video/*"
                  className="mt-1 block w-full text-sm text-gray-300 file:mr-4 file:py-2 file:px-4 file:rounded-lg file:border-0 file:bg-white/10 file:text-white hover:file:bg-white/20"
                  onChange={(e) => setVideoFile(e.target.files?.[0] || null)}
                />
              </div>
              <div>
                <label className="text-sm text-gray-300">Upload images</label>
                <input
                  type="file"
                  accept="image/*"
                  multiple
                  className="mt-1 block w-full text-sm text-gray-300 file:mr-4 file:py-2 file:px-4 file:rounded-lg file:border-0 file:bg-white/10 file:text-white hover:file:bg-white/20"
                  onChange={(e) => setImageFiles(Array.from(e.target.files || []))}
                />
              </div>
              <div>
                <label className="text-sm text-gray-300">Featured behavior</label>
                <select
                  className="mt-1 w-full px-3 py-2 rounded-lg bg-black/40 border border-white/10"
                  value={featuredMode}
                  onChange={(e) => setFeaturedMode(e.target.value as any)}
                >
                  <option value="first">Make first uploaded item featured</option>
                  <option value="video">If video uploaded, make it featured</option>
                  <option value="none">Don’t change featured</option>
                </select>
              </div>
              <button
                className="w-full px-4 py-2 rounded-lg border border-white/10 bg-cyan-500/20 hover:bg-cyan-500/30 disabled:opacity-50"
                disabled={busy || (!videoFile && !imageFiles.length)}
                onClick={upload}
              >
                Upload
              </button>
            </div>

            <div className="lg:col-span-2">
              {media.length ? (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {media.map((m, idx) => (
                    <div key={m.id} className="rounded-xl border border-white/10 bg-black/30 overflow-hidden">
                      <div className="relative">
                        {m.type === 'video' ? (
                          <div className="aspect-video bg-black">
                            <video className="w-full h-full" controls preload="metadata">
                              <source src={m.url} />
                            </video>
                          </div>
                        ) : (
                          <div className="aspect-video bg-black">
                            <img src={m.url} alt="" className="w-full h-full object-cover" />
                          </div>
                        )}
                        {m.featured && (
                          <div className="absolute top-2 left-2 px-2 py-1 rounded bg-cyan-500/30 border border-cyan-500/40 text-xs">
                            Featured
                          </div>
                        )}
                      </div>
                      <div className="p-3 flex flex-wrap gap-2">
                        <button
                          className="px-3 py-1 rounded-lg border border-white/10 bg-white/5 hover:bg-white/10"
                          onClick={() => setFeatured(m.id)}
                          disabled={busy}
                        >
                          Set featured
                        </button>
                        <button
                          className="px-3 py-1 rounded-lg border border-white/10 bg-white/5 hover:bg-white/10"
                          onClick={() => moveUp(idx)}
                          disabled={busy || idx === 0}
                        >
                          Up
                        </button>
                        <button
                          className="px-3 py-1 rounded-lg border border-white/10 bg-white/5 hover:bg-white/10"
                          onClick={() => moveDown(idx)}
                          disabled={busy || idx === media.length - 1}
                        >
                          Down
                        </button>
                        <button
                          className="px-3 py-1 rounded-lg border border-red-500/20 bg-red-500/10 hover:bg-red-500/20"
                          onClick={() => removeMedia(m.id)}
                          disabled={busy}
                        >
                          Delete
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="text-gray-400">No media yet. Upload a video and/or images.</div>
              )}
            </div>
          </div>
        </div>

        {/* Public content */}
        <div className="p-5 rounded-2xl border border-white/10 bg-white/5 space-y-4">
          <div className="flex items-center justify-between">
            <h2 className="text-xl font-semibold">Public content</h2>
            <button
              className="px-4 py-2 rounded-lg border border-white/10 bg-white/5 hover:bg-white/10"
              onClick={saveContent}
              disabled={busy}
            >
              Save TOS + Privacy
            </button>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
            <div>
              <label className="text-sm text-gray-300">Terms of Service</label>
              <textarea
                className="mt-1 w-full px-3 py-2 rounded-lg bg-black/40 border border-white/10 min-h-[220px]"
                value={tos}
                onChange={(e) => setTos(e.target.value)}
              />
            </div>
            <div>
              <label className="text-sm text-gray-300">Privacy Policy</label>
              <textarea
                className="mt-1 w-full px-3 py-2 rounded-lg bg-black/40 border border-white/10 min-h-[220px]"
                value={privacy}
                onChange={(e) => setPrivacy(e.target.value)}
              />
            </div>
          </div>
        </div>

        <div className="text-xs text-gray-500">
          Note: public endpoints use ETag + If-None-Match so repeat loads can return 304 Not Modified.
        </div>
      </div>
    </div>
  );
}

function PriceRow({
  plan,
  onSave,
  busy,
  onError
}: {
  plan: AdminPlan;
  onSave: (p: { plan_id: string; amount: string; currency: string; is_active: boolean }) => Promise<any>;
  busy: boolean;
  onError: (m: string | null) => void;
}) {
  const [amount, setAmount] = useState(plan.amount);
  const [currency, setCurrency] = useState(plan.currency || 'USD');
  const [active, setActive] = useState(true);
  const [rowBusy, setRowBusy] = useState(false);

  useEffect(() => {
    setAmount(plan.amount);
    setCurrency(plan.currency || 'USD');
  }, [plan.amount, plan.currency]);

  async function save() {
    setRowBusy(true);
    onError(null);
    try {
      await onSave({ plan_id: plan.plan_id, amount: amount.trim(), currency: currency.trim(), is_active: active });
    } catch (e: any) {
      onError(e?.message || 'Failed to save price');
    } finally {
      setRowBusy(false);
    }
  }

  const label = plan.duration_value ? `${plan.duration_value} ${plan.duration_unit}` : plan.duration_unit;

  return (
    <div className="flex flex-wrap items-center gap-3 p-3 rounded-xl border border-white/10 bg-black/30">
      <div className="flex-1 min-w-[220px]">
        <div className="font-medium">{plan.plan_id}</div>
        <div className="text-xs text-gray-400">{label}</div>
      </div>
      <div className="flex items-center gap-2">
        <input
          className="w-28 px-3 py-2 rounded-lg bg-black/40 border border-white/10"
          value={amount}
          onChange={(e) => setAmount(e.target.value)}
        />
        <input
          className="w-20 px-3 py-2 rounded-lg bg-black/40 border border-white/10"
          value={currency}
          onChange={(e) => setCurrency(e.target.value)}
        />
        <label className="text-xs text-gray-300 flex items-center gap-2">
          <input type="checkbox" checked={active} onChange={(e) => setActive(e.target.checked)} />
          Active
        </label>
        <button
          className="px-4 py-2 rounded-lg border border-white/10 bg-white/5 hover:bg-white/10 disabled:opacity-50"
          onClick={save}
          disabled={busy || rowBusy}
        >
          Save
        </button>
      </div>
    </div>
  );
}
