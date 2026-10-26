// ==========================================
// Adaptador de resolución de partidas.
//
//   GET  /matches/:matchId                cierre compartido
//   POST /matches/:matchId/results        { winnerUserId, endReason? }
//   POST /matches/:matchId/cancellations  { reason: "platform_error" }
//
// El saldo nuevo viene en `players`. La UI no calcula el pozo.
// ==========================================

import { API_URL } from './config'
import { getAccessToken } from './authApi'

export type SettlementPlayer = {
  id: string
  username: string
  email: string
  balance: number
}

export type MatchEndReason = 'play' | 'forfeit'

export type MatchStatusView = {
  settlement: 'pending' | 'resolved' | 'refunded'
  winnerUserId: string | null
  endReason: MatchEndReason | null
  ranked: boolean
  players: SettlementPlayer[]
  liveUserIds: string[]
}

export type SettlementResult =
  | { ok: true; players: SettlementPlayer[] }
  | { ok: false; alreadySettled?: boolean; message: string }

export type MatchStatusResult =
  | { ok: true; status: MatchStatusView }
  | { ok: false; message: string }

const logCall = (endpoint: string, status: number, startedAt: number) => {
  const latencyMs = Math.round(performance.now() - startedAt)
  console.info('[matches]', { endpoint, status, latencyMs })
}

const readErrorMessage = async (response: Response): Promise<string> => {
  try {
    const body = (await response.json()) as { message?: unknown }
    if (typeof body.message === 'string' && body.message.length > 0) return body.message
  } catch {
    // Cuerpo vacío o no JSON.
  }
  return 'No se pudo resolver la partida.'
}

const authHeaders = (token: string, withJson: boolean): Headers => {
  const headers = new Headers()
  if (withJson) headers.set('Content-Type', 'application/json')
  headers.set('Authorization', `Bearer ${token}`)
  return headers
}

const postJson = async (path: string, body: unknown): Promise<Response> => {
  const token = getAccessToken()
  if (!token) throw new Error('Sesión no válida o expirada.')

  const startedAt = performance.now()
  const response = await fetch(`${API_URL}${path}`, {
    method: 'POST',
    headers: authHeaders(token, true),
    body: JSON.stringify(body),
  })
  logCall(`POST ${path}`, response.status, startedAt)
  return response
}

const isPlayer = (value: unknown): value is SettlementPlayer => {
  if (!value || typeof value !== 'object') return false
  const player = value as SettlementPlayer
  return (
    typeof player.id === 'string' &&
    typeof player.username === 'string' &&
    typeof player.email === 'string' &&
    typeof player.balance === 'number'
  )
}

const readPlayers = (value: unknown): SettlementPlayer[] | null => {
  if (!Array.isArray(value) || !value.every(isPlayer)) return null
  return value
}

const readSettlement = async (response: Response): Promise<SettlementResult> => {
  if (response.status === 409) {
    return { ok: false, alreadySettled: true, message: await readErrorMessage(response) }
  }
  if (!response.ok) return { ok: false, message: await readErrorMessage(response) }
  const body = (await response.json()) as { players?: unknown }
  const players = readPlayers(body.players)
  if (!players) return { ok: false, message: 'La respuesta de la partida no tiene la forma esperada.' }
  return { ok: true, players }
}

const isEndReason = (value: unknown): value is MatchEndReason => value === 'play' || value === 'forfeit'

const isSettlement = (value: unknown): value is MatchStatusView['settlement'] =>
  value === 'pending' || value === 'resolved' || value === 'refunded'

export const fetchMatchStatus = async (matchId: string): Promise<MatchStatusResult> => {
  try {
    const token = getAccessToken()
    if (!token) return { ok: false, message: 'Sesión no válida o expirada.' }

    const startedAt = performance.now()
    const path = `/matches/${matchId}`
    const response = await fetch(`${API_URL}${path}`, {
      method: 'GET',
      headers: authHeaders(token, false),
    })
    logCall(`GET ${path}`, response.status, startedAt)
    if (!response.ok) return { ok: false, message: await readErrorMessage(response) }

    const body = (await response.json()) as Record<string, unknown>
    const players = readPlayers(body.players)
    const liveUserIds = Array.isArray(body.liveUserIds)
      ? body.liveUserIds.filter((id): id is string => typeof id === 'string')
      : null
    if (!isSettlement(body.settlement) || !players || !liveUserIds) {
      return { ok: false, message: 'La respuesta de la partida no tiene la forma esperada.' }
    }

    return {
      ok: true,
      status: {
        settlement: body.settlement,
        winnerUserId: typeof body.winnerUserId === 'string' ? body.winnerUserId : null,
        endReason: isEndReason(body.endReason) ? body.endReason : null,
        ranked: body.ranked === true,
        players,
        liveUserIds,
      },
    }
  } catch (error) {
    const message = error instanceof Error ? error.message : 'No se pudo consultar la partida.'
    return { ok: false, message }
  }
}

export const submitMatchResult = async (
  matchId: string,
  winnerUserId: string,
  endReason: MatchEndReason = 'play',
  options?: { keepalive?: boolean }
): Promise<SettlementResult> => {
  try {
    const token = getAccessToken()
    if (!token) return { ok: false, message: 'Sesión no válida o expirada.' }

    if (options?.keepalive) {
      void fetch(`${API_URL}/matches/${matchId}/results`, {
        method: 'POST',
        headers: authHeaders(token, true),
        body: JSON.stringify({ winnerUserId, endReason }),
        keepalive: true,
      })
      return { ok: true, players: [] }
    }

    const response = await postJson(`/matches/${matchId}/results`, { winnerUserId, endReason })
    return await readSettlement(response)
  } catch (error) {
    const message = error instanceof Error ? error.message : 'No se pudo conectar con el servidor.'
    return { ok: false, message }
  }
}

export const cancelMatch = async (matchId: string): Promise<SettlementResult> => {
  try {
    const response = await postJson(`/matches/${matchId}/cancellations`, { reason: 'platform_error' })
    return await readSettlement(response)
  } catch (error) {
    const message = error instanceof Error ? error.message : 'No se pudo reembolsar la partida.'
    return { ok: false, message }
  }
}

export const forfeitMatch = async (
  matchId: string,
  options?: { keepalive?: boolean }
): Promise<SettlementResult> => {
  try {
    const token = getAccessToken()
    if (!token) return { ok: false, message: 'Sesión no válida o expirada.' }

    if (options?.keepalive) {
      void fetch(`${API_URL}/matches/${matchId}/forfeits`, {
        method: 'POST',
        headers: authHeaders(token, true),
        body: JSON.stringify({}),
        keepalive: true,
      })
      return { ok: true, players: [] }
    }

    const response = await postJson(`/matches/${matchId}/forfeits`, {})
    return await readSettlement(response)
  } catch (error) {
    const message = error instanceof Error ? error.message : 'No se pudo abandonar la partida.'
    return { ok: false, message }
  }
}
