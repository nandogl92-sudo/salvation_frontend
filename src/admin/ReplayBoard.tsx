import { useEffect, useState } from 'react'
import { listReplays, type ReplayHead } from '../api/replaysApi'

const GAME_NAME: Record<string, string> = {
  pong: 'Paddle Duel',
  snake: 'Aero Rings',
  tetris: 'Slot Car Racing',
  combat: 'Sky Drop',
}

const whenLabel = (iso: string): string => {
  const date = new Date(iso)
  if (Number.isNaN(date.getTime())) return 'Sin fecha'
  return new Intl.DateTimeFormat('es-ES', {
    timeZone: 'Europe/Madrid',
    day: 'numeric',
    month: 'short',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  }).format(date)
}

const namesOf = (replay: ReplayHead): string => {
  const left = replay.players.find((player) => player.side === 'p1')?.username ?? 'Jugador 1'
  const right = replay.players.find((player) => player.side === 'p2')?.username ?? 'Jugador 2'
  return `${left} y ${right}`
}

const resultOf = (replay: ReplayHead): string => {
  if (replay.outcome === 'refund') return 'Partida reembolsada.'
  if (replay.outcome === 'decided' && replay.winnerName && replay.loserName) {
    return `${replay.winnerName} ha ganado. ${replay.loserName} ha perdido.`
  }
  if (replay.outcome === 'decided' && replay.winnerName) return `${replay.winnerName} ha ganado.`
  return 'Todavía no hay resultado.'
}

const ReplayBoard = () => {
  const [rows, setRows] = useState<ReplayHead[]>([])
  const [message, setMessage] = useState<string | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    let cancelled = false
    listReplays().then((listed) => {
      if (cancelled) return
      setLoading(false)
      if (listed.ok !== true) {
        setMessage(listed.message)
        return
      }
      setRows(listed.replays)
    })
    return () => {
      cancelled = true
    }
  }, [])

  if (loading) return <p className="text-sm text-[#b7c0d4]">Cargando partidas…</p>
  if (message) return <p className="text-sm text-red-300" role="alert">{message}</p>
  if (rows.length === 0) return <p className="text-sm text-[#b7c0d4]">Todavía no hay ninguna partida guardada.</p>

  return (
    <ul className="space-y-2">
      {rows.map((replay) => (
        <li key={replay.matchId} className="bg-[#0e1528] border border-[#243056] rounded-xl p-4 space-y-1">
          <p className="text-sm font-bold text-white">{GAME_NAME[replay.gameId] ?? replay.gameId}</p>
          <p className="text-xs text-[#d5dcf0]">{whenLabel(replay.playedAt)}</p>
          <p className="text-sm text-white">{namesOf(replay)}</p>
          <p className="text-sm text-[#b7c0d4]">{resultOf(replay)}</p>
        </li>
      ))}
    </ul>
  )
}

export default ReplayBoard
