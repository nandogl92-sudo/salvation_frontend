import { useEffect, useRef } from 'react';
import { keyHeld, otherSide, startLiveInputs, stepPlayHead, type SceneSnap } from './liveInputs';
import { makeRng, rankedCountdown, sideLabel, type SharedWorld } from './sharedWorld';

const WIDTH = 960;
const HEIGHT = 540;
const PIX = '"Press Start 2P", monospace';
const LAPS = 5;
const TRACK_W = 76;
const HALF = TRACK_W / 2;
const ORANGE = '#ff8c1a';
const COUNT_MS = 10_000;
const KO_FRAMES = 18;
const SPARK_MAX = 60;
const OIL_MAX = 3;
const OIL_WAIT_MIN = 240;
const OIL_WAIT_RAND = 300;
const OIL_TTL_MIN = 420;
const OIL_TTL_RAND = 360;
const OIL_R_MIN = 10;
const OIL_R_RAND = 8;
const OIL_FADE_IN = 30;
const OIL_FADE_OUT = 60;
const OIL_ACTIVE_FROM = 20;
const OIL_HIT_FADE = 45;
const OIL_SAFE_CAR = 110;
const OIL_SAFE_START = 140;
const OIL_SAFE_OIL = 70;
const OIL_HIT_PAD = 7;
const TRAIL_MAX = 7;
const ROAD_EDGE = (TRACK_W + 14) / 2 + 6;
const SPEED = 1.05;
const RESCUE_FRAMES = 18;
const STEP_MS = 1000 / 60;
const FIELD = {
  left: ROAD_EDGE,
  top: 56 + ROAD_EDGE,
  right: WIDTH - ROAD_EDGE,
  bottom: HEIGHT - ROAD_EDGE,
};

type Ctx = CanvasRenderingContext2D;
type Pt = { x: number; y: number };
type Side = 'p1' | 'p2';

type Sample = {
  x: number;
  y: number;
  tx: number;
  ty: number;
  nx: number;
  ny: number;
};

type Track = {
  pts: Pt[];
  cum: number[];
  total: number;
};

type Hit = {
  dist: number;
  offset: number;
  pose: Sample;
};

type Car = {
  x: number;
  y: number;
  angle: number;
  speed: number;
  progress: number;
  lane: number;
  laps: number;
  passedMid: boolean;
  recover: number;
  color: string;
  dark: string;
  light: string;
  name: string;
  trail: Pt[];
};

type Oil = {
  id: number;
  x: number;
  y: number;
  r: number;
  age: number;
  ttl: number;
  hit: boolean;
};

type Spark = {
  x: number;
  y: number;
  vx: number;
  vy: number;
  life: number;
  color: string;
};

const ART_SRC = '/slot-car-field.jpg';
const raceArt = new Image();
let raceArtReady = false;
raceArt.onload = () => {
  raceArtReady = true;
};
raceArt.src = ART_SRC;

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

const dist = (a: Pt, b: Pt) => Math.hypot(b.x - a.x, b.y - a.y);

const wrapAngle = (angle: number) => {
  while (angle > Math.PI) angle -= Math.PI * 2;
  while (angle < -Math.PI) angle += Math.PI * 2;
  return angle;
};

const segsCross = (a: Pt, b: Pt, c: Pt, d: Pt) => {
  const side = (p: Pt, q: Pt, r: Pt) => (q.y - p.y) * (r.x - q.x) - (q.x - p.x) * (r.y - q.y);
  const ab = side(a, b, c);
  const cd = side(a, b, d);
  const ef = side(c, d, a);
  const gh = side(c, d, b);
  return Math.sign(ab) !== Math.sign(cd) && Math.sign(ef) !== Math.sign(gh);
};

const smoothLoop = (pts: Pt[]) => {
  const n = pts.length;
  const next: Pt[] = [];
  for (let i = 0; i < n; i += 1) {
    const a = pts[(i + n - 1) % n];
    const b = pts[i];
    const c = pts[(i + 1) % n];
    next.push({ x: (a.x + b.x * 2 + c.x) / 4, y: (a.y + b.y * 2 + c.y) / 4 });
  }
  return next;
};

const resample = (pts: Pt[], count: number): Pt[] => {
  const n = pts.length;
  const seg: number[] = [];
  let total = 0;
  for (let i = 0; i < n; i += 1) {
    const length = dist(pts[i], pts[(i + 1) % n]);
    seg.push(length);
    total += length;
  }
  const step = total / count;
  const out: Pt[] = [];
  let i = 0;
  let along = 0;
  let target = 0;
  for (let k = 0; k < count; k += 1) {
    while (along + seg[i] < target && i < n - 1) {
      along += seg[i];
      i += 1;
    }
    const t = seg[i] === 0 ? 0 : (target - along) / seg[i];
    const a = pts[i];
    const b = pts[(i + 1) % n];
    out.push({ x: a.x + (b.x - a.x) * t, y: a.y + (b.y - a.y) * t });
    target += step;
  }
  return out;
};

const loopsCross = (pts: Pt[]) => {
  const n = pts.length;
  for (let i = 0; i < n; i += 1) {
    for (let j = i + 2; j < n; j += 1) {
      if (i === 0 && j === n - 1) continue;
      if (segsCross(pts[i], pts[(i + 1) % n], pts[j], pts[(j + 1) % n])) return true;
    }
  }
  return false;
};

const buildTrack = (pts: Pt[]): Track => {
  const cum = [0];
  for (let i = 0; i < pts.length; i += 1) {
    cum.push(cum[i] + dist(pts[i], pts[(i + 1) % pts.length]));
  }
  return { pts, cum, total: cum[cum.length - 1] };
};

const sample = (track: Track, distance: number): Sample => {
  const n = track.pts.length;
  let d = distance % track.total;
  if (d < 0) d += track.total;
  let i = 0;
  while (i < n - 1 && track.cum[i + 1] <= d) i += 1;
  const span = track.cum[i + 1] - track.cum[i] || 1;
  const t = (d - track.cum[i]) / span;
  const a = track.pts[i];
  const b = track.pts[(i + 1) % n];
  const tx = b.x - a.x;
  const ty = b.y - a.y;
  const len = Math.hypot(tx, ty) || 1;
  const ux = tx / len;
  const uy = ty / len;
  return {
    x: a.x + tx * t,
    y: a.y + ty * t,
    tx: ux,
    ty: uy,
    nx: -uy,
    ny: ux,
  };
};

const headingAt = (track: Track, distance: number) => {
  const p = sample(track, distance);
  return Math.atan2(p.ty, p.tx);
};

const curveAt = (track: Track, distance: number) => {
  const a = headingAt(track, distance);
  const b = headingAt(track, distance + 70);
  return Math.abs(wrapAngle(b - a));
};

const projectSeg = (track: Track, i: number, x: number, y: number): Hit => {
  const a = track.pts[i];
  const b = track.pts[(i + 1) % track.pts.length];
  const vx = b.x - a.x;
  const vy = b.y - a.y;
  const len2 = vx * vx + vy * vy || 1;
  let t = ((x - a.x) * vx + (y - a.y) * vy) / len2;
  if (t < 0) t = 0;
  if (t > 1) t = 1;
  const px = a.x + vx * t;
  const py = a.y + vy * t;
  const dx = x - px;
  const dy = y - py;
  const len = Math.sqrt(len2);
  const ux = vx / len;
  const uy = vy / len;
  const nx = -uy;
  const ny = ux;
  return {
    dist: track.cum[i] + t * (track.cum[i + 1] - track.cum[i]),
    offset: dx * nx + dy * ny,
    pose: { x: px, y: py, tx: ux, ty: uy, nx, ny },
  };
};

const closerHit = (x: number, y: number, a: Hit, b: Hit) => {
  const da = (a.pose.x - x) ** 2 + (a.pose.y - y) ** 2;
  const db = (b.pose.x - x) ** 2 + (b.pose.y - y) ** 2;
  return db < da ? b : a;
};

const project = (track: Track, x: number, y: number): Hit => {
  let hit = projectSeg(track, 0, x, y);
  for (let i = 1; i < track.pts.length; i += 1) {
    hit = closerHit(x, y, hit, projectSeg(track, i, x, y));
  }
  return hit;
};

const projectAround = (track: Track, x: number, y: number, around: number, span: number): Hit => {
  const n = track.pts.length;
  const total = track.total;
  let found = false;
  let hit = projectSeg(track, 0, x, y);
  for (let i = 0; i < n; i += 1) {
    const mid = (track.cum[i] + track.cum[i + 1]) * 0.5;
    let gap = Math.abs(mid - around);
    if (gap > total / 2) gap = total - gap;
    if (gap > span) continue;
    const next = projectSeg(track, i, x, y);
    hit = found ? closerHit(x, y, hit, next) : next;
    found = true;
  }
  return found ? hit : project(track, x, y);
};

const rotatePts = (pts: Pt[], start: number) => pts.slice(start).concat(pts.slice(0, start));

const sharpestTurn = (track: Track) => {
  let worst = 0;
  for (let d = 0; d < track.total; d += 16) {
    const c = curveAt(track, d);
    if (c > worst) worst = c;
  }
  return worst;
};

const startOnStraight = (track: Track): Track => {
  let best = 0;
  let bestCurve = 99;
  for (let i = 0; i < track.pts.length; i += 1) {
    const c = curveAt(track, track.cum[i]);
    if (c < bestCurve) {
      bestCurve = c;
      best = i;
    }
  }
  const earlier = (best - 6 + track.pts.length) % track.pts.length;
  return buildTrack(rotatePts(track.pts, earlier));
};

const pointOnFrame = (t: number, x0: number, y0: number, w: number, h: number, rad: number) => {
  const sw = Math.max(1, w - 2 * rad);
  const sh = Math.max(1, h - 2 * rad);
  const arc = Math.PI * 0.5 * rad;
  const perim = 2 * sw + 2 * sh + 4 * arc;
  let d = (((t % 1) + 1) % 1) * perim;
  if (d <= sw) return { x: x0 + rad + d, y: y0, nx: 0, ny: -1 };
  d -= sw;
  if (d <= arc) {
    const a = -Math.PI / 2 + d / rad;
    return { x: x0 + w - rad + Math.cos(a) * rad, y: y0 + rad + Math.sin(a) * rad, nx: Math.cos(a), ny: Math.sin(a) };
  }
  d -= arc;
  if (d <= sh) return { x: x0 + w, y: y0 + rad + d, nx: 1, ny: 0 };
  d -= sh;
  if (d <= arc) {
    const a = d / rad;
    return { x: x0 + w - rad + Math.cos(a) * rad, y: y0 + h - rad + Math.sin(a) * rad, nx: Math.cos(a), ny: Math.sin(a) };
  }
  d -= arc;
  if (d <= sw) return { x: x0 + w - rad - d, y: y0 + h, nx: 0, ny: 1 };
  d -= sw;
  if (d <= arc) {
    const a = Math.PI / 2 + d / rad;
    return { x: x0 + rad + Math.cos(a) * rad, y: y0 + h - rad + Math.sin(a) * rad, nx: Math.cos(a), ny: Math.sin(a) };
  }
  d -= arc;
  if (d <= sh) return { x: x0, y: y0 + h - rad - d, nx: -1, ny: 0 };
  d -= sh;
  const a = Math.PI + d / rad;
  return { x: x0 + rad + Math.cos(a) * rad, y: y0 + rad + Math.sin(a) * rad, nx: Math.cos(a), ny: Math.sin(a) };
};

const makeCourse = (wild: boolean, rand: () => number): Pt[] => {
  const n = 48;
  const pts: Pt[] = [];
  const x0 = FIELD.left;
  const y0 = FIELD.top;
  const w = FIELD.right - FIELD.left;
  const h = FIELD.bottom - FIELD.top;
  const rad = 40;
  const phase = wild ? rand() : 0.22;
  const dents = 5;
  for (let i = 0; i < n; i += 1) {
    const t = i / n;
    const p = pointOnFrame(t, x0, y0, w, h, rad);
    let pull = 6;
    for (let k = 0; k < dents; k += 1) {
      const center = (k + 0.18 + phase * 0.12) / dents;
      let gap = Math.abs(t - center);
      if (gap > 0.5) gap = 1 - gap;
      const wave = Math.max(0, 1 - gap / 0.09);
      const depth = 42 + (wild ? Math.sin(k * 2.1 + phase * 5) * 10 : 6);
      pull += wave * wave * depth;
    }
    let x = p.x - p.nx * pull;
    let y = p.y - p.ny * pull;
    x = Math.min(FIELD.right, Math.max(FIELD.left, x));
    y = Math.min(FIELD.bottom, Math.max(FIELD.top, y));
    pts.push({ x, y });
  }
  let loop = pts;
  loop = smoothLoop(loop);
  return resample(loop, 180);
};

const makeTrack = (rand: () => number): Track => {
  for (let attempt = 0; attempt < 16; attempt += 1) {
    const pts = makeCourse(true, rand);
    const inside = pts.every((p) => (
      p.x >= FIELD.left && p.x <= FIELD.right && p.y >= FIELD.top && p.y <= FIELD.bottom
    ));
    if (!inside || loopsCross(pts)) continue;
    const track = buildTrack(pts);
    if (track.total < 1800) continue;
    if (sharpestTurn(track) > 0.9) continue;
    return startOnStraight(track);
  }
  return startOnStraight(buildTrack(makeCourse(false, rand)));
};

const makeCar = (lane: number, color: string, dark: string, light: string, name: string): Car => ({
  x: 0,
  y: 0,
  angle: 0,
  speed: 0,
  progress: 20,
  lane,
  laps: 0,
  passedMid: false,
  recover: 0,
  color,
  dark,
  light,
  name,
  trail: [],
});

const placeCar = (car: Car, track: Track, recover: number) => {
  const start = sample(track, 20);
  car.x = start.x + start.nx * car.lane;
  car.y = start.y + start.ny * car.lane;
  car.angle = Math.atan2(start.ty, start.tx);
  car.speed = 0;
  car.progress = 20;
  car.passedMid = false;
  car.recover = recover;
};

const hitsOrange = (track: Track, x: number, y: number) => Math.abs(project(track, x, y).offset) >= HALF + 6;

// ── CHARCOS DE ACEITE (misma lógica en cliente y servidor) ───────────
const oilActive = (oil: Oil) => !oil.hit && oil.age >= OIL_ACTIVE_FROM && oil.age <= oil.ttl - OIL_FADE_OUT;

const oilUnder = (oils: Oil[], x: number, y: number) =>
  oils.find((oil) => oilActive(oil) && Math.hypot(x - oil.x, y - oil.y) < oil.r + OIL_HIT_PAD) ?? null;

const spawnOil = (oils: Oil[], track: Track, cars: Pt[], rand: () => number, id: number): boolean => {
  for (let tries = 0; tries < 6; tries += 1) {
    const d = rand() * track.total;
    if (d < OIL_SAFE_START || d > track.total - OIL_SAFE_START) continue;
    const side = (rand() - 0.5) * 2 * (HALF - 16);
    const r = OIL_R_MIN + rand() * OIL_R_RAND;
    const pose = sample(track, d);
    const x = pose.x + pose.nx * side;
    const y = pose.y + pose.ny * side;
    if (cars.some((car) => Math.hypot(car.x - x, car.y - y) < OIL_SAFE_CAR)) continue;
    if (oils.some((oil) => Math.hypot(oil.x - x, oil.y - y) < OIL_SAFE_OIL)) continue;
    oils.push({ id, x, y, r, age: 0, ttl: Math.round(OIL_TTL_MIN + rand() * OIL_TTL_RAND), hit: false });
    return true;
  }
  return false;
};

const hash = (n: number) => {
  let h = Math.imul(n | 0, 2654435761) >>> 0;
  h ^= h >>> 13;
  h = Math.imul(h, 0x5bd1e995) >>> 0;
  h ^= h >>> 15;
  return h;
};
const unitHash = (n: number, salt: number) => (hash(n * 7 + salt) % 1000) / 1000;

const pixelBlob = (ctx: Ctx, cx: number, cy: number, r: number) => {
  const step = 3;
  for (let dy = -r; dy <= r; dy += step) {
    const hw = Math.sqrt(Math.max(0, r * r - dy * dy));
    const w = Math.round(hw / step) * step * 2;
    if (w <= 0) continue;
    ctx.fillRect(Math.round(cx - w / 2), Math.round(cy + dy), w, step);
  }
};

const drawOil = (ctx: Ctx, oil: Oil, nowMs: number) => {
  const grow = Math.min(1, oil.age / OIL_FADE_IN);
  const fadeOut = Math.max(0, Math.min(1, (oil.ttl - oil.age) / OIL_FADE_OUT));
  const alpha = Math.min(grow, fadeOut);
  if (alpha <= 0) return;
  const r = oil.r * (0.6 + 0.4 * grow) * (0.85 + 0.15 * fadeOut);
  const s1 = unitHash(oil.id, 1);
  const s2 = unitHash(oil.id, 2);
  const s3 = unitHash(oil.id, 3);
  const ax = (s1 - 0.5) * r * 1.1;
  const ay = (s2 - 0.5) * r * 0.9;
  const bx = (s3 - 0.5) * -r * 1.2;
  const by = (s1 - 0.5) * r;

  ctx.globalAlpha = alpha * 0.9;
  ctx.fillStyle = '#12141b';
  pixelBlob(ctx, oil.x, oil.y, r);
  pixelBlob(ctx, oil.x + ax, oil.y + ay, r * 0.6);
  pixelBlob(ctx, oil.x + bx, oil.y + by, r * 0.45);

  const t = nowMs / 1000;
  const shimmer = 0.5 + 0.5 * Math.sin(t * 2.3 + oil.id * 1.7);
  ctx.globalAlpha = alpha * (0.3 + 0.2 * shimmer);
  paint(ctx, Math.round(oil.x - r * 0.4), Math.round(oil.y - r * 0.35), Math.round(r * 0.8), 3, '#3f4f8f');
  paint(ctx, Math.round(oil.x - r * 0.2), Math.round(oil.y - r * 0.05), Math.round(r * 0.5), 3, '#7b4e92');
  ctx.globalAlpha = alpha * (0.35 + 0.35 * shimmer);
  paint(ctx, Math.round(oil.x - r * 0.35 + shimmer * 4), Math.round(oil.y - r * 0.55), 3, 3, '#b7c3e6');
  ctx.globalAlpha = 1;
};

// ── PISTA (capa estática pre-renderizada) ────────────────────────────
const loopPath = (ctx: Ctx, pts: Pt[]) => {
  ctx.beginPath();
  ctx.moveTo(pts[0].x, pts[0].y);
  for (let i = 1; i < pts.length; i += 1) ctx.lineTo(pts[i].x, pts[i].y);
  ctx.closePath();
};

const offsetLoop = (pts: Pt[], off: number): Pt[] => pts.map((p, i) => {
  const q = pts[(i + 1) % pts.length];
  const len = Math.hypot(q.x - p.x, q.y - p.y) || 1;
  const nx = -(q.y - p.y) / len;
  const ny = (q.x - p.x) / len;
  return { x: p.x + nx * off, y: p.y + ny * off };
});

const drawTrackInto = (ctx: Ctx, track: Track, withArt: boolean) => {
  if (withArt) {
    ctx.imageSmoothingEnabled = false;
    drawCover(ctx, raceArt, 0, 0, WIDTH, HEIGHT);
  } else {
    paint(ctx, 0, 0, WIDTH, HEIGHT, '#3f8a3a');
    ctx.fillStyle = '#4ea34a';
    for (let i = 0; i < 28; i += 1) ctx.fillRect((i * 73) % WIDTH, 40 + (i * 37) % 480, 26, 12);
  }

  ctx.lineJoin = 'round';
  ctx.lineCap = 'round';
  const stroke = (pts: Pt[], width: number, color: string, dash: number[] = []) => {
    ctx.strokeStyle = color;
    ctx.lineWidth = width;
    ctx.setLineDash(dash);
    loopPath(ctx, pts);
    ctx.stroke();
    ctx.setLineDash([]);
  };
  const pts = track.pts;

  ctx.save();
  ctx.translate(0, 4);
  stroke(pts, TRACK_W + 20, 'rgba(0,0,0,0.22)');
  ctx.restore();
  stroke(pts, TRACK_W + 14, ORANGE);
  stroke(pts, TRACK_W + 14, '#c2410c', [8, 18]);
  stroke(pts, TRACK_W + 6, '#f4f4f4');
  stroke(pts, TRACK_W + 2, '#1d1f26');
  stroke(pts, TRACK_W, '#2b2d34');
  stroke(pts, TRACK_W - 12, '#3a3d46');
  stroke(offsetLoop(pts, -18), 10, 'rgba(0,0,0,0.14)');
  stroke(offsetLoop(pts, 18), 10, 'rgba(0,0,0,0.14)');

  for (let i = 0; i < pts.length; i += 1) {
    const p = pts[i];
    const q = pts[(i + 1) % pts.length];
    const len = Math.hypot(q.x - p.x, q.y - p.y) || 1;
    const nx = -(q.y - p.y) / len;
    const ny = (q.x - p.x) / len;
    const o1 = (unitHash(i, 11) - 0.5) * (TRACK_W - 16);
    const o2 = (unitHash(i, 23) - 0.5) * (TRACK_W - 16);
    paint(ctx, Math.round(p.x + nx * o1), Math.round(p.y + ny * o1), 2, 2, '#474b56');
    paint(ctx, Math.round(p.x + nx * o2), Math.round(p.y + ny * o2), 2, 2, '#24262c');
  }

  stroke(pts, 2, 'rgba(255,255,255,0.32)', [10, 12]);

  const start = sample(track, 0);
  for (let row = 0; row < 2; row += 1) {
    for (let i = 0; i < 10; i += 1) {
      const along = (i - 4.5) * 7;
      const back = (row - 0.5) * 7;
      const px = start.x + start.nx * along + start.tx * back;
      const py = start.y + start.ny * along + start.ty * back;
      paint(ctx, Math.round(px - 3), Math.round(py - 3), 7, 7, (i + row) % 2 === 0 ? '#f4f4f4' : '#111');
    }
  }

  const inCanvas = (x: number, y: number) => x > 12 && x < WIDTH - 12 && y > 72 && y < HEIGHT - 12;
  [22, 67, 112, 157].forEach((i) => {
    const p = pts[i % pts.length];
    const q = pts[(i + 1) % pts.length];
    const len = Math.hypot(q.x - p.x, q.y - p.y) || 1;
    const nx = -(q.y - p.y) / len;
    const ny = (q.x - p.x) / len;
    const x = Math.round(p.x - nx * (HALF + 26));
    const y = Math.round(p.y - ny * (HALF + 26));
    if (!inCanvas(x, y)) return;
    paint(ctx, x - 5, y - 4, 10, 10, '#15171c');
    paint(ctx, x - 3, y - 2, 6, 6, '#2a2d35');
    paint(ctx, x - 1, y, 2, 2, '#555');
    paint(ctx, x + 3, y - 7, 10, 10, '#15171c');
    paint(ctx, x + 5, y - 5, 6, 6, '#2a2d35');
    paint(ctx, x + 7, y - 3, 2, 2, '#555');
  });
  [45, 100, 140].forEach((i) => {
    const p = pts[i % pts.length];
    const q = pts[(i + 1) % pts.length];
    const len = Math.hypot(q.x - p.x, q.y - p.y) || 1;
    const nx = -(q.y - p.y) / len;
    const ny = (q.x - p.x) / len;
    const x = Math.round(p.x + nx * (HALF + 24));
    const y = Math.round(p.y + ny * (HALF + 24));
    if (!inCanvas(x, y)) return;
    paint(ctx, x - 3, y - 4, 6, 7, '#f97316');
    paint(ctx, x - 2, y - 1, 4, 1, '#fff');
    paint(ctx, x - 4, y + 3, 8, 2, '#c2410c');
  });
};

const makeTrackLayer = (track: Track, withArt: boolean) => {
  const layer = document.createElement('canvas');
  layer.width = WIDTH;
  layer.height = HEIGHT;
  const lctx = layer.getContext('2d');
  if (lctx) drawTrackInto(lctx, track, withArt);
  return layer;
};

// ── COCHES ───────────────────────────────────────────────────────────
const noteTrail = (car: Car) => {
  const bx = car.x - Math.cos(car.angle) * 12;
  const by = car.y - Math.sin(car.angle) * 12;
  const last = car.trail[0];
  if (car.recover > 0) {
    if (car.trail.length > 0) car.trail.pop();
    return;
  }
  if (last && Math.hypot(last.x - bx, last.y - by) < 1.5) return;
  car.trail.unshift({ x: bx, y: by });
  if (car.trail.length > TRAIL_MAX) car.trail.pop();
};

const drawTrail = (ctx: Ctx, car: Car) => {
  car.trail.forEach((p, i) => {
    const k = 1 - i / TRAIL_MAX;
    ctx.globalAlpha = 0.32 * k;
    const size = 2 + Math.round(k * 3);
    paint(ctx, Math.round(p.x - size / 2), Math.round(p.y - size / 2), size, size, car.color);
  });
  ctx.globalAlpha = 1;
};

const drawCar = (ctx: Ctx, car: Car, spin: number) => {
  ctx.save();
  ctx.translate(car.x, car.y);
  ctx.rotate(car.angle + spin);

  paint(ctx, -12, -4, 27, 13, 'rgba(0,0,0,0.3)');

  const tire = (x: number, y: number) => {
    paint(ctx, x, y, 8, 5, '#0f1014');
    paint(ctx, x + 1, y + 1, 6, 3, '#23252b');
    paint(ctx, x + 3, y + 2, 2, 1, '#8b909c');
  };
  tire(-12, -9);
  tire(4, -9);
  tire(-12, 4);
  tire(4, 4);

  paint(ctx, -15, -7, 30, 14, '#0b0d12');
  paint(ctx, -14, -6, 28, 12, car.dark);
  paint(ctx, -13, -5, 26, 10, car.color);

  paint(ctx, -15, -6, 2, 12, car.dark);
  paint(ctx, -16, -5, 1, 10, '#0b0d12');
  paint(ctx, -14, -5, 2, 3, '#ef4444');
  paint(ctx, -14, 2, 2, 3, '#ef4444');
  paint(ctx, -16, -1, 1, 2, '#6b7280');

  paint(ctx, -8, -3, 4, 6, '#0b0d12');
  paint(ctx, -7, -2, 3, 4, '#9fd3ff');

  paint(ctx, -4, -5, 9, 10, car.light);
  paint(ctx, -4, -1, 9, 2, car.color);
  paint(ctx, -4, -5, 9, 1, '#ffffff');

  paint(ctx, 5, -3, 4, 6, '#0b0d12');
  paint(ctx, 6, -2, 3, 4, '#bfe8ff');
  paint(ctx, 6, -2, 1, 1, '#ffffff');

  paint(ctx, 9, -5, 4, 10, car.color);
  paint(ctx, 9, -5, 4, 1, car.light);
  paint(ctx, 10, -1, 3, 2, car.dark);
  paint(ctx, 12, -5, 2, 3, '#fef08a');
  paint(ctx, 12, 2, 2, 3, '#fef08a');
  paint(ctx, 13, -1, 1, 2, '#0b0d12');

  paint(ctx, 2, -8, 2, 2, car.dark);
  paint(ctx, 2, 6, 2, 2, car.dark);

  if (car.recover === 0) paint(ctx, 14, -4, 8, 8, 'rgba(254,240,138,0.16)');

  if (car.recover > 0) {
    ctx.rotate(-(car.angle + spin));
    ctx.fillStyle = '#f5c518';
    ctx.font = `8px ${PIX}`;
    ctx.textAlign = 'center';
    ctx.fillText('FUERA', 0, -18);
  }
  ctx.restore();
};

const racePlace = (car: Car, other: Car) => {
  if (car.laps !== other.laps) return car.laps > other.laps ? '1' : '2';
  return car.progress >= other.progress ? '1' : '2';
};

const drawHud = (ctx: Ctx, p1: Car, p2: Car) => {
  paint(ctx, 0, 0, WIDTH, 56, 'rgba(12, 16, 24, 0.72)');
  paint(ctx, 8, 6, 250, 44, '#161b28');
  ctx.strokeStyle = p1.color;
  ctx.strokeRect(8, 6, 250, 44);
  paint(ctx, 702, 6, 250, 44, '#161b28');
  ctx.strokeStyle = p2.color;
  ctx.strokeRect(702, 6, 250, 44);
  paint(ctx, 330, 6, 300, 44, '#120c1c');
  ctx.strokeStyle = '#f5c518';
  ctx.strokeRect(330, 6, 300, 44);

  ctx.font = `9px ${PIX}`;
  ctx.textAlign = 'left';
  ctx.fillStyle = p1.color;
  ctx.fillText(p1.name, 18, 24);
  ctx.fillStyle = '#f4f7fb';
  ctx.font = `14px ${PIX}`;
  ctx.fillText(`${p1.laps}/${LAPS}`, 18, 44);
  ctx.font = `7px ${PIX}`;
  ctx.fillStyle = '#9aa6b8';
  ctx.fillText(`POS ${racePlace(p1, p2)}`, 110, 44);

  ctx.textAlign = 'right';
  ctx.font = `9px ${PIX}`;
  ctx.fillStyle = p2.color;
  ctx.fillText(p2.name, 942, 24);
  ctx.fillStyle = '#f4f7fb';
  ctx.font = `14px ${PIX}`;
  ctx.fillText(`${p2.laps}/${LAPS}`, 942, 44);
  ctx.font = `7px ${PIX}`;
  ctx.fillStyle = '#9aa6b8';
  ctx.fillText(`POS ${racePlace(p2, p1)}`, 850, 44);

  ctx.textAlign = 'center';
  ctx.fillStyle = '#f5c518';
  ctx.font = `11px ${PIX}`;
  ctx.fillText('SLOT CAR', 480, 26);
  ctx.fillStyle = '#f4f7fb';
  ctx.font = `7px ${PIX}`;
  ctx.fillText(`${LAPS} VUELTAS`, 480, 44);
  ctx.textAlign = 'left';
};

const drawBanner = (ctx: Ctx, title: string, sub: string) => {
  paint(ctx, 150, 200, 660, 140, 'rgba(10, 12, 20, 0.86)');
  ctx.strokeStyle = '#f5c518';
  ctx.lineWidth = 3;
  ctx.strokeRect(150, 200, 660, 140);
  ctx.textAlign = 'center';
  ctx.fillStyle = '#f5c518';
  ctx.font = `22px ${PIX}`;
  ctx.fillText(title, 480, 258);
  ctx.fillStyle = '#f4f7fb';
  ctx.font = `9px ${PIX}`;
  ctx.fillText(sub, 480, 298);
  ctx.textAlign = 'left';
};

const burst = (sparks: Spark[], x: number, y: number, color: string) => {
  for (let i = 0; i < 12; i += 1) {
    if (sparks.length >= SPARK_MAX) return;
    sparks.push({
      x,
      y,
      vx: (Math.random() - 0.5) * 4,
      vy: (Math.random() - 0.8) * 3,
      life: 14 + (i % 3) * 4,
      color: i % 4 === 3 ? '#9aa0ad' : color,
    });
  }
};

const splash = (sparks: Spark[], x: number, y: number) => {
  for (let i = 0; i < 14; i += 1) {
    if (sparks.length >= SPARK_MAX) return;
    const angle = (Math.PI * 2 * i) / 14 + Math.random() * 0.4;
    const speed = 1.5 + Math.random() * 3;
    sparks.push({
      x,
      y,
      vx: Math.cos(angle) * speed,
      vy: Math.sin(angle) * speed,
      life: 16 + (i % 4) * 3,
      color: i % 3 === 0 ? '#5b6b9a' : '#14161c',
    });
  }
};

export default function Racing({
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

    const openAt = Date.now();
    let ended = false;
    const endMatch = (winner: 'p1' | 'p2') => {
      onGameEnd(winner, matchId);
    };
    let acc = 0;
    let raf = 0;
    let playHead = 0;
    let lastStamp = performance.now();
    const rand = world ? makeRng(world.seed) : Math.random;
    const you = world?.localSide ?? 'p1';
    const them = otherSide(you);
    const link = world ? startLiveInputs(world.matchId, world.localUserId) : null;
    const track = makeTrack(rand);
    const state = {
      p1: makeCar(-18, '#ec4899', '#9d174d', '#fbcfe8', sideLabel(world, 'p1', 'FUCSIA', { you: youName, rival: rivalName })),
      p2: makeCar(18, '#22d3ee', '#0e7490', '#cffafe', sideLabel(world, 'p2', 'CIAN', { you: youName, rival: rivalName })),
      keys: {} as Record<string, boolean>,
      frames: 0,
      winner: null as Side | null,
      ko: 0,
      sparks: [] as Spark[],
      oils: [] as Oil[],
      oilWait: OIL_WAIT_MIN,
      nextOil: 1,
      splashed: new Set<number>(),
    };
    placeCar(state.p1, track, 0);
    placeCar(state.p2, track, 0);
    if (link) link.setLocalKeys(state.keys);
    let trackLayer = makeTrackLayer(track, raceArtReady);
    let layerHasArt = raceArtReady;
    const drawWorld = () => {
      if (layerHasArt !== raceArtReady) {
        trackLayer = makeTrackLayer(track, raceArtReady);
        layerHasArt = raceArtReady;
      }
      ctx.drawImage(trackLayer, 0, 0);
    };

    const stepOils = () => {
      state.oilWait -= 1;
      if (state.oilWait <= 0) {
        if (state.oils.length < OIL_MAX && spawnOil(state.oils, track, [state.p1, state.p2], rand, state.nextOil)) {
          state.nextOil += 1;
        }
        state.oilWait = OIL_WAIT_MIN + Math.floor(rand() * OIL_WAIT_RAND);
      }
      state.oils.forEach((oil) => {
        oil.age += 1;
      });
      state.oils = state.oils.filter((oil) => oil.age < oil.ttl);
    };

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

    const rescueCar = (car: Car) => {
      burst(state.sparks, car.x, car.y, car.light);
      const here = project(track, car.x, car.y);
      const pose = sample(track, here.dist);
      car.x = pose.x + pose.nx * car.lane;
      car.y = pose.y + pose.ny * car.lane;
      car.angle = Math.atan2(pose.ty, pose.tx);
      car.speed = SPEED;
      car.progress = here.dist;
      car.recover = RESCUE_FRAMES;
    };

    const drive = (car: Car, steer: number) => {
      if (car.recover > 0) {
        car.recover -= 1;
        car.speed = 0;
        return;
      }
      car.speed = SPEED;
      car.angle += steer * (0.04 + car.speed * 0.013);
      car.x += Math.cos(car.angle) * car.speed * 2.6;
      car.y += Math.sin(car.angle) * car.speed * 2.6;

      if (hitsOrange(track, car.x, car.y)) {
        rescueCar(car);
        return;
      }
      const oil = oilUnder(state.oils, car.x, car.y);
      if (oil) {
        oil.hit = true;
        oil.ttl = Math.min(oil.ttl, oil.age + OIL_HIT_FADE);
        splash(state.sparks, oil.x, oil.y);
        rescueCar(car);
        return;
      }

      const prev = car.progress;
      const hit = projectAround(track, car.x, car.y, car.progress, 130);
      car.progress = hit.dist;
      if (prev < track.total * 0.5 && hit.dist >= track.total * 0.5) car.passedMid = true;
      if (prev > track.total * 0.8 && hit.dist < track.total * 0.2) {
        if (car.passedMid) car.laps += 1;
        car.passedMid = false;
      }
    };

    const botSteer = (car: Car) => {
      const ahead = sample(track, car.progress + 90);
      const want = Math.atan2(ahead.y - car.y, ahead.x - car.x);
      const err = wrapAngle(want - car.angle);
      const steer = err > 0.05 ? 1 : err < -0.05 ? -1 : 0;
      drive(car, steer);
    };

    const applyRace = (scene: SceneSnap) => {
      const put = (car: Car, actor: SceneSnap['p1']) => {
        car.x = actor.x;
        car.y = actor.y;
        car.angle = actor.v;
        car.laps = actor.n;
        car.recover = actor.a;
        car.progress = actor.p;
      };
      put(state.p1, scene.p1);
      put(state.p2, scene.p2);
      state.oils = scene.items.map((item) => ({
        id: item.id,
        x: item.x,
        y: item.y,
        r: item.w,
        age: item.h,
        ttl: item.v,
        hit: item.k === 1,
      }));
      state.oils.forEach((oil) => {
        if (!oil.hit || state.splashed.has(oil.id)) return;
        state.splashed.add(oil.id);
        splash(state.sparks, oil.x, oil.y);
      });
      if ((scene.winner === 'p1' || scene.winner === 'p2') && !state.winner) {
        state.winner = scene.winner;
        state.ko = KO_FRAMES;
      }
    };

    const update = () => {
      if (ended) return;
      const now = performance.now();
      const dt = Math.min(50, Math.max(0, now - lastStamp));
      lastStamp = now;
      if (world && link) {
        link.setLocalKeys(state.keys);
        playHead = stepPlayHead(playHead, dt, link.sceneAt(), link.serverNow());
        const scene = link.readScene(playHead);
        if (scene?.kind === 'race') applyRace(scene);
        state.frames += 1;
        state.sparks = state.sparks.filter((spark) => {
          spark.x += spark.vx;
          spark.y += spark.vy;
          spark.life -= 1;
          return spark.life > 0;
        });
        noteTrail(state.p1);
        noteTrail(state.p2);
        drawWorld();
        state.oils.forEach((oil) => drawOil(ctx, oil, now));
        drawTrail(ctx, state.p1);
        drawTrail(ctx, state.p2);
        const spin1 = state.p1.recover > 0 ? state.frames * 0.4 : 0;
        const spin2 = state.p2.recover > 0 ? state.frames * 0.4 : 0;
        drawCar(ctx, state.p1, spin1);
        drawCar(ctx, state.p2, spin2);
        state.sparks.forEach((spark) => {
          paint(ctx, Math.round(spark.x), Math.round(spark.y), 3, 3, spark.color);
        });
        drawHud(ctx, state.p1, state.p2);
        const rankedWait = rankedCountdown(world.startAt, link.serverNow());
        if (rankedWait) drawBanner(ctx, rankedWait, 'MISMO CIRCUITO    FLECHA IZQUIERDA Y DERECHA GIRAN');
        if (state.winner) {
          ended = true;
          cancelAnimationFrame(raf);
          endMatch(state.winner);
          return;
        }
        raf = requestAnimationFrame(update);
        return;
      }
      acc += dt;
      const rankedWait = world ? rankedCountdown(world.startAt) : null;
      const localWait = world ? null : rankedCountdown(openAt + COUNT_MS);
      let guard = 0;
      while (acc >= STEP_MS && guard < 4) {
        acc -= STEP_MS;
        guard += 1;
        state.frames += 1;
        const racing = !rankedWait && !localWait && !state.winner;

        if (racing) {
        stepOils();
        if (world) {
          const drivePad = (side: Side, keys: Record<string, boolean>) => {
            const car = side === 'p1' ? state.p1 : state.p2;
            const steer = (keyHeld(keys, 'ArrowRight') ? 1 : 0) - (keyHeld(keys, 'ArrowLeft') ? 1 : 0);
            drive(car, steer);
          };
          link?.setLocalKeys(state.keys);
          drivePad(you, state.keys);
          drivePad(them, link?.readRivalKeys() ?? {});
        } else {
          const p1Steer = (state.keys['ArrowRight'] ? 1 : 0) - (state.keys['ArrowLeft'] ? 1 : 0);
          drive(state.p1, p1Steer);
          if (botEnabled) botSteer(state.p2);
          else {
            const p2Steer = (state.keys['ArrowRight'] ? 1 : 0) - (state.keys['ArrowLeft'] ? 1 : 0);
            drive(state.p2, p2Steer);
          }
        }
          if (state.p1.laps >= LAPS) state.winner = 'p1';
          else if (state.p2.laps >= LAPS) state.winner = 'p2';
          if (state.winner) state.ko = KO_FRAMES;
        }

        state.sparks = state.sparks.filter((spark) => {
          spark.x += spark.vx;
          spark.y += spark.vy;
          spark.life -= 1;
          return spark.life > 0;
        });
      }

      noteTrail(state.p1);
      noteTrail(state.p2);
      drawWorld();
      state.oils.forEach((oil) => drawOil(ctx, oil, now));
      drawTrail(ctx, state.p1);
      drawTrail(ctx, state.p2);
      const spin1 = state.p1.recover > 0 ? state.frames * 0.4 : 0;
      const spin2 = state.p2.recover > 0 ? state.frames * 0.4 : 0;
      drawCar(ctx, state.p1, spin1);
      drawCar(ctx, state.p2, spin2);
      state.sparks.forEach((spark) => {
        paint(ctx, Math.round(spark.x), Math.round(spark.y), 3, 3, spark.color);
      });
      drawHud(ctx, state.p1, state.p2);

      if (rankedWait) {
        drawBanner(ctx, rankedWait, 'MISMO CIRCUITO    FLECHA IZQUIERDA Y DERECHA GIRAN');
      } else if (localWait) {
        drawBanner(ctx, localWait, 'FLECHA IZQUIERDA Y DERECHA GIRAN');
      }
      if (state.winner) {
        ended = true;
        cancelAnimationFrame(raf);
        endMatch(state.winner);
        return;
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
      aria-label="Slot Car Racing"
      className="w-full max-w-full rounded-xl"
    />
  );
}
