import { useEffect, useMemo, useState } from 'react';
import { useParams, Link } from 'react-router-dom';
import { API_BASE_URL } from '../lib/config';
import { useAuth } from '../lib/useAuth';
import { fetchPlanPricesWithCache, fetchProductImagesWithCache, fetchProductMediaWithCache, fetchProductMetaWithCache, formatMoney, type PublicMediaItem, type ProductMeta } from '../lib/publicContent';

type PlanOption = {
  id: string; // plan_id understood by the server
  label: string;
  detail: string;
};

type Product = {
  slug: string;
  appCode: string;
  name: string;
  status: 'available' | 'coming_soon';
  tagline: string;
  description: string[];
  features: { title: string; description: string }[];
  specs: { label: string; value: string }[];
  images: string[];
  plans: PlanOption[];
};

const PRODUCT_CATALOG: Record<string, Product> = {
  'nochance-external': {
    slug: 'nochance-external',
    appCode: 'nochancext',
    name: 'NoChance External',
    status: 'available',
    tagline: 'NoChance for a reason. We don\'t care about flashy looks or being feature-rich — we promise high performance.',
    description: [
      'Smart Login — the first login requires typing, while the second and third logins are almost effortless.',
      'Automatic Updates — no need to re-download the application; just launch as usual.',
      'Cool Dashboard — a customer portal for downloads, resets, time balances, and updates.'
    ],
    features: [
      { title: 'Smart Login', description: 'Fast sign-in flow with session continuity for repeat use.' },
      { title: 'Automatic Updates', description: 'Fetches the latest offsets and drivers from the server when available.' },
      { title: 'Customer Dashboard', description: 'Manage time balances, downloads, and account settings.' }
    ],
    specs: [
      { label: 'Delivery', value: 'Instant license key after payment capture' },
      { label: 'Activation', value: 'Time starts at first use' },
      { label: 'Platform', value: 'Windows (support expanding over time)' },
      { label: 'Support', value: 'Report an unsupported environment to receive +2 hours when support is added' }
    ],
    images: [
      '/products/nochance/1.svg',
      '/products/nochance/2.svg',
      '/products/nochance/3.svg',
      '/products/nochance/4.svg',
      '/products/nochance/5.svg'
    ],
    plans: [
      { id: 'nochancext_1d', label: '1 Day', detail: 'Best for quick testing' },
      { id: 'nochancext_3d', label: '3 Days', detail: 'Short weekend use' },
      { id: 'nochancext_7d', label: '7 Days', detail: 'One-week access' },
      { id: 'nochancext_1m', label: '1 Month', detail: 'Most popular duration' },
      { id: 'nochancext_lifetime', label: 'Lifetime', detail: 'One-time purchase' }
    ]
  }
};

declare global {
  interface Window {
    paypal?: any;
  }
}

function loadPayPalScript(clientId: string, currency: string) {
  return new Promise<void>((resolve, reject) => {
    const id = 'paypal-sdk';

    const src =
      `https://www.paypal.com/sdk/js?client-id=${encodeURIComponent(clientId)}` +
      `&currency=${encodeURIComponent(currency)}` +
      `&intent=capture&components=buttons`;

    const existing = document.getElementById(id) as HTMLScriptElement | null;

    // If a script exists but the SDK isn't available, remove and re-load.
    if (existing && (!window.paypal || !window.paypal.Buttons)) {
      existing.remove();
    }

    // If SDK is already available, we are done.
    if (window.paypal && window.paypal.Buttons) {
      return resolve();
    }

    // If the script exists (after possible removal), wait for it.
    const existing2 = document.getElementById(id) as HTMLScriptElement | null;
    if (existing2) {
      existing2.addEventListener(
        'load',
        () => {
          if (window.paypal && window.paypal.Buttons) resolve();
          else reject(new Error('PayPal SDK loaded but Buttons is unavailable (check components=buttons).'));
        },
        { once: true }
      );
      existing2.addEventListener('error', () => reject(new Error('Failed to load PayPal SDK')), { once: true });
      return;
    }

    const script = document.createElement('script');
    script.id = id;
    script.src = src;
    script.async = true;
    script.onload = () => {
      if (window.paypal && window.paypal.Buttons) resolve();
      else reject(new Error('PayPal SDK loaded but Buttons is unavailable (check components=buttons).'));
    };
    script.onerror = () => reject(new Error('Failed to load PayPal SDK'));
    document.body.appendChild(script);
  });
}

export function ProductDetail() {
  const { slug } = useParams();
  const auth = useAuth();

  const product = useMemo(() => (slug ? PRODUCT_CATALOG[slug] : undefined), [slug]);

  const [activeImage, setActiveImage] = useState(0);
  const [selectedPlanId, setSelectedPlanId] = useState<string>(() => product?.plans?.[0]?.id || '');
  const [galleryImages, setGalleryImages] = useState<string[]>([]);
  const [media, setMedia] = useState<PublicMediaItem[] | null>(null);
  const [serverMeta, setServerMeta] = useState<ProductMeta | null>(null);
  const [planPrices, setPlanPrices] = useState<{ currency: string; prices: Record<string, number> } | null>(null);
  const [pricingBusy, setPricingBusy] = useState<boolean>(false);
  const [paypalReady, setPaypalReady] = useState(false);
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState<string | null>(null);
  const [licenseKey, setLicenseKey] = useState<string | null>(null);
  const [lastOrderId, setLastOrderId] = useState<string | null>(null);
  const [checkingStatus, setCheckingStatus] = useState(false);
  const [mediaView, setMediaView] = useState<'video' | 'image'>('image');
  const [mediaViewLocked, setMediaViewLocked] = useState(false);

  async function checkOrderStatus(orderId: string, autoPoll = false) {
    if (!auth?.token) {
      setErr('Please log in to check your order status.');
      return;
    }
    setCheckingStatus(true);
    try {
      const res = await fetch(`${API_BASE_URL}/payments/paypal/order-status/${encodeURIComponent(orderId)}`, {
        method: 'GET',
        headers: { Authorization: `Bearer ${auth.token}` }
      });
      const out = await res.json();
      if (!res.ok) {
        throw new Error(out?.detail ? JSON.stringify(out.detail) : 'Failed to fetch order status');
      }
      if (out.license_key) {
        setLicenseKey(out.license_key);
        setErr(null);
        return true;
      }
      // Not fulfilled yet
      if (autoPoll) {
        setErr(`Payment status: ${out.status}. Waiting for completion...`);
      } else {
        setErr(`Payment status: ${out.status}. No key issued yet.`);
      }
      return false;
    } catch (e: any) {
      setErr(e?.message || 'Failed to fetch order status');
      return false;
    } finally {
      setCheckingStatus(false);
    }
  }

  async function pollOrderStatus(orderId: string, maxSeconds = 60) {
    const start = Date.now();
    while (Date.now() - start < maxSeconds * 1000) {
      const done = await checkOrderStatus(orderId, true);
      if (done) return;
      await new Promise((r) => setTimeout(r, 3000));
    }
    setErr('Payment is still pending. You can click “Check status” again later.');
  }

  useEffect(() => {
    setSelectedPlanId(product?.plans?.[0]?.id || '');
    setActiveImage(0);
    setErr(null);
    setLicenseKey(null);
    setGalleryImages([]);

    // Load server-driven media/meta + pricing (cached locally)
    if (product?.appCode) {
      const appCode = product.appCode;

      (async () => {
        try {
          const m = await fetchProductMediaWithCache(appCode, 12 * 60 * 60 * 1000);
          if (m) setMedia(m);

          // Prefer server media images, but don't fall back to local placeholders.
          if (m && m.length) {
            const imgs = m.filter((x) => x.type === 'image').map((x) => x.url);
            setGalleryImages(imgs);
          } else {
            const imgs = await fetchProductImagesWithCache(appCode, 12 * 60 * 60 * 1000);
            setGalleryImages(imgs || []);
          }
        } catch {
          // ignore; fallback to bundled images
        }
      })();

      (async () => {
        try {
          const meta = await fetchProductMetaWithCache(appCode, 12 * 60 * 60 * 1000);
          if (meta) setServerMeta(meta);
        } catch {
          // ignore
        }
      })();

      (async () => {
        setPricingBusy(true);
        try {
          const prices = await fetchPlanPricesWithCache(appCode, 60 * 60 * 1000);
          if (prices && Object.keys(prices.prices).length) setPlanPrices(prices);
        } catch {
          // ignore
        } finally {
          setPricingBusy(false);
        }
      })();
    }
  }, [product?.slug]);

  useEffect(() => {
    async function boot() {
      setPaypalReady(false);
      setErr(null);

      const clientId = (import.meta.env.VITE_PAYPAL_CLIENT_ID as string) || '';
      const currency = (import.meta.env.VITE_PAYPAL_CURRENCY as string) || 'USD';

      if (!clientId) {
        setErr('PayPal client id is not set. Add VITE_PAYPAL_CLIENT_ID in your env.');
        return;
      }

      try {
        await loadPayPalScript(clientId, currency);
        setPaypalReady(true);
      } catch (e: any) {
        setErr(e?.message || 'Failed to load PayPal');
      }
    }
    if (product?.status === 'available') {
      boot();
    }
  }, [product?.status]);

  useEffect(() => {
    if (!paypalReady) return;
    if (!product) return;
    if (!selectedPlanId) return;

    const container = document.getElementById('paypal-buttons');
    if (!container) return;
    container.innerHTML = '';

    if (!auth?.token) {
      return;
    }


    // Render PayPal buttons
    if (!window.paypal || !window.paypal.Buttons) {
      setErr('PayPal SDK is not ready (window.paypal.Buttons is missing). Check your VITE_PAYPAL_CLIENT_ID and SDK params.');
      setPaypalReady(false);
      return;
    }

    window.paypal
      .Buttons({
        createOrder: async () => {
          setBusy(true);
          setErr(null);
          setLicenseKey(null);
          try {
            const res = await fetch(`${API_BASE_URL}/payments/paypal/create-order`, {
              method: 'POST',
              headers: {
                'Content-Type': 'application/json',
                Authorization: `Bearer ${auth.token}`
              },
              body: JSON.stringify({ plan_id: selectedPlanId })
            });
            const data = await res.json();
            if (!res.ok) {
              throw new Error(data?.detail ? JSON.stringify(data.detail) : 'Failed to create PayPal order');
            }
            setLastOrderId(data.order_id);
            return data.order_id;
          } finally {
            setBusy(false);
          }
        },
        onApprove: async (data: any) => {
          setBusy(true);
          setErr(null);
          setLicenseKey(null);
          try {
            const res = await fetch(`${API_BASE_URL}/payments/paypal/capture-order`, {
              method: 'POST',
              headers: {
                'Content-Type': 'application/json',
                Authorization: `Bearer ${auth.token}`
              },
              body: JSON.stringify({ order_id: data.orderID })
            });
            const out = await res.json();
            if (!res.ok) {
              // Some funding sources can be pending; webhook will complete later.
              const status = String(out?.detail?.status || out?.status || '');
              if (status && status.toUpperCase() !== 'COMPLETED') {
                setErr(`Payment status: ${status}. Waiting for completion...`);
                setLastOrderId(data.orderID);
                pollOrderStatus(data.orderID);
                return;
              }
              throw new Error(out?.detail ? JSON.stringify(out.detail) : 'Payment capture failed');
            }
            setLicenseKey(out.license_key);
            setLastOrderId(data.orderID);
          } catch (e: any) {
            setErr(e?.message || 'Payment capture failed');
          } finally {
            setBusy(false);
          }
        }
      })
      .render('#paypal-buttons');
  }, [paypalReady, product?.slug, selectedPlanId, auth?.token]);

  const featuredVideo =
    media?.find((m) => m.type === 'video' && m.featured) || media?.find((m) => m.type === 'video') || null;

  // Default to video if available, but allow thumbnail clicks to switch to image view.
  useEffect(() => {
    if (!mediaViewLocked) {
      setMediaView(featuredVideo ? 'video' : 'image');
    }
  }, [featuredVideo, mediaViewLocked]);

  if (!product) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-black via-gray-900 to-black text-white pt-24 pb-12">
        <div className="max-w-5xl mx-auto px-4">
          <h1 className="text-3xl font-bold">Product not found</h1>
          <p className="text-gray-400 mt-2">Return to <Link to="/products" className="text-cyan-400">Products</Link>.</p>
        </div>
      </div>
    );
  }

  
  const displayName = serverMeta?.name?.trim() || product.name;
  const displayTagline = serverMeta?.tagline?.trim() || product.tagline;
  const metaDescRaw = (serverMeta?.description || '').trim();
  const displayDescription: string[] = metaDescRaw
    ? metaDescRaw.split('\n').map((s) => s.trim()).filter(Boolean)
    : product.description;



return (
    <div className="min-h-screen bg-gradient-to-br from-black via-gray-900 to-black text-white pt-24 pb-12">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="mb-8">
          <Link to="/products" className="text-gray-400 hover:text-white">← Back to Products</Link>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-10">
          {/* Left: gallery + details */}
          <div className="lg:col-span-2">
            <div className="rounded-2xl overflow-hidden border border-white/10 bg-white/5">
              {featuredVideo && mediaView === 'video' ? (
          <div className="relative w-full aspect-video rounded-2xl overflow-hidden border border-white/10 bg-black">
            <video className="w-full h-full object-contain bg-black" controls preload="metadata">
              <source src={featuredVideo.url} />
            </video>
            <div className="absolute top-3 left-3 px-2 py-1 rounded bg-cyan-500/20 border border-cyan-500/30 text-xs text-cyan-100">
              Featured video
            </div>
          </div>
        ) : galleryImages.length > 0 ? (
          <div className="relative w-full aspect-video rounded-2xl overflow-hidden border border-white/10 bg-black">
            <img
              src={galleryImages[Math.min(activeImage, galleryImages.length - 1)]}
              alt={`${displayName} screenshot ${activeImage + 1}`}
              className="w-full h-full object-contain bg-black"
              loading="eager"
              decoding="async"
              onError={(e) => {
                const el = e.currentTarget;
                el.style.display = 'none';
              }}
            />
            {featuredVideo ? (
              <button
                type="button"
                onClick={() => { setMediaView('video'); setMediaViewLocked(true); }}
                className="absolute bottom-3 left-3 px-3 py-1.5 rounded-lg bg-white/10 hover:bg-white/15 border border-white/15 text-xs text-gray-100"
              >
                View video
              </button>
            ) : null}
          </div>
        ) : (
          <div className="relative w-full aspect-video rounded-2xl overflow-hidden border border-white/10 bg-black grid place-items-center">
            <div className="text-center px-4">
              <p className="text-sm text-gray-300">No screenshots uploaded yet.</p>
              <p className="mt-1 text-xs text-gray-500">Upload product images on the server and they will appear here.</p>
            </div>
          </div>
        )}
            </div>

            {galleryImages.length > 0 ? (
              <div className="mt-4 flex gap-3 overflow-x-auto pb-2">
                {galleryImages.map((src, idx) => (
                  <button
                    key={`${product.slug}-img-${idx}`}
                    type="button"
                    onClick={() => { setActiveImage(idx); setMediaView('image'); setMediaViewLocked(true); }}
                    className={`flex-shrink-0 rounded-xl border ${idx === activeImage ? 'border-cyan-400/60' : 'border-white/10'} bg-white/5 hover:bg-white/10 transition p-1`}
                  >
                    <img
                      src={src}
                      alt={`thumb ${idx + 1}`}
                      className="h-20 w-32 object-cover rounded-lg"
                      onError={(e) => {
                        const btn = e.currentTarget.closest('button') as HTMLButtonElement | null;
                        if (btn) btn.style.display = 'none';
                      }}
                    />
                  </button>
                ))}
              </div>
            ) : null}

            <h1 className="mt-8 text-4xl font-bold bg-gradient-to-r from-cyan-400 via-blue-500 to-purple-600 bg-clip-text text-transparent">
              {displayName}
            </h1>
            <p className="mt-3 text-gray-200">{displayTagline}</p>

            <div className="mt-6 space-y-3">
              {displayDescription.map((d, idx) => (
                <p key={`${product.slug}-desc-${idx}`} className="text-gray-300">{d}</p>
              ))}
            </div>

            <div className="mt-8 rounded-2xl border border-white/10 bg-white/5 p-6">
              <h3 className="text-lg font-semibold text-white">Important note</h3>
              <p className="mt-2 text-gray-300">
                This product may not work in every environment yet. If you report an unsupported environment and we later add support for it,
                you will receive <span className="text-white font-semibold">+2 hours</span> of extra time — even if you used all of your original time.
              </p>
            </div>

            <div className="mt-8 grid grid-cols-1 sm:grid-cols-2 gap-6">
              {product.features.map((f) => (
                <div key={f.title} className="rounded-2xl border border-white/10 bg-white/5 p-6">
                  <h4 className="font-semibold text-white">{f.title}</h4>
                  <p className="mt-2 text-sm text-gray-400">{f.description}</p>
                </div>
              ))}
            </div>
          </div>

          {/* Right: purchase box */}
          <div className="lg:col-span-1">
            <div className="sticky top-28 rounded-2xl border border-white/10 bg-white/5 p-6">
              <h2 className="text-xl font-bold text-white">Purchase</h2>
              <p className="mt-1 text-sm text-gray-400">Select a duration and pay securely via PayPal.</p>

              {/* Launch Pricing Banner */}
              <div className="mt-4 rounded-lg bg-gradient-to-r from-emerald-500/10 to-cyan-500/10 border border-emerald-500/30 p-4">
                <div className="flex items-start gap-2">
                  <span className="text-lg">🎉</span>
                  <div>
                    <p className="text-sm font-semibold text-emerald-300">Launch Week Special!</p>
                    <p className="text-xs text-gray-300 mt-1">
                      Limited-time pricing for the first week. Regular prices resume after launch period.
                    </p>
                    <div className="mt-3 space-y-1 text-xs">
                      <div className="flex justify-between gap-3">
                        <span className="text-gray-400">1 Day:</span>
                        <span className="text-white">
                          $1.99 <span className="line-through text-gray-500 ml-1">$2.99</span>
                        </span>
                      </div>
                      <div className="flex justify-between gap-3">
                        <span className="text-gray-400">3 Days:</span>
                        <span className="text-white">
                          $4.99 <span className="line-through text-gray-500 ml-1">$6.99</span>
                        </span>
                      </div>
                      <div className="flex justify-between gap-3">
                        <span className="text-gray-400">1 Week:</span>
                        <span className="text-white">
                          $9.99 <span className="line-through text-gray-500 ml-1">$12.99</span>
                        </span>
                      </div>
                      <div className="flex justify-between gap-3">
                        <span className="text-gray-400">1 Month:</span>
                        <span className="text-white">
                          $19.99 <span className="line-through text-gray-500 ml-1">$24.99</span>
                        </span>
                      </div>
                      <div className="flex justify-between gap-3">
                        <span className="text-gray-400">Lifetime:</span>
                        <span className="text-white font-semibold">
                          $29.99 <span className="line-through text-gray-500 ml-1">$45.00</span>
                        </span>
                      </div>
                    </div>
                  </div>
                </div>
              </div>

              <div className="mt-5">
                <label className="block text-sm text-gray-300 mb-2">Duration</label>
                <select
                  value={selectedPlanId}
                  onChange={(e) => setSelectedPlanId(e.target.value)}
                  className="w-full rounded-lg bg-black/40 border border-white/10 px-3 py-2 text-white focus:outline-none focus:ring-2 focus:ring-cyan-400/40"
                >
                  {product.plans.map((p) => (
                    <option key={p.id} value={p.id}>{p.label}</option>
                  ))}
                </select>
                <p className="mt-2 text-xs text-gray-500">
                  Server-side pricing is enforced. If you haven\'t configured plan prices yet, checkout will fail with a clear error.
                </p>
                <div className="mt-3 flex items-center justify-between text-sm">
                  <span className="text-gray-400">Price</span>
                  <span className="text-gray-200">
                    {planPrices?.prices?.[selectedPlanId] != null
                      ? formatMoney(planPrices?.currency || 'USD', planPrices.prices[selectedPlanId])
                      : pricingBusy
                        ? 'Loading…'
                        : 'Shown at checkout'}
                  </span>
                </div>
              </div>

              <div className="mt-6">
                <h3 className="text-sm font-semibold text-white">Specs</h3>
                <div className="mt-3 space-y-2">
                  {product.specs.map((s) => (
                    <div key={s.label} className="flex justify-between gap-4 text-sm">
                      <span className="text-gray-400">{s.label}</span>
                      <span className="text-gray-200 text-right">{s.value}</span>
                    </div>
                  ))}
                </div>
              </div>

              <div className="mt-6">
                {!auth?.token ? (
                  <div className="rounded-lg border border-white/10 bg-black/40 p-4">
                    <p className="text-sm text-gray-300">You need to sign in before purchasing so we can attach the order to your account.</p>
                    <Link to="/login" className="inline-block mt-3 text-cyan-400 hover:text-cyan-300">Go to login</Link>
                  </div>
                ) : (
                  <>
                    <p className="mb-3 text-xs text-gray-400">
                      Please read our{' '}
                      <Link to="/tos" className="text-cyan-400 hover:text-cyan-300">
                        Terms of Service
                      </Link>{' '}
                      before purchasing.
                    </p>
                    <div id="paypal-buttons" />
                    {busy && <p className="mt-3 text-xs text-gray-400">Processing…</p>}
                    {checkingStatus && <p className="mt-3 text-xs text-gray-400">Checking payment status…</p>}
                    {lastOrderId && !licenseKey ? (
                      <button
                        type="button"
                        onClick={() => { void checkOrderStatus(lastOrderId); }}
                        className="mt-3 text-xs px-3 py-2 rounded-lg border border-white/10 bg-black/40 text-gray-200 hover:bg-white/10"
                      >
                        Check status
                      </button>
                    ) : null}
                  </>
                )}
              </div>

              {err && (
                <div className="mt-4 rounded-lg border border-red-500/30 bg-red-500/10 p-3">
                  <p className="text-xs text-red-200 break-words">{err}</p>
                </div>
              )}

              {licenseKey && (
                <div className="mt-4 rounded-lg border border-green-500/30 bg-green-500/10 p-4">
                  <p className="text-sm text-green-200 font-semibold">Payment complete. Your license key:</p>
                  <p className="mt-2 font-mono text-white break-all bg-black/40 border border-white/10 rounded-lg p-3">{licenseKey}</p>
                  <p className="mt-2 text-xs text-gray-300">Save it somewhere safe. Time starts at first use.</p>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
