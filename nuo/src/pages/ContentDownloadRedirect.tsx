import { useEffect } from 'react';
import { useParams } from 'react-router-dom';

import { API_BASE_URL } from '../lib/config';

/**
 * Some backend endpoints (like /content/download/:id) should be handled by the API server,
 * not the SPA router. When the app is hosted as a static site, unknown routes usually
 * fall back to index.html, which makes React Router show "No routes matched location".
 *
 * This route acts as a safety-net by redirecting the browser to the API download URL.
 */
export default function ContentDownloadRedirect() {
  const { id } = useParams();

  useEffect(() => {
    if (!id) return;
    const target = new URL(`/content/download/${id}`, API_BASE_URL).toString();
    window.location.replace(target);
  }, [id]);

  return (
    <div style={{ padding: 24 }}>
      Redirecting to download…
    </div>
  );
}
