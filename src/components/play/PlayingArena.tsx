import type { ReactNode } from 'react'
import type { MatchPlayer } from '../../types'
import { formatPoints } from '../utils/formatPoints'

type PlayingArenaProps = {
  username: string
  opponent: MatchPlayer | null
  betAmount: number
  children: ReactNode
  controlsHint?: string
}

const PlayingArena = ({ username, opponent, betAmount, children, controlsHint }: PlayingArenaProps) => {
  const opponentName = opponent?.username ?? 'Rival'
  const opponentLabel = opponent?.username === 'Bot de prueba (modo prueba)'
    ? 'Bot de prueba (modo prueba)'
    : 'Rival'

  return (
    <>
      <div className="bg-bg-100 rounded-2xl shadow-sm border border-bg-300 p-4 flex justify-between items-center">
        <div className="flex items-center gap-3">
          <div
            className="w-10 h-10 bg-primary-300 text-primary-100 rounded-full flex items-center justify-center font-bold"
            aria-hidden="true"
          >
            {username.charAt(0).toUpperCase()}
          </div>
          <div>
            <div className="font-bold">{username}</div>
            <div className="text-xs text-text-200">Tú (Local)</div>
          </div>
        </div>

        <div className="flex flex-col items-center">
          <span className="text-xs font-bold text-text-200 uppercase tracking-widest">Puntos en juego</span>
          <span className="text-xl font-bold text-accent-100">{formatPoints(betAmount * 2)} pts</span>
          <span className="mt-1 text-xs text-text-200 flex items-center gap-1">
            <span className="w-2 h-2 rounded-full bg-accent-100" aria-hidden="true" />
            Ping: 24ms
          </span>
        </div>

        <div className="flex items-center gap-3 text-right">
          <div>
            <div className="font-bold">{opponentName}</div>
            <div className="text-xs text-text-200">{opponentLabel}</div>
          </div>
          <div
            className="w-10 h-10 bg-bg-300 text-text-100 rounded-full flex items-center justify-center font-bold"
            aria-hidden="true"
          >
            {opponentName.charAt(0).toUpperCase()}
          </div>
        </div>
      </div>

      <div className="w-full relative overflow-hidden flex flex-col items-center justify-center border-4 border-bg-100 rounded-xl bg-black">
        {children}
      </div>
      <p className="text-center text-xs text-text-200">
        {controlsHint ?? (
          <>
            Controles — <b>P1</b>: WASD / Espacio | <b>P2</b>: Flechas / Enter
          </>
        )}
      </p>
    </>
  )
}

export default PlayingArena
