import { useEffect, useRef } from 'react';
import { keyHeld, otherSide, startLiveInputs, stepPlayHead, type SceneSnap } from './liveInputs';
import { makeRng, rankedCountdown, sideLabel, type SharedWorld } from './sharedWorld';

const WIDTH = 960;
const HEIGHT = 900;
const PIX = '"Press Start 2P", monospace';
const FIELD = { left: 18, top: 70, right: 942, bottom: 890 };
const INTRO_S = 10;
const KO_S = 0.35;
const PHASE_S = 5;
const MAX_PHASE = 8;
const MIN_GAP = 112;
const MOVE = 310;
const SPEED_BLEND_S = 1.6;

const smoothstep = (t: number) => {
  const x = Math.max(0, Math.min(1, t));
  return x * x * (3 - 2 * x);
};

const easedPhase = (gameTime: number) => {
  if (gameTime <= 0) return 0;
  const step = Math.min(MAX_PHASE, Math.floor(gameTime / PHASE_S));
  if (step <= 0) return 0;
  const into = gameTime - step * PHASE_S;
  return Math.min(MAX_PHASE, step - 1 + smoothstep(into / SPEED_BLEND_S));
};

const fallSpeedOf = (gameTime: number) => 160 + easedPhase(gameTime) * 65;

type Ctx = CanvasRenderingContext2D;
type Side = 'p1' | 'p2';
type Kind = 'bird' | 'balloon' | 'kite' | 'crate';

type Jumper = {
  x: number;
  y: number;
  vx: number;
  alive: boolean;
  lived: number;
  color: string;
  dark: string;
  canopy: string;
  light: string;
  name: string;
};

type Hazard = {
  x: number;
  y: number;
  w: number;
  h: number;
  vx: number;
  kind: Kind;
};

type Spark = { x: number; y: number; vx: number; vy: number; life: number; max: number; size: number; color: string };
type Row = [dx: number, dy: number, w: number, h: number];

const FIELD_SRC = '/sky-drop-field.jpg';
const fieldArt = new Image();
fieldArt.src = FIELD_SRC;

const fieldReady = () => fieldArt.complete && fieldArt.naturalWidth > 0;

const paint = (ctx: Ctx, x: number, y: number, w: number, h: number, color: string) => {
  ctx.fillStyle = color;
  ctx.fillRect(x, y, w, h);
};

const drawCover = (ctx: Ctx, image: HTMLImageElement, x: number, y: number, w: number, h: number) => {
  const scale = Math.max(w / image.width, h / image.height);
  const dw = image.width * scale;
  const dh = image.height * scale;
  ctx.drawImage(image, x + (w - dw) / 2, y + (h - dh) / 2, dw, dh);
};

const INK = '#0b1220';
const SKIN = '#f1c27d';

const fillRows = (ctx: Ctx, x: number, y: number, rows: Row[], color: string, grow = 0) => {
  ctx.fillStyle = color;
  rows.forEach(([dx, dy, w, h]) => ctx.fillRect(x + dx - grow, y + dy - grow, w + grow * 2, h + grow * 2));
};

const tint = (hex: string, amount: number) => {
  const n = parseInt(hex.slice(1), 16);
  const ch = (shift: number) => {
    const v = (n >> shift) & 255;
    return Math.round(v + (255 - v) * amount);
  };
  return `rgb(${ch(16)},${ch(8)},${ch(0)})`;
};

const clamp = (v: number, lo: number, hi: number) => Math.max(lo, Math.min(hi, v));

const overlaps = (
  ax: number, ay: number, aw: number, ah: number,
  bx: number, by: number, bw: number, bh: number,
) => ax < bx + bw && ax + aw > bx && ay < by + bh && ay + ah > by;

const makeJumper = (x: number, color: string, dark: string, canopy: string, name: string): Jumper => ({
  x,
  y: 168,
  vx: 0,
  alive: true,
  lived: 0,
  color,
  dark,
  canopy,
  light: tint(canopy, 0.55),
  name,
});

const formatTime = (seconds: number) => `${seconds.toFixed(1)}s`;

const drawSkyFallback = (ctx: Ctx) => {
  const sky = ctx.createLinearGradient(0, 0, 0, HEIGHT);
  sky.addColorStop(0, '#2f6fb3');
  sky.addColorStop(0.45, '#6eb6e8');
  sky.addColorStop(1, '#d7f0ff');
  ctx.fillStyle = sky;
  ctx.fillRect(0, 0, WIDTH, HEIGHT);
};

const drawBackdrop = (ctx: Ctx) => {
  if (!fieldReady()) {
    drawSkyFallback(ctx);
    return;
  }
  const smooth = ctx.imageSmoothingEnabled;
  ctx.imageSmoothingEnabled = false;
  drawCover(ctx, fieldArt, 0, 0, WIDTH, HEIGHT);
  ctx.imageSmoothingEnabled = smooth;
};

// ── AMBIENTE: nubes y viento (solo decorativo, sin colisión) ─────────
const CLOUDS = [
  { x: 60, y: 120, w: 96, par: 0.32, drift: 9, a: 0.5 },
  { x: 420, y: 300, w: 72, par: 0.4, drift: -7, a: 0.45 },
  { x: 760, y: 80, w: 110, par: 0.3, drift: 6, a: 0.5 },
  { x: 220, y: 460, w: 64, par: 0.55, drift: 12, a: 0.6 },
  { x: 620, y: 520, w: 84, par: 0.6, drift: -10, a: 0.6 },
  { x: 880, y: 260, w: 58, par: 0.7, drift: 14, a: 0.65 },
];

const WIND = Array.from({ length: 18 }, (_, i) => ({
  x: (i * 53 + 17) % WIDTH,
  y: (i * 131) % HEIGHT,
  len: 10 + (i % 4) * 5,
  par: 0.9 + (i % 3) * 0.25,
}));

const wrap = (v: number, size: number) => ((v % size) + size) % size;

const drawCloud = (ctx: Ctx, x: number, y: number, w: number, alpha: number) => {
  const h = Math.round(w * 0.3);
  ctx.globalAlpha = alpha;
  paint(ctx, x, y + Math.round(h * 0.4), w, Math.round(h * 0.6), '#ffffff');
  paint(ctx, x + Math.round(w * 0.15), y, Math.round(w * 0.45), Math.round(h * 0.7), '#ffffff');
  paint(ctx, x + Math.round(w * 0.5), y + Math.round(h * 0.15), Math.round(w * 0.35), Math.round(h * 0.6), '#ffffff');
  paint(ctx, x + 2, y + h - 3, w - 4, 3, '#b7cbe6');
  ctx.globalAlpha = 1;
};

const drawAmbient = (ctx: Ctx, fall: number, anim: number, phase: number) => {
  CLOUDS.forEach((cloud) => {
    const span = HEIGHT + 80;
    const cy = Math.round(wrap(cloud.y - fall * cloud.par, span) - 40);
    const cx = Math.round(wrap(cloud.x + anim * cloud.drift, WIDTH + 160) - 80);
    drawCloud(ctx, cx, cy, cloud.w, cloud.a);
  });
  const strength = 1 + phase * 0.12;
  ctx.globalAlpha = 0.14 + phase * 0.03;
  WIND.forEach((line) => {
    const len = Math.round(line.len * strength);
    const ly = Math.round(wrap(line.y - fall * line.par * 1.3, HEIGHT + len) - len);
    paint(ctx, line.x, ly, 2, len, '#ffffff');
  });
  ctx.globalAlpha = 1;
};

// ── OBSTÁCULOS ───────────────────────────────────────────────────────
const drawBirdWing = (ctx: Ctx, bx: number, by: number, dir: number, lift: number) => {
  const segs: Row[] = [
    [dir > 0 ? 0 : -5, -Math.round(lift / 3), 5, 4],
    [dir > 0 ? 5 : -10, -Math.round((lift * 2) / 3), 5, 4],
    [dir > 0 ? 10 : -14, -lift, 4, 3],
  ];
  fillRows(ctx, bx, by, segs, INK, 1);
  fillRows(ctx, bx, by, segs, '#e879f9');
  ctx.fillStyle = '#a21caf';
  segs.forEach(([dx, dy, w]) => ctx.fillRect(bx + dx, by + dy + 2, w, 1));
};

const drawBird = (ctx: Ctx, item: Hazard, anim: number) => {
  const face = item.vx > 0 ? 1 : -1;
  const flap = Math.sin(anim * 9 + item.x * 0.07);
  const lift = Math.round(flap * 5);
  const cx = Math.round(item.x + item.w / 2);
  const cy = Math.round(item.y + 11);
  const bodyRows: Row[] = [[-11, -4, 22, 9]];
  const tailX = face > 0 ? -17 : 11;
  const headX = face > 0 ? 9 : -17;
  fillRows(ctx, cx, cy, bodyRows, INK, 1);
  fillRows(ctx, cx, cy, [[tailX, -2, 6, 4]], INK, 1);
  fillRows(ctx, cx, cy, [[headX, -8, 8, 8]], INK, 1);
  fillRows(ctx, cx, cy, bodyRows, '#a21caf');
  paint(ctx, cx - 9, cy - 3, 16, 3, '#c026d3');
  paint(ctx, cx - 11, cy + 2, 22, 3, '#701a75');
  paint(ctx, cx + tailX, cy - 2, 6, 4, '#86198f');
  paint(ctx, cx + tailX + (face > 0 ? 0 : 3), cy - 3, 3, 2, '#86198f');
  paint(ctx, cx + headX, cy - 8, 8, 8, '#a21caf');
  paint(ctx, cx + headX + 1, cy - 7, 6, 2, '#c026d3');
  paint(ctx, cx + headX + (face > 0 ? 5 : 1), cy - 6, 2, 2, INK);
  paint(ctx, cx + headX + (face > 0 ? 8 : -5), cy - 4, 5, 3, '#fde047');
  paint(ctx, cx + headX + (face > 0 ? 8 : -5), cy - 2, 5, 1, '#ca8a04');
  drawBirdWing(ctx, cx - 11, cy - 2, -1, lift);
  drawBirdWing(ctx, cx + 11, cy - 2, 1, lift);
};

const BALLOON_ROWS: Row[] = [
  [10, 0, 14, 2],
  [6, 2, 22, 2],
  [3, 4, 28, 2],
  [0, 6, 34, 16],
  [3, 22, 28, 3],
  [7, 25, 20, 3],
  [11, 28, 12, 3],
  [13, 31, 8, 3],
];

const drawBalloon = (ctx: Ctx, item: Hazard, anim: number) => {
  const x = Math.round(item.x);
  const y = Math.round(item.y);
  const swing = Math.round(Math.sin(anim * 2.2 + item.x * 0.05) * 2);
  const basketY = y + 40;
  paint(ctx, x + 12 + swing, y + 34, 1, 6, '#7c2d12');
  paint(ctx, x + 21 + swing, y + 34, 1, 6, '#7c2d12');
  fillRows(ctx, x + swing, basketY, [[11, 0, 12, 6]], INK, 1);
  paint(ctx, x + 11 + swing, basketY, 12, 6, '#b45309');
  paint(ctx, x + 11 + swing, basketY, 12, 2, '#d97706');
  paint(ctx, x + 13 + swing, basketY + 3, 2, 2, '#78350f');
  paint(ctx, x + 17 + swing, basketY + 3, 2, 2, '#78350f');
  fillRows(ctx, x, y, BALLOON_ROWS, INK, 1);
  fillRows(ctx, x, y, BALLOON_ROWS, '#fb7185');
  paint(ctx, x + 8, y + 4, 4, 20, '#f43f5e');
  paint(ctx, x + 20, y + 4, 4, 20, '#f43f5e');
  paint(ctx, x + 28, y + 6, 4, 16, '#be123c');
  paint(ctx, x + 24, y + 22, 6, 3, '#be123c');
  paint(ctx, x + 5, y + 6, 3, 10, '#ffe4e6');
  paint(ctx, x + 8, y + 5, 2, 4, '#ffe4e6');
  paint(ctx, x + 13, y + 31, 8, 3, '#9f1239');
};

const KITE_WIDTHS = [4, 10, 16, 22, 28, 26, 22, 18, 14, 10, 8, 6, 4, 2];

const drawKite = (ctx: Ctx, item: Hazard, anim: number) => {
  const x = Math.round(item.x);
  const y = Math.round(item.y);
  const cx = x + 22;
  const lean = Math.sin(anim * 2.6 + item.x * 0.04) * 2;
  const rows: Row[] = KITE_WIDTHS.map((w, i) => {
    const shift = Math.round(lean * Math.max(0, 5 - i) / 5);
    return [shift - w / 2, i * 2, w, 2];
  });
  fillRows(ctx, cx, y, rows, INK, 1);
  fillRows(ctx, cx, y, rows, '#22d3ee');
  ctx.fillStyle = '#06b6d4';
  rows.forEach(([dx, dy, w, h]) => ctx.fillRect(cx + dx + Math.round(w / 2), y + dy, Math.round(w / 2), h));
  ctx.fillStyle = '#0e7490';
  rows.forEach(([dx, dy, w, h]) => ctx.fillRect(cx + dx + Math.round(w / 2) - 1, y + dy, 2, h));
  paint(ctx, cx - 14 + Math.round(lean * 0.2), y + 8, 28, 2, '#0e7490');
  paint(ctx, cx - 3, y + 5, 6, 6, '#fef08a');
  paint(ctx, cx - 1, y + 7, 2, 2, '#f59e0b');
  for (let k = 0; k < 5; k += 1) {
    const tx = x + 20 + Math.round(Math.sin(anim * 6 + k * 1.1 + item.x * 0.03) * (1 + k) * 0.8);
    const ty = y + 28 + k * 4;
    paint(ctx, tx, ty, 3, 3, '#0f172a');
    if (k === 1 || k === 3) paint(ctx, tx - 1, ty + 1, 5, 2, '#f472b6');
  }
};

const drawCrate = (ctx: Ctx, item: Hazard) => {
  const x = Math.round(item.x);
  const y = Math.round(item.y);
  const w = Math.round(item.w);
  const h = Math.round(item.h);
  fillRows(ctx, x, y, [[0, 0, w, h]], INK, 1);
  paint(ctx, x, y, w, h, '#f97316');
  paint(ctx, x, y, w, 2, '#fdba74');
  paint(ctx, x, y + h - 3, w, 3, '#9a3412');
  paint(ctx, x, y + Math.round(h / 3), w, 1, '#c2410c');
  paint(ctx, x, y + Math.round((h * 2) / 3), w, 1, '#c2410c');
  paint(ctx, x, y, 4, h, '#c2410c');
  paint(ctx, x + w - 4, y, 4, h, '#c2410c');
  const steps = Math.floor((w - 8) / 3);
  ctx.fillStyle = '#c2410c';
  for (let i = 0; i < steps; i += 1) {
    const sx = x + 4 + i * 3;
    const sy = y + h - 4 - Math.round((i / Math.max(1, steps - 1)) * (h - 6));
    ctx.fillRect(sx, sy, 3, 2);
  }
  const labelW = Math.min(18, w - 16);
  paint(ctx, x + Math.round((w - labelW) / 2), y + Math.round(h / 2) - 3, labelW, 6, '#fde047');
  paint(ctx, x + Math.round((w - labelW) / 2) + 2, y + Math.round(h / 2) - 1, labelW - 4, 2, '#9a3412');
  [[1, 1], [w - 3, 1], [1, h - 3], [w - 3, h - 3]].forEach(([nx, ny]) => paint(ctx, x + nx, y + ny, 2, 2, '#fde047'));
};

const drawHazard = (ctx: Ctx, item: Hazard, anim: number) => {
  if (item.kind === 'bird') {
    drawBird(ctx, item, anim);
    return;
  }
  if (item.kind === 'balloon') {
    drawBalloon(ctx, item, anim);
    return;
  }
  if (item.kind === 'kite') {
    drawKite(ctx, item, anim);
    return;
  }
  drawCrate(ctx, item);
};

// ── SALTADORES ───────────────────────────────────────────────────────
const CANOPY_ROWS: Row[] = [
  [-8, -36, 16, 2],
  [-14, -34, 28, 2],
  [-18, -32, 36, 2],
  [-20, -30, 40, 10],
  [-18, -20, 36, 2],
  [-16, -18, 32, 2],
];

const drawCanopy = (ctx: Ctx, cx: number, y: number, jumper: Jumper, lean: number, puff: number) => {
  const rows: Row[] = CANOPY_ROWS.map(([dx, dy, w, h]) => {
    const shift = Math.round((lean * (-dy - 16)) / 20);
    const grow = dy === -30 ? puff : 0;
    return [dx + shift - grow, dy, w + grow * 2, h];
  });
  fillRows(ctx, cx, y, rows, INK, 1);
  fillRows(ctx, cx, y, rows, jumper.canopy);
  const mid = Math.round((lean * 14) / 20);
  paint(ctx, cx - 16 + mid, y - 32, 8, 12, jumper.light);
  paint(ctx, cx + mid, y - 32, 8, 12, jumper.light);
  paint(ctx, cx + 8 + mid, y - 32, 4, 12, jumper.dark);
  paint(ctx, cx + 16 + Math.round((lean * 6) / 20), y - 30, 4, 10, jumper.dark);
  paint(ctx, cx - 2 + Math.round(lean), y - 36, 4, 2, jumper.dark);
  for (let k = 0; k < 4; k += 1) paint(ctx, cx - 14 + k * 8, y - 16, 4, 2, jumper.canopy);
};

const drawJumper = (ctx: Ctx, jumper: Jumper, anim: number, sway: number, offset: number) => {
  const x = Math.round(jumper.x + sway);
  const y = Math.round(jumper.y);
  const body = jumper.color;
  const shade = jumper.dark;
  const alive = jumper.alive;
  ctx.globalAlpha = alive ? 1 : 0.38;

  const cx = x - Math.round(sway * 0.35);
  const lean = alive ? clamp(Math.round(jumper.vx / 80), -3, 3) : 0;
  const puff = Math.round(Math.sin(anim * 2.4 + offset) * 0.5 + 0.5);
  const armLift = Math.round(Math.sin(anim * 4.2 + offset) * 2);
  const kick = Math.round(Math.sin(anim * 5.3 + offset) * 2);

  if (alive) {
    ctx.globalAlpha = 0.45;
    for (let k = 0; k < 2; k += 1) {
      const dy = Math.round(wrap(anim * 260 + k * 23 + offset * 10, 48)) - 12;
      paint(ctx, x - 19, y + dy, 2, 6 + k * 3, '#ffffff');
      paint(ctx, x + 17, y + dy + 11, 2, 6 + k * 3, '#ffffff');
    }
    ctx.globalAlpha = 1;
  }

  if (alive) drawCanopy(ctx, cx, y, jumper, lean, puff);
  else {
    const crumpled: Row[] = CANOPY_ROWS.map(([dx, dy, w, h], i) => [
      Math.round(dx / 2) + ((i % 2) * 2 - 1),
      dy + 8,
      Math.round(w / 2),
      h,
    ]);
    fillRows(ctx, cx, y, crumpled, INK, 1);
    fillRows(ctx, cx, y, crumpled, jumper.canopy);
  }

  const topY = alive ? y - 16 : y - 8;
  const topShift = alive ? Math.round((lean * 4) / 20) : 0;
  ctx.strokeStyle = '#1a1a24';
  ctx.lineWidth = 1;
  ctx.beginPath();
  ctx.moveTo(cx - 18 + topShift, topY);
  ctx.lineTo(x - 6, y + 12);
  ctx.moveTo(cx - 6 + topShift, topY);
  ctx.lineTo(x - 3, y + 10);
  ctx.moveTo(cx + 6 + topShift, topY);
  ctx.lineTo(x + 3, y + 10);
  ctx.moveTo(cx + 18 + topShift, topY);
  ctx.lineTo(x + 6, y + 12);
  ctx.stroke();

  const scarfY = y + 9;
  for (let k = 0; k < 3; k += 1) {
    const flutter = Math.round(Math.sin(anim * 7 + k + offset) * 1);
    paint(ctx, x + 6 + k * 2, scarfY - k * 3 + flutter, 3, 2, jumper.canopy);
  }

  const leftArm: Row[] = [
    [-12, 11 - armLift, 6, 4],
    [-17, 8 - armLift * 2, 5, 4],
  ];
  const rightArm: Row[] = [
    [6, 11 - armLift, 6, 4],
    [12, 8 - armLift * 2, 5, 4],
  ];
  const legs: Row[] = [
    [-5, 21 + kick, 4, 7],
    [1, 21 - kick, 4, 7],
  ];
  const core: Row[] = [
    [-7, 0, 14, 9],
    [-6, 11, 12, 10],
  ];
  fillRows(ctx, x, y, [...core, ...leftArm, ...rightArm, ...legs], INK, 1);

  fillRows(ctx, x, y, legs, body);
  paint(ctx, x - 6, y + 27 + kick, 5, 3, shade);
  paint(ctx, x + 1, y + 27 - kick, 5, 3, shade);

  fillRows(ctx, x, y, leftArm, body);
  fillRows(ctx, x, y, rightArm, body);
  paint(ctx, x - 19, y + 8 - armLift * 2, 2, 3, SKIN);
  paint(ctx, x + 17, y + 8 - armLift * 2, 2, 3, SKIN);

  paint(ctx, x - 6, y + 11, 12, 10, body);
  paint(ctx, x - 6, y + 11, 2, 10, shade);
  paint(ctx, x + 4, y + 11, 2, 10, shade);
  paint(ctx, x - 1, y + 14, 2, 2, '#fde047');
  paint(ctx, x - 4, y + 19, 8, 2, shade);

  paint(ctx, x - 7, y, 14, 9, shade);
  paint(ctx, x - 5, y + 1, 4, 2, jumper.light);
  paint(ctx, x - 6, y + 4, 12, 3, '#7dd3fc');
  paint(ctx, x - 5, y + 4, 2, 1, '#ffffff');
  paint(ctx, x - 5, y + 7, 10, 4, SKIN);
  paint(ctx, x - 1, y + 9, 2, 1, '#7c2d12');

  if (!alive) {
    ctx.fillStyle = '#f5c518';
    ctx.font = `10px ${PIX}`;
    ctx.textAlign = 'center';
    ctx.fillText('OUT', x, y - 42);
    ctx.textAlign = 'left';
  }
  ctx.globalAlpha = 1;
};

const drawSparks = (ctx: Ctx, sparks: Spark[]) => {
  sparks.forEach((spark) => {
    ctx.globalAlpha = Math.max(0, spark.life / spark.max);
    paint(ctx, Math.round(spark.x), Math.round(spark.y), spark.size, spark.size, spark.color);
  });
  ctx.globalAlpha = 1;
};

const drawHud = (ctx: Ctx, p1: Jumper, p2: Jumper, gameTime: number) => {
  paint(ctx, 0, 0, WIDTH, 58, 'rgba(12, 20, 36, 0.72)');
  paint(ctx, 8, 6, 250, 46, '#142033');
  ctx.strokeStyle = p1.canopy;
  ctx.strokeRect(8, 6, 250, 46);
  paint(ctx, 702, 6, 250, 46, '#142033');
  ctx.strokeStyle = p2.canopy;
  ctx.strokeRect(702, 6, 250, 46);
  paint(ctx, 330, 6, 300, 46, '#101828');
  ctx.strokeStyle = '#f5c518';
  ctx.strokeRect(330, 6, 300, 46);

  ctx.textAlign = 'left';
  ctx.font = `8px ${PIX}`;
  ctx.fillStyle = p1.canopy;
  ctx.fillText(p1.name, 18, 24);
  ctx.fillStyle = '#f4f7fb';
  ctx.font = `12px ${PIX}`;
  ctx.fillText(formatTime(p1.lived), 18, 44);

  ctx.textAlign = 'right';
  ctx.font = `8px ${PIX}`;
  ctx.fillStyle = p2.canopy;
  ctx.fillText(p2.name, 942, 24);
  ctx.fillStyle = '#f4f7fb';
  ctx.font = `12px ${PIX}`;
  ctx.fillText(formatTime(p2.lived), 942, 44);

  ctx.textAlign = 'center';
  ctx.fillStyle = '#f5c518';
  ctx.font = `10px ${PIX}`;
  ctx.fillText('SKY DROP', 480, 24);
  ctx.fillStyle = '#f4f7fb';
  ctx.font = `8px ${PIX}`;
  const shownPhase = Math.min(MAX_PHASE, Math.floor(gameTime / PHASE_S));
  ctx.fillText(`${formatTime(gameTime)}  FASE ${shownPhase + 1}`, 480, 44);
  ctx.textAlign = 'left';
};

const drawBanner = (ctx: Ctx, title: string, sub: string, mark?: { name: string; hex: string }) => {
  const bannerY = Math.round(HEIGHT / 2 - (mark ? 110 : 74));
  const height = mark ? 210 : 148;
  paint(ctx, 120, bannerY, 720, height, 'rgba(10, 16, 28, 0.9)');
  ctx.strokeStyle = mark ? mark.hex : '#f5c518';
  ctx.lineWidth = 4;
  ctx.strokeRect(120, bannerY, 720, height);
  ctx.textAlign = 'center';
  ctx.fillStyle = '#f5c518';
  ctx.font = `20px ${PIX}`;
  ctx.fillText(title, 480, bannerY + 52);
  ctx.fillStyle = '#f4f7fb';
  ctx.font = `8px ${PIX}`;
  ctx.fillText(sub, 480, bannerY + 86);
  if (mark) {
    ctx.fillStyle = mark.hex;
    ctx.fillRect(400, bannerY + 104, 160, 40);
    ctx.strokeStyle = '#ffffff';
    ctx.lineWidth = 3;
    ctx.strokeRect(400, bannerY + 104, 160, 40);
    ctx.fillStyle = mark.hex;
    ctx.font = `13px ${PIX}`;
    ctx.fillText(`TE TOCA EL ${mark.name}`, 480, bannerY + 180);
  }
  ctx.textAlign = 'left';
};

const hitsJumper = (jumper: Jumper, item: Hazard, sway: number) => {
  const x = jumper.x + sway;
  const body = overlaps(x - 12, jumper.y, 24, 30, item.x, item.y, item.w, item.h);
  const sail = overlaps(x - 22, jumper.y - 28, 44, 16, item.x, item.y, item.w, item.h);
  return body || sail;
};

export default function Skydive({
  onGameEnd,
  matchId,
  botEnabled = false,
  world = null,
  youName = '',
  rivalName = '',
}: {
  onGameEnd: (winner: 'p1' | 'p2', matchId: string) => void;
  matchId: string;
  botEnabled?: boolean;
  world?: SharedWorld | null;
  youName?: string;
  rivalName?: string;
}) {
  const canvasRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;
    void document.fonts.load(`10px ${PIX}`);

    let ended = false;
    const endMatch = (winner: 'p1' | 'p2') => {
      onGameEnd(winner, matchId);
    };
    let raf = 0;
    let playHead = 0;
    const rand = world ? makeRng(world.seed) : Math.random;
    const you = world?.localSide ?? 'p1';
    const yours = you === 'p1'
      ? { name: 'MORADO', hex: '#e879f9' }
      : { name: 'AMARILLO', hex: '#fde047' };
    const them = otherSide(you);
    const link = world ? startLiveInputs(world.matchId, world.localUserId) : null;
    const state = {
      p1: makeJumper(300, '#c026d3', '#86198f', '#e879f9', sideLabel(world, 'p1', 'MORADO', { you: youName, rival: rivalName })),
      p2: makeJumper(660, '#facc15', '#8a7a2a', '#fde047', sideLabel(world, 'p2', 'AMARILLO', { you: youName, rival: rivalName })),
      keys: {} as Record<string, boolean>,
      hazards: [] as Hazard[],
      sparks: [] as Spark[],
      intro: INTRO_S,
      gameTime: 0,
      spawnWait: 1.05,
      fall: 0,
      winner: null as Side | 'draw' | null,
      ko: 0,
      last: performance.now(),
    };
    if (link) link.setLocalKeys(state.keys);

    const publishKeys = () => {
      link?.setLocalKeys(state.keys);
    };
    const handleKeyDown = (event: KeyboardEvent) => {
      state.keys[event.key] = true;
      publishKeys();
    };
    const handleKeyUp = (event: KeyboardEvent) => {
      state.keys[event.key] = false;
      publishKeys();
    };
    window.addEventListener('keydown', handleKeyDown);
    window.addEventListener('keyup', handleKeyUp);

    const burst = (x: number, y: number, canopy: string, body: string) => {
      const palette = [canopy, body, '#ffffff', '#fde047'];
      for (let i = 0; i < 24; i += 1) {
        if (state.sparks.length > 80) return;
        const angle = (Math.PI * 2 * i) / 24 + Math.random() * 0.3;
        const speed = i < 18 ? 80 + Math.random() * 160 : 20 + Math.random() * 30;
        const life = i < 18 ? 0.4 + Math.random() * 0.3 : 0.7;
        state.sparks.push({
          x,
          y,
          vx: Math.cos(angle) * speed,
          vy: Math.sin(angle) * speed - (i < 18 ? 0 : 50),
          life,
          max: life,
          size: i < 18 ? 3 + (i % 3) : 5,
          color: i < 18 ? palette[i % palette.length] : canopy,
        });
      }
    };

    const spawnWave = () => {
      const roll = rand();
      const y = HEIGHT + 12;
      if (roll < 0.4) {
        const kind: Kind = (['bird', 'balloon', 'kite', 'crate'] as Kind[])[Math.floor(rand() * 4)];
        const w = kind === 'crate' ? 54 : kind === 'balloon' ? 34 : 42;
        const h = kind === 'balloon' ? 46 : 26;
        const x = FIELD.left + 24 + rand() * (FIELD.right - FIELD.left - w - 48);
        state.hazards.push({ x, y, w, h, vx: 0, kind });
        return;
      }
      if (roll < 0.82) {
        const leftW = 36 + rand() * 28;
        const gap = MIN_GAP + rand() * 90;
        const room = FIELD.right - FIELD.left - leftW - gap - 40;
        const leftX = FIELD.left + 16 + rand() * Math.max(8, room);
        state.hazards.push({ x: leftX, y, w: leftW, h: 28, vx: 0, kind: 'crate' });
        state.hazards.push({
          x: leftX + leftW + gap,
          y: y + 10,
          w: 38,
          h: 26,
          vx: 0,
          kind: rand() < 0.5 ? 'kite' : 'balloon',
        });
        return;
      }
      const fromLeft = rand() < 0.5;
      state.hazards.push({
        x: fromLeft ? FIELD.left - 10 : FIELD.right - 30,
        y,
        w: 44,
        h: 22,
        vx: fromLeft ? 70 : -70,
        kind: 'bird',
      });
    };

    const steerOf = (left: boolean, right: boolean) => (right ? 1 : 0) - (left ? 1 : 0);

    const botSteer = (jumper: Jumper) => {
      let target = jumper.x;
      state.hazards.forEach((item) => {
        if (item.y < jumper.y - 10 || item.y > jumper.y + 210) return;
        if (jumper.x + 18 < item.x || jumper.x - 18 > item.x + item.w) return;
        const left = item.x - 36;
        const right = item.x + item.w + 36;
        target = Math.abs(jumper.x - left) < Math.abs(jumper.x - right) ? left : right;
      });
      return steerOf(target < jumper.x - 10, target > jumper.x + 10);
    };

    const TAP_X = 18;
    const TAP_SPEED = 180;
    const TAP_HOLD_S = 8 / 60;
    const glide = {
      p1: { left: 0, prev: 0, held: 0 },
      p2: { left: 0, prev: 0, held: 0 },
    };
    const drive = (jumper: Jumper, steer: number, dt: number, who: 'p1' | 'p2') => {
      if (!jumper.alive) return;
      const pad = glide[who];
      if (steer !== 0) {
        if (pad.prev !== steer) {
          pad.left = steer * TAP_X;
          pad.held = 0;
        }
        pad.held += dt;
        pad.prev = steer;
        if (pad.held > TAP_HOLD_S) pad.left = 0;
      } else {
        pad.prev = 0;
        pad.held = 0;
      }
      if (steer !== 0 && pad.left === 0) {
        jumper.vx = steer * MOVE;
        jumper.x += jumper.vx * dt;
      } else if (pad.left !== 0) {
        const step = Math.sign(pad.left) * Math.min(Math.abs(pad.left), TAP_SPEED * dt);
        pad.left -= step;
        jumper.vx = dt > 0 ? step / dt : 0;
        jumper.x += step;
      } else {
        jumper.vx = 0;
      }
      if (jumper.x < FIELD.left + 26) jumper.x = FIELD.left + 26;
      if (jumper.x > FIELD.right - 26) jumper.x = FIELD.right - 26;
    };

    const KINDS = ['bird', 'balloon', 'kite', 'crate'] as const;

    const applyDrop = (scene: SceneSnap) => {
      const put = (jumper: Jumper, actor: SceneSnap['p1']) => {
        const nowAlive = actor.alive === 1;
        if (jumper.alive && !nowAlive) burst(actor.x, actor.y + 10, jumper.canopy, jumper.color);
        jumper.x = actor.x;
        jumper.y = actor.y;
        jumper.vx = actor.v;
        jumper.lived = actor.p;
        jumper.alive = nowAlive;
      };
      put(state.p1, scene.p1);
      put(state.p2, scene.p2);
      state.gameTime = scene.time;
      state.fall = scene.fall;
      state.hazards = scene.items.map((item) => ({
        x: item.x,
        y: item.y,
        w: item.w,
        h: item.h,
        vx: item.v,
        kind: KINDS[item.k] ?? 'crate',
      }));
      if ((scene.winner === 'p1' || scene.winner === 'p2' || scene.winner === 'draw') && !state.winner) {
        state.winner = scene.winner;
        state.ko = KO_S;
      }
    };

    const update = (now: number) => {
      if (ended) return;
      const dt = Math.min(0.05, (now - state.last) / 1000);
      if (world && link) {
        const stepMs = Math.min(50, Math.max(0, now - state.last));
        state.last = now;
        link.setLocalKeys(state.keys);
        playHead = stepPlayHead(playHead, stepMs, link.sceneAt(), link.serverNow());
        const scene = link.readScene(playHead);
        if (scene?.kind === 'drop') applyDrop(scene);
        const phase = easedPhase(state.gameTime);
        const anim = now / 1000;
        state.sparks = state.sparks.filter((spark) => {
          spark.x += spark.vx * dt;
          spark.y += spark.vy * dt;
          spark.life -= dt;
          return spark.life > 0;
        });
        drawBackdrop(ctx);
        drawAmbient(ctx, state.fall, anim, phase);
        state.hazards.forEach((item) => drawHazard(ctx, item, anim));
        drawJumper(ctx, state.p1, anim, Math.sin(state.gameTime * 3.1) * 7, 0);
        drawJumper(ctx, state.p2, anim, Math.sin(state.gameTime * 3.1 + 1.4) * 7, 1.4);
        drawSparks(ctx, state.sparks);
        drawHud(ctx, state.p1, state.p2, state.gameTime);
        const rankedWait = rankedCountdown(world.startAt, link.serverNow());
        if (rankedWait) drawBanner(ctx, rankedWait, 'MISMO CIELO    ESQUIVA Y AGUANTA', yours);
        if (state.winner === 'draw') {
          drawBanner(ctx, 'EMPATE', `${formatTime(state.p1.lived)} = ${formatTime(state.p2.lived)}`);
        } else if (state.winner) {
          const name = state.winner === 'p1' ? state.p1.name : state.p2.name;
          drawBanner(ctx, `${name} GANA`, `${formatTime(state.p1.lived)}  vs  ${formatTime(state.p2.lived)}`);
        }
        if (state.winner) {
          ended = true;
          cancelAnimationFrame(raf);
          endMatch(state.winner === 'p2' ? 'p2' : 'p1');
          return;
        }
        raf = requestAnimationFrame(update);
        return;
      }
      state.last = now;

      const rankedWait = world ? rankedCountdown(world.startAt) : null;
      if (rankedWait) {
        // Misma cuenta atrás en los dos terminales.
      } else if (!world && state.intro > 0) {
        state.intro -= dt;
      } else if (!state.winner) {
        state.gameTime += dt;
        const phase = easedPhase(state.gameTime);
        const fallSpeed = fallSpeedOf(state.gameTime);
        const spawnEvery = Math.max(0.48, 1.15 - phase * 0.08);
        state.fall += fallSpeed * dt;
        state.spawnWait += dt;
        if (state.spawnWait >= spawnEvery) {
          state.spawnWait = 0;
          spawnWave();
        }

        if (world) {
          link?.setLocalKeys(state.keys);
          const padSteer = (keys: Record<string, boolean>) =>
            steerOf(keyHeld(keys, 'a', 'A', 'ArrowLeft'), keyHeld(keys, 'd', 'D', 'ArrowRight'));
          drive(you === 'p1' ? state.p1 : state.p2, padSteer(state.keys), dt, you);
          drive(them === 'p1' ? state.p1 : state.p2, padSteer(link?.readRivalKeys() ?? {}), dt, them);
        } else {
          drive(
            state.p1,
            steerOf(Boolean(state.keys['a'] || state.keys['A']), Boolean(state.keys['d'] || state.keys['D'])),
            dt,
            'p1',
          );
          if (botEnabled) drive(state.p2, botSteer(state.p2), dt, 'p2');
          else {
            drive(
              state.p2,
              steerOf(Boolean(state.keys['ArrowLeft']), Boolean(state.keys['ArrowRight'])),
              dt,
              'p2',
            );
          }
        }

        if (state.p1.alive) state.p1.lived = state.gameTime;
        if (state.p2.alive) state.p2.lived = state.gameTime;

        const sway1 = Math.sin(state.gameTime * 3.1) * 7;
        const sway2 = Math.sin(state.gameTime * 3.1 + 1.4) * 7;
        state.hazards.forEach((item) => {
          item.y -= fallSpeed * dt;
          item.x += item.vx * dt;
        });
        state.hazards = state.hazards.filter((item) => item.y > -70 && item.x > -80 && item.x < WIDTH + 80);

        const strike = (jumper: Jumper, sway: number) => {
          if (!jumper.alive) return;
          const hit = state.hazards.some((item) => hitsJumper(jumper, item, sway));
          if (!hit) return;
          jumper.alive = false;
          jumper.lived = state.gameTime;
          burst(jumper.x + sway, jumper.y + 10, jumper.canopy, jumper.color);
        };
        strike(state.p1, sway1);
        strike(state.p2, sway2);

        if (!state.p1.alive || !state.p2.alive) {
          if (state.p1.alive !== state.p2.alive) state.winner = state.p1.alive ? 'p1' : 'p2';
          else {
            const gap = Math.abs(state.p1.lived - state.p2.lived);
            state.winner = gap < 0.04 ? 'draw' : state.p1.lived > state.p2.lived ? 'p1' : 'p2';
          }
          ended = true;
          cancelAnimationFrame(raf);
          endMatch(state.winner === 'p2' ? 'p2' : 'p1');
          return;
        }
      } else if (state.winner) {
        ended = true;
        cancelAnimationFrame(raf);
        endMatch(state.winner === 'p2' ? 'p2' : 'p1');
        return;
      }

      state.sparks = state.sparks.filter((spark) => {
        spark.x += spark.vx * dt;
        spark.y += spark.vy * dt;
        spark.life -= dt;
        return spark.life > 0;
      });

      const phase = easedPhase(state.gameTime);
      const anim = now / 1000;
      drawBackdrop(ctx);
      drawAmbient(ctx, state.fall, anim, phase);
      state.hazards.forEach((item) => drawHazard(ctx, item, anim));
      drawJumper(ctx, state.p1, anim, Math.sin(state.gameTime * 3.1) * 7, 0);
      drawJumper(ctx, state.p2, anim, Math.sin(state.gameTime * 3.1 + 1.4) * 7, 1.4);
      drawSparks(ctx, state.sparks);
      drawHud(ctx, state.p1, state.p2, state.gameTime);

      if (rankedWait) {
        drawBanner(ctx, rankedWait, 'MISMO CIELO    ESQUIVA Y AGUANTA', yours);
      } else if (!world && state.intro > 0) {
        const n = String(Math.max(1, Math.ceil(state.intro)));
        drawBanner(ctx, n, 'QUIEN CHOCA PIERDE    CADA 10s BAJAS MAS', yours);
      }
      if (state.winner === 'draw') {
        drawBanner(ctx, 'EMPATE', `${formatTime(state.p1.lived)} = ${formatTime(state.p2.lived)}`);
      } else if (state.winner) {
        const name = state.winner === 'p1' ? state.p1.name : state.p2.name;
        drawBanner(ctx, `${name} GANA`, `${formatTime(state.p1.lived)}  vs  ${formatTime(state.p2.lived)}`);
      }

      raf = requestAnimationFrame(update);
    };

    raf = requestAnimationFrame(update);
    return () => {
      ended = true;
      window.removeEventListener('keydown', handleKeyDown);
      window.removeEventListener('keyup', handleKeyUp);
      link?.stop();
      cancelAnimationFrame(raf);
    };
  }, [onGameEnd, matchId, botEnabled, world, youName, rivalName]);

  return (
    <canvas
      ref={canvasRef}
      width={WIDTH}
      height={HEIGHT}
      aria-label="Sky Drop"
      className="w-full max-w-full rounded-xl"
    />
  );
}
