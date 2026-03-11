// Authentication utility functions

export interface User {
  id: string;
  email: string;
  name: string;
  avatarUrl?: string;
}

export function getCurrentUser(): User | null {
  if (typeof window === 'undefined') return null;

  const token = localStorage.getItem('auth_token');
  if (!token) {
    // Fallback to old storage key for backwards compatibility
    const oldUserStr = localStorage.getItem('lumina_user');
    if (oldUserStr) {
      try {
        return JSON.parse(oldUserStr);
      } catch {
        return null;
      }
    }
    return null;
  }

  const userStr = localStorage.getItem('user');
  if (!userStr) return null;

  try {
    return JSON.parse(userStr);
  } catch {
    return null;
  }
}

export function setAuth(token: string, user: User) {
  if (typeof window === 'undefined') return;
  localStorage.setItem('auth_token', token);
  localStorage.setItem('user', JSON.stringify(user));
  // Keep old storage for backwards compatibility
  localStorage.setItem('lumina_user', JSON.stringify(user));
}

export function clearAuth() {
  if (typeof window === 'undefined') return;
  localStorage.removeItem('auth_token');
  localStorage.removeItem('user');
  localStorage.removeItem('lumina_user');
}

export function getAuthToken(): string | null {
  if (typeof window === 'undefined') return null;
  return localStorage.getItem('auth_token');
}

export function logout() {
  clearAuth();
  window.location.href = '/login';
}

export function isAuthenticated(): boolean {
  return getCurrentUser() !== null;
}

export type WorkflowMode = 'manual' | 'automated';

export function getWorkflowMode(): WorkflowMode {
  if (typeof window === 'undefined') return 'manual';
  const mode = localStorage.getItem('workflowMode');
  return (mode === 'automated' ? 'automated' : 'manual') as WorkflowMode;
}

export function setWorkflowMode(mode: WorkflowMode) {
  if (typeof window === 'undefined') return;
  localStorage.setItem('workflowMode', mode);
}
