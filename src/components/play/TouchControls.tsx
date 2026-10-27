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

const PadButton = ({ padKey, className }: { padKey: PadKey; className?: string }) => {
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
      className={className ?? 'min-w-12 min-h-12 px-3 rounded-xl bg-[#1a2340] border border-[#f5c518]/60 text-[#f5c518] text-[10px] font-bold select-none touch-none active:bg-[#f5c518] active:text-[#1a1403]'}
    >
      {padKey.label}
    </button>
  )
}

const STICK = 112
const KNOB = 48
const TRAVEL = (STICK - KNOB) / 2
const DEAD = 0.22

type StickAxis = {
  minus: string
  plus: string
}

type VirtualJoystickProps = {
  label: string
  horizontal?: StickAxis
  vertical?: StickAxis
}

const axisKey = (amount: number, axis: StickAxis | undefined): string | null => {
  if (!axis) return null
  if (amount <= -DEAD) return axis.minus
  if (amount >= DEAD) return axis.plus
  return null
}

const VirtualJoystick = ({ label, horizontal, vertical }: VirtualJoystickProps) => {
  const heldKeys = useRef<Set<string>>(new Set())
  const arrows = useRef({ left: false, right: false, up: false, down: false })
  const [offset, setOffset] = useState({ x: 0, y: 0 })

  const releaseAll = () => {
    heldKeys.current.forEach((key) => sendKey('keyup', key))
    heldKeys.current = new Set()
  }

  const applyOffset = (x: number, y: number) => {
    const want = new Set(
      [axisKey(x / TRAVEL, horizontal), axisKey(y / TRAVEL, vertical)].filter((key): key is string => key !== null),
    )
    heldKeys.current.forEach((key) => {
      if (!want.has(key)) sendKey('keyup', key)
    })
    want.forEach((key) => {
      if (!heldKeys.current.has(key)) sendKey('keydown', key)
    })
    heldKeys.current = want
    setOffset({ x, y })
  }

  useEffect(() => releaseAll, [])

  const resetStick = () => {
    arrows.current = { left: false, right: false, up: false, down: false }
    applyOffset(0, 0)
  }

  const placePointer = (event: PointerEvent<HTMLDivElement>) => {
    const rect = event.currentTarget.getBoundingClientRect()
    let dx = event.clientX - (rect.left + rect.width / 2)
    let dy = event.clientY - (rect.top + rect.height / 2)
    const distance = Math.hypot(dx, dy)
    if (distance > TRAVEL) {
      dx = (dx / distance) * TRAVEL
      dy = (dy / distance) * TRAVEL
    }
    applyOffset(dx, dy)
  }

  const handlePointerDown = (event: PointerEvent<HTMLDivElement>) => {
    event.preventDefault()
    arrows.current = { left: false, right: false, up: false, down: false }
    event.currentTarget.setPointerCapture(event.pointerId)
    placePointer(event)
  }

  const placeArrows = () => {
    let x = 0
    let y = 0
    if (arrows.current.left) x -= TRAVEL
    if (arrows.current.right) x += TRAVEL
    if (arrows.current.up) y -= TRAVEL
    if (arrows.current.down) y += TRAVEL
    const distance = Math.hypot(x, y)
    if (distance > TRAVEL) {
      x = (x / distance) * TRAVEL
      y = (y / distance) * TRAVEL
    }
    applyOffset(x, y)
  }

  const handleKeyDown = (event: KeyboardEvent<HTMLDivElement>) => {
    const arrow = event.key
    if (arrow !== 'ArrowUp' && arrow !== 'ArrowDown' && arrow !== 'ArrowLeft' && arrow !== 'ArrowRight') return
    if ((arrow === 'ArrowLeft' || arrow === 'ArrowRight') && !horizontal) return
    if ((arrow === 'ArrowUp' || arrow === 'ArrowDown') && !vertical) return
    event.preventDefault()
    if (arrow === 'ArrowLeft') arrows.current.left = true
    if (arrow === 'ArrowRight') arrows.current.right = true
    if (arrow === 'ArrowUp') arrows.current.up = true
    if (arrow === 'ArrowDown') arrows.current.down = true
    placeArrows()
  }

  const handleKeyUp = (event: KeyboardEvent<HTMLDivElement>) => {
    const arrow = event.key
    if (arrow !== 'ArrowUp' && arrow !== 'ArrowDown' && arrow !== 'ArrowLeft' && arrow !== 'ArrowRight') return
    event.preventDefault()
    if (arrow === 'ArrowLeft') arrows.current.left = false
    if (arrow === 'ArrowRight') arrows.current.right = false
    if (arrow === 'ArrowUp') arrows.current.up = false
    if (arrow === 'ArrowDown') arrows.current.down = false
    placeArrows()
  }

  const active = [
    axisKey(offset.x / TRAVEL, horizontal),
    axisKey(offset.y / TRAVEL, vertical),
  ].filter((key) => key !== null)
  const valueText = active.length > 0 ? active.join(' ') : 'Centro'
  const onlyVertical = Boolean(vertical) && !horizontal

  return (
    <div
      role={onlyVertical ? 'slider' : 'application'}
      aria-label={label}
      aria-orientation={onlyVertical ? 'vertical' : undefined}
      aria-valuemin={onlyVertical ? -100 : undefined}
      aria-valuemax={onlyVertical ? 100 : undefined}
      aria-valuenow={onlyVertical ? Math.round((offset.y / TRAVEL) * 100) : undefined}
      aria-valuetext={valueText}
      tabIndex={0}
      onPointerDown={handlePointerDown}
      onPointerMove={(event) => {
        if (!event.currentTarget.hasPointerCapture(event.pointerId)) return
        placePointer(event)
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

const DRIVE_BUTTON = 'flex-1 min-h-24 landscape:min-h-14 px-1 rounded-2xl bg-[#1a2340] border-2 border-[#f5c518]/70 text-[#f5c518] text-xs font-bold tracking-wide select-none touch-none active:bg-[#f5c518] active:text-[#1a1403]'

const CAR_BUTTONS: PadKey[] = [
  { key: 'a', label: 'ARRIBA', ariaLabel: 'Girar a la izquierda' },
  { key: 'w', label: 'ADELANTE', ariaLabel: 'Acelerar' },
  { key: 'd', label: 'ABAJO', ariaLabel: 'Girar a la derecha' },
]

const DROP_BUTTON = 'flex-1 min-h-20 landscape:min-h-16 rounded-2xl bg-[#1a2340] border-2 border-[#f5c518]/70 text-[#f5c518] text-base font-bold select-none touch-none active:bg-[#f5c518] active:text-[#1a1403]'

const DROP_BUTTONS: PadKey[] = [
  { key: 'a', label: '◀ IZQUIERDA', ariaLabel: 'Mover a la izquierda' },
  { key: 'd', label: 'DERECHA ▶', ariaLabel: 'Mover a la derecha' },
]

const BRAKE_BUTTON: PadKey = { key: ' ', label: 'FRENO', ariaLabel: 'Frenar' }

const FLOAT_ON_LANDSCAPE = '[@media(orientation:landscape)_and_(max-height:520px)]:absolute [@media(orientation:landscape)_and_(max-height:520px)]:inset-x-0 [@media(orientation:landscape)_and_(max-height:520px)]:bottom-0 [@media(orientation:landscape)_and_(max-height:520px)]:z-10 [@media(orientation:landscape)_and_(max-height:520px)]:bg-black/55 [@media(orientation:landscape)_and_(max-height:520px)]:py-2'

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

  const rowClass = `${gameId === 'pong'
    ? 'w-full flex lg:hidden items-center justify-center px-2 py-3 landscape:py-1'
    : gameId === 'tetris' || gameId === 'combat'
      ? 'w-full flex lg:hidden items-center justify-between gap-3 px-3 py-3 landscape:gap-2 landscape:px-2 landscape:py-1'
      : 'w-full flex lg:hidden items-end justify-between gap-4 px-2 py-3'} ${FLOAT_ON_LANDSCAPE}`

  return (
    <div
      className={rowClass}
      aria-label="Controles táctiles"
    >
      {gameId === 'pong' && (
        <VirtualJoystick label="Joystick para mover la pala" vertical={{ minus: 'w', plus: 's' }} />
      )}
      {gameId === 'tetris' && (
        <>
          <div className="flex flex-1 gap-3 min-w-0" aria-label="Controles del coche">
            {CAR_BUTTONS.map((padKey) => (
              <PadButton key={padKey.ariaLabel} padKey={padKey} className={DRIVE_BUTTON} />
            ))}
          </div>
          <PadButton
            padKey={BRAKE_BUTTON}
            className="shrink-0 w-14 h-14 rounded-xl bg-[#1a2340] border border-[#f5c518]/60 text-[#f5c518] text-[9px] font-bold select-none touch-none active:bg-[#f5c518] active:text-[#1a1403]"
          />
        </>
      )}
      {gameId === 'combat' && (
        <div className="flex w-full flex-1 gap-3" aria-label="Mover el paracaídas">
          {DROP_BUTTONS.map((padKey) => (
            <PadButton key={padKey.ariaLabel} padKey={padKey} className={DROP_BUTTON} />
          ))}
        </div>
      )}
      {gameId !== 'pong' && gameId !== 'tetris' && gameId !== 'combat' && <DirPad dirs={pad.dirs} />}
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
