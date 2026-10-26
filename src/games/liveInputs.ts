import { getMatchInputs, putMatchInputs } from '../api/playInputsApi'

/** Latido si no cambia el pad. Un toque se envía al momento. */
const HEARTBEAT_MS = 33
const POLL_MS = 33

export type LiveInputLink = {
  setLocalKeys: (keys: Record<string, boolean>, y?: number) => void
  readRivalKeys: () => Record<string, boolean>
  readRivalY: () => number | null
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
  let rivalKeys: Record<string, boolean> = {}
  let rivalY: number | null = null
  let pendingPulses: string[] = []
  let stopped = false
  let inFlight = false
  let dirty = false
  let lastHeldSig = ''
  let timer = 0
  let pollTimer = 0

  const applyPads = (pads: { userId: string; keys: string[]; at: number; y: number | null }[]) => {
    const rival = pads.find((pad) => pad.userId !== localUserId)
    if (!rival || rival.at <= 0) return
    rivalKeys = unpackKeys(rival.keys)
    if (typeof rival.y === 'number') rivalY = rival.y
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
    lastHeldSig = signatureOf(held)
    const pads = await putMatchInputs(matchId, keys, localY)
    inFlight = false
    if (stopped) return
    applyPads(pads)
    const heldNow = signatureOf(packKeys(localKeys))
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
    setLocalKeys: (keys, y) => {
      localKeys = keys
      if (typeof y === 'number') localY = y
      const held = packKeys(keys)
      const sig = signatureOf(held)
      if (sig === lastHeldSig) return
      pendingPulses = mergeKeys(pendingPulses, held)
      void flush()
    },
    readRivalKeys: () => rivalKeys,
    readRivalY: () => rivalY,
    stop: () => {
      stopped = true
      window.clearTimeout(timer)
      window.clearTimeout(pollTimer)
      void putMatchInputs(matchId, [], null)
    },
  }
}
