import { type KeyboardEvent, type PointerEvent } from 'react'

type PadKey = {
  key: string
  label: string
  ariaLabel: string
  vertical?: boolean
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
      { key: 'ArrowLeft', label: '◀', ariaLabel: 'Girar a la izquierda' },
      { key: 'ArrowRight', label: '▶', ariaLabel: 'Girar a la derecha' },
      { key: ' ', label: 'TURBO', ariaLabel: 'Activar el turbo' },
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

const VerticalWord = ({ text }: { text: string }) => (
  <span className="flex flex-col items-center justify-center text-[11px] leading-none tracking-normal">
    {Array.from(text).map((letter, index) => (
      <span key={`${letter}-${index}`}>{letter}</span>
    ))}
  </span>
)

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
      {padKey.vertical ? <VerticalWord text={padKey.label} /> : padKey.label}
    </button>
  )
}

const PADDLE_BUTTON = 'min-h-24 w-full flex-1 rounded-2xl bg-[#1a2340] border-2 border-[#f5c518]/70 text-[#f5c518] text-base font-bold tracking-wide select-none touch-none active:bg-[#f5c518] active:text-[#1a1403]'

const PLANE_BUTTON = 'min-h-32 w-full rounded-2xl bg-[#1a2340] border-2 border-[#f5c518]/70 text-[#f5c518] text-xl font-bold tracking-wide select-none touch-none active:bg-[#f5c518] active:text-[#1a1403]'

const PADDLE_KEYS: PadKey[] = [
  { key: 'w', label: '▲ ARRIBA', ariaLabel: 'Subir la pala' },
  { key: 's', label: '▼ ABAJO', ariaLabel: 'Bajar la pala' },
]


const CAR_BUTTON = 'flex min-h-0 min-w-0 w-full flex-1 items-center justify-center self-stretch rounded-2xl bg-[#1a2340] border-2 border-[#f5c518]/70 px-1 text-center text-lg font-bold leading-tight tracking-wide text-[#f5c518] select-none touch-none active:bg-[#f5c518] active:text-[#1a1403] [@media(orientation:landscape)_and_(max-height:520px)_and_(max-width:1023px)]:text-sm'

const STEER_ROW = 'flex min-h-0 min-w-0 flex-1 items-stretch gap-2 self-stretch [@media(orientation:landscape)_and_(max-height:520px)_and_(max-width:1023px)]:order-1 [@media(orientation:landscape)_and_(max-height:520px)_and_(max-width:1023px)]:h-full [@media(orientation:landscape)_and_(max-height:520px)_and_(max-width:1023px)]:flex-col [@media(orientation:landscape)_and_(max-height:520px)_and_(max-width:1023px)]:px-2 [@media(orientation:landscape)_and_(max-height:520px)_and_(max-width:1023px)]:py-2'

const GAS_ROW = 'flex min-h-0 min-w-0 flex-1 items-stretch self-stretch [@media(orientation:landscape)_and_(max-height:520px)_and_(max-width:1023px)]:order-3 [@media(orientation:landscape)_and_(max-height:520px)_and_(max-width:1023px)]:h-full [@media(orientation:landscape)_and_(max-height:520px)_and_(max-width:1023px)]:px-2 [@media(orientation:landscape)_and_(max-height:520px)_and_(max-width:1023px)]:py-2'

const STEER_BUTTONS: PadKey[] = [
  { key: 'ArrowLeft', label: 'IZQUIERDA', ariaLabel: 'Girar a la izquierda', vertical: true },
  { key: 'ArrowRight', label: 'DERECHA', ariaLabel: 'Girar a la derecha', vertical: true },
]

const DROP_BUTTON = 'min-h-24 w-full flex-1 rounded-2xl bg-[#1a2340] border-2 border-[#f5c518]/70 text-[#f5c518] text-base font-bold select-none touch-none active:bg-[#f5c518] active:text-[#1a1403]'

const DROP_LEFT = 'flex min-w-0 flex-1 [@media(orientation:landscape)_and_(max-height:520px)_and_(max-width:1023px)]:order-1 [@media(orientation:landscape)_and_(max-height:520px)_and_(max-width:1023px)]:w-28 [@media(orientation:landscape)_and_(max-height:520px)_and_(max-width:1023px)]:flex-none [@media(orientation:landscape)_and_(max-height:520px)_and_(max-width:1023px)]:self-stretch [@media(orientation:landscape)_and_(max-height:520px)_and_(max-width:1023px)]:px-2'

const DROP_RIGHT = 'flex min-w-0 flex-1 [@media(orientation:landscape)_and_(max-height:520px)_and_(max-width:1023px)]:order-3 [@media(orientation:landscape)_and_(max-height:520px)_and_(max-width:1023px)]:w-28 [@media(orientation:landscape)_and_(max-height:520px)_and_(max-width:1023px)]:flex-none [@media(orientation:landscape)_and_(max-height:520px)_and_(max-width:1023px)]:self-stretch [@media(orientation:landscape)_and_(max-height:520px)_and_(max-width:1023px)]:px-2'

const DROP_BUTTONS: PadKey[] = [
  { key: 'a', label: '◀ IZQUIERDA', ariaLabel: 'Mover a la izquierda' },
  { key: 'd', label: 'DERECHA ▶', ariaLabel: 'Mover a la derecha' },
]

const TURBO_BUTTON: PadKey = { key: ' ', label: 'TURBO', ariaLabel: 'Activar el turbo' }

const PADDLE_LEFT = 'flex w-full max-w-xs flex-col gap-3 [@media(orientation:landscape)_and_(max-height:520px)_and_(max-width:1023px)]:order-1 [@media(orientation:landscape)_and_(max-height:520px)_and_(max-width:1023px)]:w-28 [@media(orientation:landscape)_and_(max-height:520px)_and_(max-width:1023px)]:max-w-none [@media(orientation:landscape)_and_(max-height:520px)_and_(max-width:1023px)]:self-stretch [@media(orientation:landscape)_and_(max-height:520px)_and_(max-width:1023px)]:justify-center [@media(orientation:landscape)_and_(max-height:520px)_and_(max-width:1023px)]:px-2'

const PADDLE_RIGHT = 'flex w-full max-w-xs flex-col gap-3 [@media(orientation:landscape)_and_(max-height:520px)_and_(max-width:1023px)]:order-3 [@media(orientation:landscape)_and_(max-height:520px)_and_(max-width:1023px)]:w-28 [@media(orientation:landscape)_and_(max-height:520px)_and_(max-width:1023px)]:max-w-none [@media(orientation:landscape)_and_(max-height:520px)_and_(max-width:1023px)]:self-stretch [@media(orientation:landscape)_and_(max-height:520px)_and_(max-width:1023px)]:justify-center [@media(orientation:landscape)_and_(max-height:520px)_and_(max-width:1023px)]:px-2'

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

const TouchControls = ({ gameId, stickSide = 'left' }: { gameId: string; stickSide?: 'left' | 'right' }) => {
  const pad = PADS[gameId]
  if (!pad) return null

  const rowClass = gameId === 'tetris'
    ? 'flex min-h-0 w-full flex-1 items-stretch gap-2 px-2 py-2 lg:hidden [@media(orientation:landscape)_and_(max-height:520px)_and_(max-width:1023px)]:contents'
    : gameId === 'pong'
      ? 'w-full flex lg:hidden items-center justify-center px-2 py-2 [@media(orientation:landscape)_and_(max-height:520px)_and_(max-width:1023px)]:contents'
      : `${gameId === 'combat'
        ? 'w-full flex lg:hidden items-stretch justify-between gap-3 px-3 py-3 [@media(orientation:landscape)_and_(max-height:520px)_and_(max-width:1023px)]:contents'
        : 'w-full flex lg:hidden items-end justify-between gap-4 px-2 py-3'} ${gameId === 'combat' ? '' : FLOAT_ON_LANDSCAPE}`

  return (
    <div
      className={rowClass}
      aria-label="Controles táctiles"
    >
      {gameId === 'pong' && (
        <div
          className={stickSide === 'right' ? PADDLE_RIGHT : PADDLE_LEFT}
          aria-label="Mover la pala"
        >
          {PADDLE_KEYS.map((padKey) => (
            <PadButton key={padKey.ariaLabel} padKey={padKey} className={PADDLE_BUTTON} />
          ))}
        </div>
      )}
      {gameId === 'tetris' && (
        <>
          <div className={STEER_ROW} aria-label="Girar el coche">
            {STEER_BUTTONS.map((padKey) => (
              <PadButton key={padKey.ariaLabel} padKey={padKey} className={CAR_BUTTON} />
            ))}
          </div>
          <div className={GAS_ROW} aria-label="Activar el turbo">
            <PadButton padKey={TURBO_BUTTON} className={CAR_BUTTON} />
          </div>
        </>
      )}
      {gameId === 'combat' && (
        <>
          <div className={DROP_LEFT} aria-label="Mover a la izquierda">
            <PadButton padKey={DROP_BUTTONS[0]} className={DROP_BUTTON} />
          </div>
          <div className={DROP_RIGHT} aria-label="Mover a la derecha">
            <PadButton padKey={DROP_BUTTONS[1]} className={DROP_BUTTON} />
          </div>
        </>
      )}
      {gameId === 'snake' && (
        <div className="flex w-full" aria-label="Impulso del avión">
          <PadButton padKey={PADS.snake.dirs[0]} className={PLANE_BUTTON} />
        </div>
      )}
      {gameId !== 'pong' && gameId !== 'tetris' && gameId !== 'combat' && gameId !== 'snake' && <DirPad dirs={pad.dirs} />}
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
