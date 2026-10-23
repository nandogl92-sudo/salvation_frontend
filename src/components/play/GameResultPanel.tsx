import { AlertCircle, Home, RefreshCcw, Trophy } from 'lucide-react'
import { formatPoints } from '../utils/formatPoints'
import { handleActivateKey } from '../utils/handleActivateKey'

export type GameResult = {
  won: boolean
  profit: number
  isRefund: boolean
  isRanked: boolean
  monthPoints: number
  monthPointsDelta: number
}

type GameResultPanelProps = {
  result: GameResult
  betAmount: number
  balance: number
  feePercent: number
  onGoHome: () => void
}

const GameResultPanel = ({
  result,
  betAmount,
  balance,
  feePercent,
  onGoHome,
}: GameResultPanelProps) => {
  const handleGoHome = () => {
    onGoHome()
  }

  const monthPointsMessage = !result.isRanked
    ? 'Esta partida no cambia los puntos del mes (amistoso o bot).'
    : result.won && result.monthPointsDelta > 0
      ? `+1 a tus 3 mejores semanas. Ahora tienes ${formatPoints(result.monthPoints)}.`
      : result.won
        ? `Esta semana no entra en las 3 mejores. Sigues con ${formatPoints(result.monthPoints)}.`
        : `Los puntos del mes no bajan. Sigues con ${formatPoints(result.monthPoints)}.`

  return (
    <div className="flex flex-col items-center justify-center py-16 space-y-6">
      {result.isRefund ? (
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
          <div className="bg-bg-300 text-text-200 p-5 rounded-full">
            <Trophy className="w-12 h-12" aria-hidden="true" />
          </div>
          <h2 className="text-3xl font-bold text-text-100">
            {result.won ? 'Ganaste' : 'Perdiste'}
          </h2>
          <p className="text-text-200 text-center max-w-sm">
            Tus fichas no cambian.
          </p>
          <p className="text-text-200 text-sm">
            Fichas:{' '}
            <span className="font-bold text-text-100">{formatPoints(balance)}</span>
          </p>
          <p className="text-text-200 text-sm text-center max-w-sm">{monthPointsMessage}</p>
        </>
      ) : result.won ? (
        <>
          <div className="bg-accent-100/10 text-accent-100 p-5 rounded-full">
            <Trophy className="w-12 h-12" aria-hidden="true" />
          </div>
          <h2 className="text-3xl font-bold text-text-100">¡Ganaste!</h2>
          <div className="text-center space-y-1">
            <p className="text-text-200 text-sm">Fichas ganadas (comisión {feePercent}% incluida)</p>
            <p className="text-4xl font-bold text-accent-100">+{formatPoints(result.profit)}</p>
          </div>
          <p className="text-text-200 text-sm">
            Fichas:{' '}
            <span className="font-bold text-text-100">{formatPoints(balance)}</span>
          </p>
          <p className="text-text-200 text-sm text-center max-w-sm">{monthPointsMessage}</p>
        </>
      ) : (
        <>
          <div className="bg-primary-100/10 text-primary-100 p-5 rounded-full">
            <AlertCircle className="w-12 h-12" aria-hidden="true" />
          </div>
          <h2 className="text-3xl font-bold text-text-100">Perdiste</h2>
          <div className="text-center space-y-1">
            <p className="text-text-200 text-sm">Fichas perdidas</p>
            <p className="text-4xl font-bold text-primary-100">-{formatPoints(betAmount)}</p>
          </div>
          <p className="text-text-200 text-sm">
            Fichas:{' '}
            <span className="font-bold text-text-100">{formatPoints(balance)}</span>
          </p>
          <p className="text-text-200 text-sm text-center max-w-sm">{monthPointsMessage}</p>
        </>
      )}

      <button
        type="button"
        aria-label="Volver al inicio"
        tabIndex={0}
        onClick={handleGoHome}
        onKeyDown={(event) => handleActivateKey(event, handleGoHome)}
        className="mt-4 flex items-center gap-2 bg-primary-100 hover:bg-primary-200 text-white px-8 py-3 rounded-xl font-bold transition-colors"
      >
        <Home className="w-5 h-5" aria-hidden="true" />
        Volver al inicio
      </button>
    </div>
  )
}

export default GameResultPanel
