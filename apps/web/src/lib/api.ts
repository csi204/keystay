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
