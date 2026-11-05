// Rol y acceso a los juegos.
// Si el servidor ya manda role y gamesAccess, esos valores mandan.
// Si no vienen (sesión vieja), se usa el libro local y VITE_ADMIN_EMAIL.

import type { AccountRole, UserProfile } from '../types';

export const ACCESS_STORAGE_KEY = 'betplay.mock.access';

type AccountAccess = {
  role: AccountRole;
  gamesAccess: boolean;
};

type AccessBook = Record<string, AccountAccess>;

const isBrowser = (): boolean => {
  return typeof window !== 'undefined' && typeof window.localStorage !== 'undefined';
};

const adminEmails = (): Set<string> => {
  const raw = import.meta.env['VITE_ADMIN_EMAIL'];
  if (typeof raw !== 'string') return new Set();
  const emails = raw
    .split(',')
    .map((email) => email.trim().toLowerCase())
    .filter((email) => email.length > 0);
  return new Set(emails);
};

const loadBook = (): AccessBook => {
  if (!isBrowser()) return {};
  try {
    const raw = window.localStorage.getItem(ACCESS_STORAGE_KEY);
    if (!raw) return {};
    const parsed = JSON.parse(raw) as AccessBook;
    if (!parsed || typeof parsed !== 'object') return {};
    return parsed;
  } catch {
    return {};
  }
};

const saveBook = (book: AccessBook): void => {
  if (!isBrowser()) return;
  window.localStorage.setItem(ACCESS_STORAGE_KEY, JSON.stringify(book));
};

const roleOf = (userId: string, email: string): AccountRole => {
  const saved = loadBook()[userId];
  if (adminEmails().has(email.trim().toLowerCase())) return 'admin';
  if (saved?.role === 'admin') return 'admin';
  return 'user';
};

export const applyAccountAccess = (user: UserProfile): UserProfile => {
  const saved = loadBook()[user.id];
  const roleFromServer = user.role === 'admin' || user.role === 'user' ? user.role : undefined;
  const gamesFromServer = typeof user.gamesAccess === 'boolean' ? user.gamesAccess : undefined;
  return {
    ...user,
    role: roleFromServer ?? roleOf(user.id, user.email),
    gamesAccess: gamesFromServer ?? saved?.gamesAccess === true,
  };
};

/** Abre o cierra los juegos. No toca fichas ni puntos del mes. */
export const saveGamesAccess = (userId: string, email: string, gamesAccess: boolean): void => {
  const book = loadBook();
  book[userId] = { role: roleOf(userId, email), gamesAccess };
  saveBook(book);
};
