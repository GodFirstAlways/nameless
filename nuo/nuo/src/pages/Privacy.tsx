import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { fetchPublicTextWithMemoryCache, refreshPublicTextMemory } from '../lib/publicContent';

export function Privacy() {
  const [text, setText] = useState<string>('');
  const [error, setError] = useState<string>('');
  const [loading, setLoading] = useState<boolean>(true);

  useEffect(() => {
    let alive = true;

    (async () => {
      setLoading(true);
      setError('');

      // 12h cache; refresh in background
      try {
        const cached = await fetchPublicTextWithMemoryCache('public:privacy', '/public/privacy', 10 * 60 * 1000);
        if (!alive) return;
        setText(cached.text);
        setLoading(false);

        const fresh = await refreshPublicTextMemory('public:privacy', '/public/privacy', 10 * 60 * 1000);
        if (!alive || !fresh) return;
        setText(fresh);
      } catch (e: any) {
        if (!alive) return;
        setError(e?.message || 'Failed to load Privacy Policy');
        setLoading(false);
      }
    })();

    return () => {
      alive = false;
    };
  }, []);

  return (
    <div className="min-h-screen bg-gradient-to-br from-black via-gray-900 to-black text-white pt-24 pb-12">
      <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between mb-6">
          <h1 className="text-3xl font-bold">Privacy Policy</h1>
          <Link to="/" className="text-cyan-400 hover:text-cyan-300 text-sm">
            Back to home
          </Link>
        </div>

        <div className="rounded-xl border border-white/10 bg-white/5 p-6">
          {loading ? (
            <p className="text-gray-300">Loading...</p>
          ) : error ? (
            <div className="text-gray-300">
              <p className="text-red-300 mb-2">{error}</p>
              <p className="text-sm text-gray-400">
                Your server should expose <span className="text-gray-200">GET /public/privacy</span> returning plain text.
              </p>
            </div>
          ) : (
            <pre className="whitespace-pre-wrap text-sm text-gray-200 leading-6">{text}</pre>
          )}
        </div>

        <p className="text-gray-500 text-xs mt-6">
          This page is loaded from the server so you can update it without redeploying the site.
        </p>
      </div>
    </div>
  );
}
