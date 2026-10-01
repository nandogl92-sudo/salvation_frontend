import { useEffect, useState } from 'react'
import { Gamepad2, Home, Info, LogOut, Moon, Sun, Trophy, User, Wallet } from 'lucide-react'
import AuthPanel from '../../auth/AuthPanel'
import type { Game, UserProfile } from '../../types'
import { formatPoints } from '../utils/formatPoints'
import { handleActivateKey } from '../utils/handleActivateKey'

type NavSection = 'inicio' | 'juegos' | 'ranking' | 'info'

type AuthMode = 'login' | 'register'

type NavbarProps = {
  user: UserProfile | null
  isAuthReady: boolean
  pendingGame: Game | null
  onGoHome: () => void
  onOpenProfile: () => void
  onLogout: () => void
  onNavigate: (section: NavSection) => void
}

const LINKS: { id: NavSection; label: string; icon: typeof Home }[] = [
  { id: 'inicio', label: 'Inicio', icon: Home },
  { id: 'juegos', label: 'Juegos', icon: Gamepad2 },
  { id: 'ranking', label: 'Ranking', icon: Trophy },
  { id: 'info', label: 'Info', icon: Info },
]

const Navbar = ({ user, isAuthReady, pendingGame, onGoHome, onOpenProfile, onLogout, onNavigate }: NavbarProps) => {
  const [isLight, setIsLight] = useState(false)
  const [authOpen, setAuthOpen] = useState(false)
  const [authMode, setAuthMode] = useState<AuthMode>('register')
  const showAuth = !user && isAuthReady

  useEffect(() => {
    if (!pendingGame) return
    setAuthMode('login')
    setAuthOpen(true)
  }, [pendingGame])

  useEffect(() => {
    if (!user) return
    setAuthOpen(false)
  }, [user])

  const handleGoHome = () => {
    onGoHome()
    onNavigate('inicio')
  }

  const handleOpenProfile = () => {
    if (!user) return
    onOpenProfile()
  }

  const handleLogout = () => {
    if (!user) return
    onLogout()
  }

  const handleToggleTheme = () => {
    const next = !isLight
    document.documentElement.classList.toggle('theme-light', next)
    setIsLight(next)
  }

  const handleOpenAuth = (mode: AuthMode) => {
    if (authOpen && authMode === mode) {
      setAuthOpen(false)
      return
    }
    setAuthMode(mode)
    setAuthOpen(true)
  }

  const handleOpenRegister = () => {
    handleOpenAuth('register')
  }

  const handleOpenLogin = () => {
    handleOpenAuth('login')
  }

  const registerClass = authOpen && authMode === 'register'
    ? 'bg-[#f5c518] text-[#1a1403]'
    : 'text-[#d5dcf0] hover:text-white'
  const loginClass = authOpen && authMode === 'login'
    ? 'bg-[#f5c518] text-[#1a1403]'
    : 'text-[#d5dcf0] hover:text-white'

  return (
    <header className="relative bg-[#0c1224]/95 border-b border-[#243056] sticky top-0 z-20 backdrop-blur">
      <div className="max-w-6xl mx-auto px-4 h-16 flex items-center justify-between gap-4">
        <button
          type="button"
          aria-label="Ir al inicio de Retro Hub"
          tabIndex={0}
          onClick={handleGoHome}
          onKeyDown={(event) => handleActivateKey(event, handleGoHome)}
          className="flex items-center gap-2 shrink-0"
        >
          <span className="w-8 h-8 rounded-full bg-[#f5c518] flex items-center justify-center" aria-hidden="true">
            <span className="w-4 h-4 rounded-full border-2 border-[#c2410c] border-t-[#fde68a]" />
          </span>
          <span className="font-pixel text-[10px] tracking-wide text-white">
            RETRO<span className="text-[#f5c518]">HUB</span>
          </span>
        </button>

        <nav className="flex items-center gap-1" aria-label="Secciones">
          {LINKS.map(({ id, label, icon: Icon }) => {
            const handleNavigate = () => {
              onNavigate(id)
            }
            const isHome = id === 'inicio'
            const linkClass = isHome
              ? 'bg-[#f5c518] text-[#1a1403]'
              : 'text-[#d5dcf0] hover:text-white'
            return (
              <button
                key={id}
                type="button"
                aria-label={label}
                tabIndex={0}
                onClick={handleNavigate}
                onKeyDown={(event) => handleActivateKey(event, handleNavigate)}
                className={`flex items-center gap-2 px-3 py-2 rounded-lg text-xs font-bold uppercase tracking-wide ${linkClass}`}
              >
                <Icon className="w-4 h-4" aria-hidden="true" />
                <span className="hidden lg:inline">{label}</span>
              </button>
            )
          })}
        </nav>

        <div className="flex items-center gap-2">
          {showAuth && (
            <>
              <button
                type="button"
                aria-label="Crear usuario"
                aria-expanded={authOpen && authMode === 'register'}
                tabIndex={0}
                onClick={handleOpenRegister}
                onKeyDown={(event) => handleActivateKey(event, handleOpenRegister)}
                className={`px-3 py-2 rounded-lg text-xs font-bold uppercase tracking-wide ${registerClass}`}
              >
                Crear usuario
              </button>
              <button
                type="button"
                aria-label="Iniciar sesión"
                aria-expanded={authOpen && authMode === 'login'}
                tabIndex={0}
                onClick={handleOpenLogin}
                onKeyDown={(event) => handleActivateKey(event, handleOpenLogin)}
                className={`px-3 py-2 rounded-lg text-xs font-bold uppercase tracking-wide ${loginClass}`}
              >
                Iniciar sesión
              </button>
            </>
          )}
          {user && (
            <>
              <div
                className="hidden sm:flex items-center gap-2 text-[#f5c518] text-sm font-bold"
                aria-label={`${formatPoints(user.balance)} puntos`}
              >
                <Wallet className="w-4 h-4" aria-hidden="true" />
                <span>{formatPoints(user.balance)} pts</span>
              </div>
              <button
                type="button"
                aria-label={`Ver perfil de ${user.username}`}
                tabIndex={0}
                onClick={handleOpenProfile}
                onKeyDown={(event) => handleActivateKey(event, handleOpenProfile)}
                className="text-[#d5dcf0] hover:text-white"
              >
                <User className="w-5 h-5" aria-hidden="true" />
              </button>
              <button
                type="button"
                aria-label="Cerrar sesión"
                tabIndex={0}
                onClick={handleLogout}
                onKeyDown={(event) => handleActivateKey(event, handleLogout)}
                className="text-[#d5dcf0] hover:text-white"
              >
                <LogOut className="w-5 h-5" aria-hidden="true" />
              </button>
            </>
          )}
          <button
            type="button"
            aria-label="Cambiar entre tema oscuro y claro"
            tabIndex={0}
            onClick={handleToggleTheme}
            onKeyDown={(event) => handleActivateKey(event, handleToggleTheme)}
            className="text-[#d5dcf0] hover:text-white"
          >
            {isLight ? <Sun className="w-5 h-5" aria-hidden="true" /> : <Moon className="w-5 h-5" aria-hidden="true" />}
          </button>
        </div>
      </div>
      {showAuth && authOpen && (
        <div className="absolute right-4 top-16 w-[min(100vw-2rem,360px)] z-30">
          <AuthPanel
            hideTabs
            initialMode={authMode}
            notice={pendingGame ? `Inicia sesión para jugar ${pendingGame.name}.` : undefined}
            className="bg-[#0e1528] p-4 rounded-2xl border border-[#f5c518]/50 shadow-xl"
          />
        </div>
      )}
    </header>
  )
}

export default Navbar
