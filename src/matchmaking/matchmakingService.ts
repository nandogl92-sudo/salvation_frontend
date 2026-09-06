// ==========================================
// MOCK — Servicio de matchmaking (Búsqueda).
//
// Cola compartida vía localStorage entre pestañas del mismo origen. No hay
// servidor: cada pestaña hace polling (ver useMatchmaking / App.tsx) y
// llama a tryMatch() para ver si ya hay un rival compatible esperando.
//
// Concurrencia (documentado, no resuelto de forma perfecta — es un mock):
// cuando dos tickets compatibles coexisten, SOLO uno de los dos ("líder",
// elegido de forma determinista comparando los ids) escribe la cola y crea
// el MatchRecord. El otro simplemente espera a que aparezca el match con su
// ticketId. Esto evita que ambas pestañas creen dos matches distintos para
// el mismo par de jugadores en la misma vuelta de polling.
//
// Ver src/matchmaking/README.md para el detalle completo.
// ==========================================
import type { MatchRecord, MatchTicket } from '../types';
import { loadMatches, loadQueue, saveMatches, saveQueue } from './queueStorage';

function generateId(): string {
  return crypto.randomUUID();
}

type JoinQueueInput = {
  userId: string;
  username: string;
  gameId: string;
  betAmount: number;
};

/** Crea un ticket nuevo y lo publica en la cola compartida. */
export function joinQueue(input: JoinQueueInput): MatchTicket {
  const ticket: MatchTicket = {
    id: generateId(),
    userId: input.userId,
    username: input.username,
    gameId: input.gameId,
    betAmount: input.betAmount,
    createdAt: Date.now(),
  };
  const queue = loadQueue();
  saveQueue([...queue, ticket]);
  return ticket;
}

/** Saca un ticket de la cola (botón Cancelar, o timeout). No toca matches ya resueltos. */
export function cancelQueue(ticketId: string): void {
  const queue = loadQueue();
  saveQueue(queue.filter((t) => t.id !== ticketId));
}

function findMatchForTicket(ticketId: string): MatchRecord | null {
  const matches = loadMatches();
  return matches.find((m) => m.players.some((p) => p.ticketId === ticketId)) ?? null;
}

/**
 * Un paso de matchmaking para `ticket`. Devuelve el MatchRecord si ya se
 * resolvió (por este ticket o por el del rival, en un tick anterior), o
 * `null` si sigue esperando.
 */
export function tryMatch(ticket: MatchTicket): MatchRecord | null {
  // Puede que el rival ya haya sido el "líder" y creado el match en un tick anterior.
  const existing = findMatchForTicket(ticket.id);
  if (existing) return existing;

  const queue = loadQueue();
  const stillWaiting = queue.some((t) => t.id === ticket.id);
  if (!stillWaiting) {
    // Nuestro ticket ya no está en cola (lo consumió el rival como líder);
    // el match debería aparecer en el próximo loadMatches().
    return findMatchForTicket(ticket.id);
  }

  const opponent = queue.find(
    (t) => t.id !== ticket.id && t.gameId === ticket.gameId && t.betAmount === ticket.betAmount && t.userId !== ticket.userId,
  );
  if (!opponent) return null;

  // Liderazgo determinista: solo el ticket con el id "menor" crea el match.
  // Evita que ambas pestañas escriban dos matches distintos para el mismo par.
  const isLeader = ticket.id < opponent.id;
  if (!isLeader) return null;

  const nextQueue = queue.filter((t) => t.id !== ticket.id && t.id !== opponent.id);
  saveQueue(nextQueue);

  const match: MatchRecord = {
    id: generateId(),
    gameId: ticket.gameId,
    betAmount: ticket.betAmount,
    createdAt: Date.now(),
    players: [
      { ticketId: ticket.id, userId: ticket.userId, username: ticket.username },
      { ticketId: opponent.id, userId: opponent.userId, username: opponent.username },
    ],
  };
  saveMatches([...loadMatches(), match]);
  return match;
}

/** Lectura directa (sin intentar emparejar) — usada tras el timeout para no crear un match "de rebote". */
export function getMatchForTicket(ticketId: string): MatchRecord | null {
  return findMatchForTicket(ticketId);
}

/**
 * Modo prueba explícito: crea un match contra un bot cuando no hay rival
 * real disponible. Se marca `isBot: true` para que la UI nunca lo presente
 * como un jugador real.
 */
export function createBotMatch(ticket: MatchTicket): MatchRecord {
  // Por si el ticket seguía en la cola (ej. justo antes del timeout), lo retiramos.
  cancelQueue(ticket.id);

  const match: MatchRecord = {
    id: generateId(),
    gameId: ticket.gameId,
    betAmount: ticket.betAmount,
    createdAt: Date.now(),
    players: [
      { ticketId: ticket.id, userId: ticket.userId, username: ticket.username },
      { ticketId: `bot-${ticket.id}`, userId: 'bot', username: 'Bot de prueba', isBot: true },
    ],
  };
  saveMatches([...loadMatches(), match]);
  return match;
}
