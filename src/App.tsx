import { useCallback, useEffect, useRef, useState } from 'react';
import { Activity, Flag, Plane, Umbrella } from 'lucide-react';

import Pong from './games/Pong';
import AeroRings from './games/Plane';
import Racing from './games/Racing';
import Skydive from './games/Skydive';
import Shooter from './games/Shooter';
import { useAuth } from './auth/AuthContext';
import ResetPasswordScreen from './auth/ResetPasswordScreen';
import { cancelQueue, joinQueue, leaveFriendly, offerFriendly, tryMatch, type FriendlyLookResult } from './api/matchmakingApi';
import { cancelMatch, fetchMatchStatus, forfeitMatch, submitMatchResult, type MatchStatusView, type SettlementPlayer } from './api/matchesApi';
import { getCurrentSession } from './api/authApi';
import type { Game, MatchPlayer, MatchTicket, QueueStatus } from './types';
import { monthPointsOf } from './components/utils/monthPointsOf';
import ProfilePanel from './profile/ProfilePanel';
import AdminPanel from './admin/AdminPanel';
import Navbar from './components/layout/Navbar';
import HomeLanding from './components/home/HomeLanding';
import SubscriptionPayDialog from './components/home/SubscriptionPayDialog';
import LobbyPanel from './components/lobby/LobbyPanel';
import GameResultPanel, { type GameResult } from './components/play/GameResultPanel';
import PlayingArena from './components/play/PlayingArena';
import { buildSharedWorld, type SharedWorld } from './games/sharedWorld';
import { reloadHome } from './components/utils/reloadHome';

/** El siguiente GET de cola va cuando acaba el anterior. En móvil el setInterval se pausa. */
const QUEUE_POLL_INTERVAL_MS = 700;
/** Consulta del cierre compartido. Más lento que el pad para no saturar el móvil. */
const MATCH_STATUS_POLL_MS = 1500;
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
];

export default function App() {
  // ==========================================
  // AUTH — provisto por AuthContext (mock). Ver src/auth/README.md
  // ==========================================
  const { user: currentUser, isReady: isAuthReady, logout, setBalance, setMonthPoints } = useAuth();

  // ==========================================
  // ESTADOS PRINCIPALES
  // ==========================================
  const [view, setView] = useState<'home' | 'lobby' | 'playing' | 'profile' | 'admin'>('home');
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
  const [accessNotice, setAccessNotice] = useState<string | null>(null);
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
    if ('scrollRestoration' in history) history.scrollRestoration = 'manual';
    window.scrollTo(0, 0);
  }, []);

  useEffect(() => {
    if (isChoosingPassword || userId === null || currentUser?.gamesAccess === true) {
      setSubscriptionOpen(false);
      return;
    }
    const timer = window.setTimeout(() => {
      setSubscriptionOpen(true);
    }, 5000);
    return () => window.clearTimeout(timer);
  }, [userId, isChoosingPassword, currentUser?.gamesAccess]);

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
  const [playSerial, setPlaySerial] = useState(0);
  const settlingRef = useRef(false);
  const settledMatchIdRef = useRef<string | null>(null);
  const resultSeqRef = useRef(0);
  const leaveAfterSaveRef = useRef(false);
  const searchLockRef = useRef(false);
  const friendlyEnteredRef = useRef(false);
  const endGameRef = useRef<(winner: 'p1' | 'p2', matchId: string) => void>(() => {});
  const handleEnd = useCallback((winner: 'p1' | 'p2', matchId: string) => {
    endGameRef.current(winner, matchId);
  }, []);

  useEffect(() => {
    if (!leaveAfterSaveRef.current || gameResult?.pending) return;
    leaveAfterSaveRef.current = false;
    reloadHome();
  }, [gameResult, matchError]);

  const leaveResult = () => {
    if (!gameResult?.pending) {
      reloadHome();
      return;
    }
    leaveAfterSaveRef.current = true;
    window.setTimeout(() => {
      if (!leaveAfterSaveRef.current) return;
      leaveAfterSaveRef.current = false;
      reloadHome();
    }, 2000);
  };
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
    resultSeqRef.current += 1;
    setGameResult(null);
    setMatchError(null);
    setOpponent(null);
    setActiveMatch(null);
    if (window.location.pathname === '/admin') window.history.replaceState({}, '', '/');
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
    resultSeqRef.current += 1;
    setGameResult(null);
    if (window.location.pathname === '/admin') window.history.replaceState({}, '', '/');
    setView('home');
    logout();
  };

  const joinLobby = (game: Game) => {
    setQueueError(null);
    setSelectedGame(game);
    setView('lobby');
  };

  const requestJoinGame = (game: Game) => {
    if (currentUser && currentUser.gamesAccess !== true) {
      setAccessNotice('Aún no tienes acceso a los juegos.');
      setView('home');
      setScrollTarget('juegos');
      return;
    }
    if (currentUser) {
      setAccessNotice(null);
      joinLobby(game);
      return;
    }
    setPendingGame(game);
    setView('home');
  };

  const openAdmin = () => {
    if (currentUser?.role !== 'admin') return;
    window.history.pushState({}, '', '/admin');
    setView('admin');
  };

  const leaveAdmin = () => {
    if (window.location.pathname === '/admin') window.history.replaceState({}, '', '/');
    setView('home');
  };

  // Tras un login/registro exitoso, si había un juego pendiente por el gate, entrar directo a su lobby.
  useEffect(() => {
    if (!currentUser || !pendingGame) return;
    if (currentUser.gamesAccess !== true) {
      setAccessNotice('Aún no tienes acceso a los juegos.');
      setPendingGame(null);
      setScrollTarget('juegos');
      return;
    }
    setAccessNotice(null);
    joinLobby(pendingGame);
    setPendingGame(null);
  }, [currentUser, pendingGame]);

  useEffect(() => {
    if (!isAuthReady) return;
    const wantsAdmin = window.location.pathname === '/admin';
    if (!wantsAdmin && view !== 'admin') return;
    if (currentUser?.role === 'admin') {
      if (wantsAdmin && view === 'home') setView('admin');
      return;
    }
    if (wantsAdmin) window.history.replaceState({}, '', '/');
    if (view === 'admin') setView('home');
  }, [isAuthReady, currentUser, view]);

  // Guard: si se pierde la sesión (logout, sesión expirada) estando en lobby o playing, volver a home.
  useEffect(() => {
    if (!currentUser && (view === 'lobby' || view === 'playing')) {
      if (ticket) void cancelQueue(ticket.id);
      void leaveFriendly();
      setTicket(null);
      setQueueStatus('idle');
      setView('home');
      setSelectedGame(null);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps -- solo debe reaccionar a cambios de sesión/vista.
  }, [currentUser, view]);

  const enterMatchedQueue = async (
    currentTicket: MatchTicket,
    result: Extract<Awaited<ReturnType<typeof tryMatch>>, { status: 'matched' }>,
    rankedSearch: boolean,
  ) => {
    const matchedBot = Boolean(result.opponent.isBot);
    if (matchedBot && rankedSearch) {
      setQueueStatus('timeout');
      void syncBalanceFromServer();
      return;
    }
    const ranked = rankedSearch && !matchedBot;
    if (ranked) {
      setQueueHold(result.opponent.username);
      setQueueStatus('searching');
      await new Promise((resolve) => window.setTimeout(resolve, 600));
      if (!searchLockRef.current) return;
    }
    setQueueHold(null);
    setOpponent(result.opponent);
    settledMatchIdRef.current = null;
    settlingRef.current = false;
    setPlaySerial((value) => value + 1);
    setActiveMatch({
      id: result.match.id,
      isBot: matchedBot,
      isRanked: ranked,
      world: result.world
        ? buildSharedWorld({
            matchId: result.match.id,
            createdAt: result.match.createdAt,
            localUserId: currentUser?.id ?? currentTicket.userId,
            rivalUserId: result.opponent.userId,
            youName: currentTicket.username,
            rivalName: result.opponent.username,
            seed: result.world.seed,
            startAt: result.world.startAt,
            localSide: result.world.localSide,
          })
        : null,
    });
    setTicket(null);
    setQueueStatus('idle');
    searchLockRef.current = false;
    setView('playing');
  };

  // El backend descuenta la apuesta al crear el ticket y la devuelve al cancelar o al expirar.
  const startMatchmaking = async (isRanked = false, accessCode = '') => {
    if (!currentUser || !selectedGame || betAmount > currentUser.balance || betAmount <= 0) return;
    if (searchLockRef.current || queueStatus === 'searching') return;
    searchLockRef.current = true;

    setQueueIsRanked(isRanked);
    setQueueError(null);
    setQueueHold(null);
    setQueueStatus('searching');
    const result = await joinQueue({ gameId: selectedGame.id, betAmount, ranked: isRanked, accessCode });
    if (!searchLockRef.current) {
      if (result.ok) void cancelQueue(result.ticket.id);
      return;
    }
    if (!result.ok) {
      searchLockRef.current = false;
      setQueueStatus('idle');
      setQueueError(result.message);
      return;
    }

    const already = await tryMatch(result.ticket);
    if (!searchLockRef.current) {
      void cancelQueue(result.ticket.id);
      return;
    }
    if (already.status === 'matched') {
      await enterMatchedQueue(result.ticket, already, isRanked);
      await syncBalanceFromServer();
      return;
    }

    setTicket(result.ticket);
    setQueueStatus('searching');
    await syncBalanceFromServer();
  };

  const cancelSearch = async () => {
    searchLockRef.current = false;
    friendlyEnteredRef.current = false;
    void leaveFriendly();
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
  const retrySearch = (isRanked: boolean, accessCode = '') => {
    searchLockRef.current = false;
    setQueueStatus('idle');
    void startMatchmaking(isRanked, accessCode);
  };

  const beginFriendlyWait = () => {
    setQueueError(null);
    setQueueHold(null);
    setQueueIsRanked(false);
    setQueueStatus('searching');
  };

  const endFriendlyWait = () => {
    setQueueHold(null);
    setQueueStatus('idle');
  };

  const lookForFriendly = async (
    rivalUserId: string | null,
    stamp: number,
    requestStamp: number,
    reject: boolean,
  ): Promise<FriendlyLookResult> => {
    if (!currentUser || !selectedGame) return { ok: false, message: 'No hay una partida preparada.' };
    const result = await offerFriendly({
      gameId: selectedGame.id,
      betAmount,
      rivalUserId,
      stamp,
      requestStamp,
      reject,
    });
    if (!result.ok || result.status !== 'matched') return result;
    if (friendlyEnteredRef.current) return result;
    friendlyEnteredRef.current = true;
    const currentTicket: MatchTicket = {
      id: result.match.id,
      userId: currentUser.id,
      username: currentUser.username,
      gameId: selectedGame.id,
      betAmount,
      createdAt: result.match.createdAt,
    };
    await enterMatchedQueue(currentTicket, {
      status: 'matched',
      match: result.match,
      opponent: result.opponent,
      arenaOpen: true,
      world: result.world,
    }, false);
    await syncBalanceFromServer();
    return result;
  };

  // El servidor empareja al crear el ticket y al consultar. En móvil no usamos setInterval: se pausa.
  useEffect(() => {
    if (queueStatus !== 'searching' || !ticket) return;

    let stopped = false;
    let timer = 0;

    const poll = async () => {
      if (stopped) return;
      const result = await tryMatch(ticket);
      if (stopped) return;

      if (result.status === 'matched') {
        await enterMatchedQueue(ticket, result, queueIsRanked);
        return;
      }

      if (result.status === 'expired') {
        searchLockRef.current = false;
        setQueueHold(null);
        setQueueStatus('timeout');
        await syncBalanceFromServer();
        return;
      }

      if (result.status === 'cancelled') {
        searchLockRef.current = false;
        setTicket(null);
        setQueueStatus('idle');
        setView('home');
        await syncBalanceFromServer();
        return;
      }

      if (result.status === 'error') {
        const message = result.message.toLowerCase();
        if (!message.includes('abort') && !message.includes('timed out')) {
          setQueueError(result.message);
        }
      }

      timer = window.setTimeout(() => {
        void poll();
      }, QUEUE_POLL_INTERVAL_MS);
    };

    const handleWake = () => {
      if (document.visibilityState === 'hidden') return;
      window.clearTimeout(timer);
      void poll();
    };

    void poll();
    document.addEventListener('visibilitychange', handleWake);
    window.addEventListener('pageshow', handleWake);

    return () => {
      stopped = true;
      window.clearTimeout(timer);
      document.removeEventListener('visibilitychange', handleWake);
      window.removeEventListener('pageshow', handleWake);
    };
  }, [queueStatus, ticket, queueIsRanked]);

  const monthScoreOf = (player?: SettlementPlayer) => {
    const before = monthPointsOf(currentUser);
    const after = typeof player?.monthPoints === 'number' ? player.monthPoints : before;
    return { monthPoints: after, monthPointsDelta: after - before };
  };

  const rememberMonthScore = async (player?: SettlementPlayer) => {
    if (!player || typeof player.monthPoints !== 'number') return monthScoreOf();
    const month = monthScoreOf(player);
    await setMonthPoints(month.monthPoints, player.weeks);
    return month;
  };

  const closeRankedMatch = async (input: {
    matchId: string;
    winnerUserId: string | null;
    endReason: 'play' | 'forfeit' | null;
    isRefund: boolean;
    players: SettlementPlayer[];
    uiSeq?: number;
  }) => {
    if (!currentUser) return;
    if (settledMatchIdRef.current === input.matchId) return;
    settledMatchIdRef.current = input.matchId;
    settlingRef.current = true;
    const uiSeq = input.uiSeq ?? resultSeqRef.current;
    const won = input.winnerUserId === currentUser.id;
    const me = input.players.find((player) => player.id === currentUser.id);
    if (me) await setBalance(me.balance);
    const profit = input.isRefund || !me ? 0 : me.balance - currentUser.balance;
    const month = await rememberMonthScore(me);
    searchLockRef.current = false;
    if (resultSeqRef.current === uiSeq) {
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
    }
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
    const uiSeq = resultSeqRef.current;
    const isRefund = reason === 'platform_error';
    const isRanked = activeMatch.isRanked && !activeMatch.isBot;
    const endReason = reason === 'forfeit' ? 'forfeit' : 'play';
    const stillShowing = () => resultSeqRef.current === uiSeq;

    if (activeMatch.isBot) {
      searchLockRef.current = false;
      if (stillShowing()) {
        setGameResult({
          won,
          profit: 0,
          isRefund: false,
          isRanked: false,
          monthPoints: monthPointsOf(currentUser),
          monthPointsDelta: 0,
        });
        setOpponent(null);
        setActiveMatch(null);
      }
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
    if (stillShowing()) {
      setGameResult({
        won: isRefund ? false : won,
        profit: 0,
        isRefund,
        isRanked,
        monthPoints: monthPointsOf(currentUser),
        monthPointsDelta: 0,
        byAbandon: endReason === 'forfeit',
        pending: true,
      });
    }
    const settlement = isRefund
      ? await cancelMatch(matchId)
      : await submitMatchResult(matchId, winnerUserId ?? '', endReason);

    if (!settlement.ok) {
      if (isRanked && settlement.alreadySettled) {
        const status = await fetchMatchStatus(matchId);
        if (status.ok) {
          settlingRef.current = false;
          await closeRankedMatch({
            matchId,
            winnerUserId: status.status.winnerUserId,
            endReason: status.status.endReason,
            isRefund: status.status.settlement === 'refunded',
            players: status.status.players,
            uiSeq,
          });
          return;
        }
      }
      if (stillShowing()) {
        setGameResult((current) => {
          if (current?.pending) return { ...current, pending: false };
          return current;
        });
        setMatchError(settlement.message);
      }
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
        uiSeq,
      });
      return;
    }

    const me = settlement.players.find((player) => player.id === currentUser.id);
    if (!me) {
      if (stillShowing()) {
        setGameResult(null);
        setMatchError('La respuesta no incluye tus fichas.');
      }
      settlingRef.current = false;
      return;
    }

    const profit = isRefund ? 0 : me.balance - currentUser.balance;
    await setBalance(me.balance);
    const month = await rememberMonthScore(me);
    searchLockRef.current = false;
    if (stillShowing()) {
      setGameResult({
        won: isRefund ? false : won,
        profit,
        isRefund,
        isRanked: false,
        ...month,
      });
      setOpponent(null);
      setActiveMatch(null);
    }
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
    if (view !== 'playing' || !activeMatch || !activeMatch.isRanked || activeMatch.isBot || (gameResult && !gameResult.pending) || !currentUser) {
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

  endGameRef.current = (winner, matchId) => {
    if (!activeMatch || matchId !== activeMatch.id) return;
    const localSide = activeMatch.world?.localSide ?? 'p1';
    void handleGameEnd(winner === localSide);
  };

  const renderGame = () => {
    const world = activeMatch?.world ?? null;
    const matchKey = `${activeMatch?.id ?? 'local'}:${playSerial}`;
    const matchId = activeMatch?.id ?? 'local';

    // IA local solo en amistoso. Ranking comparte el mundo; el rival no es un bot.
    const botEnabled = Boolean(opponent) && !activeMatch?.isRanked && !activeMatch?.world;

    switch(selectedGame?.id) {
      case 'pong': return <Pong key={matchKey} matchId={matchId} onGameEnd={handleEnd} botEnabled={botEnabled} world={world} youName={currentUser?.username ?? ''} rivalName={opponent?.username ?? ''} />;
      case 'snake': return <AeroRings key={matchKey} matchId={matchId} onGameEnd={handleEnd} botEnabled={botEnabled} world={world} youName={currentUser?.username ?? ''} rivalName={opponent?.username ?? ''} />;
      case 'tetris': return <Racing key={matchKey} matchId={matchId} onGameEnd={handleEnd} botEnabled={botEnabled} world={world} youName={currentUser?.username ?? ''} rivalName={opponent?.username ?? ''} />;
      case 'combat': return <Skydive key={matchKey} matchId={matchId} onGameEnd={handleEnd} botEnabled={botEnabled} world={world} youName={currentUser?.username ?? ''} rivalName={opponent?.username ?? ''} />;
      case 'shooter': return <Shooter key={matchKey} matchId={matchId} onGameEnd={handleEnd} botEnabled={botEnabled} world={world} />;
      default: return <div className="text-white text-center p-8">Juego no encontrado</div>;
    }
  };

  return (
    <div className={view === 'playing' && !gameResult && !matchError ? 'flex h-dvh flex-col overflow-hidden bg-bg-200 text-text-100 font-sans' : 'min-h-screen bg-bg-200 text-text-100 font-sans'}>
      {subscriptionOpen && currentUser && (
        <SubscriptionPayDialog
          onClose={() => setSubscriptionOpen(false)}
          onPaid={() => setSubscriptionOpen(false)}
        />
      )}

      <Navbar
        user={currentUser}
        onOpenProfile={() => {
          forfeitRankedLeave(false);
          if (window.location.pathname === '/admin') window.history.replaceState({}, '', '/');
          if (view === 'playing' && !gameResult) goHome();
          else setView('profile');
        }}
        onOpenAdmin={openAdmin}
        onLogout={handleLogout}
        isAuthReady={isAuthReady}
        pendingGame={pendingGame}
        compact={view === 'playing' && !gameResult && !matchError}
        immersive={view === 'playing' && !gameResult && !matchError && selectedGame?.id === 'combat'}
        profileOpen={view === 'profile'}
        menuLocked={Boolean(gameResult || matchError || (view === 'playing' && activeMatch))}
        menuNote={gameResult || matchError ? 'Pulsa Volver al inicio para jugar otra vez.' : null}
        onNavigate={(section) => {
          if (isChoosingPassword) leavePasswordReset();
          forfeitRankedLeave(false);
          goHome();
          setScrollTarget(section);
        }}
      />

      <main className={view === 'playing' && !gameResult && !matchError ? 'flex min-h-0 flex-1 flex-col overflow-hidden' : undefined}>
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
            accessNotice={accessNotice}
          />
        )}

        {!isChoosingPassword && view !== 'home' && (
        <div className={view === 'playing' && !gameResult && !matchError ? `mx-auto flex min-h-0 w-full max-w-6xl flex-1 flex-col overflow-hidden px-2 py-2 ${selectedGame?.id === 'combat' ? '[@media(orientation:landscape)_and_(max-height:520px)_and_(max-width:1023px)]:max-w-none [@media(orientation:landscape)_and_(max-height:520px)_and_(max-width:1023px)]:px-0 [@media(orientation:landscape)_and_(max-height:520px)_and_(max-width:1023px)]:py-0' : ''}` : 'max-w-6xl mx-auto px-4 py-8'}>

        {view === 'lobby' && selectedGame && currentUser && (
          <LobbyPanel
            selectedGame={selectedGame}
            balance={currentUser.balance}
            betAmount={betAmount}
            queueStatus={queueStatus}
            onCancel={cancelSearch}
            onRetry={retrySearch}
            queueError={queueError}
            queueHold={queueHold}
            currentUser={currentUser}
            onBeginFriendlyWait={beginFriendlyWait}
            onEndFriendlyWait={endFriendlyWait}
            onFriendlyLook={lookForFriendly}
            onFriendlyStop={() => {
              void leaveFriendly();
            }}
          />
        )}

        {view === 'playing' && selectedGame && currentUser && (
          <div className={gameResult || matchError ? 'max-w-4xl mx-auto space-y-4 animate-fade-in' : `mx-auto flex min-h-0 w-full flex-1 flex-col ${selectedGame?.id === 'combat' ? 'max-w-none' : 'max-w-4xl'}`}>
            {gameResult ? (
              <GameResultPanel
                result={gameResult}
                betAmount={betAmount}
                onGoHome={leaveResult}
              />
            ) : matchError ? (
              <div className="bg-bg-100 rounded-2xl border border-bg-300 p-8 text-center space-y-4" role="alert">
                <h2 className="text-xl font-bold text-text-100">No se pudo resolver la partida</h2>
                <p className="text-sm text-text-200">{matchError}</p>
                <button
                  type="button"
                  onClick={reloadHome}
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
                stickSide={activeMatch?.world?.localSide === 'p2' ? 'right' : 'left'}
              >
                {renderGame()}
              </PlayingArena>
            )}
          </div>
        )}

        {view === 'profile' && currentUser && (
          <ProfilePanel user={currentUser} onBack={() => setView('home')} />
        )}

        {view === 'admin' && currentUser?.role === 'admin' && (
          <AdminPanel onBack={leaveAdmin} />
        )}
        </div>
        )}
      </main>
    </div>
  );
}
