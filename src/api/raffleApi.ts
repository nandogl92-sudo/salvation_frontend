// Sorteo del día. Cada cuenta real tiene su partido. La hora se acuerda en cada pareja.
//   GET  /users/raffle
//   POST /users/raffle   { hour, seatId }

import { API_URL } from './config'
import { getAccessToken } from './authApi'

export type RaffleSeat = {
  id: string
  names: string[]
  yours: boolean
  rivalName: string | null
  yourHour: number | null
  rivalHour: number | null
  agreedHour: number | null
  cleared: boolean
  counts: boolean
  blocked: number[]
  code: string | null
  codeUntil: number | null
  codeState: 'none' | 'waiting' | 'open' | 'closed'
  noShowNote: string | null
  games: string[]
  waitingGameId: string | null
  waitingName: string | null
  waitingUntil: number | null
  waitingYours: boolean
}

export type DailyRaffle = {
  day: string
  code: string
  youPlay: boolean
  youRest: boolean
  seats: RaffleSeat[]
  hours: number[]
}

export type RaffleResult =
  | { ok: true; raffle: DailyRaffle }
  | { ok: false; message: string }

const FALLBACK_HOURS = [15, 16, 17, 18, 19, 20, 21, 22, 23]

const readErrorMessage = async (response: Response): Promise<string> => {
  try {
    const body = (await response.json()) as { message?: unknown }
    if (typeof body.message === 'string' && body.message.length > 0) return body.message
  } catch {
    // Cuerpo vacío o no JSON.
  }
  return 'No se pudo cargar el sorteo de hoy.'
}

const readHour = (value: unknown): number | null => {
  if (typeof value === 'number' && Number.isFinite(value)) return value
  if (typeof value === 'string' && value.trim() !== '' && Number.isFinite(Number(value))) return Number(value)
  return null
}

const readSeat = (value: unknown): RaffleSeat | null => {
  if (!value || typeof value !== 'object') return null
  const seat = value as {
    id?: unknown
    names?: unknown
    yours?: unknown
    rivalName?: unknown
    yourHour?: unknown
    rivalHour?: unknown
    agreedHour?: unknown
    cleared?: unknown
    counts?: unknown
    blocked?: unknown
    code?: unknown
    codeUntil?: unknown
    codeState?: unknown
    noShowNote?: unknown
    games?: unknown
    waitingGameId?: unknown
    waitingName?: unknown
    waitingUntil?: unknown
    waitingYours?: unknown
  }
  if (typeof seat.id !== 'string' || !Array.isArray(seat.names)) return null
  const names = seat.names.filter((name) => typeof name === 'string')
  if (names.length < 2) return null
  return {
    id: seat.id,
    names,
    yours: seat.yours === true,
    rivalName: typeof seat.rivalName === 'string' ? seat.rivalName : null,
    yourHour: readHour(seat.yourHour),
    rivalHour: readHour(seat.rivalHour),
    agreedHour: readHour(seat.agreedHour),
    cleared: seat.cleared === true,
    counts: seat.counts !== false,
    blocked: Array.isArray(seat.blocked) ? seat.blocked.map(readHour).filter((hour) => hour !== null) : [],
    code: typeof seat.code === 'string' && seat.code.length > 0 ? seat.code : null,
    codeUntil: typeof seat.codeUntil === 'number' && Number.isFinite(seat.codeUntil) ? seat.codeUntil : null,
    codeState: seat.codeState === 'waiting' || seat.codeState === 'open' || seat.codeState === 'closed' ? seat.codeState : 'none',
    noShowNote: typeof seat.noShowNote === 'string' && seat.noShowNote.length > 0 ? seat.noShowNote : null,
    games: Array.isArray(seat.games) ? seat.games.filter((game) => typeof game === 'string') : [],
    waitingGameId: typeof seat.waitingGameId === 'string' && seat.waitingGameId.length > 0 ? seat.waitingGameId : null,
    waitingName: typeof seat.waitingName === 'string' && seat.waitingName.length > 0 ? seat.waitingName : null,
    waitingUntil: typeof seat.waitingUntil === 'number' && Number.isFinite(seat.waitingUntil) ? seat.waitingUntil : null,
    waitingYours: seat.waitingYours === true,
  }
}

const readRaffle = (value: unknown): DailyRaffle | null => {
  if (!value || typeof value !== 'object') return null
  const body = value as {
    day?: unknown
    code?: unknown
    youPlay?: unknown
    youRest?: unknown
    seats?: unknown
    hours?: unknown
  }
  if (typeof body.code !== 'string' || body.code.length === 0 || !Array.isArray(body.seats)) return null
  const seats = body.seats.map(readSeat).filter((seat) => seat !== null)
  if (seats.length === 0 && body.youRest !== true) return null
  const parsedHours = Array.isArray(body.hours) ? body.hours.map(readHour).filter((hour) => hour !== null) : []
  const youPlay = typeof body.youPlay === 'boolean' ? body.youPlay : seats.some((seat) => seat.yours)
  return {
    day: typeof body.day === 'string' ? body.day : '',
    code: body.code,
    youPlay,
    youRest: typeof body.youRest === 'boolean' ? body.youRest : !youPlay,
    seats,
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
    const response = await fetch(`${API_URL}/users/raffle`, {
      headers,
      cache: 'no-store',
      signal: AbortSignal.timeout(20000),
    })
    if (!response.ok) return { ok: false, message: await readErrorMessage(response) }
    const raffle = readRaffle(await response.json())
    if (!raffle) return { ok: false, message: 'El sorteo no tiene la forma esperada.' }
    return { ok: true, raffle }
  } catch (error) {
    if (error instanceof Error && (error.name === 'TimeoutError' || error.name === 'AbortError')) {
      return { ok: false, message: 'El sorteo está tardando. Se vuelve a intentar.' }
    }
    const message = error instanceof Error ? error.message : 'No se pudo conectar con el servidor.'
    return { ok: false, message }
  }
}

export const rejectRaffleHour = async (hour: number, seatId: string): Promise<RaffleResult> =>
  sendRaffleHour({ hour, seatId, reject: true })

export const chooseRaffleHour = async (hour: number, seatId: string): Promise<RaffleResult> =>
  sendRaffleHour({ hour, seatId })

const sendRaffleHour = async (body: { hour: number; seatId: string; reject?: boolean }): Promise<RaffleResult> => {
  const headers = authHeaders()
  if (!headers) return { ok: false, message: 'Sesión no válida o expirada.' }

  try {
    const response = await fetch(`${API_URL}/users/raffle`, {
      method: 'POST',
      cache: 'no-store',
      headers: { ...headers, 'Content-Type': 'application/json' },
      body: JSON.stringify(body),
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
