// Lista pública de cuentas. Pide sesión.
//   GET /users

import { API_URL } from './config'
import { getAccessToken } from './authApi'
import { monthPointsOf, weeksOf } from '../components/utils/monthPointsOf'
import type { UserProfile } from '../types'

export type UsersResult =
  | { ok: true; users: UserProfile[] }
  | { ok: false; message: string }

const isUserProfile = (value: unknown): value is UserProfile => {
  if (!value || typeof value !== 'object') return false
  const user = value as UserProfile
  return (
    typeof user.id === 'string' &&
    typeof user.username === 'string' &&
    typeof user.email === 'string' &&
    typeof user.balance === 'number'
  )
}

const readErrorMessage = async (response: Response): Promise<string> => {
  try {
    const body = (await response.json()) as { message?: unknown }
    if (typeof body.message === 'string' && body.message.length > 0) return body.message
  } catch {
    // Cuerpo vacío o no JSON.
  }
  return 'No se pudo cargar la clasificación.'
}

export const listUsers = async (): Promise<UsersResult> => {
  const token = getAccessToken()
  if (!token) return { ok: false, message: 'Sesión no válida o expirada.' }

  try {
    const response = await fetch(`${API_URL}/users`, {
      headers: { Authorization: `Bearer ${token}` },
    })
    if (!response.ok) return { ok: false, message: await readErrorMessage(response) }

    const body = (await response.json()) as unknown
    if (!Array.isArray(body) || !body.every(isUserProfile)) {
      return { ok: false, message: 'La lista de jugadores no tiene la forma esperada.' }
    }
    const users = body.map((user) => {
      const role = user.tiebreakRole
      const tiebreakRole = role === 'champion' || role === 'alive' || role === 'out' ? role : null
      return { ...user, monthPoints: monthPointsOf(user), weeks: weeksOf(user.weeks), tiebreakRole }
    })
    return { ok: true, users }
  } catch (error) {
    const message = error instanceof Error ? error.message : 'No se pudo conectar con el servidor.'
    return { ok: false, message }
  }
}

export type GamesAccessResult =
  | { ok: true; user: UserProfile }
  | { ok: false; message: string }

/** Marca o quita el pago. Solo un administrador. No cambia fichas ni puntos del mes. */
export const setGamesAccess = async (userId: string, gamesAccess: boolean): Promise<GamesAccessResult> => {
  const token = getAccessToken()
  if (!token) return { ok: false, message: 'Sesión no válida o expirada.' }

  try {
    const response = await fetch(`${API_URL}/users/${userId}/games-access`, {
      method: 'PATCH',
      headers: {
        Authorization: `Bearer ${token}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ gamesAccess }),
    })
    if (!response.ok) return { ok: false, message: await readErrorMessage(response) }

    const body = (await response.json()) as unknown
    if (!isUserProfile(body)) return { ok: false, message: 'El perfil no tiene la forma esperada.' }
    return { ok: true, user: { ...body, monthPoints: monthPointsOf(body), weeks: weeksOf(body.weeks) } }
  } catch (error) {
    const message = error instanceof Error ? error.message : 'No se pudo conectar con el servidor.'
    return { ok: false, message }
  }
}
