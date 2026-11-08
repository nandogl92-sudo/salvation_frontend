import { useState } from 'react'
import { Home, RefreshCcw, Trophy } from 'lucide-react'
import { formatPoints } from '../utils/formatPoints'
import { handleActivateKey } from '../utils/handleActivateKey'

export type GameResult = {
  won: boolean
  profit: number
  isRefund: boolean
  isRanked: boolean
  monthPoints: number
  monthPointsDelta: number
  byAbandon?: boolean
  pending?: boolean
}

type GameResultPanelProps = {
  result: GameResult
  betAmount: number
  onGoHome: () => void
}

const GameResultPanel = ({
  result,
  betAmount,
  onGoHome,
}: GameResultPanelProps) => {
  const [leaving, setLeaving] = useState(false)
  const handleGoHome = () => {
    if (leaving) return
    setLeaving(true)
    onGoHome()
  }

  const monthChipMessage = result.isRanked && result.won && result.monthPointsDelta > 0
    ? 'Se gana una ficha de un mes.'
    : null

  const abandonMessage = !result.byAbandon
    ? null
    : result.won
      ? 'El rival salió, recargó o se desconectó.'
      : 'Saliste de la partida, recargaste o se cortó la conexión.'

  const outcomeTitle = result.byAbandon
    ? result.won
      ? 'Ganaste por abandono'
      : 'Perdiste por abandono'
    : result.won
      ? '¡Ganaste!'
      : 'Perdiste'

  const trophyClass = result.won
    ? 'bg-accent-100/10 text-accent-100'
    : 'bg-primary-100/10 text-primary-100'

  return (
    <div className="flex flex-col items-center justify-center py-16 space-y-6">
      {result.pending ? (
        <>
          <div className={`${trophyClass} p-5 rounded-full`}>
            <Trophy className="w-12 h-12" aria-hidden="true" />
          </div>
          <h2 className="text-3xl font-bold text-text-100">{outcomeTitle}</h2>
          <p className="text-text-200 text-center max-w-sm">Guardando las fichas...</p>
        </>
      ) : result.isRefund ? (
        <>
          <div className="bg-bg-300 text-text-200 p-5 rounded-full">
            <RefreshCcw className="w-12 h-12" aria-hidden="true" />
          </div>
          <h2 className="text-2xl font-bold text-text-100">Partida cancelada</h2>
          <p className="text-text-200 text-center max-w-sm">
            Se produjo un error de plataforma. Tus{' '}
            <span className="font-bold text-text-100">{formatPoints(betAmount)} fichas</span> han sido devueltas.
          </p>
        </>
      ) : result.profit === 0 ? (
        <>
          <div className={`${trophyClass} p-5 rounded-full`}>
            <Trophy className="w-12 h-12" aria-hidden="true" />
          </div>
          <h2 className="text-3xl font-bold text-text-100">{outcomeTitle}</h2>
          <p className="text-text-200 text-center max-w-sm">
            {abandonMessage ?? 'Tus fichas no cambian.'}
          </p>
          {monthChipMessage && (
            <p className="text-text-200 text-sm text-center max-w-sm">{monthChipMessage}</p>
          )}
        </>
      ) : result.won ? (
        <>
          <div className="bg-accent-100/10 text-accent-100 p-5 rounded-full">
            <Trophy className="w-12 h-12" aria-hidden="true" />
          </div>
          <h2 className="text-3xl font-bold text-text-100">{outcomeTitle}</h2>
          {abandonMessage && (
            <p className="text-text-200 text-sm text-center max-w-sm">{abandonMessage}</p>
          )}
          <div className="text-center space-y-1">
            <p className="text-text-200 text-sm">Fichas ganadas</p>
            <p className="text-4xl font-bold text-accent-100">+{formatPoints(result.profit)}</p>
          </div>
          {monthChipMessage && (
            <p className="text-text-200 text-sm text-center max-w-sm">{monthChipMessage}</p>
          )}
        </>
      ) : (
        <>
          <div className="bg-primary-100/10 text-primary-100 p-5 rounded-full">
            <Trophy className="w-12 h-12" aria-hidden="true" />
          </div>
          <h2 className="text-3xl font-bold text-text-100">{outcomeTitle}</h2>
          {abandonMessage && (
            <p className="text-text-200 text-sm text-center max-w-sm">{abandonMessage}</p>
          )}
          <div className="text-center space-y-1">
            <p className="text-text-200 text-sm">Fichas perdidas</p>
            <p className="text-4xl font-bold text-primary-100">-{formatPoints(betAmount)}</p>
          </div>
        </>
      )}

      <button
        type="button"
        aria-label="Volver al inicio"
        tabIndex={0}
        disabled={leaving && result.pending}
        onClick={handleGoHome}
        onKeyDown={(event) => handleActivateKey(event, handleGoHome)}
        className="mt-4 flex items-center gap-2 bg-primary-100 hover:bg-primary-200 text-white px-8 py-3 rounded-xl font-bold transition-colors disabled:opacity-70"
      >
        <Home className="w-5 h-5" aria-hidden="true" />
        {leaving && result.pending ? 'Guardando las fichas...' : 'Volver al inicio'}
      </button>
    </div>
  )
}

export default GameResultPanel
