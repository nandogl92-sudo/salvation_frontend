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
    ? 'Se gana un punto del mes.'
    : null

  const trophyClass = result.won
    ? 'bg-accent-100/10 text-accent-100'
    : 'bg-primary-100/10 text-primary-100'

  const homeButton = (
    <button
      type="button"
      aria-label="Volver al inicio"
      tabIndex={0}
      onClick={handleGoHome}
      onKeyDown={(event) => handleActivateKey(event, handleGoHome)}
      className="flex items-center gap-2 bg-primary-100 hover:bg-primary-200 text-white px-8 py-3 rounded-xl font-bold transition-colors"
    >
      <Home className="w-5 h-5" aria-hidden="true" />
      Volver al inicio
    </button>
  )

  if (result.isRefund) {
    return (
      <div className="flex flex-col items-center px-4 pt-8 space-y-5">
        <div className="bg-bg-300 text-text-200 p-5 rounded-full">
          <RefreshCcw className="w-12 h-12" aria-hidden="true" />
        </div>
        <h2 className="text-2xl font-bold text-text-100">Partida cancelada</h2>
        <p className="text-text-200 text-center max-w-sm">
          Se produjo un error de plataforma. Tus{' '}
          <span className="font-bold text-text-100">{formatPoints(betAmount)} fichas</span> han sido devueltas.
        </p>
        {homeButton}
      </div>
    )
  }

  return (
    <div className="flex flex-col items-center px-4 pt-8 space-y-5">
      <div className={`${trophyClass} p-5 rounded-full`}>
        <Trophy className="w-12 h-12" aria-hidden="true" />
      </div>
      {homeButton}
      {monthChipMessage && (
        <p className="text-text-100 text-center max-w-sm font-bold">{monthChipMessage}</p>
      )}
    </div>
  )
}

export default GameResultPanel
