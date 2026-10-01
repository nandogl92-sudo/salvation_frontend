import { useState, type ChangeEvent } from 'react'
import { AlertCircle, WifiOff } from 'lucide-react'
import type { Game, QueueStatus, UserProfile } from '../../types'
import { formatPoints } from '../utils/formatPoints'
import { handleActivateKey } from '../utils/handleActivateKey'
import { usePointsRanking } from '../home/usePointsRanking'

type LobbyPanelProps = {
  selectedGame: Game
  balance: number
  betAmount: number
  queueStatus: QueueStatus
  onBetChange: (amount: number) => void
  onCancel: () => void
  onRetry: () => void
  onChangeBet: () => void
  onPlayBot: () => void
  queueError: string | null
  currentUser: UserProfile
  lastRivalId: string | null
  onPlayRival: (rival: UserProfile) => void
}

const LobbyPanel = ({
  selectedGame,
  balance,
  betAmount,
  queueStatus,
  onBetChange,
  onCancel,
  onRetry,
  onChangeBet,
  onPlayBot,
  queueError,
  currentUser,
  lastRivalId,
  onPlayRival,
}: LobbyPanelProps) => {
  const hasInsufficientBalance = betAmount > balance
  const isInvalidBet = hasInsufficientBalance || betAmount <= 0
  const isSearching = queueStatus === 'searching'
  const isTimeout = queueStatus === 'timeout'
  const [selectedRivalId, setSelectedRivalId] = useState<string | null>(null)
  const { status: rivalsStatus, ranking, error: rivalsError, retry } = usePointsRanking(currentUser)
  const rivals = ranking.filter((user) => user.id !== currentUser.id)
  const selectedRival = rivals.find((user) => user.id === selectedRivalId) ?? null

  const handleBetChange = (event: ChangeEvent<HTMLInputElement>) => {
    onBetChange(Number(event.target.value))
  }

  const handlePlay = () => {
    if (isInvalidBet || rivals.length === 0) return
    if (selectedRival) {
      onPlayRival(selectedRival)
      return
    }
    const unseen = rivals.filter((user) => user.id !== lastRivalId)
    const pool = unseen.length > 0 ? unseen : rivals
    const index = Math.floor(Math.random() * pool.length)
    const picked = pool[index]
    if (!picked) return
    onPlayRival(picked)
  }

  const handleRetryRivals = () => {
    retry()
  }

  const handleRetry = () => {
    if (isInvalidBet) return
    onRetry()
  }

  return (
    <div className="max-w-md mx-auto bg-bg-100 rounded-3xl shadow-sm border border-bg-300 p-8 animate-fade-in">
      <div className="text-center mb-8">
        <div className="bg-primary-300 w-20 h-20 rounded-2xl flex items-center justify-center text-primary-100 mx-auto mb-4">
          {selectedGame.icon}
        </div>
        <h2 className="text-2xl font-bold">{selectedGame.name}</h2>
        <p className="text-text-200 text-sm mt-2">Elige rival y cuántos puntos pones en juego. Si no eliges, toca uno al azar.</p>
      </div>

      <div className="space-y-6">
        <div className="bg-bg-200 p-4 rounded-xl">
          <label htmlFor="bet-amount" className="block text-sm font-bold text-text-100 mb-2">
            Puntos en juego
          </label>
          <div className="flex items-center gap-2">
            <input
              id="bet-amount"
              type="number"
              aria-label="Cantidad de puntos"
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
            <span>Puntos insuficientes. Tienes {formatPoints(balance)}</span>
          </div>
        )}

        {queueError && (
          <div className="flex items-center gap-2 text-red-500 text-sm bg-red-50 p-3 rounded-lg" role="alert">
            <AlertCircle className="w-4 h-4" aria-hidden="true" />
            <span>{queueError}</span>
          </div>
        )}

        {isTimeout ? (
          <div className="space-y-3">
            <div className="flex items-center gap-2 text-text-200 text-sm bg-bg-200 p-3 rounded-lg" role="status">
              <WifiOff className="w-4 h-4 flex-shrink-0" aria-hidden="true" />
              <span>
                No hay otro jugador con {formatPoints(betAmount)} puntos en {selectedGame.name}. Puedes jugar contra el bot de prueba. Esa partida no cambia tus puntos.
              </span>
            </div>
            <button
              type="button"
              aria-label="Jugar contra bot de prueba"
              tabIndex={0}
              onClick={onPlayBot}
              onKeyDown={(event) => handleActivateKey(event, onPlayBot)}
              className="w-full py-4 rounded-xl font-bold text-lg bg-accent-100 hover:bg-accent-200 text-white shadow-md hover:shadow-lg transition-all"
            >
              Jugar contra el bot
            </button>
            <button
              type="button"
              aria-label="Seguir buscando rival"
              tabIndex={0}
              onClick={handleRetry}
              onKeyDown={(event) => handleActivateKey(event, handleRetry)}
              disabled={isInvalidBet}
              className="w-full py-3 rounded-xl font-bold text-text-100 bg-bg-200 hover:bg-bg-300 transition-colors disabled:opacity-60 disabled:cursor-not-allowed"
            >
              Seguir buscando
            </button>
            <button
              type="button"
              aria-label="Cambiar puntos"
              tabIndex={0}
              onClick={onChangeBet}
              onKeyDown={(event) => handleActivateKey(event, onChangeBet)}
              className="w-full py-3 rounded-xl font-bold text-text-100 bg-bg-200 hover:bg-bg-300 transition-colors"
            >
              Cambiar puntos
            </button>
          </div>
        ) : (
          <div className="space-y-3">
            <p className="text-sm font-bold text-text-100">Rival</p>
            {rivalsStatus === 'loading' && rivals.length === 0 && (
              <p className="text-sm text-text-200" role="status">Cargando jugadores...</p>
            )}
            {rivalsStatus === 'error' && (
              <div className="space-y-2" role="alert">
                <p className="text-sm text-red-500">{rivalsError}</p>
                <button
                  type="button"
                  aria-label="Reintentar cargar jugadores"
                  tabIndex={0}
                  onClick={handleRetryRivals}
                  onKeyDown={(event) => handleActivateKey(event, handleRetryRivals)}
                  className="text-sm font-bold underline"
                >
                  Reintentar
                </button>
              </div>
            )}
            {rivals.length === 0 && rivalsStatus === 'success' && (
              <p className="text-sm text-text-200">No hay otros jugadores registrados.</p>
            )}
            {rivals.length > 0 && (
              <div className="max-h-48 overflow-y-auto space-y-2" role="listbox" aria-label="Jugadores registrados">
                {rivals.map((user) => {
                  const isSelected = user.id === selectedRivalId
                  const rowClass = isSelected
                    ? 'border-accent-100 bg-accent-100/10'
                    : 'border-bg-300 bg-bg-200'
                  const handleSelectRival = () => {
                    setSelectedRivalId(user.id)
                  }
                  return (
                    <button
                      key={user.id}
                      type="button"
                      role="option"
                      aria-selected={isSelected}
                      aria-label={`Elegir a ${user.username}`}
                      tabIndex={0}
                      onClick={handleSelectRival}
                      onKeyDown={(event) => handleActivateKey(event, handleSelectRival)}
                      className={`w-full flex items-center justify-between rounded-xl border px-3 py-2 text-left ${rowClass}`}
                    >
                      <span className="font-bold text-sm text-text-100">{user.username}</span>
                      <span className="text-xs text-text-200">{formatPoints(user.balance)} pts</span>
                    </button>
                  )
                })}
              </div>
            )}
            <button
              type="button"
              aria-label={selectedRival ? `Jugar contra ${selectedRival.username}` : 'Jugar contra un rival al azar'}
              tabIndex={0}
              onClick={handlePlay}
              onKeyDown={(event) => handleActivateKey(event, handlePlay)}
              disabled={isInvalidBet || rivals.length === 0 || isSearching}
              className="w-full py-4 rounded-xl font-bold text-lg bg-accent-100 hover:bg-accent-200 text-white shadow-md hover:shadow-lg transition-all disabled:opacity-60 disabled:cursor-not-allowed"
            >
              {isSearching ? 'Entrando...' : selectedRival ? `Jugar contra ${selectedRival.username}` : 'Jugar'}
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
