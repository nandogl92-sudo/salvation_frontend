import type { ReactNode } from 'react'
import type { MatchPlayer } from '../../types'

type PlayingArenaProps = {
  username: string
  opponent: MatchPlayer | null
  betAmount: number
  children: ReactNode
}

const PlayingArena = ({ username, opponent, betAmount, children }: PlayingArenaProps) => {
  const opponentName = opponent?.username ?? 'Rival'
  const opponentLabel = opponent?.isBot ? 'Bot de prueba (modo prueba)' : 'Rival (emparejado)'

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
          <span className="text-xs font-bold text-text-200 uppercase tracking-widest">Pozo Total</span>
          <span className="text-xl font-bold text-accent-100">${(betAmount * 2).toFixed(2)}</span>
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
        <div className="absolute top-4 left-4 flex gap-2 pointer-events-none">
          <span className="bg-black/50 text-white text-xs px-2 py-1 rounded backdrop-blur-sm flex items-center gap-1">
            <span className="w-2 h-2 rounded-full bg-accent-100" aria-hidden="true" /> Ping: 24ms
          </span>
        </div>
        <div className="absolute bottom-4 left-0 w-full text-center pointer-events-none">
          <span className="bg-black/50 text-white/70 text-xs px-4 py-2 rounded-lg backdrop-blur-sm shadow-sm inline-block mb-4">
            Controles — <b>P1</b>: WASD / Espacio | <b>P2</b>: Flechas / Enter
          </span>
        </div>
      </div>
    </>
  )
}

export default PlayingArena
