// ==========================================
// Hook: usePlayerStats
//
// Pide GET /users/:id/history y expone carga, error y reintento.
// Las cifras vienen del servidor. No se recalculan en el cliente.
// ==========================================

import { useEffect, useState } from 'react'
import { EMPTY_HISTORY, fetchPlayerHistory, type PlayerHistory } from '../api/historyApi'

type HistoryStatus = 'loading' | 'success' | 'error'

export const usePlayerStats = (userId: string) => {
  const [status, setStatus] = useState<HistoryStatus>('loading')
  const [stats, setStats] = useState<PlayerHistory>(EMPTY_HISTORY)
  const [error, setError] = useState<string | null>(null)
  const [attempt, setAttempt] = useState(0)

  useEffect(() => {
    let cancelled = false
    setStatus('loading')
    setError(null)

    void fetchPlayerHistory(userId).then((result) => {
      if (cancelled) return
      if (!result.ok) {
        setStatus('error')
        setError(result.message)
        return
      }
      setStats(result.stats)
      setStatus('success')
    })

    return () => {
      cancelled = true
    }
  }, [userId, attempt])

  const retry = () => {
    setAttempt((current) => current + 1)
  }

  return { status, stats, error, retry }
}
