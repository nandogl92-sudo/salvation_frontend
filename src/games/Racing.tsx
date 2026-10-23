import { useEffect, useRef } from 'react';

const WIDTH = 960;
const HEIGHT = 540;
const PIX = '"Press Start 2P", monospace';
const LAPS = 5;
const TRACK_W = 58;
const HALF = TRACK_W / 2;
const COUNT_FRAMES = 180;
const KO_FRAMES = 100;
const SPARK_MAX = 36;

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

type Car = {
  dist: number;
  offset: number;
  lane: number;
  speed: number;
  laps: number;
  passedMid: boolean;
  recover: number;
  color: string;
  dark: string;
  light: string;
  name: string;
};

type Spark = {
  x: number;
  y: number;
  vx: number;
  vy: number;
  life: number;
  color: string;
};

const paint = (ctx: Ctx, x: number, y: number, w: number, h: number, color: string) => {
  ctx.fillStyle = color;
  ctx.fillRect(x, y, w, h);
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

const makeOval = (wild: boolean): Pt[] => {
  const n = 20;
  const pts: Pt[] = [];
  const rx0 = wild ? 270 + Math.random() * 70 : 318;
  const ry0 = wild ? 128 + Math.random() * 36 : 152;
  const phase = Math.random() * Math.PI * 2;
  for (let i = 0; i < n; i += 1) {
    const a = (i / n) * Math.PI * 2 - Math.PI / 2;
    const jitter = wild ? 1 : 0;
    const rx = rx0 + (Math.random() * 2 - 1) * 28 * jitter;
    const ry = ry0 + (Math.random() * 2 - 1) * 16 * jitter;
    const bump = wild ? Math.sin(i * 0.7 + phase) * 26 : 0;
    pts.push({
      x: 480 + Math.cos(a) * (rx + bump),
      y: 300 + Math.sin(a) * (ry + bump * 0.5),
    });
  }
  let loop = pts;
  for (let s = 0; s < 5; s += 1) loop = smoothLoop(loop);
  return resample(loop, 120);
};

const buildTrack = (pts: Pt[]): Track => {
  const cum = [0];
  for (let i = 0; i < pts.length; i += 1) {
    cum.push(cum[i] + dist(pts[i], pts[(i + 1) % pts.length]));
  }
  return { pts, cum, total: cum[cum.length - 1] };
};

const rotatePts = (pts: Pt[], start: number) => pts.slice(start).concat(pts.slice(0, start));

const sharpestTurn = (track: Track) => {
  let worst = 0;
  for (let d = 0; d < track.total; d += 18) {
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
  return buildTrack(rotatePts(track.pts, best));
};

const makeTrack = (): Track => {
  for (let attempt = 0; attempt < 14; attempt += 1) {
    const pts = makeOval(true);
    const inside = pts.every((p) => p.x > 70 && p.x < 890 && p.y > 118 && p.y < 510);
    if (!inside || loopsCross(pts)) continue;
    let track = buildTrack(pts);
    if (track.total < 1400) continue;
    if (sharpestTurn(track) > 0.72) continue;
    return startOnStraight(track);
  }
  return startOnStraight(buildTrack(makeOval(false)));
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

const makeCar = (lane: number, color: string, dark: string, light: string, name: string): Car => ({
  dist: 12,
  offset: lane,
  lane,
  speed: 0,
  laps: 0,
  passedMid: false,
  recover: 0,
  color,
  dark,
  light,
  name,
});

const drawWorld = (ctx: Ctx, track: Track) => {
  paint(ctx, 0, 0, WIDTH, HEIGHT, '#3f8a3a');
  paint(ctx, 0, 0, WIDTH, 96, '#2f6b32');
  ctx.fillStyle = '#4ea34a';
  for (let i = 0; i < 18; i += 1) {
    const x = 30 + (i * 53) % WIDTH;
    const y = 40 + (i * 29) % 80;
    ctx.fillRect(x, y, 22, 10);
  }
  paint(ctx, 24, 118, 86, 46, '#7a2e32');
  paint(ctx, 28, 122, 18, 14, '#f4f7fb');
  paint(ctx, 50, 122, 18, 14, '#2563eb');
  paint(ctx, 72, 122, 18, 14, '#f5c518');
  paint(ctx, 850, 118, 86, 46, '#7a2e32');
  paint(ctx, 854, 122, 18, 14, '#e11d48');
  paint(ctx, 876, 122, 18, 14, '#f4f7fb');
  paint(ctx, 898, 122, 18, 14, '#2563eb');

  ctx.lineJoin = 'round';
  ctx.lineCap = 'round';
  const strokeLoop = (width: number, color: string) => {
    ctx.strokeStyle = color;
    ctx.lineWidth = width;
    ctx.beginPath();
    ctx.moveTo(track.pts[0].x, track.pts[0].y);
    for (let i = 1; i < track.pts.length; i += 1) ctx.lineTo(track.pts[i].x, track.pts[i].y);
    ctx.closePath();
    ctx.stroke();
  };
  strokeLoop(TRACK_W + 16, '#d9d9d9');
  strokeLoop(TRACK_W + 10, '#c1121f');
  strokeLoop(TRACK_W + 4, '#f4f4f4');
  strokeLoop(TRACK_W, '#2b2d34');
  strokeLoop(TRACK_W - 10, '#3a3d46');
  strokeLoop(6, '#1a1c22');
  strokeLoop(2, '#6a6e78');

  const start = sample(track, 0);
  for (let i = 0; i < 8; i += 1) {
    const along = (i - 3.5) * 6;
    const px = start.x + start.nx * along;
    const py = start.y + start.ny * along;
    paint(ctx, px - 4, py - 4, 8, 8, i % 2 === 0 ? '#f4f4f4' : '#111');
  }

  ctx.strokeStyle = 'rgba(255,255,255,0.35)';
  ctx.lineWidth = 2;
  ctx.setLineDash([10, 12]);
  ctx.beginPath();
  ctx.moveTo(track.pts[0].x, track.pts[0].y);
  for (let i = 1; i < track.pts.length; i += 1) ctx.lineTo(track.pts[i].x, track.pts[i].y);
  ctx.closePath();
  ctx.stroke();
  ctx.setLineDash([]);
};

const drawCar = (ctx: Ctx, pose: Sample, car: Car, spin: number) => {
  const x = pose.x + pose.nx * car.offset;
  const y = pose.y + pose.ny * car.offset;
  const angle = Math.atan2(pose.ty, pose.tx) + spin;
  ctx.save();
  ctx.translate(x, y);
  ctx.rotate(angle);
  paint(ctx, -9, -6, 20, 14, 'rgba(0,0,0,0.28)');
  paint(ctx, -12, -8, 8, 5, '#1a1a1a');
  paint(ctx, 4, -8, 8, 5, '#1a1a1a');
  paint(ctx, -12, 4, 8, 5, '#1a1a1a');
  paint(ctx, 4, 4, 8, 5, '#1a1a1a');
  paint(ctx, -14, -6, 28, 12, car.dark);
  paint(ctx, -12, -4, 24, 8, car.color);
  paint(ctx, 2, -3, 8, 6, car.light);
  paint(ctx, -10, -2, 6, 4, '#dbeafe');
  if (car.recover > 0) {
    ctx.rotate(-angle);
    ctx.fillStyle = '#f5c518';
    ctx.font = `8px ${PIX}`;
    ctx.textAlign = 'center';
    ctx.fillText('FUERA', 0, -18);
  }
  ctx.restore();
};

const racePlace = (car: Car, other: Car) => {
  if (car.laps !== other.laps) return car.laps > other.laps ? '1' : '2';
  return car.dist >= other.dist ? '1' : '2';
};

const drawHud = (ctx: Ctx, p1: Car, p2: Car) => {
  paint(ctx, 0, 0, WIDTH, 92, 'rgba(12, 16, 24, 0.78)');
  paint(ctx, 12, 10, 280, 72, '#161b28');
  ctx.strokeStyle = p1.color;
  ctx.strokeRect(12, 10, 280, 72);
  paint(ctx, 668, 10, 280, 72, '#161b28');
  ctx.strokeStyle = p2.color;
  ctx.strokeRect(668, 10, 280, 72);
  paint(ctx, 330, 10, 300, 72, '#120c1c');
  ctx.strokeStyle = '#f5c518';
  ctx.strokeRect(330, 10, 300, 72);

  ctx.font = `10px ${PIX}`;
  ctx.textAlign = 'left';
  ctx.fillStyle = p1.color;
  ctx.fillText(p1.name, 24, 36);
  ctx.fillStyle = '#f4f7fb';
  ctx.font = `16px ${PIX}`;
  ctx.fillText(`${p1.laps}/${LAPS}`, 24, 66);
  ctx.font = `7px ${PIX}`;
  ctx.fillStyle = '#9aa6b8';
  ctx.fillText(`VUELTAS  ${racePlace(p1, p2)}o`, 120, 66);

  ctx.textAlign = 'right';
  ctx.font = `10px ${PIX}`;
  ctx.fillStyle = p2.color;
  ctx.fillText(p2.name, 936, 36);
  ctx.fillStyle = '#f4f7fb';
  ctx.font = `16px ${PIX}`;
  ctx.fillText(`${p2.laps}/${LAPS}`, 936, 66);
  ctx.font = `7px ${PIX}`;
  ctx.fillStyle = '#9aa6b8';
  ctx.fillText(`${racePlace(p2, p1)}o  VUELTAS`, 820, 66);

  ctx.textAlign = 'center';
  ctx.fillStyle = '#f5c518';
  ctx.font = `12px ${PIX}`;
  ctx.fillText('SLOT CAR', 480, 40);
  ctx.fillStyle = '#f4f7fb';
  ctx.font = `8px ${PIX}`;
  ctx.fillText(`${LAPS} VUELTAS`, 480, 64);
  ctx.textAlign = 'left';
};

const drawBanner = (ctx: Ctx, title: string, sub: string) => {
  paint(ctx, 170, 200, 620, 140, 'rgba(10, 12, 20, 0.86)');
  ctx.strokeStyle = '#f5c518';
  ctx.lineWidth = 3;
  ctx.strokeRect(170, 200, 620, 140);
  ctx.textAlign = 'center';
  ctx.fillStyle = '#f5c518';
  ctx.font = `22px ${PIX}`;
  ctx.fillText(title, 480, 258);
  ctx.fillStyle = '#f4f7fb';
  ctx.font = `10px ${PIX}`;
  ctx.fillText(sub, 480, 298);
  ctx.textAlign = 'left';
};

const burst = (sparks: Spark[], x: number, y: number, color: string) => {
  for (let i = 0; i < 8; i += 1) {
    if (sparks.length >= SPARK_MAX) return;
    sparks.push({
      x,
      y,
      vx: (Math.random() - 0.5) * 4,
      vy: (Math.random() - 0.8) * 3,
      life: 14,
      color,
    });
  }
};

export default function Racing({
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
    void document.fonts.load(`10px ${PIX}`);

    let raf = 0;
    const track = makeTrack();
    const state = {
      p1: makeCar(-12, '#e11d48', '#9f1239', '#fecdd3', 'RED SLOT'),
      p2: makeCar(12, '#2563eb', '#1e3a8a', '#bfdbfe', 'BLUE SLOT'),
      keys: {} as Record<string, boolean>,
      frames: 0,
      winner: null as Side | null,
      ko: 0,
      sparks: [] as Spark[],
    };

    const handleKeyDown = (event: KeyboardEvent) => {
      state.keys[event.key] = true;
    };
    const handleKeyUp = (event: KeyboardEvent) => {
      state.keys[event.key] = false;
    };
    window.addEventListener('keydown', handleKeyDown);
    window.addEventListener('keyup', handleKeyUp);

    const drive = (car: Car, gas: boolean, brake: boolean, steer: number) => {
      if (car.recover > 0) {
        car.recover -= 1;
        car.speed = 0;
        return;
      }
      const curve = Math.max(curveAt(track, car.dist), curveAt(track, car.dist + 55));
      if (gas) car.speed += 0.1;
      if (brake) car.speed -= 0.18;
      car.speed -= 0.016 + Math.min(curve, 0.5) * 0.06;
      if (gas && car.speed < 1.35) car.speed = 1.35;
      if (car.speed < 0) car.speed = 0;
      if (car.speed > 5.1) car.speed = 5.1;
      if (car.speed > 0.4) car.offset += steer * 0.95;
      const pose = sample(track, car.dist);
      const offRoad = Math.abs(car.offset) > HALF - 7;
      const hopped = curve > 0.58 && car.speed > 4.4;
      if (offRoad || hopped) {
        burst(state.sparks, pose.x + pose.nx * car.offset, pose.y + pose.ny * car.offset, car.light);
        car.dist = 12;
        car.offset = car.lane;
        car.speed = 0;
        car.passedMid = false;
        car.recover = 40;
        return;
      }
      const prev = car.dist;
      car.dist += car.speed * 3.4;
      if (car.dist >= track.total) {
        car.dist -= track.total;
        if (car.passedMid) car.laps += 1;
        car.passedMid = false;
      }
      if (prev < track.total * 0.5 && car.dist >= track.total * 0.5) car.passedMid = true;
    };

    const update = () => {
      state.frames += 1;
      const racing = state.frames >= COUNT_FRAMES && !state.winner;

      if (racing) {
        const p1Steer = (state.keys['d'] || state.keys['D'] ? 1 : 0) - (state.keys['a'] || state.keys['A'] ? 1 : 0);
        drive(
          state.p1,
          state.keys['w'] || state.keys['W'],
          state.keys['s'] || state.keys['S'],
          p1Steer,
        );
        if (botEnabled) {
          const curve = Math.max(curveAt(track, state.p2.dist), curveAt(track, state.p2.dist + 70));
          const gas = curve < 0.32 && state.p2.speed < 4.2;
          const brake = curve > 0.4 || state.p2.speed > 4.5;
          const steer = state.p2.offset > 13 ? -1 : state.p2.offset < 11 ? 1 : 0;
          drive(state.p2, gas, brake, steer);
        } else {
          const p2Steer = (state.keys['ArrowRight'] ? 1 : 0) - (state.keys['ArrowLeft'] ? 1 : 0);
          drive(state.p2, Boolean(state.keys['ArrowUp']), Boolean(state.keys['ArrowDown']), p2Steer);
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

      drawWorld(ctx, track);
      const spin1 = state.p1.recover > 0 ? state.frames * 0.4 : 0;
      const spin2 = state.p2.recover > 0 ? state.frames * 0.4 : 0;
      drawCar(ctx, sample(track, state.p1.dist), state.p1, spin1);
      drawCar(ctx, sample(track, state.p2.dist), state.p2, spin2);
      state.sparks.forEach((spark) => {
        paint(ctx, spark.x, spark.y, 3, 3, spark.color);
      });
      drawHud(ctx, state.p1, state.p2);

      if (state.frames < COUNT_FRAMES) {
        const left = COUNT_FRAMES - state.frames;
        const n = left > 120 ? '3' : left > 60 ? '2' : left > 18 ? '1' : 'GO';
        drawBanner(ctx, n, 'P1 WASD   P2 FLECHAS   5 VUELTAS');
      }
      if (state.winner) {
        const name = state.winner === 'p1' ? state.p1.name : state.p2.name;
        drawBanner(ctx, 'META', `${name} GANA`);
        state.ko -= 1;
        if (state.ko <= 0) {
          onGameEnd(state.winner);
          return;
        }
      }

      raf = requestAnimationFrame(update);
    };

    raf = requestAnimationFrame(update);
    return () => {
      window.removeEventListener('keydown', handleKeyDown);
      window.removeEventListener('keyup', handleKeyUp);
      cancelAnimationFrame(raf);
    };
  }, [onGameEnd, botEnabled]);

  return (
    <canvas
      ref={canvasRef}
      width={WIDTH}
      height={HEIGHT}
      aria-label="Slot Car Racing"
      className="w-full max-w-full rounded-xl [image-rendering:pixelated]"
    />
  );
}
