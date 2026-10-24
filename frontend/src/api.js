// In development the Vite dev server proxies /api to the backend (see vite.config.js),
// so there are no CORS problems. Set VITE_API_URL only if the API lives somewhere else.
const API = (import.meta.env.VITE_API_URL || '/api').replace(/\/$/, '');

function safeGet(key) { try { return localStorage.getItem(key); } catch { return null; } }
function safeSet(key, value) { try { localStorage.setItem(key, value); } catch { /* storage unavailable */ } }
function safeRemove(key) { try { localStorage.removeItem(key); } catch { /* storage unavailable */ } }

export function getToken() { return safeGet('medical_token'); }
export function getStoredUser() { try { return JSON.parse(safeGet('medical_user')); } catch { return null; } }
export function setSession(token, user) { safeSet('medical_token', token); safeSet('medical_user', JSON.stringify(user)); }
export function clearSession() { safeRemove('medical_token'); safeRemove('medical_user'); }

let unauthorizedHandler = null;
export function onUnauthorized(fn) { unauthorizedHandler = fn; }

async function rawRequest(path, options = {}) {
  const token = getToken();
  const isForm = options.body instanceof FormData;
  const headers = { ...(isForm || !options.body ? {} : { 'Content-Type': 'application/json' }), ...(token ? { Authorization: `Bearer ${token}` } : {}), ...options.headers };
  let response;
  try {
    response = await fetch(`${API}${path}`, { ...options, headers });
  } catch {
    throw new Error('Cannot reach the backend server. Make sure it is running (cd backend → npm run dev) and check the backend terminal for errors.');
  }
  if (response.status === 401 && token && !path.startsWith('/auth/login') && !path.startsWith('/auth/register')) {
    clearSession();
    if (unauthorizedHandler) unauthorizedHandler();
  }
  return response;
}

export async function request(path, options = {}) {
  const response = await rawRequest(path, options);
  const data = await response.json().catch(() => null);
  if (!response.ok) {
    if (data && data.message) throw new Error(data.message);
    if (response.status === 502 || response.status === 504 || (response.status === 500 && !data)) throw new Error('Backend server is not running or not reachable. Start it with: cd backend → npm run dev');
    throw new Error(`Request failed (${response.status}).`);
  }
  return data ?? {};
}

// Fetch a protected file (needs the auth header) and open it in a new tab.
export async function openFile(path) {
  const win = window.open('', '_blank');
  const response = await rawRequest(path);
  if (!response.ok) {
    if (win) win.close();
    const data = await response.json().catch(() => null);
    throw new Error((data && data.message) || 'Could not open the file.');
  }
  const url = URL.createObjectURL(await response.blob());
  if (win) win.location.href = url; else window.location.href = url;
  setTimeout(() => URL.revokeObjectURL(url), 60000);
}
