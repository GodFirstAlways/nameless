import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { fetchPublicTextWithMemoryCache, refreshPublicTextMemory } from "../lib/publicContent";

export function Tos() {
  const [text, setText] = useState<string>("");
  const [error, setError] = useState<string>("");
  const [loading, setLoading] = useState<boolean>(true);

  const looksLikeHtml = /<\s*\/?\s*[a-z][^>]*>/i.test(text);

  useEffect(() => {
    let alive = true;

    (async () => {
      setLoading(true);
      setError("");

      try {
        const cached = await fetchPublicTextWithMemoryCache(
          "public:tos",
          "/public/tos",
          10 * 60 * 1000
        );
        if (!alive) return;
        setText(cached.text);
        setLoading(false);

        const fresh = await refreshPublicTextMemory(
          "public:tos",
          "/public/tos",
          10 * 60 * 1000
        );
        if (!alive || !fresh) return;
        setText(fresh);
      } catch (e: any) {
        if (!alive) return;
        setError(e?.message || "Failed to load Terms of Service");
        setLoading(false);
      }
    })();

    return () => {
      alive = false;
    };
  }, []);

  return (
    <div className="min-h-screen bg-gradient-to-br from-black via-gray-900 to-black text-white pt-24 pb-12">
      {/* Wider container on large screens to reduce “empty right space” */}
      <div className="mx-auto w-full max-w-5xl px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between mb-6">
          <h1 className="text-3xl font-bold">Terms of Service</h1>
          <Link to="/" className="text-cyan-400 hover:text-cyan-300 text-sm">
            Back to home
          </Link>
        </div>

        <div className="rounded-2xl border border-white/10 bg-white/5 p-6 sm:p-10">
          {loading ? (
            <p className="text-gray-300">Loading...</p>
          ) : error ? (
            <div className="text-gray-300">
              <p className="text-red-300 mb-2">{error}</p>
              <p className="text-sm text-gray-400">
                Your server should expose <span className="text-gray-200">GET /public/tos</span> returning HTML (or markdown-rendered HTML).
              </p>
            </div>
          ) : (
            looksLikeHtml ? (
              <article
                className="
                  prose prose-invert max-w-none
                  prose-headings:scroll-mt-24
                  prose-h1:text-4xl prose-h1:mb-2
                  prose-h2:text-2xl prose-h2:mt-10 prose-h2:mb-4
                  prose-h3:text-xl  prose-h3:mt-6  prose-h3:mb-3
                  prose-p:leading-7 prose-p:my-3
                  prose-hr:my-10
                  prose-ul:my-4 prose-ol:my-4
                  prose-li:my-1
                "
                dangerouslySetInnerHTML={{ __html: text }}
              />
            ) : (
              <pre className="whitespace-pre-wrap text-sm text-gray-200 leading-7">
                {text}
              </pre>
            )
          )}
        </div>

        <p className="text-gray-500 text-xs mt-6">
          This page is loaded from the server so you can update it without redeploying the site.
        </p>
      </div>
    </div>
  );
}
