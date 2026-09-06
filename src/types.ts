// ==========================================
// Tipos de dominio compartidos.
// Movido desde App.tsx (ver TODO original) + tipos nuevos del módulo Auth (mock).
// ==========================================
import type { ReactNode } from 'react';

/** Perfil de usuario expuesto a la UI. Nunca incluye la contraseña ni su hash. */
export type UserProfile = {
  id: string;
  username: string;
  email: string;
  balance: number;
};

/** Catálogo de juegos disponibles en el home. */
export type Game = {
  id: string;
  name: string;
  description: string;
  icon: ReactNode;
};

// ==========================================
// Auth (mock) — ver src/auth/README.md para el detalle de la implementación.
// ==========================================

/** Sesión activa: token opaco (mock) + perfil del usuario dueño de la sesión. */
export type AuthSession = {
  token: string;
  user: UserProfile;
};

export type RegisterInput = {
  username: string;
  email: string;
  password: string;
  confirmPassword: string;
};

export type LoginInput = {
  email: string;
  password: string;
};

/**
 * Resultado uniforme de las operaciones de auth. Los errores de negocio
 * (credenciales inválidas, email duplicado, validación, etc.) se devuelven
 * como `{ ok: false, message }` en vez de lanzar excepciones, para que la UI
 * los muestre directamente sin try/catch ni alert().
 */
export type AuthResult =
  | { ok: true; session: AuthSession }
  | { ok: false; message: string };

// ==========================================
// Búsqueda / Matchmaking (mock) — ver src/matchmaking/README.md.
// ==========================================

/** Un jugador esperando rival. Vive en la cola mientras no se empareja. */
export type MatchTicket = {
  id: string;
  userId: string;
  username: string;
  gameId: string;
  betAmount: number;
  createdAt: number;
};

/** Un jugador dentro de un MatchRecord ya resuelto. */
export type MatchPlayer = {
  ticketId: string;
  userId: string;
  username: string;
  /** true si es el bot de prueba (modo prueba explícito), no un jugador real. */
  isBot?: boolean;
};

/** Emparejamiento resuelto: dos jugadores, mismo juego y misma apuesta. */
export type MatchRecord = {
  id: string;
  gameId: string;
  betAmount: number;
  createdAt: number;
  players: [MatchPlayer, MatchPlayer];
};

/** Estado de la búsqueda desde el punto de vista de la pestaña que busca. */
export type QueueStatus = 'idle' | 'searching' | 'matched' | 'timeout' | 'cancelled';
