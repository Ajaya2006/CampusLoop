import axios from 'axios';

export const API_BASE = import.meta.env.VITE_API_BASE_URL || '/api/v1';

const ACCESS_KEY = 'campusloop.access';
const REFRESH_KEY = 'campusloop.refresh';
export const USER_KEY = 'campusloop.user';

export const tokenStore = {
  get access() {
    return localStorage.getItem(ACCESS_KEY);
  },
  get refresh() {
    return localStorage.getItem(REFRESH_KEY);
  },
  set({ access_token, refresh_token }) {
    if (access_token) localStorage.setItem(ACCESS_KEY, access_token);
    if (refresh_token) localStorage.setItem(REFRESH_KEY, refresh_token);
  },
  clear() {
    localStorage.removeItem(ACCESS_KEY);
    localStorage.removeItem(REFRESH_KEY);
    localStorage.removeItem(USER_KEY);
  },
};

export const api = axios.create({
  baseURL: API_BASE,
  timeout: 20000,
  headers: { 'Content-Type': 'application/json' },
});

api.interceptors.request.use((config) => {
  const token = tokenStore.access;
  if (token) config.headers.Authorization = `Bearer ${token}`;
  return config;
});

let refreshing = null;

async function refreshTokens() {
  const refresh_token = tokenStore.refresh;
  if (!refresh_token) throw new Error('no refresh token');
  const { data } = await axios.post(`${API_BASE}/auth/refresh`, { refresh_token });
  tokenStore.set(data);
  if (data.user) localStorage.setItem(USER_KEY, JSON.stringify(data.user));
  return data.access_token;
}

api.interceptors.response.use(
  (response) => {
    // A static host answers unknown /api paths with index.html. Reject it so the
    // pages show their error state instead of receiving HTML as data.
    const type = String(response.headers?.['content-type'] || '');
    if (typeof response.data === 'string' && type.includes('text/html')) {
      const misconfigured = new Error(
        'The API is not reachable from this build. Point VITE_API_BASE_URL at the deployed API.',
      );
      misconfigured.isApiMisconfigured = true;
      return Promise.reject(misconfigured);
    }
    return response;
  },
  async (error) => {
    const original = error.config || {};
    const status = error.response?.status;
    const isAuthCall = /\/auth\/(login|register|refresh|forgot-password|reset-password)/.test(original.url || '');

    if (status === 401 && !original._retried && !isAuthCall && tokenStore.refresh) {
      original._retried = true;
      try {
        refreshing = refreshing || refreshTokens();
        const token = await refreshing;
        refreshing = null;
        original.headers = original.headers || {};
        original.headers.Authorization = `Bearer ${token}`;
        return api(original);
      } catch (refreshError) {
        refreshing = null;
        tokenStore.clear();
        window.dispatchEvent(new CustomEvent('campusloop:session-expired'));
      }
    }

    if (status === 401 && !isAuthCall) {
      tokenStore.clear();
      window.dispatchEvent(new CustomEvent('campusloop:session-expired'));
    }
    return Promise.reject(error);
  },
);

export function apiError(error, fallback = 'Something went wrong. Please try again.') {
  const data = error?.response?.data;
  const detail = typeof data?.detail === 'string' ? data.detail : null;
  const fields = {};
  if (Array.isArray(data?.errors)) {
    data.errors.forEach((item) => {
      if (item?.field) fields[item.field] = item.message;
    });
  }
  const isNetwork = !error?.response;
  const message = error?.isApiMisconfigured
    ? error.message
    : 'Cannot reach the server. Check your connection and try again.';
  return {
    message: isNetwork ? message : detail || fallback,
    fields,
    status: error?.response?.status,
    code: data?.code,
  };
}

export function websocketUrl(conversationId) {
  const explicit = import.meta.env.VITE_WS_BASE_URL;
  const base =
    explicit ||
    (API_BASE.startsWith('http')
      ? API_BASE.replace(/^http/, 'ws')
      : `${window.location.protocol === 'https:' ? 'wss' : 'ws'}://${window.location.host}/api/v1`);
  return `${base}/ws/chat/${conversationId}?token=${encodeURIComponent(tokenStore.access || '')}`;
}
