import { useEffect, useLayoutEffect, useRef, useState } from 'react'
import { createPortal } from 'react-dom'
import { Gamepad2, Home, Info, LogOut, Trophy, Wallet } from 'lucide-react'
import AuthPanel from '../../auth/AuthPanel'
import type { Game, UserProfile } from '../../types'
import { formatPoints } from '../utils/formatPoints'
import { handleActivateKey } from '../utils/handleActivateKey'
import { reloadHome } from '../utils/reloadHome'

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
  menuLocked?: boolean
  menuNote?: string | null
}

const LINKS: { id: NavSection; label: string; icon: typeof Home }[] = [
  { id: 'inicio', label: 'Inicio', icon: Home },
  { id: 'juegos', label: 'Juegos', icon: Gamepad2 },
  { id: 'ranking', label: 'Ranking', icon: Trophy },
  { id: 'info', label: 'Info', icon: Info },
]

const Navbar = ({ user, isAuthReady, pendingGame, onOpenProfile, onOpenAdmin, onLogout, onNavigate, compact = false, menuLocked = false, menuNote = null }: NavbarProps) => {
  const headerRef = useRef<HTMLElement>(null)
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

  const handleGoHome = () => {
    if (menuLocked) return
    reloadHome()
  }

  const handleOpenProfile = () => {
    if (menuLocked || !user) return
    onOpenProfile()
  }

  const handleLogout = () => {
    if (menuLocked || !user) return
    onLogout()
  }

  const handleOpenAdmin = () => {
    if (menuLocked || user?.role !== 'admin') return
    onOpenAdmin()
  }

  const initial = user ? (user.username.trim().charAt(0).toUpperCase() || '?') : ''
  const lightLabel = 'Sesión iniciada'

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
    ? 'bg-[#3ec8ff] text-[#070b16]'
    : 'text-[#d5dcf0] hover:text-white'
  const loginClass = authOpen && authMode === 'login'
    ? 'bg-[#3ec8ff] text-[#070b16]'
    : 'text-[#d5dcf0] hover:text-white'

  return (
    <header ref={headerRef} className="relative shrink-0 bg-[#0c1224]/95 border-b border-[#243056] sticky top-0 z-20 backdrop-blur">
      <div className={`max-w-6xl mx-auto px-3 py-2 flex flex-wrap items-center justify-between gap-2 min-h-16 ${compact ? '[@media(orientation:landscape)_and_(max-height:520px)_and_(max-width:1023px)]:flex-nowrap [@media(orientation:landscape)_and_(max-height:520px)_and_(max-width:1023px)]:min-h-12 [@media(orientation:landscape)_and_(max-height:520px)_and_(max-width:1023px)]:py-1' : ''}`}>
        <button
          type="button"
          aria-label="Ir al inicio"
          tabIndex={0}
          disabled={menuLocked}
          onClick={handleGoHome}
          onKeyDown={(event) => handleActivateKey(event, handleGoHome)}
          className="flex items-center gap-2 shrink-0 disabled:cursor-not-allowed disabled:opacity-40"
        >
          <img src="/frizeplay-logo.png" alt="" className="w-9 h-9 object-contain" />
          <span className="font-pixel text-[9px] sm:text-[10px] tracking-wide text-white">
            FRIZE<span className="text-[#3ec8ff]">PLAY</span>
          </span>
        </button>

        <nav className={`flex items-center gap-1 order-3 w-full sm:order-none sm:w-auto sm:flex-1 sm:justify-center overflow-x-auto ${compact ? '[@media(orientation:landscape)_and_(max-height:520px)_and_(max-width:1023px)]:hidden' : ''}`} aria-label="Secciones">
          {LINKS.map(({ id, label, icon: Icon }) => {
            const handleNavigate = () => {
              if (menuLocked) return
              onNavigate(id)
            }
            const isHome = id === 'inicio'
            const linkClass = isHome
              ? 'bg-[#3ec8ff] text-[#070b16]'
              : 'text-[#d5dcf0] hover:text-white'
            return (
              <button
                key={id}
                type="button"
                aria-label={label}
                tabIndex={0}
                disabled={menuLocked}
                onClick={handleNavigate}
                onKeyDown={(event) => handleActivateKey(event, handleNavigate)}
                className={`flex items-center gap-2 px-2 sm:px-3 py-2 rounded-lg text-xs font-bold uppercase tracking-wide disabled:cursor-not-allowed disabled:opacity-40 ${linkClass}`}
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
                disabled={menuLocked}
                onClick={handleOpenProfile}
                onKeyDown={(event) => handleActivateKey(event, handleOpenProfile)}
                className="relative inline-flex items-center justify-center w-8 h-8 rounded-full border border-[#d5dcf0] text-white text-sm font-bold disabled:cursor-not-allowed disabled:opacity-40"
              >
                <span aria-hidden="true">{initial}</span>
                <span
                  aria-hidden="true"
                  className="absolute -right-0.5 -bottom-0.5 w-2.5 h-2.5 rounded-full border border-[#0c1224] bg-green-500"
                />
              </button>
              {user.role === 'admin' && (
                <button
                  type="button"
                  aria-label="Abrir el panel de administrador"
                  tabIndex={0}
                  disabled={menuLocked}
                  onClick={handleOpenAdmin}
                  onKeyDown={(event) => handleActivateKey(event, handleOpenAdmin)}
                  className="px-2 py-2 rounded-lg text-[10px] sm:text-xs font-bold uppercase tracking-wide text-[#3ec8ff] disabled:cursor-not-allowed disabled:opacity-40"
                >
                  Panel
                </button>
              )}
              <button
                type="button"
                aria-label="Cerrar sesión"
                tabIndex={0}
                disabled={menuLocked}
                onClick={handleLogout}
                onKeyDown={(event) => handleActivateKey(event, handleLogout)}
                className="text-[#d5dcf0] hover:text-white disabled:cursor-not-allowed disabled:opacity-40"
              >
                <LogOut className="w-5 h-5" aria-hidden="true" />
              </button>
            </>
          )}
        </div>
      </div>
      {menuNote && (
        <p className="px-3 pb-2 text-center text-[11px] text-[#d5dcf0]" role="status">
          {menuNote}
        </p>
      )}
      {showAuth && authOpen && createPortal(
        <div
          className="fixed z-50 left-3 right-3 overflow-y-auto overscroll-contain sm:left-auto sm:right-4 sm:w-[360px]"
          style={{ top: panelBox.top, maxHeight: panelBox.maxHeight }}
        >
          <AuthPanel
            hideTabs
            initialMode={authMode}
            notice={pendingGame ? `Inicia sesión para jugar ${pendingGame.name}.` : undefined}
            className="bg-[#0e1528] p-4 rounded-2xl border border-[#3ec8ff]/50 shadow-xl"
          />
        </div>,
        document.body,
      )}
    </header>
  )
}

export default Navbar
