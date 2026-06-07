import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import './styles/index.css'
import App from './App.tsx'

// ── Startup: evict any oversized JWT left over from before the avatar-in-token bug was fixed.
// A normal lean token is ~300–500 bytes. Anything over 6 KB means the old avatar-bloated
// token is still sitting in sessionStorage — it will cause HTTP 431 on every request.
// Clearing it forces a re-login which issues the new, lean token.
(function sanitizeStoredToken() {
  try {
    const token = sessionStorage.getItem('nasaalaga_token');
    if (token && token.length > 6144) {
      console.warn('[NASaAlaga] Oversized token detected — clearing session to force re-login.');
      sessionStorage.removeItem('nasaalaga_token');
      sessionStorage.removeItem('nasaalaga_user');
    }
  } catch {}
})();

// Global fetch interceptor – inject JWT token automatically
const _origFetch = window.fetch.bind(window);
window.fetch = function(input: RequestInfo | URL, init?: RequestInit): Promise<Response> {
  const token = sessionStorage.getItem('nasaalaga_token');
  // Safety: never send a token that would cause HTTP 431 (header too large)
  const safeToken = token && token.length <= 6144 ? token : null;
  if (safeToken && typeof input === 'string' && input.startsWith('/api')) {
    init = init || {};
    init.headers = {
      ...(init.headers || {}),
      'Authorization': `Bearer ${safeToken}`,
    };
  }
  return _origFetch(input, init);
};

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <App />
  </StrictMode>,
)
