// ==========================================
// MOCK — Almacén de autenticación en localStorage.
//
// Esto NO es un backend. Sustituye llamadas a una API real. Ver
// src/auth/README.md para el detalle completo (claves, forma de los datos,
// limitaciones y equivalentes de API futuros).
//
// Claves usadas en localStorage:
//   - betplay.mock.users   -> StoredUser[]
//   - betplay.mock.session -> StoredSession | null
// ==========================================

/** Usuario tal como se persiste en el mock. Incluye el hash, nunca la password. */
export type StoredUser = {
  id: string;
  username: string;
  email: string;
  passwordHash: string;
  balance: number;
};

export type StoredSession = {
  token: string;
  userId: string;
};

const USERS_KEY = 'betplay.mock.users';
const SESSION_KEY = 'betplay.mock.session';

function isBrowser(): boolean {
  return typeof window !== 'undefined' && typeof window.localStorage !== 'undefined';
}

export function loadUsers(): StoredUser[] {
  if (!isBrowser()) return [];
  try {
    const raw = window.localStorage.getItem(USERS_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    // JSON corrupto o localStorage bloqueado: tratamos como "sin usuarios".
    return [];
  }
}

export function saveUsers(users: StoredUser[]): void {
  if (!isBrowser()) return;
  window.localStorage.setItem(USERS_KEY, JSON.stringify(users));
}

export function loadSession(): StoredSession | null {
  if (!isBrowser()) return null;
  try {
    const raw = window.localStorage.getItem(SESSION_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw);
    if (parsed && typeof parsed.token === 'string' && typeof parsed.userId === 'string') {
      return parsed as StoredSession;
    }
    return null;
  } catch {
    return null;
  }
}

export function saveSession(session: StoredSession): void {
  if (!isBrowser()) return;
  window.localStorage.setItem(SESSION_KEY, JSON.stringify(session));
}

/** Borra solo la sesión activa. Las cuentas (betplay.mock.users) no se tocan. */
export function clearSession(): void {
  if (!isBrowser()) return;
  window.localStorage.removeItem(SESSION_KEY);
}
