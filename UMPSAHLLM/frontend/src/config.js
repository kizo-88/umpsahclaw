// Central API base for the UMPSAHLLM Node backend.
// Override per-environment with VITE_API_BASE (e.g. https://api.umpsahllm.com for production).
import { auth } from './firebase';

export const API_BASE = import.meta.env.VITE_API_BASE || 'http://localhost:3002';

// Fetch wrapper that attaches the Firebase ID token (when signed in) so the backend's
// protected routes work once server-side auth (FIREBASE_PROJECT_ID) is enabled.
// Accepts an absolute URL or a path like '/api/...'.
export async function apiFetch(pathOrUrl, options = {}) {
  const url = pathOrUrl.startsWith('http') ? pathOrUrl : `${API_BASE}${pathOrUrl}`;
  const headers = { ...(options.headers || {}) };
  try {
    const token = await auth.currentUser?.getIdToken();
    if (token) headers['Authorization'] = `Bearer ${token}`;
  } catch (e) {
    /* not signed in / token unavailable — request proceeds unauthenticated */
  }
  return fetch(url, { ...options, headers });
}
