// Suscripción mensual: al pagarla, la cuenta recibe 100 fichas para jugar.
//   POST /purchases   { euros: 10 }
//
// Las fichas solo cambian si la sesión del servidor las refleja.
// Si la ruta no existe o el saldo no sube, la cuenta local no se toca.

import { API_URL } from './config'
import { getAccessToken, getCurrentSession } from './authApi'
import type { UserProfile } from '../types'

export const SUBSCRIPTION_EUROS = 10
export const SUBSCRIPTION_POINTS = 100

export const currentSubscriptionMonth = (): string => {
  const now = new Date()
  const month = String(now.getMonth() + 1).padStart(2, '0')
  return `${now.getFullYear()}-${month}`
}

export const isCurrentSubscriptionMonth = (subscriptionMonth: string | null | undefined): boolean => {
  return subscriptionMonth === currentSubscriptionMonth()
}

/** Nombre del mes en curso, por ejemplo "octubre 2026". */
export const currentMonthLabel = (): string => {
  const key = currentSubscriptionMonth()
  const year = Number(key.slice(0, 4))
  const month = Number(key.slice(5, 7))
  if (!Number.isFinite(year) || !Number.isFinite(month) || month < 1 || month > 12) return key
  const monthName = new Date(year, month - 1, 1).toLocaleDateString('es-ES', { month: 'long' })
  return `${monthName} ${year}`
}

export type SubscriptionResult =
  | { ok: true; balance: number }
  | { ok: false; message: string }

const readErrorMessage = async (response: Response): Promise<string> => {
  try {
    const body = (await response.json()) as { message?: unknown }
    if (typeof body.message === 'string' && body.message.length > 0) return body.message
  } catch {
    // HTML de una ruta inexistente, o cuerpo vacío.
  }
  if (response.status === 404) {
    return 'El servidor todavía no permite la suscripción mensual. Tus fichas no han cambiado.'
  }
  return 'No se pudo activar la suscripción. Tus fichas no han cambiado.'
}

const readBalance = (value: unknown): number | null => {
  if (!value || typeof value !== 'object') return null
  const record = value as { balance?: unknown; user?: unknown }
  if (typeof record.balance === 'number') return record.balance
  if (record.user && typeof record.user === 'object') {
    const user = record.user as UserProfile
    if (typeof user.balance === 'number') return user.balance
  }
  return null
}

export const subscribeMonthly = async (
  balanceBefore: number,
  subscriptionMonth: string | null | undefined,
): Promise<SubscriptionResult> => {
  if (isCurrentSubscriptionMonth(subscriptionMonth)) {
    return { ok: false, message: 'La suscripción de este mes ya está pagada. Tus fichas no han cambiado.' }
  }

  const token = getAccessToken()
  if (!token) return { ok: false, message: 'Sesión no válida o expirada.' }

  try {
    const response = await fetch(`${API_URL}/purchases`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${token}`,
      },
      body: JSON.stringify({ euros: SUBSCRIPTION_EUROS }),
    })
    if (!response.ok) return { ok: false, message: await readErrorMessage(response) }

    const session = await getCurrentSession()
    const confirmed = session?.user.balance
    const fromBody = readBalance(await response.json().catch(() => null))
    const balance = typeof confirmed === 'number' ? confirmed : fromBody

    if (typeof balance !== 'number' || balance < balanceBefore + SUBSCRIPTION_POINTS) {
      return { ok: false, message: 'La suscripción no se guardó en la cuenta. Tus fichas no han cambiado.' }
    }
    return { ok: true, balance }
  } catch (error) {
    const message = error instanceof Error ? error.message : 'No se pudo conectar con el servidor.'
    return { ok: false, message: `${message} Tus fichas no han cambiado.` }
  }
}
