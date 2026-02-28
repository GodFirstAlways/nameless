// cache.js - simple in-memory GET cache for legacy dashboards.
// Clears automatically on full page refresh.
// Usage: window.__apiCacheGet(key, loaderFn) -> Promise<data>
(function () {
  if (window.__apiCacheGet) return;

  const cache = new Map();

  function getAuthToken() {
    return localStorage.getItem('authToken') || sessionStorage.getItem('authToken') || '';
  }

  function makeKey(url) {
    return getAuthToken() + '|' + url;
  }

  window.__apiCacheGet = function (url, loaderFn) {
    const key = makeKey(url);
    if (cache.has(key)) return cache.get(key);
    const p = Promise.resolve().then(loaderFn);
    cache.set(key, p);
    return p;
  };

  window.__apiCacheClear = function () {
    cache.clear();
  };
})();
