import type { KeyboardEvent } from 'react'

/** Activa una acción con Enter o Espacio (accesibilidad de teclado). */
export const handleActivateKey = (
  event: KeyboardEvent<HTMLElement>,
  action: () => void
) => {
  if (event.key !== 'Enter' && event.key !== ' ') return
  event.preventDefault()
  action()
}
