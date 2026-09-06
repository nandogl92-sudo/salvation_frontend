import { ArrowRight, ShieldAlert, Swords, WifiOff } from 'lucide-react'
import AuthPanel from '../../auth/AuthPanel'
import type { Game, UserProfile } from '../../types'
import { handleActivateKey } from '../utils/handleActivateKey'

const RULES = [
  { text: 'El ganador recibe el pozo menos el 5% de comisión.', Icon: Swords },
  { text: 'Desconexión o abandono cuenta como derrota.', Icon: WifiOff },
  { text: 'Error de plataforma → reembolso automático.', Icon: ShieldAlert },
] as const

type HomeLandingProps = {
  games: Game[]
  currentUser: UserProfile | null
  isAuthReady: boolean
  pendingGame: Game | null
  onSelectGame: (game: Game) => void
}

const GameCard = ({
  game,
  onSelectGame,
}: {
  game: Game
  onSelectGame: (game: Game) => void
}) => {
  const handleSelectGame = () => {
    onSelectGame(game)
  }

  return (
    <button
      type="button"
      aria-label={`Jugar ${game.name}`}
      tabIndex={0}
      onClick={handleSelectGame}
      onKeyDown={(event) => handleActivateKey(event, handleSelectGame)}
      className="group text-left bg-bg-100 rounded-2xl border border-bg-300 overflow-hidden hover:border-primary-100 hover:shadow-md transition-all focus:outline-none focus-visible:ring-2 focus-visible:ring-primary-100"
    >
      <div className="h-24 bg-bg-200 group-hover:bg-primary-300 transition-colors flex items-center justify-center">
        <span className="text-text-200 group-hover:text-primary-100 transition-colors [&>svg]:w-10 [&>svg]:h-10">
          {game.icon}
        </span>
      </div>
      <div className="p-5 space-y-1">
        <div className="flex items-center justify-between">
          <h3 className="font-bold text-text-100">{game.name}</h3>
          <ArrowRight
            className="w-4 h-4 text-text-200 group-hover:text-primary-100 group-hover:translate-x-0.5 transition-all"
            aria-hidden="true"
          />
        </div>
        <p className="text-xs text-text-200 leading-relaxed">{game.description}</p>
      </div>
    </button>
  )
}

const HomeLanding = ({
  games,
  currentUser,
  isAuthReady,
  pendingGame,
  onSelectGame,
}: HomeLandingProps) => {
  const showAuth = !currentUser && isAuthReady

  return (
    <div className="animate-fade-in space-y-14">
      <section className="flex flex-col md:flex-row items-center gap-10 pt-8">
        <div className="flex-1 space-y-5">
          <span className="inline-flex items-center gap-2 bg-primary-300 text-primary-100 text-xs font-bold px-3 py-1 rounded-full uppercase tracking-widest">
            <Swords className="w-3.5 h-3.5" aria-hidden="true" /> 1 vs 1 · Dinero real
          </span>
          <h1 className="text-4xl md:text-5xl font-bold text-text-100 leading-tight">
            Demuestra tu habilidad.<br />
            <span className="text-primary-100">Gana dinero real.</span>
          </h1>
          <p className="text-text-200 max-w-md">
            Elige un juego clásico, apuesta, encuentra rival y juega. El ganador se lo lleva todo. Sin descargas.
          </p>
          <ul className="space-y-2 pt-1">
            {RULES.map(({ text, Icon }) => (
              <li key={text} className="flex items-start gap-2 text-sm text-text-200">
                <span className="mt-0.5 text-text-200 shrink-0">
                  <Icon className="w-4 h-4" aria-hidden="true" />
                </span>
                {text}
              </li>
            ))}
          </ul>
        </div>

        {showAuth && (
          <div className="w-full md:w-auto md:min-w-[360px]">
            <AuthPanel
              initialMode={pendingGame ? 'login' : 'register'}
              notice={pendingGame ? `Inicia sesión para jugar ${pendingGame.name}.` : undefined}
            />
          </div>
        )}
      </section>

      <section>
        <div className="flex items-center justify-between mb-6">
          <h2 className="text-xl font-bold text-text-100">Elige tu juego</h2>
          <span className="text-sm text-text-200">{games.length} disponibles</span>
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {games.map((game) => (
            <GameCard key={game.id} game={game} onSelectGame={onSelectGame} />
          ))}
        </div>
      </section>
    </div>
  )
}

export default HomeLanding
