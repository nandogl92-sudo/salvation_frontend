import { getMatchInputs, putMatchInputs } from '../api/playInputsApi'

const POLL_MS = 120

export type LiveInputLink = {
  setLocalKeys: (keys: Record<string, boolean>) => void
  readRivalKeys: () => Record<string, boolean>
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
  let rivalKeys: Record<string, boolean> = {}
  let stopped = false
  let inFlight = false

  const tick = async () => {
    if (stopped || inFlight) return
    inFlight = true
    const pads = await putMatchInputs(matchId, packKeys(localKeys))
    const extra = pads.length > 0 ? pads : await getMatchInputs(matchId)
    inFlight = false
    if (stopped) return
    const rival = extra.find((pad) => pad.userId !== localUserId)
    rivalKeys = rival ? unpackKeys(rival.keys) : {}
  }

  const intervalId = window.setInterval(() => {
    void tick()
  }, POLL_MS)
  void tick()

  return {
    setLocalKeys: (keys) => {
      localKeys = keys
    },
    readRivalKeys: () => rivalKeys,
    stop: () => {
      stopped = true
      window.clearInterval(intervalId)
      void putMatchInputs(matchId, [])
    },
  }
}
