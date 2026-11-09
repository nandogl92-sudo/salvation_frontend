import type { MonthWeek } from '../../types'

/** Puntos del mes para el premio. Si el servidor no envía el campo, es 0. Nunca se inventa a partir de las fichas. */
export const monthPointsOf = (user: { monthPoints?: number } | null | undefined): number => {
  if (!user || typeof user.monthPoints !== 'number' || !Number.isFinite(user.monthPoints)) return 0
  return Math.max(0, user.monthPoints)
}

/** Semanas que envía el servidor. Si no vienen, la lista queda vacía. */
export const weeksOf = (value: unknown): MonthWeek[] => {
  if (!Array.isArray(value)) return []
  return value.flatMap((item) => {
    if (!item || typeof item !== 'object') return []
    const week = item as { week?: unknown; points?: unknown; counts?: unknown }
    if (typeof week.week !== 'number' || typeof week.points !== 'number') return []
    return [{ week: week.week, points: Math.max(0, week.points), counts: week.counts === true }]
  })
}
