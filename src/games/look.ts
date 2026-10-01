type Ctx = CanvasRenderingContext2D

const shift = (hex: string, delta: number) => {
  const num = parseInt(hex.replace('#', ''), 16)
  const clamp = (value: number) => Math.max(0, Math.min(255, value))
  const r = clamp((num >> 16) + delta)
  const g = clamp(((num >> 8) & 255) + delta)
  const b = clamp((num & 255) + delta)
  return `rgb(${r}, ${g}, ${b})`
}

const poly = (ctx: Ctx, points: [number, number][], fill: string) => {
  ctx.beginPath()
  ctx.moveTo(points[0][0], points[0][1])
  for (let i = 1; i < points.length; i += 1) ctx.lineTo(points[i][0], points[i][1])
  ctx.closePath()
  ctx.fillStyle = fill
  ctx.fill()
}

const STARS: [number, number][] = [
  [30, 24], [90, 70], [150, 36], [220, 88], [310, 28], [380, 64],
  [460, 22], [540, 80], [610, 34], [690, 58], [760, 18], [120, 120],
  [260, 140], [480, 110], [720, 130], [50, 180], [340, 160], [640, 170],
]

export type SceneMood = 'dusk' | 'arena' | 'garden' | 'night' | 'space'

export const drawScene = (ctx: Ctx, mood: SceneMood) => {
  const sky = ctx.createLinearGradient(0, 0, 0, 400)
  if (mood === 'garden') {
    sky.addColorStop(0, '#1d4e89')
    sky.addColorStop(0.55, '#f4a261')
    sky.addColorStop(1, '#2d6a4f')
  } else if (mood === 'night') {
    sky.addColorStop(0, '#140b2e')
    sky.addColorStop(1, '#243b6b')
  } else if (mood === 'space') {
    sky.addColorStop(0, '#070814')
    sky.addColorStop(0.6, '#1b1464')
    sky.addColorStop(1, '#3b0764')
  } else {
    sky.addColorStop(0, '#2a1760')
    sky.addColorStop(0.45, '#c2410c')
    sky.addColorStop(1, '#fb923c')
  }
  ctx.fillStyle = sky
  ctx.fillRect(0, 0, 800, 400)

  if (mood === 'night' || mood === 'space') {
    ctx.fillStyle = '#f8fafc'
    STARS.forEach(([x, y]) => {
      ctx.fillRect(x, y, 2, 2)
    })
  }

  if (mood === 'space') {
    poly(ctx, [[620, 70], [690, 40], [760, 78], [730, 130], [640, 120]], '#7c3aed')
    poly(ctx, [[640, 90], [720, 70], [750, 120], [660, 140]], '#c4b5fd')
  } else if (mood !== 'night') {
    ctx.beginPath()
    ctx.fillStyle = '#fdba74'
    ctx.arc(mood === 'garden' ? 640 : 560, 90, 36, 0, Math.PI * 2)
    ctx.fill()
  }

  if (mood === 'arena' || mood === 'dusk') {
    poly(ctx, [[0, 230], [120, 150], [220, 210], [0, 280]], '#4c1d95')
    poly(ctx, [[180, 240], [340, 150], [480, 230], [300, 270]], '#6d28d9')
    poly(ctx, [[520, 220], [680, 120], [800, 200], [800, 280], [560, 270]], '#312e81')
    poly(ctx, [[0, 280], [800, 250], [800, 350], [0, 350]], '#1e3a8a')
    poly(ctx, [[360, 268], [430, 268], [410, 310], [380, 310]], 'rgba(253, 186, 116, 0.55)')
    poly(ctx, [[0, 350], [800, 350], [800, 400], [0, 400]], '#14532d')
    poly(ctx, [[620, 150], [700, 150], [720, 230], [640, 250], [600, 210]], '#312e81')
  }

  if (mood === 'garden') {
    poly(ctx, [[0, 210], [140, 140], [260, 200], [0, 260]], '#14532d')
    poly(ctx, [[500, 200], [680, 120], [800, 190], [800, 260], [560, 250]], '#166534')
    poly(ctx, [[0, 300], [800, 280], [800, 400], [0, 400]], '#052e16')
  }
}

export const drawFighter = (
  ctx: Ctx,
  x: number,
  y: number,
  dir: number,
  color: string,
  attacking: boolean,
  scale = 1,
) => {
  ctx.save()
  ctx.translate(x + 25 * scale, y + 50 * scale)
  ctx.scale(dir * scale, scale)

  const skin = '#f3c7a1'
  const dark = shift(color, -48)
  const light = shift(color, 36)
  poly(ctx, [[-4, -18], [-20, -6], [-16, 2], [-2, -10]], dark)
  poly(ctx, [[-8, 0], [-4, -18], [2, -18], [4, 0]], dark)
  poly(ctx, [[0, 0], [4, -18], [12, -16], [8, 0]], shift(color, -24))
  poly(ctx, [[-8, -18], [10, -18], [12, -36], [-6, -36]], color)
  poly(ctx, [[-8, -18], [10, -18], [10, -22], [-8, -22]], '#1a1403')
  poly(ctx, [[2, -32], [8, -34], [18, -22], [12, -18]], light)

  const head: [number, number][] = []
  for (let i = 0; i < 8; i += 1) {
    const angle = Math.PI / 8 + i * (Math.PI / 4)
    head.push([2 + Math.cos(angle) * 8, -44 + Math.sin(angle) * 8])
  }
  poly(ctx, head, skin)
  poly(ctx, [[-6, -46], [-2, -56], [4, -50], [10, -56], [10, -44]], '#3b2414')
  poly(ctx, [[5, -45], [8, -45], [8, -42], [5, -42]], '#1a1403')

  if (attacking) {
    poly(ctx, [[14, -28], [42, -18], [42, -14], [14, -24]], '#e8eefc')
    poly(ctx, [[36, -22], [48, -16], [44, -12], [32, -18]], '#f5c518')
  }

  ctx.restore()
}

export const drawPaddle = (ctx: Ctx, x: number, y: number, color: string) => {
  const light = shift(color, 40)
  const dark = shift(color, -35)
  poly(ctx, [[x, y + 8], [x + 20, y], [x + 20, y + 92], [x, y + 100]], color)
  poly(ctx, [[x + 4, y + 14], [x + 10, y + 12], [x + 10, y + 88], [x + 4, y + 90]], light)
  poly(ctx, [[x + 12, y + 16], [x + 18, y + 12], [x + 18, y + 88], [x + 12, y + 90]], dark)
  const facing = x < 400 ? 1 : -1
  drawFighter(ctx, x - 16, y + 22, facing, color, false, 1.15)
}

export const drawBall = (ctx: Ctx, x: number, y: number) => {
  const points: [number, number][] = []
  for (let i = 0; i < 8; i += 1) {
    const angle = i * (Math.PI / 4)
    points.push([x + Math.cos(angle) * 10, y + Math.sin(angle) * 10])
  }
  poly(ctx, points, '#fff7ed')
  poly(ctx, [[x - 2, y - 6], [x + 2, y - 7], [x + 1, y - 2], [x - 3, y - 2]], '#fdba74')
}

export const drawSnake = (
  ctx: Ctx,
  body: { x: number; y: number }[],
  dx: number,
  dy: number,
  color: string,
  grid: number,
) => {
  body.forEach((segment, index) => {
    const cx = segment.x * grid + grid / 2
    const cy = segment.y * grid + grid / 2
    const radius = index === 0 ? grid * 0.46 : grid * 0.36
    const points: [number, number][] = []
    for (let i = 0; i < 6; i += 1) {
      const angle = Math.PI / 6 + i * (Math.PI / 3)
      points.push([cx + Math.cos(angle) * radius, cy + Math.sin(angle) * radius])
    }
    poly(ctx, points, index === 0 ? color : shift(color, index % 2 === 0 ? -20 : 15))
    if (index !== 0) return
    const eyeX = cx + dx * 4
    const eyeY = cy + dy * 4
    poly(ctx, [[eyeX - 2, eyeY - 2], [eyeX + 2, eyeY - 2], [eyeX + 2, eyeY + 2], [eyeX - 2, eyeY + 2]], '#0f172a')
  })
}

export const drawFood = (ctx: Ctx, x: number, y: number, grid: number) => {
  const cx = x * grid + grid / 2
  const cy = y * grid + grid / 2
  const points: [number, number][] = []
  for (let i = 0; i < 6; i += 1) {
    const angle = i * (Math.PI / 3)
    points.push([cx + Math.cos(angle) * 7, cy + Math.sin(angle) * 7])
  }
  poly(ctx, points, '#ef4444')
  poly(ctx, [[cx, cy - 8], [cx + 5, cy - 14], [cx + 2, cy - 6]], '#22c55e')
}

export const drawGem = (ctx: Ctx, x: number, y: number, size: number, color: string) => {
  const pad = 1
  const x0 = x + pad
  const y0 = y + pad
  const s = size - pad * 2
  poly(ctx, [[x0, y0], [x0 + s, y0], [x0 + s * 0.75, y0 + s * 0.25], [x0 + s * 0.25, y0 + s * 0.25]], shift(color, 55))
  poly(ctx, [[x0, y0], [x0 + s * 0.25, y0 + s * 0.25], [x0 + s * 0.25, y0 + s], [x0, y0 + s]], shift(color, -40))
  poly(ctx, [[x0 + s * 0.25, y0 + s * 0.25], [x0 + s, y0], [x0 + s, y0 + s], [x0 + s * 0.25, y0 + s]], color)
}
