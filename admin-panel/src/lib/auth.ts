const TOKEN_KEY = 'lc_admin_token';
const USER_KEY = 'lc_admin_user';

export interface AdminUser {
  id: string;
  email: string;
  name: string;
  avatar?: string;
  role: string;
}

export function getToken(): string | null {
  return localStorage.getItem(TOKEN_KEY);
}

export function setToken(token: string): void {
  localStorage.setItem(TOKEN_KEY, token);
}

export function getUser(): AdminUser | null {
  const raw = localStorage.getItem(USER_KEY);
  if (!raw) return null;
  try {
    return JSON.parse(raw) as AdminUser;
  } catch {
    return null;
  }
}

export function setUser(user: AdminUser): void {
  localStorage.setItem(USER_KEY, JSON.stringify(user));
}

export function clearAuth(): void {
  localStorage.removeItem(TOKEN_KEY);
  localStorage.removeItem(USER_KEY);
}

export function isTokenExpired(): boolean {
  const token = getToken();
  if (!token) return false;
  try {
    const payload = JSON.parse(atob(token.split('.')[1])) as { exp?: number };
    return payload.exp != null && payload.exp * 1000 < Date.now();
  } catch {
    return true;
  }
}

export function isAuthenticated(): boolean {
  return Boolean(getToken()) && !isTokenExpired();
}
