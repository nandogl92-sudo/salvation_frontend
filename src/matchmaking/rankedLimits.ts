const STORAGE_KEY = 'betplay.ranked.plays.v2'

export const RANKED_PER_DAY = 8
export const RANKED_PER_RIVAL_WEEK = 2

type RankedPlay = {
  userId: string
  rivalId: string
  playedAt: number
}

const isBrowser = (): boolean => {
  return typeof window !== 'undefined' && typeof window.localStorage !== 'undefined'
}

const pad2 = (value: number): string => {
  return String(value).padStart(2, '0')
}

const dayStamp = (ms: number): string => {
  const date = new Date(ms)
  return `${date.getFullYear()}-${pad2(date.getMonth() + 1)}-${pad2(date.getDate())}`
}

const weekStamp = (ms: number): string => {
  const date = new Date(ms)
  const weekday = date.getDay()
  const toMonday = weekday === 0 ? -6 : 1 - weekday
  const monday = new Date(date)
  monday.setDate(date.getDate() + toMonday)
  monday.setHours(0, 0, 0, 0)
  return dayStamp(monday.getTime())
}

const loadPlays = (): RankedPlay[] => {
  if (!isBrowser()) return []
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY)
    if (!raw) return []
    const parsed = JSON.parse(raw) as RankedPlay[]
    if (!Array.isArray(parsed)) return []
    return parsed.filter((play) => {
      return play && typeof play.userId === 'string' && typeof play.rivalId === 'string' && typeof play.playedAt === 'number'
    })
  } catch {
    return []
  }
}

const savePlays = (plays: RankedPlay[]): void => {
  if (!isBrowser()) return
  const monthMs = 40 * 24 * 60 * 60 * 1000
  const recent = plays.filter((play) => Date.now() - play.playedAt < monthMs)
  window.localStorage.setItem(STORAGE_KEY, JSON.stringify(recent))
}

export const rankedTodayCount = (userId: string): number => {
  const today = dayStamp(Date.now())
  return loadPlays().filter((play) => play.userId === userId && dayStamp(play.playedAt) === today).length
}

export const rankedLeftToday = (userId: string): number => {
  return Math.max(0, RANKED_PER_DAY - rankedTodayCount(userId))
}

export const rankedVsRivalThisWeek = (userId: string, rivalId: string): number => {
  const week = weekStamp(Date.now())
  return loadPlays().filter((play) => {
    return play.userId === userId && play.rivalId === rivalId && weekStamp(play.playedAt) === week
  }).length
}

export const canRankedVsRival = (userId: string, rivalId: string): boolean => {
  return rankedLeftToday(userId) > 0 && rankedVsRivalThisWeek(userId, rivalId) < RANKED_PER_RIVAL_WEEK
}

export const recordRankedPlay = (userId: string, rivalId: string): void => {
  savePlays([...loadPlays(), { userId, rivalId, playedAt: Date.now() }])
}
