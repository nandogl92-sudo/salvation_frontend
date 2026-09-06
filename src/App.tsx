import { useEffect, useRef, useState } from 'react';
import { 
  Gamepad2, User, LogOut, Wallet, AlertCircle, 
  WifiOff, ArrowRight, ShieldAlert,
  Crosshair, Swords, Grid, Activity,
  Trophy, Home, RefreshCcw
} from 'lucide-react';

import Pong from './games/Pong';
import Snake from './games/Snake';
import Tetris from './games/Tetris';
import Combat from './games/Combat';
import Shooter from './games/Shooter';
import { useAuth } from './auth/AuthContext';
import AuthPanel from './auth/AuthPanel';
import { cancelQueue, createBotMatch, joinQueue, tryMatch } from './matchmaking/matchmakingService';
import type { Game, MatchPlayer, MatchTicket, QueueStatus } from './types';

/** Resultado de una partida terminada. Se muestra en la pantalla de resultado. */
type GameResult = {
  won: boolean;
  /** Ganancia neta (positivo) o pérdida neta (negativo) en USD. 0 si es reembolso. */
  profit: number;
  /** true si la partida fue cancelada por error de plataforma (reembolso). */
  isRefund: boolean;
};

/** Tras este tiempo sin encontrar rival, se muestra el estado de timeout (SRC-04). */
const QUEUE_TIMEOUT_MS = 60_000;
/** Frecuencia de polling de la cola mock (ver src/matchmaking/README.md). */
const QUEUE_POLL_INTERVAL_MS = 1000;
/** Comisión de la plataforma sobre el pozo total (en porcentaje). */
const PLATFORM_FEE_PERCENT = 5;

// Datos estáticos
const GAMES: Game[] = [
  { id: 'pong', name: 'Paddle Duel', description: 'Reflejos rápidos. El primero en llegar a 10 puntos gana.', icon: <Activity className="w-8 h-8" /> },
  { id: 'snake', name: 'Worm Clash', description: 'Sobrevive más tiempo que tu oponente o haz que choque.', icon: <Gamepad2 className="w-8 h-8" /> },
  { id: 'tetris', name: 'Block Battle', description: 'Limpia líneas para enviar basura a tu rival.', icon: <Grid className="w-8 h-8" /> },
  { id: 'combat', name: 'Arena Clash', description: 'Lucha cuerpo a cuerpo. Reduce la vida del rival a cero.', icon: <Swords className="w-8 h-8" /> },
  { id: 'shooter', name: 'Laser Duel', description: 'Disparos en arena cerrada. Precisión y velocidad.', icon: <Crosshair className="w-8 h-8" /> },
];

export default function App() {
  // ==========================================
  // AUTH — provisto por AuthContext (mock). Ver src/auth/README.md
  // ==========================================
  const { user: currentUser, isReady: isAuthReady, logout, setBalance } = useAuth();

  // ==========================================
  // ESTADOS PRINCIPALES
  // ==========================================
  const [view, setView] = useState<'home' | 'lobby' | 'playing'>('home');
  const [selectedGame, setSelectedGame] = useState<Game | null>(null);
  
  // Estados para el Lobby
  const [betAmount, setBetAmount] = useState<number>(10);

  // ==========================================
  // BÚSQUEDA (matchmaking mock) — ver src/matchmaking/README.md.
  // Cola real vía localStorage compartida entre pestañas del navegador.
  // ==========================================
  const [queueStatus, setQueueStatus] = useState<QueueStatus>('idle');
  const [ticket, setTicket] = useState<MatchTicket | null>(null);
  const [searchStartedAt, setSearchStartedAt] = useState<number | null>(null);
  const [opponent, setOpponent] = useState<MatchPlayer | null>(null);

  // ==========================================
  // AUTH-04 — Gate de juego: si intentan jugar sin sesión, se guarda el
  // juego elegido y se muestra el panel de login con un aviso. En cuanto
  // hay sesión, se entra directo al lobby de ese juego (ver useEffect abajo).
  // ==========================================
  const [pendingGame, setPendingGame] = useState<Game | null>(null);

  // ==========================================
  // RESULTADO DE PARTIDA — Milestone 3.
  // Se establece al terminar una partida y muestra la pantalla de resultado.
  // Null mientras no hay resultado pendiente de mostrar.
  // ==========================================
  const [gameResult, setGameResult] = useState<GameResult | null>(null);

  // Ref que guarda el saldo justo antes de reservar la apuesta (Paso 5 — Milestone 3).
  // Se usa para restaurar el saldo en cancelación, timeout y error de plataforma.
  // Es un ref (no estado) para evitar capturas obsoletas en closures de useEffect.
  const balanceBeforeReservationRef = useRef<number>(0);

  /** Vuelve a home y limpia el estado de resultado de partida. */
  const goHome = () => {
    setGameResult(null);
    setOpponent(null);
    setView('home');
    setSelectedGame(null);
  };

  const handleLogout = () => {
    // Se limpia la búsqueda ANTES de disparar logout(): logout() es async y
    // React aplica este setView('home') de forma síncrona, así que si no se
    // cancela aquí, el guard de sesión (más abajo) llega tarde — cuando
    // currentUser pasa a null, `view` ya es 'home' y su condición no dispara,
    // dejando el ticket huérfano en la cola.
    if (ticket) {
      cancelQueue(ticket.id);
      // Restaurar la reserva de saldo si había una búsqueda activa al cerrar sesión.
      if (balanceBeforeReservationRef.current > 0) {
        setBalance(balanceBeforeReservationRef.current);
        balanceBeforeReservationRef.current = 0;
      }
    }
    setTicket(null);
    setSearchStartedAt(null);
    setQueueStatus('idle');
    setOpponent(null);
    setSelectedGame(null);
    setGameResult(null);
    setView('home');
    logout();
  };

  const joinLobby = (game: Game) => {
    setSelectedGame(game);
    setView('lobby');
  };

  const requestJoinGame = (game: Game) => {
    if (currentUser) {
      joinLobby(game);
      return;
    }
    setPendingGame(game);
    setView('home');
  };

  // Tras un login/registro exitoso, si había un juego pendiente por el gate, entrar directo a su lobby.
  useEffect(() => {
    if (currentUser && pendingGame) {
      joinLobby(pendingGame);
      setPendingGame(null);
    }
  }, [currentUser, pendingGame]);

  // Guard: si se pierde la sesión (logout, sesión expirada) estando en lobby o playing, volver a home.
  useEffect(() => {
    if (!currentUser && (view === 'lobby' || view === 'playing')) {
      if (ticket) cancelQueue(ticket.id);
      setTicket(null);
      setQueueStatus('idle');
      setView('home');
      setSelectedGame(null);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps -- solo debe reaccionar a cambios de sesión/vista.
  }, [currentUser, view]);

  // SRC-01 — Entrar a la cola real (compartida entre pestañas vía localStorage).
  const startMatchmaking = () => {
    if (!currentUser || !selectedGame || betAmount > currentUser.balance || betAmount <= 0) return;

    // Paso 5 — Reservar el saldo al entrar a la cola para evitar double-spend.
    // Si la búsqueda se cancela, hay timeout o hay error de plataforma, se restaura.
    balanceBeforeReservationRef.current = currentUser.balance;
    setBalance(currentUser.balance - betAmount);

    const newTicket = joinQueue({
      userId: currentUser.id,
      username: currentUser.username,
      gameId: selectedGame.id,
      betAmount,
    });
    setTicket(newTicket);
    setSearchStartedAt(Date.now());
    setQueueStatus('searching');
  };

  // SRC-02 — Cancelar búsqueda: saca el ticket de la cola de verdad, no solo cambia de vista.
  const cancelSearch = () => {
    if (ticket) cancelQueue(ticket.id);
    // Devolver la reserva de saldo al cancelar la búsqueda.
    if (balanceBeforeReservationRef.current > 0) {
      setBalance(balanceBeforeReservationRef.current);
      balanceBeforeReservationRef.current = 0;
    }
    setTicket(null);
    setSearchStartedAt(null);
    setQueueStatus('idle');
    setView('home');
    setSelectedGame(null);
  };

  // SRC-04 — Tras un timeout, permite reintentar con la misma apuesta.
  const retrySearch = () => {
    setQueueStatus('idle');
    startMatchmaking();
  };

  // SRC-04 — Tras un timeout, permite volver a elegir la apuesta.
  const changeBet = () => {
    setTicket(null);
    setSearchStartedAt(null);
    setQueueStatus('idle');
  };

  // Paso 5 — Restaurar la reserva de saldo cuando la búsqueda llega a timeout.
  // Se usa un useEffect para no depender de closures obsoletos en el intervalo de polling.
  useEffect(() => {
    if (queueStatus === 'timeout' && balanceBeforeReservationRef.current > 0) {
      setBalance(balanceBeforeReservationRef.current);
      balanceBeforeReservationRef.current = 0;
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps -- solo reacciona al cambio de estado de la cola.
  }, [queueStatus]);

  // Modo prueba explícito (respuesta del PO brief): si no hay rival real, se puede
  // jugar contra un bot etiquetado como tal — nunca se presenta como jugador real.
  const playAgainstBot = () => {
    if (!ticket) return;
    const match = createBotMatch(ticket);
    const bot = match.players.find((p) => p.ticketId !== ticket.id) ?? match.players[1];
    setOpponent(bot);
    setTicket(null);
    setSearchStartedAt(null);
    setQueueStatus('idle');
    setView('playing');
  };

  /**
   * Acceso directo al modo bot desde el lobby — sin pasar por la cola de matchmaking.
   * Reserva el saldo, crea un ticket temporal, genera el match de bot y entra a jugar.
   */
  const startVsBot = () => {
    if (!currentUser || !selectedGame || betAmount > currentUser.balance || betAmount <= 0) return;

    // Reservar saldo (mismo mecanismo que startMatchmaking)
    balanceBeforeReservationRef.current = currentUser.balance;
    setBalance(currentUser.balance - betAmount);

    // Crear ticket temporal y emparejar con bot directamente (sin cola)
    const newTicket = joinQueue({
      userId: currentUser.id,
      username: currentUser.username,
      gameId: selectedGame.id,
      betAmount,
    });
    const match = createBotMatch(newTicket); // cancela el ticket de la cola internamente
    const bot = match.players.find((p) => p.ticketId !== newTicket.id) ?? match.players[1];

    setOpponent(bot);
    setView('playing');
  };

  // SRC-03 — Polling de la cola mientras se busca. Si aparece un match real
  // (creado por esta pestaña o por la del rival), pasa a "playing". Si se
  // agota el tiempo, pasa a "timeout" (SRC-04).
  useEffect(() => {
    if (queueStatus !== 'searching' || !ticket || searchStartedAt === null) return;

    const intervalId = window.setInterval(() => {
      const match = tryMatch(ticket);
      if (match) {
        const opponentPlayer = match.players.find((p) => p.ticketId !== ticket.id) ?? match.players[0];
        setOpponent(opponentPlayer);
        setTicket(null);
        setSearchStartedAt(null);
        setQueueStatus('idle');
        setView('playing');
        return;
      }

      if (Date.now() - searchStartedAt >= QUEUE_TIMEOUT_MS) {
        cancelQueue(ticket.id);
        setQueueStatus('timeout');
      }
    }, QUEUE_POLL_INTERVAL_MS);

    return () => window.clearInterval(intervalId);
  }, [queueStatus, ticket, searchStartedAt]);

  const handleGameEnd = (won: boolean, reason?: string) => {
    // TODO: Validar resultados con el backend (Autoridad del Servidor) para evitar trampas.

    if (reason === 'platform_error') {
      // Error de plataforma: reembolsar la reserva de saldo a ambos jugadores.
      // En el mock solo gestionamos el jugador local; el rival recupera su saldo en su pestaña.
      // FUTURE: Escuchar evento 'refund' del servidor cuando haya backend real.
      if (balanceBeforeReservationRef.current > 0) {
        setBalance(balanceBeforeReservationRef.current);
        balanceBeforeReservationRef.current = 0;
      }
      setGameResult({ won: false, profit: 0, isRefund: true });
      setOpponent(null);
      return;
    }

    // La reserva ya fue descontada al entrar a la cola (startMatchmaking).
    // El ganador recibe el pozo completo (apuesta × 2) menos la comisión de la plataforma.
    const fee = (betAmount * 2 * PLATFORM_FEE_PERCENT) / 100;
    const pot = betAmount * 2 - fee;

    if (won) {
      // currentUser.balance ya tiene la reserva descontada: sumar el pozo neto.
      setBalance((currentUser?.balance ?? 0) + pot);
      // Ganancia neta para mostrar en la pantalla de resultado.
      const netProfit = pot - betAmount;
      setGameResult({ won: true, profit: netProfit, isRefund: false });
    } else {
      // La reserva ya fue descontada: el saldo no cambia más.
      setGameResult({ won: false, profit: -betAmount, isRefund: false });
    }

    balanceBeforeReservationRef.current = 0;
    setOpponent(null);
  };

  const renderGame = () => {
    const handleEnd = (winner: 'p1' | 'p2') => {
      // p1 es el jugador local
      handleGameEnd(winner === 'p1');
    };

    // El bot de P2 se activa cuando el rival es un bot (partida vs bot) o cuando
    // no hay rival real (sesión local sin matchmaking real).
    const botEnabled = opponent?.isBot ?? false;

    switch(selectedGame?.id) {
      case 'pong': return <Pong onGameEnd={handleEnd} botEnabled={botEnabled} />;
      case 'snake': return <Snake onGameEnd={handleEnd} botEnabled={botEnabled} />;
      case 'tetris': return <Tetris onGameEnd={handleEnd} botEnabled={botEnabled} />;
      case 'combat': return <Combat onGameEnd={handleEnd} botEnabled={botEnabled} />;
      case 'shooter': return <Shooter onGameEnd={handleEnd} botEnabled={botEnabled} />;
      default: return <div className="text-white text-center p-8">Juego no encontrado</div>;
    }
  };

  return (
    <div className="min-h-screen bg-bg-200 text-text-100 font-sans">
      {/* NAVBAR */}
      <header className="bg-bg-100 shadow-sm border-b border-bg-300 sticky top-0 z-10">
        <div className="max-w-6xl mx-auto px-4 h-16 flex items-center justify-between">
          <div 
            className="flex items-center gap-2 cursor-pointer"
            onClick={() => setView('home')}
          >
            <div className="bg-primary-100 text-white p-2 rounded-lg">
              <Gamepad2 className="w-5 h-5" />
            </div>
            <span className="font-bold text-xl tracking-tight text-primary-100">BetPlay</span>
          </div>

          <div className="flex items-center gap-4">
            {currentUser ? (
              <div className="flex items-center gap-4">
                <div className="flex items-center gap-2 bg-primary-300 px-3 py-1.5 rounded-full text-primary-100 font-medium">
                  <Wallet className="w-4 h-4" />
                  <span>${currentUser.balance.toFixed(2)}</span>
                </div>
                <div className="flex items-center gap-2 text-text-200">
                  <User className="w-5 h-5" />
                  <span className="font-medium">{currentUser.username}</span>
                </div>
                <button 
                  onClick={handleLogout}
                  className="text-text-200 hover:text-primary-100 transition-colors"
                  title="Cerrar sesión"
                >
                  <LogOut className="w-5 h-5" />
                </button>
              </div>
            ) : (
              <div className="text-sm font-medium text-text-200">
                Inicia sesión para jugar
              </div>
            )}
          </div>
        </div>
      </header>

      {/* CONTENIDO PRINCIPAL */}
      <main className="max-w-6xl mx-auto px-4 py-8">
        
        {/* VISTA: HOME */}
        {view === 'home' && (
          <div className="animate-fade-in space-y-14">

            {/* ── HERO ── */}
            <section className="flex flex-col md:flex-row items-center gap-10 pt-8">
              {/* Texto */}
              <div className="flex-1 space-y-5">
                <span className="inline-flex items-center gap-2 bg-primary-300 text-primary-100 text-xs font-bold px-3 py-1 rounded-full uppercase tracking-widest">
                  <Swords className="w-3.5 h-3.5" /> 1 vs 1 · Dinero real
                </span>
                <h1 className="text-4xl md:text-5xl font-bold text-text-100 leading-tight">
                  Demuestra tu habilidad.<br />
                  <span className="text-primary-100">Gana dinero real.</span>
                </h1>
                <p className="text-text-200 max-w-md">
                  Elige un juego clásico, apuesta, encuentra rival y juega. El ganador se lo lleva todo. Sin descargas.
                </p>
                {/* Reglas compactas bajo el texto */}
                <ul className="space-y-2 pt-1">
                  {[
                    { icon: <Swords className="w-4 h-4" />, text: 'El ganador recibe el pozo menos el 5% de comisión.' },
                    { icon: <WifiOff className="w-4 h-4" />, text: 'Desconexión o abandono cuenta como derrota.' },
                    { icon: <ShieldAlert className="w-4 h-4" />, text: 'Error de plataforma → reembolso automático.' },
                  ].map(({ icon, text }) => (
                    <li key={text} className="flex items-start gap-2 text-sm text-text-200">
                      <span className="mt-0.5 text-text-200 shrink-0">{icon}</span>
                      {text}
                    </li>
                  ))}
                </ul>
              </div>

              {/* AuthPanel — solo si no hay sesión */}
              {!currentUser && isAuthReady && (
                <div className="w-full md:w-auto md:min-w-[360px]">
                  <AuthPanel
                    initialMode={pendingGame ? 'login' : 'register'}
                    notice={pendingGame ? `Inicia sesión para jugar ${pendingGame.name}.` : undefined}
                  />
                </div>
              )}
            </section>

            {/* ── JUEGOS ── */}
            <section>
              <div className="flex items-center justify-between mb-6">
                <h2 className="text-xl font-bold text-text-100">Elige tu juego</h2>
                <span className="text-sm text-text-200">{GAMES.length} disponibles</span>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                {GAMES.map(game => (
                  <button
                    key={game.id}
                    onClick={() => requestJoinGame(game)}
                    className="group text-left bg-bg-100 rounded-2xl border border-bg-300 overflow-hidden hover:border-primary-100 hover:shadow-md transition-all focus:outline-none focus-visible:ring-2 focus-visible:ring-primary-100"
                  >
                    {/* Franja superior con icono */}
                    <div className="h-24 bg-bg-200 group-hover:bg-primary-300 transition-colors flex items-center justify-center">
                      <span className="text-text-200 group-hover:text-primary-100 transition-colors [&>svg]:w-10 [&>svg]:h-10">
                        {game.icon}
                      </span>
                    </div>
                    {/* Contenido */}
                    <div className="p-5 space-y-1">
                      <div className="flex items-center justify-between">
                        <h3 className="font-bold text-text-100">{game.name}</h3>
                        <ArrowRight className="w-4 h-4 text-text-200 group-hover:text-primary-100 group-hover:translate-x-0.5 transition-all" />
                      </div>
                      <p className="text-xs text-text-200 leading-relaxed">{game.description}</p>
                    </div>
                  </button>
                ))}
              </div>
            </section>

          </div>
        )}

        {/* VISTA: LOBBY DE APUESTAS */}
        {view === 'lobby' && selectedGame && currentUser && (
          <div className="max-w-md mx-auto bg-bg-100 rounded-3xl shadow-sm border border-bg-300 p-8 animate-fade-in">
            <div className="text-center mb-8">
              <div className="bg-primary-300 w-20 h-20 rounded-2xl flex items-center justify-center text-primary-100 mx-auto mb-4">
                {selectedGame.icon}
              </div>
              <h2 className="text-2xl font-bold">{selectedGame.name}</h2>
              <p className="text-text-200 text-sm mt-2">Configura tu apuesta para buscar oponente.</p>
            </div>

            <div className="space-y-6">
              <div className="bg-bg-200 p-4 rounded-xl">
                <label className="block text-sm font-bold text-text-100 mb-2">Cantidad a apostar (USD)</label>
                <div className="flex items-center gap-2">
                  <span className="text-lg font-bold text-text-200">$</span>
                  <input 
                    type="number" 
                    value={betAmount}
                    onChange={(e) => setBetAmount(Number(e.target.value))}
                    min="1"
                    max={currentUser.balance}
                    disabled={queueStatus === 'searching'}
                    className="w-full bg-transparent text-2xl font-bold text-text-100 focus:outline-none"
                  />
                </div>
              </div>

              {betAmount > currentUser.balance && (
                <div className="flex items-center gap-2 text-red-500 text-sm bg-red-50 p-3 rounded-lg">
                  <AlertCircle className="w-4 h-4" />
                  <span>Saldo insuficiente. Tienes ${currentUser.balance.toFixed(2)}</span>
                </div>
              )}

              {queueStatus === 'timeout' ? (
                <div className="space-y-3">
                  <div className="flex items-center gap-2 text-text-200 text-sm bg-bg-200 p-3 rounded-lg">
                    <WifiOff className="w-4 h-4 flex-shrink-0" />
                    <span>No encontramos rival para ${betAmount} en {selectedGame.name} en 60 segundos.</span>
                  </div>
                  <button
                    onClick={retrySearch}
                    disabled={betAmount > currentUser.balance || betAmount <= 0}
                    className="w-full py-4 rounded-xl font-bold text-lg bg-accent-100 hover:bg-accent-200 text-white shadow-md hover:shadow-lg transition-all disabled:opacity-60 disabled:cursor-not-allowed"
                  >
                    Seguir buscando
                  </button>
                  <button
                    onClick={changeBet}
                    className="w-full py-3 rounded-xl font-bold text-text-100 bg-bg-200 hover:bg-bg-300 transition-colors"
                  >
                    Cambiar apuesta
                  </button>
                  <button
                    onClick={playAgainstBot}
                    className="w-full py-3 text-sm text-text-200 hover:text-text-100 font-medium transition-colors underline"
                  >
                    Jugar contra bot de prueba (modo prueba)
                  </button>
                </div>
              ) : (
                <div className="space-y-3">
                  {/* Botón principal: buscar rival real */}
                  <button
                    onClick={startMatchmaking}
                    disabled={queueStatus === 'searching' || betAmount > currentUser.balance || betAmount <= 0}
                    className={`w-full py-4 rounded-xl font-bold text-lg transition-all flex items-center justify-center gap-2
                      ${queueStatus === 'searching'
                        ? 'bg-bg-300 text-text-200 cursor-not-allowed'
                        : 'bg-accent-100 hover:bg-accent-200 text-white shadow-md hover:shadow-lg'
                      }`}
                  >
                    {queueStatus === 'searching' ? (
                      <>
                        <div className="w-5 h-5 border-2 border-text-200 border-t-transparent rounded-full animate-spin"></div>
                        Buscando oponente...
                      </>
                    ) : (
                      'Buscar rival real'
                    )}
                  </button>

                  {/* Separador */}
                  <div className="flex items-center gap-3 text-xs text-text-200">
                    <div className="flex-1 h-px bg-bg-300" />
                    <span>o</span>
                    <div className="flex-1 h-px bg-bg-300" />
                  </div>

                  {/* Botón secundario: jugar ya contra el bot */}
                  <button
                    onClick={startVsBot}
                    disabled={betAmount > currentUser.balance || betAmount <= 0}
                    className="w-full py-3 rounded-xl font-bold text-primary-100 border-2 border-primary-100 hover:bg-primary-300 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    Jugar ahora vs Bot
                  </button>
                </div>
              )}

              {queueStatus !== 'timeout' && (
                <button
                  onClick={cancelSearch}
                  className="w-full py-3 text-text-200 font-medium hover:text-text-100 transition-colors"
                >
                  Cancelar
                </button>
              )}
            </div>
          </div>
        )}

        {/* VISTA: JUGANDO */}
        {view === 'playing' && selectedGame && currentUser && (
          <div className="max-w-4xl mx-auto space-y-4 animate-fade-in">

            {/* PANTALLA DE RESULTADO — se muestra cuando la partida termina */}
            {gameResult ? (
              <div className="flex flex-col items-center justify-center py-16 space-y-6">
                {gameResult.isRefund ? (
                  /* Error de plataforma: reembolso */
                  <>
                    <div className="bg-bg-300 text-text-200 p-5 rounded-full">
                      <RefreshCcw className="w-12 h-12" />
                    </div>
                    <h2 className="text-2xl font-bold text-text-100">Partida cancelada</h2>
                    <p className="text-text-200 text-center max-w-sm">
                      Se produjo un error de plataforma. Tu apuesta de{' '}
                      <span className="font-bold text-text-100">${betAmount.toFixed(2)}</span> ha sido reembolsada.
                    </p>
                  </>
                ) : gameResult.won ? (
                  /* Victoria */
                  <>
                    <div className="bg-accent-100/10 text-accent-100 p-5 rounded-full">
                      <Trophy className="w-12 h-12" />
                    </div>
                    <h2 className="text-3xl font-bold text-text-100">¡Ganaste!</h2>
                    <div className="text-center space-y-1">
                      <p className="text-text-200 text-sm">Ganancia neta (comisión {PLATFORM_FEE_PERCENT}% incluida)</p>
                      <p className="text-4xl font-bold text-accent-100">
                        +${gameResult.profit.toFixed(2)}
                      </p>
                    </div>
                    <p className="text-text-200 text-sm">
                      Nuevo saldo:{' '}
                      <span className="font-bold text-text-100">${currentUser.balance.toFixed(2)}</span>
                    </p>
                  </>
                ) : (
                  /* Derrota */
                  <>
                    <div className="bg-primary-100/10 text-primary-100 p-5 rounded-full">
                      <AlertCircle className="w-12 h-12" />
                    </div>
                    <h2 className="text-3xl font-bold text-text-100">Perdiste</h2>
                    <div className="text-center space-y-1">
                      <p className="text-text-200 text-sm">Apuesta perdida</p>
                      <p className="text-4xl font-bold text-primary-100">
                        -${betAmount.toFixed(2)}
                      </p>
                    </div>
                    <p className="text-text-200 text-sm">
                      Nuevo saldo:{' '}
                      <span className="font-bold text-text-100">${currentUser.balance.toFixed(2)}</span>
                    </p>
                  </>
                )}

                <button
                  onClick={goHome}
                  className="mt-4 flex items-center gap-2 bg-primary-100 hover:bg-primary-200 text-white px-8 py-3 rounded-xl font-bold transition-colors"
                >
                  <Home className="w-5 h-5" />
                  Volver al inicio
                </button>
              </div>
            ) : (
              /* PARTIDA EN CURSO */
              <>
                {/* Cabecera del juego */}
                <div className="bg-bg-100 rounded-2xl shadow-sm border border-bg-300 p-4 flex justify-between items-center">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 bg-primary-300 text-primary-100 rounded-full flex items-center justify-center font-bold">
                      {currentUser.username.charAt(0).toUpperCase()}
                    </div>
                    <div>
                      <div className="font-bold">{currentUser.username}</div>
                      <div className="text-xs text-text-200">Tú (Local)</div>
                    </div>
                  </div>

                  <div className="flex flex-col items-center">
                    <span className="text-xs font-bold text-text-200 uppercase tracking-widest">Pozo Total</span>
                    <span className="text-xl font-bold text-accent-100">${(betAmount * 2).toFixed(2)}</span>
                  </div>

                  <div className="flex items-center gap-3 text-right">
                    <div>
                      <div className="font-bold">{opponent?.username ?? 'Rival'}</div>
                      <div className="text-xs text-text-200">
                        {opponent?.isBot ? 'Bot de prueba (modo prueba)' : 'Rival (emparejado)'}
                      </div>
                    </div>
                    <div className="w-10 h-10 bg-bg-300 text-text-100 rounded-full flex items-center justify-center font-bold">
                      {(opponent?.username ?? 'P').charAt(0).toUpperCase()}
                    </div>
                  </div>
                </div>

                {/* AREA DEL JUEGO (Renderizado real con HTML5 Canvas) */}
                <div className="w-full relative overflow-hidden flex flex-col items-center justify-center border-4 border-bg-100 rounded-xl bg-black">
                  {renderGame()}
                  <div className="absolute top-4 left-4 flex gap-2 pointer-events-none">
                    <span className="bg-black/50 text-white text-xs px-2 py-1 rounded backdrop-blur-sm flex items-center gap-1">
                      <div className="w-2 h-2 rounded-full bg-accent-100"></div> Ping: 24ms
                    </span>
                  </div>
                  <div className="absolute bottom-4 left-0 w-full text-center pointer-events-none">
                    <span className="bg-black/50 text-white/70 text-xs px-4 py-2 rounded-lg backdrop-blur-sm shadow-sm inline-block mb-4">
                      Controles — <b>P1</b>: WASD / Espacio | <b>P2</b>: Flechas / Enter
                    </span>
                  </div>
                </div>
              </>
            )}
          </div>
        )}

      </main>
    </div>
  );
}
