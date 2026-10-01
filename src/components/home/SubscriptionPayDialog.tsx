import { useState, type FormEvent, type KeyboardEvent } from 'react'
import { useAuth } from '../../auth/AuthContext'
import { SUBSCRIPTION_EUROS, SUBSCRIPTION_POINTS, subscribeMonthly } from '../../api/subscriptionsApi'
import { handleActivateKey } from '../utils/handleActivateKey'

type SubscriptionPayDialogProps = {
  onClose: () => void
  onPaid: () => void
}

const digitsOnly = (value: string): string => value.replace(/\D/g, '')

const formatCardNumber = (value: string): string => {
  const digits = digitsOnly(value).slice(0, 16)
  return digits.replace(/(\d{4})(?=\d)/g, '$1 ').trim()
}

const formatExpiry = (value: string): string => {
  const digits = digitsOnly(value).slice(0, 4)
  if (digits.length <= 2) return digits
  return `${digits.slice(0, 2)}/${digits.slice(2)}`
}

const readPaymentError = (cardNumber: string, expiry: string, cvc: string): string | null => {
  if (digitsOnly(cardNumber).length !== 16) return 'El número de tarjeta tiene que tener 16 dígitos.'
  if (!/^\d{2}\/\d{2}$/.test(expiry)) return 'La caducidad tiene que ir en formato MM/AA.'
  const month = Number(expiry.slice(0, 2))
  if (month < 1 || month > 12) return 'El mes de caducidad no es válido.'
  const year = 2000 + Number(expiry.slice(3, 5))
  const expiresAt = new Date(year, month, 1)
  if (expiresAt <= new Date()) return 'La tarjeta está caducada.'
  const cvcLength = digitsOnly(cvc).length
  if (cvcLength < 3 || cvcLength > 4) return 'El código de seguridad tiene que tener 3 o 4 dígitos.'
  return null
}

const SubscriptionPayDialog = ({ onClose, onPaid }: SubscriptionPayDialogProps) => {
  const { user, setBalance } = useAuth()
  const [cardName, setCardName] = useState('')
  const [cardNumber, setCardNumber] = useState('')
  const [expiry, setExpiry] = useState('')
  const [cvc, setCvc] = useState('')
  const [isPaying, setIsPaying] = useState(false)
  const [error, setError] = useState<string | null>(null)

  if (!user) return null

  const handleDismiss = () => {
    if (isPaying) return
    onClose()
  }

  const handleKeyDown = (event: KeyboardEvent<HTMLDivElement>) => {
    if (event.key !== 'Escape') return
    handleDismiss()
  }

  const handleCardNumberChange = (value: string) => {
    setCardNumber(formatCardNumber(value))
  }

  const handleExpiryChange = (value: string) => {
    setExpiry(formatExpiry(value))
  }

  const handleCvcChange = (value: string) => {
    setCvc(digitsOnly(value).slice(0, 4))
  }

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    if (isPaying || !user) return
    const name = cardName.trim()
    if (!name) {
      setError('Escribe el nombre del titular.')
      return
    }
    const paymentError = readPaymentError(cardNumber, expiry, cvc)
    if (paymentError) {
      setError(paymentError)
      return
    }

    const balanceBefore = user.balance
    setIsPaying(true)
    setError(null)
    const result = await subscribeMonthly(balanceBefore, user.subscriptionMonth)
    if (!result.ok) {
      setError(result.message)
      setIsPaying(false)
      return
    }

    await setBalance(result.balance)
    setIsPaying(false)
    onPaid()
  }

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 px-4"
      role="presentation"
      onKeyDown={handleKeyDown}
    >
      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby="subscription-pay-title"
        className="w-full max-w-md bg-[#0e1528] border border-[#f5c518] rounded-2xl p-6 shadow-xl"
      >
        <h2 id="subscription-pay-title" className="text-lg font-bold text-white">
          Paga la suscripción
        </h2>
        <p className="mt-3 text-sm text-[#f4f6fb]">
          Sin la suscripción no puedes competir por el premio. El primero del mes en el ranking elige el premio.
        </p>
        <p className="mt-2 text-sm text-[#b7c0d4]">
          La suscripción mensual cuesta {SUBSCRIPTION_EUROS} € e incluye {SUBSCRIPTION_POINTS} puntos para jugar.
        </p>
        <form onSubmit={handleSubmit} className="mt-5 flex flex-col gap-3">
          <label className="text-sm font-bold text-[#f4f6fb]" htmlFor="subscription-card-name">
            Titular de la tarjeta
          </label>
          <input
            id="subscription-card-name"
            name="cardName"
            type="text"
            autoComplete="cc-name"
            aria-label="Titular de la tarjeta"
            value={cardName}
            onChange={(event) => {
              setCardName(event.target.value)
            }}
            className="w-full px-4 py-3 rounded-xl border border-bg-300 bg-bg-200 text-text-100 focus:outline-none focus:border-[#f5c518]"
          />
          <label className="text-sm font-bold text-[#f4f6fb]" htmlFor="subscription-card-number">
            Número de tarjeta
          </label>
          <input
            id="subscription-card-number"
            name="cardNumber"
            type="text"
            inputMode="numeric"
            autoComplete="cc-number"
            aria-label="Número de tarjeta"
            placeholder="0000 0000 0000 0000"
            value={cardNumber}
            onChange={(event) => handleCardNumberChange(event.target.value)}
            className="w-full px-4 py-3 rounded-xl border border-bg-300 bg-bg-200 text-text-100 focus:outline-none focus:border-[#f5c518]"
          />
          <div className="grid grid-cols-2 gap-3">
            <div className="flex flex-col gap-2">
              <label className="text-sm font-bold text-[#f4f6fb]" htmlFor="subscription-card-expiry">
                Caducidad
              </label>
              <input
                id="subscription-card-expiry"
                name="expiry"
                type="text"
                inputMode="numeric"
                autoComplete="cc-exp"
                aria-label="Caducidad de la tarjeta"
                placeholder="MM/AA"
                value={expiry}
                onChange={(event) => handleExpiryChange(event.target.value)}
                className="w-full px-4 py-3 rounded-xl border border-bg-300 bg-bg-200 text-text-100 focus:outline-none focus:border-[#f5c518]"
              />
            </div>
            <div className="flex flex-col gap-2">
              <label className="text-sm font-bold text-[#f4f6fb]" htmlFor="subscription-card-cvc">
                CVC
              </label>
              <input
                id="subscription-card-cvc"
                name="cvc"
                type="text"
                inputMode="numeric"
                autoComplete="cc-csc"
                aria-label="Código de seguridad"
                placeholder="123"
                value={cvc}
                onChange={(event) => handleCvcChange(event.target.value)}
                className="w-full px-4 py-3 rounded-xl border border-bg-300 bg-bg-200 text-text-100 focus:outline-none focus:border-[#f5c518]"
              />
            </div>
          </div>
          <button
            type="submit"
            aria-label={`Pagar la suscripción de ${SUBSCRIPTION_EUROS} euros`}
            disabled={isPaying}
            className="mt-2 w-full bg-[#f5c518] text-[#1a1403] font-bold py-3 rounded-xl disabled:opacity-60 disabled:cursor-not-allowed"
          >
            {isPaying ? 'Pagando...' : 'Pagar suscripción'}
          </button>
        </form>
        <button
          type="button"
          aria-label="Cerrar sin pagar la suscripción"
          tabIndex={0}
          onClick={handleDismiss}
          onKeyDown={(event) => handleActivateKey(event, handleDismiss)}
          disabled={isPaying}
          className="mt-3 w-full text-sm font-bold text-[#b7c0d4] py-2 disabled:opacity-60"
        >
          Ahora no
        </button>
        {error && (
          <p className="mt-3 text-sm text-red-400" role="alert">{error}</p>
        )}
      </div>
    </div>
  )
}

export default SubscriptionPayDialog
