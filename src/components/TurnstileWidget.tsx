import { useEffect, useRef } from 'react';

declare global {
  interface Window {
    turnstile?: {
      render: (container: HTMLElement | string, params: Record<string, any>) => string;
      reset: (widgetId: string) => void;
      remove: (widgetId: string) => void;
      getResponse: (widgetId: string) => string;
    };
  }
}

const TURNSTILE_SCRIPT_ID = 'cf-turnstile-script';

function ensureTurnstileScript(): Promise<void> {
  const existing = document.getElementById(TURNSTILE_SCRIPT_ID) as HTMLScriptElement | null;
  if (existing) {
    // If it's already loaded, resolve immediately; otherwise wait for onload.
    if ((window as any).turnstile) return Promise.resolve();
    return new Promise((resolve, reject) => {
      existing.addEventListener('load', () => resolve());
      existing.addEventListener('error', () => reject(new Error('Failed to load Turnstile script')));
    });
  }

  return new Promise((resolve, reject) => {
    const s = document.createElement('script');
    s.id = TURNSTILE_SCRIPT_ID;
    s.src = 'https://challenges.cloudflare.com/turnstile/v0/api.js?render=explicit';
    s.defer = true;
    s.onload = () => resolve();
    s.onerror = () => reject(new Error('Failed to load Turnstile script'));
    document.head.appendChild(s);
  });
}

export type TurnstileWidgetProps = {
  /** Called with a token when solved, or null when expired/error/reset */
  onToken: (token: string | null) => void;
  /** Receives the widget id so the parent can reset/remove if needed */
  onWidgetId?: (widgetId: string | null) => void;
  className?: string;
  action?: string;
  theme?: 'auto' | 'light' | 'dark';
  size?: 'normal' | 'compact';
};

export function TurnstileWidget({
  onToken,
  onWidgetId,
  className,
  action,
  theme = 'auto',
  size = 'normal'
}: TurnstileWidgetProps) {
  const containerRef = useRef<HTMLDivElement | null>(null);
  const widgetIdRef = useRef<string | null>(null);

  useEffect(() => {
    const siteKey = (import.meta.env.VITE_TURNSTILE_SITE_KEY as string | undefined) || '';
    if (!siteKey) {
      onToken(null);
      onWidgetId?.(null);
      return;
    }

    let cancelled = false;

    (async () => {
      await ensureTurnstileScript();
      if (cancelled) return;
      if (!containerRef.current) return;
      if (!window.turnstile) throw new Error('Turnstile API not available');

      // Clean any previous widget before rendering again (SPA safety).
      if (widgetIdRef.current) {
        try {
          window.turnstile.remove(widgetIdRef.current);
        } catch {
          // ignore
        }
        widgetIdRef.current = null;
      }

      const id = window.turnstile.render(containerRef.current, {
        sitekey: siteKey,
        action,
        theme,
        size,
        callback: (token: string) => onToken(token),
        'expired-callback': () => onToken(null),
        'error-callback': () => onToken(null)
      });

      widgetIdRef.current = id;
      onWidgetId?.(id);
    })().catch(() => {
      onToken(null);
      onWidgetId?.(null);
    });

    return () => {
      cancelled = true;
      const id = widgetIdRef.current;
      if (id && window.turnstile) {
        try {
          window.turnstile.remove(id);
        } catch {
          // ignore
        }
      }
      widgetIdRef.current = null;
      onWidgetId?.(null);
    };
    // action/theme/size re-render the widget when changed
  }, [action, theme, size, onToken, onWidgetId]);

  return <div ref={containerRef} className={className} />;
}
