import { Trophy } from 'lucide-react'
import { currentMonthLabel, isCurrentSubscriptionMonth } from '../../api/subscriptionsApi'
import { COUNTED_WEEK_COUNT, WEEK_COUNT, monthTotalOf, weekRowsOf } from '../../matchmaking/rankedWeeks'
import type { UserProfile } from '../../types'
import { formatPoints } from '../utils/formatPoints'
import { handleActivateKey } from '../utils/handleActivateKey'
import { monthPointsOf } from '../utils/monthPointsOf'
import { usePointsRanking } from './usePointsRanking'

type PointsRankingProps = {
  currentUser: UserProfile | null
}

const PointsRanking = ({ currentUser }: PointsRankingProps) => {
  const { status, ranking, error, retry } = usePointsRanking(currentUser)
  const monthLabel = currentMonthLabel()
  const prizeRanking = ranking.filter((user) => isCurrentSubscriptionMonth(user.subscriptionMonth))
  const competes = isCurrentSubscriptionMonth(currentUser?.subscriptionMonth)
  const ownMonthPoints = currentUser ? monthTotalOf(currentUser.id) : 0
  const ownPlace = prizeRanking.findIndex((user) => user.id === currentUser?.id) + 1
  const weekRows = currentUser && competes ? weekRowsOf(currentUser.id) : []

  const handleRetry = () => {
    retry()
  }

  return (
    <aside className="bg-bg-100 rounded-2xl border border-bg-300 p-5" aria-label={`Clasificación de ${monthLabel}`}>
      <h2 className="text-lg font-bold text-text-100 mb-1">Clasificación de {monthLabel}</h2>
      <p className="text-sm text-text-200">
        Solo el 1.º elige el premio. El 1.º aún se puede alcanzar: el mes no está cerrado.
      </p>
      <p className="text-sm text-text-200 mb-4">
        El mes tiene {WEEK_COUNT} semanas. Cuentan las {COUNTED_WEEK_COUNT} mejores. Una semana ruin se descarta.
      </p>

      {currentUser && competes && (
        <div className="mb-4 space-y-3">
          <p className="text-sm font-bold text-text-100" aria-label={`${formatPoints(ownMonthPoints)} puntos del mes, suma de las ${COUNTED_WEEK_COUNT} mejores semanas`}>
            Tus puntos del mes: {formatPoints(ownMonthPoints)}
            {ownPlace > 0 ? ` · puesto ${ownPlace}` : ''}
          </p>
          <ul className="grid grid-cols-2 gap-2" aria-label="Puntos por semana del mes">
            {weekRows.map((row) => {
              const stateClass = row.counts
                ? 'border-accent-100/40 bg-accent-100/5'
                : 'border-bg-300 bg-bg-200 opacity-70'
              return (
                <li key={row.week} className={`rounded-xl border px-3 py-2 ${stateClass}`}>
                  <p className="text-xs font-bold text-text-100">
                    {row.label}
                    {row.isCurrent ? ' · ahora' : ''}
                  </p>
                  <p className="text-sm font-bold text-text-100">{formatPoints(row.points)} pts</p>
                  <p className="text-[10px] uppercase tracking-wide text-text-200">
                    {row.counts ? 'Cuenta' : 'Se descarta'}
                  </p>
                </li>
              )
            })}
          </ul>
          <p className="text-xs text-text-200">
            Total = {COUNTED_WEEK_COUNT} mejores semanas, no las {WEEK_COUNT}.
          </p>
        </div>
      )}

      {currentUser && !competes && (
        <p className="text-sm text-text-200 mb-4">
          No optas al premio este mes. Con la inscripción de {monthLabel} entrarías en esta lista.
        </p>
      )}

      {!currentUser && (
        <p className="text-sm text-text-200">Entra para ver quién va primero este mes.</p>
      )}

      {currentUser && status === 'loading' && ranking.length === 0 && (
        <p className="text-sm text-text-200" role="status">Cargando clasificación...</p>
      )}

      {currentUser && status === 'error' && (
        <div className="space-y-3" role="alert">
          <p className="text-sm text-red-500">{error}</p>
          <button
            type="button"
            aria-label="Reintentar cargar la clasificación"
            tabIndex={0}
            onClick={handleRetry}
            onKeyDown={(event) => handleActivateKey(event, handleRetry)}
            className="text-sm font-bold underline text-text-100"
          >
            Reintentar
          </button>
        </div>
      )}

      {currentUser && status !== 'error' && prizeRanking.length === 0 && ranking.length > 0 && (
        <p className="text-sm text-text-200">Aún no hay inscritos compitiendo este mes.</p>
      )}

      {currentUser && prizeRanking.length > 0 && (
        <ol className="space-y-2">
          {prizeRanking.map((user, index) => {
            const isFirst = index === 0
            const rowClass = isFirst
              ? 'bg-accent-100/10 border-accent-100'
              : 'bg-bg-200 border-bg-300'
            const points = user.id === currentUser.id ? ownMonthPoints : monthPointsOf(user)
            return (
              <li
                key={user.id}
                className={`flex items-center justify-between gap-3 rounded-xl border px-3 py-2 ${rowClass}`}
              >
                <div className="flex items-center gap-2 min-w-0">
                  <span className="text-xs font-bold text-text-200 w-5">{index + 1}</span>
                  {isFirst && <Trophy className="w-4 h-4 text-accent-100 shrink-0" aria-hidden="true" />}
                  <span className="font-bold text-sm text-text-100 truncate">{user.username}</span>
                  {isFirst && (
                    <span className="text-[10px] font-bold uppercase tracking-wide text-accent-100 shrink-0">
                      Elige el premio
                    </span>
                  )}
                </div>
                <span className="text-sm font-bold text-text-100 shrink-0">
                  {formatPoints(points)} pts mes
                </span>
              </li>
            )
          })}
        </ol>
      )}
    </aside>
  )
}

export default PointsRanking
