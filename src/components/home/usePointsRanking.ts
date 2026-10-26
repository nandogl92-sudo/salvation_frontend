import { useEffect, useState } from 'react'
import { listUsers } from '../../api/usersApi'
import { monthTotalOf } from '../../matchmaking/rankedWeeks'
import { monthPointsOf } from '../utils/monthPointsOf'
import type { UserProfile } from '../../types'

type RankingStatus = 'idle' | 'loading' | 'success' | 'error'

export const usePointsRanking = (currentUser: UserProfile | null, enabled = true) => {
  const [status, setStatus] = useState<RankingStatus>('idle')
  const [users, setUsers] = useState<UserProfile[]>([])
  const [error, setError] = useState<string | null>(null)
  const [attempt, setAttempt] = useState(0)

  const userId = currentUser?.id ?? ''
  const points = currentUser?.balance

  useEffect(() => {
    if (!userId || !enabled) {
      setStatus('idle')
      setUsers([])
      setError(null)
      return
    }

    let cancelled = false
    setStatus('loading')
    setError(null)

    void listUsers().then((result) => {
      if (cancelled) return
      if (!result.ok) {
        setStatus('error')
        setError(result.message)
        return
      }
      setUsers(result.users)
      setStatus('success')
    })

    return () => {
      cancelled = true
    }
  }, [userId, points, attempt, enabled])

  const ranking = users
    .map((user) => {
      if (currentUser && user.id === currentUser.id) {
        return {
          ...user,
          balance: currentUser.balance,
          monthPoints: monthTotalOf(currentUser.id),
          subscriptionMonth: currentUser.subscriptionMonth,
        }
      }
      return { ...user, monthPoints: monthPointsOf(user) }
    })
    .sort((left, right) => {
      const leftMonth = monthPointsOf(left)
      const rightMonth = monthPointsOf(right)
      if (rightMonth !== leftMonth) return rightMonth - leftMonth
      return left.username.localeCompare(right.username, 'es')
    })

  const retry = () => {
    setAttempt((current) => current + 1)
  }

  return { status, ranking, error, retry }
}
