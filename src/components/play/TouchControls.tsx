import { ArrowLeft, ArrowRight, ArrowUp } from 'lucide-react'
import { useEffect, useRef, type KeyboardEvent, type PointerEvent, type ReactNode } from 'react'

type PadKey = {
  key: string
  label: string
  ariaLabel: string
  mark?: string
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
      { key: ' ', label: 'IMPULSO', mark: '▲', ariaLabel: 'Impulso hacia arriba' },
    ],
    actions: [],
  },
  tetris: {
    dirs: [
      { key: 'ArrowLeft', label: '◀', ariaLabel: 'Girar a la izquierda' },
      { key: 'ArrowRight', label: '▶', ariaLabel: 'Girar a la derecha' },
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

const SteerMark = ({ turn }: { turn: 'left' | 'right' }) => {
  const markRef = useRef<HTMLSpanElement>(null)

  useEffect(() => {
    const handleHeading = (event: Event) => {
      const angle = (event as CustomEvent<number>).detail
      const mark = markRef.current
      if (!mark || typeof angle !== 'number') return
      const degrees = (angle * 180) / Math.PI
      const spin = turn === 'left' ? degrees : degrees + 180
      mark.style.transform = `rotate(${spin}deg)`
    }
    window.addEventListener('frize-car-heading', handleHeading)
    return () => window.removeEventListener('frize-car-heading', handleHeading)
  }, [turn])

  return (
    <span ref={markRef} className="inline-flex origin-center items-center justify-center" aria-hidden="true">
      <ArrowUp className="h-16 w-16" strokeWidth={3} />
    </span>
  )
}

const PadButton = ({ padKey, className, children }: { padKey: PadKey; className?: string; children?: ReactNode }) => {
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
      {children ?? (padKey.mark ? (
        <span className="flex max-w-full flex-col items-center justify-center gap-1 leading-none">
          <span className="text-2xl leading-none">{padKey.mark}</span>
          <span className="max-w-full text-center text-[10px] leading-tight tracking-normal">{padKey.label}</span>
        </span>
      ) : padKey.label)}
    </button>
  )
}

const PADDLE_BUTTON = 'flex min-h-24 w-full min-w-0 flex-1 items-center justify-center overflow-hidden rounded-2xl bg-[#1a2340] border-2 border-[#f5c518]/70 px-1 text-[#f5c518] text-base font-bold tracking-wide select-none touch-none active:bg-[#f5c518] active:text-[#1a1403]'

const PLANE_BUTTON = 'flex min-h-32 w-full items-center justify-center rounded-2xl bg-[#1a2340] border-2 border-[#f5c518]/70 text-[#f5c518] text-xl font-bold tracking-wide select-none touch-none active:bg-[#f5c518] active:text-[#1a1403] [@media(orientation:landscape)_and_(max-height:520px)_and_(max-width:1023px)]:h-full [@media(orientation:landscape)_and_(max-height:520px)_and_(max-width:1023px)]:min-h-0 [@media(orientation:landscape)_and_(max-height:520px)_and_(max-width:1023px)]:px-1 [@media(orientation:landscape)_and_(max-height:520px)_and_(max-width:1023px)]:[&_span]:text-xl'

const PLANE_SIDE = 'flex w-full [@media(orientation:landscape)_and_(max-height:520px)_and_(max-width:1023px)]:order-3 [@media(orientation:landscape)_and_(max-height:520px)_and_(max-width:1023px)]:h-full [@media(orientation:landscape)_and_(max-height:520px)_and_(max-width:1023px)]:w-auto [@media(orientation:landscape)_and_(max-height:520px)_and_(max-width:1023px)]:min-w-[4.5rem] [@media(orientation:landscape)_and_(max-height:520px)_and_(max-width:1023px)]:self-stretch [@media(orientation:landscape)_and_(max-height:520px)_and_(max-width:1023px)]:px-1 [@media(orientation:landscape)_and_(max-height:520px)_and_(max-width:1023px)]:py-1 [@media(orientation:landscape)_and_(max-height:520px)_and_(max-width:1023px)]:[flex:1_0_4.5rem]'

const PADDLE_KEYS: PadKey[] = [
  { key: 'w', label: 'ARRIBA', mark: '▲', ariaLabel: 'Subir la pala' },
  { key: 's', label: 'ABAJO', mark: '▼', ariaLabel: 'Bajar la pala' },
]


const CAR_BUTTON = 'flex min-h-0 min-w-0 w-full flex-1 items-center justify-center self-stretch overflow-hidden rounded-2xl bg-[#1a2340] border-2 border-[#f5c518]/70 px-1 text-center text-5xl font-bold leading-none text-[#f5c518] select-none touch-none active:bg-[#f5c518] active:text-[#1a1403]'

const CAR_SIDE_LEFT = 'flex min-h-0 min-w-0 flex-1 [@media(orientation:landscape)_and_(max-height:520px)_and_(max-width:1023px)]:order-1 [@media(orientation:landscape)_and_(max-height:520px)_and_(max-width:1023px)]:h-full [@media(orientation:landscape)_and_(max-height:520px)_and_(max-width:1023px)]:w-auto [@media(orientation:landscape)_and_(max-height:520px)_and_(max-width:1023px)]:min-w-[4.5rem] [@media(orientation:landscape)_and_(max-height:520px)_and_(max-width:1023px)]:self-stretch [@media(orientation:landscape)_and_(max-height:520px)_and_(max-width:1023px)]:px-1 [@media(orientation:landscape)_and_(max-height:520px)_and_(max-width:1023px)]:py-1 [@media(orientation:landscape)_and_(max-height:520px)_and_(max-width:1023px)]:[flex:1_0_4.5rem]'

const CAR_SIDE_RIGHT = 'flex min-h-0 min-w-0 flex-1 [@media(orientation:landscape)_and_(max-height:520px)_and_(max-width:1023px)]:order-3 [@media(orientation:landscape)_and_(max-height:520px)_and_(max-width:1023px)]:h-full [@media(orientation:landscape)_and_(max-height:520px)_and_(max-width:1023px)]:w-auto [@media(orientation:landscape)_and_(max-height:520px)_and_(max-width:1023px)]:min-w-[4.5rem] [@media(orientation:landscape)_and_(max-height:520px)_and_(max-width:1023px)]:self-stretch [@media(orientation:landscape)_and_(max-height:520px)_and_(max-width:1023px)]:px-1 [@media(orientation:landscape)_and_(max-height:520px)_and_(max-width:1023px)]:py-1 [@media(orientation:landscape)_and_(max-height:520px)_and_(max-width:1023px)]:[flex:1_0_4.5rem]'

const STEER_BUTTONS: PadKey[] = [
  { key: 'ArrowLeft', label: '↶', ariaLabel: 'Girar a la izquierda' },
  { key: 'ArrowRight', label: '↷', ariaLabel: 'Girar a la derecha' },
]

const DROP_BUTTONS: PadKey[] = [
  { key: 'a', label: '◀', ariaLabel: 'Mover a la izquierda' },
  { key: 'd', label: '▶', ariaLabel: 'Mover a la derecha' },
]

const PADDLE_UP = 'flex w-full max-w-xs [@media(orientation:landscape)_and_(max-height:520px)_and_(max-width:1023px)]:order-1 [@media(orientation:landscape)_and_(max-height:520px)_and_(max-width:1023px)]:h-full [@media(orientation:landscape)_and_(max-height:520px)_and_(max-width:1023px)]:w-28 [@media(orientation:landscape)_and_(max-height:520px)_and_(max-width:1023px)]:max-w-none [@media(orientation:landscape)_and_(max-height:520px)_and_(max-width:1023px)]:flex-none [@media(orientation:landscape)_and_(max-height:520px)_and_(max-width:1023px)]:self-stretch [@media(orientation:landscape)_and_(max-height:520px)_and_(max-width:1023px)]:px-2'

const PADDLE_DOWN = 'flex w-full max-w-xs [@media(orientation:landscape)_and_(max-height:520px)_and_(max-width:1023px)]:order-3 [@media(orientation:landscape)_and_(max-height:520px)_and_(max-width:1023px)]:h-full [@media(orientation:landscape)_and_(max-height:520px)_and_(max-width:1023px)]:w-28 [@media(orientation:landscape)_and_(max-height:520px)_and_(max-width:1023px)]:max-w-none [@media(orientation:landscape)_and_(max-height:520px)_and_(max-width:1023px)]:flex-none [@media(orientation:landscape)_and_(max-height:520px)_and_(max-width:1023px)]:self-stretch [@media(orientation:landscape)_and_(max-height:520px)_and_(max-width:1023px)]:px-2'

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

const TouchControls = ({ gameId }: { gameId: string; stickSide?: 'left' | 'right' }) => {
  const pad = PADS[gameId]
  if (!pad) return null

  const rowClass = gameId === 'tetris' || gameId === 'combat'
    ? 'flex min-h-0 w-full flex-1 items-stretch gap-2 px-2 py-2 lg:hidden [@media(orientation:landscape)_and_(max-height:520px)_and_(max-width:1023px)]:contents'
    : gameId === 'pong'
      ? 'flex w-full flex-col items-center gap-3 px-2 py-2 lg:hidden [@media(orientation:landscape)_and_(max-height:520px)_and_(max-width:1023px)]:contents'
      : gameId === 'snake'
        ? 'flex w-full shrink-0 lg:hidden px-2 pb-2 pt-1 [@media(orientation:landscape)_and_(max-height:520px)_and_(max-width:1023px)]:contents'
        : `w-full flex lg:hidden items-end justify-between gap-4 px-2 py-3 ${FLOAT_ON_LANDSCAPE}`

  return (
    <div
      className={rowClass}
      aria-label="Controles táctiles"
    >
      {gameId === 'pong' && (
        <>
          <div className={PADDLE_UP} aria-label="Subir la pala">
            <PadButton padKey={PADDLE_KEYS[0]} className={PADDLE_BUTTON} />
          </div>
          <div className={PADDLE_DOWN} aria-label="Bajar la pala">
            <PadButton padKey={PADDLE_KEYS[1]} className={PADDLE_BUTTON} />
          </div>
        </>
      )}
      {gameId === 'tetris' && (
        <>
          <div className={CAR_SIDE_LEFT} aria-label="Girar a la izquierda">
            <PadButton padKey={STEER_BUTTONS[0]} className={CAR_BUTTON}>
              <SteerMark turn="left" />
            </PadButton>
          </div>
          <div className={CAR_SIDE_RIGHT} aria-label="Girar a la derecha">
            <PadButton padKey={STEER_BUTTONS[1]} className={CAR_BUTTON}>
              <SteerMark turn="right" />
            </PadButton>
          </div>
        </>
      )}
      {gameId === 'combat' && (
        <>
          <div className={CAR_SIDE_LEFT} aria-label="Mover a la izquierda">
            <PadButton padKey={DROP_BUTTONS[0]} className={CAR_BUTTON}>
              <ArrowLeft className="h-16 w-16" strokeWidth={3} aria-hidden="true" />
            </PadButton>
          </div>
          <div className={CAR_SIDE_RIGHT} aria-label="Mover a la derecha">
            <PadButton padKey={DROP_BUTTONS[1]} className={CAR_BUTTON}>
              <ArrowRight className="h-16 w-16" strokeWidth={3} aria-hidden="true" />
            </PadButton>
          </div>
        </>
      )}
      {gameId === 'snake' && (
        <div className={PLANE_SIDE} aria-label="Impulso del avión">
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
