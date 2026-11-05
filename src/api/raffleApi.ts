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

const FALLBACK_HOURS = [15, 16, 17, 18, 19, 20, 21, 22, 23]

const readHour = (value: unknown): number | null => {
  if (typeof value === 'number' && Number.isFinite(value)) return value
  if (typeof value === 'string' && value.trim() !== '' && Number.isFinite(Number(value))) return Number(value)
  return null
}

const readPlayer = (value: unknown): RafflePlayer | null => {
  if (!value || typeof value !== 'object') return null
  const player = value as { id?: unknown; _id?: unknown; name?: unknown; username?: unknown }
  const id = typeof player.id === 'string' ? player.id : typeof player._id === 'string' ? player._id : ''
  const name = typeof player.name === 'string' ? player.name : typeof player.username === 'string' ? player.username : ''
  if (!id || !name) return null
  return { id, name }
}

const readRaffle = (value: unknown): DailyRaffle | null => {
  if (!value || typeof value !== 'object') return null
  const body = value as {
    day?: unknown
    code?: unknown
    youPlay?: unknown
    youRest?: unknown
    youWon?: unknown
    winnerId?: unknown
    winnerName?: unknown
    players?: unknown
    rivalName?: unknown
    yourHour?: unknown
    rivalHour?: unknown
    agreedHour?: unknown
    cleared?: unknown
    hours?: unknown
  }
  if (typeof body.code !== 'string' || body.code.length === 0) return null

  const listed = Array.isArray(body.players) ? body.players.map(readPlayer).filter((player) => player !== null) : []
  const players = listed.length > 0
    ? listed
    : typeof body.winnerId === 'string' && typeof body.winnerName === 'string'
      ? [{ id: body.winnerId, name: body.winnerName }]
      : []
  const youPlay = typeof body.youPlay === 'boolean' ? body.youPlay : body.youWon === true
  const parsedHours = Array.isArray(body.hours) ? body.hours.map(readHour).filter((hour) => hour !== null) : []

  return {
    day: typeof body.day === 'string' ? body.day : '',
    code: body.code,
    youPlay,
    youRest: typeof body.youRest === 'boolean' ? body.youRest : !youPlay,
    players,
    rivalName: typeof body.rivalName === 'string' ? body.rivalName : null,
    yourHour: readHour(body.yourHour),
    rivalHour: readHour(body.rivalHour),
    agreedHour: readHour(body.agreedHour),
    cleared: body.cleared === true,
    hours: parsedHours.length > 0 ? parsedHours : FALLBACK_HOURS,
  }
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
    const response = await fetch(`${API_URL}/users/raffle`, { headers, cache: 'no-store' })
    if (!response.ok) return { ok: false, message: await readErrorMessage(response) }
    const raffle = readRaffle(await response.json())
    if (!raffle) return { ok: false, message: 'El sorteo no tiene la forma esperada.' }
    return { ok: true, raffle }
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
      cache: 'no-store',
      headers: { ...headers, 'Content-Type': 'application/json' },
      body: JSON.stringify({ hour }),
    })
    if (!response.ok) return { ok: false, message: await readErrorMessage(response) }
    const raffle = readRaffle(await response.json())
    if (!raffle) return { ok: false, message: 'El sorteo no tiene la forma esperada.' }
    return { ok: true, raffle }
  } catch (error) {
    const message = error instanceof Error ? error.message : 'No se pudo conectar con el servidor.'
    return { ok: false, message }
  }
}
