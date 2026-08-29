'use client';

/**
 * The real HTTP client for the NestJS API (Task 13's "connect the UI to
 * real APIs, do not use static mock data"). Unlike courses-client.ts /
 * departments-client.ts / users-client.ts (still in-memory mocks pending
 * a dedicated frontend-auth-wiring task — see their file headers), the
 * learner catalog and enrollments surfaces built on top of this client
 * talk to the live backend.
 *
 * Auth: POST /auth/login (not yet wired into any UI here) sets an
 * HttpOnly session cookie; this client exchanges that cookie for a
 * short-lived access token via POST /auth/refresh, caches it in memory,
 * and attaches it as a Bearer token. Without a session cookie (e.g. no
 * login UI has run yet in this browser), every call fails as 401 — see
 * ApiError / isUnauthorized, which the catalog/My Learning pages use to
 * render a "permission" state instead of a raw error.
 */

const API_BASE_URL = process.env.NEXT_PUBLIC_API_BASE_URL ?? 'http://localhost:5000/api/v1';

export class ApiError extends Error {
  readonly status: number;
  readonly code?: string;

  constructor(status: number, message: string, code?: string) {
    super(message);
    this.name = 'ApiError';
    this.status = status;
    this.code = code;
  }
}

export function isUnauthorized(error: unknown): error is ApiError {
  return error instanceof ApiError && (error.status === 401 || error.status === 403);
}

export function isNotFound(error: unknown): error is ApiError {
  return error instanceof ApiError && error.status === 404;
}

let cachedAccessToken: string | null = null;
let refreshInFlight: Promise<string | null> | null = null;

async function refreshAccessToken(): Promise<string | null> {
  if (refreshInFlight) return refreshInFlight;

  refreshInFlight = (async () => {
    try {
      const res = await fetch(`${API_BASE_URL}/auth/refresh`, { method: 'POST', credentials: 'include' });
      if (!res.ok) {
        cachedAccessToken = null;
        return null;
      }
      const body = (await res.json()) as { accessToken?: string };
      cachedAccessToken = body.accessToken ?? null;
      return cachedAccessToken;
    } catch {
      cachedAccessToken = null;
      return null;
    } finally {
      refreshInFlight = null;
    }
  })();

  return refreshInFlight;
}

async function getAccessToken(): Promise<string | null> {
  if (cachedAccessToken) return cachedAccessToken;
  return refreshAccessToken();
}

/** Call after a successful POST /auth/login so subsequent apiFetch calls don't need an extra refresh round-trip. */
export function setAccessToken(token: string | null): void {
  cachedAccessToken = token;
}

interface ApiFetchOptions extends Omit<RequestInit, 'body'> {
  body?: unknown;
}

async function doFetch(path: string, options: ApiFetchOptions, token: string | null): Promise<Response> {
  const headers = new Headers(options.headers);
  headers.set('Accept', 'application/json');
  if (options.body !== undefined) headers.set('Content-Type', 'application/json');
  if (token) headers.set('Authorization', `Bearer ${token}`);

  return fetch(`${API_BASE_URL}${path}`, {
    ...options,
    headers,
    credentials: 'include',
    body: options.body !== undefined ? JSON.stringify(options.body) : undefined,
  });
}

/**
 * Fetches JSON from the API. Handles the access-token lifecycle (silent
 * refresh via the session cookie, one retry on a 401 that looks like
 * mid-session token expiry) and normalizes non-2xx responses to ApiError.
 */
export async function apiFetch<T>(path: string, options: ApiFetchOptions = {}): Promise<T> {
  const token = await getAccessToken();
  let res = await doFetch(path, options, token);

  // Access tokens are short-lived (15 min per TRD §10.1); a 401 after we
  // *had* a token means it expired mid-session, not that the caller is
  // unauthenticated — retry once after a silent refresh.
  if (res.status === 401 && token) {
    cachedAccessToken = null;
    const refreshed = await getAccessToken();
    if (refreshed) {
      res = await doFetch(path, options, refreshed);
    }
  }

  if (res.status === HTTP_NO_CONTENT) return undefined as T;

  const contentType = res.headers.get('content-type') ?? '';
  const payload = contentType.includes('application/json') ? await res.json().catch(() => null) : null;

  if (!res.ok) {
    const rawMessage = (payload as { message?: string | string[] } | null)?.message;
    const message = Array.isArray(rawMessage) ? rawMessage.join(', ') : (rawMessage ?? res.statusText);
    const code = typeof (payload as { error?: unknown } | null)?.error === 'string' ? (payload as { error: string }).error : undefined;
    throw new ApiError(res.status, message, code);
  }

  return payload as T;
}

export async function apiFetchBlob(path: string, options: ApiFetchOptions = {}): Promise<Blob> {
  const token = await getAccessToken();
  let res = await doFetch(path, options, token);

  if (res.status === 401 && token) {
    cachedAccessToken = null;
    const refreshed = await getAccessToken();
    if (refreshed) {
      res = await doFetch(path, options, refreshed);
    }
  }

  if (!res.ok) {
    const payload = res.headers.get('content-type')?.includes('application/json') ? await res.json().catch(() => null) : null;
    const rawMessage = (payload as { message?: string | string[] } | null)?.message;
    const message = Array.isArray(rawMessage) ? rawMessage.join(', ') : (rawMessage ?? res.statusText);
    const code = typeof (payload as { error?: unknown } | null)?.error === 'string' ? (payload as { error: string }).error : undefined;
    throw new ApiError(res.status, message, code);
  }

  return res.blob();
}

const HTTP_NO_CONTENT = 204;
