// ==========================================
// Adaptador de matchmaking contra el backend Salvation.
//
// La UI sigue usando MatchTicket y MatchRecord. Este archivo traduce
// el JSON del API y adjunta el JWT de la sesión.
//
//   POST   /matchmaking/tickets
//   GET    /matchmaking/tickets/:ticketId
//   DELETE /matchmaking/tickets/:ticketId
//   POST   /matchmaking/tickets/:ticketId/bot-match
// ==========================================

import { API_URL } from './config'
import { getAccessToken } from './authApi'
import type { MatchPlayer, MatchRecord, MatchTicket } from '../types'

export type JoinQueueResult =
  | { ok: true; ticket: MatchTicket }
  | { ok: false; message: string }

export type RankedWorld = {
  seed: number
  startAt: number
  localSide?: 'p1' | 'p2'
}

export type QueuePoll =
  | { status: 'waiting' }
  | { status: 'matched'; match: MatchRecord; opponent: MatchPlayer; arenaOpen: boolean; world: RankedWorld | null }
  | { status: 'expired' }
  | { status: 'cancelled' }
  | { status: 'error'; message: string }

export type BotMatchResult =
  | { ok: true; match: MatchRecord; opponent: MatchPlayer }
  | { ok: false; message: string }

type ApiRival = {
  userId: string
  username: string
}

type ApiMatch = {
  id: string
  gameId: string
  betAmount: number
  players: ApiRival[]
  isBotMatch?: boolean
  createdAt?: string
}

type ApiTicket = {
  id: string
  userId: string
  username: string
  gameId: string
  betAmount: number
  createdAt: string
}

type ApiWorldPlayer = {
  userId: string
  username: string
  side: 'p1' | 'p2'
}

type ApiWorld = {
  seed: number
  startsAt: string
  you: ApiWorldPlayer
  rival: ApiWorldPlayer
}

type ApiPoll = {
  status: string
  match: ApiMatch | null
  rival: ApiRival | null
  arenaOpen?: boolean
  world?: ApiWorld | null
}

const logCall = (endpoint: string, status: number, startedAt: number) => {
  const latencyMs = Math.round(performance.now() - startedAt)
  console.info('[matchmaking]', { endpoint, status, latencyMs })
}

const readErrorMessage = async (response: Response): Promise<string> => {
  try {
    const body = (await response.json()) as { message?: unknown }
    if (typeof body.message === 'string' && body.message.length > 0) return body.message
  } catch {
    // 204 o cuerpo no JSON.
  }
  return 'No se pudo completar la búsqueda.'
}

const pollSignal = (ms: number): AbortSignal => {
  if (typeof AbortSignal !== 'undefined' && typeof AbortSignal.timeout === 'function') {
    return AbortSignal.timeout(ms)
  }
  const controller = new AbortController()
  window.setTimeout(() => controller.abort(), ms)
  return controller.signal
}

const request = async (path: string, init: RequestInit): Promise<Response> => {
  const token = getAccessToken()
  if (!token) {
    throw new Error('Sesión no válida o expirada.')
  }
  const headers = new Headers(init.headers)
  if (init.body) headers.set('Content-Type', 'application/json')
  headers.set('Authorization', `Bearer ${token}`)

  const startedAt = performance.now()
  const endpoint = `${init.method ?? 'GET'} ${path}`
  const response = await fetch(`${API_URL}${path}`, { ...init, headers })
  logCall(endpoint, response.status, startedAt)
  return response
}

const toPlayer = (rival: ApiRival, isBot: boolean): MatchPlayer => {
  return {
    ticketId: rival.userId,
    userId: rival.userId,
    username: rival.username,
    isBot,
  }
}

const isSide = (value: unknown): value is 'p1' | 'p2' => value === 'p1' || value === 'p2'

const readStartAt = (value: unknown): number => {
  if (typeof value === 'number' && Number.isFinite(value)) return value
  if (typeof value === 'string') return Date.parse(value)
  return Number.NaN
}

const readWorld = (value: unknown): RankedWorld | null => {
  if (!value || typeof value !== 'object') return null
  const world = value as ApiWorld
  if (typeof world.seed !== 'number' || !Number.isFinite(world.seed)) return null
  const startAt = readStartAt(world.startsAt)
  if (!Number.isFinite(startAt)) return null
  const localSide = world.you && isSide(world.you.side) ? world.you.side : undefined
  return { seed: world.seed, startAt, localSide }
}

const toMatchRecord = (match: ApiMatch, self: MatchPlayer): MatchRecord | null => {
  if (!Array.isArray(match.players) || match.players.length < 2) return null
  const players = match.players.map((player) =>
    toPlayer(player, Boolean(match.isBotMatch) && player.userId !== self.userId)
  )
  return {
    id: match.id,
    gameId: match.gameId,
    betAmount: match.betAmount,
    createdAt: match.createdAt ? Date.parse(match.createdAt) : Date.now(),
    players: [players[0], players[1]],
  }
}

const isApiTicket = (value: unknown): value is ApiTicket => {
  if (!value || typeof value !== 'object') return false
  const ticket = value as ApiTicket
  return (
    typeof ticket.id === 'string' &&
    typeof ticket.userId === 'string' &&
    typeof ticket.username === 'string' &&
    typeof ticket.gameId === 'string' &&
    typeof ticket.betAmount === 'number' &&
    typeof ticket.createdAt === 'string'
  )
}

export const joinQueue = async (input: {
  gameId: string
  betAmount: number
  ranked?: boolean
}): Promise<JoinQueueResult> => {
  try {
    const response = await request('/matchmaking/tickets', {
      method: 'POST',
      body: JSON.stringify({
        gameId: input.gameId,
        betAmount: input.betAmount,
        ranked: Boolean(input.ranked),
      }),
    })
    if (!response.ok) return { ok: false, message: await readErrorMessage(response) }

    const body = (await response.json()) as unknown
    if (!isApiTicket(body)) return { ok: false, message: 'La respuesta de la cola no tiene la forma esperada.' }

    return {
      ok: true,
      ticket: {
        id: body.id,
        userId: body.userId,
        username: body.username,
        gameId: body.gameId,
        betAmount: body.betAmount,
        createdAt: Date.parse(body.createdAt),
      },
    }
  } catch (error) {
    const message = error instanceof Error ? error.message : 'No se pudo conectar con el servidor.'
    return { ok: false, message }
  }
}

export const cancelQueue = async (ticketId: string): Promise<{ ok: boolean; message: string }> => {
  try {
    const response = await request(`/matchmaking/tickets/${ticketId}`, { method: 'DELETE' })
    if (response.status === 204 || response.ok) return { ok: true, message: '' }
    return { ok: false, message: await readErrorMessage(response) }
  } catch (error) {
    const message = error instanceof Error ? error.message : 'No se pudo cancelar la búsqueda.'
    return { ok: false, message }
  }
}

const readPoll = async (ticket: MatchTicket): Promise<QueuePoll> => {
  const response = await request(`/matchmaking/tickets/${ticket.id}`, {
    method: 'GET',
    signal: pollSignal(15_000),
  })
  if (response.status === 404) return { status: 'error', message: 'No existe esa búsqueda.' }
  if (!response.ok) return { status: 'error', message: await readErrorMessage(response) }

  const body = (await response.json()) as ApiPoll
  if (body.status === 'waiting') return { status: 'waiting' }
  if (body.status === 'expired') return { status: 'expired' }
  if (body.status === 'cancelled') return { status: 'cancelled' }
  if (body.status !== 'matched' || !body.match || !body.rival) {
    return { status: 'error', message: 'La respuesta de la cola no tiene la forma esperada.' }
  }

  const self: MatchPlayer = {
    ticketId: ticket.id,
    userId: ticket.userId,
    username: ticket.username,
  }
  const match = toMatchRecord(body.match, self)
  if (!match) return { status: 'error', message: 'La partida no incluye a los dos jugadores.' }

  const world = readWorld(body.world)
  return {
    status: 'matched',
    match,
    opponent: toPlayer(body.rival, Boolean(body.match.isBotMatch)),
    arenaOpen: body.arenaOpen === true || world !== null,
    world,
  }
}

const isAbortError = (error: unknown): boolean => {
  if (!(error instanceof Error)) return false
  const name = error.name.toLowerCase()
  const message = error.message.toLowerCase()
  return name === 'aborterror' || message.includes('abort') || message.includes('timed out')
}

export const tryMatch = async (ticket: MatchTicket): Promise<QueuePoll> => {
  try {
    return await readPoll(ticket)
  } catch (error) {
    if (isAbortError(error)) return { status: 'waiting' }
    const message = error instanceof Error ? error.message : 'No se pudo consultar la búsqueda.'
    return { status: 'error', message }
  }
}

export const startDirectMatch = async (input: {
  gameId: string
  betAmount: number
  rivalUserId: string
}): Promise<BotMatchResult> => {
  try {
    const response = await request('/matches', {
      method: 'POST',
      body: JSON.stringify({
        gameId: input.gameId,
        betAmount: input.betAmount,
        rivalUserId: input.rivalUserId,
      }),
    })
    if (!response.ok) return { ok: false, message: await readErrorMessage(response) }

    const body = (await response.json()) as ApiPoll
    if (!body.match || !body.rival) {
      return { ok: false, message: 'La respuesta de la partida no tiene la forma esperada.' }
    }

    const self: MatchPlayer = {
      ticketId: body.match.id,
      userId: '',
      username: '',
    }
    const match = toMatchRecord(body.match, self)
    if (!match) return { ok: false, message: 'La partida no incluye a los dos jugadores.' }

    return { ok: true, match, opponent: toPlayer(body.rival, false) }
  } catch (error) {
    const message = error instanceof Error ? error.message : 'No se pudo empezar la partida.'
    return { ok: false, message }
  }
}

export const createBotMatch = async (ticket: MatchTicket): Promise<BotMatchResult> => {
  try {
    const response = await request(`/matchmaking/tickets/${ticket.id}/bot-match`, { method: 'POST' })
    if (!response.ok) return { ok: false, message: await readErrorMessage(response) }

    const body = (await response.json()) as ApiPoll
    if (!body.match || !body.rival) {
      return { ok: false, message: 'La respuesta del bot no tiene la forma esperada.' }
    }

    const self: MatchPlayer = {
      ticketId: ticket.id,
      userId: ticket.userId,
      username: ticket.username,
    }
    const match = toMatchRecord(body.match, self)
    if (!match) return { ok: false, message: 'La partida contra el bot no incluye a los dos jugadores.' }

    return { ok: true, match, opponent: toPlayer(body.rival, true) }
  } catch (error) {
    const message = error instanceof Error ? error.message : 'No se pudo crear la partida contra el bot.'
    return { ok: false, message }
  }
}
