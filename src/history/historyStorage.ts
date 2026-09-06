// ==========================================
// MOCK — Almacén del historial de partidas en localStorage.
//
// Misma forma que src/auth/storage.ts: funciones puras de lectura/escritura.
// Cuando haya backend, solo se reemplaza este fichero por llamadas a la API.
//
// Clave usada en localStorage:
//   - betplay.mock.history -> MatchHistoryRecord[]
// ==========================================

import type { MatchHistoryRecord } from '../types';

const HISTORY_KEY = 'betplay.mock.history';

function isBrowser(): boolean {
  return typeof window !== 'undefined' && typeof window.localStorage !== 'undefined';
}

export function loadHistory(): MatchHistoryRecord[] {
  if (!isBrowser()) return [];
  try {
    const raw = window.localStorage.getItem(HISTORY_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

export function saveHistory(records: MatchHistoryRecord[]): void {
  if (!isBrowser()) return;
  window.localStorage.setItem(HISTORY_KEY, JSON.stringify(records));
}

/** Añade un registro al historial (prepend: el más reciente primero). */
export function appendRecord(record: MatchHistoryRecord): void {
  const history = loadHistory();
  saveHistory([record, ...history]);
}
