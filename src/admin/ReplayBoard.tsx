import { useEffect, useState } from 'react'
import { getReplay, listReplays, type ReplayHead, type ReplayTape } from '../api/replaysApi'

const GAME_NAME: Record<string, string> = {
  pong: 'Paddle Duel',
  snake: 'Aero Rings',
  tetris: 'Slot Car Racing',
  combat: 'Sky Drop',
}

const namesOf = (replay: ReplayHead): { left: string; right: string } => {
  const left = replay.players.find((player) => player.side === 'p1')?.username ?? 'Jugador 1'
  const right = replay.players.find((player) => player.side === 'p2')?.username ?? 'Jugador 2'
  return { left, right }
}

const scoreOf = (tape: ReplayTape): string => {
  const frames = tape.samples.filter((sample) => sample.rally || sample.scene)
  const last = frames[frames.length - 1]
  if (last?.rally) return `${last.rally.p1} – ${last.rally.p2}`
  if (last?.scene) return `${last.scene.p1.n} – ${last.scene.p2.n}`
  return 'Sin marcador'
}

const ReplayBoard = () => {
  const [rows, setRows] = useState<{ replay: ReplayHead; score: string }[]>([])
  const [message, setMessage] = useState<string | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    let cancelled = false
    const load = async () => {
      const listed = await listReplays()
      if (cancelled) return
      if (listed.ok !== true) {
        setLoading(false)
        setMessage(listed.message)
        return
      }
      const scored = await Promise.all(listed.replays.map(async (replay) => {
        const tape = await getReplay(replay.matchId)
        const score = tape.ok === true ? scoreOf(tape.tape) : 'Sin marcador'
        return { replay, score }
      }))
      if (cancelled) return
      setRows(scored)
      setLoading(false)
    }
    void load()
    return () => {
      cancelled = true
    }
  }, [])

  if (loading) return <p className="text-sm text-[#b7c0d4]">Cargando partidas…</p>
  if (message) return <p className="text-sm text-red-300" role="alert">{message}</p>
  if (rows.length === 0) return <p className="text-sm text-[#b7c0d4]">Todavía no hay ninguna ranqueada grabada.</p>

  return (
    <ul className="space-y-2">
      {rows.map(({ replay, score }) => {
        const names = namesOf(replay)
        return (
          <li key={replay.matchId} className="bg-[#0e1528] border border-[#243056] rounded-xl p-4">
            <p className="text-sm font-bold text-white">
              {names.left} {score} {names.right}
            </p>
            <p className="text-xs text-[#b7c0d4]">{GAME_NAME[replay.gameId] ?? replay.gameId}</p>
          </li>
        )
      })}
    </ul>
  )
}

export default ReplayBoard
