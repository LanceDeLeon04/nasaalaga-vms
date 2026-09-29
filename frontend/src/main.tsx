import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import './styles/index.css'
import App from './App.tsx'
import { initOffline } from './offline'

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

// Offline mode: replaces the old global fetch interceptor. It still attaches the JWT to /api calls, and adds
// cached reads, an offline write queue with auto-upload, and offline-session helpers (see src/offline/).
initOffline();

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <App />
  </StrictMode>,
)
