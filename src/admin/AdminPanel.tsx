import { useEffect, useState } from 'react'
import { listUsers } from '../api/usersApi'
import { useAuth } from '../auth/AuthContext'
import { applyAccountAccess } from '../auth/accessStore'
import { formatPoints } from '../components/utils/formatPoints'
import { monthPointsOf } from '../components/utils/monthPointsOf'
import ReplayBoard from './ReplayBoard'
import type { UserProfile } from '../types'

type AdminPanelProps = {
  onBack: () => void
}

const AdminPanel = ({ onBack }: AdminPanelProps) => {
  const { setGamesAccess } = useAuth()
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

  return (
    <section className="max-w-4xl mx-auto px-4 py-8 space-y-4">
      <div className="flex items-center justify-between gap-3">
        <h1 className="font-pixel text-[10px] text-[#f5c518]">Panel</h1>
        <button
          type="button"
          onClick={onBack}
          className="text-xs font-bold uppercase tracking-wide text-[#d5dcf0] hover:text-white"
        >
          Volver
        </button>
      </div>
      <p className="text-sm text-[#b7c0d4]">
        Dar o quitar el acceso a los juegos, aunque no haya pagado la inscripción. No cambia las fichas ni los puntos del mes.
      </p>
      <ReplayBoard />
      {loading && <p className="text-sm text-[#b7c0d4]">Cargando cuentas…</p>}
      {message && <p className="text-sm text-red-300" role="alert">{message}</p>}
      {!loading && users.length === 0 && !message && (
        <p className="text-sm text-[#b7c0d4]">No hay cuentas para mostrar.</p>
      )}
      <ul className="space-y-3">
        {users.map((person) => {
          const paid = person.gamesAccess === true
          const handleMark = () => {
            handleToggle(person)
          }
          return (
            <li key={person.id} className="bg-[#0e1528] border border-[#243056] rounded-xl p-4 space-y-2">
              <p className="text-sm font-bold text-white">{person.username}</p>
              <p className="text-xs text-[#b7c0d4]">{person.email}</p>
              <p className="text-xs text-[#d5dcf0]">Fichas: {formatPoints(person.balance)}</p>
              <p className="text-xs text-[#d5dcf0]">Puntos del mes: {monthPointsOf(person)}</p>
              <p className="text-xs text-[#d5dcf0]">
                Acceso a los juegos: {paid ? 'sí' : 'no'}
              </p>
              <button
                type="button"
                onClick={handleMark}
                className="mt-1 px-3 py-2 rounded-lg text-xs font-bold uppercase tracking-wide bg-[#f5c518] text-[#1a1403]"
              >
                {paid ? 'Quitar acceso' : 'Dar acceso'}
              </button>
            </li>
          )
        })}
      </ul>
    </section>
  )
}

export default AdminPanel
