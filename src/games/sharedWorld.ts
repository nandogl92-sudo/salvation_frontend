export type SharedWorld = {
  matchId: string
  localUserId: string
  seed: number
  startAt: number
  localSide: 'p1' | 'p2'
  youName: string
  rivalName: string
}

const COUNTDOWN_MS = 10_000

export const hashSeed = (text: string): number => {
  let hash = 2166136261
  for (let i = 0; i < text.length; i += 1) {
    hash ^= text.charCodeAt(i)
    hash = Math.imul(hash, 16777619)
  }
  return hash >>> 0
}

export const makeRng = (seed: number): (() => number) => {
  let value = seed >>> 0
  return () => {
    value = (value + 0x6d2b79f5) >>> 0
    let t = Math.imul(value ^ (value >>> 15), 1 | value)
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296
  }
}

export const buildSharedWorld = (input: {
  matchId: string
  localUserId: string
  youName: string
  rivalName: string
  seed?: number
  startAt?: number
  localSide?: 'p1' | 'p2'
  rivalUserId?: string
  createdAt?: number
}): SharedWorld => {
  const createdAt = Number.isFinite(input.createdAt) ? (input.createdAt as number) : Date.now()
  const startAt = Number.isFinite(input.startAt) ? (input.startAt as number) : createdAt + COUNTDOWN_MS
  const localSide =
    input.localUserId && input.rivalUserId
      ? input.localUserId < input.rivalUserId
        ? 'p1'
        : 'p2'
      : input.localSide === 'p1' || input.localSide === 'p2'
        ? input.localSide
        : 'p1'
  const seed = Number.isFinite(input.seed) ? (input.seed as number) : hashSeed(input.matchId)
  return {
    matchId: input.matchId,
    localUserId: input.localUserId,
    seed,
    startAt,
    localSide,
    youName: input.youName,
    rivalName: input.rivalName,
  }
}

export const rankedCountdown = (startAt: number, now = Date.now()): string | null => {
  const left = startAt - now
  if (left <= 0) return null
  return String(Math.max(1, Math.ceil(left / 1000)))
}

export const sideLabel = (world: SharedWorld | null | undefined, side: 'p1' | 'p2', fallback: string): string => {
  if (!world) return fallback
  if (world.localSide === side) return 'TU'
  const name = world.rivalName.trim()
  return name.length > 0 ? name.slice(0, 10).toUpperCase() : 'RIVAL'
}
