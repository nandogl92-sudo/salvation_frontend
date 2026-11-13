import { useState, type FormEvent } from 'react';
import { createPortal } from 'react-dom';
import { updateAccount } from '../api/authApi';
import { useAuth } from '../auth/AuthContext';
import { handleActivateKey } from '../components/utils/handleActivateKey';
import type { UserProfile } from '../types';

const MIN_PASSWORD = 8;

const AccountSettingsDialog = ({ user, onClose }: { user: UserProfile; onClose: () => void }) => {
  const { replaceUser } = useAuth();
  const [username, setUsername] = useState(user.username);
  const [email, setEmail] = useState(user.email);
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [currentPassword, setCurrentPassword] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const nameLocked = user.usernameChanged === true;

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (saving) return;
    const nextName = username.trim();
    const nextEmail = email.trim().toLowerCase();
    const nameChanged = !nameLocked && nextName !== user.username;
    const emailChanged = nextEmail !== user.email.trim().toLowerCase();
    const passwordFilled = password.length > 0 || confirmPassword.length > 0;

    if (nameLocked && nextName !== user.username) {
      setError('El nombre de usuario solo se puede cambiar una vez.');
      return;
    }
    if (!nextName || !nextEmail) {
      setError('El nombre y el correo no pueden estar vacíos.');
      return;
    }
    if (!nextEmail.includes('@') || !nextEmail.includes('.')) {
      setError('Escribe un correo válido.');
      return;
    }
    if (passwordFilled && password.length < MIN_PASSWORD) {
      setError(`La contraseña debe tener al menos ${MIN_PASSWORD} caracteres.`);
      return;
    }
    if (password !== confirmPassword) {
      setError('Las contraseñas no coinciden.');
      return;
    }
    if ((emailChanged || passwordFilled) && currentPassword.length === 0) {
      setError('Escribe tu contraseña actual para cambiar el correo o la contraseña.');
      return;
    }
    if (!nameChanged && !emailChanged && !passwordFilled) {
      setError('No hay cambios para guardar.');
      return;
    }

    const changes: { username?: string; email?: string; password?: string; currentPassword?: string } = {};
    if (nameChanged) changes.username = nextName;
    if (emailChanged) changes.email = nextEmail;
    if (passwordFilled) changes.password = password;
    if (emailChanged || passwordFilled) changes.currentPassword = currentPassword;

    setSaving(true);
    setError(null);
    const result = await updateAccount(user.id, changes);
    setSaving(false);
    if (!result.ok) {
      setError(result.message);
      return;
    }
    replaceUser(result.user);
    onClose();
  };

  return createPortal(
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 px-4">
      <div
        role="dialog"
        aria-modal="true"
        aria-label="Preferencias de la cuenta"
        className="w-full max-w-sm rounded-2xl border border-[#3ec8ff] bg-[#0e1528] p-5"
      >
        <h2 className="text-lg font-bold text-white">Preferencias</h2>
        <form onSubmit={(event) => { void handleSubmit(event); }} className="mt-4 flex flex-col gap-3">
          <label className="text-sm font-bold text-[#f4f6fb]" htmlFor="account-username">
            Nombre de usuario
          </label>
          <input
            id="account-username"
            name="username"
            type="text"
            value={username}
            disabled={saving}
            onChange={(event) => setUsername(event.target.value)}
            className="rounded-xl border border-bg-300 bg-bg-200 px-3 py-3 text-sm text-white disabled:opacity-60"
          />
          <p className={`text-xs ${nameLocked ? 'font-bold text-primary-100' : 'text-[#b7c0d4]'}`}>
            El nombre de usuario solo se puede cambiar una vez.
          </p>
          <label className="text-sm font-bold text-[#f4f6fb]" htmlFor="account-email">
            Correo electrónico
          </label>
          <input
            id="account-email"
            name="email"
            type="email"
            value={email}
            disabled={saving}
            onChange={(event) => setEmail(event.target.value)}
            className="rounded-xl border border-bg-300 bg-bg-200 px-3 py-3 text-sm text-white"
          />
          <label className="text-sm font-bold text-[#f4f6fb]" htmlFor="account-current-password">
            Contraseña actual
          </label>
          <input
            id="account-current-password"
            name="currentPassword"
            type="password"
            value={currentPassword}
            autoComplete="current-password"
            disabled={saving}
            onChange={(event) => setCurrentPassword(event.target.value)}
            className="rounded-xl border border-bg-300 bg-bg-200 px-3 py-3 text-sm text-white"
          />
          <p className="text-xs text-[#b7c0d4]">Hace falta para cambiar el correo o la contraseña.</p>
          <label className="text-sm font-bold text-[#f4f6fb]" htmlFor="account-password">
            Contraseña nueva
          </label>
          <input
            id="account-password"
            name="password"
            type="password"
            value={password}
            autoComplete="new-password"
            disabled={saving}
            onChange={(event) => setPassword(event.target.value)}
            className="rounded-xl border border-bg-300 bg-bg-200 px-3 py-3 text-sm text-white"
          />
          <label className="text-sm font-bold text-[#f4f6fb]" htmlFor="account-password-confirm">
            Repite la contraseña
          </label>
          <input
            id="account-password-confirm"
            name="confirmPassword"
            type="password"
            value={confirmPassword}
            autoComplete="new-password"
            disabled={saving}
            onChange={(event) => setConfirmPassword(event.target.value)}
            className="rounded-xl border border-bg-300 bg-bg-200 px-3 py-3 text-sm text-white"
          />
          {error && <p className="text-sm font-bold text-primary-100" role="alert">{error}</p>}
          <div className="mt-1 flex gap-2">
            <button
              type="button"
              aria-label="Cancelar los cambios de la cuenta"
              tabIndex={0}
              disabled={saving}
              onClick={onClose}
              onKeyDown={(event) => handleActivateKey(event, onClose)}
              className="flex-1 rounded-xl bg-bg-200 py-3 font-bold text-text-100 disabled:opacity-60"
            >
              Cancelar
            </button>
            <button
              type="submit"
              aria-label="Guardar los cambios de la cuenta"
              tabIndex={0}
              disabled={saving}
              className="flex-1 rounded-xl bg-[#f5c518] py-3 font-bold text-[#1a1403] disabled:opacity-60"
            >
              Guardar
            </button>
          </div>
        </form>
      </div>
    </div>,
    document.body,
  );
};

export default AccountSettingsDialog;
