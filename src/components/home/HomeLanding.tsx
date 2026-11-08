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
        <img
          src="/hero-frizeplay.jpg"
          alt=""
          className="absolute inset-0 h-full w-full object-cover object-center"
        />
        <div className="absolute inset-0 bg-gradient-to-b from-[#070b16]/55 via-[#070b16]/35 to-[#070b16]" aria-hidden="true" />
        <div className="relative z-10 min-h-[calc(100svh-4rem)] flex items-start px-4 pt-20 pb-10 [@media(orientation:landscape)_and_(max-height:520px)]:pt-8 [@media(orientation:landscape)_and_(max-height:520px)]:pb-6">
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
            <p className="text-[10px] sm:text-xs font-bold tracking-[0.35em] text-white/90">JUEGA POR EL PREMIO</p>
            <h1 className="font-pixel text-sm sm:text-xl landscape:text-base leading-relaxed text-white drop-shadow-[0_2px_8px_rgba(0,0,0,0.8)]">
              1 TORNEO. <span className="text-[#3ec8ff]">4 JUEGOS CLÁSICOS.</span>
              <span className="block">EL PRIMERO ELIGE EL GRAN PREMIO</span>
            </h1>
            <p className="text-xs sm:text-sm text-white drop-shadow-[0_2px_6px_rgba(0,0,0,0.8)]">
              {currentUser
                ? `Hola, ${currentUser.username}. Elige un juego para entrar al lobby.`
                : 'Crea una cuenta o inicia sesión para jugar.'}
            </p>
            <p className="text-xs sm:text-sm font-bold text-[#3ec8ff] drop-shadow-[0_2px_6px_rgba(0,0,0,0.8)]">
              Inscríbete por tan solo 10 €. Incluye 100 fichas. Sin inscripción no compites.
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
        {accessNotice && (
          <p className="mb-4 text-sm text-red-300" role="status">{accessNotice}</p>
        )}
        <div className="grid grid-cols-1 landscape:grid-cols-2 sm:grid-cols-2 xl:grid-cols-5 gap-4">
          {games.map((game) => (
            <GameCard key={game.id} game={game} onSelectGame={onSelectGame} />
          ))}
        </div>
      </section>

      <section id="ranking" className="max-w-3xl mx-auto px-4 mt-8 pb-10 scroll-mt-20">
        <PointsRanking currentUser={currentUser} />
      </section>

      <section id="info" className="max-w-3xl mx-auto px-4 pb-16 space-y-6 scroll-mt-20">
        <div className="bg-bg-100 border border-bg-300 rounded-2xl p-6">
          <h2 className="font-pixel text-[10px] text-[#3ec8ff]">Info</h2>
        </div>
      </section>

      <section className="max-w-6xl mx-auto px-4 pt-2 pb-12 flex flex-wrap justify-center gap-6 text-xs font-bold tracking-wide text-[#b7c0d4]">
        {NOTES.map(({ text, Icon }) => (
          <p key={text} className="flex items-center gap-2">
            <Icon className="w-4 h-4 text-[#3ec8ff]" aria-hidden="true" />
            {text}
          </p>
        ))}
      </section>
    </div>
  )
}

export default HomeLanding
