// ==========================================
// Contratos de API — BetPlay Backend
//
// Estos tipos documentan exactamente qué forma tendrán las respuestas
// del backend real cuando llegue. No son código de negocio: son el
// "idioma común" entre el equipo de frontend y el de backend.
//
// Cuando el backend esté listo, los adaptadores en src/api/ transformarán
// estos tipos al formato interno que ya usa la app (ver src/types.ts).
// ==========================================

// ── Auth ─────────────────────────────────────────────────────────────────────

/** POST /auth/register · POST /auth/login */
export type ApiAuthResponse = {
  token: string;
  user: {
    id: string;
    username: string;
    email: string;
    balance: number;
  };
};

/** GET /auth/me */
export type ApiUserProfile = {
  id: string;
  username: string;
  email: string;
  balance: number;
};

/** PATCH /auth/balance */
export type ApiBalanceResponse = {
  balance: number;
};

// ── Matchmaking ───────────────────────────────────────────────────────────────

/** POST /matchmaking/join */
export type ApiMatchTicket = {
  ticketId: string;
  userId: string;
  username: string;
  gameId: string;
  betAmount: number;
  createdAt: string; // ISO 8601
};

/** GET /matchmaking/poll?ticketId=... */
export type ApiMatchRecord = {
  matchId: string;
  gameId: string;
  betAmount: number;
  createdAt: string; // ISO 8601
  players: [
    { ticketId: string; userId: string; username: string; isBot?: boolean },
    { ticketId: string; userId: string; username: string; isBot?: boolean },
  ];
};

// ── Game Result ───────────────────────────────────────────────────────────────

/** POST /match/result */
export type ApiGameResultRequest = {
  matchId: string;
  winnerId: string;
};

/** POST /match/result → response */
export type ApiGameResultResponse = {
  winnerId: string;
  pot: number;
  fee: number;
  newBalance: number;
};

// ── History ───────────────────────────────────────────────────────────────────

/** GET /players/:id/history */
export type ApiHistoryRecord = {
  id: string;
  userId: string;
  gameId: string;
  gameName: string;
  betAmount: number;
  result: 'win' | 'loss' | 'refund';
  profit: number;
  playedAt: string; // ISO 8601
};
