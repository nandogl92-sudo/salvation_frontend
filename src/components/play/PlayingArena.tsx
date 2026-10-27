import { useEffect, type ReactNode } from 'react'
import type { MatchPlayer } from '../../types'
import { formatPoints } from '../utils/formatPoints'
import TouchControls from './TouchControls'

type PlayingArenaProps = {
  username: string
  opponent: MatchPlayer | null
  betAmount: number
  isRanked?: boolean
  gameId?: string
  stickSide?: 'left' | 'right'
  children: ReactNode
  controlsHint?: string
}

const PlayingArena = ({ username, opponent, betAmount, isRanked, gameId, stickSide, children, controlsHint }: PlayingArenaProps) => {
  const opponentName = opponent?.username ?? 'Rival'
  const opponentLabel = opponent?.username === 'Bot de prueba (modo prueba)'
    ? 'Bot de prueba (modo prueba)'
    : isRanked
      ? 'Otra persona'
      : 'Rival'

  useEffect(() => {
    const root = document.documentElement
    const previousRoot = root.style.overflow
    const previousBody = document.body.style.overflow
    root.style.overflow = 'hidden'
    document.body.style.overflow = 'hidden'
    const stopPageScroll = (event: KeyboardEvent) => {
      const scrolls = event.key === 'ArrowUp'
        || event.key === 'ArrowDown'
        || event.key === 'ArrowLeft'
        || event.key === 'ArrowRight'
        || event.key === ' '
        || event.key === 'PageUp'
        || event.key === 'PageDown'
      if (!scrolls) return
      event.preventDefault()
    }
    window.addEventListener('keydown', stopPageScroll)
    return () => {
      root.style.overflow = previousRoot
      document.body.style.overflow = previousBody
      window.removeEventListener('keydown', stopPageScroll)
    }
  }, [])

  return (
    <div className="flex min-h-0 flex-1 flex-col gap-2">
      <div className="shrink-0 [@media(orientation:landscape)_and_(max-height:520px)]:hidden bg-bg-100 rounded-2xl shadow-sm border border-bg-300 p-2 sm:p-4 flex justify-between items-center gap-2">
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
          <span className="text-xs font-bold text-text-200 uppercase tracking-widest">
            {isRanked ? 'Ranqueada' : 'Amistoso'}
          </span>
          <span className="text-xl font-bold text-accent-100">{formatPoints(betAmount * 2)} fichas</span>
          <span className="mt-1 text-xs text-text-200">
            {isRanked ? 'Si ganas, +1 punto del mes' : 'No suma al premio'}
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

      <div className={`relative flex min-h-0 flex-1 flex-col overflow-hidden border-4 border-bg-100 rounded-xl bg-black [touch-action:none] ${gameId === 'tetris' || gameId === 'pong' || gameId === 'combat' ? '[@media(orientation:landscape)_and_(max-height:520px)_and_(max-width:1023px)]:flex-row [@media(orientation:landscape)_and_(max-height:520px)_and_(max-width:1023px)]:items-center' : ''}`}>
        <div className={`flex h-full min-h-0 w-full min-w-0 flex-1 items-center justify-center overflow-hidden [&_canvas]:block [&_canvas]:max-h-full [&_canvas]:max-w-full [&_canvas]:min-h-0 [&_canvas]:min-w-0 [&_canvas]:!h-auto [&_canvas]:!w-auto ${gameId === 'tetris' || gameId === 'pong' || gameId === 'combat' ? '[@media(orientation:landscape)_and_(max-height:520px)_and_(max-width:1023px)]:order-2 [@media(orientation:landscape)_and_(max-height:520px)_and_(max-width:1023px)]:h-full' : ''}`}>
          {children}
        </div>
        {gameId ? <TouchControls gameId={gameId} stickSide={stickSide} /> : null}
      </div>
      <p className="shrink-0 text-center text-xs text-text-200 [@media(orientation:landscape)_and_(max-height:520px)]:hidden">
        {controlsHint ?? (
          <>
            Controles — <b>P1</b>: WASD / Espacio | <b>P2</b>: Flechas / Enter
          </>
        )}
      </p>
    </div>
  )
}

export default PlayingArena
