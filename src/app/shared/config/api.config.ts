/* ============================================================
   CENTRALIZED API CONFIGURATION
   
   Single source of truth for backend API URLs.
   
   Resolution order:
   1. NG_APP_API_URL (explicit override via window.env)
   2. localhost/127.0.0.1 detection → http://localhost:3000
   3. Fallback → https://donfrancisco-backend.fly.dev
   ============================================================ */

/**
 * Resolves the API base URL based on environment detection.
 * Works in browser environments without import.meta or process.env dependencies.
 */
export function resolveApiBaseUrl(): string {
  // Priority 1: Explicit override via global window.env
  const explicitOverride =
    typeof window !== 'undefined'
      ? (window as any)?.env?.['NG_APP_API_URL'] ?? (window as any)?.['NG_APP_API_URL']
      : undefined;

  if (explicitOverride && String(explicitOverride).trim()) {
    return String(explicitOverride).replace(/\/$/, '');
  }

  // Priority 2: Local development detection via browser hostname
  if (typeof window !== 'undefined') {
    const host = window.location.hostname;
    if (host === 'localhost' || host === '127.0.0.1') {
      return 'http://localhost:8080';
    }
  }

  // Priority 3: Production fallback
  return 'https://donfrancisco-backend.fly.dev';
}

/**
 * The resolved API base URL (without trailing slash).
 * Use this for direct concatenation or template literals.
 */
export const apiBaseUrl = resolveApiBaseUrl();

/**
 * Builds a complete API URL from a path.
 * @param path - The API path (e.g., '/usuarios/login' or 'usuarios/login')
 * @returns The complete URL (e.g., 'https://api.example.com/usuarios/login')
 */
export function buildUrl(path: string): string {
  const normalizedPath = path.startsWith('/') ? path : `/${path}`;
  return `${apiBaseUrl}${normalizedPath}`;
}

/**
 * Common API endpoint paths for type safety.
 * Use with buildUrl() or as reference.
 */
export const API_ENDPOINTS = {
  // Auth
  LOGIN: '/usuarios/login',
  REGISTER: '/usuarios/register',
  ME: '/usuarios/me',
  CHANGE_PASSWORD: '/usuarios/cambiar-password',
  
  // Local panel
  MY_LOCAL: '/api/me/local',
  MY_LOCAL_DETAILS: '/api/me/local/details',
  MY_LOCAL_MEDIA: '/api/me/local/media',
  
  // Public
  PUBLIC_LOCALES: '/api/public/locales',
  PUBLIC_LOCALE_BY_SLUG: (slug: string) => `/api/public/locales/${slug}`,
  PUBLIC_LOCALES_BY_CATEGORY: (category: string) => `/api/public/locales/category/${category}`,
} as const;
