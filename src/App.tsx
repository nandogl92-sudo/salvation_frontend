import { useEffect, useRef, useState } from 'react';
import { Activity, Crosshair, Flag, Plane, Umbrella } from 'lucide-react';

import Pong from './games/Pong';
import AeroRings from './games/Plane';
import Racing from './games/Racing';
import Skydive from './games/Skydive';
import Shooter from './games/Shooter';
import { useAuth } from './auth/AuthContext';
import ResetPasswordScreen from './auth/ResetPasswordScreen';
import { cancelQueue, createBotMatch, joinQueue, startDirectMatch, tryMatch } from './api/matchmakingApi';
import { cancelMatch, fetchMatchStatus, forfeitMatch, submitMatchResult, type MatchStatusView, type SettlementPlayer } from './api/matchesApi';
import { getCurrentSession } from './api/authApi';
import type { Game, MatchPlayer, MatchTicket, QueueStatus, UserProfile } from './types';
import { monthPointsOf } from './components/utils/monthPointsOf';
import { monthTotalOf, recordRankedWin } from './matchmaking/rankedWeeks';
import ProfilePanel from './profile/ProfilePanel';
import Navbar from './components/layout/Navbar';
import HomeLanding from './components/home/HomeLanding';
import SubscriptionPayDialog from './components/home/SubscriptionPayDialog';
import { isCurrentSubscriptionMonth } from './api/subscriptionsApi';
import { rankedLeftToday, recordRankedPlay } from './matchmaking/rankedLimits';
import LobbyPanel from './components/lobby/LobbyPanel';
import GameResultPanel, { type GameResult } from './components/play/GameResultPanel';
import PlayingArena from './components/play/PlayingArena';
import { buildSharedWorld, type SharedWorld } from './games/sharedWorld';

/** Frecuencia de consulta de la cola. El servidor marca el ticket como expired a los 120 s. */
const QUEUE_POLL_INTERVAL_MS = 400;
/** Consulta del cierre compartido mientras dura la ranqueada. */
const MATCH_STATUS_POLL_MS = 400;
/** Comisión de la plataforma sobre el pozo total (en porcentaje). */
const PLATFORM_FEE_PERCENT = 5;

const readResetToken = (): string | null => {
  if (window.location.pathname !== '/restablecer') return null;
  return new URLSearchParams(window.location.search).get('token')?.trim() ?? '';
};

// Datos estáticos
const GAMES: Game[] = [
  { id: 'pong', name: 'Paddle Duel', description: 'Reflejos rápidos. El primero en llegar a 10 puntos gana.', icon: <Activity className="w-8 h-8" /> },
  { id: 'snake', name: 'Aero Rings', description: 'Gravedad y aros. Impulso con espacio. Gana quien sobreviva más tiempo.', icon: <Plane className="w-8 h-8" /> },
  { id: 'tetris', name: 'Slot Car Racing', description: 'Circuito procedural. El primero en completar 5 vueltas válidas gana.', icon: <Flag className="w-8 h-8" /> },
  { id: 'combat', name: 'Sky Drop', description: 'Dos paracaidistas. Gana quien sobreviva más tiempo sin chocar.', icon: <Umbrella className="w-8 h-8" /> },
  { id: 'shooter', name: 'Laser Duel', description: 'Cyan Pulse vs Amber Bolt en Laser Yard. Precisión y velocidad.', icon: <Crosshair className="w-8 h-8" /> },
];

export default function App() {
  // ==========================================
  // AUTH — provisto por AuthContext (mock). Ver src/auth/README.md
  // ==========================================
  const { user: currentUser, isReady: isAuthReady, logout, setBalance, setMonthPoints } = useAuth();

  // ==========================================
  // ESTADOS PRINCIPALES
  // ==========================================
  const [view, setView] = useState<'home' | 'lobby' | 'playing' | 'profile'>('home');
  const [scrollTarget, setScrollTarget] = useState<string | null>(null);
  const [selectedGame, setSelectedGame] = useState<Game | null>(null);
  
  // Estados para el Lobby
  const betAmount = 1;

  // ==========================================
  // BÚSQUEDA (matchmaking mock) — ver src/matchmaking/README.md.
  // Cola real vía localStorage compartida entre pestañas del navegador.
  // ==========================================
  const [queueStatus, setQueueStatus] = useState<QueueStatus>('idle');
  const [queueError, setQueueError] = useState<string | null>(null);
  const [queueHold, setQueueHold] = useState<string | null>(null);
  const [queueIsRanked, setQueueIsRanked] = useState(false);
  const [ticket, setTicket] = useState<MatchTicket | null>(null);
  const [lastRivalId, setLastRivalId] = useState<string | null>(null);
  const [opponent, setOpponent] = useState<MatchPlayer | null>(null);
  const [activeMatch, setActiveMatch] = useState<{
    id: string;
    isBot: boolean;
    isRanked: boolean;
    world: SharedWorld | null;
  } | null>(null);
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
    if (!userId) return;
    const total = monthTotalOf(userId);
    if (total === monthPointsOf(currentUser)) return;
    void setMonthPoints(total);
    // eslint-disable-next-line react-hooks/exhaustive-deps -- solo al cambiar de cuenta; el total sale de las 3 mejores semanas locales.
  }, [userId]);

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
  const settledMatchIdRef = useRef<string | null>(null);
  const rankedPlayRef = useRef({
    matchId: null as string | null,
    isRanked: false,
    isBot: false,
    rivalUserId: null as string | null,
    showingResult: false,
  });
  rankedPlayRef.current = {
    matchId: activeMatch?.id ?? null,
    isRanked: Boolean(activeMatch?.isRanked),
    isBot: Boolean(activeMatch?.isBot),
    rivalUserId: opponent?.userId ?? null,
    showingResult: Boolean(gameResult),
  };

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

  const forfeitRankedLeave = (keepalive: boolean) => {
    const play = rankedPlayRef.current;
    if (!play.matchId || play.isBot || !play.isRanked || play.showingResult) return;
    if (settledMatchIdRef.current === play.matchId) return;
    settledMatchIdRef.current = play.matchId;
    void forfeitMatch(play.matchId, { keepalive });
  };

  const handleLogout = () => {
    forfeitRankedLeave(true);
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
    setQueueError(null);
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
  const startMatchmaking = async (isRanked = false) => {
    if (!currentUser || !selectedGame || betAmount > currentUser.balance || betAmount <= 0) return;

    setQueueIsRanked(isRanked);
    setQueueError(null);
    setQueueHold(null);
    const result = await joinQueue({ gameId: selectedGame.id, betAmount, ranked: isRanked });
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
    setQueueIsRanked(false);
    setQueueHold(null);
    setView('home');
    setSelectedGame(null);
    await syncBalanceFromServer();
  };

  // SRC-04 — Tras un timeout, permite reintentar con la misma apuesta.
  const retrySearch = (isRanked: boolean) => {
    setQueueStatus('idle');
    startMatchmaking(isRanked);
  };

  const startAgainstRival = async (rival: UserProfile, isRanked: boolean) => {
    if (!currentUser || !selectedGame || betAmount > currentUser.balance || betAmount <= 0) return;
    if (queueStatus === 'searching') return;
    if (isRanked) {
      if (rankedLeftToday(currentUser.id) <= 0) {
        setQueueError('Hoy ya usaste las 8 ranqueadas. Juega amistoso.');
        return;
      }
      await startMatchmaking(true);
      return;
    }
    setQueueIsRanked(false);
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
    setOpponent({ ...result.opponent, isBot: false });
    setActiveMatch({ id: result.match.id, isBot: false, isRanked: false, world: null });
    setQueueStatus('idle');
    setView('playing');
    await syncBalanceFromServer();
  };

  const playAgainstBot = async () => {
    if (!ticket || queueIsRanked) return;
    const result = await createBotMatch(ticket);
    if (!result.ok) {
      setQueueError(result.message);
      return;
    }
    setOpponent(result.opponent);
    setActiveMatch({ id: result.match.id, isBot: true, isRanked: false, world: null });
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
        const matchedBot = Boolean(result.opponent.isBot);
        if (matchedBot && queueIsRanked) {
          setQueueStatus('timeout');
          await syncBalanceFromServer();
          return;
        }
        const ranked = queueIsRanked && !matchedBot;
        if (ranked && (!result.arenaOpen || !result.world)) {
          setQueueHold(result.opponent.username);
          return;
        }
        if (ranked) {
          recordRankedPlay(ticket.userId, result.opponent.userId);
        }
        setLastRivalId(result.opponent.userId);
        setOpponent(result.opponent);
        settledMatchIdRef.current = null;
        settlingRef.current = false;
        setActiveMatch({
          id: result.match.id,
          isBot: matchedBot,
          isRanked: ranked,
          world: ranked
            ? buildSharedWorld({
                matchId: result.match.id,
                createdAt: result.match.createdAt,
                localUserId: ticket.userId,
                rivalUserId: result.opponent.userId,
                youName: ticket.username,
                rivalName: result.opponent.username,
                seed: result.world?.seed,
                startAt: result.world?.startAt,
                localSide: result.world?.localSide,
              })
            : null,
        });
        setTicket(null);
        setQueueStatus('idle');
        setView('playing');
        return;
      }

      if (result.status === 'expired') {
        setQueueHold(null);
        setQueueStatus('timeout');
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
  }, [queueStatus, ticket, queueIsRanked]);

  const applyRankedMonthPoints = async (isRanked: boolean, won: boolean, isRefund: boolean) => {
    const before = currentUser ? monthTotalOf(currentUser.id) : 0;
    if (!currentUser || !isRanked || isRefund || !won) {
      return { monthPoints: before, monthPointsDelta: 0 };
    }
    recordRankedWin(currentUser.id);
    const next = monthTotalOf(currentUser.id);
    await setMonthPoints(next);
    return { monthPoints: next, monthPointsDelta: next - before };
  };

  const closeRankedMatch = async (input: {
    matchId: string;
    winnerUserId: string | null;
    endReason: 'play' | 'forfeit' | null;
    isRefund: boolean;
    players: SettlementPlayer[];
  }) => {
    if (!currentUser) return;
    if (settledMatchIdRef.current === input.matchId) return;
    settledMatchIdRef.current = input.matchId;
    settlingRef.current = true;
    const won = input.winnerUserId === currentUser.id;
    const me = input.players.find((player) => player.id === currentUser.id);
    if (me) await setBalance(me.balance);
    const profit = input.isRefund || !me ? 0 : me.balance - (currentUser.balance + betAmount);
    const month = await applyRankedMonthPoints(true, won, input.isRefund);
    setGameResult({
      won: input.isRefund ? false : won,
      profit,
      isRefund: input.isRefund,
      isRanked: true,
      byAbandon: input.endReason === 'forfeit',
      ...month,
    });
    setOpponent(null);
    setActiveMatch(null);
    settlingRef.current = false;
  };

  const applyServerStatus = async (matchId: string, status: MatchStatusView) => {
    await closeRankedMatch({
      matchId,
      winnerUserId: status.winnerUserId,
      endReason: status.endReason,
      isRefund: status.settlement === 'refunded',
      players: status.players,
    });
  };

  const handleGameEnd = async (won: boolean, reason?: string) => {
    if (settlingRef.current) return;
    if (!currentUser || !activeMatch) {
      setMatchError('No hay una partida activa para resolver.');
      return;
    }
    if (settledMatchIdRef.current === activeMatch.id) return;

    settlingRef.current = true;
    setMatchError(null);
    const isRefund = reason === 'platform_error';
    const isRanked = activeMatch.isRanked && !activeMatch.isBot;
    const endReason = reason === 'forfeit' ? 'forfeit' : 'play';

    if (activeMatch.isBot) {
      const month = await applyRankedMonthPoints(false, won, false);
      setGameResult({ won, profit: 0, isRefund: false, isRanked: false, ...month });
      setOpponent(null);
      setActiveMatch(null);
      settlingRef.current = false;
      return;
    }

    const winnerUserId = won ? currentUser.id : opponent?.userId;
    if (!winnerUserId && !isRefund) {
      setMatchError('No se pudo identificar al ganador.');
      settlingRef.current = false;
      return;
    }

    const matchId = activeMatch.id;
    const settlement = isRefund
      ? await cancelMatch(matchId)
      : await submitMatchResult(matchId, winnerUserId ?? '', endReason);

    if (!settlement.ok) {
      if (isRanked && settlement.alreadySettled) {
        const status = await fetchMatchStatus(matchId);
        if (status.ok) {
          settlingRef.current = false;
          await applyServerStatus(matchId, status.status);
          return;
        }
      }
      setMatchError(settlement.message);
      settlingRef.current = false;
      return;
    }

    if (isRanked) {
      settlingRef.current = false;
      await closeRankedMatch({
        matchId,
        winnerUserId: winnerUserId ?? null,
        endReason: isRefund ? null : endReason,
        isRefund,
        players: settlement.players,
      });
      return;
    }

    const me = settlement.players.find((player) => player.id === currentUser.id);
    if (!me) {
      setMatchError('La respuesta no incluye tus fichas.');
      settlingRef.current = false;
      return;
    }

    const profit = isRefund ? 0 : me.balance - (currentUser.balance + betAmount);
    await setBalance(me.balance);
    const month = await applyRankedMonthPoints(false, won, isRefund);
    setGameResult({
      won: isRefund ? false : won,
      profit,
      isRefund,
      isRanked: false,
      ...month,
    });
    setOpponent(null);
    setActiveMatch(null);
    settlingRef.current = false;
  };

  useEffect(() => {
    const handlePageHide = () => {
      forfeitRankedLeave(true);
    };
    window.addEventListener('pagehide', handlePageHide);
    return () => window.removeEventListener('pagehide', handlePageHide);
  }, []);

  useEffect(() => {
    if (view !== 'playing' || !activeMatch || !activeMatch.isRanked || activeMatch.isBot || gameResult || !currentUser) {
      return;
    }

    const matchId = activeMatch.id;
    let stopped = false;
    let inFlight = false;

    const poll = async () => {
      if (stopped || inFlight || settlingRef.current) return;
      if (settledMatchIdRef.current === matchId) return;
      inFlight = true;
      const result = await fetchMatchStatus(matchId);
      inFlight = false;
      if (stopped) return;
      if (!result.ok) return;

      if (result.status.settlement === 'resolved' || result.status.settlement === 'refunded') {
        await applyServerStatus(matchId, result.status);
      }
    };

    void poll();
    const intervalId = window.setInterval(() => {
      void poll();
    }, MATCH_STATUS_POLL_MS);

    return () => {
      stopped = true;
      window.clearInterval(intervalId);
    };
  }, [view, activeMatch, gameResult, currentUser]);

  const renderGame = () => {
    const world = activeMatch?.world ?? null;
    const localSide = world?.localSide ?? 'p1';
    const handleEnd = (winner: 'p1' | 'p2') => {
      handleGameEnd(winner === localSide);
    };

    // IA local solo en amistoso. Ranking comparte el mundo; el rival no es un bot.
    const botEnabled = Boolean(opponent) && !activeMatch?.isRanked;

    switch(selectedGame?.id) {
      case 'pong': return <Pong onGameEnd={handleEnd} botEnabled={botEnabled} world={world} />;
      case 'snake': return <AeroRings onGameEnd={handleEnd} botEnabled={botEnabled} world={world} />;
      case 'tetris': return <Racing onGameEnd={handleEnd} botEnabled={botEnabled} world={world} />;
      case 'combat': return <Skydive onGameEnd={handleEnd} botEnabled={botEnabled} world={world} />;
      case 'shooter': return <Shooter onGameEnd={handleEnd} botEnabled={botEnabled} world={world} />;
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
          if (isChoosingPassword) {
            leavePasswordReset();
            return;
          }
          forfeitRankedLeave(false);
          goHome();
        }}
        onOpenProfile={() => {
          forfeitRankedLeave(false);
          if (view === 'playing' && !gameResult) goHome();
          else setView('profile');
        }}
        onLogout={handleLogout}
        isAuthReady={isAuthReady}
        pendingGame={pendingGame}
        onNavigate={(section) => {
          if (isChoosingPassword) leavePasswordReset();
          forfeitRankedLeave(false);
          goHome();
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
            onCancel={cancelSearch}
            onRetry={retrySearch}
            onPlayBot={playAgainstBot}
            queueError={queueError}
            queueHold={queueHold}
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
                isRanked={Boolean(activeMatch?.isRanked)}
                gameId={selectedGame.id}
                controlsHint={
                  activeMatch?.isRanked
                    ? 'Ranqueada — tú mueves tu lado. El rival es otra persona, no un bot.'
                    : selectedGame.id === 'combat'
                    ? 'Controles — P1: A/D para moverte | P2: Flechas. Gana quien sobreviva más tiempo.'
                    : selectedGame.id === 'snake'
                      ? 'Controles — P1: Espacio o toque para impulso | P2: Flecha arriba. Atraviesa aros o esquiva si no cabes.'
                      : selectedGame.id === 'tetris'
                        ? 'Controles — P1: W acelerar, S frenar, A/D girar | P2: Flechas. Tocar el borde naranja anula la vuelta.'
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
