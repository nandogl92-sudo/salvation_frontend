import { useState, type FormEvent } from 'react'
import { handleActivateKey } from '../components/utils/handleActivateKey'
import { useAuth } from './AuthContext'

type ResetPasswordScreenProps = {
  token: string
  onDone: () => void
  onLeave: () => void
}

export default function ResetPasswordScreen({ token, onDone, onLeave }: ResetPasswordScreenProps) {
  const { completePasswordReset, isSubmitting } = useAuth()
  const [error, setError] = useState<string | null>(null)

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    if (isSubmitting || !token) return
    const formData = new FormData(event.currentTarget)
    const password = String(formData.get('password') ?? '')
    const passwordConfirmation = String(formData.get('passwordConfirmation') ?? '')
    setError(null)
    const result = await completePasswordReset({ token, password, passwordConfirmation })
    if (result.ok === true) {
      onDone()
      return
    }
    setError(result.message)
  }

  return (
    <div className="max-w-md mx-auto px-4 py-16">
      <form
        onSubmit={handleSubmit}
        className="bg-[#0e1528] p-6 rounded-2xl border border-[#f5c518]/50 shadow-xl flex flex-col gap-3"
      >
        <h1 className="text-lg font-bold text-white">Cambiar contraseña</h1>
        {token ? (
          <>
            <p className="text-sm text-[#d5dcf0]">
              Elige una contraseña nueva. Tiene que tener al menos 8 caracteres.
            </p>
            <input
              type="password"
              name="password"
              placeholder="Contraseña nueva"
              aria-label="Contraseña nueva"
              required
              minLength={8}
              className="w-full px-4 py-3 rounded-xl border border-bg-300 focus:outline-none focus:border-primary-100 focus:ring-1 focus:ring-primary-100 transition-all bg-bg-200"
            />
            <input
              type="password"
              name="passwordConfirmation"
              placeholder="Confirma la contraseña"
              aria-label="Confirma la contraseña"
              required
              minLength={8}
              className="w-full px-4 py-3 rounded-xl border border-bg-300 focus:outline-none focus:border-primary-100 focus:ring-1 focus:ring-primary-100 transition-all bg-bg-200"
            />
            <button
              type="submit"
              aria-label="Guardar la contraseña nueva"
              disabled={isSubmitting}
              className="w-full bg-primary-100 text-white font-bold py-3 rounded-xl hover:bg-primary-200 transition-colors disabled:opacity-60 disabled:cursor-not-allowed"
            >
              {isSubmitting ? 'Guardando...' : 'Guardar contraseña'}
            </button>
          </>
        ) : (
          <p className="text-sm text-red-500" role="alert">
            Este enlace no sirve para cambiar la contraseña. Pide otro desde Iniciar sesión.
          </p>
        )}
        {error && (
          <p className="text-sm text-red-500" role="alert">{error}</p>
        )}
        <button
          type="button"
          aria-label="Volver al inicio"
          tabIndex={0}
          onClick={onLeave}
          onKeyDown={(event) => handleActivateKey(event, onLeave)}
          className="text-sm font-bold text-[#f5c518]"
        >
          Volver al inicio
        </button>
      </form>
    </div>
  )
}
