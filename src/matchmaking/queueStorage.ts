// ==========================================
// MOCK — Almacén de la cola de matchmaking en localStorage.
//
// localStorage es compartido por todas las pestañas del mismo origen, así
// que se usa como "cola compartida": cada pestaña escribe su ticket aquí y
// lee los tickets de las demás. Esto permite que dos pestañas distintas
// (dos cuentas reales) se emparejen sin backend.
//
// Ver src/matchmaking/README.md para el detalle completo.
//
// Claves usadas en localStorage:
//   - betplay.mock.queue   -> MatchTicket[]  (tickets esperando rival)
//   - betplay.mock.matches -> MatchRecord[]  (emparejamientos ya resueltos)
// ==========================================
import type { MatchRecord, MatchTicket } from '../types';

const QUEUE_KEY = 'betplay.mock.queue';
const MATCHES_KEY = 'betplay.mock.matches';

/** Los matches resueltos se limpian solos tras este tiempo para no acumular basura. */
const MATCH_RETENTION_MS = 5 * 60 * 1000;

function isBrowser(): boolean {
  return typeof window !== 'undefined' && typeof window.localStorage !== 'undefined';
}

export function loadQueue(): MatchTicket[] {
  if (!isBrowser()) return [];
  try {
    const raw = window.localStorage.getItem(QUEUE_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

export function saveQueue(tickets: MatchTicket[]): void {
  if (!isBrowser()) return;
  window.localStorage.setItem(QUEUE_KEY, JSON.stringify(tickets));
}

export function loadMatches(): MatchRecord[] {
  if (!isBrowser()) return [];
  try {
    const raw = window.localStorage.getItem(MATCHES_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    if (!Array.isArray(parsed)) return [];
    // Poda matches viejos para no acumular basura indefinidamente.
    const cutoff = Date.now() - MATCH_RETENTION_MS;
    return parsed.filter((m: MatchRecord) => m.createdAt >= cutoff);
  } catch {
    return [];
  }
}

export function saveMatches(matches: MatchRecord[]): void {
  if (!isBrowser()) return;
  window.localStorage.setItem(MATCHES_KEY, JSON.stringify(matches));
}
