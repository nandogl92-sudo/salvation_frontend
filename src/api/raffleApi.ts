// Sorteo del día. El código y la hora acordada son los mismos para las dos cuentas.
//   GET  /users/raffle
//   POST /users/raffle   { hour }

import { API_URL } from './config'
import { getAccessToken } from './authApi'

export type RafflePlayer = {
  id: string
  name: string
}

export type DailyRaffle = {
  day: string
  code: string
  youPlay: boolean
  youRest: boolean
  players: RafflePlayer[]
  rivalName: string | null
  yourHour: number | null
  rivalHour: number | null
  agreedHour: number | null
  cleared: boolean
  hours: number[]
}

export type RaffleResult =
  | { ok: true; raffle: DailyRaffle }
  | { ok: false; message: string }

const readErrorMessage = async (response: Response): Promise<string> => {
  try {
    const body = (await response.json()) as { message?: unknown }
    if (typeof body.message === 'string' && body.message.length > 0) return body.message
  } catch {
    // Cuerpo vacío o no JSON.
  }
  return 'No se pudo cargar el sorteo de hoy.'
}

const isPlayer = (value: unknown): value is RafflePlayer => {
  if (!value || typeof value !== 'object') return false
  const player = value as RafflePlayer
  return typeof player.id === 'string' && typeof player.name === 'string'
}

const isHour = (value: unknown): value is number | null => value === null || typeof value === 'number'

const isRaffle = (value: unknown): value is DailyRaffle => {
  if (!value || typeof value !== 'object') return false
  const raffle = value as DailyRaffle
  return (
    typeof raffle.day === 'string' &&
    typeof raffle.code === 'string' &&
    typeof raffle.youPlay === 'boolean' &&
    typeof raffle.youRest === 'boolean' &&
    Array.isArray(raffle.players) &&
    raffle.players.every(isPlayer) &&
    isHour(raffle.yourHour) &&
    isHour(raffle.rivalHour) &&
    isHour(raffle.agreedHour) &&
    typeof raffle.cleared === 'boolean' &&
    Array.isArray(raffle.hours)
  )
}

const authHeaders = (): HeadersInit | null => {
  const token = getAccessToken()
  if (!token) return null
  return { Authorization: `Bearer ${token}` }
}

export const getTodayRaffle = async (): Promise<RaffleResult> => {
  const headers = authHeaders()
  if (!headers) return { ok: false, message: 'Sesión no válida o expirada.' }

  try {
    const response = await fetch(`${API_URL}/users/raffle`, { headers })
    if (!response.ok) return { ok: false, message: await readErrorMessage(response) }
    const body = (await response.json()) as unknown
    if (!isRaffle(body)) return { ok: false, message: 'El sorteo no tiene la forma esperada.' }
    return { ok: true, raffle: body }
  } catch (error) {
    const message = error instanceof Error ? error.message : 'No se pudo conectar con el servidor.'
    return { ok: false, message }
  }
}

export const chooseRaffleHour = async (hour: number): Promise<RaffleResult> => {
  const headers = authHeaders()
  if (!headers) return { ok: false, message: 'Sesión no válida o expirada.' }

  try {
    const response = await fetch(`${API_URL}/users/raffle`, {
      method: 'POST',
      headers: { ...headers, 'Content-Type': 'application/json' },
      body: JSON.stringify({ hour }),
    })
    if (!response.ok) return { ok: false, message: await readErrorMessage(response) }
    const body = (await response.json()) as unknown
    if (!isRaffle(body)) return { ok: false, message: 'El sorteo no tiene la forma esperada.' }
    return { ok: true, raffle: body }
  } catch (error) {
    const message = error instanceof Error ? error.message : 'No se pudo conectar con el servidor.'
    return { ok: false, message }
  }
}
