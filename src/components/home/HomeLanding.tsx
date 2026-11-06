import { Gamepad2, Heart, Play, Star, Zap } from 'lucide-react'
import type { Game, UserProfile } from '../../types'
import { handleActivateKey } from '../utils/handleActivateKey'
import PointsRanking from './PointsRanking'

const CARD_BORDER: Record<string, string> = {
  pong: 'border-[#3ec8ff]',
  snake: 'border-[#3ec8ff]/40',
  tetris: 'border-[#3ec8ff]/40',
  combat: 'border-[#3ec8ff]/40',
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
  accessNotice?: string | null
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
  const border = CARD_BORDER[game.id] ?? 'border-[#3ec8ff]/40'

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
          className="w-full border border-[#3ec8ff] text-[#3ec8ff] text-xs font-bold py-2 rounded hover:bg-[#3ec8ff] hover:text-[#070b16] transition-colors"
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
  accessNotice = null,
}: HomeLandingProps) => {
  const handleStart = () => {
    scrollToGames()
  }

  return (
    <div id="inicio">
      <section className="relative overflow-hidden bg-[#070b16] text-center">
        <div className="relative z-10 min-h-[calc(100svh-4rem)] landscape:min-h-[calc(100svh-4rem)] flex items-center px-4 py-6 landscape:py-3">
          <div className="max-w-4xl mx-auto w-full space-y-3 landscape:space-y-2">
            <div className="relative mx-auto w-fit">
              <div
                className="pointer-events-none absolute left-1/2 top-1/2 h-56 w-56 -translate-x-1/2 -translate-y-1/2 rounded-full bg-[#3ec8ff]/30 blur-3xl"
                aria-hidden="true"
              />
              <img
                src="/frizeplay-logo.png"
                alt="Frizeplay"
                className="relative mx-auto h-28 sm:h-40 landscape:h-24 w-auto object-contain drop-shadow-[0_0_28px_rgba(62,200,255,0.65)]"
              />
            </div>
            <p className="text-[10px] sm:text-xs font-bold tracking-[0.35em] text-white/90">CLÁSICOS QUE NUNCA ENVEJECEN</p>
            <h1 className="font-pixel text-sm sm:text-xl landscape:text-base leading-relaxed text-white drop-shadow-[0_2px_8px_rgba(0,0,0,0.8)]">
              5 JUEGOS <span className="text-[#3ec8ff]">LEGENDARIOS</span>
              <span className="block">EN UN SOLO LUGAR</span>
            </h1>
            <p className="text-sm sm:text-base landscape:text-sm text-white drop-shadow-[0_2px_6px_rgba(0,0,0,0.8)]">Revive la magia de los clásicos. Juega, recuerda, disfruta.</p>
            <p className="text-xs sm:text-sm text-white drop-shadow-[0_2px_6px_rgba(0,0,0,0.8)]">
              {currentUser
                ? `Hola, ${currentUser.username}. Elige un juego para entrar al lobby.`
                : 'Crea una cuenta o inicia sesión para jugar.'}
            </p>
            <p className="text-xs sm:text-sm font-bold text-[#3ec8ff] drop-shadow-[0_2px_6px_rgba(0,0,0,0.8)]">
              Cuentan tus 3 mejores semanas. El 1.º aún se puede alcanzar.
            </p>
            <button
              type="button"
              aria-label="Empezar a jugar"
              tabIndex={0}
              onClick={handleStart}
              onKeyDown={(event) => handleActivateKey(event, handleStart)}
              className="inline-flex items-center gap-2 bg-[#3ec8ff] text-[#070b16] font-bold px-6 py-3 landscape:py-2 rounded-lg"
            >
              <Play className="w-4 h-4" aria-hidden="true" />
              Empezar a jugar
            </button>
          </div>
        </div>
      </section>

      <section id="juegos" className="max-w-6xl mx-auto px-4 pt-6 relative scroll-mt-20">
        {accessNotice && (
          <p className="mb-4 text-sm text-red-300" role="status">{accessNotice}</p>
        )}
        <div className="grid grid-cols-1 landscape:grid-cols-2 sm:grid-cols-2 xl:grid-cols-5 gap-4">
          {games.map((game) => (
            <GameCard key={game.id} game={game} onSelectGame={onSelectGame} />
          ))}
        </div>
      </section>

      <section className="max-w-6xl mx-auto px-4 py-10 flex flex-wrap justify-center gap-6 text-xs font-bold tracking-wide text-[#b7c0d4]">
        {NOTES.map(({ text, Icon }) => (
          <p key={text} className="flex items-center gap-2">
            <Icon className="w-4 h-4 text-[#3ec8ff]" aria-hidden="true" />
            {text}
          </p>
        ))}
      </section>

      <section id="ranking" className="max-w-3xl mx-auto px-4 pb-10 scroll-mt-20">
        <PointsRanking currentUser={currentUser} />
      </section>

      <section id="info" className="max-w-3xl mx-auto px-4 pb-16 space-y-6 scroll-mt-20">
        <div className="bg-bg-100 border border-bg-300 rounded-2xl p-6 space-y-2">
          <h2 className="font-pixel text-[10px] text-[#3ec8ff]">Info</h2>
          <p className="text-sm text-text-200">Si ganas, te llevas la ficha del rival. No hay comisión.</p>
          <p className="text-sm text-text-200">Si pierdes, pierdes 1 ficha.</p>
          <p className="text-sm text-text-200">Desconexión o abandono cuenta como derrota.</p>
          <p className="text-sm text-text-200">Error de plataforma: las fichas de esa partida se devuelven.</p>
          <h3 className="font-pixel text-[10px] text-[#3ec8ff] pt-3">Premio del mes</h3>
          <p className="text-sm text-text-200">La inscripción del mes cuesta 10 € y suma 100 fichas.</p>
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
        className="block mx-auto mb-10 text-[10px] font-pixel tracking-[0.4em] text-[#3ec8ff]"
      >
        Press start
      </button>
    </div>
  )
}

export default HomeLanding
