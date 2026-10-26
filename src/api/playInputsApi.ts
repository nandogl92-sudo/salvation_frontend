import { API_URL } from './config'
import { getAccessToken } from './authApi'

export type RemotePose = {
  ballX: number
  ballY: number
  ballVx: number
  ballVy: number
  p1: number
  p2: number
}

export type RemotePad = {
  userId: string
  keys: string[]
  at: number
  y: number | null
  pose: RemotePose | null
}

const request = async (path: string, init: RequestInit): Promise<Response | null> => {
  const token = getAccessToken()
  if (!token) return null
  const headers = new Headers(init.headers)
  if (init.body) headers.set('Content-Type', 'application/json')
  headers.set('Authorization', `Bearer ${token}`)
  try {
    return await fetch(`${API_URL}${path}`, { ...init, headers })
  } catch {
    return null
  }
}

const readY = (value: unknown): number | null => {
  if (typeof value !== 'number' || !Number.isFinite(value)) return null
  return value
}

const readPose = (value: unknown): RemotePose | null => {
  if (!value || typeof value !== 'object') return null
  const body = value as Record<string, unknown>
  if (
    typeof body.ballX !== 'number' ||
    typeof body.ballY !== 'number' ||
    typeof body.ballVx !== 'number' ||
    typeof body.ballVy !== 'number' ||
    typeof body.p1 !== 'number' ||
    typeof body.p2 !== 'number'
  ) {
    return null
  }
  return {
    ballX: body.ballX,
    ballY: body.ballY,
    ballVx: body.ballVx,
    ballVy: body.ballVy,
    p1: body.p1,
    p2: body.p2,
  }
}

const readPads = async (response: Response | null): Promise<RemotePad[]> => {
  if (!response || !response.ok) return []
  try {
    const body = (await response.json()) as { players?: unknown }
    if (!Array.isArray(body.players)) return []
    return body.players.flatMap((item) => {
      if (!item || typeof item !== 'object') return []
      const pad = item as RemotePad
      if (typeof pad.userId !== 'string' || !Array.isArray(pad.keys) || typeof pad.at !== 'number') return []
      return [{
        userId: pad.userId,
        keys: pad.keys.filter((key) => typeof key === 'string'),
        at: pad.at,
        y: readY(pad.y),
        pose: readPose(pad.pose),
      }]
    })
  } catch {
    return []
  }
}

export const putMatchInputs = async (
  matchId: string,
  keys: string[],
  y: number | null = null,
  pose: RemotePose | null = null,
): Promise<RemotePad[]> => {
  const response = await request(`/matches/${matchId}/inputs`, {
    method: 'PUT',
    body: JSON.stringify({ keys, y, pose }),
  })
  return readPads(response)
}

export const getMatchInputs = async (matchId: string): Promise<RemotePad[]> => {
  const response = await request(`/matches/${matchId}/inputs`, { method: 'GET' })
  return readPads(response)
}
