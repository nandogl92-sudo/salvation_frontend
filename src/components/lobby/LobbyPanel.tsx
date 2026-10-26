import { useState } from 'react'
import { AlertCircle, WifiOff } from 'lucide-react'
import { isCurrentSubscriptionMonth } from '../../api/subscriptionsApi'
import {
  RANKED_PER_DAY,
  RANKED_PER_RIVAL_WEEK,
  canRankedVsRival,
  rankedLeftToday,
  rankedVsRivalThisWeek,
} from '../../matchmaking/rankedLimits'
import type { Game, PlayMode, QueueStatus, UserProfile } from '../../types'
import { formatPoints } from '../utils/formatPoints'
import { handleActivateKey } from '../utils/handleActivateKey'
import { usePointsRanking } from '../home/usePointsRanking'

type LobbyPanelProps = {
  selectedGame: Game
  balance: number
  betAmount: number
  queueStatus: QueueStatus
  onCancel: () => void
  onRetry: (isRanked: boolean) => void
  onPlayBot: () => void
  queueError: string | null
  queueHold: string | null
  currentUser: UserProfile
  lastRivalId: string | null
  onPlayRival: (rival: UserProfile, isRanked: boolean) => void
}

const LobbyPanel = ({
  selectedGame,
  balance,
  betAmount,
  queueStatus,
  onCancel,
  onRetry,
  onPlayBot,
  queueError,
  queueHold,
  currentUser,
  lastRivalId,
  onPlayRival,
}: LobbyPanelProps) => {
  const hasInsufficientBalance = betAmount > balance
  const isInvalidBet = hasInsufficientBalance || betAmount <= 0
  const isSearching = queueStatus === 'searching'
  const isTimeout = queueStatus === 'timeout'
  const canRanked = isCurrentSubscriptionMonth(currentUser.subscriptionMonth)
  const [playMode, setPlayMode] = useState<PlayMode>(canRanked ? 'ranked' : 'friendly')
  const [selectedRivalId, setSelectedRivalId] = useState<string | null>(null)
  const { status: rivalsStatus, ranking, error: rivalsError, retry } = usePointsRanking(
    currentUser,
    !isSearching && playMode === 'friendly',
  )
  const allRivals = ranking.filter((user) => user.id !== currentUser.id)
  const rankedRivals = allRivals.filter((user) => isCurrentSubscriptionMonth(user.subscriptionMonth))
  const eligibleRanked = rankedRivals.filter((user) => canRankedVsRival(currentUser.id, user.id))
  const leftToday = rankedLeftToday(currentUser.id)
  const isRanked = playMode === 'ranked'
  const selectedRival = allRivals.find((user) => user.id === selectedRivalId) ?? null
  const weekBlockedCount = rankedRivals.filter((user) => {
    return rankedVsRivalThisWeek(currentUser.id, user.id) >= RANKED_PER_RIVAL_WEEK
  }).length

  const handleSelectRanked = () => {
    if (!canRanked) return
    setPlayMode('ranked')
    setSelectedRivalId(null)
  }

  const handleSelectFriendly = () => {
    setPlayMode('friendly')
  }

  const handlePlay = () => {
    if (isInvalidBet) return
    if (isRanked) {
      if (!canRanked) return
      onRetry(true)
      return
    }
    if (allRivals.length === 0) return
    if (selectedRival) {
      onPlayRival(selectedRival, false)
      return
    }
    const unseen = allRivals.filter((user) => user.id !== lastRivalId)
    const pool = unseen.length > 0 ? unseen : allRivals
    const index = Math.floor(Math.random() * pool.length)
    const picked = pool[index]
    if (!picked) return
    onPlayRival(picked, false)
  }

  const handleRetryRivals = () => {
    retry()
  }

  const handleRetry = () => {
    if (isInvalidBet) return
    onRetry(isRanked)
  }

  const rankedClass = isRanked
    ? 'bg-accent-100 text-white'
    : 'bg-bg-200 text-text-100'
  const friendlyClass = !isRanked
    ? 'bg-accent-100 text-white'
    : 'bg-bg-200 text-text-100'

  const rankedBlocked = !canRanked
  const playDisabled = isInvalidBet || isSearching || (isRanked
    ? rankedBlocked
    : allRivals.length === 0)

  const playLabel = isRanked
    ? 'Buscar a otra persona'
    : selectedRival
      ? `Jugar amistoso contra ${selectedRival.username}`
      : 'Jugar amistoso contra un rival al azar'

  return (
    <div className="max-w-md mx-auto bg-bg-100 rounded-3xl shadow-sm border border-bg-300 p-8 animate-fade-in">
      <div className="text-center mb-8">
        <div className="bg-primary-300 w-20 h-20 rounded-2xl flex items-center justify-center text-primary-100 mx-auto mb-4">
          {selectedGame.icon}
        </div>
        <h2 className="text-2xl font-bold">{selectedGame.name}</h2>
        <p className="text-text-200 text-sm mt-2">
          Ranking: otra persona. Amistoso: bot o práctica. Cada partida se juega por 1 ficha.
        </p>
      </div>

      <div className="space-y-6">
        <div className="grid grid-cols-2 gap-2" role="group" aria-label="Tipo de partida">
          <button
            type="button"
            aria-label="Elegir partida de ranking"
            aria-pressed={isRanked}
            tabIndex={0}
            onClick={handleSelectRanked}
            onKeyDown={(event) => handleActivateKey(event, handleSelectRanked)}
            disabled={!canRanked || isSearching}
            className={`py-3 rounded-xl text-sm font-bold disabled:opacity-50 disabled:cursor-not-allowed ${rankedClass}`}
          >
            Ranking
          </button>
          <button
            type="button"
            aria-label="Elegir partida amistosa"
            aria-pressed={!isRanked}
            tabIndex={0}
            onClick={handleSelectFriendly}
            onKeyDown={(event) => handleActivateKey(event, handleSelectFriendly)}
            disabled={isSearching}
            className={`py-3 rounded-xl text-sm font-bold disabled:opacity-50 disabled:cursor-not-allowed ${friendlyClass}`}
          >
            Amistoso
          </button>
        </div>

        {isRanked ? (
          <div className="space-y-2">
            <p className="text-xs text-text-200">
              Ranking: otra persona. El bot no se usa. La cola elige rival.
            </p>
            <p className="text-sm font-bold text-text-100" aria-label={`${leftToday} ranqueadas restantes de ${RANKED_PER_DAY} hoy`}>
              Te quedan {leftToday} de {RANKED_PER_DAY} ranqueadas hoy
            </p>
          </div>
        ) : (
          <p className="text-xs text-text-200">
            Amistoso: bot o persona de prueba. No cambia los puntos del mes ni el puesto del premio.
          </p>
        )}

        {!canRanked && (
          <p className="text-xs text-text-200">
            Paga la inscripción de este mes para una ranqueada.
          </p>
        )}

        {isRanked && canRanked && leftToday <= 0 && (
          <p className="text-sm text-text-200" role="status">
            El servidor corta al llegar a {RANKED_PER_DAY} ranqueadas terminadas hoy.
          </p>
        )}

        {isRanked && canRanked && leftToday > 0 && eligibleRanked.length === 0 && rankedRivals.length > 0 && (
          <p className="text-sm text-text-200" role="status">
            Contra esos rivales ya no suma esta semana (máximo {RANKED_PER_RIVAL_WEEK}). Juega amistoso.
          </p>
        )}

        {isRanked && canRanked && leftToday > 0 && rankedRivals.length === 0 && rivalsStatus === 'success' && (
          <p className="text-sm text-text-200">No hay otros inscritos este mes para una ranqueada.</p>
        )}

        {isRanked && weekBlockedCount > 0 && leftToday > 0 && eligibleRanked.length > 0 && (
          <p className="text-xs text-text-200">
            Hay rivales con los que ya no suma esta semana. Esos duelos solo salen en amistoso.
          </p>
        )}

        <div className="bg-bg-200 p-4 rounded-xl">
          <p className="block text-sm font-bold text-text-100 mb-2">Fichas en juego</p>
          <p className="text-2xl font-bold text-text-100" aria-label={`${formatPoints(betAmount)} fichas en juego`}>
            {formatPoints(betAmount)} ficha
          </p>
          <p className="text-xs text-text-200 mt-2">Tienes {formatPoints(balance)} fichas. No son puntos del premio.</p>
        </div>

        {hasInsufficientBalance && (
          <div className="flex items-center gap-2 text-red-500 text-sm bg-red-50 p-3 rounded-lg" role="alert">
            <AlertCircle className="w-4 h-4" aria-hidden="true" />
            <span>Fichas insuficientes. Tienes {formatPoints(balance)} fichas</span>
          </div>
        )}

        {queueError && (
          <div className="flex items-center gap-2 text-red-500 text-sm bg-red-50 p-3 rounded-lg" role="alert">
            <AlertCircle className="w-4 h-4" aria-hidden="true" />
            <span>{queueError}</span>
          </div>
        )}

        {isSearching ? (
          <div className="space-y-3">
            <div className="flex items-center gap-2 text-text-200 text-sm bg-bg-200 p-3 rounded-lg" role="status">
              <WifiOff className="w-4 h-4 flex-shrink-0" aria-hidden="true" />
              <span>
                {queueHold
                  ? `Encontrado: ${queueHold}. Esperando a que entre en la misma partida.`
                  : isRanked
                  ? 'Esperando a otra persona. El bot no se usa. Buscad los dos a la vez; el móvil puede tardar un poco más.'
                  : 'Buscando rival...'}
              </span>
            </div>
          </div>
        ) : isTimeout ? (
          <div className="space-y-3">
            <div className="flex items-center gap-2 text-text-200 text-sm bg-bg-200 p-3 rounded-lg" role="status">
              <WifiOff className="w-4 h-4 flex-shrink-0" aria-hidden="true" />
              <span>
                {isRanked
                  ? 'No coincidió la búsqueda. Pulsa Seguir buscando los dos a la vez. El móvil tarda más; tened Ranking y el mismo juego.'
                  : `No hay otra persona en ${selectedGame.name}. Puedes jugar contra el bot de prueba. No suma al premio.`}
              </span>
            </div>
            {!isRanked && (
              <button
                type="button"
                aria-label="Jugar amistoso contra bot de prueba"
                tabIndex={0}
                onClick={onPlayBot}
                onKeyDown={(event) => handleActivateKey(event, onPlayBot)}
                className="w-full py-4 rounded-xl font-bold text-lg bg-accent-100 hover:bg-accent-200 text-white shadow-md hover:shadow-lg transition-all"
              >
                Jugar contra el bot
              </button>
            )}
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
          </div>
        ) : (
          <div className="space-y-3">
            {!isRanked && (
              <>
                <p className="text-sm font-bold text-text-100">Rival</p>
                {rivalsStatus === 'loading' && allRivals.length === 0 && (
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
                {allRivals.length === 0 && rivalsStatus === 'success' && (
                  <p className="text-sm text-text-200">No hay otros jugadores registrados.</p>
                )}
                {allRivals.length > 0 && (
                  <div className="max-h-48 overflow-y-auto space-y-2" role="listbox" aria-label="Jugadores para amistoso">
                    {allRivals.map((user) => {
                      const isSelected = user.id === selectedRivalId
                      const weekUsed = rankedVsRivalThisWeek(currentUser.id, user.id)
                      const noMoreRanked = weekUsed >= RANKED_PER_RIVAL_WEEK
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
                          aria-label={noMoreRanked ? `Elegir a ${user.username}, ya no suma esta semana` : `Elegir a ${user.username}`}
                          tabIndex={0}
                          onClick={handleSelectRival}
                          onKeyDown={(event) => handleActivateKey(event, handleSelectRival)}
                          className={`w-full flex items-center justify-between gap-2 rounded-xl border px-3 py-2 text-left ${rowClass}`}
                        >
                          <span className="font-bold text-sm text-text-100 truncate">{user.username}</span>
                          <span className="text-xs text-text-200 shrink-0">
                            {noMoreRanked ? 'Ya no suma esta semana' : `${formatPoints(user.balance)} fichas`}
                          </span>
                        </button>
                      )
                    })}
                  </div>
                )}
              </>
            )}
            {isRanked && rivalsStatus === 'loading' && rankedRivals.length === 0 && (
              <p className="text-sm text-text-200" role="status">Buscando inscritos...</p>
            )}
            {isRanked && rivalsStatus === 'error' && (
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
            <button
              type="button"
              aria-label={playLabel}
              tabIndex={0}
              onClick={handlePlay}
              onKeyDown={(event) => handleActivateKey(event, handlePlay)}
              disabled={playDisabled}
              className="w-full py-4 rounded-xl font-bold text-lg bg-accent-100 hover:bg-accent-200 text-white shadow-md hover:shadow-lg transition-all disabled:opacity-60 disabled:cursor-not-allowed"
            >
              {isRanked ? 'Buscar a otra persona' : selectedRival ? `Amistoso vs ${selectedRival.username}` : 'Jugar amistoso'}
            </button>
            {!isRanked && (
              <p className="text-xs text-text-200 text-center">
                Si no hay persona, al acabar la espera puedes jugar contra el bot.
              </p>
            )}
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
