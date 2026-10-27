import { getAccessToken } from '../api/authApi'
import { API_URL } from '../api/config'
import { getMatchInputs, openMatchLive, putMatchInputs, type RemotePad, type RemotePose } from '../api/playInputsApi'

const HEARTBEAT_MS = 40
const FRAME_MS = 1000 / 60

export type WorldSnap = RemotePose & {
  y: number
  receivedAt: number
}

export type PaddleMove = {
  up: boolean
  down: boolean
}

export type LiveInputLink = {
  setLocalKeys: (keys: Record<string, boolean>, y?: number, pose?: RemotePose | null, frame?: number) => void
  readRivalKeys: () => Record<string, boolean>
  readRivalY: () => number | null
  readRivalSnap: () => WorldSnap | null
  serverFrame: (startAt: number) => number
  readMove: (frame: number, who: 'local' | 'rival') => PaddleMove | null
  pullRewind: () => number | null
  stop: () => void
}

type MoveSample = PaddleMove & { frame: number }

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

const moveOf = (keys: Record<string, boolean>): PaddleMove => ({
  up: Boolean(keys.w || keys.W || keys.ArrowUp),
  down: Boolean(keys.s || keys.S || keys.ArrowDown),
})

const readList = (list: MoveSample[], frame: number): MoveSample | null => {
  let found: MoveSample | null = null
  for (const item of list) {
    if (item.frame > frame) break
    found = item
  }
  return found
}

const remember = (list: MoveSample[], frame: number, move: PaddleMove): boolean => {
  const before = readList(list, frame)
  const same = list.findIndex((item) => item.frame === frame)
  if (same >= 0) list.splice(same, 1)
  else if (before && before.up === move.up && before.down === move.down) return false
  list.push({ frame, up: move.up, down: move.down })
  list.sort((left, right) => left.frame - right.frame)
  while (list.length > 180) list.shift()
  const after = readList(list, frame)
  if (!after) return false
  if (!before) return true
  return before.up !== after.up || before.down !== after.down
}

export const keyHeld = (keys: Record<string, boolean>, ...names: string[]): boolean =>
  names.some((name) => Boolean(keys[name]))

export const otherSide = (side: 'p1' | 'p2'): 'p1' | 'p2' => (side === 'p1' ? 'p2' : 'p1')

const socketUrl = (matchId: string, token: string): string => {
  const base = API_URL || window.location.origin
  const url = new URL(`/matches/${matchId}/socket`, base)
  url.protocol = url.protocol === 'https:' ? 'wss:' : 'ws:'
  url.searchParams.set('token', token)
  return url.toString()
}

export const startLiveInputs = (matchId: string, localUserId: string): LiveInputLink => {
  let localKeys: Record<string, boolean> = {}
  let localY: number | null = null
  let localPose: RemotePose | null = null
  let localFrame = 0
  let rivalKeys: Record<string, boolean> = {}
  let rivalY: number | null = null
  let rivalSnap: WorldSnap | null = null
  let lastRivalSeq = 0
  let pendingPulses: string[] = []
  let stopped = false
  let seq = 0
  let inFlight = 0
  let dirty = false
  let lastHeldSig = ''
  let timer = 0
  let pollTimer = 0
  let beatTimer = 0
  let clockOffset = 0
  let clockReady = false
  let clockLocked = false
  const clockSamples: number[] = []
  let rewindFrom = Number.POSITIVE_INFINITY
  const localLog: MoveSample[] = []
  const rivalLog: MoveSample[] = []
  const liveAbort = new AbortController()
  let socket: WebSocket | null = null

  const noteClock = (serverNow: number) => {
    if (!Number.isFinite(serverNow) || clockLocked) return
    clockSamples.push(serverNow - Date.now())
    clockReady = true
    if (clockSamples.length < 5) {
      clockOffset = clockSamples[clockSamples.length - 1]
      return
    }
    const sorted = [...clockSamples].sort((left, right) => left - right)
    clockOffset = sorted[2]
    clockLocked = true
  }

  const noteRival = (pad: RemotePad) => {
    if (pad.seq > 0 && pad.seq <= lastRivalSeq) return
    if (pad.seq > 0) lastRivalSeq = pad.seq
    if (pad.at <= 0 && pad.frame <= 0) return
    rivalKeys = unpackKeys(pad.keys)
    if (typeof pad.y === 'number') rivalY = pad.y
    if (pad.pose) rivalSnap = { ...pad.pose, y: pad.y ?? 0, receivedAt: performance.now() }
    if (pad.frame < 0) return
    const changed = remember(rivalLog, pad.frame, moveOf(rivalKeys))
    if (changed) rewindFrom = Math.min(rewindFrom, pad.frame)
  }

  const applyPads = (pads: RemotePad[]) => {
    const rival = pads.find((pad) => pad.userId !== localUserId)
    if (!rival) return
    noteRival(rival)
  }

  const sendSocket = (): boolean => {
    if (!socket || socket.readyState !== WebSocket.OPEN) return false
    seq += 1
    socket.send(JSON.stringify({
      keys: mergeKeys(packKeys(localKeys), pendingPulses),
      y: localY,
      pose: localPose,
      seq,
      frame: localFrame,
    }))
    pendingPulses = []
    lastHeldSig = signatureOf(packKeys(localKeys))
    return true
  }

  const flush = () => {
    if (sendSocket()) return
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
    const sentFrame = localFrame
    inFlight += 1
    void putMatchInputs(matchId, keys, localY, localPose, sentSeq, sentFrame).finally(() => {
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

  const token = getAccessToken()
  if (token) {
    socket = new WebSocket(socketUrl(matchId, token))
    socket.onopen = () => {
      sendSocket()
    }
    socket.onmessage = (event) => {
      try {
        const body = JSON.parse(String(event.data)) as { serverNow?: unknown; players?: unknown }
        if (typeof body.serverNow === 'number') noteClock(body.serverNow)
        if (Array.isArray(body.players)) {
          body.players.forEach((item) => {
            if (!item || typeof item !== 'object') return
            const pad = item as RemotePad
            if (pad.userId === localUserId || typeof pad.userId !== 'string' || !Array.isArray(pad.keys)) return
            noteRival({
              userId: pad.userId,
              keys: pad.keys.filter((key) => typeof key === 'string'),
              at: typeof pad.at === 'number' ? pad.at : 1,
              y: typeof pad.y === 'number' ? pad.y : null,
              pose: pad.pose && typeof pad.pose.ballX === 'number' ? pad.pose : null,
              seq: typeof pad.seq === 'number' ? pad.seq : 0,
              frame: typeof pad.frame === 'number' ? pad.frame : 0,
            })
          })
        }
      } catch {
        // Evento incompleto.
      }
    }
  }

  void openMatchLive(matchId, applyPads, liveAbort.signal).catch(() => undefined)

  const poll = async () => {
    if (stopped) return
    if (!socket || socket.readyState !== WebSocket.OPEN) applyPads(await getMatchInputs(matchId))
    if (stopped) return
    pollTimer = window.setTimeout(() => {
      void poll()
    }, 80)
  }
  void poll()

  beatTimer = window.setInterval(() => {
    if (!stopped) sendSocket()
  }, HEARTBEAT_MS)

  return {
    setLocalKeys: (keys, y, pose, frame) => {
      localKeys = keys
      if (typeof y === 'number') localY = y
      if (pose) localPose = pose
      if (typeof frame === 'number') {
        localFrame = frame
        remember(localLog, frame, moveOf(keys))
      }
      const held = packKeys(keys)
      const sig = signatureOf(held)
      if (sig === lastHeldSig) return
      pendingPulses = mergeKeys(pendingPulses, held)
      flush()
    },
    readRivalKeys: () => rivalKeys,
    readRivalY: () => rivalY,
    readRivalSnap: () => rivalSnap,
    serverFrame: (startAt) => Math.max(0, Math.floor((Date.now() + clockOffset - startAt) / FRAME_MS)),
    readMove: (frame, who) => {
      const found = readList(who === 'local' ? localLog : rivalLog, frame)
      return found ? { up: found.up, down: found.down } : null
    },
    pullRewind: () => {
      if (!Number.isFinite(rewindFrom)) return null
      const frame = rewindFrom
      rewindFrom = Number.POSITIVE_INFINITY
      return frame
    },
    stop: () => {
      stopped = true
      window.clearTimeout(timer)
      window.clearTimeout(pollTimer)
      window.clearInterval(beatTimer)
      liveAbort.abort()
      sendSocket()
      socket?.close()
      seq += 1
      void putMatchInputs(matchId, packKeys(localKeys), localY, localPose, seq, localFrame)
    },
  }
}
