import { useEffect, useRef, useState } from 'react';
import { Activity, Crosshair, Gamepad2, Grid, Swords } from 'lucide-react';

import Pong from './games/Pong';
import Snake from './games/Snake';
import Tetris from './games/Tetris';
import Combat from './games/Combat';
import Shooter from './games/Shooter';
import { useAuth } from './auth/AuthContext';
import { cancelQueue, createBotMatch, joinQueue, tryMatch } from './api/matchmakingApi';
import type { Game, MatchHistoryRecord, MatchPlayer, MatchTicket, QueueStatus } from './types';
import { appendRecord } from './api/historyApi';
import ProfilePanel from './profile/ProfilePanel';
import Navbar from './components/layout/Navbar';
import HomeLanding from './components/home/HomeLanding';
import LobbyPanel from './components/lobby/LobbyPanel';
import GameResultPanel, { type GameResult } from './components/play/GameResultPanel';
import PlayingArena from './components/play/PlayingArena';

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
  const [view, setView] = useState<'home' | 'lobby' | 'playing' | 'profile'>('home');
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
    const netProfit = won ? pot - betAmount : -betAmount;

    if (won) {
      // currentUser.balance ya tiene la reserva descontada: sumar el pozo neto.
      setBalance((currentUser?.balance ?? 0) + pot);
      setGameResult({ won: true, profit: netProfit, isRefund: false });
    } else {
      // La reserva ya fue descontada: el saldo no cambia más.
      setGameResult({ won: false, profit: netProfit, isRefund: false });
    }

    // Guardar en el historial solo partidas contra jugadores reales (no bots).
    if (currentUser && selectedGame && !opponent?.isBot) {
      const record: MatchHistoryRecord = {
        id: crypto.randomUUID(),
        userId: currentUser.id,
        gameId: selectedGame.id,
        gameName: selectedGame.name,
        betAmount,
        result: won ? 'win' : 'loss',
        profit: netProfit,
        playedAt: Date.now(),
      };
      appendRecord(record);
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
      <Navbar
        user={currentUser}
        onGoHome={() => setView('home')}
        onOpenProfile={() => setView('profile')}
        onLogout={handleLogout}
      />

      <main className="max-w-6xl mx-auto px-4 py-8">
        {view === 'home' && (
          <HomeLanding
            games={GAMES}
            currentUser={currentUser}
            isAuthReady={isAuthReady}
            pendingGame={pendingGame}
            onSelectGame={requestJoinGame}
          />
        )}

        {view === 'lobby' && selectedGame && currentUser && (
          <LobbyPanel
            selectedGame={selectedGame}
            balance={currentUser.balance}
            betAmount={betAmount}
            queueStatus={queueStatus}
            onBetChange={setBetAmount}
            onSearch={startMatchmaking}
            onCancel={cancelSearch}
            onRetry={retrySearch}
            onChangeBet={changeBet}
            onPlayBot={playAgainstBot}
            onStartVsBot={startVsBot}
          />
        )}

        {view === 'playing' && selectedGame && currentUser && (
          <div className="max-w-4xl mx-auto space-y-4 animate-fade-in">
            {gameResult ? (
              <GameResultPanel
                result={gameResult}
                betAmount={betAmount}
                balance={currentUser.balance}
                feePercent={PLATFORM_FEE_PERCENT}
                onGoHome={goHome}
              />
            ) : (
              <PlayingArena
                username={currentUser.username}
                opponent={opponent}
                betAmount={betAmount}
              >
                {renderGame()}
              </PlayingArena>
            )}
          </div>
        )}

        {view === 'profile' && currentUser && (
          <ProfilePanel user={currentUser} onBack={() => setView('home')} />
        )}
      </main>
    </div>
  );
}
