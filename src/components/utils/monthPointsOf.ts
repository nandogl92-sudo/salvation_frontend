/** Puntos del mes para el premio. Si el servidor no envía el campo, es 0. Nunca se inventa a partir de las fichas. */
export const monthPointsOf = (user: { monthPoints?: number } | null | undefined): number => {
  if (!user || typeof user.monthPoints !== 'number' || !Number.isFinite(user.monthPoints)) return 0
  return Math.max(0, user.monthPoints)
}
