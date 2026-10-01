import { useEffect, useRef, useState } from 'react';
import { Activity, Crosshair, Gamepad2, Grid, Swords } from 'lucide-react';

import Pong from './games/Pong';
import Snake from './games/Snake';
import Tetris from './games/Tetris';
import Combat from './games/Combat';
import Shooter from './games/Shooter';
import { useAuth } from './auth/AuthContext';
import ResetPasswordScreen from './auth/ResetPasswordScreen';
import { cancelQueue, createBotMatch, joinQueue, startDirectMatch, tryMatch } from './api/matchmakingApi';
import { cancelMatch, submitMatchResult } from './api/matchesApi';
import { getCurrentSession } from './api/authApi';
import type { Game, MatchPlayer, MatchTicket, QueueStatus, UserProfile } from './types';
import ProfilePanel from './profile/ProfilePanel';
import Navbar from './components/layout/Navbar';
import HomeLanding from './components/home/HomeLanding';
import SubscriptionPayDialog from './components/home/SubscriptionPayDialog';
import { isCurrentSubscriptionMonth } from './api/subscriptionsApi';
import LobbyPanel from './components/lobby/LobbyPanel';
import GameResultPanel, { type GameResult } from './components/play/GameResultPanel';
import PlayingArena from './components/play/PlayingArena';

/** Frecuencia de consulta de la cola. El servidor marca el ticket como expired a los 60 s. */
const QUEUE_POLL_INTERVAL_MS = 1000;
/** Comisión de la plataforma sobre el pozo total (en porcentaje). */
const PLATFORM_FEE_PERCENT = 5;

const readResetToken = (): string | null => {
  if (window.location.pathname !== '/restablecer') return null;
  return new URLSearchParams(window.location.search).get('token')?.trim() ?? '';
};

// Datos estáticos
const GAMES: Game[] = [
  { id: 'pong', name: 'Paddle Duel', description: 'Reflejos rápidos. El primero en llegar a 10 puntos gana.', icon: <Activity className="w-8 h-8" /> },
  { id: 'snake', name: 'Worm Clash', description: 'Templo de la serpiente. Come gemas y haz que el rival choque.', icon: <Gamepad2 className="w-8 h-8" /> },
  { id: 'tetris', name: 'Block Battle', description: 'Limpia líneas para enviar basura a tu rival.', icon: <Grid className="w-8 h-8" /> },
  { id: 'combat', name: 'Arena Clash', description: 'Espada y arco de cinco flechas. Reduce la vida del rival a cero.', icon: <Swords className="w-8 h-8" /> },
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
  const [scrollTarget, setScrollTarget] = useState<string | null>(null);
  const [selectedGame, setSelectedGame] = useState<Game | null>(null);
  
  // Estados para el Lobby
  const [betAmount, setBetAmount] = useState<number>(10);

  // ==========================================
  // BÚSQUEDA (matchmaking mock) — ver src/matchmaking/README.md.
  // Cola real vía localStorage compartida entre pestañas del navegador.
  // ==========================================
  const [queueStatus, setQueueStatus] = useState<QueueStatus>('idle');
  const [queueError, setQueueError] = useState<string | null>(null);
  const [ticket, setTicket] = useState<MatchTicket | null>(null);
  const [lastRivalId, setLastRivalId] = useState<string | null>(null);
  const [opponent, setOpponent] = useState<MatchPlayer | null>(null);
  const [activeMatch, setActiveMatch] = useState<{ id: string; isBot: boolean } | null>(null);
  const [matchError, setMatchError] = useState<string | null>(null);

  // ==========================================
  // AUTH-04 — Gate de juego: si intentan jugar sin sesión, se guarda el
  // juego elegido y se muestra el panel de login con un aviso. En cuanto
  // hay sesión, se entra directo al lobby de ese juego (ver useEffect abajo).
  // ==========================================
  const [pendingGame, setPendingGame] = useState<Game | null>(null);
  const [subscriptionOpen, setSubscriptionOpen] = useState(false);
  const [resetToken, setResetToken] = useState<string | null>(readResetToken);
  const isChoosingPassword = resetToken !== null;
  const userId = currentUser?.id ?? null;

  const leavePasswordReset = () => {
    window.history.replaceState({}, '', '/');
    setResetToken(null);
    setView('home');
  };

  useEffect(() => {
    if (isChoosingPassword || userId === null) {
      setSubscriptionOpen(false);
      return;
    }
    setSubscriptionOpen(!isCurrentSubscriptionMonth(currentUser?.subscriptionMonth));
  }, [userId, isChoosingPassword, currentUser?.subscriptionMonth]);

  useEffect(() => {
    if (view !== 'home' || !scrollTarget) return;
    const section = scrollTarget;
    const frame = window.requestAnimationFrame(() => {
      if (section === 'inicio') {
        window.scrollTo({ top: 0, behavior: 'smooth' });
      } else {
        document.getElementById(section)?.scrollIntoView({ behavior: 'smooth', block: 'start' });
      }
      setScrollTarget(null);
    });
    return () => window.cancelAnimationFrame(frame);
  }, [view, scrollTarget]);

  // ==========================================
  // RESULTADO DE PARTIDA — Milestone 3.
  // Se establece al terminar una partida y muestra la pantalla de resultado.
  // Null mientras no hay resultado pendiente de mostrar.
  // ==========================================
  const [gameResult, setGameResult] = useState<GameResult | null>(null);
  const settlingRef = useRef(false);
  const botStartRef = useRef(false);

  /** Vuelve a home y limpia el estado de resultado de partida. */
  const goHome = () => {
    setGameResult(null);
    setMatchError(null);
    setOpponent(null);
    setActiveMatch(null);
    setView('home');
    setSelectedGame(null);
  };

  const syncBalanceFromServer = async () => {
    const session = await getCurrentSession();
    if (!session) return;
    await setBalance(session.user.balance);
  };

  const handleLogout = () => {
    if (ticket) void cancelQueue(ticket.id);
    setTicket(null);
    setQueueStatus('idle');
    setQueueError(null);
    setOpponent(null);
    setActiveMatch(null);
    setMatchError(null);
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
      if (ticket) void cancelQueue(ticket.id);
      setTicket(null);
      setQueueStatus('idle');
      setView('home');
      setSelectedGame(null);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps -- solo debe reaccionar a cambios de sesión/vista.
  }, [currentUser, view]);

  // El backend descuenta la apuesta al crear el ticket y la devuelve al cancelar o al expirar.
  const startMatchmaking = async () => {
    if (!currentUser || !selectedGame || betAmount > currentUser.balance || betAmount <= 0) return;

    setQueueError(null);
    botStartRef.current = false;
    const result = await joinQueue({ gameId: selectedGame.id, betAmount });
    if (!result.ok) {
      setQueueError(result.message);
      return;
    }

    setTicket(result.ticket);
    setQueueStatus('searching');
    await syncBalanceFromServer();
  };

  const cancelSearch = async () => {
    if (ticket) {
      const result = await cancelQueue(ticket.id);
      if (!result.ok && result.message) setQueueError(result.message);
    }
    setTicket(null);
    setQueueStatus('idle');
    setView('home');
    setSelectedGame(null);
    await syncBalanceFromServer();
  };

  // SRC-04 — Tras un timeout, permite reintentar con la misma apuesta.
  const retrySearch = () => {
    setQueueStatus('idle');
    startMatchmaking();
  };

  // SRC-04 — Tras un timeout, permite volver a elegir la apuesta.
  const changeBet = () => {
    setTicket(null);
    setQueueStatus('idle');
  };

  const startAgainstRival = async (rival: UserProfile) => {
    if (!currentUser || !selectedGame || betAmount > currentUser.balance || betAmount <= 0) return;
    if (queueStatus === 'searching') return;
    setQueueStatus('searching');
    setQueueError(null);
    const result = await startDirectMatch({
      gameId: selectedGame.id,
      betAmount,
      rivalUserId: rival.id,
    });
    if (!result.ok) {
      setQueueError(result.message);
      setQueueStatus('idle');
      return;
    }
    setLastRivalId(rival.id);
    setOpponent({ ...result.opponent, isBot: true });
    setActiveMatch({ id: result.match.id, isBot: false });
    setQueueStatus('idle');
    setView('playing');
    await syncBalanceFromServer();
  };

  const playAgainstBot = async () => {
    if (!ticket) return;
    const result = await createBotMatch(ticket);
    if (!result.ok) {
      setQueueError(result.message);
      return;
    }
    setOpponent(result.opponent);
    setActiveMatch({ id: result.match.id, isBot: true });
    setTicket(null);
    setQueueStatus('idle');
    setQueueError(null);
    setView('playing');
    await syncBalanceFromServer();
  };

  // El servidor empareja al consultar el ticket y lo marca expired a los 60 s.
  useEffect(() => {
    if (queueStatus !== 'searching' || !ticket) return;

    let stopped = false;
    let inFlight = false;

    const poll = async () => {
      if (stopped || inFlight) return;
      inFlight = true;
      const result = await tryMatch(ticket);
      inFlight = false;
      if (stopped) return;

      if (result.status === 'matched') {
        setOpponent(result.opponent);
        setActiveMatch({ id: result.match.id, isBot: Boolean(result.opponent.isBot) });
        setTicket(null);
        setQueueStatus('idle');
        setView('playing');
        return;
      }

      if (result.status === 'expired') {
        if (botStartRef.current) return;
        botStartRef.current = true;
        const bot = await createBotMatch(ticket);
        if (stopped) return;
        if (!bot.ok) {
          botStartRef.current = false;
          setQueueError(bot.message);
          setQueueStatus('timeout');
          await syncBalanceFromServer();
          return;
        }
        setOpponent(bot.opponent);
        setActiveMatch({ id: bot.match.id, isBot: true });
        setTicket(null);
        setQueueStatus('idle');
        setQueueError(null);
        setView('playing');
        await syncBalanceFromServer();
        return;
      }

      if (result.status === 'cancelled') {
        setTicket(null);
        setQueueStatus('idle');
        setView('home');
        await syncBalanceFromServer();
        return;
      }

      if (result.status === 'error') setQueueError(result.message);
    };

    void poll();
    const intervalId = window.setInterval(() => {
      void poll();
    }, QUEUE_POLL_INTERVAL_MS);

    return () => {
      stopped = true;
      window.clearInterval(intervalId);
    };
  }, [queueStatus, ticket]);

  const handleGameEnd = async (won: boolean, reason?: string) => {
    if (settlingRef.current) return;
    if (!currentUser || !activeMatch) {
      setMatchError('No hay una partida activa para resolver.');
      return;
    }

    settlingRef.current = true;
    setMatchError(null);

    if (activeMatch.isBot) {
      setGameResult({ won, profit: 0, isRefund: false });
      setOpponent(null);
      setActiveMatch(null);
      settlingRef.current = false;
      return;
    }

    const winnerUserId = won ? currentUser.id : opponent?.userId;
    if (!winnerUserId && reason !== 'platform_error') {
      setMatchError('No se pudo identificar al ganador.');
      settlingRef.current = false;
      return;
    }

    const settlement = reason === 'platform_error'
      ? await cancelMatch(activeMatch.id)
      : await submitMatchResult(activeMatch.id, winnerUserId ?? '');

    if (!settlement.ok) {
      setMatchError(settlement.message);
      settlingRef.current = false;
      return;
    }

    const me = settlement.players.find((player) => player.id === currentUser.id);
    if (!me) {
      setMatchError('La respuesta no incluye tus puntos.');
      settlingRef.current = false;
      return;
    }

    const profit = reason === 'platform_error' ? 0 : me.balance - (currentUser.balance + betAmount);
    await setBalance(me.balance);
    setGameResult({
      won: reason === 'platform_error' ? false : won,
      profit,
      isRefund: reason === 'platform_error',
    });
    setOpponent(null);
    setActiveMatch(null);
    settlingRef.current = false;
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
      {subscriptionOpen && currentUser && (
        <SubscriptionPayDialog
          onClose={() => setSubscriptionOpen(false)}
          onPaid={() => setSubscriptionOpen(false)}
        />
      )}

      <Navbar
        user={currentUser}
        onGoHome={() => {
          if (isChoosingPassword) leavePasswordReset();
          else setView('home');
        }}
        onOpenProfile={() => setView('profile')}
        onLogout={handleLogout}
        isAuthReady={isAuthReady}
        pendingGame={pendingGame}
        onNavigate={(section) => {
          if (isChoosingPassword) leavePasswordReset();
          setView('home');
          setScrollTarget(section);
        }}
      />

      <main>
        {isChoosingPassword ? (
          <ResetPasswordScreen
            token={resetToken}
            onDone={leavePasswordReset}
            onLeave={leavePasswordReset}
          />
        ) : view === 'home' && (
          <HomeLanding
            games={GAMES}
            currentUser={currentUser}
            onSelectGame={requestJoinGame}
          />
        )}

        {!isChoosingPassword && view !== 'home' && (
        <div className="max-w-6xl mx-auto px-4 py-8">

        {view === 'lobby' && selectedGame && currentUser && (
          <LobbyPanel
            selectedGame={selectedGame}
            balance={currentUser.balance}
            betAmount={betAmount}
            queueStatus={queueStatus}
            onBetChange={setBetAmount}
            onCancel={cancelSearch}
            onRetry={retrySearch}
            onChangeBet={changeBet}
            onPlayBot={playAgainstBot}
            queueError={queueError}
            currentUser={currentUser}
            lastRivalId={lastRivalId}
            onPlayRival={startAgainstRival}
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
            ) : matchError ? (
              <div className="bg-bg-100 rounded-2xl border border-bg-300 p-8 text-center space-y-4" role="alert">
                <h2 className="text-xl font-bold text-text-100">No se pudo resolver la partida</h2>
                <p className="text-sm text-text-200">{matchError}</p>
                <button
                  type="button"
                  onClick={goHome}
                  className="bg-primary-100 hover:bg-primary-200 text-white px-6 py-3 rounded-xl font-bold"
                >
                  Volver al inicio
                </button>
              </div>
            ) : (
              <PlayingArena
                username={currentUser.username}
                opponent={opponent}
                betAmount={betAmount}
                controlsHint={selectedGame.id === 'combat'
                  ? 'Controles — P1: WASD, Espacio (espada), F (arco, 5 flechas) | P2: Flechas, Enter, K (arco)'
                  : selectedGame.id === 'snake'
                    ? 'Controles — P1: WASD, Shift (acelerón) | P2: Flechas'
                    : undefined}
              >
                {renderGame()}
              </PlayingArena>
            )}
          </div>
        )}

        {view === 'profile' && currentUser && (
          <ProfilePanel user={currentUser} onBack={() => setView('home')} />
        )}
        </div>
        )}
      </main>
    </div>
  );
}
