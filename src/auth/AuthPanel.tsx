// ==========================================
// Panel de autenticación (mock). Sustituye al formulario de un solo campo
// ("Únete ahora") que existía en App.tsx. Dos pestañas: Iniciar sesión /
// Registrarse. Los errores de negocio se muestran en la propia UI — nunca
// con alert().
// ==========================================
import { useEffect, useState, type FormEvent } from 'react';
import { AlertCircle, LogIn } from 'lucide-react';
import { requestPasswordReset } from '../api/authApi';
import { handleActivateKey } from '../components/utils/handleActivateKey';
import { useAuth } from './AuthContext';

type Mode = 'login' | 'register';

type AuthPanelProps = {
  /** Pestaña inicial. Útil cuando el gate de juego (AUTH-04) abre el panel directo en login. */
  initialMode?: Mode;
  /** Aviso contextual sobre las pestañas, ej. "Inicia sesión para jugar Paddle Duel". */
  notice?: string;
  className?: string;
  hideTabs?: boolean;
};

export default function AuthPanel({ initialMode = 'register', notice, className, hideTabs = false }: AuthPanelProps) {
  const { register, login, error, clearError, isSubmitting } = useAuth();
  const [mode, setMode] = useState<Mode>(initialMode);
  const [isRecovering, setIsRecovering] = useState(false);
  const [isSendingReset, setIsSendingReset] = useState(false);
  const [resetEmail, setResetEmail] = useState<string | null>(null);
  const [resetError, setResetError] = useState<string | null>(null);
  const [resetNotice, setResetNotice] = useState<string | null>(null);

  // AuthPanel no se desmonta cuando el gate de juego (AUTH-04) pasa de "sin
  // aviso" a "con aviso" (sigue siendo el mismo componente en el árbol), así
  // que `initialMode` como valor inicial de useState no alcanza: hay que
  // sincronizar explícitamente cuando App.tsx decide forzar la pestaña login.
  useEffect(() => {
    setMode(initialMode);
  }, [initialMode]);

  const switchMode = (next: Mode) => {
    if (next === mode) return;
    clearError();
    setIsRecovering(false);
    setResetEmail(null);
    setResetError(null);
    setResetNotice(null);
    setMode(next);
  };

  const handleOpenReset = () => {
    clearError();
    setResetError(null);
    setResetNotice(null);
    setIsRecovering(true);
  };

  const handleCloseReset = () => {
    setResetError(null);
    setResetNotice(null);
    setResetEmail(null);
    setIsRecovering(false);
  };

  const handleResetSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (isSendingReset) return;
    const formData = new FormData(event.currentTarget);
    setIsSendingReset(true);
    setResetError(null);
    setResetNotice(null);
    const email = String(formData.get('email') ?? '').trim();
    const result = await requestPasswordReset(email);
    setIsSendingReset(false);
    if (!result.ok) {
      setResetError(result.message);
      return;
    }
    setResetEmail(email);
    setResetNotice(`Te hemos enviado un enlace a ${email} para cambiar la contraseña. Ábrelo desde tu correo. No has iniciado sesión.`);
  };

  const handleRegisterSubmit = async (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const formData = new FormData(e.currentTarget);
    await register({
      username: String(formData.get('username') ?? ''),
      email: String(formData.get('email') ?? ''),
      password: String(formData.get('password') ?? ''),
      confirmPassword: String(formData.get('confirmPassword') ?? ''),
    });
  };

  const handleLoginSubmit = async (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const formData = new FormData(e.currentTarget);
    await login({
      email: String(formData.get('email') ?? ''),
      password: String(formData.get('password') ?? ''),
    });
  };

  return (
    <div className={className ?? 'bg-bg-100 p-6 rounded-2xl shadow-sm border border-bg-300 max-w-md mx-auto mt-8'}>
      {notice && (
        <div className="flex items-center gap-2 text-primary-100 text-sm bg-primary-300 p-3 rounded-lg mb-4">
          <LogIn className="w-4 h-4 flex-shrink-0" />
          <span>{notice}</span>
        </div>
      )}
      {!hideTabs && <div className="flex gap-2 mb-6 bg-bg-200 p-1 rounded-xl">
        <button
          type="button"
          onClick={() => switchMode('register')}
          className={`flex-1 py-2 rounded-lg text-sm font-bold transition-colors ${
            mode === 'register' ? 'bg-primary-100 text-white' : 'text-text-200 hover:text-text-100'
          }`}
        >
          Crear usuario
        </button>
        <button
          type="button"
          onClick={() => switchMode('login')}
          className={`flex-1 py-2 rounded-lg text-sm font-bold transition-colors ${
            mode === 'login' ? 'bg-primary-100 text-white' : 'text-text-200 hover:text-text-100'
          }`}
        >
          Iniciar sesión
        </button>
      </div>}

      {error && (
        <div className="flex items-center gap-2 text-red-500 text-sm bg-red-50 p-3 rounded-lg mb-4">
          <AlertCircle className="w-4 h-4 flex-shrink-0" />
          <span>{error}</span>
        </div>
      )}

      {mode === 'register' ? (
        <form onSubmit={handleRegisterSubmit} className="flex flex-col gap-3">
          <input
            type="text"
            name="username"
            placeholder="Tu nombre de usuario"
            required
            minLength={3}
            className="w-full px-4 py-3 rounded-xl border border-bg-300 focus:outline-none focus:border-primary-100 focus:ring-1 focus:ring-primary-100 transition-all bg-bg-200"
          />
          <input
            type="email"
            name="email"
            placeholder="Tu email"
            required
            className="w-full px-4 py-3 rounded-xl border border-bg-300 focus:outline-none focus:border-primary-100 focus:ring-1 focus:ring-primary-100 transition-all bg-bg-200"
          />
          <input
            type="password"
            name="password"
            placeholder="Contraseña (mínimo 8 caracteres)"
            required
            minLength={8}
            className="w-full px-4 py-3 rounded-xl border border-bg-300 focus:outline-none focus:border-primary-100 focus:ring-1 focus:ring-primary-100 transition-all bg-bg-200"
          />
          <input
            type="password"
            name="confirmPassword"
            placeholder="Confirma tu contraseña"
            required
            minLength={8}
            className="w-full px-4 py-3 rounded-xl border border-bg-300 focus:outline-none focus:border-primary-100 focus:ring-1 focus:ring-primary-100 transition-all bg-bg-200"
          />
          <button
            type="submit"
            disabled={isSubmitting}
            className="w-full bg-primary-100 text-white font-bold py-3 rounded-xl hover:bg-primary-200 transition-colors disabled:opacity-60 disabled:cursor-not-allowed"
          >
            {isSubmitting ? 'Creando cuenta...' : 'Registrar usuario'}
          </button>
        </form>
      ) : isRecovering && resetEmail ? (
        <div className="flex flex-col gap-3">
          <p className="text-sm text-accent-100" role="status">{resetNotice}</p>
          <button
            type="button"
            aria-label="Volver a iniciar sesión"
            tabIndex={0}
            onClick={handleCloseReset}
            onKeyDown={(event) => handleActivateKey(event, handleCloseReset)}
            className="text-sm font-bold text-text-200"
          >
            Volver a iniciar sesión
          </button>
        </div>
      ) : isRecovering ? (
        <form onSubmit={handleResetSubmit} className="flex flex-col gap-3">
          <p className="text-sm text-text-200">Escribe el email de tu cuenta. Te enviaremos un enlace para cambiar la contraseña.</p>
          <input
            type="email"
            name="email"
            placeholder="Email de tu cuenta"
            aria-label="Email de tu cuenta"
            required
            className="w-full px-4 py-3 rounded-xl border border-bg-300 focus:outline-none focus:border-primary-100 focus:ring-1 focus:ring-primary-100 transition-all bg-bg-200"
          />
          <button
            type="submit"
            aria-label="Enviar enlace para cambiar la contraseña"
            disabled={isSendingReset}
            className="w-full bg-primary-100 text-white font-bold py-3 rounded-xl hover:bg-primary-200 transition-colors disabled:opacity-60 disabled:cursor-not-allowed"
          >
            {isSendingReset ? 'Enviando...' : 'Enviar enlace'}
          </button>
          <button
            type="button"
            aria-label="Volver a iniciar sesión"
            tabIndex={0}
            onClick={handleCloseReset}
            onKeyDown={(event) => handleActivateKey(event, handleCloseReset)}
            className="text-sm font-bold text-text-200"
          >
            Volver a iniciar sesión
          </button>
          {resetError && (
            <p className="text-sm text-red-500" role="alert">{resetError}</p>
          )}
          {resetNotice && (
            <p className="text-sm text-accent-100" role="status">{resetNotice}</p>
          )}
        </form>
      ) : (
        <form onSubmit={handleLoginSubmit} className="flex flex-col gap-3">
          <input
            type="email"
            name="email"
            placeholder="Tu email"
            required
            className="w-full px-4 py-3 rounded-xl border border-bg-300 focus:outline-none focus:border-primary-100 focus:ring-1 focus:ring-primary-100 transition-all bg-bg-200"
          />
          <input
            type="password"
            name="password"
            placeholder="Contraseña"
            required
            className="w-full px-4 py-3 rounded-xl border border-bg-300 focus:outline-none focus:border-primary-100 focus:ring-1 focus:ring-primary-100 transition-all bg-bg-200"
          />
          <button
            type="submit"
            disabled={isSubmitting}
            className="w-full bg-primary-100 text-white font-bold py-3 rounded-xl hover:bg-primary-200 transition-colors disabled:opacity-60 disabled:cursor-not-allowed"
          >
            {isSubmitting ? 'Ingresando...' : 'Iniciar sesión'}
          </button>
          <button
            type="button"
            aria-label="He olvidado mi contraseña"
            tabIndex={0}
            onClick={handleOpenReset}
            onKeyDown={(event) => handleActivateKey(event, handleOpenReset)}
            className="text-sm font-bold text-[#f5c518]"
          >
            He olvidado mi contraseña
          </button>
        </form>
      )}

      <p className="text-xs text-text-200 mt-4 text-center">
        {mode === 'register'
          ? 'Al registrarte, recibes 100 puntos para jugar.'
          : isRecovering
            ? 'El enlace llega al correo. La contraseña no cambia hasta que lo abras.'
            : '¿No tienes cuenta? Cambia a la pestaña Registrarse.'}
      </p>
    </div>
  );
}
