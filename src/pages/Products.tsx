import { Check, Clock, Shield, Zap } from 'lucide-react';
import { useEffect } from 'react';
import { Link } from 'react-router-dom';
import { fetchPlanPricesWithCache, fetchProductImagesWithCache, fetchProductMediaWithCache, fetchProductMetaWithCache } from '../lib/publicContent';

type SimpleProduct = {
  slug?: string;
  appCode?: string;
  name: string;
  tagline: string;
  description: string;
  status: 'available' | 'coming_soon';
  actionText: string;
  features: { title: string; description: string }[];
};

const PRODUCTS: SimpleProduct[] = [
  {
    slug: 'nochance-external',
    appCode: 'nochancext',
    name: 'NoChance',
    tagline: 'Roblox External',
    description: 'Advanced humanization for spectator-safe gameplay. Usage-based time system - your license only counts when the software is running.',
    status: 'available',
    actionText: 'View Pricing',
    features: [
      { title: 'Advanced Humanization', description: 'Realistic aim with reaction delays and momentum. Looks natural to spectators, not robotic.' },
      { title: 'Usage-Based Time', description: 'Time only counts when running. Close the software and your remaining time pauses automatically.' },
      { title: 'Feature-Rich ESP', description: 'Boxes, skeletons, health bars, distance indicators, and more with full customization options.' }
    ]
  },
  {
    slug: 'funfun-external',
    appCode: 'funfun',
    name: 'FunFun External',
    tagline: 'Modular Executor (In Development)',
    description: 'External executor with pre-built functions for auto-farm, teleports, and more. Build custom UIs without scripting. Release depends on NoChance success.',
    status: 'coming_soon',
    actionText: 'Coming Soon',
    features: [
      { title: 'Pre-Built Functions', description: 'Auto-clicker, auto-farm, teleports, anti-AFK, and more without writing Lua scripts.' },
      { title: 'Custom UI Builder', description: 'Create mini-UIs and key systems using templates. No coding knowledge required.' },
      { title: 'Memory-Based', description: 'External design means no internal script injection. Direct memory reading for safety.' }
    ]
  },
  {
    slug: 'rebellion',
    appCode: 'rebellion',
    name: 'Rebellion',
    tagline: 'HWID Spoofer',
    description: 'Hardware ID spoofing for Fortnite and other games with kernel-level anti-cheat. Bypass HWID bans with motherboard-level spoofing.',
    status: 'coming_soon',
    actionText: 'Coming Soon',
    features: [
      { title: 'Motherboard Spoofing', description: 'Changes hardware identifiers at the motherboard level to bypass HWID bans.' },
      { title: 'Multi-Game Support', description: 'Works with Fortnite and other games using kernel anti-cheat systems (EAC, BattlEye, etc.).' },
      { title: 'Safe & Reliable', description: 'Temporary kernel driver ensures clean spoofing without permanent system changes.' }
    ]
  },
  {
    slug: 'yolt',
    appCode: 'yolt',
    name: 'YOLT',
    tagline: 'AI-Powered Aimbot',
    description: 'You Only Look Twice. Universal AI-based aimbot with GPU, CPU, and hybrid processing modes. Works across multiple games.',
    status: 'coming_soon',
    actionText: 'Coming Soon',
    features: [
      { title: 'AI Detection', description: 'Neural network-based target detection. Looks twice for accuracy - more reliable than YOLO-based systems.' },
      { title: 'Flexible Processing', description: 'Choose GPU-only (fastest), CPU-only (compatibility), or hybrid mode based on your hardware.' },
      { title: 'Advanced Humanization', description: 'Built-in humanization system (same tech as NoChance) for natural, spectator-safe aiming.' }
    ]
  }
];

export function Products() {
  const visibleProducts = PRODUCTS.filter((p) => p.status === 'available' || p.status === 'coming_soon');

  // Warm the public store cache + image cache
  useEffect(() => {
    const available = PRODUCTS.filter((p) => p.status === 'available' && p.slug && p.appCode) as Required<Pick<SimpleProduct, 'slug' | 'appCode'>>[];
    if (!available.length) return;

    const schedule = (fn: () => void) => {
      const w = window as any;
      if (typeof w.requestIdleCallback === 'function') {
        w.requestIdleCallback(fn, { timeout: 2000 });
      } else {
        setTimeout(fn, 250);
      }
    };

    const preloadImages = (urls: string[]) => {
      urls.slice(0, 12).forEach((url) => {
        const img = new Image();
        img.decoding = 'async';
        img.src = url;
      });
    };

    schedule(() => {
      void (async () => {
        for (const p of available) {
          try {
            const [meta, imgs, media] = await Promise.all([
              fetchProductMetaWithCache(p.appCode ?? p.slug),
              fetchProductImagesWithCache(p.appCode ?? p.slug),
              fetchProductMediaWithCache(p.appCode ?? p.slug)
            ]);

            await fetchPlanPricesWithCache(p.appCode);

            const urls = (imgs && imgs.length ? imgs : []) as string[];
            preloadImages(urls);

            const video = (media || []).find((m: any) => m?.type === 'video' && (m?.featured || true));
            if (video?.url) {
              fetch(video.url, { method: 'HEAD' }).catch(() => undefined);
            }

            void meta;
          } catch {
            // ignore warm-cache failures
          }
        }
      })();
    });
  }, []);

  return (
    <div className="min-h-screen bg-gradient-to-br from-black via-gray-900 to-black text-white pt-24 pb-12">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        {/* Header */}
        <div className="text-center mb-16">
          <h1 className="text-5xl font-bold mb-4 bg-gradient-to-r from-cyan-400 via-blue-500 to-purple-600 bg-clip-text text-transparent">
            Our Products
          </h1>
          <p className="text-xl text-gray-400 max-w-2xl mx-auto">
            Premium tools for gamers. Roblox externals, AI-powered aimbots, HWID spoofers, and more. 
            Currently available: NoChance. More products coming soon.
          </p>
        </div>

        {/* Products Grid */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 mb-12">
          {visibleProducts.map((product) => (
            <div
              key={product.slug ?? product.name}
              className="group rounded-2xl overflow-hidden border border-white/10 backdrop-blur-xl bg-gradient-to-br from-white/5 to-white/[0.02] hover:from-white/10 hover:to-white/[0.05] transition-all duration-300"
            >
              {/* Header */}
              <div className="p-8 pb-6">
                <div className="flex items-start justify-between mb-4">
                  <div className="flex-1">
                    <div className="flex items-center gap-3 mb-2">
                      <h2 className="text-2xl font-bold bg-gradient-to-r from-cyan-400 to-blue-500 bg-clip-text text-transparent">
                        {product.name}
                      </h2>
                      <span className={`text-xs px-2.5 py-1 rounded-lg font-semibold uppercase tracking-wider ${
                        product.status === 'available' 
                          ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/30' 
                          : 'bg-amber-500/20 text-amber-300 border border-amber-500/30'
                      }`}>
                        {product.status === 'available' ? 'Available' : 'Coming Soon'}
                      </span>
                    </div>
                    <p className="text-sm text-gray-400 uppercase tracking-wider mb-3">{product.tagline}</p>
                  </div>
                </div>
                
                <p className="text-gray-300 leading-relaxed">{product.description}</p>
              </div>

              {/* Features */}
              <div className="px-8 pb-6 space-y-4">
                {product.features.map((f) => (
                  <div key={f.title} className="flex gap-3">
                    <div className="flex-shrink-0 mt-0.5">
                      <div className="w-5 h-5 rounded-full bg-cyan-500/20 flex items-center justify-center">
                        <Check className="w-3 h-3 text-cyan-400" />
                      </div>
                    </div>
                    <div>
                      <h4 className="font-semibold text-white mb-1">{f.title}</h4>
                      <p className="text-sm text-gray-400 leading-relaxed">{f.description}</p>
                    </div>
                  </div>
                ))}
              </div>

              {/* CTA */}
              <div className="px-8 pb-8">
                {product.status === 'available' && product.slug ? (
                  <Link
                    to={`/products/${product.slug}`}
                    className="block w-full text-center px-6 py-3.5 rounded-xl bg-gradient-to-r from-cyan-500 to-blue-600 hover:from-cyan-400 hover:to-blue-500 transition-all font-semibold shadow-lg shadow-cyan-500/25 hover:shadow-cyan-500/40"
                  >
                    {product.actionText}
                  </Link>
                ) : (
                  <button
                    type="button"
                    disabled
                    className="w-full px-6 py-3.5 rounded-xl bg-white/5 border border-white/10 text-gray-400 cursor-not-allowed"
                  >
                    {product.actionText}
                  </button>
                )}
              </div>
            </div>
          ))}
        </div>

        {/* Info Cards */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <div className="p-6 rounded-xl border border-white/10 bg-white/5 backdrop-blur-xl">
            <div className="w-12 h-12 rounded-xl bg-cyan-500/20 flex items-center justify-center mb-4">
              <Clock className="w-6 h-6 text-cyan-400" />
            </div>
            <h3 className="font-semibold text-white mb-2">Usage-Based Time</h3>
            <p className="text-sm text-gray-400">
              All our products use a unique time system. Your license time only counts when the software is actively running.
            </p>
          </div>

          <div className="p-6 rounded-xl border border-white/10 bg-white/5 backdrop-blur-xl">
            <div className="w-12 h-12 rounded-xl bg-blue-500/20 flex items-center justify-center mb-4">
              <Shield className="w-6 h-6 text-blue-400" />
            </div>
            <h3 className="font-semibold text-white mb-2">Anti-Detection Focus</h3>
            <p className="text-sm text-gray-400">
              Built with safety in mind. Advanced humanization and anti-detection systems to minimize risk.
            </p>
          </div>

          <div className="p-6 rounded-xl border border-white/10 bg-white/5 backdrop-blur-xl">
            <div className="w-12 h-12 rounded-xl bg-purple-500/20 flex items-center justify-center mb-4">
              <Zap className="w-6 h-6 text-purple-400" />
            </div>
            <h3 className="font-semibold text-white mb-2">Active Support</h3>
            <p className="text-sm text-gray-400">
              Responsive support on Discord. Bug reports earn 2 hours extra time. Game incompatibility reports earn 50 minutes.
            </p>
          </div>
        </div>

        {/* Bottom CTA */}
        <div className="mt-12 text-center">
          <p className="text-gray-400 mb-4">Questions about our products?</p>
          <div className="flex items-center justify-center gap-4">
            <Link
              to="/faq"
              className="px-6 py-2.5 rounded-lg bg-white/10 border border-white/10 text-white hover:bg-white/15 transition-all"
            >
              Read FAQ
            </Link>
            <a
              href="https://discord.gg/jx8W5rfkWm"
              target="_blank"
              rel="noopener noreferrer"
              className="px-6 py-2.5 rounded-lg bg-gradient-to-r from-cyan-500 to-blue-600 hover:from-cyan-600 hover:to-blue-700 text-white font-semibold transition-all"
            >
              Join Discord
            </a>
          </div>
        </div>
      </div>
    </div>
  );
}
