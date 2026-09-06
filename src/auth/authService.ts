// ==========================================
// MOCK — Servicio de autenticación.
//
// Simula la API que tendría un backend real (POST /auth/register,
// POST /auth/login, etc.) pero persiste todo en localStorage a través de
// src/auth/storage.ts. La UI (AuthContext, AuthPanel) solo conoce estas
// funciones — no sabe que por debajo hay localStorage.
//
// Ver src/auth/README.md para el detalle completo y las limitaciones.
// ==========================================

import type { AuthResult, AuthSession, LoginInput, RegisterInput, UserProfile } from '../types';
import {
  clearSession,
  loadSession,
  loadUsers,
  saveSession,
  saveUsers,
  type StoredUser,
} from './storage';

const INITIAL_BALANCE = 100;
const MIN_PASSWORD_LENGTH = 8;

/** Retraso artificial para simular latencia de red. Puramente cosmético. */
const MOCK_LATENCY_MS = 350;

function delay<T>(value: T): Promise<T> {
  return new Promise((resolve) => setTimeout(() => resolve(value), MOCK_LATENCY_MS));
}

function toPublicUser(stored: StoredUser): UserProfile {
  return {
    id: stored.id,
    username: stored.username,
    email: stored.email,
    balance: stored.balance,
  };
}

function normalizeEmail(email: string): string {
  return email.trim().toLowerCase();
}

/**
 * Hash de la contraseña. Usa la Web Crypto API nativa del navegador
 * (SubtleCrypto, disponible sin instalar nada en localhost/HTTPS).
 *
 * MOCK: no hay salt por usuario ni backend real detrás — esto solo evita
 * que la contraseña quede en texto plano dentro de localStorage. No debe
 * considerarse seguridad de nivel producción.
 */
async function hashPassword(password: string): Promise<string> {
  const encoder = new TextEncoder();
  const data = encoder.encode(`betplay:mock:${password}`);
  const digest = await crypto.subtle.digest('SHA-256', data);
  return Array.from(new Uint8Array(digest))
    .map((b) => b.toString(16).padStart(2, '0'))
    .join('');
}

function generateId(): string {
  return crypto.randomUUID();
}

function generateToken(): string {
  return `mock_${crypto.randomUUID()}`;
}

function validateRegisterInput(input: RegisterInput, users: StoredUser[]): string | null {
  const username = input.username.trim();
  const email = normalizeEmail(input.email);

  if (username.length < 3) {
    return 'El nombre de usuario debe tener al menos 3 caracteres.';
  }
  if (!email.includes('@') || !email.includes('.')) {
    return 'Ingresa un email válido.';
  }
  if (input.password.length < MIN_PASSWORD_LENGTH) {
    return `La contraseña debe tener al menos ${MIN_PASSWORD_LENGTH} caracteres.`;
  }
  if (input.password !== input.confirmPassword) {
    return 'Las contraseñas no coinciden.';
  }
  const usernameTaken = users.some((u) => u.username.toLowerCase() === username.toLowerCase());
  if (usernameTaken) {
    return 'Ese nombre de usuario ya está en uso.';
  }
  const emailTaken = users.some((u) => u.email === email);
  if (emailTaken) {
    return 'Ya existe una cuenta registrada con ese email.';
  }
  return null;
}

/** Crea una cuenta nueva y deja la sesión iniciada. Saldo inicial: $100 (una sola vez). */
export async function register(input: RegisterInput): Promise<AuthResult> {
  const users = loadUsers();
  const validationError = validateRegisterInput(input, users);
  if (validationError) {
    return delay({ ok: false, message: validationError });
  }

  const passwordHash = await hashPassword(input.password);
  const newUser: StoredUser = {
    id: generateId(),
    username: input.username.trim(),
    email: normalizeEmail(input.email),
    passwordHash,
    balance: INITIAL_BALANCE,
  };

  saveUsers([...users, newUser]);

  const session: AuthSession = { token: generateToken(), user: toPublicUser(newUser) };
  saveSession({ token: session.token, userId: newUser.id });

  return delay({ ok: true, session });
}

/** Inicia sesión con email + password. Mensaje de error genérico por seguridad. */
export async function login(input: LoginInput): Promise<AuthResult> {
  const email = normalizeEmail(input.email);
  const users = loadUsers();
  const found = users.find((u) => u.email === email);

  const genericError = { ok: false as const, message: 'Email o contraseña incorrectos.' };

  if (!found) {
    return delay(genericError);
  }

  const passwordHash = await hashPassword(input.password);
  if (passwordHash !== found.passwordHash) {
    return delay(genericError);
  }

  const session: AuthSession = { token: generateToken(), user: toPublicUser(found) };
  saveSession({ token: session.token, userId: found.id });

  return delay({ ok: true, session });
}

/** Cierra la sesión activa. No borra la cuenta ni su saldo. */
export async function logout(): Promise<void> {
  clearSession();
  return delay(undefined);
}

/**
 * Recupera la sesión persistida (si existe y sigue siendo válida). Se usa al
 * montar la app para hidratar el estado sin pedir login de nuevo.
 */
export async function getCurrentSession(): Promise<AuthSession | null> {
  const storedSession = loadSession();
  if (!storedSession) return delay(null);

  const users = loadUsers();
  const user = users.find((u) => u.id === storedSession.userId);
  if (!user) {
    // Sesión huérfana (usuario borrado externamente): limpiar y no fallar.
    clearSession();
    return delay(null);
  }

  return delay({ token: storedSession.token, user: toPublicUser(user) });
}

/** Persiste el nuevo saldo del usuario (ej. tras ganar/perder una partida). */
export async function updateUserBalance(userId: string, balance: number): Promise<UserProfile | null> {
  const users = loadUsers();
  const index = users.findIndex((u) => u.id === userId);
  if (index === -1) return delay(null);

  const updated: StoredUser = { ...users[index], balance };
  const nextUsers = [...users];
  nextUsers[index] = updated;
  saveUsers(nextUsers);

  return delay(toPublicUser(updated));
}
