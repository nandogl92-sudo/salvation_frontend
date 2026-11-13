const Cup = () => (
  <svg viewBox="0 0 16 16" className="w-3.5 h-3.5 shrink-0" aria-hidden="true">
    <path
      fill="#f5c518"
      d="M5 1h6v1h2v3a2.5 2.5 0 0 1-2.2 2.5A4 4 0 0 1 9 10.5V12h2v1H5v-1h2v-1.5A4 4 0 0 1 5.2 7.5 2.5 2.5 0 0 1 3 5V2h2V1zm-1 2v2a1.5 1.5 0 0 0 1.2 1.5A4 4 0 0 1 6 4.2V3H4zm8 0H10v1.2a4 4 0 0 1 .8 2.3A1.5 1.5 0 0 0 12 5V3zM6 14h4v1H6z"
    />
  </svg>
)

type TournamentBadgesProps = {
  wins: number | undefined
  /** En la barra cabe una copa y el número. En la clasificación se ven hasta tres. */
  compact?: boolean
}

const TournamentBadges = ({ wins, compact = false }: TournamentBadgesProps) => {
  const count = Math.max(0, Math.floor(wins ?? 0))
  if (count === 0) return null
  const label = count === 1 ? '1 torneo ganado' : `${count} torneos ganados`
  const shown = compact ? 1 : Math.min(count, 3)
  const number = compact || count > 3 ? count : 0

  return (
    <span className="inline-flex items-center gap-0.5 shrink-0" aria-label={label} title={label}>
      {Array.from({ length: shown }, (_, index) => <Cup key={index} />)}
      {number > 0 && <span className="text-[10px] font-bold text-[#f5c518]">{number}</span>}
    </span>
  )
}

export default TournamentBadges
