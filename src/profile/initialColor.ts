export const INITIAL_COLORS = [
  { id: 'red', label: 'Rojo', badge: 'bg-primary-300 text-primary-100', ring: 'border-[#FF5A5F]', swatch: 'bg-[#FF5A5F]' },
  { id: 'orange', label: 'Naranja', badge: 'bg-[#3a2414] text-[#ff8c24]', ring: 'border-[#ff8c24]', swatch: 'bg-[#ff8c24]' },
  { id: 'gold', label: 'Amarillo', badge: 'bg-[#3a3010] text-[#f5c518]', ring: 'border-[#f5c518]', swatch: 'bg-[#f5c518]' },
  { id: 'green', label: 'Verde', badge: 'bg-accent-200 text-accent-100', ring: 'border-[#3ddc97]', swatch: 'bg-[#3ddc97]' },
  { id: 'cyan', label: 'Cian', badge: 'bg-[#0e2433] text-[#3ec8ff]', ring: 'border-[#3ec8ff]', swatch: 'bg-[#3ec8ff]' },
  { id: 'blue', label: 'Azul', badge: 'bg-[#152038] text-[#5b8def]', ring: 'border-[#5b8def]', swatch: 'bg-[#5b8def]' },
  { id: 'purple', label: 'Morado', badge: 'bg-[#241838] text-[#b794f6]', ring: 'border-[#b794f6]', swatch: 'bg-[#b794f6]' },
  { id: 'pink', label: 'Rosa', badge: 'bg-[#3a1528] text-[#f472b6]', ring: 'border-[#f472b6]', swatch: 'bg-[#f472b6]' },
  { id: 'white', label: 'Blanco', badge: 'bg-[#1a2340] text-[#f4f6fb]', ring: 'border-[#f4f6fb]', swatch: 'bg-[#f4f6fb]' },
] as const

export type InitialColorId = (typeof INITIAL_COLORS)[number]['id']

export const INITIAL_COLOR_EVENT = 'frize-initial-color'

const keyOf = (userId: string): string => `frizeplay.initial.color.${userId}`

const colorById = (id: string | null | undefined) => {
  if (!id) return null
  return INITIAL_COLORS.find((color) => color.id === id) ?? null
}

export const initialColorOf = (userId: string, accountColor?: string | null) => {
  const account = colorById(accountColor)
  if (account) return account
  return colorById(window.localStorage.getItem(keyOf(userId))) ?? INITIAL_COLORS[0]
}

export const savedInitialColor = (userId: string): string | null => {
  return colorById(window.localStorage.getItem(keyOf(userId)))?.id ?? null
}

export const saveInitialColor = (userId: string, id: string): void => {
  const color = colorById(id) ?? INITIAL_COLORS[0]
  window.localStorage.setItem(keyOf(userId), color.id)
  window.dispatchEvent(new CustomEvent(INITIAL_COLOR_EVENT, { detail: color.id }))
}
