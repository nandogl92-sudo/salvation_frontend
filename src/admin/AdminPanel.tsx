import { useEffect, useState } from 'react'
import { isCurrentSubscriptionMonth } from '../api/subscriptionsApi'
import { listUsers } from '../api/usersApi'
import { useAuth } from '../auth/AuthContext'
import { applyAccountAccess } from '../auth/accessStore'
import { formatPoints } from '../components/utils/formatPoints'
import { handleActivateKey } from '../components/utils/handleActivateKey'
import { monthPointsOf } from '../components/utils/monthPointsOf'
import ReplayBoard from './ReplayBoard'
import type { UserProfile } from '../types'

type AdminPanelProps = {
  onBack: () => void
}

type AdminModule = 'users' | 'matches' | 'ranking'

const MODULES: { id: AdminModule; title: string; text: string }[] = [
  { id: 'users', title: 'Usuarios', text: 'Cuentas, fichas y acceso a los juegos.' },
  { id: 'matches', title: 'Partidas guardadas', text: 'Fecha, jugadores y quién ganó cada ranqueada.' },
  { id: 'ranking', title: 'Clasificación', text: 'Puntos del mes, de mayor a menor.' },
]

const AdminPanel = ({ onBack }: AdminPanelProps) => {
  const { setGamesAccess } = useAuth()
  const [module, setModule] = useState<AdminModule | null>(null)
  const [users, setUsers] = useState<UserProfile[]>([])
  const [message, setMessage] = useState<string | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    let cancelled = false
    listUsers().then((result) => {
      if (cancelled) return
      setLoading(false)
      if (result.ok === true) {
        setUsers(result.users.map((user) => applyAccountAccess(user)))
        return
      }
      setMessage(result.message)
    })
    return () => {
      cancelled = true
    }
  }, [])

  const handleToggle = async (person: UserProfile) => {
    const nextAccess = person.gamesAccess !== true
    const result = await setGamesAccess(person.id, person.email, nextAccess)
    if (result.ok !== true) {
      setMessage(result.message)
      return
    }
    setMessage(null)
    setUsers((current) => current.map((user) => {
      if (user.id !== person.id) return user
      return applyAccountAccess(result.user)
    }))
  }

  const handleBack = () => {
    if (module) {
      setModule(null)
      return
    }
    onBack()
  }

  const handleOpenModule = (id: AdminModule) => {
    setModule(id)
  }

  const ranked = [...users].sort((left, right) => monthPointsOf(right) - monthPointsOf(left))

  return (
    <section className="max-w-4xl mx-auto px-4 py-8 space-y-4">
      <div className="flex items-center justify-between gap-3">
        <h1 className="font-pixel text-[10px] text-[#f5c518]">Panel</h1>
        <button
          type="button"
          aria-label={module ? 'Volver a los módulos' : 'Volver'}
          tabIndex={0}
          onClick={handleBack}
          className="text-xs font-bold uppercase tracking-wide text-[#d5dcf0] hover:text-white"
        >
          Volver
        </button>
      </div>

      {!module && (
        <ul className="grid gap-3 sm:grid-cols-3">
          {MODULES.map((item) => (
            <li key={item.id}>
              <button
                type="button"
                aria-label={item.title}
                tabIndex={0}
                onClick={() => handleOpenModule(item.id)}
                onKeyDown={(event) => handleActivateKey(event, () => handleOpenModule(item.id))}
                className="h-full w-full rounded-xl border border-[#243056] bg-[#0e1528] p-4 text-left"
              >
                <p className="text-sm font-bold text-white">{item.title}</p>
                <p className="mt-1 text-xs text-[#b7c0d4]">{item.text}</p>
              </button>
            </li>
          ))}
        </ul>
      )}

      {module === 'users' && (
        <div className="space-y-3">
          <h2 className="text-sm font-bold text-white">Usuarios</h2>
          <p className="text-sm text-[#b7c0d4]">
            Dar acceso abre los juegos aunque no haya pagado la inscripción. No cambia las fichas ni los puntos del mes.
          </p>
          {loading && <p className="text-sm text-[#b7c0d4]">Cargando cuentas…</p>}
          {message && <p className="text-sm text-red-300" role="alert">{message}</p>}
          {!loading && users.length === 0 && !message && (
            <p className="text-sm text-[#b7c0d4]">No hay cuentas para mostrar.</p>
          )}
          <ul className="space-y-3">
            {users.map((person) => {
              const paid = person.gamesAccess === true
              const inscribed = isCurrentSubscriptionMonth(person.subscriptionMonth)
              const handleMark = () => {
                void handleToggle(person)
              }
              return (
                <li key={person.id} className="bg-[#0e1528] border border-[#243056] rounded-xl p-4 space-y-2">
                  <p className="text-sm font-bold text-white">{person.username}</p>
                  <p className="text-xs text-[#b7c0d4]">{person.email}</p>
                  <p className="text-xs text-[#d5dcf0]">Fichas: {formatPoints(person.balance)}</p>
                  <p className="text-xs text-[#d5dcf0]">Puntos del mes: {monthPointsOf(person)}</p>
                  <p className="text-xs text-[#d5dcf0]">Inscripción de este mes: {inscribed ? 'sí' : 'no'}</p>
                  <p className="text-xs text-[#d5dcf0]">Acceso a los juegos: {paid ? 'sí' : 'no'}</p>
                  <button
                    type="button"
                    aria-label={paid ? `Quitar acceso a ${person.username}` : `Dar acceso a ${person.username}`}
                    tabIndex={0}
                    onClick={handleMark}
                    onKeyDown={(event) => handleActivateKey(event, handleMark)}
                    className="mt-1 px-3 py-2 rounded-lg text-xs font-bold uppercase tracking-wide bg-[#f5c518] text-[#1a1403]"
                  >
                    {paid ? 'Quitar acceso' : 'Dar acceso'}
                  </button>
                </li>
              )
            })}
          </ul>
        </div>
      )}

      {module === 'matches' && (
        <div className="space-y-3">
          <h2 className="text-sm font-bold text-white">Partidas guardadas</h2>
          <ReplayBoard />
        </div>
      )}

      {module === 'ranking' && (
        <div className="space-y-3">
          <h2 className="text-sm font-bold text-white">Clasificación</h2>
          {loading && <p className="text-sm text-[#b7c0d4]">Cargando cuentas…</p>}
          {message && <p className="text-sm text-red-300" role="alert">{message}</p>}
          {!loading && ranked.length === 0 && !message && (
            <p className="text-sm text-[#b7c0d4]">No hay cuentas para mostrar.</p>
          )}
          <ol className="space-y-2">
            {ranked.map((person, index) => (
              <li key={person.id} className="flex items-center justify-between gap-3 bg-[#0e1528] border border-[#243056] rounded-xl p-4">
                <p className="text-sm font-bold text-white">{index + 1}. {person.username}</p>
                <p className="text-sm text-[#d5dcf0]">{monthPointsOf(person)} pts</p>
              </li>
            ))}
          </ol>
        </div>
      )}
    </section>
  )
}

export default AdminPanel
