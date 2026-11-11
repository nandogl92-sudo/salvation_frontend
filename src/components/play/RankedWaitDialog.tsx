import { useEffect, useState } from 'react'
import { createPortal } from 'react-dom'
import { getTodayRaffle, type RaffleSeat } from '../../api/raffleApi'
import { rankedGameName } from '../../profile/rankedGames'
import { handleActivateKey } from '../utils/handleActivateKey'

const clockOf = (ms: number): string => {
  const total = Math.max(0, Math.ceil(ms / 1000))
  const minutes = Math.floor(total / 60)
  const seconds = total % 60
  return `${String(minutes).padStart(2, '0')}:${String(seconds).padStart(2, '0')}`
}

const incomingWait = (seats: RaffleSeat[], now: number): RaffleSeat | null => {
  const seat = seats.find((item) => item.yours && !item.waitingYours && item.waitingName && item.waitingUntil !== null && item.waitingUntil > now)
  return seat ?? null
}

const RankedWaitDialog = ({ userId, hidden }: { userId: string; hidden: boolean }) => {
  const [seat, setSeat] = useState<RaffleSeat | null>(null)
  const [now, setNow] = useState(Date.now())
  const [closedKey, setClosedKey] = useState('')

  useEffect(() => {
    if (hidden) return
    let stopped = false
    const load = () => {
      void getTodayRaffle().then((result) => {
        if (stopped || !result.ok) return
        setSeat(incomingWait(result.raffle.seats, Date.now()))
      })
    }
    load()
    const timer = window.setInterval(load, 4000)
    return () => {
      stopped = true
      window.clearInterval(timer)
    }
  }, [hidden, userId])

  useEffect(() => {
    if (!seat?.waitingUntil) return
    const timer = window.setInterval(() => setNow(Date.now()), 1000)
    return () => window.clearInterval(timer)
  }, [seat?.waitingUntil])

  if (hidden || !seat || !seat.waitingName || seat.waitingUntil === null) return null
  const left = seat.waitingUntil - now
  if (left <= 0) return null
  const noticeKey = `${seat.waitingGameId ?? ''}:${seat.waitingUntil}`
  if (closedKey === noticeKey) return null

  const gameLabel = rankedGameName(seat.waitingGameId ?? '')
  const handleClose = () => {
    setClosedKey(noticeKey)
  }

  return createPortal(
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 px-4">
      <div
        role="dialog"
        aria-modal="true"
        aria-label={`${seat.waitingName} te está esperando`}
        className="w-full max-w-sm rounded-2xl border border-[#3ec8ff] bg-[#0e1528] p-5 space-y-4"
      >
        <p className="text-base font-bold text-white">
          {seat.waitingName} te está esperando para jugar el punto del mes en {gameLabel}.
        </p>
        <p className="text-sm font-bold text-[#3ec8ff]" role="timer">
          Tienes {clockOf(left)} antes de que el código caduque.
        </p>
        <button
          type="button"
          aria-label="Cerrar el aviso"
          tabIndex={0}
          onClick={handleClose}
          onKeyDown={(event) => handleActivateKey(event, handleClose)}
          className="w-full py-3 rounded-xl font-bold bg-[#f5c518] text-[#1a1403]"
        >
          Entendido
        </button>
      </div>
    </div>,
    document.body,
  )
}

export default RankedWaitDialog
