// ==========================================
// Adaptador de autenticación.
//
// Hoy delega al mock (src/auth/authService.ts).
// Cuando haya backend, reemplazar cada función por un fetch() al endpoint
// correspondiente, sin tocar AuthContext ni la UI.
//
// Endpoints futuros:
//   POST   ${API_URL}/auth/register  → ApiAuthResponse
//   POST   ${API_URL}/auth/login     → ApiAuthResponse
//   POST   ${API_URL}/auth/logout    → 204
//   GET    ${API_URL}/auth/me        → ApiUserProfile
//   PATCH  ${API_URL}/auth/balance   → ApiBalanceResponse
// ==========================================

// FUTURE: importar API_URL desde './config' y usar fetch() aquí.
export {
  register,
  login,
  logout,
  getCurrentSession,
  updateUserBalance,
} from '../auth/authService';
