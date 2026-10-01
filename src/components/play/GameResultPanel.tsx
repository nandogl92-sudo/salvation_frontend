import { AlertCircle, Home, RefreshCcw, Trophy } from 'lucide-react'
import { formatPoints } from '../utils/formatPoints'
import { handleActivateKey } from '../utils/handleActivateKey'

export type GameResult = {
  won: boolean
  profit: number
  isRefund: boolean
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
            <span className="font-bold text-text-100">{formatPoints(betAmount)} puntos</span> han sido devueltos.
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
            Tus puntos no cambian.
          </p>
          <p className="text-text-200 text-sm">
            Puntos:{' '}
            <span className="font-bold text-text-100">{formatPoints(balance)}</span>
          </p>
        </>
      ) : result.won ? (
        <>
          <div className="bg-accent-100/10 text-accent-100 p-5 rounded-full">
            <Trophy className="w-12 h-12" aria-hidden="true" />
          </div>
          <h2 className="text-3xl font-bold text-text-100">¡Ganaste!</h2>
          <div className="text-center space-y-1">
            <p className="text-text-200 text-sm">Puntos ganados (comisión {feePercent}% incluida)</p>
            <p className="text-4xl font-bold text-accent-100">+{formatPoints(result.profit)}</p>
          </div>
          <p className="text-text-200 text-sm">
            Puntos:{' '}
            <span className="font-bold text-text-100">{formatPoints(balance)}</span>
          </p>
        </>
      ) : (
        <>
          <div className="bg-primary-100/10 text-primary-100 p-5 rounded-full">
            <AlertCircle className="w-12 h-12" aria-hidden="true" />
          </div>
          <h2 className="text-3xl font-bold text-text-100">Perdiste</h2>
          <div className="text-center space-y-1">
            <p className="text-text-200 text-sm">Puntos perdidos</p>
            <p className="text-4xl font-bold text-primary-100">-{formatPoints(betAmount)}</p>
          </div>
          <p className="text-text-200 text-sm">
            Puntos:{' '}
            <span className="font-bold text-text-100">{formatPoints(balance)}</span>
          </p>
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
