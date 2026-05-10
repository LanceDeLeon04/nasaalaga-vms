import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import './styles/index.css'
import App from './App.tsx'


// Global fetch interceptor – inject JWT token automatically
const _origFetch = window.fetch.bind(window);
window.fetch = function(input: RequestInfo | URL, init?: RequestInit): Promise<Response> {
  const token = sessionStorage.getItem('nasaalaga_token');
  if (token && typeof input === 'string' && input.startsWith('/api')) {
    init = init || {};
    init.headers = {
      ...(init.headers || {}),
      'Authorization': `Bearer ${token}`,
    };
  }
  return _origFetch(input, init);
};

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <App />
  </StrictMode>,
)
