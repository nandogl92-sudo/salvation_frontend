// ==========================================
// Adaptador del historial de partidas.
//
//   GET /users/:id/history
//
// El servidor devuelve las estadísticas ya calculadas y el historial
// completo, del más reciente al más antiguo. La UI se queda con 10.
// ==========================================

import { API_URL } from './config'
import { getAccessToken } from './authApi'
import type { MatchHistoryRecord } from '../types'

const GAME_NAMES: Record<string, string> = {
  pong: 'Paddle Duel',
  snake: 'Worm Clash',
  tetris: 'Block Battle',
  combat: 'Arena Clash',
  shooter: 'Laser Duel',
}

export type PlayerHistory = {
  totalGames: number
  wins: number
  losses: number
  totalProfit: number
  history: MatchHistoryRecord[]
}

export type HistoryResult =
  | { ok: true; stats: PlayerHistory }
  | { ok: false; message: string }

const EMPTY_HISTORY: PlayerHistory = {
  totalGames: 0,
  wins: 0,
  losses: 0,
  totalProfit: 0,
  history: [],
}

const logCall = (endpoint: string, status: number, startedAt: number) => {
  const latencyMs = Math.round(performance.now() - startedAt)
  console.info('[history]', { endpoint, status, latencyMs })
}

const readErrorMessage = async (response: Response): Promise<string> => {
  try {
    const body = (await response.json()) as { message?: unknown }
    if (typeof body.message === 'string' && body.message.length > 0) return body.message
  } catch {
    // Cuerpo no JSON.
  }
  return 'No se pudo cargar el historial.'
}

const isResult = (value: unknown): value is MatchHistoryRecord['result'] => {
  return value === 'win' || value === 'loss' || value === 'refund'
}

const isRecord = (value: unknown): value is Omit<MatchHistoryRecord, 'playedAt' | 'gameName'> & {
  gameName: string
  playedAt: string
} => {
  if (!value || typeof value !== 'object') return false
  const record = value as MatchHistoryRecord & { playedAt: unknown }
  return (
    typeof record.id === 'string' &&
    typeof record.userId === 'string' &&
    typeof record.gameId === 'string' &&
    typeof record.betAmount === 'number' &&
    typeof record.profit === 'number' &&
    typeof record.playedAt === 'string' &&
    isResult(record.result)
  )
}

const isStats = (value: unknown): value is {
  totalGames: number
  wins: number
  losses: number
  totalProfit: number
  history: unknown[]
} => {
  if (!value || typeof value !== 'object') return false
  const stats = value as PlayerHistory
  return (
    typeof stats.totalGames === 'number' &&
    typeof stats.wins === 'number' &&
    typeof stats.losses === 'number' &&
    typeof stats.totalProfit === 'number' &&
    Array.isArray(stats.history)
  )
}

export const fetchPlayerHistory = async (userId: string): Promise<HistoryResult> => {
  const token = getAccessToken()
  if (!token) return { ok: false, message: 'Sesión no válida o expirada.' }

  const path = `/users/${userId}/history`
  const startedAt = performance.now()

  try {
    const response = await fetch(`${API_URL}${path}`, {
      method: 'GET',
      headers: { Authorization: `Bearer ${token}` },
    })
    logCall(`GET ${path}`, response.status, startedAt)

    if (!response.ok) return { ok: false, message: await readErrorMessage(response) }

    const body = (await response.json()) as unknown
    if (!isStats(body) || !body.history.every(isRecord)) {
      return { ok: false, message: 'La respuesta del historial no tiene la forma esperada.' }
    }

    const history = body.history.slice(0, 10).map((record) => {
      const item = record as MatchHistoryRecord & { playedAt: string }
      return {
        id: item.id,
        userId: item.userId,
        gameId: item.gameId,
        gameName: GAME_NAMES[item.gameId] ?? item.gameId,
        betAmount: item.betAmount,
        result: item.result,
        profit: item.profit,
        playedAt: Date.parse(item.playedAt),
      }
    })

    return {
      ok: true,
      stats: {
        totalGames: body.totalGames,
        wins: body.wins,
        losses: body.losses,
        totalProfit: body.totalProfit,
        history,
      },
    }
  } catch (error) {
    const message = error instanceof Error ? error.message : 'No se pudo conectar con el servidor.'
    return { ok: false, message }
  }
}

export { EMPTY_HISTORY }
