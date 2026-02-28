// Minimal PayPal JS SDK loader for Vite/React.
// Loads https://www.paypal.com/sdk/js?client-id=...&components=buttons
// Returns window.paypal once ready.
export type PayPalNamespace = any;

declare global {
  interface Window {
    paypal?: PayPalNamespace;
    __paypalSdkPromise?: Promise<PayPalNamespace>;
  }
}

function buildSdkUrl(opts: { clientId: string; currency: string }) {
  const u = new URL("https://www.paypal.com/sdk/js");
  u.searchParams.set("client-id", opts.clientId);
  u.searchParams.set("currency", opts.currency);
  // Be explicit so Buttons is always available.
  u.searchParams.set("components", "buttons");
  // Capture payments (one-time).
  u.searchParams.set("intent", "capture");
  return u.toString();
}

export function loadPayPalSdk(opts: { clientId: string; currency?: string }): Promise<PayPalNamespace> {
  const clientId = (opts.clientId || "").trim();
  if (!clientId || clientId.toLowerCase() === "undefined") {
    return Promise.reject(new Error("PayPal client-id missing. Set VITE_PAYPAL_CLIENT_ID."));
  }

  const currency = (opts.currency || "USD").trim() || "USD";

  // If already loaded, return immediately.
  if (window.paypal && typeof window.paypal.Buttons === "function") {
    return Promise.resolve(window.paypal);
  }

  // De-dup script loads across renders.
  if (window.__paypalSdkPromise) return window.__paypalSdkPromise;

  window.__paypalSdkPromise = new Promise((resolve, reject) => {
    const existing = document.querySelector<HTMLScriptElement>('script[data-paypal-sdk="true"]');
    if (existing) {
      existing.addEventListener("load", () => resolve(window.paypal));
      existing.addEventListener("error", () => reject(new Error("Failed to load PayPal SDK")));
      return;
    }

    const script = document.createElement("script");
    script.src = buildSdkUrl({ clientId, currency });
    script.async = true;
    script.defer = true;
    script.dataset.paypalSdk = "true";
    script.setAttribute("data-sdk-integration-source", "nocahance-web");

    script.onload = () => {
      if (!window.paypal || typeof window.paypal.Buttons !== "function") {
        reject(new Error("PayPal SDK loaded but Buttons is unavailable (check components=buttons)."));
        return;
      }
      resolve(window.paypal);
    };
    script.onerror = () => reject(new Error("Failed to load PayPal SDK (network/client-id)."));

    document.head.appendChild(script);
  });

  return window.__paypalSdkPromise;
}
