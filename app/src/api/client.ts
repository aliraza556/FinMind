import {
  getToken,
  setToken,
  clearToken,
  getRefreshToken,
  clearRefreshToken,
} from '../lib/auth';
import { refresh as refreshApi } from './auth';

const baseURL = import.meta.env.VITE_API_URL?.replace(/\/$/, '') || 'http://localhost:8000';

export type HttpMethod = 'GET' | 'POST' | 'PATCH' | 'DELETE';

export async function api<T = any>(
  path: string,
  opts: { method?: HttpMethod; body?: any; headers?: Record<string, string> } = {},
): Promise<T> {
  async function doFetch(withAuth = true): Promise<Response> {
    const token = withAuth ? getToken() : null;
    const headers: Record<string, string> = {
      'Content-Type': 'application/json',
      ...(opts.headers || {}),
    };
    if (token) headers['Authorization'] = `Bearer ${token}`;
    return fetch(`${baseURL}${path}`, {
      method: opts.method || 'GET',
      headers,
      body: opts.body ? JSON.stringify(opts.body) : undefined,
      credentials: 'include',
    });
  }

  let res = await doFetch(true);

  // Attempt refresh once on 401
  if (res.status === 401) {
    const rt = getRefreshToken();
    if (rt) {
      try {
        const r = await refreshApi(rt);
        setToken(r.access_token);
        res = await doFetch(true);
      } catch {
        clearToken();
        clearRefreshToken();
        throw new Error('Unauthorized');
      }
    } else {
      clearToken();
      clearRefreshToken();
      throw new Error('Unauthorized');
    }
  }

  if (!res.ok) {
    const text = await res.text();
    let msg = text;
    try {
      const obj = JSON.parse(text);
      msg = (obj && (obj.error || obj.message)) || JSON.stringify(obj);
    } catch {}
    throw new Error(msg || `HTTP ${res.status}`);
  }

  const ct = res.headers.get('content-type') || '';
  if (ct.includes('application/json')) {
    return (await res.json()) as T;
  }
  return (await res.text()) as unknown as T;
}
