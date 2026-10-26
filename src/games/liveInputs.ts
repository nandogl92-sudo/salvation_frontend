import { getMatchInputs, openMatchLive, putMatchInputs, type RemotePad, type RemotePose } from '../api/playInputsApi'

const HEARTBEAT_MS = 30

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

const signatureOf = (keys: string[]): string => [...keys].sort().join('\0')

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
  let rivalSnap: WorldSnap | null = null
  let lastRivalAt = 0
  let pendingPulses: string[] = []
  let stopped = false
  let seq = 0
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
    if (typeof rival.y === 'number') rivalY = rival.y
    if (rival.pose) rivalSnap = { ...rival.pose, y: rival.y ?? 0, receivedAt: performance.now() }
  }

  const flush = () => {
    if (stopped || inFlight >= 3) {
      dirty = true
      return
    }
    window.clearTimeout(timer)
    const held = packKeys(localKeys)
    const keys = mergeKeys(held, pendingPulses)
    pendingPulses = []
    lastHeldSig = signatureOf(held)
    seq += 1
    const sentSeq = seq
    inFlight += 1
    void putMatchInputs(matchId, keys, localY, localPose, sentSeq).finally(() => {
      inFlight -= 1
      if (stopped) return
      const heldNow = signatureOf(packKeys(localKeys))
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
    if (stopped) return
    applyPads(await getMatchInputs(matchId))
    if (stopped) return
    pollTimer = window.setTimeout(() => {
      void poll()
    }, liveReady ? 40 : 16)
  }
  void poll()

  flush()

  return {
    setLocalKeys: (keys, y, pose) => {
      localKeys = keys
      if (typeof y === 'number') localY = y
      if (pose) localPose = pose
      const held = packKeys(keys)
      const sig = signatureOf(held)
      if (sig === lastHeldSig) return
      pendingPulses = mergeKeys(pendingPulses, held)
      flush()
    },
    readRivalKeys: () => rivalKeys,
    readRivalY: () => rivalY,
    readRivalSnap: () => rivalSnap,
    stop: () => {
      stopped = true
      window.clearTimeout(timer)
      window.clearTimeout(pollTimer)
      liveAbort.abort()
      seq += 1
      void putMatchInputs(matchId, packKeys(localKeys), localY, localPose, seq)
    },
  }
}
