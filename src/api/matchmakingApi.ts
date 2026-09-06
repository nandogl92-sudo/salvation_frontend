// ==========================================
// Adaptador de matchmaking.
//
// Hoy delega al mock (src/matchmaking/matchmakingService.ts).
// Cuando haya backend, reemplazar cada función por la llamada real:
//   - joinQueue  → POST   ${API_URL}/matchmaking/join     → ApiMatchTicket
//   - cancelQueue → DELETE ${API_URL}/matchmaking/:ticketId → 204
//   - tryMatch   → GET    ${API_URL}/matchmaking/poll?ticketId=... → ApiMatchRecord | null
//   - createBotMatch → POST ${API_URL}/matchmaking/bot    → ApiMatchRecord
//
// FUTURE: importar API_URL desde './config' y usar fetch() aquí.
// ==========================================

export {
  joinQueue,
  cancelQueue,
  tryMatch,
  createBotMatch,
} from '../matchmaking/matchmakingService';
