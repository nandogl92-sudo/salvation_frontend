import { getMatchInputs, putMatchInputs, type RemotePad, type RemotePose } from '../api/playInputsApi'

/** Latido si no cambia el pad. Un toque se envía al momento. */
const HEARTBEAT_MS = 40
const POLL_MS = 40
const INTERP_DELAY_MS = 60
const MAX_EXTRAPOLATE_MS = 50
const FRAME_MS = 1000 / 60

export type WorldSnap = RemotePose & {
  y: number
  receivedAt: number
}

export type LiveInputLink = {
  setLocalKeys: (keys: Record<string, boolean>, y?: number, pose?: RemotePose | null) => void
  readRivalKeys: () => Record<string, boolean>
  readRivalY: () => number | null
  readRivalSnap: () => WorldSnap | null
  stop: () => void
}

type TimedY = { at: number; y: number }

const packKeys = (keys: Record<string, boolean>): string[] => {
  const out: string[] = []
  if (keys.w || keys.W) out.push('w')
  if (keys.a || keys.A) out.push('a')
  if (keys.s || keys.S) out.push('s')
  if (keys.d || keys.D) out.push('d')
  if (keys[' '] || keys.Space) out.push(' ')
  if (keys.Enter) out.push('Enter')
  if (keys.ArrowUp) out.push('ArrowUp')
  if (keys.ArrowDown) out.push('ArrowDown')
  if (keys.ArrowLeft) out.push('ArrowLeft')
  if (keys.ArrowRight) out.push('ArrowRight')
  return out
}

const mergeKeys = (held: string[], extra: string[]): string[] => {
  const seen = new Set(held)
  const out = [...held]
  extra.forEach((key) => {
    if (seen.has(key)) return
    seen.add(key)
    out.push(key)
  })
  return out
}

const signatureOf = (keys: string[], y: number | null): string =>
  `${[...keys].sort().join('\0')}:${Math.round((y ?? 0) / 12)}`

const unpackKeys = (keys: string[]): Record<string, boolean> => {
  const held: Record<string, boolean> = {}
  keys.forEach((key) => {
    held[key] = true
    if (key === ' ') held.Space = true
  })
  return held
}

const lerp = (from: number, to: number, t: number): number => from + (to - from) * t

const pushSample = <T extends { receivedAt?: number; at?: number }>(buffer: T[], item: T): void => {
  const at = 'receivedAt' in item && typeof item.receivedAt === 'number' ? item.receivedAt : (item as { at: number }).at
  const last = buffer[buffer.length - 1]
  const lastAt = last
    ? 'receivedAt' in last && typeof last.receivedAt === 'number'
      ? last.receivedAt
      : (last as { at: number }).at
    : -1
  if (at <= lastAt) return
  buffer.push(item)
  if (buffer.length > 10) buffer.shift()
}

const around = <T extends { receivedAt?: number; at?: number }>(
  buffer: T[],
  time: number,
): { a: T; b: T | null; t: number } | null => {
  if (buffer.length === 0) return null
  const stamp = (item: T): number =>
    'receivedAt' in item && typeof item.receivedAt === 'number' ? item.receivedAt : (item as { at: number }).at
  if (time <= stamp(buffer[0])) return { a: buffer[0], b: buffer[1] ?? null, t: 0 }
  for (let i = 0; i < buffer.length - 1; i += 1) {
    const start = stamp(buffer[i])
    const end = stamp(buffer[i + 1])
    if (time >= start && time <= end) {
      const span = end - start
      return { a: buffer[i], b: buffer[i + 1], t: span <= 0 ? 1 : (time - start) / span }
    }
  }
  return { a: buffer[buffer.length - 1], b: null, t: time - stamp(buffer[buffer.length - 1]) }
}

export const keyHeld = (keys: Record<string, boolean>, ...names: string[]): boolean =>
  names.some((name) => Boolean(keys[name]))

export const otherSide = (side: 'p1' | 'p2'): 'p1' | 'p2' => (side === 'p1' ? 'p2' : 'p1')

export const startLiveInputs = (matchId: string, localUserId: string): LiveInputLink => {
  let localKeys: Record<string, boolean> = {}
  let localY: number | null = null
  let localPose: RemotePose | null = null
  let rivalKeys: Record<string, boolean> = {}
  let lastRivalAt = 0
  const rivalYs: TimedY[] = []
  const rivalSnaps: WorldSnap[] = []
  let pendingPulses: string[] = []
  let stopped = false
  let inFlight = false
  let dirty = false
  let lastHeldSig = ''
  let timer = 0
  let pollTimer = 0

  const applyPads = (pads: RemotePad[]) => {
    const rival = pads.find((pad) => pad.userId !== localUserId)
    if (!rival || rival.at <= 0 || rival.at <= lastRivalAt) return
    lastRivalAt = rival.at
    rivalKeys = unpackKeys(rival.keys)
    const receivedAt = performance.now()
    if (typeof rival.y === 'number') pushSample(rivalYs, { at: receivedAt, y: rival.y })
    if (rival.pose && typeof rival.y === 'number') {
      pushSample(rivalSnaps, { ...rival.pose, y: rival.y, receivedAt })
    }
  }

  const flush = async () => {
    if (stopped || inFlight) {
      dirty = true
      return
    }
    inFlight = true
    window.clearTimeout(timer)
    const held = packKeys(localKeys)
    const keys = mergeKeys(held, pendingPulses)
    pendingPulses = []
    lastHeldSig = signatureOf(held, localY)
    const pads = await putMatchInputs(matchId, keys, localY, localPose)
    inFlight = false
    applyPads(pads)
    if (stopped) return
    const heldNow = signatureOf(packKeys(localKeys), localY)
    if (dirty || pendingPulses.length > 0 || heldNow !== lastHeldSig) {
      dirty = false
      void flush()
      return
    }
    timer = window.setTimeout(() => {
      void flush()
    }, HEARTBEAT_MS)
  }

  const pull = async () => {
    if (stopped) return
    const pads = await getMatchInputs(matchId)
    applyPads(pads)
    pollTimer = window.setTimeout(() => {
      void pull()
    }, POLL_MS)
  }

  void flush()
  void pull()

  return {
    setLocalKeys: (keys, y, pose) => {
      localKeys = keys
      if (typeof y === 'number') localY = y
      if (pose) localPose = pose
      const held = packKeys(keys)
      const sig = signatureOf(held, localY)
      if (sig === lastHeldSig) return
      pendingPulses = mergeKeys(pendingPulses, held)
      void flush()
    },
    readRivalKeys: () => rivalKeys,
    readRivalY: () => {
      const pair = around(rivalYs, performance.now() - INTERP_DELAY_MS)
      if (!pair) return null
      if (pair.b) return lerp(pair.a.y, pair.b.y, pair.t)
      const prev = rivalYs[rivalYs.length - 2]
      if (!prev) return pair.a.y
      const span = pair.a.at - prev.at
      if (span <= 0) return pair.a.y
      const extra = Math.min(MAX_EXTRAPOLATE_MS, Math.max(0, pair.t))
      return pair.a.y + ((pair.a.y - prev.y) / span) * extra
    },
    readRivalSnap: () => {
      const pair = around(rivalSnaps, performance.now() - INTERP_DELAY_MS)
      if (!pair) return null
      if (pair.b) {
        return {
          y: lerp(pair.a.y, pair.b.y, pair.t),
          ballX: lerp(pair.a.ballX, pair.b.ballX, pair.t),
          ballY: lerp(pair.a.ballY, pair.b.ballY, pair.t),
          ballVx: pair.b.ballVx,
          ballVy: pair.b.ballVy,
          p1: pair.b.p1,
          p2: pair.b.p2,
          receivedAt: pair.b.receivedAt,
        }
      }
      const extra = Math.min(MAX_EXTRAPOLATE_MS, Math.max(0, pair.t)) / FRAME_MS
      return {
        ...pair.a,
        ballX: pair.a.ballX + pair.a.ballVx * extra,
        ballY: pair.a.ballY + pair.a.ballVy * extra,
      }
    },
    stop: () => {
      stopped = true
      window.clearTimeout(timer)
      window.clearTimeout(pollTimer)
      void putMatchInputs(matchId, packKeys(localKeys), localY, localPose)
    },
  }
}
