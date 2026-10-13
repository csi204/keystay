/**
 * API Endpoint Configuration
 * Reads from Vite environment variable VITE_API_BASE_URL:
 * - Local Development (.env / .env.development): empty string '' to leverage Vite proxy (/api -> localhost:8787)
 * - Production (.env.production): e.g. https://keystay-api-gateway.khetsophon-ain.workers.dev
 */
export const API_BASE_URL: string = (import.meta.env.VITE_API_BASE_URL as string) || '';

/**
 * Returns full URL for an API endpoint
 * @param path e.g. '/api/auth/login'
 */
export const apiUrl = (path: string): string => {
  const cleanPath = path.startsWith('/') ? path : `/${path}`;
  return `${API_BASE_URL}${cleanPath}`;
};

export interface ApiResponse<T = any> {
  data: T | null;
  error: string | null;
  isOffline: boolean;
}

export const getAuthToken = (): string | null => {
  return sessionStorage.getItem('keystay_token') || localStorage.getItem('keystay_token');
};

export const getAuthRole = (): string => {
  return (sessionStorage.getItem('keystay_role') || localStorage.getItem('keystay_role') || 'front_desk').toLowerCase();
};

export const getAuthUser = (): any => {
  const raw = sessionStorage.getItem('keystay_user') || localStorage.getItem('keystay_user');
  try {
    return raw ? JSON.parse(raw) : null;
  } catch {
    return null;
  }
};

export const setAuthSession = (token: string, user: any, role: string) => {
  sessionStorage.setItem('keystay_token', token);
  sessionStorage.setItem('keystay_user', typeof user === 'string' ? user : JSON.stringify(user));
  sessionStorage.setItem('keystay_role', role);
};

export const clearAuthSession = () => {
  sessionStorage.removeItem('keystay_token');
  sessionStorage.removeItem('keystay_user');
  sessionStorage.removeItem('keystay_role');
  localStorage.removeItem('keystay_token');
  localStorage.removeItem('keystay_user');
  localStorage.removeItem('keystay_role');
};

/**
 * Robust API fetcher with token injection, timeout, and offline detection
 */
export async function apiFetch<T = any>(
  endpoint: string,
  options: RequestInit = {}
): Promise<ApiResponse<T>> {
  const token = getAuthToken();
  const headers = new Headers(options.headers || {});

  if (!headers.has('Content-Type') && !(options.body instanceof FormData)) {
    headers.set('Content-Type', 'application/json');
  }

  if (token && !headers.has('Authorization')) {
    headers.set('Authorization', `Bearer ${token}`);
  }

  const url = apiUrl(endpoint);

  try {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 8000); // 8s timeout

    const res = await fetch(url, {
      ...options,
      headers,
      signal: options.signal || controller.signal,
    });
    clearTimeout(timeoutId);

    const json = await res.json().catch(() => null);

    if (!res.ok) {
      const isGatewayDown =
        res.status >= 500 &&
        (!json || json?.code === 'ECONNREFUSED' || typeof json !== 'object');

      return {
        data: null,
        error: json?.error?.message || json?.error || `HTTP ${res.status}: ${res.statusText}`,
        isOffline: isGatewayDown,
      };
    }

    return {
      data: (json?.data !== undefined ? json.data : json) as T,
      error: null,
      isOffline: false,
    };
  } catch (err: any) {
    const isNetworkOrAbort =
      err.name === 'AbortError' ||
      err.message?.includes('Failed to fetch') ||
      err.message?.includes('NetworkError');

    return {
      data: null,
      error: err.message || 'Network connection failed',
      isOffline: isNetworkOrAbort,
    };
  }
}
