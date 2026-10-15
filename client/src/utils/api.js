/**
 * KONYA BİLGİSAYAR - API İstemcisi
 */

const BASE_URL = '/api';

export function getToken() {
  return localStorage.getItem('pctakip_token');
}

export function setAuth(token, user, settings) {
  if (token) localStorage.setItem('pctakip_token', token);
  if (user) localStorage.setItem('pctakip_user', JSON.stringify(user));
  if (settings) localStorage.setItem('pctakip_settings', JSON.stringify(settings));
}

export function clearAuth() {
  localStorage.removeItem('pctakip_token');
  localStorage.removeItem('pctakip_user');
  localStorage.removeItem('pctakip_settings');
}

export function getStoredUser() {
  const u = localStorage.getItem('pctakip_user');
  try {
    return u ? JSON.parse(u) : null;
  } catch (e) {
    return null;
  }
}

export function getStoredSettings() {
  const s = localStorage.getItem('pctakip_settings');
  try {
    return s ? JSON.parse(s) : null;
  } catch (e) {
    return null;
  }
}

async function request(endpoint, options = {}) {
  const token = getToken();
  const headers = {
    'Content-Type': 'application/json',
    ...(token ? { 'Authorization': `Bearer ${token}` } : {}),
    ...options.headers
  };

  // If body is FormData (for photo upload), remove Content-Type so browser sets boundary
  if (options.body instanceof FormData) {
    delete headers['Content-Type'];
  }

  const response = await fetch(`${BASE_URL}${endpoint}`, {
    ...options,
    headers
  });

  if (response.status === 401) {
    clearAuth();
    window.dispatchEvent(new Event('auth:unauthorized'));
    throw new Error('Oturum süresi doldu. Lütfen tekrar giriş yapın.');
  }

  const data = await response.json().catch(() => ({}));

  if (!response.ok) {
    throw new Error(data.message || `Sunucu hatası: ${response.status}`);
  }

  return data;
}

export const api = {
  get: (url) => request(url, { method: 'GET' }),
  post: (url, body) => request(url, {
    method: 'POST',
    body: body instanceof FormData ? body : JSON.stringify(body)
  }),
  put: (url, body) => request(url, {
    method: 'PUT',
    body: JSON.stringify(body)
  }),
  delete: (url, body) => request(url, {
    method: 'DELETE',
    body: body ? JSON.stringify(body) : undefined
  })
};
