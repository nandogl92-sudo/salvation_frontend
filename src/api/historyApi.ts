// ==========================================
// Adaptador de historial de partidas.
//
// Hoy delega al mock (src/history/historyStorage.ts).
// Cuando haya backend, reemplazar cada función por la llamada real:
//   - appendRecord → POST ${API_URL}/match/result   (body: ApiGameResultRequest)
//   - loadHistory  → GET  ${API_URL}/players/:id/history → ApiHistoryRecord[]
//
// FUTURE: importar API_URL desde './config' y usar fetch() aquí.
// ==========================================

export { appendRecord, loadHistory } from '../history/historyStorage';
