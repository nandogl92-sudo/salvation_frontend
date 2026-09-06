// ==========================================
// Hook: usePlayerStats
//
// Lee el historial del jugador actual desde localStorage y devuelve
// estadísticas derivadas listas para mostrar en el perfil.
// La lógica de cálculo vive aquí, no en el componente.
// ==========================================

import { useMemo } from 'react';
import { loadHistory } from '../api/historyApi';
import type { MatchHistoryRecord } from '../types';

export type PlayerStats = {
  totalGames: number;
  wins: number;
  losses: number;
  /** Profit total acumulado en USD (puede ser negativo). */
  totalProfit: number;
  /** Las últimas 10 partidas, ya filtradas para este usuario. */
  history: MatchHistoryRecord[];
};

/**
 * Calcula estadísticas del jugador a partir del historial en localStorage.
 * @param userId - ID del jugador cuyas estadísticas se calculan.
 */
export function usePlayerStats(userId: string): PlayerStats {
  return useMemo(() => {
    const all = loadHistory().filter((r) => r.userId === userId);
    const recent = all.slice(0, 10);

    const wins = all.filter((r) => r.result === 'win').length;
    const losses = all.filter((r) => r.result === 'loss').length;
    const totalProfit = all.reduce((sum, r) => sum + r.profit, 0);

    return {
      totalGames: wins + losses,
      wins,
      losses,
      totalProfit,
      history: recent,
    };
  }, [userId]);
}
