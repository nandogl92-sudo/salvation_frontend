import { useEffect, useRef } from 'react';

const WIDTH = 960;
const HEIGHT = 540;
const GRID_W = 28;
const GRID_H = 16;
const CELL = 20;
const OX = 192;
const OY = 76;
const PIX = '"Press Start 2P", monospace';
const GEM_GOAL = 20;
const SHIELD_MS = 1000;
const SLOW_MS = 1500;
const GAP_MS = 5000;
const RARE_EVERY_MS = 12000;
const RARE_LIFE_MS = 8000;
const RESPAWN_MS = 3500;
const RECHARGE_MS = 110;
const INTRO_MS = 1600;
const OUTRO_MS = 1300;
const FIELD_W = GRID_W * CELL;
const FIELD_H = GRID_H * CELL;

type Ctx = CanvasRenderingContext2D;
type CellPos = { x: number; y: number };
type SnakeUnit = {
  body: CellPos[];
  prevBody: CellPos[];
  dx: number;
  dy: number;
  gems: number;
  boost: number;
  shield: number;
  bite: number;
  shieldUntil: number;
  slowUntil: number;
  lastMove: number;
  pendingGrow: number;
  wantsBoost: boolean;
  growPulse: number;
  turnPulse: number;
};

type WormPalette = {
  main: string;
  dark: string;
  light: string;
  glow: string;
};

const WORM_P1: WormPalette = { main: '#3ad46a', dark: '#14703a', light: '#b6ffd0', glow: 'rgba(80, 230, 130, 0.35)' };
const WORM_P2: WormPalette = { main: '#b46cff', dark: '#5a288e', light: '#eed8ff', glow: 'rgba(190, 130, 255, 0.35)' };

type Particle = { x: number; y: number; vx: number; vy: number; life: number; max: number; color: string; size: number };
type Floater = { x: number; y: number; text: string; life: number; color: string };

const TORCHES: [number, number][] = [
  [OX + 60, OY - 14], [OX + FIELD_W / 2 - 110, OY - 14], [OX + FIELD_W / 2 + 110, OY - 14], [OX + FIELD_W - 60, OY - 14],
];

const PILLARS: [number, number][] = [
  [6, 3], [6, 12], [13, 2], [13, 13], [20, 3], [20, 12],
];

const BUGS: CellPos[] = [
  { x: 3, y: 5 }, { x: 9, y: 8 }, { x: 16, y: 4 }, { x: 23, y: 10 }, { x: 11, y: 14 }, { x: 18, y: 7 },
];

const KEYS: CellPos[] = [
  { x: 8, y: 11 }, { x: 17, y: 3 },
];

const formatTime = (ms: number) => {
  const total = Math.floor(ms / 1000);
  const minutes = String(Math.floor(total / 60)).padStart(2, '0');
  const seconds = String(total % 60).padStart(2, '0');
  return `${minutes}:${seconds}`;
};

const sameCell = (a: CellPos, b: CellPos) => a.x === b.x && a.y === b.y;

const manhattan = (a: CellPos, b: CellPos) => Math.abs(a.x - b.x) + Math.abs(a.y - b.y);

const cellCenter = (pos: CellPos) => ({ x: OX + pos.x * CELL + CELL / 2, y: OY + pos.y * CELL + CELL / 2 });

/** Número pseudoaleatorio estable por casilla, para variar la textura del suelo sin parpadeos. */
const cellNoise = (x: number, y: number) => ((x * 73856093) ^ (y * 19349663)) % 100;

const drawPanel = (ctx: Ctx, x: number, y: number, w: number, h: number) => {
  const fill = ctx.createLinearGradient(0, y, 0, y + h);
  fill.addColorStop(0, '#1d1430');
  fill.addColorStop(1, '#120b1e');
  ctx.beginPath();
  ctx.roundRect(x, y, w, h, 8);
  ctx.fillStyle = fill;
  ctx.fill();
  ctx.strokeStyle = '#c9a24a';
  ctx.lineWidth = 2;
  ctx.stroke();
  ctx.beginPath();
  ctx.roundRect(x + 5, y + 5, w - 10, h - 10, 5);
  ctx.strokeStyle = 'rgba(201, 162, 74, 0.28)';
  ctx.lineWidth = 1;
  ctx.stroke();
  ctx.fillStyle = '#c9a24a';
  [[x + 6, y + 6], [x + w - 10, y + 6], [x + 6, y + h - 10], [x + w - 10, y + h - 10]].forEach(([cx, cy]) => {
    ctx.fillRect(cx, cy, 4, 4);
  });
};

const drawDiamond = (ctx: Ctx, cx: number, cy: number, r: number, color: string) => {
  ctx.fillStyle = color;
  ctx.beginPath();
  ctx.moveTo(cx, cy - r);
  ctx.lineTo(cx + r * 0.8, cy);
  ctx.lineTo(cx, cy + r);
  ctx.lineTo(cx - r * 0.8, cy);
  ctx.closePath();
  ctx.fill();
};

const drawSparkle = (ctx: Ctx, cx: number, cy: number, r: number, color: string) => {
  ctx.fillStyle = color;
  ctx.fillRect(cx - r, cy - 1, r * 2, 2);
  ctx.fillRect(cx - 1, cy - r, 2, r * 2);
};

const paintBrickWall = (ctx: Ctx, x: number, y: number, w: number, h: number, dark: boolean) => {
  ctx.fillStyle = dark ? '#2c2044' : '#3a2c54';
  ctx.fillRect(x, y, w, h);
  ctx.fillStyle = dark ? '#221834' : '#2e2346';
  for (let row = 0; row < h; row += 7) {
    const shift = (row / 7) % 2 === 0 ? 0 : 8;
    for (let col = -8; col < w; col += 16) {
      ctx.fillRect(x + col + shift, y + row, 14, 6);
    }
  }
};

/** Fondo fijo del templo: suelo, muros y adornos. Se pinta una vez en un canvas aparte. */
const paintTempleBackdrop = (ctx: Ctx) => {
  const sky = ctx.createLinearGradient(0, 0, 0, HEIGHT);
  sky.addColorStop(0, '#080414');
  sky.addColorStop(0.4, '#160a2c');
  sky.addColorStop(1, '#241038');
  ctx.fillStyle = sky;
  ctx.fillRect(0, 0, WIDTH, HEIGHT);

  ctx.fillStyle = '#f8fafc';
  [[48, 18], [140, 40], [820, 22], [900, 48], [760, 16], [70, 50], [300, 12], [620, 30], [440, 8], [510, 36], [210, 28], [580, 14], [860, 38]].forEach(([x, y]) => {
    ctx.fillRect(x, y, 2, 2);
  });
  ctx.fillStyle = '#d8e6f4';
  ctx.fillRect(86, 22, 18, 18);
  ctx.fillRect(80, 28, 30, 12);
  ctx.fillStyle = '#9bb4cc';
  ctx.fillRect(92, 28, 6, 6);

  ctx.fillStyle = '#12081c';
  ctx.fillRect(24, 86, 52, 90);
  ctx.fillRect(884, 86, 52, 90);
  ctx.fillStyle = '#2a1844';
  ctx.fillRect(32, 70, 36, 28);
  ctx.fillRect(892, 70, 36, 28);
  ctx.fillStyle = '#3ad46a';
  ctx.fillRect(44, 78, 12, 8);
  ctx.fillRect(904, 78, 12, 8);
  ctx.fillStyle = '#f0d48a';
  ctx.fillRect(38, 64, 24, 8);
  ctx.fillRect(898, 64, 24, 8);
  ctx.fillStyle = '#1a0e28';
  ctx.fillRect(40, 176, 20, 36);
  ctx.fillRect(900, 176, 20, 36);

  const wallX = OX - 18;
  const wallY = OY - 18;
  const wallW = FIELD_W + 36;
  const wallH = FIELD_H + 36;
  paintBrickWall(ctx, wallX, wallY, wallW, 18, true);
  paintBrickWall(ctx, wallX, wallY + wallH - 18, wallW, 18, true);
  paintBrickWall(ctx, wallX, wallY, 18, wallH, true);
  paintBrickWall(ctx, wallX + wallW - 18, wallY, 18, wallH, true);

  ctx.fillStyle = '#e6c56a';
  ctx.fillRect(wallX, wallY, wallW, 3);
  ctx.fillRect(wallX, wallY + wallH - 3, wallW, 3);
  ctx.fillRect(wallX, wallY, 3, wallH);
  ctx.fillRect(wallX + wallW - 3, wallY, 3, wallH);
  ctx.fillStyle = '#7a5a26';
  ctx.fillRect(OX - 4, OY - 4, FIELD_W + 8, 2);
  ctx.fillRect(OX - 4, OY + FIELD_H + 2, FIELD_W + 8, 2);
  ctx.fillRect(OX - 4, OY - 4, 2, FIELD_H + 8);
  ctx.fillRect(OX + FIELD_W + 2, OY - 4, 2, FIELD_H + 8);

  for (let y = 0; y < GRID_H; y += 1) {
    for (let x = 0; x < GRID_W; x += 1) {
      const px = OX + x * CELL;
      const py = OY + y * CELL;
      const noise = cellNoise(x, y);
      const center = x === 13 || x === 14;
      const midRow = y === 7 || y === 8;
      const base = center || midRow
        ? ((x + y) % 2 === 0 ? '#2a2450' : '#241e46')
        : ((x + y) % 2 === 0 ? '#262040' : '#1b1632');
      ctx.fillStyle = base;
      ctx.fillRect(px, py, CELL, CELL);
      ctx.fillStyle = 'rgba(255, 255, 255, 0.04)';
      ctx.fillRect(px + 1, py + 1, CELL - 3, 1);
      ctx.fillStyle = 'rgba(0, 0, 0, 0.22)';
      ctx.fillRect(px, py + CELL - 1, CELL, 1);
      ctx.fillRect(px + CELL - 1, py, 1, CELL);
      if (noise < 7) {
        ctx.fillStyle = 'rgba(70, 160, 110, 0.28)';
        ctx.fillRect(px + 4, py + 11, 8, 4);
        ctx.fillRect(px + 9, py + 7, 5, 4);
      } else if (noise < 12) {
        ctx.fillStyle = 'rgba(0, 0, 0, 0.3)';
        ctx.fillRect(px + 5, py + 4, 1, 9);
        ctx.fillRect(px + 6, py + 12, 7, 1);
      } else if (noise > 93) {
        ctx.fillStyle = 'rgba(230, 197, 106, 0.12)';
        ctx.fillRect(px + 7, py + 7, 6, 6);
      }
      if ((x === 0 || x === GRID_W - 1) && noise % 3 === 0) {
        ctx.fillStyle = 'rgba(58, 212, 106, 0.18)';
        ctx.fillRect(px + (x === 0 ? 1 : 14), py + 2, 4, 12);
      }
    }
  }

  ctx.fillStyle = 'rgba(230, 197, 106, 0.18)';
  ctx.fillRect(OX + 13 * CELL, OY, 2, FIELD_H);
  ctx.fillRect(OX, OY + 7 * CELL + 9, FIELD_W, 2);
  drawDiamond(ctx, OX + FIELD_W / 2, OY + FIELD_H / 2, 10, 'rgba(240, 212, 138, 0.16)');
  drawDiamond(ctx, OX + FIELD_W / 2, OY + FIELD_H / 2, 5, 'rgba(126, 224, 168, 0.12)');

  const vignette = ctx.createRadialGradient(OX + FIELD_W / 2, OY + FIELD_H / 2, FIELD_H * 0.35, OX + FIELD_W / 2, OY + FIELD_H / 2, FIELD_W * 0.72);
  vignette.addColorStop(0, 'rgba(0, 0, 0, 0)');
  vignette.addColorStop(1, 'rgba(0, 0, 0, 0.38)');
  ctx.fillStyle = vignette;
  ctx.fillRect(OX, OY, FIELD_W, FIELD_H);

  TORCHES.forEach(([x, y]) => {
    ctx.fillStyle = '#3a2810';
    ctx.fillRect(x - 3, y, 6, 12);
    ctx.fillStyle = '#8a6a2a';
    ctx.fillRect(x - 5, y - 3, 10, 4);
    ctx.fillStyle = '#e6c56a';
    ctx.fillRect(x - 4, y - 2, 8, 2);
  });

  [OX + 28, OX + 150, OX + FIELD_W - 40, OX + FIELD_W - 162].forEach((x, i) => {
    ctx.fillStyle = '#1d5a38';
    ctx.fillRect(x, wallY + 16, 3, 18 + i * 2);
    ctx.fillStyle = '#2e8a54';
    ctx.fillRect(x - 4, wallY + 28 + i * 2, 10, 4);
    ctx.fillRect(x + 2, wallY + 22, 6, 3);
  });
};

const drawTorchFlames = (ctx: Ctx, now: number) => {
  TORCHES.forEach(([x, y], index) => {
    const flicker = 0.75 + Math.sin(now / 90 + index * 1.7) * 0.15 + Math.sin(now / 37 + index) * 0.1;
    const glow = ctx.createRadialGradient(x, y, 2, x, y, 100 * flicker);
    glow.addColorStop(0, 'rgba(255, 170, 60, 0.28)');
    glow.addColorStop(1, 'rgba(255, 120, 20, 0)');
    ctx.fillStyle = glow;
    ctx.fillRect(x - 100, y - 30, 200, 140);
    const h = 9 + Math.round(Math.sin(now / 70 + index) * 3);
    ctx.fillStyle = '#ff6a18';
    ctx.fillRect(x - 4, y - 5 - h, 8, h + 2);
    ctx.fillStyle = '#ff9a2a';
    ctx.fillRect(x - 3, y - 6 - h, 6, h);
    ctx.fillStyle = '#ffe08a';
    ctx.fillRect(x - 1, y - 4 - h, 2, h - 2);
  });
};

const drawDust = (ctx: Ctx, now: number) => {
  for (let i = 0; i < 10; i += 1) {
    const x = OX + 24 + ((i * 97 + now / 40) % (FIELD_W - 48));
    const y = OY + 16 + ((i * 53 + now / 70) % (FIELD_H - 32));
    ctx.fillStyle = `rgba(255, 230, 180, ${0.08 + (i % 3) * 0.05})`;
    ctx.fillRect(Math.round(x), Math.round(y), 2, 2);
  }
};

const drawPillar = (ctx: Ctx, x: number, y: number, now: number) => {
  const px = OX + x * CELL;
  const py = OY + y * CELL;
  ctx.fillStyle = 'rgba(0, 0, 0, 0.4)';
  ctx.fillRect(px + 3, py + 16, 15, 4);
  ctx.fillStyle = '#5a4a72';
  ctx.fillRect(px + 5, py + 3, 10, 14);
  ctx.fillStyle = '#8c7aa8';
  ctx.fillRect(px + 6, py + 4, 3, 12);
  ctx.fillStyle = '#3c3054';
  ctx.fillRect(px + 12, py + 4, 2, 12);
  ctx.fillStyle = '#f0d48a';
  ctx.fillRect(px + 2, py + 1, 16, 4);
  ctx.fillRect(px + 2, py + 15, 16, 4);
  ctx.fillStyle = '#fff6d0';
  ctx.fillRect(px + 4, py + 2, 5, 2);
  const pulse = 0.5 + Math.sin(now / 300 + x + y) * 0.5;
  ctx.fillStyle = `rgba(126, 224, 255, ${0.45 + pulse * 0.55})`;
  ctx.fillRect(px + 9, py + 8, 2, 4);
};

const drawGap = (ctx: Ctx, x: number, y: number, now: number) => {
  const { x: cx, y: cy } = cellCenter({ x, y });
  const pulse = 0.5 + Math.sin(now / 160) * 0.5;
  ctx.strokeStyle = `rgba(240, 212, 138, ${0.5 + pulse * 0.5})`;
  ctx.lineWidth = 2;
  ctx.strokeRect(cx - 7, cy - 7, 14, 14);
  ctx.lineWidth = 1;
  drawDiamond(ctx, cx, cy, 4 + pulse * 2, `rgba(255, 230, 150, ${0.4 + pulse * 0.4})`);
};

const drawGem = (ctx: Ctx, x: number, y: number, color: string, now: number) => {
  const { x: cx, y: cy } = cellCenter({ x, y });
  const bob = Math.round(Math.sin(now / 220) * 2);
  const glow = ctx.createRadialGradient(cx, cy, 2, cx, cy, 18);
  glow.addColorStop(0, color);
  glow.addColorStop(1, 'rgba(0, 0, 0, 0)');
  ctx.globalAlpha = 0.45;
  ctx.fillStyle = glow;
  ctx.fillRect(cx - 18, cy - 18, 36, 36);
  ctx.globalAlpha = 1;
  ctx.fillStyle = 'rgba(0, 0, 0, 0.45)';
  ctx.fillRect(cx - 6, cy + 8, 12, 3);
  drawDiamond(ctx, cx, cy + bob, 10, '#0a0612');
  drawDiamond(ctx, cx, cy + bob, 8, color);
  drawDiamond(ctx, cx - 1, cy + bob - 2, 4, '#ffffff');
  ctx.fillStyle = color;
  ctx.fillRect(cx - 1, cy + bob + 1, 2, 5);
  ctx.fillStyle = 'rgba(255, 255, 255, 0.7)';
  ctx.fillRect(cx - 3, cy + bob - 3, 2, 2);
  const twinkle = (now / 380 + x) % 1;
  if (twinkle < 0.4) drawSparkle(ctx, cx + 8, cy + bob - 7, 3, 'rgba(255, 255, 255, 0.95)');
};

const drawRareGem = (ctx: Ctx, x: number, y: number, now: number, remaining: number) => {
  const { x: cx, y: cy } = cellCenter({ x, y });
  const pulse = 0.5 + Math.sin(now / 120) * 0.5;
  const urgent = remaining < 2500 && Math.floor(now / 150) % 2 === 0;
  const glow = ctx.createRadialGradient(cx, cy, 2, cx, cy, 24);
  glow.addColorStop(0, 'rgba(255, 110, 70, 0.6)');
  glow.addColorStop(1, 'rgba(255, 90, 60, 0)');
  ctx.fillStyle = glow;
  ctx.fillRect(cx - 24, cy - 24, 48, 48);
  ctx.fillStyle = urgent ? '#fff0c0' : '#ffd76a';
  ctx.fillRect(cx - 9, cy - 9, 18, 18);
  ctx.fillStyle = '#3a1860';
  ctx.fillRect(cx - 7, cy - 7, 14, 14);
  drawDiamond(ctx, cx, cy, 7 + pulse, '#ff5a3c');
  drawDiamond(ctx, cx - 1, cy - 2, 3, '#fff6d0');
  for (let i = 0; i < 4; i += 1) {
    const angle = now / 420 + (i * Math.PI * 2) / 4;
    drawSparkle(ctx, cx + Math.cos(angle) * 13, cy + Math.sin(angle) * 13, 2, 'rgba(255, 220, 160, 0.95)');
  }
};

const drawBug = (ctx: Ctx, x: number, y: number, now: number) => {
  const px = OX + x * CELL + 3;
  const py = OY + y * CELL + 5;
  const wiggle = Math.floor(now / 120 + x) % 2;
  ctx.fillStyle = 'rgba(0, 0, 0, 0.4)';
  ctx.fillRect(px + 2, py + 12, 12, 3);
  ctx.fillStyle = '#4a1408';
  ctx.fillRect(px - 2 + wiggle, py + 4, 4, 2);
  ctx.fillRect(px + 13 - wiggle, py + 4, 4, 2);
  ctx.fillRect(px - 2 + (1 - wiggle), py + 8, 4, 2);
  ctx.fillRect(px + 13 - (1 - wiggle), py + 8, 4, 2);
  ctx.fillStyle = '#7a2e10';
  ctx.fillRect(px + 3, py - 3 + wiggle, 2, 5);
  ctx.fillRect(px + 11, py - 3 + (1 - wiggle), 2, 5);
  ctx.fillStyle = '#ff8a3d';
  ctx.fillRect(px + 2, py + 2, 12, 9);
  ctx.fillStyle = '#ffd08a';
  ctx.fillRect(px + 3, py + 3, 5, 3);
  ctx.fillStyle = '#c85a1c';
  ctx.fillRect(px + 7, py + 2, 2, 9);
  ctx.fillStyle = '#2a0c04';
  ctx.fillRect(px + 4, py + 6, 2, 2);
  ctx.fillRect(px + 10, py + 6, 2, 2);
  ctx.fillStyle = '#ffe08a';
  ctx.fillRect(px + 5, py + 6, 1, 1);
  ctx.fillRect(px + 11, py + 6, 1, 1);
};

const drawKey = (ctx: Ctx, x: number, y: number, now: number) => {
  const px = OX + x * CELL + 3;
  const py = OY + y * CELL + 4;
  const bob = Math.round(Math.sin(now / 260 + y) * 1);
  ctx.fillStyle = 'rgba(255, 210, 90, 0.2)';
  ctx.fillRect(px - 2, py - 2 + bob, 20, 18);
  ctx.fillStyle = 'rgba(0, 0, 0, 0.45)';
  ctx.fillRect(px + 1, py + 13, 14, 3);
  ctx.fillStyle = '#c9a24a';
  ctx.fillRect(px + 1, py + 1 + bob, 9, 9);
  ctx.fillStyle = '#ffe08a';
  ctx.fillRect(px + 2, py + 2 + bob, 7, 7);
  ctx.fillStyle = '#fff6d0';
  ctx.fillRect(px + 3, py + 3 + bob, 3, 2);
  ctx.fillStyle = '#3a1860';
  ctx.fillRect(px + 4, py + 4 + bob, 3, 3);
  ctx.fillStyle = '#ffe08a';
  ctx.fillRect(px + 8, py + 4 + bob, 8, 3);
  ctx.fillRect(px + 12, py + 7 + bob, 2, 4);
  ctx.fillRect(px + 15, py + 7 + bob, 2, 5);
  const shine = (now / 900 + x) % 1;
  if (shine < 0.28) {
    ctx.fillStyle = 'rgba(255, 255, 255, 0.95)';
    ctx.fillRect(px + 2 + shine * 36, py + 2 + bob, 2, 2);
  }
};

/** Posiciones intermedias entre la casilla anterior y la actual, para que el gusano se deslice. */
const smoothBody = (snake: SnakeUnit, now: number, interval: number) => {
  const t = Math.min(1, Math.max(0, (now - snake.lastMove) / interval));
  const eased = t * t * (3 - 2 * t);
  return snake.body.map((segment, index) => {
    const from = snake.prevBody[index] ?? segment;
    if (Math.abs(from.x - segment.x) > 1 || Math.abs(from.y - segment.y) > 1) return cellCenter(segment);
    const pos = cellCenter(segment);
    const start = cellCenter(from);
    return { x: start.x + (pos.x - start.x) * eased, y: start.y + (pos.y - start.y) * eased };
  });
};

const paintDisk = (ctx: Ctx, cx: number, cy: number, radius: number, color: string) => {
  ctx.fillStyle = color;
  for (let y = -radius; y <= radius; y += 1) {
    const span = Math.floor(Math.sqrt(radius * radius - y * y));
    ctx.fillRect(cx - span, cy + y, span * 2 + 1, 1);
  }
};

const drawWormHead = (
  ctx: Ctx,
  cx: number,
  cy: number,
  dx: number,
  dy: number,
  palette: WormPalette,
  now: number,
  biting: boolean,
  turning: boolean,
) => {
  const hx = Math.round(cx);
  const hy = Math.round(cy);
  const px = -dy;
  const py = dx;
  const lean = turning ? 1 : 0;
  paintDisk(ctx, hx - dx * 3, hy - dy * 3, 13, '#0a0710');
  paintDisk(ctx, hx - dx * 3, hy - dy * 3, 11, palette.dark);
  [1, -1].forEach((side) => {
    paintDisk(ctx, hx + px * (9 + lean) * side - dx * 4, hy + py * (9 + lean) * side - dy * 4, 7, palette.dark);
    paintDisk(ctx, hx + px * (9 + lean) * side - dx * 4, hy + py * (9 + lean) * side - dy * 4, 5, palette.main);
    ctx.fillStyle = palette.light;
    ctx.fillRect(hx + px * 11 * side - 1, hy + py * 11 * side - 1, 2, 2);
    ctx.fillStyle = '#f0d48a';
    ctx.fillRect(hx + px * 12 * side - dx * 2, hy + py * 12 * side - dy * 2, 2, 2);
  });
  paintDisk(ctx, hx, hy, 8, palette.dark);
  paintDisk(ctx, hx, hy, 7, palette.main);
  paintDisk(ctx, hx + dx * 3, hy + dy * 3, 5, palette.main);
  paintDisk(ctx, hx - dx * 2 - px, hy - dy * 2 - py, 3, palette.light);
  ctx.fillStyle = '#f0d48a';
  ctx.fillRect(hx - px * 2 - 1, hy - py * 2 - dy * 9, dx === 0 ? 6 : 3, dy === 0 ? 6 : 3);
  ctx.fillRect(hx - 1 - dx, hy - 1 - dy * 10, 3, 3);
  ctx.fillStyle = palette.light;
  ctx.fillRect(hx + dx * 5 - 1, hy + dy * 5 - 1, 3, 3);

  const blink = Math.floor(now / 140) % 22 === 0;
  const tongueOut = Math.floor(now / 150) % 5 !== 1;
  if (tongueOut || biting) {
    const reach = biting ? 8 : 5;
    ctx.fillStyle = '#ff4a5a';
    ctx.fillRect(hx + dx * 8, hy + dy * 8, Math.max(2, Math.abs(dx) * reach), Math.max(2, Math.abs(dy) * reach));
    ctx.fillRect(hx + dx * (8 + reach) + px * 2, hy + dy * (8 + reach) + py * 2, 3, 2);
    ctx.fillRect(hx + dx * (8 + reach) - px * 2, hy + dy * (8 + reach) - py * 2, 3, 2);
  }
  if (biting) {
    ctx.fillStyle = '#f4efe6';
    ctx.fillRect(hx + dx * 7 + px * 3, hy + dy * 7 + py * 3, 2, 4);
    ctx.fillRect(hx + dx * 7 - px * 3, hy + dy * 7 - py * 3, 2, 4);
  }

  [1, -1].forEach((side) => {
    const ex = hx + dx * 2 + px * 4 * side;
    const ey = hy + dy * 2 + py * 4 * side;
    if (blink) {
      ctx.fillStyle = palette.dark;
      ctx.fillRect(ex - 2, ey, 5, 2);
      return;
    }
    ctx.fillStyle = '#ffffff';
    ctx.fillRect(ex - 2, ey - 2, 6, 6);
    ctx.fillStyle = '#111111';
    ctx.fillRect(ex + dx, ey + dy, 3, 3);
    ctx.fillStyle = '#7ad0ff';
    ctx.fillRect(ex + 1 + dx, ey + 1 + dy, 2, 2);
    if (biting) {
      ctx.fillStyle = palette.dark;
      ctx.fillRect(ex - 2, ey - 4 - dy, 6, 2);
    }
  });
};

const drawWorm = (
  ctx: Ctx,
  snake: SnakeUnit,
  palette: WormPalette,
  now: number,
  interval: number,
  biting: boolean,
  fading: number,
) => {
  const points = smoothBody(snake, now, interval);
  const count = points.length;
  const growAge = now - snake.growPulse;
  const popping = growAge < 380;
  const turning = now - snake.turnPulse < 180;
  const widthAt = (index: number) => {
    const fromTail = count - 1 - index;
    const taper = Math.min(1, fromTail / 5);
    const wave = popping ? 1 + Math.max(0, 1 - Math.abs(index - growAge / 28) / 3) * 0.28 : 1;
    const turn = turning && index < 3 ? 1.12 : 1;
    return (8 + taper * 9) * wave * turn;
  };

  ctx.save();
  if (fading < 1) ctx.globalAlpha = fading;

  if (snake.wantsBoost && snake.boost > 8) {
    ctx.fillStyle = palette.glow;
    points.forEach((point, index) => {
      paintDisk(ctx, Math.round(point.x), Math.round(point.y), Math.round(widthAt(index) / 2) + 4, palette.glow);
    });
  }

  points.forEach((point, index) => {
    const hx = Math.round(point.x);
    const hy = Math.round(point.y);
    const r = Math.max(3, Math.round(widthAt(index) / 2));
    paintDisk(ctx, hx + 2, hy + 4, r, 'rgba(0, 0, 0, 0.32)');
    if (index === 0) return;
    const ring = index % 2 === 1;
    paintDisk(ctx, hx, hy, r + 1, '#0a0710');
    paintDisk(ctx, hx, hy, r, ring ? palette.dark : palette.main);
    ctx.fillStyle = 'rgba(255, 255, 255, 0.28)';
    ctx.fillRect(hx - 3, hy - r + 2, Math.max(2, r - 2), 2);
    if (ring) {
      ctx.fillStyle = palette.light;
      ctx.fillRect(hx - 1, hy - 1, 3, 3);
    }
    if (index % 3 === 0) {
      ctx.fillStyle = '#f0d48a';
      ctx.fillRect(hx - 1, hy - r + 1, 2, 2);
    }
  });

  const tail = points[count - 1];
  const before = points[count - 2] ?? tail;
  const tx = Math.round(tail.x);
  const ty = Math.round(tail.y);
  const tdx = Math.sign(tail.x - before.x) || snake.dx;
  const tdy = Math.sign(tail.y - before.y) || snake.dy;
  ctx.fillStyle = palette.dark;
  ctx.fillRect(tx + tdx * 6 - 1, ty + tdy * 6 - 1, 4, 4);
  ctx.fillStyle = palette.light;
  ctx.fillRect(tx + tdx * 8, ty + tdy * 8, 2, 2);

  const head = points[0];
  drawWormHead(ctx, head.x, head.y, snake.dx, snake.dy, palette, now, biting, turning);

  if (snake.shieldUntil > now) {
    const pulse = 0.6 + Math.sin(now / 80) * 0.3;
    ctx.fillStyle = `rgba(126, 224, 255, ${0.16 * pulse})`;
    paintDisk(ctx, Math.round(head.x), Math.round(head.y), 16, `rgba(126, 224, 255, ${0.16 * pulse})`);
    ctx.strokeStyle = `rgba(126, 224, 255, ${pulse})`;
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.arc(head.x, head.y, 15, 0, Math.PI * 2);
    ctx.stroke();
    ctx.lineWidth = 1;
  }
  if (snake.slowUntil > now) {
    ctx.save();
    ctx.setLineDash([3, 3]);
    ctx.lineDashOffset = -now / 40;
    ctx.strokeStyle = '#ff8a3d';
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.arc(head.x, head.y, 14, 0, Math.PI * 2);
    ctx.stroke();
    ctx.restore();
  }
  ctx.restore();
};

const drawMeter = (ctx: Ctx, x: number, y: number, w: number, h: number, value: number, color: string) => {
  const clamped = Math.max(0, Math.min(100, value));
  ctx.beginPath();
  ctx.roundRect(x, y, w, h, h / 2);
  ctx.fillStyle = '#0c0814';
  ctx.fill();
  const filled = Math.round((clamped / 100) * (w - 4));
  if (filled > 0) {
    ctx.beginPath();
    ctx.roundRect(x + 2, y + 2, filled, h - 4, (h - 4) / 2);
    ctx.fillStyle = color;
    ctx.fill();
    ctx.fillStyle = 'rgba(255, 255, 255, 0.3)';
    ctx.fillRect(x + 5, y + 3, Math.max(0, filled - 6), 2);
  }
  ctx.strokeStyle = '#5c4318';
  ctx.beginPath();
  ctx.roundRect(x, y, w, h, h / 2);
  ctx.stroke();
};

const abilityLabel = (value: number) => (value >= 100 ? 'LISTA' : `${Math.round(value)}%`);

const drawPips = (ctx: Ctx, x: number, y: number, count: number, on: string) => {
  const step = 15;
  for (let i = 0; i < GEM_GOAL; i += 1) {
    const col = i % 10;
    const row = Math.floor(i / 10);
    const cx = x + col * step + 6;
    const cy = y + row * step + 6;
    drawDiamond(ctx, cx, cy, 6, i < count ? '#0d0a14' : '#1d1830');
    drawDiamond(ctx, cx, cy, 4.5, i < count ? on : '#2a2244');
    if (i < count) {
      ctx.fillStyle = 'rgba(255, 255, 255, 0.8)';
      ctx.fillRect(cx - 1, cy - 2, 1.5, 1.5);
    }
  }
};

const drawHud = (
  ctx: Ctx,
  p1: SnakeUnit,
  p2: SnakeUnit,
  hi: number,
  elapsed: number,
  now: number,
) => {
  const level = 1 + Math.floor(p1.gems / 4);
  ctx.textAlign = 'center';
  ctx.textBaseline = 'alphabetic';
  drawPanel(ctx, 10, 6, WIDTH - 20, 62);
  ctx.fillStyle = '#f0d48a';
  ctx.font = `13px ${PIX}`;
  ctx.fillText('WORM CLASH', WIDTH / 2, 26);
  ctx.font = `7px ${PIX}`;
  ctx.fillStyle = '#9aa6b8';
  ctx.fillText('TEMPLO NAGA', WIDTH / 2 - 150, 28);
  ctx.fillText(`MAX ${String(hi).padStart(4, '0')}`, WIDTH / 2 + 150, 28);
  ctx.font = `8px ${PIX}`;
  ctx.fillStyle = '#7ee0a8';
  ctx.fillText('TU', 90, 46);
  ctx.font = `14px ${PIX}`;
  ctx.fillText(`${p1.gems}/${GEM_GOAL}`, 168, 50);
  ctx.font = `7px ${PIX}`;
  ctx.fillText(`TAM ${p1.body.length}`, 248, 48);
  ctx.fillStyle = '#f4efe6';
  ctx.font = `8px ${PIX}`;
  ctx.fillText('TIEMPO', WIDTH / 2, 44);
  ctx.font = `12px ${PIX}`;
  ctx.fillText(formatTime(elapsed), WIDTH / 2, 60);
  ctx.fillStyle = '#d7b4ff';
  ctx.font = `8px ${PIX}`;
  ctx.fillText('RIVAL', WIDTH - 90, 46);
  ctx.font = `14px ${PIX}`;
  ctx.fillText(`${p2.gems}/${GEM_GOAL}`, WIDTH - 168, 50);
  ctx.font = `7px ${PIX}`;
  ctx.fillText(`TAM ${p2.body.length}`, WIDTH - 248, 48);

  drawPanel(ctx, 10, OY, 170, FIELD_H);
  const left = 95;
  ctx.fillStyle = '#0d0a14';
  ctx.beginPath();
  ctx.roundRect(left - 32, OY + 14, 64, 64, 6);
  ctx.fill();
  ctx.strokeStyle = '#c9a24a';
  ctx.stroke();
  ctx.save();
  ctx.translate(left, OY + 46);
  ctx.scale(2, 2);
  drawWormHead(ctx, 0, 0, 1, 0, WORM_P1, now, false, false);
  ctx.restore();
  ctx.fillStyle = '#7ee0a8';
  ctx.font = `8px ${PIX}`;
  ctx.fillText('NAGA', left, OY + 96);
  ctx.fillStyle = '#f4efe6';
  ctx.fillText('NIVEL', left, OY + 114);
  ctx.font = `20px ${PIX}`;
  ctx.fillText(String(level), left, OY + 140);
  ctx.font = `8px ${PIX}`;
  ctx.fillStyle = '#9aa6b8';
  ctx.fillText(`LARGO ${p1.body.length}`, left, OY + 158);
  ctx.font = `8px ${PIX}`;
  ctx.fillStyle = '#7ee0a8';
  ctx.fillText('ACELERON', left, OY + 180);
  drawMeter(ctx, 24, OY + 190, 142, 14, p1.boost, '#3dce4a');
  ctx.fillStyle = '#f4efe6';
  ctx.fillText(`${Math.round(p1.boost)}%`, left, OY + 222);
  ctx.fillStyle = '#d7b4ff';
  ctx.fillText('RIVAL', left, OY + 248);
  drawMeter(ctx, 24, OY + 258, 142, 12, p2.boost, '#b07adf');
  ctx.font = `8px ${PIX}`;
  ctx.fillStyle = '#f4efe6';
  ctx.fillText(`K ${abilityLabel(p2.shield)}`, left, OY + 292);
  ctx.fillText(`L ${abilityLabel(p2.bite)}`, left, OY + 312);

  drawPanel(ctx, 768, OY, 182, FIELD_H);
  const right = 859;
  ctx.fillStyle = '#f0d48a';
  ctx.font = `8px ${PIX}`;
  ctx.fillText('HABILIDADES', right, OY + 22);
  ctx.fillStyle = p1.shieldUntil > now ? '#7ee0ff' : '#f4efe6';
  ctx.fillText('ESCUDO', right, OY + 48);
  ctx.fillStyle = '#7ee0ff';
  ctx.fillText(`Q  ${abilityLabel(p1.shield)}`, right, OY + 66);
  drawMeter(ctx, 786, OY + 74, 146, 14, p1.shield, p1.shield >= 100 ? '#7ee0ff' : '#3a6a88');
  ctx.fillStyle = '#ffb089';
  ctx.fillText('MORDISCO', right, OY + 108);
  ctx.fillStyle = '#f4efe6';
  ctx.fillText(`E  ${abilityLabel(p1.bite)}`, right, OY + 126);
  drawMeter(ctx, 786, OY + 134, 146, 14, p1.bite, p1.bite >= 100 ? '#e85a3a' : '#6a3030');
  ctx.fillStyle = '#f0d48a';
  ctx.fillText(`META ${GEM_GOAL}`, right, OY + 168);
  drawPips(ctx, 781, OY + 180, p1.gems, '#7ee0a8');
  ctx.fillStyle = '#d7b4ff';
  ctx.fillText('RIVAL', right, OY + 232);
  drawPips(ctx, 781, OY + 242, p2.gems, '#d7b4ff');
  ctx.fillStyle = '#ffb089';
  ctx.font = `8px ${PIX}`;
  ctx.fillText('ROJA ROBA', right, OY + 300);

  drawPanel(ctx, 10, 408, WIDTH - 20, 122);
  ctx.fillStyle = '#f4efe6';
  ctx.font = `8px ${PIX}`;
  ctx.fillText('P1    WASD MOVER     SHIFT ACELERA     Q ESCUDO     E MORDISCO', WIDTH / 2, 444);
  ctx.fillText('P2    FLECHAS        M ACELERA         K ESCUDO     L MORDISCO', WIDTH / 2, 472);
  ctx.fillStyle = '#f0d48a';
  ctx.fillText('BICHO FRENA      LLAVE ABRE UN HUECO      GEMA ROJA ROBA', WIDTH / 2, 504);
  ctx.textAlign = 'left';
};

const drawNote = (ctx: Ctx, label: string, remaining: number) => {
  const alpha = Math.min(1, remaining / 250);
  const scale = 1 + Math.max(0, (remaining - 650) / 150) * 0.25;
  ctx.save();
  ctx.globalAlpha = alpha;
  ctx.translate(OX + FIELD_W / 2, OY + 20);
  ctx.scale(scale, scale);
  ctx.font = `12px ${PIX}`;
  ctx.textAlign = 'center';
  const plateW = label.length * 12 + 28;
  ctx.fillStyle = '#160f24';
  ctx.beginPath();
  ctx.roundRect(-plateW / 2, -12, plateW, 24, 6);
  ctx.fill();
  ctx.strokeStyle = '#f0d48a';
  ctx.stroke();
  ctx.fillStyle = '#ffd76a';
  ctx.fillText(label, 0, 5);
  ctx.restore();
};

const drawIntro = (ctx: Ctx, elapsed: number) => {
  const alpha = elapsed < INTRO_MS - 400 ? 1 : Math.max(0, (INTRO_MS - elapsed) / 400);
  const rise = Math.min(1, elapsed / 300);
  ctx.save();
  ctx.globalAlpha = alpha;
  ctx.fillStyle = 'rgba(8, 4, 16, 0.7)';
  ctx.fillRect(OX, OY, FIELD_W, FIELD_H);
  ctx.textAlign = 'center';
  ctx.fillStyle = '#f0d48a';
  ctx.font = `26px ${PIX}`;
  ctx.fillText('WORM CLASH', OX + FIELD_W / 2, OY + FIELD_H / 2 - 28 + (1 - rise) * 20);
  ctx.save();
  ctx.translate(OX + FIELD_W / 2 - 70, OY + FIELD_H / 2 + 8);
  drawWormHead(ctx, 0, 0, 1, 0, WORM_P1, elapsed, false, false);
  ctx.restore();
  ctx.save();
  ctx.translate(OX + FIELD_W / 2 + 70, OY + FIELD_H / 2 + 8);
  drawWormHead(ctx, 0, 0, -1, 0, WORM_P2, elapsed, false, false);
  ctx.restore();
  ctx.fillStyle = '#f4efe6';
  ctx.font = `10px ${PIX}`;
  ctx.fillText(`PRIMERO EN ${GEM_GOAL} GEMAS`, OX + FIELD_W / 2, OY + FIELD_H / 2 + 44);
  ctx.fillStyle = '#9aa6b8';
  ctx.font = `8px ${PIX}`;
  ctx.fillText('COME, CRECE, NO CHOQUES', OX + FIELD_W / 2, OY + FIELD_H / 2 + 66);
  ctx.restore();
};

const drawOutro = (ctx: Ctx, winner: 'p1' | 'p2', elapsed: number, p1Gems: number, p2Gems: number) => {
  const alpha = Math.min(1, elapsed / 250);
  const scale = 1 + Math.max(0, 1 - elapsed / 250) * 0.6;
  const won = winner === 'p1';
  ctx.save();
  ctx.globalAlpha = alpha;
  ctx.fillStyle = 'rgba(8, 4, 16, 0.72)';
  ctx.fillRect(OX, OY, FIELD_W, FIELD_H);
  ctx.translate(OX + FIELD_W / 2, OY + FIELD_H / 2);
  ctx.scale(scale, scale);
  ctx.textAlign = 'center';
  ctx.fillStyle = won ? '#8af2b0' : '#dcbcff';
  ctx.font = `24px ${PIX}`;
  ctx.fillText(won ? 'VICTORIA' : 'GANA EL RIVAL', 0, -18);
  ctx.fillStyle = '#f0d48a';
  ctx.font = `10px ${PIX}`;
  ctx.fillText(won ? 'EL TEMPLO ES TUYO' : 'LA PROXIMA CAE', 0, 12);
  ctx.fillStyle = '#f4efe6';
  ctx.font = `8px ${PIX}`;
  ctx.fillText(`${p1Gems}  -  ${p2Gems}`, 0, 36);
  ctx.restore();
};

const spawnBurst = (list: Particle[], x: number, y: number, count: number, color: string, speed: number) => {
  for (let i = 0; i < count; i += 1) {
    const angle = Math.random() * Math.PI * 2;
    const v = speed * (0.4 + Math.random() * 0.8);
    const max = 320 + Math.random() * 240;
    list.push({ x, y, vx: Math.cos(angle) * v, vy: Math.sin(angle) * v, life: max, max, color, size: 2 + Math.round(Math.random() * 2) });
  }
};

const intervalFor = (snake: SnakeUnit, now: number) => {
  const level = Math.floor(snake.gems / 4);
  let interval = Math.max(48, 120 - level * 18);
  if (snake.wantsBoost && snake.boost > 8) interval = Math.max(36, Math.round(interval * 0.5));
  if (snake.slowUntil > now) interval = Math.round(interval * 1.8);
  return interval;
};

export default function Snake({
  onGameEnd,
  botEnabled = false,
}: {
  onGameEnd: (winner: 'p1' | 'p2') => void;
  botEnabled?: boolean;
}) {
  const canvasRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    void document.fonts.load(`16px ${PIX}`);

    const backdrop = document.createElement('canvas');
    backdrop.width = WIDTH;
    backdrop.height = HEIGHT;
    const backdropCtx = backdrop.getContext('2d');
    if (backdropCtx) paintTempleBackdrop(backdropCtx);

    let animationFrameId = 0;
    let ended = false;
    const startedAt = performance.now();
    const makeSnake = (body: CellPos[], dx: number): SnakeUnit => ({
      body,
      prevBody: body.map((cell) => ({ ...cell })),
      dx,
      dy: 0,
      gems: 0,
      boost: 100,
      shield: 100,
      bite: 100,
      shieldUntil: 0,
      slowUntil: 0,
      lastMove: startedAt,
      pendingGrow: 0,
      wantsBoost: false,
      growPulse: 0,
      turnPulse: 0,
    });

    const state = {
      p1: makeSnake([{ x: 4, y: 4 }, { x: 3, y: 4 }, { x: 2, y: 4 }], 1),
      p2: makeSnake([{ x: 23, y: 12 }, { x: 24, y: 12 }, { x: 25, y: 12 }], -1),
      food: { x: 14, y: 8 },
      rare: null as CellPos | null,
      rareUntil: 0,
      nextRareAt: startedAt + RARE_EVERY_MS,
      pillars: PILLARS.map((pillar) => [pillar[0], pillar[1]] as [number, number]),
      hidden: null as { x: number; y: number; backAt: number } | null,
      bugs: BUGS.map((bug) => ({ ...bug })),
      keys: KEYS.map((key) => ({ ...key })),
      bugRespawns: [] as number[],
      keyRespawns: [] as number[],
      hi: 0,
      lastRecharge: startedAt,
      note: '',
      noteUntil: 0,
      particles: [] as Particle[],
      floaters: [] as Floater[],
      biteFlash: { p1: 0, p2: 0 },
      outro: null as { winner: 'p1' | 'p2'; at: number } | null,
      lastFrame: startedAt,
      shake: 0,
      eatFlash: 0,
    };

    const pillarAt = (x: number, y: number) => state.pillars.some(([px, py]) => px === x && py === y);

    const occupied = (x: number, y: number) => {
      if (pillarAt(x, y)) return true;
      if (state.food.x === x && state.food.y === y) return true;
      if (state.rare && state.rare.x === x && state.rare.y === y) return true;
      if (state.bugs.some((bug) => bug.x === x && bug.y === y)) return true;
      if (state.keys.some((key) => key.x === x && key.y === y)) return true;
      return [...state.p1.body, ...state.p2.body].some((segment) => segment.x === x && segment.y === y);
    };

    const findFree = (preferCenter: boolean) => {
      for (let attempt = 0; attempt < 50; attempt += 1) {
        const x = preferCenter
          ? 10 + Math.floor(Math.random() * 8)
          : Math.floor(Math.random() * GRID_W);
        const y = preferCenter
          ? 5 + Math.floor(Math.random() * 6)
          : Math.floor(Math.random() * GRID_H);
        if (occupied(x, y)) continue;
        return { x, y };
      }
      return null;
    };

    const placeFood = () => {
      const cell = findFree(false);
      if (cell) state.food = cell;
    };

    const finish = (winner: 'p1' | 'p2', now: number) => {
      if (state.outro) return;
      state.outro = { winner, at: now };
      const loser = winner === 'p1' ? state.p2 : state.p1;
      const loserPalette = winner === 'p1' ? WORM_P2 : WORM_P1;
      loser.body.forEach((segment) => {
        const { x, y } = cellCenter(segment);
        spawnBurst(state.particles, x, y, 3, loserPalette.light, 0.08);
      });
      const winnerHead = cellCenter(state[winner].body[0]);
      spawnBurst(state.particles, winnerHead.x, winnerHead.y, 24, '#ffd76a', 0.14);
      state.shake = 14;
    };

    const useShield = (snake: SnakeUnit, now: number) => {
      if (snake.shield < 100) return;
      snake.shield = 0;
      snake.shieldUntil = now + SHIELD_MS;
      const head = cellCenter(snake.body[0]);
      spawnBurst(state.particles, head.x, head.y, 10, '#7ee0ff', 0.1);
    };

    const useBite = (attacker: SnakeUnit, victim: SnakeUnit, now: number, attackerId: 'p1' | 'p2') => {
      if (attacker.bite < 100) return;
      const canSteal = victim.gems > 0;
      const cut = Math.min(3, Math.max(0, victim.body.length - 3));
      if (!canSteal && cut === 0) return;
      attacker.bite = 0;
      if (canSteal) {
        victim.gems -= 1;
        attacker.gems += 1;
      }
      if (cut > 0) {
        victim.body.slice(victim.body.length - cut).forEach((segment) => {
          const { x, y } = cellCenter(segment);
          spawnBurst(state.particles, x, y, 5, '#ff5a3c', 0.1);
        });
        victim.body.splice(victim.body.length - cut, cut);
      }
      state.biteFlash[attackerId] = now + 500;
      state.note = 'MORDISCO';
      state.noteUntil = now + 800;
    };

    const openGap = (from: CellPos, now: number) => {
      if (state.hidden) {
        state.pillars.push([state.hidden.x, state.hidden.y]);
        state.hidden = null;
      }
      if (state.pillars.length === 0) return;
      let best = 0;
      let bestDist = Infinity;
      state.pillars.forEach((pillar, index) => {
        const dist = Math.abs(pillar[0] - from.x) + Math.abs(pillar[1] - from.y);
        if (dist >= bestDist) return;
        bestDist = dist;
        best = index;
      });
      const removed = state.pillars.splice(best, 1)[0];
      state.hidden = { x: removed[0], y: removed[1], backAt: now + GAP_MS };
      const gapCenter = cellCenter({ x: removed[0], y: removed[1] });
      spawnBurst(state.particles, gapCenter.x, gapCenter.y, 12, '#f0d48a', 0.1);
      state.note = 'HUECO';
      state.noteUntil = now + 800;
    };

    const letter = (event: KeyboardEvent) => (
      event.key.length === 1 ? event.key.toLowerCase() : event.key
    );

    const handleKeyDown = (event: KeyboardEvent) => {
      const key = letter(event);
      const now = performance.now();
      if (event.key.startsWith('Arrow') || event.key === ' ') event.preventDefault();
      if (key === 'w' && state.p1.dy === 0) { state.p1.dx = 0; state.p1.dy = -1; state.p1.turnPulse = now; }
      if (key === 's' && state.p1.dy === 0) { state.p1.dx = 0; state.p1.dy = 1; state.p1.turnPulse = now; }
      if (key === 'a' && state.p1.dx === 0) { state.p1.dx = -1; state.p1.dy = 0; state.p1.turnPulse = now; }
      if (key === 'd' && state.p1.dx === 0) { state.p1.dx = 1; state.p1.dy = 0; state.p1.turnPulse = now; }
      if (key === 'q') useShield(state.p1, now);
      if (key === 'e') useBite(state.p1, state.p2, now, 'p1');
      if (key === 'Shift') state.p1.wantsBoost = true;
      if (!botEnabled) {
        if (event.key === 'ArrowUp' && state.p2.dy === 0) { state.p2.dx = 0; state.p2.dy = -1; state.p2.turnPulse = now; }
        if (event.key === 'ArrowDown' && state.p2.dy === 0) { state.p2.dx = 0; state.p2.dy = 1; state.p2.turnPulse = now; }
        if (event.key === 'ArrowLeft' && state.p2.dx === 0) { state.p2.dx = -1; state.p2.dy = 0; state.p2.turnPulse = now; }
        if (event.key === 'ArrowRight' && state.p2.dx === 0) { state.p2.dx = 1; state.p2.dy = 0; state.p2.turnPulse = now; }
        if (key === 'k') useShield(state.p2, now);
        if (key === 'l') useBite(state.p2, state.p1, now, 'p2');
        if (key === 'm') state.p2.wantsBoost = true;
      }
    };

    const handleKeyUp = (event: KeyboardEvent) => {
      const key = letter(event);
      if (key === 'Shift') state.p1.wantsBoost = false;
      if (!botEnabled && key === 'm') state.p2.wantsBoost = false;
    };

    window.addEventListener('keydown', handleKeyDown);
    window.addEventListener('keyup', handleKeyUp);

    const isSafe = (nx: number, ny: number, growing: boolean) => {
      if (nx < 0 || nx >= GRID_W || ny < 0 || ny >= GRID_H) return false;
      if (pillarAt(nx, ny)) return false;
      for (let i = 1; i < state.p1.body.length; i += 1) {
        const tail = !growing && i === state.p1.body.length - 1;
        if (tail) continue;
        if (state.p1.body[i].x === nx && state.p1.body[i].y === ny) return false;
      }
      for (let i = 1; i < state.p2.body.length; i += 1) {
        if (state.p2.body[i].x === nx && state.p2.body[i].y === ny) return false;
      }
      return true;
    };

    const botThink = (now: number) => {
      const head = state.p2.body[0];
      const foodTarget = state.rare && manhattan(head, state.rare) <= manhattan(head, state.food)
        ? state.rare
        : state.food;
      const dirs = [
        { dx: 1, dy: 0 },
        { dx: -1, dy: 0 },
        { dx: 0, dy: 1 },
        { dx: 0, dy: -1 },
      ].filter((dir) => !(dir.dx === -state.p2.dx && dir.dy === -state.p2.dy));
      const scored = dirs.map((dir) => {
        const nx = head.x + dir.dx;
        const ny = head.y + dir.dy;
        return { ...dir, nx, ny, dist: Math.abs(nx - foodTarget.x) + Math.abs(ny - foodTarget.y) };
      });
      scored.sort((a, b) => a.dist - b.dist);
      const growing = state.p2.pendingGrow > 0;
      let picked = scored.find((dir) => isSafe(dir.nx, dir.ny, growing) && !state.bugs.some((bug) => bug.x === dir.nx && bug.y === dir.ny));
      if (!picked) picked = scored.find((dir) => isSafe(dir.nx, dir.ny, growing));
      if (picked) {
        if (picked.dx !== state.p2.dx || picked.dy !== state.p2.dy) state.p2.turnPulse = now;
        state.p2.dx = picked.dx;
        state.p2.dy = picked.dy;
      } else if (state.p2.shield >= 100) {
        useShield(state.p2, now);
      }
      state.p2.wantsBoost = manhattan(head, foodTarget) > 8 && state.p2.boost > 30;
      if (state.p2.bite >= 100 && (state.p1.gems > 0 || state.p1.body.length > 5) && manhattan(head, state.p1.body[0]) < 8) {
        useBite(state.p2, state.p1, now, 'p2');
      }
    };

    const hits = (next: CellPos, own: SnakeUnit, other: SnakeUnit) => {
      if (next.x < 0 || next.x >= GRID_W || next.y < 0 || next.y >= GRID_H) return true;
      if (pillarAt(next.x, next.y)) return true;
      const growing = next.x === state.food.x && next.y === state.food.y
        || Boolean(state.rare && next.x === state.rare.x && next.y === state.rare.y)
        || own.pendingGrow > 0;
      for (let i = 1; i < own.body.length; i += 1) {
        if (!growing && i === own.body.length - 1) continue;
        if (own.body[i].x === next.x && own.body[i].y === next.y) return true;
      }
      for (let i = 0; i < other.body.length; i += 1) {
        if (other.body[i].x === next.x && other.body[i].y === next.y) return true;
      }
      return false;
    };

    const applyRare = (snake: SnakeUnit, other: SnakeUnit, now: number) => {
      if (other.gems > 0) {
        other.gems -= 1;
        snake.gems += 1;
        snake.pendingGrow += 1;
        state.note = 'ROBO';
      } else {
        snake.pendingGrow += 2;
        state.note = 'COLA LARGA';
      }
      state.noteUntil = now + 800;
      state.rare = null;
      state.nextRareAt = now + RARE_EVERY_MS;
    };

    const stepSnake = (id: 'p1' | 'p2', now: number, gemColor: string) => {
      const snake = state[id];
      const other = id === 'p1' ? state.p2 : state.p1;
      if (now - snake.lastMove < intervalFor(snake, now)) return false;
      snake.lastMove = now;
      const next = { x: snake.body[0].x + snake.dx, y: snake.body[0].y + snake.dy };
      const deadly = hits(next, snake, other);
      if (deadly && snake.shieldUntil > now) return false;
      snake.prevBody = snake.body.map((cell) => ({ ...cell }));
      snake.body.unshift(next);
      const palette = id === 'p1' ? WORM_P1 : WORM_P2;
      let grew = false;
      if (sameCell(next, state.food)) {
        snake.gems += 1;
        snake.growPulse = now;
        grew = true;
        const { x, y } = cellCenter(next);
        spawnBurst(state.particles, x, y, 18, gemColor, 0.13);
        state.floaters.push({ x, y: y - 10, text: '+1', life: 700, color: palette.light });
        state.shake = Math.max(state.shake, 5);
        state.eatFlash = now + 160;
        placeFood();
      } else if (state.rare && sameCell(next, state.rare)) {
        applyRare(snake, other, now);
        snake.growPulse = now;
        grew = true;
        const { x, y } = cellCenter(next);
        spawnBurst(state.particles, x, y, 26, '#ff5a3c', 0.16);
        state.floaters.push({ x, y: y - 10, text: '+1', life: 700, color: '#ffd76a' });
        state.shake = Math.max(state.shake, 8);
        state.eatFlash = now + 200;
      }
      const bugIndex = state.bugs.findIndex((bug) => sameCell(bug, next));
      if (bugIndex >= 0) {
        state.bugs.splice(bugIndex, 1);
        snake.slowUntil = now + SLOW_MS;
        state.bugRespawns.push(now + RESPAWN_MS);
        const { x, y } = cellCenter(next);
        spawnBurst(state.particles, x, y, 8, '#ff8a3d', 0.08);
      }
      const keyIndex = state.keys.findIndex((key) => sameCell(key, next));
      if (keyIndex >= 0) {
        state.keys.splice(keyIndex, 1);
        openGap(next, now);
        state.keyRespawns.push(now + RESPAWN_MS);
      }
      if (grew) return deadly;
      if (snake.pendingGrow > 0) {
        snake.pendingGrow -= 1;
        return deadly;
      }
      snake.body.pop();
      return deadly;
    };

    const restoreGap = (now: number) => {
      if (!state.hidden || now < state.hidden.backAt) return null;
      const cell = state.hidden;
      state.pillars.push([cell.x, cell.y]);
      state.hidden = null;
      const crushed: ('p1' | 'p2')[] = [];
      (['p1', 'p2'] as const).forEach((id) => {
        const head = state[id].body[0];
        if (head.x !== cell.x || head.y !== cell.y) return;
        if (state[id].shieldUntil > now) return;
        crushed.push(id);
      });
      if (crushed.length === 2) return 'both' as const;
      return crushed[0] ?? null;
    };

    const flushRespawns = (now: number) => {
      state.bugRespawns = state.bugRespawns.filter((at) => {
        if (at > now) return true;
        const cell = findFree(false);
        if (cell) state.bugs.push(cell);
        return false;
      });
      state.keyRespawns = state.keyRespawns.filter((at) => {
        if (at > now) return true;
        const cell = findFree(false);
        if (cell) state.keys.push(cell);
        return false;
      });
    };

    const recharge = (now: number) => {
      if (now - state.lastRecharge < RECHARGE_MS) return;
      state.lastRecharge = now;
      [state.p1, state.p2].forEach((snake) => {
        if (snake.wantsBoost && snake.boost > 8) snake.boost = Math.max(0, snake.boost - 7);
        else snake.boost = Math.min(100, snake.boost + 2);
        snake.shield = Math.min(100, snake.shield + 1.4);
        snake.bite = Math.min(100, snake.bite + 1);
      });
    };

    const spawnRare = (now: number) => {
      if (state.rare && now >= state.rareUntil) {
        state.rare = null;
        state.nextRareAt = now + RARE_EVERY_MS;
      }
      if (state.rare || now < state.nextRareAt) return;
      const cell = findFree(true) ?? findFree(false);
      if (!cell) return;
      state.rare = cell;
      state.rareUntil = now + RARE_LIFE_MS;
    };

    const gemWinner = () => {
      if (state.p1.gems >= GEM_GOAL && state.p2.gems >= GEM_GOAL) return 'p1' as const;
      if (state.p1.gems >= GEM_GOAL) return 'p1' as const;
      if (state.p2.gems >= GEM_GOAL) return 'p2' as const;
      return null;
    };

    const updateEffects = (dt: number) => {
      state.particles = state.particles.filter((particle) => {
        particle.x += particle.vx * dt;
        particle.y += particle.vy * dt;
        particle.vy += 0.00025 * dt;
        particle.life -= dt;
        return particle.life > 0;
      });
      state.floaters = state.floaters.filter((floater) => {
        floater.y -= 0.03 * dt;
        floater.life -= dt;
        return floater.life > 0;
      });
      if (state.shake > 0) state.shake = Math.max(0, state.shake - dt * 0.035);
    };

    const drawEffects = () => {
      state.particles.forEach((particle) => {
        ctx.globalAlpha = Math.max(0, particle.life / particle.max);
        ctx.fillStyle = particle.color;
        ctx.fillRect(Math.round(particle.x), Math.round(particle.y), particle.size, particle.size);
      });
      ctx.globalAlpha = 1;
      ctx.textAlign = 'center';
      ctx.font = `10px ${PIX}`;
      state.floaters.forEach((floater) => {
        ctx.globalAlpha = Math.min(1, floater.life / 300);
        ctx.fillStyle = '#0d0a14';
        ctx.fillText(floater.text, floater.x + 1, floater.y + 1);
        ctx.fillStyle = floater.color;
        ctx.fillText(floater.text, floater.x, floater.y);
      });
      ctx.globalAlpha = 1;
      ctx.textAlign = 'left';
    };

    const drawScene = (time: number, gemColor: string) => {
      const ox = state.shake > 0 ? Math.round((Math.random() - 0.5) * state.shake) : 0;
      const oy = state.shake > 0 ? Math.round((Math.random() - 0.5) * state.shake) : 0;
      ctx.save();
      ctx.translate(ox, oy);
      ctx.drawImage(backdrop, 0, 0);
      ctx.save();
      ctx.beginPath();
      ctx.rect(OX - 14, OY - 40, FIELD_W + 28, FIELD_H + 54);
      ctx.clip();
      drawTorchFlames(ctx, time);
      drawDust(ctx, time);
      ctx.restore();
      state.pillars.forEach(([x, y]) => drawPillar(ctx, x, y, time));
      if (state.hidden) drawGap(ctx, state.hidden.x, state.hidden.y, time);
      state.bugs.forEach((bug) => drawBug(ctx, bug.x, bug.y, time));
      state.keys.forEach((key) => drawKey(ctx, key.x, key.y, time));
      drawGem(ctx, state.food.x, state.food.y, gemColor, time);
      if (state.rare) drawRareGem(ctx, state.rare.x, state.rare.y, time, state.rareUntil - time);
      ctx.save();
      ctx.beginPath();
      ctx.rect(OX - 2, OY - 2, FIELD_W + 4, FIELD_H + 4);
      ctx.clip();
      const p1Fade = state.outro && state.outro.winner === 'p2' ? Math.max(0.2, 1 - (time - state.outro.at) / 500) : 1;
      const p2Fade = state.outro && state.outro.winner === 'p1' ? Math.max(0.2, 1 - (time - state.outro.at) / 500) : 1;
      drawWorm(ctx, state.p2, WORM_P2, time, intervalFor(state.p2, time), state.biteFlash.p2 > time, p2Fade);
      drawWorm(ctx, state.p1, WORM_P1, time, intervalFor(state.p1, time), state.biteFlash.p1 > time, p1Fade);
      drawEffects();
      ctx.restore();
      if (state.eatFlash > time) {
        ctx.fillStyle = 'rgba(255, 245, 200, 0.12)';
        ctx.fillRect(OX, OY, FIELD_W, FIELD_H);
      }
      ctx.restore();
      drawHud(ctx, state.p1, state.p2, state.hi, time - startedAt, time);
      if (state.noteUntil > time && !state.outro) drawNote(ctx, state.note, state.noteUntil - time);
      if (time - startedAt < INTRO_MS) drawIntro(ctx, time - startedAt);
    };

    const update = (time: number) => {
      if (ended) return;
      animationFrameId = requestAnimationFrame(update);
      const dt = Math.min(50, time - state.lastFrame);
      state.lastFrame = time;
      const gemColor = ['#5ee0ff', '#e85ad0', '#7dff6a', '#f0d48a'][state.p1.gems % 4];

      if (state.outro) {
        updateEffects(dt);
        drawScene(time, gemColor);
        drawOutro(ctx, state.outro.winner, time - state.outro.at, state.p1.gems, state.p2.gems);
        if (time - state.outro.at >= OUTRO_MS) {
          ended = true;
          cancelAnimationFrame(animationFrameId);
          onGameEnd(state.outro.winner);
        }
        return;
      }

      recharge(time);
      flushRespawns(time);
      spawnRare(time);
      const crushed = restoreGap(time);
      if (botEnabled) botThink(time);

      const p1Dead = stepSnake('p1', time, gemColor);
      const p2Dead = stepSnake('p2', time, gemColor);
      state.hi = Math.max(state.hi, state.p1.gems * 100, state.p2.gems * 100);
      updateEffects(dt);

      const p1Lost = p1Dead || crushed === 'p1' || crushed === 'both';
      const p2Lost = p2Dead || crushed === 'p2' || crushed === 'both';
      if (p1Lost && p2Lost) finish('p1', time);
      else if (p1Lost) finish('p2', time);
      else if (p2Lost) finish('p1', time);
      else {
        const winner = gemWinner();
        if (winner) finish(winner, time);
      }

      drawScene(time, gemColor);
      if (state.outro) drawOutro(ctx, state.outro.winner, 0, state.p1.gems, state.p2.gems);
    };

    animationFrameId = requestAnimationFrame(update);
    return () => {
      ended = true;
      window.removeEventListener('keydown', handleKeyDown);
      window.removeEventListener('keyup', handleKeyUp);
      cancelAnimationFrame(animationFrameId);
    };
  }, [onGameEnd, botEnabled]);

  return (
    <canvas
      ref={canvasRef}
      width={WIDTH}
      height={HEIGHT}
      aria-label="Worm Clash"
      className="w-full max-w-full aspect-video rounded-xl [image-rendering:pixelated]"
    />
  );
}
