import { getMatchInputs, openMatchLive, putMatchInputs, type RemotePad, type RemotePose } from '../api/playInputsApi'

const HEARTBEAT_MS = 16
const MAX_PREDICT_MS = 80
const MAX_PADDLE_VY = 0.55

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
  `${[...keys].sort().join('\0')}:${Math.round((y ?? 0) / 2)}`

const unpackKeys = (keys: string[]): Record<string, boolean> => {
  const held: Record<string, boolean> = {}
  keys.forEach((key) => {
    held[key] = true
    if (key === ' ') held.Space = true
  })
  return held
}

export const keyHeld = (keys: Record<string, boolean>, ...names: string[]): boolean =>
  names.some((name) => Boolean(keys[name]))

export const otherSide = (side: 'p1' | 'p2'): 'p1' | 'p2' => (side === 'p1' ? 'p2' : 'p1')

export const startLiveInputs = (matchId: string, localUserId: string): LiveInputLink => {
  let localKeys: Record<string, boolean> = {}
  let localY: number | null = null
  let localPose: RemotePose | null = null
  let rivalKeys: Record<string, boolean> = {}
  let rivalY: number | null = null
  let rivalYAt = 0
  let rivalVy = 0
  let rivalSnap: WorldSnap | null = null
  let lastRivalAt = 0
  let pendingPulses: string[] = []
  let stopped = false
  let inFlight = 0
  let dirty = false
  let lastHeldSig = ''
  let timer = 0
  let pollTimer = 0
  let liveReady = false
  const liveAbort = new AbortController()

  const applyPads = (pads: RemotePad[]) => {
    const rival = pads.find((pad) => pad.userId !== localUserId)
    if (!rival || rival.at <= 0 || rival.at <= lastRivalAt) return
    lastRivalAt = rival.at
    rivalKeys = unpackKeys(rival.keys)
    const now = performance.now()
    if (typeof rival.y === 'number') {
      if (rivalY !== null) {
        const dt = now - rivalYAt
        if (dt > 0) {
          const nextVy = (rival.y - rivalY) / dt
          rivalVy = Math.max(-MAX_PADDLE_VY, Math.min(MAX_PADDLE_VY, nextVy))
        }
      }
      rivalY = rival.y
      rivalYAt = now
    }
    if (rival.pose && typeof rival.y === 'number') {
      rivalSnap = { ...rival.pose, y: rival.y, receivedAt: now }
    }
  }

  const flush = () => {
    if (stopped || inFlight >= 2) {
      dirty = true
      return
    }
    window.clearTimeout(timer)
    const held = packKeys(localKeys)
    const keys = mergeKeys(held, pendingPulses)
    pendingPulses = []
    lastHeldSig = signatureOf(held, localY)
    inFlight += 1
    void putMatchInputs(matchId, keys, localY, localPose).finally(() => {
      inFlight -= 1
      if (stopped) return
      const heldNow = signatureOf(packKeys(localKeys), localY)
      if (dirty || pendingPulses.length > 0 || heldNow !== lastHeldSig) {
        dirty = false
        flush()
        return
      }
      timer = window.setTimeout(flush, HEARTBEAT_MS)
    })
  }

  void openMatchLive(matchId, (pads) => {
    liveReady = true
    window.clearTimeout(pollTimer)
    applyPads(pads)
  }, liveAbort.signal)

  const poll = async () => {
    if (stopped || liveReady) return
    applyPads(await getMatchInputs(matchId))
    if (stopped || liveReady) return
    pollTimer = window.setTimeout(() => {
      void poll()
    }, 40)
  }
  void poll()

  flush()

  return {
    setLocalKeys: (keys, y, pose) => {
      localKeys = keys
      if (typeof y === 'number') localY = y
      if (pose) localPose = pose
      const held = packKeys(keys)
      const sig = signatureOf(held, localY)
      if (sig === lastHeldSig) return
      pendingPulses = mergeKeys(pendingPulses, held)
      flush()
    },
    readRivalKeys: () => rivalKeys,
    readRivalY: () => {
      if (rivalY === null) return null
      const extra = Math.min(MAX_PREDICT_MS, Math.max(0, performance.now() - rivalYAt))
      return rivalY + rivalVy * extra
    },
    readRivalSnap: () => rivalSnap,
    stop: () => {
      stopped = true
      window.clearTimeout(timer)
      window.clearTimeout(pollTimer)
      liveAbort.abort()
      void putMatchInputs(matchId, packKeys(localKeys), localY, localPose)
    },
  }
}
