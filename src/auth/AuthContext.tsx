// ==========================================
// Contexto de autenticación. Envuelve la app (ver src/main.tsx) y expone el
// hook useAuth() para leer al usuario actual y disparar register/login/logout.
//
// No conoce localStorage ni hashes de contraseña: todo eso vive detrás de
// src/auth/authService.ts (mock). El día que haya backend real, este archivo
// no cambia — solo cambia authService.
// ==========================================
import { createContext, useCallback, useContext, useEffect, useMemo, useState, type ReactNode } from 'react';
import * as authService from './authService';
import type { AuthResult, LoginInput, RegisterInput, UserProfile } from '../types';

type AuthContextValue = {
  /** Usuario autenticado actual, o null si no hay sesión. */
  user: UserProfile | null;
  /** true mientras se hidrata la sesión persistida al montar la app. */
  isReady: boolean;
  /** true mientras register()/login() están en curso. */
  isSubmitting: boolean;
  /** Último error de negocio (credenciales inválidas, email duplicado, etc.). */
  error: string | null;
  register: (input: RegisterInput) => Promise<boolean>;
  login: (input: LoginInput) => Promise<boolean>;
  logout: () => Promise<void>;
  /** Actualiza el saldo del usuario actual (en memoria + persistido en el mock). */
  setBalance: (balance: number) => Promise<void>;
  clearError: () => void;
};

const AuthContext = createContext<AuthContextValue | undefined>(undefined);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<UserProfile | null>(null);
  const [isReady, setIsReady] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Hidratar la sesión persistida (mock) al montar la app.
  useEffect(() => {
    let cancelled = false;
    authService.getCurrentSession().then((session) => {
      if (cancelled) return;
      setUser(session?.user ?? null);
      setIsReady(true);
    });
    return () => {
      cancelled = true;
    };
  }, []);

  const clearError = useCallback(() => setError(null), []);

  const register = useCallback(async (input: RegisterInput) => {
    setIsSubmitting(true);
    setError(null);
    const result: AuthResult = await authService.register(input);
    setIsSubmitting(false);
    // NOTA: comparación explícita `=== true` (no `if (result.ok)`) porque el
    // tsconfig del proyecto no tiene strictNullChecks activado, y sin él TS
    // no aplica narrowing de discriminated unions vía truthiness aquí.
    if (result.ok === true) {
      setUser(result.session.user);
      return true;
    }
    setError(result.message);
    return false;
  }, []);

  const login = useCallback(async (input: LoginInput) => {
    setIsSubmitting(true);
    setError(null);
    const result: AuthResult = await authService.login(input);
    setIsSubmitting(false);
    if (result.ok === true) {
      setUser(result.session.user);
      return true;
    }
    setError(result.message);
    return false;
  }, []);

  const logout = useCallback(async () => {
    await authService.logout();
    setUser(null);
    setError(null);
  }, []);

  const setBalance = useCallback(async (balance: number) => {
    if (!user) return;
    const updated = await authService.updateUserBalance(user.id, balance);
    if (updated) setUser(updated);
  }, [user]);

  const value = useMemo<AuthContextValue>(
    () => ({ user, isReady, isSubmitting, error, register, login, logout, setBalance, clearError }),
    [user, isReady, isSubmitting, error, register, login, logout, setBalance, clearError],
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth(): AuthContextValue {
  const ctx = useContext(AuthContext);
  if (!ctx) {
    throw new Error('useAuth debe usarse dentro de <AuthProvider>.');
  }
  return ctx;
}
