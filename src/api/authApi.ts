// ==========================================
// Adaptador de autenticación contra el backend Salvation.
//
// AuthContext solo conoce estas funciones. El mock de src/auth/authService.ts
// ya no se usa desde la UI.
//
// Rutas reales (docs/backend/FRONTEND_INTEGRATION.md):
//   POST   /users
//   POST   /auth/sessions
//   GET    /auth/sessions/current
//   DELETE /auth/sessions/current
//
// updateUserBalance no llama a la API: el backend ignora el saldo en
// PATCH /users/:id. El caché local solo mantiene la navbar hasta que
// matchmaking e historial hablen con el servidor.
// ==========================================

import { API_URL } from './config'
import type { AuthResult, AuthSession, LoginInput, RegisterInput, UserProfile } from '../types'

const SESSION_KEY = 'betplay.api.session'

type StoredApiSession = {
  token: string
  user: UserProfile
}

type AuthPayload = {
  token: string
  user: UserProfile
}

const isBrowser = (): boolean => {
  return typeof window !== 'undefined' && typeof window.localStorage !== 'undefined'
}

export const getAccessToken = (): string | null => {
  return loadStoredSession()?.token ?? null
}

const loadStoredSession = (): StoredApiSession | null => {
  if (!isBrowser()) return null
  try {
    const raw = window.localStorage.getItem(SESSION_KEY)
    if (!raw) return null
    const parsed = JSON.parse(raw) as StoredApiSession
    if (!parsed || typeof parsed.token !== 'string' || !parsed.user) return null
    return parsed
  } catch {
    return null
  }
}

const saveStoredSession = (session: StoredApiSession): void => {
  if (!isBrowser()) return
  window.localStorage.setItem(SESSION_KEY, JSON.stringify(session))
}

const clearStoredSession = (): void => {
  if (!isBrowser()) return
  window.localStorage.removeItem(SESSION_KEY)
}

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
    // Cuerpo vacío (204) o no JSON.
  }
  return 'No se pudo completar la solicitud.'
}

const request = async (path: string, init: RequestInit, token?: string): Promise<Response> => {
  const headers = new Headers(init.headers)
  if (init.body) headers.set('Content-Type', 'application/json')
  if (token) headers.set('Authorization', `Bearer ${token}`)

  return fetch(`${API_URL}${path}`, { ...init, headers })
}

const toFailure = (message: string): AuthResult => {
  return { ok: false, message }
}

const persistAuthPayload = (payload: AuthPayload): AuthResult => {
  const session: AuthSession = { token: payload.token, user: payload.user }
  saveStoredSession(session)
  return { ok: true, session }
}

const normalizeEmail = (email: string): string => {
  return email.trim().toLowerCase()
}

export const register = async (input: RegisterInput): Promise<AuthResult> => {
  if (input.password !== input.confirmPassword) {
    return toFailure('Las contraseñas no coinciden.')
  }

  try {
    const response = await request('/users', {
      method: 'POST',
      body: JSON.stringify({
        username: input.username.trim(),
        email: normalizeEmail(input.email),
        password: input.password,
      }),
    })

    if (!response.ok) return toFailure(await readErrorMessage(response))

    const payload = (await response.json()) as AuthPayload
    if (!payload.token || !isUserProfile(payload.user)) {
      return toFailure('La respuesta de registro no tiene la forma esperada.')
    }
    return persistAuthPayload(payload)
  } catch (error) {
    const message = error instanceof Error ? error.message : 'No se pudo conectar con el servidor.'
    return toFailure(message)
  }
}

export const login = async (input: LoginInput): Promise<AuthResult> => {
  try {
    const response = await request('/auth/sessions', {
      method: 'POST',
      body: JSON.stringify({
        email: normalizeEmail(input.email),
        password: input.password,
      }),
    })

    if (!response.ok) return toFailure(await readErrorMessage(response))

    const payload = (await response.json()) as AuthPayload
    if (!payload.token || !isUserProfile(payload.user)) {
      return toFailure('La respuesta de login no tiene la forma esperada.')
    }
    return persistAuthPayload(payload)
  } catch (error) {
    const message = error instanceof Error ? error.message : 'No se pudo conectar con el servidor.'
    return toFailure(message)
  }
}

export type PasswordResetRequestResult =
  | { ok: true }
  | { ok: false; message: string }

const readResetError = async (response: Response): Promise<string> => {
  try {
    const body = (await response.json()) as { message?: unknown }
    if (typeof body.message === 'string' && body.message.length > 0) {
      return `${body.message} Tu acceso no ha cambiado.`
    }
  } catch {
    // HTML de una ruta inexistente, o cuerpo vacío.
  }
  if (response.status === 404) {
    return 'El servidor todavía no permite recuperar la contraseña. Tu acceso no ha cambiado.'
  }
  return 'No se pudo pedir la recuperación. Tu acceso no ha cambiado.'
}

/** Pide el enlace de cambio de contraseña. No guarda sesión ni cambia la contraseña. */
export const requestPasswordReset = async (email: string): Promise<PasswordResetRequestResult> => {
  try {
    const response = await request('/auth/password-resets', {
      method: 'POST',
      body: JSON.stringify({ email: normalizeEmail(email) }),
    })
    if (response.ok) return { ok: true }
    return { ok: false, message: await readResetError(response) }
  } catch (error) {
    const message = error instanceof Error ? error.message : 'No se pudo conectar con el servidor.'
    return { ok: false, message: `${message} Tu acceso no ha cambiado.` }
  }
}

export type PasswordChangeInput = {
  token: string
  password: string
  passwordConfirmation: string
}

/** Guarda la contraseña nueva usando el token del enlace del correo y abre sesión. */
export const completePasswordReset = async (input: PasswordChangeInput): Promise<AuthResult> => {
  if (input.password !== input.passwordConfirmation) {
    return toFailure('La contraseña nueva y su confirmación no coinciden.')
  }

  try {
    const response = await request('/auth/password-resets', {
      method: 'PATCH',
      body: JSON.stringify({
        token: input.token,
        password: input.password,
        passwordConfirmation: input.passwordConfirmation,
      }),
    })

    if (!response.ok) return toFailure(await readErrorMessage(response))

    const payload = (await response.json()) as AuthPayload
    if (!payload.token || !isUserProfile(payload.user)) {
      return toFailure('La respuesta de cambio de contraseña no tiene la forma esperada.')
    }
    return persistAuthPayload(payload)
  } catch (error) {
    const message = error instanceof Error ? error.message : 'No se pudo conectar con el servidor.'
    return toFailure(message)
  }
}

export const logout = async (): Promise<void> => {
  const stored = loadStoredSession()
  try {
    if (stored) {
      await request('/auth/sessions/current', { method: 'DELETE' }, stored.token)
    }
  } catch {
    // Si el servidor no responde, igual cerramos la sesión local.
  }
  clearStoredSession()
}

export const getCurrentSession = async (): Promise<AuthSession | null> => {
  const stored = loadStoredSession()
  if (!stored) return null

  try {
    const response = await request('/auth/sessions/current', { method: 'GET' }, stored.token)
    if (response.status === 401) {
      clearStoredSession()
      return null
    }
    if (!response.ok) return stored

    const body = (await response.json()) as { user?: unknown }
    if (!isUserProfile(body.user)) return stored

    const session: AuthSession = { token: stored.token, user: body.user }
    saveStoredSession(session)
    return session
  } catch {
    return stored
  }
}

/**
 * No llama al backend. PATCH /users/:id ignora `balance`.
 * Solo actualiza el perfil cacheado para que la UI no pierda el saldo
 * hasta que el módulo de partidas use el servidor.
 */
export const updateUserBalance = async (userId: string, balance: number): Promise<UserProfile | null> => {
  const stored = loadStoredSession()
  if (!stored || stored.user.id !== userId) return null

  const user: UserProfile = { ...stored.user, balance }
  saveStoredSession({ token: stored.token, user })
  return user
}
