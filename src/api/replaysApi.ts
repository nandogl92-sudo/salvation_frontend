// Repeticiones de ranqueadas. Solo un administrador.
//   GET /matches/replays
//   GET /matches/:matchId/replay

import { API_URL } from './config'
import { getAccessToken } from './authApi'

export type ReplayPlayer = {
  userId: string
  username: string
  side: 'p1' | 'p2'
}

export type ReplayKeys = {
  p1: string[]
  p2: string[]
}

export type ReplayRally = {
  ballX: number
  ballY: number
  p1y: number
  p2y: number
  p1: number
  p2: number
}

export type ReplayUnit = {
  x: number
  y: number
  n: number
  a: number
  v?: number
}

export type ReplayItem = {
  x: number
  y: number
  w: number
  h: number
  k?: number
}

export type ReplayScene = {
  kind: 'rings' | 'race' | 'drop'
  winner: '' | 'p1' | 'p2' | 'draw'
  p1: ReplayUnit
  p2: ReplayUnit
  items: ReplayItem[]
}

export type ReplaySample = {
  at: number
  keys?: ReplayKeys
  rally?: ReplayRally
  scene?: ReplayScene
}

export type ReplayHead = {
  matchId: string
  gameId: string
  players: ReplayPlayer[]
  closed: boolean
  createdAt: string
  playedAt: string
  winnerName: string | null
  loserName: string | null
  outcome: 'decided' | 'refund' | 'open'
}

export type ReplayTape = ReplayHead & {
  samples: ReplaySample[]
  seed?: number
}

export type ReplayListResult =
  | { ok: true; replays: ReplayHead[] }
  | { ok: false; message: string }

export type ReplayTapeResult =
  | { ok: true; tape: ReplayTape }
  | { ok: false; message: string }

const readErrorMessage = async (response: Response): Promise<string> => {
  try {
    const body = (await response.json()) as { message?: unknown }
    if (typeof body.message === 'string' && body.message.length > 0) return body.message
  } catch {
    // Cuerpo vacío o no JSON.
  }
  return 'No se pudo cargar la repetición.'
}

const authHeaders = (): HeadersInit | null => {
  const token = getAccessToken()
  if (!token) return null
  return { Authorization: `Bearer ${token}` }
}

const readReplayHead = (value: unknown): ReplayHead | null => {
  if (!value || typeof value !== 'object') return null
  const row = value as {
    matchId?: unknown
    gameId?: unknown
    players?: unknown
    closed?: unknown
    createdAt?: unknown
    playedAt?: unknown
    winnerName?: unknown
    loserName?: unknown
    outcome?: unknown
  }
  if (typeof row.matchId !== 'string' || typeof row.gameId !== 'string' || !Array.isArray(row.players)) return null
  const createdAt = typeof row.createdAt === 'string' ? row.createdAt : ''
  const outcome = row.outcome === 'decided' || row.outcome === 'refund' || row.outcome === 'open' ? row.outcome : 'open'
  return {
    matchId: row.matchId,
    gameId: row.gameId,
    players: row.players as ReplayPlayer[],
    closed: row.closed === true,
    createdAt,
    playedAt: typeof row.playedAt === 'string' && row.playedAt.length > 0 ? row.playedAt : createdAt,
    winnerName: typeof row.winnerName === 'string' && row.winnerName.length > 0 ? row.winnerName : null,
    loserName: typeof row.loserName === 'string' && row.loserName.length > 0 ? row.loserName : null,
    outcome,
  }
}

export const listReplays = async (): Promise<ReplayListResult> => {
  const headers = authHeaders()
  if (!headers) return { ok: false, message: 'Sesión no válida o expirada.' }
  try {
    const response = await fetch(`${API_URL}/matches/replays`, { headers })
    if (!response.ok) return { ok: false, message: await readErrorMessage(response) }
    const body = (await response.json()) as unknown
    if (!Array.isArray(body)) return { ok: false, message: 'La lista de repeticiones no tiene la forma esperada.' }
    const replays = body.flatMap((item) => {
      const replay = readReplayHead(item)
      return replay ? [replay] : []
    })
    return { ok: true, replays }
  } catch (error) {
    const message = error instanceof Error ? error.message : 'No se pudo conectar con el servidor.'
    return { ok: false, message }
  }
}

export const getReplay = async (matchId: string): Promise<ReplayTapeResult> => {
  const headers = authHeaders()
  if (!headers) return { ok: false, message: 'Sesión no válida o expirada.' }
  try {
    const response = await fetch(`${API_URL}/matches/${matchId}/replay`, { headers })
    if (!response.ok) return { ok: false, message: await readErrorMessage(response) }
    const body = (await response.json()) as ReplayTape
    if (!body || !Array.isArray(body.samples)) {
      return { ok: false, message: 'La repetición no tiene la forma esperada.' }
    }
    return { ok: true, tape: body }
  } catch (error) {
    const message = error instanceof Error ? error.message : 'No se pudo conectar con el servidor.'
    return { ok: false, message }
  }
}
