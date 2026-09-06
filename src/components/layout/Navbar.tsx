import { Gamepad2, LogOut, User, Wallet } from 'lucide-react'
import type { UserProfile } from '../../types'
import { handleActivateKey } from '../utils/handleActivateKey'

type NavbarProps = {
  user: UserProfile | null
  onGoHome: () => void
  onOpenProfile: () => void
  onLogout: () => void
}

const Navbar = ({ user, onGoHome, onOpenProfile, onLogout }: NavbarProps) => {
  const handleGoHome = () => {
    onGoHome()
  }

  const handleOpenProfile = () => {
    if (!user) return
    onOpenProfile()
  }

  const handleLogout = () => {
    if (!user) return
    onLogout()
  }

  return (
    <header className="bg-bg-100 shadow-sm border-b border-bg-300 sticky top-0 z-10">
      <div className="max-w-6xl mx-auto px-4 h-16 flex items-center justify-between">
        <button
          type="button"
          aria-label="Ir al inicio de BetPlay"
          tabIndex={0}
          onClick={handleGoHome}
          onKeyDown={(event) => handleActivateKey(event, handleGoHome)}
          className="flex items-center gap-2"
        >
          <div className="bg-primary-100 text-white p-2 rounded-lg">
            <Gamepad2 className="w-5 h-5" aria-hidden="true" />
          </div>
          <span className="font-bold text-xl tracking-tight text-primary-100">BetPlay</span>
        </button>

        <div className="flex items-center gap-4">
          {user ? (
            <div className="flex items-center gap-4">
              <div
                className="flex items-center gap-2 bg-primary-300 px-3 py-1.5 rounded-full text-primary-100 font-medium"
                aria-label={`Saldo ${user.balance.toFixed(2)} dólares`}
              >
                <Wallet className="w-4 h-4" aria-hidden="true" />
                <span>${user.balance.toFixed(2)}</span>
              </div>
              <button
                type="button"
                aria-label={`Ver perfil de ${user.username}`}
                tabIndex={0}
                onClick={handleOpenProfile}
                onKeyDown={(event) => handleActivateKey(event, handleOpenProfile)}
                className="flex items-center gap-2 text-text-200 hover:text-text-100 transition-colors"
              >
                <User className="w-5 h-5" aria-hidden="true" />
                <span className="font-medium">{user.username}</span>
              </button>
              <button
                type="button"
                aria-label="Cerrar sesión"
                tabIndex={0}
                onClick={handleLogout}
                onKeyDown={(event) => handleActivateKey(event, handleLogout)}
                className="text-text-200 hover:text-primary-100 transition-colors"
              >
                <LogOut className="w-5 h-5" aria-hidden="true" />
              </button>
            </div>
          ) : (
            <p className="text-sm font-medium text-text-200">Inicia sesión para jugar</p>
          )}
        </div>
      </div>
    </header>
  )
}

export default Navbar
