// ==========================================
// Adaptador de resolución de partidas.
//
//   POST /matches/:matchId/results        { winnerUserId }
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

export type SettlementResult =
  | { ok: true; players: SettlementPlayer[] }
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

const request = async (path: string, body: unknown): Promise<Response> => {
  const token = getAccessToken()
  if (!token) throw new Error('Sesión no válida o expirada.')

  const startedAt = performance.now()
  const response = await fetch(`${API_URL}${path}`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${token}`,
    },
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

const readSettlement = async (response: Response): Promise<SettlementResult> => {
  if (!response.ok) return { ok: false, message: await readErrorMessage(response) }
  const body = (await response.json()) as { players?: unknown }
  if (!Array.isArray(body.players) || !body.players.every(isPlayer)) {
    return { ok: false, message: 'La respuesta de la partida no tiene la forma esperada.' }
  }
  return { ok: true, players: body.players }
}

export const submitMatchResult = async (
  matchId: string,
  winnerUserId: string
): Promise<SettlementResult> => {
  try {
    const response = await request(`/matches/${matchId}/results`, { winnerUserId })
    return await readSettlement(response)
  } catch (error) {
    const message = error instanceof Error ? error.message : 'No se pudo conectar con el servidor.'
    return { ok: false, message }
  }
}

export const cancelMatch = async (matchId: string): Promise<SettlementResult> => {
  try {
    const response = await request(`/matches/${matchId}/cancellations`, { reason: 'platform_error' })
    return await readSettlement(response)
  } catch (error) {
    const message = error instanceof Error ? error.message : 'No se pudo reembolsar la partida.'
    return { ok: false, message }
  }
}
