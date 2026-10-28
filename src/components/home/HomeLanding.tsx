import { Gamepad2, Heart, Play, Star, Zap } from 'lucide-react'
import type { Game, UserProfile } from '../../types'
import { handleActivateKey } from '../utils/handleActivateKey'
import PointsRanking from './PointsRanking'

const CARD_BORDER: Record<string, string> = {
  pong: 'border-yellow-400',
  snake: 'border-sky-400',
  tetris: 'border-red-400',
  combat: 'border-sky-400',
}

const NOTES = [
  { text: 'Juega con fichas', Icon: Gamepad2 },
  { text: 'Sin descargas', Icon: Zap },
  { text: 'Juega desde cualquier dispositivo', Icon: Heart },
  { text: 'Los clásicos siempre contigo', Icon: Star },
]

type HomeLandingProps = {
  games: Game[]
  currentUser: UserProfile | null
  onSelectGame: (game: Game) => void
}

const scrollToGames = () => {
  document.getElementById('juegos')?.scrollIntoView({ behavior: 'smooth' })
}

const GameArt = ({ gameId }: { gameId: string }) => {
  if (gameId === 'pong') {
    return (
      <img
        src="/paddle-duel-cover.jpg"
        alt=""
        className="aspect-[1024/571] w-full object-cover object-center"
      />
    )
  }
  if (gameId === 'snake') {
    return (
      <img
        src="/aero-rings-cover.jpg"
        alt=""
        className="aspect-[1024/571] w-full object-cover object-center"
      />
    )
  }
  if (gameId === 'tetris') {
    return (
      <img
        src="/slot-car-cover-2.jpg"
        alt=""
        className="aspect-[1024/571] w-full object-cover object-center"
      />
    )
  }
  if (gameId === 'combat') {
    return (
      <img
        src="/sky-drop-cover.jpg"
        alt=""
        className="aspect-[1024/571] w-full object-cover object-center"
      />
    )
  }
  return (
    <div className="h-28 bg-[#071018] relative">
      <div className="absolute left-4 top-8 w-2 h-10 bg-white" />
      <div className="absolute right-4 bottom-6 w-2 h-10 bg-white" />
      <div className="absolute left-1/2 top-1/2 w-3 h-3 -translate-x-1/2 -translate-y-1/2 bg-yellow-300" />
    </div>
  )
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
  const border = CARD_BORDER[game.id] ?? 'border-yellow-400'

  return (
    <article className={`flex flex-col bg-[#0e1528] border-2 ${border} rounded-lg overflow-hidden`}>
      <GameArt gameId={game.id} />
      <div className="p-3 flex flex-col gap-3 flex-1">
        <h3 className="font-pixel text-[9px] leading-4 text-white">{game.name}</h3>
        <p className="text-xs text-[#b7c0d4] leading-relaxed flex-1">{game.description}</p>
        <button
          type="button"
          aria-label={`Jugar ${game.name}`}
          tabIndex={0}
          onClick={handleSelectGame}
          onKeyDown={(event) => handleActivateKey(event, handleSelectGame)}
          className="w-full border border-[#f5c518] text-[#f5c518] text-xs font-bold py-2 rounded hover:bg-[#f5c518] hover:text-[#1a1403] transition-colors"
        >
          Jugar &gt;
        </button>
      </div>
    </article>
  )
}

const HomeLanding = ({
  games,
  currentUser,
  onSelectGame,
}: HomeLandingProps) => {
  const handleStart = () => {
    scrollToGames()
  }

  return (
    <div id="inicio">
      <section className="relative overflow-hidden text-center">
        <img
          src="/hero-sunset.jpg"
          alt=""
          className="absolute inset-0 w-full h-full object-cover object-center"
        />
        <div className="absolute inset-0 bg-gradient-to-b from-[#070b16]/80 via-[#070b16]/40 to-[#070b16]" aria-hidden="true" />
        <div className="relative z-10 min-h-[calc(100svh-4rem)] landscape:min-h-[calc(100svh-4rem)] flex items-center px-4 py-6 landscape:py-3">
          <div className="max-w-4xl mx-auto w-full space-y-3 landscape:space-y-2">
            <p className="text-[10px] sm:text-xs font-bold tracking-[0.35em] text-white/90">CLÁSICOS QUE NUNCA ENVEJECEN</p>
            <h1 className="font-pixel text-sm sm:text-xl landscape:text-base leading-relaxed text-white drop-shadow-[0_2px_8px_rgba(0,0,0,0.8)]">
              5 JUEGOS <span className="text-[#f5c518]">LEGENDARIOS</span>
              <span className="block">EN UN SOLO LUGAR</span>
            </h1>
            <p className="text-sm sm:text-base landscape:text-sm text-white drop-shadow-[0_2px_6px_rgba(0,0,0,0.8)]">Revive la magia de los clásicos. Juega, recuerda, disfruta.</p>
            <p className="text-xs sm:text-sm text-white drop-shadow-[0_2px_6px_rgba(0,0,0,0.8)]">
              {currentUser
                ? `Hola, ${currentUser.username}. Elige un juego para entrar al lobby.`
                : 'Crea una cuenta o inicia sesión para jugar.'}
            </p>
            <p className="text-xs sm:text-sm font-bold text-[#f5c518] drop-shadow-[0_2px_6px_rgba(0,0,0,0.8)]">
              Cuentan tus 3 mejores semanas. El 1.º aún se puede alcanzar.
            </p>
            <button
              type="button"
              aria-label="Empezar a jugar"
              tabIndex={0}
              onClick={handleStart}
              onKeyDown={(event) => handleActivateKey(event, handleStart)}
              className="inline-flex items-center gap-2 bg-[#f5c518] text-[#1a1403] font-bold px-6 py-3 landscape:py-2 rounded-lg"
            >
              <Play className="w-4 h-4" aria-hidden="true" />
              Empezar a jugar
            </button>
          </div>
        </div>
      </section>

      <section id="juegos" className="max-w-6xl mx-auto px-4 pt-6 relative scroll-mt-20">
        <div className="grid grid-cols-1 landscape:grid-cols-2 sm:grid-cols-2 xl:grid-cols-5 gap-4">
          {games.map((game) => (
            <GameCard key={game.id} game={game} onSelectGame={onSelectGame} />
          ))}
        </div>
      </section>

      <section className="max-w-6xl mx-auto px-4 py-10 flex flex-wrap justify-center gap-6 text-xs font-bold tracking-wide text-[#b7c0d4]">
        {NOTES.map(({ text, Icon }) => (
          <p key={text} className="flex items-center gap-2">
            <Icon className="w-4 h-4 text-[#f5c518]" aria-hidden="true" />
            {text}
          </p>
        ))}
      </section>

      <section id="ranking" className="max-w-3xl mx-auto px-4 pb-10 scroll-mt-20">
        <PointsRanking currentUser={currentUser} />
      </section>

      <section id="info" className="max-w-3xl mx-auto px-4 pb-16 space-y-6 scroll-mt-20">
        <div className="bg-bg-100 border border-bg-300 rounded-2xl p-6 space-y-2">
          <h2 className="font-pixel text-[10px] text-[#f5c518]">Info</h2>
          <p className="text-sm text-text-200">Si ganas, ganas 1 ficha. Si pierdes, pierdes 1 ficha.</p>
          <p className="text-sm text-text-200">Desconexión o abandono cuenta como derrota.</p>
          <p className="text-sm text-text-200">Error de plataforma: las fichas de esa partida se devuelven.</p>
          <h3 className="font-pixel text-[10px] text-[#f5c518] pt-3">Premio del mes</h3>
          <p className="text-sm text-text-200">Hace falta inscripción de este mes para competir.</p>
          <p className="text-sm text-text-200">Ranking: otra persona, ambos inscritos. El bot no se usa.</p>
          <p className="text-sm text-text-200">Una victoria ranqueada suma 1 punto a esa semana.</p>
          <p className="text-sm text-text-200">Una derrota no quita puntos.</p>
          <p className="text-sm text-text-200">Máximo 8 ranqueadas al día.</p>
          <p className="text-sm text-text-200">Contra la misma persona, 2 por semana. El resto, amistoso.</p>
          <p className="text-sm text-text-200">El mes tiene 4 semanas. Cuentan las 3 mejores. Una semana ruin se descarta.</p>
          <p className="text-sm text-text-200">Solo el 1.º gana. El premio no está cerrado: aún se le puede alcanzar.</p>
          <p className="text-sm text-text-200">Una persona, una plaza.</p>
          <p className="text-sm text-text-200">Amistoso: bot o práctica. Bot y amistoso no cuentan para el premio.</p>
          <p className="text-sm text-text-200">Las fichas sirven para jugar. No dan puesto en el premio.</p>
        </div>
      </section>

      <button
        type="button"
        aria-label="Press start"
        tabIndex={0}
        onClick={handleStart}
        onKeyDown={(event) => handleActivateKey(event, handleStart)}
        className="block mx-auto mb-10 text-[10px] font-pixel tracking-[0.4em] text-[#f5c518]"
      >
        Press start
      </button>
    </div>
  )
}

export default HomeLanding
