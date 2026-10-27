import { useEffect, useRef, useState, type KeyboardEvent, type PointerEvent } from 'react'

type PadKey = {
  key: string
  label: string
  ariaLabel: string
}

type GamePad = {
  dirs: PadKey[]
  actions: PadKey[]
}

const PADS: Record<string, GamePad> = {
  pong: {
    dirs: [
      { key: 'w', label: '▲', ariaLabel: 'Subir pala' },
      { key: 's', label: '▼', ariaLabel: 'Bajar pala' },
    ],
    actions: [],
  },
  snake: {
    dirs: [
      { key: ' ', label: 'IMPULSO', ariaLabel: 'Impulso hacia arriba' },
    ],
    actions: [],
  },
  tetris: {
    dirs: [
      { key: 'w', label: '▲', ariaLabel: 'Acelerar' },
      { key: 'a', label: '◀', ariaLabel: 'Girar a la izquierda' },
      { key: 's', label: '▼', ariaLabel: 'Frenar' },
      { key: 'd', label: '▶', ariaLabel: 'Girar a la derecha' },
    ],
    actions: [],
  },
  combat: {
    dirs: [
      { key: 'a', label: '◀', ariaLabel: 'Mover izquierda' },
      { key: 'd', label: '▶', ariaLabel: 'Mover derecha' },
    ],
    actions: [],
  },
  shooter: {
    dirs: [
      { key: 'w', label: '▲', ariaLabel: 'Arriba' },
      { key: 'a', label: '◀', ariaLabel: 'Izquierda' },
      { key: 's', label: '▼', ariaLabel: 'Abajo' },
      { key: 'd', label: '▶', ariaLabel: 'Derecha' },
    ],
    actions: [
      { key: ' ', label: 'DISPARO', ariaLabel: 'Disparar' },
    ],
  },
}

const keyCode = (key: string): string => {
  if (key === ' ') return 'Space'
  if (key.length === 1) return `Key${key.toUpperCase()}`
  return key
}

const sendKey = (type: 'keydown' | 'keyup', key: string) => {
  window.dispatchEvent(new KeyboardEvent(type, { key, code: keyCode(key), bubbles: true }))
}

const PadButton = ({ padKey }: { padKey: PadKey }) => {
  const handlePointerDown = (event: PointerEvent<HTMLButtonElement>) => {
    event.preventDefault()
    event.currentTarget.setPointerCapture(event.pointerId)
    sendKey('keydown', padKey.key)
  }

  const handlePointerUp = (event: PointerEvent<HTMLButtonElement>) => {
    event.preventDefault()
    sendKey('keyup', padKey.key)
  }

  const handleKeyDown = (event: KeyboardEvent<HTMLButtonElement>) => {
    if (event.key !== 'Enter' && event.key !== ' ') return
    event.preventDefault()
    sendKey('keydown', padKey.key)
  }

  const handleKeyUp = (event: KeyboardEvent<HTMLButtonElement>) => {
    if (event.key !== 'Enter' && event.key !== ' ') return
    event.preventDefault()
    sendKey('keyup', padKey.key)
  }

  return (
    <button
      type="button"
      aria-label={padKey.ariaLabel}
      tabIndex={0}
      onPointerDown={handlePointerDown}
      onPointerUp={handlePointerUp}
      onPointerCancel={handlePointerUp}
      onKeyDown={handleKeyDown}
      onKeyUp={handleKeyUp}
      className="min-w-12 min-h-12 px-3 rounded-xl bg-[#1a2340] border border-[#f5c518]/60 text-[#f5c518] text-[10px] font-bold select-none touch-none active:bg-[#f5c518] active:text-[#1a1403]"
    >
      {padKey.label}
    </button>
  )
}

const STICK = 112
const KNOB = 48
const TRAVEL = (STICK - KNOB) / 2
const DEAD = 0.22

const PaddleJoystick = () => {
  const heldKey = useRef<string | null>(null)
  const [offset, setOffset] = useState({ x: 0, y: 0 })

  const releaseHeld = () => {
    if (!heldKey.current) return
    sendKey('keyup', heldKey.current)
    heldKey.current = null
  }

  const holdKey = (key: string | null) => {
    if (heldKey.current === key) return
    releaseHeld()
    if (!key) return
    sendKey('keydown', key)
    heldKey.current = key
  }

  useEffect(() => releaseHeld, [])

  const resetStick = () => {
    setOffset({ x: 0, y: 0 })
    holdKey(null)
  }

  const handlePointerDown = (event: PointerEvent<HTMLDivElement>) => {
    event.preventDefault()
    event.currentTarget.setPointerCapture(event.pointerId)
    moveStick(event)
  }

  const moveStick = (event: PointerEvent<HTMLDivElement>) => {
    const rect = event.currentTarget.getBoundingClientRect()
    const centerX = rect.left + rect.width / 2
    const centerY = rect.top + rect.height / 2
    let dx = event.clientX - centerX
    let dy = event.clientY - centerY
    const distance = Math.hypot(dx, dy)
    if (distance > TRAVEL) {
      dx = (dx / distance) * TRAVEL
      dy = (dy / distance) * TRAVEL
    }
    setOffset({ x: dx, y: dy })
    const vertical = dy / TRAVEL
    if (vertical <= -DEAD) holdKey('w')
    else if (vertical >= DEAD) holdKey('s')
    else holdKey(null)
  }

  const handleKeyDown = (event: KeyboardEvent<HTMLDivElement>) => {
    if (event.key !== 'ArrowUp' && event.key !== 'ArrowDown') return
    event.preventDefault()
    const up = event.key === 'ArrowUp'
    holdKey(up ? 'w' : 's')
    setOffset({ x: 0, y: up ? -TRAVEL : TRAVEL })
  }

  const handleKeyUp = (event: KeyboardEvent<HTMLDivElement>) => {
    if (event.key !== 'ArrowUp' && event.key !== 'ArrowDown') return
    event.preventDefault()
    resetStick()
  }

  const vertical = offset.y / TRAVEL
  const valueText = vertical <= -DEAD ? 'Arriba' : vertical >= DEAD ? 'Abajo' : 'Centro'

  return (
    <div
      role="slider"
      aria-label="Joystick para mover la pala"
      aria-orientation="vertical"
      aria-valuemin={-100}
      aria-valuemax={100}
      aria-valuenow={Math.round(vertical * 100)}
      aria-valuetext={valueText}
      tabIndex={0}
      onPointerDown={handlePointerDown}
      onPointerMove={(event) => {
        if (!event.currentTarget.hasPointerCapture(event.pointerId)) return
        moveStick(event)
      }}
      onPointerUp={resetStick}
      onPointerCancel={resetStick}
      onKeyDown={handleKeyDown}
      onKeyUp={handleKeyUp}
      onBlur={resetStick}
      onContextMenu={(event) => event.preventDefault()}
      className="relative rounded-full bg-[#12182c] border-2 border-[#f5c518]/70 touch-none select-none"
      style={{ width: STICK, height: STICK }}
    >
      <span className="absolute left-1/2 top-3 bottom-3 w-px -translate-x-1/2 bg-[#f5c518]/30" aria-hidden="true" />
      <span className="absolute top-1/2 left-3 right-3 h-px -translate-y-1/2 bg-[#f5c518]/30" aria-hidden="true" />
      <span
        aria-hidden="true"
        className="absolute left-1/2 top-1/2 rounded-full bg-[#f5c518] shadow-[0_4px_0_#a16207]"
        style={{
          width: KNOB,
          height: KNOB,
          transform: `translate(calc(-50% + ${offset.x}px), calc(-50% + ${offset.y}px))`,
        }}
      />
    </div>
  )
}

const DirPad = ({ dirs }: { dirs: PadKey[] }) => {
  const byKey: Record<string, PadKey> = {}
  dirs.forEach((dir) => {
    byKey[dir.key] = dir
  })
  const up = byKey.w
  const left = byKey.a
  const down = byKey.s
  const right = byKey.d

  if (up && left && right) {
    return (
      <div className="grid grid-cols-3 gap-1 w-[9.75rem]" aria-label="Cruz direccional">
        <span aria-hidden="true" />
        <PadButton padKey={up} />
        <span aria-hidden="true" />
        <PadButton padKey={left} />
        {down ? <PadButton padKey={down} /> : <span aria-hidden="true" />}
        <PadButton padKey={right} />
      </div>
    )
  }

  return (
    <div className="flex flex-col gap-2">
      {dirs.map((dir) => (
        <PadButton key={dir.ariaLabel} padKey={dir} />
      ))}
    </div>
  )
}

const TouchControls = ({ gameId }: { gameId: string }) => {
  const pad = PADS[gameId]
  if (!pad) return null

  const rowClass = gameId === 'pong'
    ? 'w-full flex lg:hidden items-center justify-center px-2 py-3'
    : 'w-full flex lg:hidden items-end justify-between gap-4 px-2 py-3'

  return (
    <div
      className={rowClass}
      aria-label="Controles táctiles"
    >
      {gameId === 'pong' ? <PaddleJoystick /> : <DirPad dirs={pad.dirs} />}
      {pad.actions.length > 0 && (
        <div className="flex flex-wrap justify-end gap-2 max-w-[50%]">
          {pad.actions.map((action) => (
            <PadButton key={action.ariaLabel} padKey={action} />
          ))}
        </div>
      )}
    </div>
  )
}

export default TouchControls
