import { Trophy } from 'lucide-react'
import type { UserProfile } from '../../types'
import { formatPoints } from '../utils/formatPoints'
import { handleActivateKey } from '../utils/handleActivateKey'
import { usePointsRanking } from './usePointsRanking'

type PointsRankingProps = {
  currentUser: UserProfile | null
}

const PointsRanking = ({ currentUser }: PointsRankingProps) => {
  const { status, ranking, error, retry } = usePointsRanking(currentUser)

  const handleRetry = () => {
    retry()
  }

  return (
    <aside className="bg-bg-100 rounded-2xl border border-bg-300 p-5" aria-label="Clasificación de puntos">
      <h2 className="text-lg font-bold text-text-100 mb-4">Clasificación</h2>

      {!currentUser && (
        <p className="text-sm text-text-200">Entra para ver quién tiene más puntos.</p>
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

      {currentUser && ranking.length > 0 && (
        <ol className="space-y-2">
          {ranking.map((user, index) => {
            const isFirst = index === 0
            const rowClass = isFirst
              ? 'bg-accent-100/10 border-accent-100'
              : 'bg-bg-200 border-bg-300'
            return (
              <li
                key={user.id}
                className={`flex items-center justify-between gap-3 rounded-xl border px-3 py-2 ${rowClass}`}
              >
                <div className="flex items-center gap-2 min-w-0">
                  <span className="text-xs font-bold text-text-200 w-5">{index + 1}</span>
                  {isFirst && <Trophy className="w-4 h-4 text-accent-100 shrink-0" aria-hidden="true" />}
                  <span className="font-bold text-sm text-text-100 truncate">{user.username}</span>
                </div>
                <span className="text-sm font-bold text-text-100 shrink-0">
                  {formatPoints(user.balance)} pts
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
