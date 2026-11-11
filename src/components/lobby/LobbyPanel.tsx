import { useEffect, useRef, useState, type ChangeEvent } from 'react'
import { createPortal } from 'react-dom'
import { AlertCircle, Check, LoaderCircle, WifiOff } from 'lucide-react'
import { type ActivePlayer, type FriendlyLookResult } from '../../api/matchmakingApi'
import { getTodayRaffle, type RaffleSeat } from '../../api/raffleApi'
import { isCurrentSubscriptionMonth } from '../../api/subscriptionsApi'
import type { Game, PlayMode, QueueStatus, UserProfile } from '../../types'
import { formatPoints } from '../utils/formatPoints'
import { handleActivateKey } from '../utils/handleActivateKey'
import { usePointsRanking } from '../home/usePointsRanking'

const FriendlyPicker = ({
  users,
  error,
  onChoose,
}: {
  users: ActivePlayer[]
  error: string | null
  onChoose: (player: ActivePlayer) => void
}) => {
  return (
    <div className="space-y-3">
      <p className="text-sm font-bold text-text-100">Jugadores activos</p>
      <p className="text-xs text-text-200">
        Solo aparecen quienes tienen abierto Amistoso en este mismo juego.
      </p>
      {error && <p className="text-sm text-red-500" role="alert">{error}</p>}
      {users.length === 0 && (
        <p className="text-sm text-text-200" role="status">
          No hay otros jugadores activos ahora. El rival tiene que entrar en Amistoso, en este mismo juego.
        </p>
      )}
      {users.length > 0 && (
        <div className="max-h-48 overflow-y-auto space-y-2" role="listbox" aria-label="Jugadores activos">
          {users.map((user) => {
            const handleChoose = () => {
              onChoose(user)
            }
            return (
              <button
                key={user.id}
                type="button"
                role="option"
                aria-selected={false}
                aria-label={`Jugar con ${user.username}`}
                tabIndex={0}
                onClick={handleChoose}
                onKeyDown={(event) => handleActivateKey(event, handleChoose)}
                className="w-full flex items-center justify-between gap-2 rounded-xl border border-bg-300 bg-bg-200 px-3 py-2 text-left"
              >
                <span className="font-bold text-sm text-text-100 truncate">{user.username}</span>
                <span className="text-xs font-bold text-accent-100 shrink-0">Activo</span>
              </button>
            )
          })}
        </div>
      )}
    </div>
  )
}

const GAME_POSTER: Record<string, string> = {
  pong: '/paddle-duel-cover.jpg',
  snake: '/aero-rings-cover.jpg',
  tetris: '/slot-car-cover-2.jpg',
  combat: '/sky-drop-cover.jpg',
}

type LobbyPanelProps = {
  selectedGame: Game
  balance: number
  betAmount: number
  queueStatus: QueueStatus
  onCancel: () => void
  onRetry: (isRanked: boolean, accessCode: string) => void
  queueError: string | null
  queueHold: string | null
  currentUser: UserProfile
  onBeginFriendlyWait: () => void
  onEndFriendlyWait: () => void
  onFriendlyLook: (rivalUserId: string | null, stamp: number, requestStamp: number, reject: boolean) => Promise<FriendlyLookResult>
  onFriendlyStop: () => void
}

const LobbyPanel = ({
  selectedGame,
  balance,
  betAmount,
  queueStatus,
  onCancel,
  onRetry,
  queueError,
  queueHold,
  currentUser,
  onBeginFriendlyWait,
  onEndFriendlyWait,
  onFriendlyLook,
  onFriendlyStop,
}: LobbyPanelProps) => {
  const hasInsufficientBalance = betAmount > balance
  const isInvalidBet = hasInsufficientBalance || betAmount <= 0
  const isSearching = queueStatus === 'searching'
  const isTimeout = queueStatus === 'timeout'
  const canRanked = isCurrentSubscriptionMonth(currentUser.subscriptionMonth)
  const [playMode, setPlayMode] = useState<PlayMode>(canRanked ? 'ranked' : 'friendly')
  const [selectedRivalId, setSelectedRivalId] = useState<string | null>(null)
  const [accessCode, setAccessCode] = useState('')
  const [codeError, setCodeError] = useState<string | null>(null)
  const [raffleSeats, setRaffleSeats] = useState<RaffleSeat[] | null>(null)
  const [friendlyOpen, setFriendlyOpen] = useState(!canRanked)
  const [friendlyConnected, setFriendlyConnected] = useState(false)
  const [activeUsers, setActiveUsers] = useState<ActivePlayer[]>([])
  const [friendlyError, setFriendlyError] = useState<string | null>(null)
  const [waitingName, setWaitingName] = useState<string | null>(null)
  const [invite, setInvite] = useState<ActivePlayer | null>(null)
  const lookRef = useRef(onFriendlyLook)
  const lookStampRef = useRef(0)
  const requestStampRef = useRef(0)
  const stopRef = useRef(onFriendlyStop)
  const endWaitRef = useRef(onEndFriendlyWait)
  lookRef.current = onFriendlyLook
  stopRef.current = onFriendlyStop
  endWaitRef.current = onEndFriendlyWait
  const { status: rivalsStatus, ranking, error: rivalsError, retry } = usePointsRanking(
    currentUser,
    !isSearching && playMode === 'ranked',
  )
  const allRivals = ranking.filter((user) => user.id !== currentUser.id)
  const rankedRivals = allRivals.filter((user) => isCurrentSubscriptionMonth(user.subscriptionMonth))
  const isRanked = playMode === 'ranked'

  const handleSelectRanked = () => {
    if (!canRanked || isSearching) return
    setFriendlyOpen(false)
    setFriendlyConnected(false)
    onFriendlyStop()
    setPlayMode('ranked')
    setSelectedRivalId(null)
    setWaitingName(null)
  }

  const handleSelectFriendly = () => {
    if (isSearching) return
    setPlayMode('friendly')
    setFriendlyOpen(true)
    setSelectedRivalId(null)
    setWaitingName(null)
  }

  const handleAccessCode = (event: ChangeEvent<HTMLInputElement>) => {
    setAccessCode(event.target.value.toUpperCase())
    setCodeError(null)
  }

  const handlePlay = () => {
    if (isInvalidBet) return
    if (isRanked) {
      if (!canRanked) return
      if (accessCode.trim() === '') {
        setCodeError('Escribe el código de tu pareja. Está en Sorteo de hoy.')
        return
      }
      onRetry(true, accessCode.trim().toUpperCase())
      return
    }
    setFriendlyError(null)
    setPlayerQuery('')
    setActiveUsers([])
    setFriendlyOpen(true)
  }

  const handleChoosePlayer = (player: ActivePlayer) => {
    lookStampRef.current += 1
    requestStampRef.current = lookStampRef.current
    setInvite(null)
    setSelectedRivalId(player.id)
    setWaitingName(player.username)
    setFriendlyError(null)
    onBeginFriendlyWait()
  }

  const handleCancelInvite = () => {
    const current = invite
    if (!current) return
    setInvite(null)
    lookStampRef.current += 1
    void lookRef.current(current.id, lookStampRef.current, 0, true)
  }

  useEffect(() => {
    if (!isRanked) return
    let stopped = false
    const load = () => {
      void getTodayRaffle().then((result) => {
        if (stopped || !result.ok) return
        setRaffleSeats(result.raffle.seats)
      })
    }
    load()
    const timer = window.setInterval(load, 8000)
    return () => {
      stopped = true
      window.clearInterval(timer)
    }
  }, [isRanked])

  const rankedCode = accessCode.trim().toUpperCase()
  const rankedSeat = rankedCode.length === 0 || !raffleSeats
    ? null
    : raffleSeats.find((seat) => seat.yours && seat.code === rankedCode) ?? null
  const rankedCodeMiss = isRanked && raffleSeats !== null && rankedCode.length >= 6 && !rankedSeat

  const handleTickRival = () => {
    if (!rankedSeat || isInvalidBet || isSearching) return
    onRetry(true, rankedCode)
  }

  const handleRetryRivals = () => {
    retry()
  }

  const handleRetry = () => {
    if (isInvalidBet) return
    if (isRanked && accessCode.trim() === '') {
      setCodeError('Escribe el código de tu pareja. Está en Sorteo de hoy.')
      return
    }
    onRetry(isRanked, accessCode.trim().toUpperCase())
  }

  useEffect(() => {
    if (isRanked || !friendlyOpen) return
    let stopped = false
    let inFlight = false
    const tick = async () => {
      if (stopped || inFlight) return
      inFlight = true
      lookStampRef.current += 1
      const rivalId = isSearching ? selectedRivalId : null
      const result = await lookRef.current(
        rivalId,
        lookStampRef.current,
        rivalId ? requestStampRef.current : 0,
        false,
      )
      inFlight = false
      if (stopped || (result.ok && result.status === 'matched')) return
      if (!result.ok) {
        setFriendlyConnected(false)
        setFriendlyError(result.message)
        return
      }
      setActiveUsers(result.users)
      setFriendlyConnected(true)
      setInvite(result.invite && result.invite.id !== selectedRivalId ? result.invite : null)
      if (result.declined) {
        requestStampRef.current = 0
        setSelectedRivalId(null)
        setWaitingName(null)
        endWaitRef.current()
        setFriendlyError(`${result.declined.username} ha cancelado la solicitud.`)
        return
      }
      setFriendlyError((current) => (current?.includes('ha cancelado la solicitud') ? current : null))
    }
    void tick()
    const timer = window.setInterval(() => {
      void tick()
    }, 2000)
    return () => {
      stopped = true
      window.clearInterval(timer)
    }
  }, [isRanked, friendlyOpen, isSearching, selectedRivalId])

  useEffect(() => {
    if (isRanked || !friendlyOpen) return
    return () => {
      stopRef.current()
    }
  }, [isRanked, friendlyOpen])

  const rankedClass = isRanked
    ? 'bg-accent-100 text-white'
    : 'bg-bg-200 text-text-100'
  const friendlyClass = !isRanked
    ? 'bg-accent-100 text-white'
    : 'bg-bg-200 text-text-100'

  const rankedBlocked = !canRanked
  const playDisabled = isInvalidBet || isSearching || (isRanked && rankedBlocked)

  const playLabel = isRanked ? 'Buscar a otra persona' : 'Jugar amistoso'

  return (
    <>
    <div className="max-w-md mx-auto bg-bg-100 rounded-3xl shadow-sm border border-bg-300 p-8 animate-fade-in">
      <div className="text-center mb-8">
        {GAME_POSTER[selectedGame.id] ? (
          <img
            src={GAME_POSTER[selectedGame.id]}
            alt=""
            className="mb-4 w-full rounded-2xl object-cover object-center"
          />
        ) : (
          <div className="bg-primary-300 w-20 h-20 rounded-2xl flex items-center justify-center text-primary-100 mx-auto mb-4">
            {selectedGame.icon}
          </div>
        )}
        <h2 className="text-2xl font-bold">{selectedGame.name}</h2>
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
          <p className="text-sm text-text-200">
            Si ganas, sumas 1 punto para el premio.
          </p>
        ) : (
          <p className="text-sm text-text-200">
            Elige a alguien que esté activo. La partida empieza cuando esa persona te elige a ti.
          </p>
        )}

        {!canRanked && (
          <p className="text-xs text-text-200">
            Paga la inscripción de este mes para una ranqueada.
          </p>
        )}

        {isRanked && canRanked && rankedRivals.length === 0 && rivalsStatus === 'success' && (
          <p className="text-sm text-text-200">No hay otros inscritos este mes para una ranqueada.</p>
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

        {isRanked && !isSearching && !isTimeout && (
          <div className="space-y-2">
            <label htmlFor="ranked-access-code" className="block text-sm font-bold text-text-100">
              Código de tu pareja
            </label>
            <input
              id="ranked-access-code"
              type="text"
              inputMode="text"
              autoComplete="off"
              maxLength={8}
              value={accessCode}
              aria-label="Código de tu pareja"
              placeholder="CÓDIGO"
              onChange={handleAccessCode}
              className="w-full rounded-xl border border-bg-300 bg-bg-200 px-4 py-3 text-center text-lg font-bold tracking-[0.35em] text-text-100 uppercase"
            />
            <p className="text-xs text-text-200">
              El código es el de tu pareja, en Sorteo de hoy. Solo vale 10 minutos desde la hora acordada.
            </p>
            {codeError && (
              <p className="text-sm text-red-500" role="alert">{codeError}</p>
            )}
            {rankedCodeMiss && (
              <p className="text-sm text-red-500" role="alert">El código no es correcto.</p>
            )}
            {rankedSeat?.rivalName && (
              <button
                type="button"
                aria-label={`Marcar a ${rankedSeat.rivalName}`}
                tabIndex={0}
                onClick={handleTickRival}
                onKeyDown={(event) => handleActivateKey(event, handleTickRival)}
                disabled={isInvalidBet}
                className="w-full flex items-center justify-between gap-3 rounded-xl border border-[#3ec8ff] bg-[#0e1528] px-4 py-3 text-left disabled:opacity-60"
              >
                <span className="font-bold text-text-100">{rankedSeat.rivalName}</span>
                <span className="inline-flex items-center gap-1 text-xs font-bold text-[#f5c518]">
                  <Check className="w-4 h-4" aria-hidden="true" />
                  Marcar
                </span>
              </button>
            )}
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
            <div className="flex items-center gap-2 text-text-200 text-sm bg-bg-200 p-3 rounded-lg" role="status" aria-live="polite">
              <LoaderCircle className="w-4 h-4 flex-shrink-0 animate-spin" aria-hidden="true" />
              <span>
                {queueHold
                  ? 'Encontrado. Entrando en la partida…'
                  : isRanked
                    ? 'Buscando a otra persona…'
                    : waitingName
                      ? `Esperando a que ${waitingName} acepte.`
                      : 'Buscando partida…'}
              </span>
            </div>
            {!isRanked && friendlyError && (
              <p className="text-sm text-red-500" role="alert">{friendlyError}</p>
            )}
            <button
              type="button"
              aria-label="Buscando"
              tabIndex={0}
              disabled
              className="w-full py-4 rounded-xl font-bold text-lg bg-accent-100 text-white shadow-md disabled:opacity-60 disabled:cursor-not-allowed"
            >
              Buscando…
            </button>
          </div>
        ) : isTimeout ? (
          <div className="space-y-3">
            <div className="flex items-center gap-2 text-text-200 text-sm bg-bg-200 p-3 rounded-lg" role="status">
              <WifiOff className="w-4 h-4 flex-shrink-0" aria-hidden="true" />
              <span>
                No coincidió la búsqueda. Pulsa Seguir buscando los dos a la vez. El móvil tarda más; tened Ranking, el mismo juego y el código de vuestra pareja.
              </span>
            </div>
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
            {!isRanked && friendlyOpen && (
              <>
                {friendlyConnected && (
                  <p className="text-sm font-bold text-accent-100" role="status">
                    Estás conectado a {selectedGame.name}.
                  </p>
                )}
                <FriendlyPicker
                  users={activeUsers}
                  error={friendlyError}
                  onChoose={handleChoosePlayer}
                />
              </>
            )}
            {!(isRanked || friendlyOpen) && (
              <button
                type="button"
                aria-label={playLabel}
                tabIndex={0}
                onClick={handlePlay}
                onKeyDown={(event) => handleActivateKey(event, handlePlay)}
                disabled={playDisabled}
                className="w-full py-4 rounded-xl font-bold text-lg bg-accent-100 hover:bg-accent-200 text-white shadow-md hover:shadow-lg transition-all disabled:opacity-60 disabled:cursor-not-allowed"
              >
                {playLabel}
              </button>
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
    {invite && createPortal(
      <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 px-4">
        <div
          role="dialog"
          aria-modal="true"
          aria-label={`Solicitud de ${invite.username}`}
          className="w-full max-w-sm rounded-2xl border border-[#3ec8ff] bg-[#0e1528] p-5 space-y-4"
        >
          <p className="text-base font-bold text-white">{invite.username} quiere jugar contigo.</p>
          <div className="flex gap-2">
            <button
              type="button"
              aria-label={`Aceptar partida con ${invite.username}`}
              tabIndex={0}
              onClick={() => handleChoosePlayer(invite)}
              onKeyDown={(event) => handleActivateKey(event, () => handleChoosePlayer(invite))}
              className="flex-1 py-3 rounded-xl font-bold bg-[#f5c518] text-[#1a1403]"
            >
              Aceptar
            </button>
            <button
              type="button"
              aria-label="Cancelar solicitud"
              tabIndex={0}
              onClick={handleCancelInvite}
              onKeyDown={(event) => handleActivateKey(event, handleCancelInvite)}
              className="flex-1 py-3 rounded-xl font-bold bg-bg-200 text-text-100"
            >
              Cancelar
            </button>
          </div>
        </div>
      </div>,
      document.body,
    )}
    </>
  )
}

export default LobbyPanel
