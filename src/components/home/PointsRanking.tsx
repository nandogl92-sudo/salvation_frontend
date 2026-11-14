import { Trophy } from 'lucide-react'
import { currentMonthLabel, isCurrentSubscriptionMonth } from '../../api/subscriptionsApi'
import { COUNTED_WEEK_COUNT, WEEK_COUNT, currentWeekIndex } from '../../matchmaking/rankedWeeks'
import type { MonthWeek, UserProfile } from '../../types'
import { formatPoints } from '../utils/formatPoints'
import { handleActivateKey } from '../utils/handleActivateKey'
import { monthPointsOf } from '../utils/monthPointsOf'
import TournamentBadges from '../profile/TournamentBadges'
import { usePointsRanking } from './usePointsRanking'

type PointsRankingProps = {
  currentUser: UserProfile | null
}

const WEEK_RANGE: Record<number, [number, number]> = {
  1: [1, 7],
  2: [8, 14],
  3: [15, 21],
}

const madridMonthLength = (): number => {
  const parts = new Intl.DateTimeFormat('en-CA', {
    timeZone: 'Europe/Madrid',
    year: 'numeric',
    month: 'numeric',
  }).formatToParts(new Date())
  const read = (type: string): number => Number(parts.find((part) => part.type === type)?.value ?? '1')
  return new Date(read('year'), read('month'), 0).getDate()
}

const currentWeekLabel = (week: number): string => {
  const range = WEEK_RANGE[week] ?? [22, madridMonthLength()]
  return `Semana ${week} en curso, días ${range[0]} al ${range[1]}.`
}

const weekCardsOf = (stored: MonthWeek[]): MonthWeek[] => {
  return Array.from({ length: WEEK_COUNT }, (_, index) => {
    const week = index + 1
    const found = stored.find((row) => row.week === week)
    if (found) return found
    return { week, points: 0, counts: index < COUNTED_WEEK_COUNT }
  })
}

const PointsRanking = ({ currentUser }: PointsRankingProps) => {
  const { status, ranking, error, retry } = usePointsRanking(currentUser)
  const monthLabel = currentMonthLabel()
  const prizeRanking = ranking.filter((user) => isCurrentSubscriptionMonth(user.subscriptionMonth))
  const competes = isCurrentSubscriptionMonth(currentUser?.subscriptionMonth)
  const me = ranking.find((user) => user.id === currentUser?.id)
  const ownMonthPoints = monthPointsOf(me ?? currentUser)
  const ownPlace = prizeRanking.findIndex((user) => user.id === currentUser?.id) + 1
  const weekRows = weekCardsOf(me?.weeks ?? currentUser?.weeks ?? [])
  const currentWeek = currentWeekIndex() + 1

  const handleRetry = () => {
    retry()
  }

  return (
    <aside className="bg-bg-100 rounded-2xl border border-bg-300 p-5" aria-label={`Clasificación de ${monthLabel}`}>
      <h2 className="text-lg font-bold text-text-100 mb-1">Clasificación de {monthLabel}</h2>
      <p className="text-sm text-text-200 mb-4">
        {`El premio lo elige quien acabe primero. Cuentan las ${COUNTED_WEEK_COUNT} mejores semanas de ${WEEK_COUNT}.`}
      </p>

      {currentUser && competes && (
        <div className="mb-4 space-y-3">
          <p className="text-sm font-bold text-text-100" aria-label={`${formatPoints(ownMonthPoints)} puntos del mes, suma de las ${COUNTED_WEEK_COUNT} mejores semanas`}>
            Tus puntos del mes: {formatPoints(ownMonthPoints)}
            {ownPlace > 0 ? ` · puesto ${ownPlace}` : ''}
          </p>
          <p className="text-xs text-text-200">
            {currentWeekLabel(currentWeek)}
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

      {currentUser && (
        <ul className="mb-4 grid grid-cols-2 gap-2" aria-label="Puntos por semana del mes">
          {weekRows.map((row) => {
            const isCurrent = row.week === currentWeek
            let stateClass = 'border-[#3ec8ff]/40 bg-[#3ec8ff]/5'
            let status = 'Cuenta'
            let statusClass = 'text-[#3ec8ff]'
            let titleClass = 'text-text-100'
            if (isCurrent) {
              stateClass = 'border-[#ff8c24] bg-[#ff8c24]/15'
              status = 'En curso'
              statusClass = 'text-[#ff8c24]'
              titleClass = 'text-[#ff8c24]'
            } else if (!row.counts) {
              stateClass = 'border-primary-100 bg-primary-100/15'
              status = 'Descartada'
              statusClass = 'text-primary-100'
            } else if (row.week < currentWeek) {
              stateClass = 'border-accent-100 bg-accent-100/15'
              status = 'Completada'
              statusClass = 'text-accent-100'
            }
            return (
              <li key={row.week} className={`rounded-xl border px-3 py-2 ${stateClass}`}>
                <p className={`text-xs font-bold ${titleClass}`}>
                  {`Semana ${row.week}`}
                </p>
                <p className="text-sm font-bold text-text-100">{formatPoints(row.points)} pts</p>
                <p className={`text-[10px] font-bold uppercase tracking-wide ${statusClass}`}>
                  {status}
                </p>
              </li>
            )
          })}
        </ul>
      )}

      {currentUser && prizeRanking.length > 0 && (
        <ol className="space-y-2">
          {prizeRanking.map((user, index) => {
            const isYou = user.id === currentUser.id
            const points = isYou ? ownMonthPoints : monthPointsOf(user)
            const leaderPoints = prizeRanking[0].id === currentUser.id
              ? ownMonthPoints
              : monthPointsOf(prizeRanking[0])
            const tiebreakOn = prizeRanking.some((row) => row.tiebreakRole === 'alive' || row.tiebreakRole === 'champion')
            const hasChampion = prizeRanking.some((row) => row.tiebreakRole === 'champion')
            const isTied = tiebreakOn
              ? !hasChampion && user.tiebreakRole === 'alive'
              : prizeRanking.filter((row) => {
                const rowPoints = row.id === currentUser.id ? ownMonthPoints : monthPointsOf(row)
                return rowPoints === leaderPoints
              }).length > 1 && points === leaderPoints
            const isFirst = tiebreakOn ? user.tiebreakRole === 'champion' : index === 0 && !isTied
            const rowClass = isYou
              ? 'bg-[#ff8c24]/15 border-[#ff8c24]'
              : isFirst
                ? 'bg-accent-100/10 border-accent-100'
                : 'bg-bg-200 border-bg-300'
            const nameClass = isYou ? 'text-[#ff8c24]' : 'text-text-100'
            return (
              <li
                key={user.id}
                className={`flex items-center justify-between gap-3 rounded-xl border px-3 py-2 ${rowClass}`}
              >
                <div className="flex items-center gap-2 min-w-0">
                  <span className="text-xs font-bold text-text-200 w-5 shrink-0">{index + 1}</span>
                  {isFirst && <Trophy className="w-4 h-4 text-accent-100 shrink-0" aria-hidden="true" />}
                  <span className={`font-bold text-sm truncate ${nameClass}`}>{user.username}</span>
                  {isTied && (
                    <span className="text-[10px] font-bold uppercase tracking-wide text-[#3ec8ff] shrink-0">
                      Empate
                    </span>
                  )}
                  {isFirst && (
                    <span className="text-[10px] font-bold uppercase tracking-wide text-accent-100 shrink-0">
                      Elige el premio
                    </span>
                  )}
                </div>
                <span className="flex items-center gap-1.5 shrink-0">
                  <TournamentBadges wins={user.tournamentWins} />
                  <span className={`text-sm font-bold ${nameClass}`}>
                    {formatPoints(points)} pts mes
                  </span>
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
