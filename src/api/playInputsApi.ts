import { API_URL } from './config'
import { getAccessToken } from './authApi'

export type RemotePad = {
  userId: string
  keys: string[]
  at: number
  y: number | null
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
): Promise<RemotePad[]> => {
  const response = await request(`/matches/${matchId}/inputs`, {
    method: 'PUT',
    body: JSON.stringify({ keys, y }),
  })
  return readPads(response)
}

export const getMatchInputs = async (matchId: string): Promise<RemotePad[]> => {
  const response = await request(`/matches/${matchId}/inputs`, { method: 'GET' })
  return readPads(response)
}
