import axios from 'axios';

export const api = axios.create({
  baseURL: import.meta.env.VITE_API_BASE_URL || '/api/v1',
  withCredentials: true,
  headers: {
    'Content-Type': 'application/json',
  },
});

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
    return Promise.reject(error);
  }
);

