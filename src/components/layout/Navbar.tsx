import { useEffect, useLayoutEffect, useRef, useState } from 'react'
import { createPortal } from 'react-dom'
import { Gamepad2, Home, Info, LogOut, Moon, Sun, Trophy, Wallet } from 'lucide-react'
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
  onOpenProfile: () => void
  onOpenAdmin: () => void
  onLogout: () => void
  onNavigate: (section: NavSection) => void
  compact?: boolean
}

const LINKS: { id: NavSection; label: string; icon: typeof Home }[] = [
  { id: 'inicio', label: 'Inicio', icon: Home },
  { id: 'juegos', label: 'Juegos', icon: Gamepad2 },
  { id: 'ranking', label: 'Ranking', icon: Trophy },
  { id: 'info', label: 'Info', icon: Info },
]

const Navbar = ({ user, isAuthReady, pendingGame, onOpenProfile, onOpenAdmin, onLogout, onNavigate, compact = false }: NavbarProps) => {
  const headerRef = useRef<HTMLElement>(null)
  const [isLight, setIsLight] = useState(false)
  const [authOpen, setAuthOpen] = useState(false)
  const [authMode, setAuthMode] = useState<AuthMode>('register')
  const [panelBox, setPanelBox] = useState({ top: 72, maxHeight: 480 })
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

  useLayoutEffect(() => {
    if (!authOpen) return
    const placePanel = () => {
      const headerBottom = headerRef.current?.getBoundingClientRect().bottom ?? 64
      const top = headerBottom + 8
      const viewportHeight = window.visualViewport?.height ?? window.innerHeight
      setPanelBox({
        top,
        maxHeight: Math.max(180, viewportHeight - top - 12),
      })
    }
    placePanel()
    window.addEventListener('resize', placePanel)
    window.visualViewport?.addEventListener('resize', placePanel)
    window.visualViewport?.addEventListener('scroll', placePanel)
    return () => {
      window.removeEventListener('resize', placePanel)
      window.visualViewport?.removeEventListener('resize', placePanel)
      window.visualViewport?.removeEventListener('scroll', placePanel)
    }
  }, [authOpen])

  const handleReload = () => {
    window.location.reload()
  }

  const handleOpenProfile = () => {
    if (!user) return
    onOpenProfile()
  }

  const handleLogout = () => {
    if (!user) return
    onLogout()
  }

  const handleOpenAdmin = () => {
    if (user?.role !== 'admin') return
    onOpenAdmin()
  }

  const initial = user ? (user.username.trim().charAt(0).toUpperCase() || '?') : ''
  const hasGames = user?.gamesAccess === true
  const lightLabel = hasGames ? 'Luz verde: puede entrar a los juegos' : 'Luz roja: no puede entrar a los juegos'

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
    <header ref={headerRef} className="relative shrink-0 bg-[#0c1224]/95 border-b border-[#243056] sticky top-0 z-20 backdrop-blur">
      <div className={`max-w-6xl mx-auto px-3 py-2 flex flex-wrap items-center justify-between gap-2 min-h-16 ${compact ? '[@media(orientation:landscape)_and_(max-height:520px)_and_(max-width:1023px)]:flex-nowrap [@media(orientation:landscape)_and_(max-height:520px)_and_(max-width:1023px)]:min-h-12 [@media(orientation:landscape)_and_(max-height:520px)_and_(max-width:1023px)]:py-1' : ''}`}>
        <button
          type="button"
          aria-label="Recargar Frizeplay"
          tabIndex={0}
          onClick={handleReload}
          onKeyDown={(event) => handleActivateKey(event, handleReload)}
          className="flex items-center gap-2 shrink-0"
        >
          <img src="/frizeplay-logo.png" alt="" className="w-9 h-9 object-contain" />
          <span className="font-pixel text-[9px] sm:text-[10px] tracking-wide text-white">
            FRIZE<span className="text-[#f5c518]">PLAY</span>
          </span>
        </button>

        <nav className={`flex items-center gap-1 order-3 w-full sm:order-none sm:w-auto sm:flex-1 sm:justify-center overflow-x-auto ${compact ? '[@media(orientation:landscape)_and_(max-height:520px)_and_(max-width:1023px)]:hidden' : ''}`} aria-label="Secciones">
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
                className={`flex items-center gap-2 px-2 sm:px-3 py-2 rounded-lg text-xs font-bold uppercase tracking-wide ${linkClass}`}
              >
                <Icon className="w-4 h-4" aria-hidden="true" />
                <span className="hidden lg:inline">{label}</span>
              </button>
            )
          })}
        </nav>

        <div className="flex items-center gap-1 sm:gap-2 shrink-0">
          {showAuth && (
            <>
              <button
                type="button"
                aria-label="Crear usuario"
                aria-expanded={authOpen && authMode === 'register'}
                tabIndex={0}
                onClick={handleOpenRegister}
                onKeyDown={(event) => handleActivateKey(event, handleOpenRegister)}
                className={`px-2 sm:px-3 py-2 rounded-lg text-[10px] sm:text-xs font-bold uppercase tracking-wide ${registerClass}`}
              >
                <span className="sm:hidden">Crear</span>
                <span className="hidden sm:inline">Crear usuario</span>
              </button>
              <button
                type="button"
                aria-label="Iniciar sesión"
                aria-expanded={authOpen && authMode === 'login'}
                tabIndex={0}
                onClick={handleOpenLogin}
                onKeyDown={(event) => handleActivateKey(event, handleOpenLogin)}
                className={`px-2 sm:px-3 py-2 rounded-lg text-[10px] sm:text-xs font-bold uppercase tracking-wide ${loginClass}`}
              >
                <span className="sm:hidden">Entrar</span>
                <span className="hidden sm:inline">Iniciar sesión</span>
              </button>
            </>
          )}
          {user && (
            <>
              <div
                className="flex items-center gap-2 text-[#f5c518] text-[10px] sm:text-sm font-bold"
                aria-label={`${formatPoints(user.balance)} fichas para jugar`}
              >
                <Wallet className="w-4 h-4" aria-hidden="true" />
                <span>{formatPoints(user.balance)} fichas</span>
              </div>
              <button
                type="button"
                aria-label={`Cuenta de ${user.username}. Inicial ${initial}. ${lightLabel}`}
                tabIndex={0}
                onClick={handleOpenProfile}
                onKeyDown={(event) => handleActivateKey(event, handleOpenProfile)}
                className="relative inline-flex items-center justify-center w-8 h-8 rounded-full border border-[#f5c518] text-[#f5c518] text-sm font-bold"
              >
                <span aria-hidden="true">{initial}</span>
                <span
                  aria-hidden="true"
                  className={`absolute -right-0.5 -bottom-0.5 w-2.5 h-2.5 rounded-full border border-[#0c1224] ${hasGames ? 'bg-green-500' : 'bg-red-500'}`}
                />
              </button>
              {user.role === 'admin' && (
                <button
                  type="button"
                  aria-label="Abrir el panel de administrador"
                  tabIndex={0}
                  onClick={handleOpenAdmin}
                  onKeyDown={(event) => handleActivateKey(event, handleOpenAdmin)}
                  className="px-2 py-2 rounded-lg text-[10px] sm:text-xs font-bold uppercase tracking-wide text-[#f5c518]"
                >
                  Panel
                </button>
              )}
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
      {showAuth && authOpen && createPortal(
        <div
          className="fixed z-50 left-3 right-3 overflow-y-auto overscroll-contain sm:left-auto sm:right-4 sm:w-[360px]"
          style={{ top: panelBox.top, maxHeight: panelBox.maxHeight }}
        >
          <AuthPanel
            hideTabs
            initialMode={authMode}
            notice={pendingGame ? `Inicia sesión para jugar ${pendingGame.name}.` : undefined}
            className="bg-[#0e1528] p-4 rounded-2xl border border-[#f5c518]/50 shadow-xl"
          />
        </div>,
        document.body,
      )}
    </header>
  )
}

export default Navbar
