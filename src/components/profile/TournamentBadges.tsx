import { Medal } from 'lucide-react'

type TournamentBadgesProps = {
  wins: number | undefined
  /** En la barra cabe una medalla y el número. En la clasificación se ven hasta tres. */
  compact?: boolean
}

const TournamentBadges = ({ wins, compact = false }: TournamentBadgesProps) => {
  const count = Math.max(0, Math.floor(Number(wins) || 0))
  if (count === 0) return null
  const label = count === 1 ? '1 torneo ganado' : `${count} torneos ganados`
  const shown = compact ? 1 : Math.min(count, 3)
  const number = compact || count > 3 ? count : 0

  return (
    <span className="inline-flex items-center gap-0.5 shrink-0 text-[#f5c518]" aria-label={label} title={label}>
      {Array.from({ length: shown }, (_, index) => (
        <Medal key={index} className="w-5 h-5 shrink-0" strokeWidth={2.25} aria-hidden="true" />
      ))}
      {number > 0 && <span className="text-[10px] font-bold leading-none">{number}</span>}
    </span>
  )
}

export default TournamentBadges
