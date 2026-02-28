import { ArrowRight } from 'lucide-react';
import { useEffect } from 'react';
import { fetchPlanPricesWithCache, fetchProductImagesWithCache, fetchProductMediaWithCache } from '../lib/publicContent';

export function Home() {

  // Warm store content + images in the background so the products page/detail loads instantly.
  useEffect(() => {
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
        try {
          const appCode = 'nochancext';
          const [imgs, media] = await Promise.all([
            fetchProductImagesWithCache(appCode, 12 * 60 * 60 * 1000),
            fetchProductMediaWithCache(appCode, 12 * 60 * 60 * 1000)
          ]);
          await fetchPlanPricesWithCache(appCode, 60 * 60 * 1000);
          preloadImages((imgs || []) as string[]);
        } catch {
          // ignore warm-cache failures
        }
      })();
    });
  }, []);
  return (
    <div className="min-h-screen bg-gradient-to-br from-black via-gray-900 to-black text-white">
      <section className="relative min-h-screen flex items-center justify-center overflow-hidden pt-20">
        <div className="absolute inset-0 overflow-hidden">
          <div className="absolute top-1/4 left-1/4 w-96 h-96 bg-cyan-500/10 rounded-full mix-blend-multiply filter blur-3xl opacity-20 animate-blob"></div>
          <div className="absolute top-1/3 right-1/4 w-96 h-96 bg-blue-500/10 rounded-full mix-blend-multiply filter blur-3xl opacity-20 animate-blob animation-delay-2000"></div>
          <div className="absolute bottom-1/4 left-1/2 w-96 h-96 bg-purple-500/10 rounded-full mix-blend-multiply filter blur-3xl opacity-20 animate-blob animation-delay-4000"></div>
        </div>

        <div className="relative z-10 max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
          <div className="mb-8">
            <span className="inline-block px-4 py-2 rounded-full bg-cyan-500/10 border border-cyan-500/30 text-cyan-400 text-sm font-semibold">
              Welcome to the Void
            </span>
          </div>

          <h1 className="text-6xl sm:text-7xl lg:text-8xl font-bold mb-6 leading-tight">
            <span className="bg-gradient-to-r from-cyan-400 via-blue-500 to-purple-600 bg-clip-text text-transparent">
              In the space between
            </span>
            <br />
            <span className="text-white">zeros and ones</span>
          </h1>

          <p className="text-xl sm:text-2xl text-gray-400 mb-8 max-w-3xl mx-auto leading-relaxed">
            Where shadows dance with light, and whispers carry weight. We exist in
            the margin of error, the pause between keystrokes, the silence that
            speaks loudest.
          </p>

          <div className="flex flex-col sm:flex-row gap-4 justify-center mb-12">
            <a
              href="/products"
              className="inline-flex items-center justify-center px-8 py-4 rounded-lg bg-gradient-to-r from-cyan-500 to-blue-600 hover:from-cyan-600 hover:to-blue-700 text-white font-semibold transition-all transform hover:scale-105"
            >
              Explore Products
              <ArrowRight className="ml-2" size={20} />
            </a>
            <a
              href="/contact"
              className="inline-flex items-center justify-center px-8 py-4 rounded-lg bg-white/10 hover:bg-white/20 border border-white/20 text-white font-semibold transition-all"
            >
              Get in Touch
            </a>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-8 pt-12 border-t border-white/10">
            <div className="space-y-2">
              <div className="text-3xl font-bold text-cyan-400">Secure</div>
              <p className="text-gray-400">Token-based auth and sensible defaults</p>
            </div>
            <div className="space-y-2">
              <div className="text-3xl font-bold text-cyan-400">Private</div>
              <p className="text-gray-400">Designed with privacy in mind</p>
            </div>
            <div className="space-y-2">
              <div className="text-3xl font-bold text-cyan-400">Instant</div>
              <p className="text-gray-400">One-click activation</p>
            </div>
          </div>
        </div>
      </section>

      <section className="relative py-20 px-4 sm:px-6 lg:px-8 bg-white/5 border-t border-white/10">
        <div className="max-w-7xl mx-auto">
          <h2 className="text-4xl font-bold mb-12 text-center">
            <span className="bg-gradient-to-r from-cyan-400 to-blue-500 bg-clip-text text-transparent">
              Why Choose Us
            </span>
          </h2>

          <div className="grid md:grid-cols-2 gap-8">
            <div className="p-8 rounded-xl border border-white/10 bg-white/5 hover:bg-white/10 transition-all">
              <div className="text-3xl mb-4">∅</div>
              <h3 className="text-xl font-semibold mb-3">Lightweight</h3>
              <p className="text-gray-400">
                Fast load times and a clean user experience across the site and dashboard.
              </p>
            </div>

            <div className="p-8 rounded-xl border border-white/10 bg-white/5 hover:bg-white/10 transition-all">
              <div className="text-3xl mb-4">◊</div>
              <h3 className="text-xl font-semibold mb-3">Always Updated</h3>
              <p className="text-gray-400">
                Continuous improvements, bug fixes, and compatibility updates.
              </p>
            </div>

            <div className="p-8 rounded-xl border border-white/10 bg-white/5 hover:bg-white/10 transition-all">
              <div className="text-3xl mb-4">△</div>
              <h3 className="text-xl font-semibold mb-3">Expert Support</h3>
              <p className="text-gray-400">
                Dedicated support with clear guidance and quick turnaround on issues.
              </p>
            </div>

            <div className="p-8 rounded-xl border border-white/10 bg-white/5 hover:bg-white/10 transition-all">
              <div className="text-3xl mb-4">◎</div>
              <h3 className="text-xl font-semibold mb-3">Flexible Licensing</h3>
              <p className="text-gray-400">
                Pay only for what you need. Daily, weekly, monthly, or lifetime
                access.
              </p>
            </div>
          </div>
        </div>
      </section>

      <footer className="border-t border-white/10 bg-black/50 py-8">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 text-center text-gray-400">
          <p>&copy; 2025 NoChance. All rights reserved.</p>
        </div>
      </footer>
    </div>
  );
}
