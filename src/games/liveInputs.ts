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

export type RallyView = {
  ballX: number
  ballY: number
  p1y: number
  p2y: number
  p1: number
  p2: number
}

type RallySnap = RallyView & {
  at: number
  ballVx: number
  ballVy: number
}

export type LiveInputLink = {
  setLocalKeys: (keys: Record<string, boolean>, y?: number, pose?: RemotePose | null, frame?: number) => void
  readRivalKeys: () => Record<string, boolean>
  readRivalY: () => number | null
  readRivalSnap: () => WorldSnap | null
  serverFrame: (startAt: number) => number
  serverNow: () => number
  readMove: (frame: number, who: 'local' | 'rival') => PaddleMove | null
  readRally: (at: number) => RallyView | null
  rallyAt: () => number
  localHeardFrame: () => number
  rivalHeardFrame: () => number
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
  let bestRtt = 1_000
  let pingTimer = 0
  let pingHits = 0
  let rewindFrom = Number.POSITIVE_INFINITY
  let rivalHeard = 0
  let localHeard = 0
  let lastLocalSeq = 0
  const localLog: MoveSample[] = []
  const rivalLog: MoveSample[] = []
  const rally: RallySnap[] = []
  const liveAbort = new AbortController()
  let socket: WebSocket | null = null

  const notePong = (sentAt: number, serverNow: number) => {
    if (clockLocked) return
    const now = Date.now()
    const rtt = now - sentAt
    if (rtt < 0 || rtt > 400) return
    pingHits += 1
    if (rtt < bestRtt) {
      bestRtt = rtt
      clockOffset = serverNow - (sentAt + now) / 2
      clockReady = true
    }
    if (pingHits >= 5) clockLocked = true
  }

  const sendPing = () => {
    if (clockLocked || !socket || socket.readyState !== WebSocket.OPEN) return
    socket.send(JSON.stringify({ ping: Date.now() }))
  }

  const finite = (value: unknown): number | null => (
    typeof value === 'number' && Number.isFinite(value) ? value : null
  )

  const noteRally = (value: unknown) => {
    if (!value || typeof value !== 'object') return
    const body = value as Record<string, unknown>
    const at = finite(body.at)
    const ballX = finite(body.ballX)
    const ballY = finite(body.ballY)
    const ballVx = finite(body.ballVx)
    const ballVy = finite(body.ballVy)
    const p1y = finite(body.p1y)
    const p2y = finite(body.p2y)
    const p1 = finite(body.p1)
    const p2 = finite(body.p2)
    if (
      at === null || ballX === null || ballY === null || ballVx === null || ballVy === null
      || p1y === null || p2y === null || p1 === null || p2 === null
    ) return
    const last = rally[rally.length - 1]
    if (last && at <= last.at) return
    rally.push({ at, ballX, ballY, ballVx, ballVy, p1y, p2y, p1, p2 })
    while (rally.length > 40) rally.shift()
  }

  const rallyView = (snap: RallySnap): RallyView => ({
    ballX: snap.ballX,
    ballY: snap.ballY,
    p1y: snap.p1y,
    p2y: snap.p2y,
    p1: snap.p1,
    p2: snap.p2,
  })

  const readRallyAt = (at: number): RallyView | null => {
    if (rally.length === 0) return null
    let prev = rally[0]
    if (at <= prev.at) return rallyView(prev)
    for (let index = 1; index < rally.length; index += 1) {
      const next = rally[index]
      if (at > next.at) {
        prev = next
        continue
      }
      const jumped = Math.abs(next.ballX - prev.ballX) > 48 || Math.abs(next.ballY - prev.ballY) > 48
      if (jumped) return rallyView(prev)
      const span = next.at - prev.at
      const blend = span > 0 ? (at - prev.at) / span : 0
      return {
        ballX: prev.ballX + (next.ballX - prev.ballX) * blend,
        ballY: prev.ballY + (next.ballY - prev.ballY) * blend,
        p1y: prev.p1y + (next.p1y - prev.p1y) * blend,
        p2y: prev.p2y + (next.p2y - prev.p2y) * blend,
        p1: prev.p1,
        p2: prev.p2,
      }
    }
    const last = rally[rally.length - 1]
    const ahead = at - last.at
    if (ahead > 0 && ahead < 18) {
      return {
        ballX: last.ballX + last.ballVx * (ahead / FRAME_MS),
        ballY: last.ballY + last.ballVy * (ahead / FRAME_MS),
        p1y: last.p1y,
        p2y: last.p2y,
        p1: last.p1,
        p2: last.p2,
      }
    }
    return rallyView(last)
  }

  const noteOwn = (pad: RemotePad) => {
    if (pad.seq > 0 && pad.seq <= lastLocalSeq) return
    if (pad.seq > 0) lastLocalSeq = pad.seq
    if (pad.frame <= 0) return
    if (pad.frame > localHeard) localHeard = pad.frame
    remember(localLog, pad.frame, moveOf(unpackKeys(pad.keys)))
  }

  const noteRival = (pad: RemotePad) => {
    if (pad.seq > 0 && pad.seq <= lastRivalSeq) return
    if (pad.seq > 0) lastRivalSeq = pad.seq
    if (pad.at <= 0 && pad.frame <= 0) return
    rivalKeys = unpackKeys(pad.keys)
    if (typeof pad.y === 'number') rivalY = pad.y
    if (pad.pose) rivalSnap = { ...pad.pose, y: pad.y ?? 0, receivedAt: performance.now() }
    if (pad.frame < 0) return
    if (pad.frame > rivalHeard) rivalHeard = pad.frame
    const changed = remember(rivalLog, pad.frame, moveOf(rivalKeys))
    if (changed) rewindFrom = Math.min(rewindFrom, pad.frame)
  }

  const applyPads = (pads: RemotePad[]) => {
    pads.forEach((pad) => {
      if (pad.userId === localUserId) noteOwn(pad)
      else noteRival(pad)
    })
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
      sendPing()
      pingTimer = window.setInterval(sendPing, 80)
    }
    socket.onmessage = (event) => {
      try {
        const body = JSON.parse(String(event.data)) as { serverNow?: unknown; players?: unknown; pong?: unknown; rally?: unknown }
        if (typeof body.pong === 'number' && typeof body.serverNow === 'number') notePong(body.pong, body.serverNow)
        if (body.rally) noteRally(body.rally)
        if (Array.isArray(body.players)) {
          body.players.forEach((item) => {
            if (!item || typeof item !== 'object') return
            const pad = item as RemotePad
            if (typeof pad.userId !== 'string' || !Array.isArray(pad.keys)) return
            const parsed = {
              userId: pad.userId,
              keys: pad.keys.filter((key) => typeof key === 'string'),
              at: typeof pad.at === 'number' ? pad.at : 1,
              y: typeof pad.y === 'number' ? pad.y : null,
              pose: pad.pose && typeof pad.pose.ballX === 'number' ? pad.pose : null,
              seq: typeof pad.seq === 'number' ? pad.seq : 0,
              frame: typeof pad.frame === 'number' ? pad.frame : 0,
            }
            if (pad.userId === localUserId) noteOwn(parsed)
            else noteRival(parsed)
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
      if (typeof frame === 'number') localFrame = frame
      if (sendSocket()) return
      const held = packKeys(keys)
      const sig = signatureOf(held)
      if (sig === lastHeldSig) return
      pendingPulses = mergeKeys(pendingPulses, held)
      flush()
    },
    readRivalKeys: () => rivalKeys,
    readRivalY: () => rivalY,
    readRivalSnap: () => rivalSnap,
    serverFrame: (startAt) => {
      if (!clockReady) return 0
      return Math.max(0, Math.floor((Date.now() + clockOffset - startAt) / FRAME_MS))
    },
    serverNow: () => Date.now() + clockOffset,
    readMove: (frame, who) => {
      const found = readList(who === 'local' ? localLog : rivalLog, frame)
      return found ? { up: found.up, down: found.down } : null
    },
    readRally: (at) => readRallyAt(at),
    rallyAt: () => (rally.length > 0 ? rally[rally.length - 1].at : 0),
    rivalHeardFrame: () => rivalHeard,
    localHeardFrame: () => localHeard,
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
      window.clearInterval(pingTimer)
      liveAbort.abort()
      sendSocket()
      socket?.close()
      seq += 1
      void putMatchInputs(matchId, packKeys(localKeys), localY, localPose, seq, localFrame)
    },
  }
}
