import axios from 'axios';

/**
 * Resolves the backend API base URL with sanitization and live local override support.
 */
export function resolveApiBaseUrl(): string {
  // 1. Check for user-configured override in localStorage (helpful for instant configuration on Render)
  if (typeof window !== 'undefined') {
    const saved = localStorage.getItem('trustlayer_api_base_url');
    if (saved && saved.trim()) {
      return sanitizeUrl(saved.trim());
    }
  }

  // 2. Read Vite environment variable
  const envUrl = (import.meta.env.VITE_API_BASE_URL || '').trim();
  if (envUrl) {
    return sanitizeUrl(envUrl);
  }

  // 3. Default to relative prefix for unified deployment or proxy
  return '/api/v1';
}

function sanitizeUrl(url: string): string {
  let cleaned = url.trim().replace(/\/+$/, '');
  if ((cleaned.startsWith('http://') || cleaned.startsWith('https://')) && !cleaned.includes('/api')) {
    cleaned = `${cleaned}/api/v1`;
  }
  return cleaned;
}

export const api = axios.create({
  baseURL: resolveApiBaseUrl(),
  withCredentials: true,
  headers: {
    'Content-Type': 'application/json',
  },
});

export const updateApiBaseUrl = (newUrl: string): string => {
  const sanitized = sanitizeUrl(newUrl);
  api.defaults.baseURL = sanitized;
  if (typeof window !== 'undefined') {
    localStorage.setItem('trustlayer_api_base_url', sanitized);
  }
  return sanitized;
};

export const resetApiBaseUrl = (): string => {
  if (typeof window !== 'undefined') {
    localStorage.removeItem('trustlayer_api_base_url');
  }
  const defaultUrl = sanitizeUrl((import.meta.env.VITE_API_BASE_URL || '').trim() || '/api/v1');
  api.defaults.baseURL = defaultUrl;
  return defaultUrl;
};

export const getApiBaseUrl = (): string => {
  return String(api.defaults.baseURL || '/api/v1');
};

let csrfToken: string | null = null;
let currentOrgId: string | null = null;
let authTokenGetter: (() => Promise<string | null>) | null = null;

export const setCsrfToken = (token: string | null) => {
  csrfToken = token;
};

export const setCurrentOrgId = (orgId: string | null) => {
  currentOrgId = orgId;
};

export const setAuthTokenGetter = (getter: (() => Promise<string | null>) | null) => {
  authTokenGetter = getter;
};

// Request interceptor to automatically inject CSRF token, active organization ID, and Clerk Bearer token
api.interceptors.request.use(async (config) => {
  if (csrfToken && ['post', 'patch', 'put', 'delete'].includes(config.method?.toLowerCase() || '')) {
    config.headers['X-CSRF-Token'] = csrfToken;
  }
  if (currentOrgId) {
    config.headers['X-Organization-Id'] = currentOrgId;
  }
  if (authTokenGetter) {
    try {
      const token = await authTokenGetter();
      if (token) {
        config.headers.Authorization = `Bearer ${token}`;
      }
    } catch {
      // Continue without token if acquisition fails
    }
  }
  return config;
});

// Response interceptor to update CSRF token if returned in response data
api.interceptors.response.use(
  (response) => {
    if (response.data?.data?.csrfToken) {
      setCsrfToken(response.data.data.csrfToken);
    }
    return response;
  },
  (error) => {
    if (error.response?.status === 404) {
      console.warn(
        `[TrustLayer AI API 404] Requested endpoint '${error.config?.method?.toUpperCase()} ${error.config?.url}' was not found at baseURL '${api.defaults.baseURL}'.`
      );
    }
    return Promise.reject(error);
  }
);
