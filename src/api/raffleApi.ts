// Sorteo del día. El código es el mismo para todas las cuentas.
//   GET /users/raffle

import { API_URL } from './config'
import { getAccessToken } from './authApi'

export type DailyRaffle = {
  day: string
  code: string
  winnerId: string
  winnerName: string
  youWon: boolean
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

const isRaffle = (value: unknown): value is DailyRaffle => {
  if (!value || typeof value !== 'object') return false
  const raffle = value as DailyRaffle
  return (
    typeof raffle.day === 'string' &&
    typeof raffle.code === 'string' &&
    typeof raffle.winnerId === 'string' &&
    typeof raffle.winnerName === 'string' &&
    typeof raffle.youWon === 'boolean'
  )
}

export const getTodayRaffle = async (): Promise<RaffleResult> => {
  const token = getAccessToken()
  if (!token) return { ok: false, message: 'Sesión no válida o expirada.' }

  try {
    const response = await fetch(`${API_URL}/users/raffle`, {
      headers: { Authorization: `Bearer ${token}` },
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
