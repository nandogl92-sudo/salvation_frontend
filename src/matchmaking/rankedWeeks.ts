const STORAGE_KEY = 'betplay.ranked.wins'

export const WEEK_COUNT = 4
export const COUNTED_WEEK_COUNT = 3

type RankedWin = {
  userId: string
  playedAt: number
}

export type WeekRow = {
  week: number
  label: string
  points: number
  counts: boolean
  isCurrent: boolean
}

const isBrowser = (): boolean => {
  return typeof window !== 'undefined' && typeof window.localStorage !== 'undefined'
}

const loadWins = (): RankedWin[] => {
  if (!isBrowser()) return []
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY)
    if (!raw) return []
    const parsed = JSON.parse(raw) as RankedWin[]
    if (!Array.isArray(parsed)) return []
    return parsed.filter((win) => {
      return win && typeof win.userId === 'string' && typeof win.playedAt === 'number'
    })
  } catch {
    return []
  }
}

const saveWins = (wins: RankedWin[]): void => {
  if (!isBrowser()) return
  const monthMs = 40 * 24 * 60 * 60 * 1000
  const recent = wins.filter((win) => Date.now() - win.playedAt < monthMs)
  window.localStorage.setItem(STORAGE_KEY, JSON.stringify(recent))
}

/** El mes se parte en 4 tandas: días 1-7, 8-14, 15-21 y 22 al final. */
export const weekIndexOf = (ms: number): number => {
  const date = new Date(ms)
  const now = new Date()
  if (date.getFullYear() !== now.getFullYear() || date.getMonth() !== now.getMonth()) return -1
  const day = date.getDate()
  if (day <= 7) return 0
  if (day <= 14) return 1
  if (day <= 21) return 2
  return 3
}

export const currentWeekIndex = (): number => {
  return weekIndexOf(Date.now())
}

export const weekPointsOf = (userId: string): number[] => {
  const points = [0, 0, 0, 0]
  loadWins().forEach((win) => {
    if (win.userId !== userId) return
    const index = weekIndexOf(win.playedAt)
    if (index < 0) return
    points[index] += 1
  })
  return points
}

/** La semana más baja se descarta. Si hay empate, se descarta la más tardía. */
export const discardedWeekIndex = (points: number[]): number => {
  let worst = 0
  for (let index = 1; index < WEEK_COUNT; index += 1) {
    if (points[index] < points[worst]) {
      worst = index
    } else if (points[index] === points[worst] && index > worst) {
      worst = index
    }
  }
  return worst
}

export const monthTotalOf = (userId: string): number => {
  const points = weekPointsOf(userId)
  const discarded = discardedWeekIndex(points)
  return points.reduce((sum, value, index) => {
    if (index === discarded) return sum
    return sum + value
  }, 0)
}

export const weekRowsOf = (userId: string): WeekRow[] => {
  const points = weekPointsOf(userId)
  const discarded = discardedWeekIndex(points)
  const current = currentWeekIndex()
  return points.map((value, index) => {
    return {
      week: index + 1,
      label: `Semana ${index + 1}`,
      points: value,
      counts: index !== discarded,
      isCurrent: index === current,
    }
  })
}

export const recordRankedWin = (userId: string): void => {
  saveWins([...loadWins(), { userId, playedAt: Date.now() }])
}
