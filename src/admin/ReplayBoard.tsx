import { useEffect, useRef, useState } from 'react'
import {
  getReplay,
  listReplays,
  type ReplayHead,
  type ReplayKeys,
  type ReplayRally,
  type ReplaySample,
  type ReplayScene,
  type ReplayTape,
} from '../api/replaysApi'

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

const drawRally = (ctx: CanvasRenderingContext2D, rally: ReplayRally): void => {
  const width = ctx.canvas.width
  const height = ctx.canvas.height
  const sx = width / 960
  const sy = height / 560
  ctx.fillStyle = '#07111f'
  ctx.fillRect(0, 0, width, height)
  ctx.strokeStyle = '#243056'
  ctx.strokeRect(24, 152 * sy, width - 48, (508 - 152) * sy)
  ctx.fillStyle = '#f5c518'
  ctx.fillRect(62 * sx, rally.p1y * sy, 18 * sx, 108 * sy)
  ctx.fillRect((960 - 62 - 18) * sx, rally.p2y * sy, 18 * sx, 108 * sy)
  ctx.beginPath()
  ctx.arc(rally.ballX * sx, rally.ballY * sy, 6 * sx, 0, Math.PI * 2)
  ctx.fill()
  ctx.fillStyle = '#d5dcf0'
  ctx.font = '14px sans-serif'
  ctx.fillText(`${rally.p1} - ${rally.p2}`, 16, 28)
}

const boundsOf = (scene: ReplayScene): { minX: number; minY: number; spanX: number; spanY: number } => {
  const points = [scene.p1, scene.p2, ...scene.items]
  const xs = points.map((point) => point.x)
  const ys = points.map((point) => point.y)
  const minX = Math.min(...xs)
  const maxX = Math.max(...xs)
  const minY = Math.min(...ys)
  const maxY = Math.max(...ys)
  return {
    minX,
    minY,
    spanX: Math.max(40, maxX - minX),
    spanY: Math.max(40, maxY - minY),
  }
}

const drawScene = (ctx: CanvasRenderingContext2D, scene: ReplayScene): void => {
  const width = ctx.canvas.width
  const height = ctx.canvas.height
  const bounds = boundsOf(scene)
  const sx = (width - 32) / bounds.spanX
  const sy = (height - 32) / bounds.spanY
  const scale = Math.min(sx, sy)
  const place = (x: number, y: number): [number, number] => [
    16 + (x - bounds.minX) * scale,
    16 + (y - bounds.minY) * scale,
  ]
  ctx.fillStyle = '#07111f'
  ctx.fillRect(0, 0, width, height)
  ctx.fillStyle = '#3d4d73'
  scene.items.forEach((item) => {
    const [x, y] = place(item.x, item.y)
    const radius = Math.max(3, Math.min(18, item.w * scale * 0.5))
    ctx.beginPath()
    ctx.arc(x, y, radius, 0, Math.PI * 2)
    ctx.fill()
  })
  const drawUnit = (unit: ReplayScene['p1'], color: string) => {
    const [x, y] = place(unit.x, unit.y)
    ctx.fillStyle = color
    ctx.beginPath()
    ctx.arc(x, y, 7, 0, Math.PI * 2)
    ctx.fill()
    ctx.beginPath()
    ctx.moveTo(x, y)
    ctx.lineTo(x + Math.cos(unit.a) * 16, y + Math.sin(unit.a) * 16)
    ctx.strokeStyle = color
    ctx.stroke()
  }
  drawUnit(scene.p1, '#f5c518')
  drawUnit(scene.p2, '#7ec8ff')
  ctx.fillStyle = '#d5dcf0'
  ctx.font = '14px sans-serif'
  ctx.fillText(`${scene.p1.n} - ${scene.p2.n}${scene.winner ? ` · ${scene.winner}` : ''}`, 16, 28)
}

const drawSample = (ctx: CanvasRenderingContext2D, sample: ReplaySample): void => {
  if (sample.rally) drawRally(ctx, sample.rally)
  else if (sample.scene) drawScene(ctx, sample.scene)
}

const ReplayPlayer = ({ tape, onClose }: { tape: ReplayTape; onClose: () => void }) => {
  const canvasRef = useRef<HTMLCanvasElement | null>(null)
  const [playing, setPlaying] = useState(true)
  const [keys, setKeys] = useState<ReplayKeys>({ p1: [], p2: [] })
  const pictures = tape.samples.filter((sample) => sample.rally || sample.scene)

  useEffect(() => {
    if (!playing) return
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
      drawSample(ctx, frames[frame])
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
      <canvas ref={canvasRef} width={480} height={280} className="w-full max-w-xl rounded-xl bg-[#07111f]" />
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
