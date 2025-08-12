import { api } from './client';

export type LoginResponse = { access_token: string; refresh_token?: string };

export async function login(email: string, password: string): Promise<LoginResponse> {
  return api<LoginResponse>('/auth/login', { method: 'POST', body: { email, password } });
}

export async function register(email: string, password: string): Promise<{ message: string } | LoginResponse> {
  return api('/auth/register', { method: 'POST', body: { email, password } });
}

export type RefreshResponse = { access_token: string };
export async function refresh(refresh_token: string): Promise<RefreshResponse> {
  return api<RefreshResponse>('/auth/refresh', { method: 'POST', body: { refresh_token } });
}

export type MeResponse = { id: number; email: string };
export async function me(): Promise<MeResponse> {
  return api<MeResponse>('/auth/me');
}
