import type { ChangeEvent } from 'react'
import { AlertCircle, WifiOff } from 'lucide-react'
import type { Game, QueueStatus } from '../../types'
import { handleActivateKey } from '../utils/handleActivateKey'

type LobbyPanelProps = {
  selectedGame: Game
  balance: number
  betAmount: number
  queueStatus: QueueStatus
  onBetChange: (amount: number) => void
  onSearch: () => void
  onCancel: () => void
  onRetry: () => void
  onChangeBet: () => void
  onPlayBot: () => void
  onStartVsBot: () => void
}

const LobbyPanel = ({
  selectedGame,
  balance,
  betAmount,
  queueStatus,
  onBetChange,
  onSearch,
  onCancel,
  onRetry,
  onChangeBet,
  onPlayBot,
  onStartVsBot,
}: LobbyPanelProps) => {
  const hasInsufficientBalance = betAmount > balance
  const isInvalidBet = hasInsufficientBalance || betAmount <= 0
  const isSearching = queueStatus === 'searching'
  const isTimeout = queueStatus === 'timeout'

  const handleBetChange = (event: ChangeEvent<HTMLInputElement>) => {
    onBetChange(Number(event.target.value))
  }

  const handleSearch = () => {
    if (isSearching || isInvalidBet) return
    onSearch()
  }

  const handleRetry = () => {
    if (isInvalidBet) return
    onRetry()
  }

  const handleStartVsBot = () => {
    if (isInvalidBet) return
    onStartVsBot()
  }

  const searchButtonClass = isSearching
    ? 'bg-bg-300 text-text-200 cursor-not-allowed'
    : 'bg-accent-100 hover:bg-accent-200 text-white shadow-md hover:shadow-lg'

  return (
    <div className="max-w-md mx-auto bg-bg-100 rounded-3xl shadow-sm border border-bg-300 p-8 animate-fade-in">
      <div className="text-center mb-8">
        <div className="bg-primary-300 w-20 h-20 rounded-2xl flex items-center justify-center text-primary-100 mx-auto mb-4">
          {selectedGame.icon}
        </div>
        <h2 className="text-2xl font-bold">{selectedGame.name}</h2>
        <p className="text-text-200 text-sm mt-2">Configura tu apuesta para buscar oponente.</p>
      </div>

      <div className="space-y-6">
        <div className="bg-bg-200 p-4 rounded-xl">
          <label htmlFor="bet-amount" className="block text-sm font-bold text-text-100 mb-2">
            Cantidad a apostar (USD)
          </label>
          <div className="flex items-center gap-2">
            <span className="text-lg font-bold text-text-200">$</span>
            <input
              id="bet-amount"
              type="number"
              aria-label="Cantidad a apostar en dólares"
              value={betAmount}
              onChange={handleBetChange}
              min="1"
              max={balance}
              disabled={isSearching}
              className="w-full bg-transparent text-2xl font-bold text-text-100 focus:outline-none"
            />
          </div>
        </div>

        {hasInsufficientBalance && (
          <div className="flex items-center gap-2 text-red-500 text-sm bg-red-50 p-3 rounded-lg" role="alert">
            <AlertCircle className="w-4 h-4" aria-hidden="true" />
            <span>Saldo insuficiente. Tienes ${balance.toFixed(2)}</span>
          </div>
        )}

        {isTimeout ? (
          <div className="space-y-3">
            <div className="flex items-center gap-2 text-text-200 text-sm bg-bg-200 p-3 rounded-lg" role="status">
              <WifiOff className="w-4 h-4 flex-shrink-0" aria-hidden="true" />
              <span>
                No encontramos rival para ${betAmount} en {selectedGame.name} en 60 segundos.
              </span>
            </div>
            <button
              type="button"
              aria-label="Seguir buscando rival"
              tabIndex={0}
              onClick={handleRetry}
              onKeyDown={(event) => handleActivateKey(event, handleRetry)}
              disabled={isInvalidBet}
              className="w-full py-4 rounded-xl font-bold text-lg bg-accent-100 hover:bg-accent-200 text-white shadow-md hover:shadow-lg transition-all disabled:opacity-60 disabled:cursor-not-allowed"
            >
              Seguir buscando
            </button>
            <button
              type="button"
              aria-label="Cambiar apuesta"
              tabIndex={0}
              onClick={onChangeBet}
              onKeyDown={(event) => handleActivateKey(event, onChangeBet)}
              className="w-full py-3 rounded-xl font-bold text-text-100 bg-bg-200 hover:bg-bg-300 transition-colors"
            >
              Cambiar apuesta
            </button>
            <button
              type="button"
              aria-label="Jugar contra bot de prueba"
              tabIndex={0}
              onClick={onPlayBot}
              onKeyDown={(event) => handleActivateKey(event, onPlayBot)}
              className="w-full py-3 text-sm text-text-200 hover:text-text-100 font-medium transition-colors underline"
            >
              Jugar contra bot de prueba (modo prueba)
            </button>
          </div>
        ) : (
          <div className="space-y-3">
            <button
              type="button"
              aria-label={isSearching ? 'Buscando oponente' : 'Buscar rival real'}
              tabIndex={0}
              onClick={handleSearch}
              onKeyDown={(event) => handleActivateKey(event, handleSearch)}
              disabled={isSearching || isInvalidBet}
              className={`w-full py-4 rounded-xl font-bold text-lg transition-all flex items-center justify-center gap-2 ${searchButtonClass}`}
            >
              {isSearching ? (
                <>
                  <div
                    className="w-5 h-5 border-2 border-text-200 border-t-transparent rounded-full animate-spin"
                    aria-hidden="true"
                  />
                  Buscando oponente...
                </>
              ) : (
                'Buscar rival real'
              )}
            </button>
            <div className="flex items-center gap-3 text-xs text-text-200">
              <div className="flex-1 h-px bg-bg-300" />
              <span>o</span>
              <div className="flex-1 h-px bg-bg-300" />
            </div>
            <button
              type="button"
              aria-label="Jugar ahora contra bot"
              tabIndex={0}
              onClick={handleStartVsBot}
              onKeyDown={(event) => handleActivateKey(event, handleStartVsBot)}
              disabled={isInvalidBet}
              className="w-full py-3 rounded-xl font-bold text-primary-100 border-2 border-primary-100 hover:bg-primary-300 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
            >
              Jugar ahora vs Bot
            </button>
          </div>
        )}

        {!isTimeout && (
          <button
            type="button"
            aria-label="Cancelar y volver al inicio"
            tabIndex={0}
            onClick={onCancel}
            onKeyDown={(event) => handleActivateKey(event, onCancel)}
            className="w-full py-3 text-text-200 font-medium hover:text-text-100 transition-colors"
          >
            Cancelar
          </button>
        )}
      </div>
    </div>
  )
}

export default LobbyPanel
