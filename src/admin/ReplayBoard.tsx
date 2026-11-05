import { useEffect, useRef, useState } from 'react'
import {
  getReplay,
  listReplays,
  type ReplayHead,
  type ReplayItem,
  type ReplayKeys,
  type ReplayRally,
  type ReplaySample,
  type ReplayScene,
  type ReplayTape,
  type ReplayUnit,
} from '../api/replaysApi'
import { makeRng } from '../games/sharedWorld'
import { makeTrack } from '../games/Racing'

const GAME_NAME: Record<string, string> = {
  pong: 'Paddle Duel',
  snake: 'Aero Rings',
  tetris: 'Slot Car Racing',
  combat: 'Sky Drop',
}

const namesOf = (replay: ReplayHead): string => {
  const left = replay.players.find((player) => player.side === 'p1')?.username ?? 'p1'
  const right = replay.players.find((player) => player.side === 'p2')?.username ?? 'p2'
  return `${left} contra ${right}`
}

const keysAt = (samples: ReplaySample[], at: number): ReplayKeys => {
  let keys: ReplayKeys = { p1: [], p2: [] }
  samples.forEach((sample) => {
    if (sample.at > at || !sample.keys) return
    keys = sample.keys
  })
  return keys
}

const arrow = (keys: string[]): string => {
  const names = keys.map((key) => {
    if (key === 'ArrowUp' || key === 'w' || key === 'W') return 'arriba'
    if (key === 'ArrowDown' || key === 's' || key === 'S') return 'abajo'
    if (key === 'ArrowLeft' || key === 'a' || key === 'A') return 'izquierda'
    if (key === 'ArrowRight' || key === 'd' || key === 'D') return 'derecha'
    if (key === ' ' || key === 'Space') return 'espacio'
    return key
  })
  return names.length > 0 ? names.join(', ') : 'quieto'
}

const FIELD_W = 960
const FIELD_H = 540
const TRACK_W = 76

let raceCache: { seed: number; pts: { x: number; y: number }[] } | null = null

const racePoints = (seed: number): { x: number; y: number }[] => {
  if (raceCache?.seed === seed) return raceCache.pts
  const pts = makeTrack(makeRng(seed)).pts
  raceCache = { seed, pts }
  return pts
}

const paintScore = (ctx: CanvasRenderingContext2D, text: string): void => {
  ctx.fillStyle = '#d5dcf0'
  ctx.font = '16px sans-serif'
  ctx.textAlign = 'left'
  ctx.fillText(text, 16, 28)
}

const drawRally = (ctx: CanvasRenderingContext2D, rally: ReplayRally): void => {
  ctx.fillStyle = '#0b1220'
  ctx.fillRect(0, 0, FIELD_W, FIELD_H)
  ctx.strokeStyle = '#f4f4f4'
  ctx.lineWidth = 4
  ctx.strokeRect(24, 152, FIELD_W - 48, 508 - 152)
  ctx.setLineDash([10, 14])
  ctx.beginPath()
  ctx.moveTo(FIELD_W / 2, 152)
  ctx.lineTo(FIELD_W / 2, 508)
  ctx.stroke()
  ctx.setLineDash([])
  ctx.fillStyle = '#ec4899'
  ctx.fillRect(62, rally.p1y, 18, 108)
  ctx.fillStyle = '#22d3ee'
  ctx.fillRect(FIELD_W - 62 - 18, rally.p2y, 18, 108)
  ctx.fillStyle = '#f5c518'
  ctx.beginPath()
  ctx.arc(rally.ballX, rally.ballY, 6, 0, Math.PI * 2)
  ctx.fill()
  paintScore(ctx, `${rally.p1} - ${rally.p2}`)
}

const strokeLoop = (ctx: CanvasRenderingContext2D, pts: { x: number; y: number }[], width: number, color: string, dash: number[] = []): void => {
  ctx.strokeStyle = color
  ctx.lineWidth = width
  ctx.lineJoin = 'round'
  ctx.lineCap = 'round'
  ctx.setLineDash(dash)
  ctx.beginPath()
  ctx.moveTo(pts[0].x, pts[0].y)
  pts.slice(1).forEach((point) => ctx.lineTo(point.x, point.y))
  ctx.closePath()
  ctx.stroke()
  ctx.setLineDash([])
}

const drawCar = (ctx: CanvasRenderingContext2D, car: ReplayUnit, color: string, dark: string): void => {
  const angle = typeof car.v === 'number' ? car.v : 0
  ctx.save()
  ctx.translate(car.x, car.y)
  ctx.rotate(angle)
  ctx.fillStyle = '#0b0d12'
  ctx.fillRect(-15, -7, 30, 14)
  ctx.fillStyle = dark
  ctx.fillRect(-14, -6, 28, 12)
  ctx.fillStyle = color
  ctx.fillRect(-13, -5, 26, 10)
  ctx.fillStyle = '#fef08a'
  ctx.fillRect(12, -4, 3, 3)
  ctx.fillRect(12, 1, 3, 3)
  ctx.restore()
}

const drawRace = (ctx: CanvasRenderingContext2D, scene: ReplayScene, seed: number | undefined): void => {
  ctx.fillStyle = '#245c32'
  ctx.fillRect(0, 0, FIELD_W, FIELD_H)
  if (typeof seed === 'number') {
    const pts = racePoints(seed)
    strokeLoop(ctx, pts, TRACK_W + 14, '#ff8c1a')
    strokeLoop(ctx, pts, TRACK_W, '#2b2d34')
    strokeLoop(ctx, pts, 2, 'rgba(255,255,255,0.7)', [10, 12])
  }
  scene.items.forEach((item) => {
    ctx.fillStyle = 'rgba(18, 20, 27, 0.9)'
    ctx.beginPath()
    ctx.arc(item.x, item.y, Math.max(4, item.w), 0, Math.PI * 2)
    ctx.fill()
  })
  drawCar(ctx, scene.p1, '#ec4899', '#9d174d')
  drawCar(ctx, scene.p2, '#22d3ee', '#0e7490')
  paintScore(ctx, `VUELTAS ${scene.p1.n} - ${scene.p2.n}`)
}

const drawRing = (ctx: CanvasRenderingContext2D, item: ReplayItem): void => {
  const owner = item.k === 1 ? '#84cc16' : '#ec4899'
  ctx.fillStyle = owner
  ctx.beginPath()
  ctx.arc(item.x, item.y, Math.max(8, item.h), 0, Math.PI * 2)
  ctx.arc(item.x, item.y, Math.max(4, item.w), 0, Math.PI * 2, true)
  ctx.fill()
}

const drawPlane = (ctx: CanvasRenderingContext2D, plane: ReplayUnit, color: string): void => {
  const size = Math.max(10, plane.a || 16)
  ctx.save()
  ctx.translate(plane.x, plane.y)
  ctx.fillStyle = color
  ctx.beginPath()
  ctx.moveTo(size, 0)
  ctx.lineTo(-size * 0.8, -size * 0.45)
  ctx.lineTo(-size * 0.4, 0)
  ctx.lineTo(-size * 0.8, size * 0.45)
  ctx.closePath()
  ctx.fill()
  ctx.restore()
}

const drawRings = (ctx: CanvasRenderingContext2D, scene: ReplayScene): void => {
  const sky = ctx.createLinearGradient(0, 0, 0, FIELD_H)
  sky.addColorStop(0, '#3b82c4')
  sky.addColorStop(1, '#dbeafe')
  ctx.fillStyle = sky
  ctx.fillRect(0, 0, FIELD_W, FIELD_H)
  ctx.fillStyle = '#166534'
  ctx.fillRect(0, 528, FIELD_W, 12)
  scene.items.forEach((item) => drawRing(ctx, item))
  drawPlane(ctx, scene.p1, '#ec4899')
  drawPlane(ctx, scene.p2, '#84cc16')
  paintScore(ctx, `${scene.p1.n} - ${scene.p2.n}`)
}

const HAZARD_COLOR = ['#a21caf', '#fb7185', '#22d3ee', '#f97316']

const drawDrop = (ctx: CanvasRenderingContext2D, scene: ReplayScene): void => {
  const sky = ctx.createLinearGradient(0, 0, 0, FIELD_H)
  sky.addColorStop(0, '#2f6fb3')
  sky.addColorStop(1, '#d7f0ff')
  ctx.fillStyle = sky
  ctx.fillRect(0, 0, FIELD_W, FIELD_H)
  scene.items.forEach((item) => {
    ctx.fillStyle = HAZARD_COLOR[item.k ?? 3] ?? '#f97316'
    ctx.fillRect(item.x, item.y, Math.max(8, item.w), Math.max(8, item.h))
  })
  const jumper = (unit: ReplayUnit, color: string) => {
    ctx.fillStyle = color
    ctx.beginPath()
    ctx.arc(unit.x, unit.y - 20, 16, Math.PI, 0)
    ctx.fill()
    ctx.fillRect(unit.x - 6, unit.y - 8, 12, 22)
  }
  jumper(scene.p1, '#c026d3')
  jumper(scene.p2, '#facc15')
  paintScore(ctx, scene.winner ? scene.winner : 'SKY DROP')
}

const drawScene = (ctx: CanvasRenderingContext2D, scene: ReplayScene, seed: number | undefined): void => {
  if (scene.kind === 'race') {
    drawRace(ctx, scene, seed)
    return
  }
  if (scene.kind === 'rings') {
    drawRings(ctx, scene)
    return
  }
  if (scene.kind === 'drop') {
    drawDrop(ctx, scene)
    return
  }
  ctx.fillStyle = '#07111f'
  ctx.fillRect(0, 0, FIELD_W, FIELD_H)
  paintScore(ctx, `${scene.p1.n} - ${scene.p2.n}`)
}

const drawSample = (ctx: CanvasRenderingContext2D, sample: ReplaySample, seed: number | undefined): void => {
  if (sample.rally) drawRally(ctx, sample.rally)
  else if (sample.scene) drawScene(ctx, sample.scene, seed)
}

const ReplayPlayer = ({ tape, onClose }: { tape: ReplayTape; onClose: () => void }) => {
  const canvasRef = useRef<HTMLCanvasElement | null>(null)
  const [playing, setPlaying] = useState(true)
  const [keys, setKeys] = useState<ReplayKeys>({ p1: [], p2: [] })
  const pictures = tape.samples.filter((sample) => sample.rally || sample.scene)

  useEffect(() => {
    if (tape.closed) return
    const canvas = canvasRef.current
    const ctx = canvas?.getContext('2d')
    const frame = pictures[pictures.length - 1]
    if (!canvas || !ctx || !frame) return
    drawSample(ctx, frame, tape.seed)
    setKeys(keysAt(tape.samples, frame.at))
  }, [tape])

  useEffect(() => {
    if (!tape.closed || !playing) return
    const frames = tape.samples.filter((sample) => sample.rally || sample.scene)
    if (frames.length === 0) return
    const canvas = canvasRef.current
    const ctx = canvas?.getContext('2d')
    if (!canvas || !ctx) return
    const origin = frames[0].at
    const started = performance.now()
    let frame = 0
    let request = 0
    let lastKeys = ''
    const tick = (now: number) => {
      const target = origin + (now - started)
      while (frame + 1 < frames.length && frames[frame + 1].at <= target) frame += 1
      drawSample(ctx, frames[frame], tape.seed)
      const nextKeys = keysAt(tape.samples, frames[frame].at)
      const label = `${nextKeys.p1.join(',')}|${nextKeys.p2.join(',')}`
      if (label !== lastKeys) {
        lastKeys = label
        setKeys(nextKeys)
      }
      if (frame >= frames.length - 1) {
        setPlaying(false)
        return
      }
      request = requestAnimationFrame(tick)
    }
    request = requestAnimationFrame(tick)
    return () => cancelAnimationFrame(request)
  }, [playing, tape])

  const download = () => {
    const blob = new Blob([JSON.stringify(tape)], { type: 'application/json' })
    const link = document.createElement('a')
    link.href = URL.createObjectURL(blob)
    link.download = `repeticion-${tape.matchId}.json`
    link.click()
    setTimeout(() => URL.revokeObjectURL(link.href), 1000)
  }

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between gap-3">
        <p className="text-sm text-white">{namesOf(tape)}</p>
        <button type="button" onClick={onClose} className="text-xs font-bold uppercase tracking-wide text-[#d5dcf0]">
          Cerrar
        </button>
      </div>
      {pictures.length === 0 && <p className="text-sm text-[#b7c0d4]">Esta partida todavía no tiene dibujo.</p>}
      {!tape.closed && <p className="text-xs font-bold uppercase tracking-wide text-[#f5c518]">En directo</p>}
      <canvas ref={canvasRef} width={FIELD_W} height={FIELD_H} className="w-full max-w-3xl rounded-xl bg-[#07111f]" />
      <p className="text-xs text-[#d5dcf0]">Izquierda: {arrow(keys.p1)}</p>
      <p className="text-xs text-[#d5dcf0]">Derecha: {arrow(keys.p2)}</p>
      <div className="flex gap-2">
        <button
          type="button"
          onClick={() => setPlaying(true)}
          className="px-3 py-2 rounded-lg text-xs font-bold uppercase tracking-wide bg-[#f5c518] text-[#1a1403]"
        >
          Ver
        </button>
        <button
          type="button"
          onClick={download}
          className="px-3 py-2 rounded-lg text-xs font-bold uppercase tracking-wide border border-[#243056] text-[#d5dcf0]"
        >
          Descargar
        </button>
      </div>
    </div>
  )
}

const ReplayBoard = () => {
  const [replays, setReplays] = useState<ReplayHead[]>([])
  const [tape, setTape] = useState<ReplayTape | null>(null)
  const [message, setMessage] = useState<string | null>(null)

  useEffect(() => {
    let cancelled = false
    listReplays().then((result) => {
      if (cancelled) return
      if (result.ok === true) {
        setReplays(result.replays)
        return
      }
      setMessage(result.message)
    })
    return () => {
      cancelled = true
    }
  }, [])

  const open = async (matchId: string) => {
    const result = await getReplay(matchId)
    if (result.ok !== true) {
      setMessage(result.message)
      return
    }
    setMessage(null)
    setTape(result.tape)
  }

  useEffect(() => {
    if (!tape || tape.closed) return
    const timer = setInterval(() => {
      void getReplay(tape.matchId).then((result) => {
        if (result.ok === true) setTape(result.tape)
      })
    }, 1000)
    return () => clearInterval(timer)
  }, [tape?.matchId, tape?.closed])

  if (tape) return <ReplayPlayer tape={tape} onClose={() => setTape(null)} />

  return (
    <div className="space-y-3">
      <h2 className="font-pixel text-[10px] text-[#f5c518]">Repeticiones</h2>
      <p className="text-sm text-[#b7c0d4]">
        Solo las ranqueadas. Puedes verlas aquí o descargar el archivo para revisarlo después.
      </p>
      {message && <p className="text-sm text-red-300" role="alert">{message}</p>}
      {replays.length === 0 && !message && (
        <p className="text-sm text-[#b7c0d4]">Todavía no hay ninguna ranqueada grabada.</p>
      )}
      <ul className="space-y-2">
        {replays.map((replay) => (
          <li key={replay.matchId} className="flex items-center justify-between gap-3 bg-[#0e1528] border border-[#243056] rounded-xl p-3">
            <div>
              <p className="text-sm text-white">{GAME_NAME[replay.gameId] ?? replay.gameId}</p>
              <p className="text-xs text-[#b7c0d4]">{namesOf(replay)} · {replay.closed ? 'terminada' : 'en curso'}</p>
            </div>
            <button
              type="button"
              onClick={() => { void open(replay.matchId) }}
              className="px-3 py-2 rounded-lg text-xs font-bold uppercase tracking-wide bg-[#f5c518] text-[#1a1403]"
            >
              Ver
            </button>
          </li>
        ))}
      </ul>
    </div>
  )
}

export default ReplayBoard
