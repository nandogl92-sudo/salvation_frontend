import { useEffect, useRef } from 'react';
import { keyHeld, otherSide, replayInputs, startLiveInputs, stepPlayHead, type SceneSnap } from './liveInputs';
import { makeRng, rankedCountdown, sideLabel, type SharedWorld } from './sharedWorld';

const WIDTH = 960;
const HEIGHT = 540;
const PIX = '"Press Start 2P", monospace';
const FIELD = { top: 58, bottom: 528 };
const INTRO_S = 2.8;
const KO_S = 3.2;
const GRAVITY = 860;
const FLAP = -400;
const FLAP_GAP = 0.14;
const MAX_FALL = 500;
const START_SIZE = 16;
const GROW_STEP = 5;
const GROW_EVERY = 10;
const MAX_GROWS = 6;
const RING_THICK = 12;
const SCROLL0 = 210;
const SCROLL_GAIN = 7;
const SCROLL_MAX = 330;

type Ctx = CanvasRenderingContext2D;
type Side = 'p1' | 'p2';

type PlaneUnit = {
  x: number;
  y: number;
  vy: number;
  size: number;
  grows: number;
  score: number;
  alive: boolean;
  lastFlap: number;
  flapReady: boolean;
  color: string;
  dark: string;
  name: string;
};

type Ring = {
  id: number;
  x: number;
  y: number;
  inner: number;
  outer: number;
  seen: Record<Side, boolean>;
};

type Spark = { x: number; y: number; vx: number; vy: number; life: number; max: number; color: string };
type Cloud = { x: number; y: number; w: number; h: number; v: number };

const paint = (ctx: Ctx, x: number, y: number, w: number, h: number, color: string) => {
  ctx.fillStyle = color;
  ctx.fillRect(x, y, w, h);
};

const makePlane = (x: number, color: string, dark: string, name: string): PlaneUnit => ({
  x,
  y: 270,
  vy: 0,
  size: START_SIZE,
  grows: 0,
  score: 0,
  alive: true,
  lastFlap: -1,
  flapReady: true,
  color,
  dark,
  name,
});

const shadeTowardBlack = (hex: string, amount: number) => {
  const t = Math.max(0, Math.min(1, amount));
  const n = parseInt(hex.replace('#', ''), 16);
  const keep = 1 - t;
  const r = Math.round(((n >> 16) & 255) * keep);
  const g = Math.round(((n >> 8) & 255) * keep);
  const b = Math.round((n & 255) * keep);
  return `rgb(${r}, ${g}, ${b})`;
};

const atRing = (plane: PlaneUnit, ring: Ring) => Math.abs(plane.x - ring.x) <= plane.size + RING_THICK;

const inHole = (plane: PlaneUnit, ring: Ring) => Math.abs(plane.y - ring.y) + plane.size <= ring.inner;

const outsideRing = (plane: PlaneUnit, ring: Ring) => Math.abs(plane.y - ring.y) - plane.size >= ring.outer;

const hitsRim = (plane: PlaneUnit, ring: Ring) => atRing(plane, ring) && !inHole(plane, ring) && !outsideRing(plane, ring);

const canPass = (plane: PlaneUnit, ring: Ring) => ring.inner > plane.size + 8;

const drawSky = (ctx: Ctx, clouds: Cloud[]) => {
  const sky = ctx.createLinearGradient(0, 0, 0, HEIGHT);
  sky.addColorStop(0, '#3b82c4');
  sky.addColorStop(0.55, '#7ec8ea');
  sky.addColorStop(1, '#dbeafe');
  ctx.fillStyle = sky;
  ctx.fillRect(0, 0, WIDTH, HEIGHT);
  clouds.forEach((cloud) => {
    ctx.fillStyle = 'rgba(255,255,255,0.72)';
    paint(ctx, cloud.x, cloud.y, cloud.w, cloud.h, 'rgba(255,255,255,0.72)');
    paint(ctx, cloud.x + cloud.w * 0.28, cloud.y - cloud.h * 0.45, cloud.w * 0.55, cloud.h * 0.9, 'rgba(255,255,255,0.8)');
  });
  paint(ctx, 0, FIELD.bottom, WIDTH, HEIGHT - FIELD.bottom, '#65a30d');
  paint(ctx, 0, FIELD.bottom, WIDTH, 4, '#4d7c0f');
};

const drawRing = (ctx: Ctx, ring: Ring) => {
  const warn = ring.inner < 28;
  ctx.beginPath();
  ctx.arc(ring.x, ring.y, ring.outer, 0, Math.PI * 2);
  ctx.arc(ring.x, ring.y, ring.inner, 0, Math.PI * 2, true);
  ctx.fillStyle = warn ? '#ef4444' : '#f5c518';
  ctx.fill();
  ctx.beginPath();
  ctx.arc(ring.x, ring.y, ring.outer, 0, Math.PI * 2);
  ctx.arc(ring.x, ring.y, ring.inner + 3, 0, Math.PI * 2, true);
  ctx.fillStyle = warn ? '#7f1d1d' : '#b45309';
  ctx.fill();
  ctx.beginPath();
  ctx.arc(ring.x - 6, ring.y - 8, Math.max(4, ring.inner * 0.35), 0, Math.PI * 2);
  ctx.fillStyle = 'rgba(255,255,255,0.28)';
  ctx.fill();
};

const drawPlane = (ctx: Ctx, plane: PlaneUnit) => {
  if (!plane.alive) return;
  const t = plane.grows / MAX_GROWS;
  const body = shadeTowardBlack(plane.color, t);
  const shade = shadeTowardBlack(plane.dark, t);
  const tilt = Math.max(-0.55, Math.min(0.7, plane.vy / 520));
  const s = plane.size / 12;
  ctx.save();
  ctx.translate(plane.x, plane.y);
  ctx.rotate(tilt);
  ctx.scale(s, s);
  ctx.fillStyle = shade;
  ctx.beginPath();
  ctx.moveTo(-16, 2);
  ctx.lineTo(-6, 10);
  ctx.lineTo(4, 6);
  ctx.lineTo(-8, 2);
  ctx.closePath();
  ctx.fill();
  ctx.fillStyle = body;
  ctx.beginPath();
  ctx.moveTo(-18, 0);
  ctx.lineTo(16, 0);
  ctx.lineTo(10, 6);
  ctx.lineTo(-12, 6);
  ctx.closePath();
  ctx.fill();
  ctx.beginPath();
  ctx.moveTo(-4, 0);
  ctx.lineTo(6, -10);
  ctx.lineTo(10, 0);
  ctx.closePath();
  ctx.fill();
  ctx.fillStyle = t > 0.7 ? '#111111' : '#e2e8f0';
  ctx.fillRect(6, -2, 5, 3);
  ctx.fillStyle = '#111111';
  ctx.fillRect(-16, -3, 5, 6);
  ctx.restore();
};

const drawHud = (ctx: Ctx, p1: PlaneUnit, p2: PlaneUnit) => {
  paint(ctx, 0, 0, WIDTH, 52, '#0f2744');
  ctx.textAlign = 'center';
  ctx.textBaseline = 'alphabetic';
  ctx.fillStyle = '#f5c518';
  ctx.font = `12px ${PIX}`;
  ctx.fillText('AERO RINGS', 480, 22);
  ctx.textAlign = 'left';
  ctx.fillStyle = '#fdba74';
  ctx.font = `8px ${PIX}`;
  ctx.fillText(`${p1.name} ${p1.score}`, 16, 22);
  ctx.fillStyle = '#94a3b8';
  ctx.fillText(`CRECE ${p1.grows}/${MAX_GROWS}`, 16, 40);
  ctx.textAlign = 'right';
  ctx.fillStyle = '#7dd3fc';
  ctx.fillText(`${p2.name} ${p2.score}`, 944, 22);
  ctx.fillStyle = '#94a3b8';
  ctx.fillText(`CRECE ${p2.grows}/${MAX_GROWS}`, 944, 40);
  const meter = (x: number, grows: number, color: string) => {
    paint(ctx, x, 34, 120, 8, '#1e3a5f');
    const w = Math.round((grows / MAX_GROWS) * 116);
    paint(ctx, x + 2, 36, w, 4, color);
  };
  meter(148, p1.grows, shadeTowardBlack('#fdba74', p1.grows / MAX_GROWS));
  meter(686, p2.grows, shadeTowardBlack('#7dd3fc', p2.grows / MAX_GROWS));
};

const drawBanner = (ctx: Ctx, title: string, sub: string) => {
  ctx.fillStyle = 'rgba(15, 39, 68, 0.72)';
  ctx.fillRect(80, 170, 800, 200);
  ctx.strokeStyle = '#f5c518';
  ctx.lineWidth = 3;
  ctx.strokeRect(80, 170, 800, 200);
  ctx.textAlign = 'center';
  ctx.fillStyle = '#f5c518';
  ctx.font = `22px ${PIX}`;
  ctx.fillText(title, 480, 240);
  ctx.fillStyle = '#e2e8f0';
  ctx.font = `9px ${PIX}`;
  ctx.fillText(sub, 480, 280);
  ctx.fillStyle = '#94a3b8';
  ctx.font = `8px ${PIX}`;
  ctx.fillText('ESPACIO IMPULSO    P2 FLECHA ARRIBA', 480, 318);
};

const pickInner = (gameTime: number, rand: () => number) => {
  if (gameTime < 12) return rand() < 0.5 ? 86 : 74;
  if (gameTime < 28) return [62, 74, 88][Math.floor(rand() * 3)];
  return [48, 62, 78, 90][Math.floor(rand() * 4)];
};

const spawnRing = (id: number, gameTime: number, rand: () => number): Ring => {
  const inner = pickInner(gameTime, rand);
  const outer = inner + 16;
  const dodge = START_SIZE + GROW_STEP * 5 + 28;
  const leaveBottom = rand() < 0.5;
  const minY = FIELD.top + outer + 16;
  const maxY = FIELD.bottom - outer - 16;
  let y = minY + rand() * Math.max(12, maxY - minY);
  if (leaveBottom) y = Math.min(y, FIELD.bottom - outer - dodge);
  else y = Math.max(y, FIELD.top + outer + dodge);
  return { id, x: WIDTH + outer + 8, y, inner, outer, seen: { p1: false, p2: false } };
};

export default function Plane({
  onGameEnd,
  botEnabled = false,
  world = null,
}: {
  onGameEnd: (winner: 'p1' | 'p2') => void;
  botEnabled?: boolean;
  world?: SharedWorld | null;
}) {
  const canvasRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;
    void document.fonts.load(`10px ${PIX}`);

    let raf = 0;
    let ended = false;
    let nextRingId = 1;
    let playHead = 0;
    const rand = world ? makeRng(world.seed) : Math.random;
    const you = world?.localSide ?? 'p1';
    const them = otherSide(you);
    const link = world ? startLiveInputs(world.matchId, world.localUserId) : null;
    const state = {
      p1: makePlane(168, '#fdba74', '#c2410c', sideLabel(world, 'p1', 'TU')),
      p2: makePlane(258, '#7dd3fc', '#1d4ed8', sideLabel(world, 'p2', 'RIVAL')),
      keys: {} as Record<string, boolean>,
      rings: [] as Ring[],
      sparks: [] as Spark[],
      clouds: Array.from({ length: 8 }, (_, i) => ({
        x: (i * 140) % WIDTH,
        y: 70 + (i * 47) % 280,
        w: 70 + (i % 3) * 24,
        h: 18 + (i % 2) * 8,
        v: 18 + (i % 4) * 10,
      })),
      intro: INTRO_S,
      started: false,
      gameTime: 0,
      spawnWait: -0.6,
      winner: null as Side | null,
      ko: 0,
      last: performance.now(),
    };
    if (link) link.setLocalKeys(state.keys);

    const isDown = (code: string, key: string) => Boolean(state.keys[code] || state.keys[key]);

    const beginIfNeeded = () => {
      if (state.intro > 0 || state.started || state.winner) return;
      state.started = true;
    };

    const localPlane = () => (you === 'p1' ? state.p1 : state.p2);

    const publishKeys = () => {
      link?.setLocalKeys(state.keys);
    };
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.code === 'Space' || event.key === ' ' || event.key === 'ArrowUp') event.preventDefault();
      if (event.repeat) return;
      state.keys[event.code] = true;
      state.keys[event.key] = true;
      publishKeys();
      const now = performance.now() / 1000;
      if (event.code === 'Space' || event.key === ' ') {
        beginIfNeeded();
        const plane = localPlane();
        plane.flapReady = true;
        flap(plane, now, true);
      }
      if (!world && event.key === 'ArrowUp') {
        state.p2.flapReady = true;
        flap(state.p2, now, true);
      }
    };
    const handleKeyUp = (event: KeyboardEvent) => {
      state.keys[event.code] = false;
      state.keys[event.key] = false;
      publishKeys();
      if (event.code === 'Space' || event.key === ' ') localPlane().flapReady = true;
      if (!world && event.key === 'ArrowUp') state.p2.flapReady = true;
    };
    const handlePointer = (event: PointerEvent) => {
      event.preventDefault();
      state.keys.Space = true;
      state.keys[' '] = true;
      beginIfNeeded();
      const plane = localPlane();
      plane.flapReady = true;
      flap(plane, performance.now() / 1000, true);
      publishKeys();
    };
    const handlePointerUp = () => {
      state.keys.Space = false;
      state.keys[' '] = false;
      localPlane().flapReady = true;
      publishKeys();
    };

    window.addEventListener('keydown', handleKeyDown);
    window.addEventListener('keyup', handleKeyUp);
    canvas.addEventListener('pointerdown', handlePointer);
    window.addEventListener('pointerup', handlePointerUp);

    const burst = (x: number, y: number, color: string) => {
      for (let i = 0; i < 18; i += 1) {
        const angle = (Math.PI * 2 * i) / 18;
        const speed = 90 + Math.random() * 180;
        state.sparks.push({
          x,
          y,
          vx: Math.cos(angle) * speed,
          vy: Math.sin(angle) * speed,
          life: 0.55,
          max: 0.55,
          color,
        });
      }
    };

    const flap = (plane: PlaneUnit, now: number, needEdge: boolean) => {
      if (!plane.alive) return;
      if (now - plane.lastFlap < FLAP_GAP) return;
      if (needEdge && !plane.flapReady) return;
      plane.vy = FLAP;
      plane.lastFlap = now;
      plane.flapReady = false;
    };

    const isBot = (plane: PlaneUnit) => botEnabled && plane === state.p2;

    const explode = (plane: PlaneUnit) => {
      if (!plane.alive || isBot(plane)) return;
      plane.alive = false;
      burst(plane.x, plane.y, plane.color);
    };

    const botFlap = (plane: PlaneUnit, scroll: number, now: number) => {
      if (!plane.alive) return;
      const next = state.rings.find((ring) => ring.x + ring.outer > plane.x - 4);
      const floor = FIELD.bottom - plane.size - 18;
      const ceil = FIELD.top + plane.size + 18;
      let target = (FIELD.top + FIELD.bottom) / 2;
      if (next) {
        if (canPass(plane, next)) target = next.y;
        else target = next.y < HEIGHT / 2 ? floor - 8 : ceil + 8;
      }
      const look = next ? Math.max(0.08, (next.x - plane.x) / Math.max(80, scroll)) : 0.35;
      const pred = plane.y + plane.vy * look + 0.5 * GRAVITY * look * look;
      const danger = plane.y > floor - 10 || plane.vy > 380;
      if (danger || pred > target + 14) {
        if (Math.random() > 0.12) flap(plane, now, false);
      }
    };

    const growIfDue = (plane: PlaneUnit, gameTime: number) => {
      if (!plane.alive) return;
      const due = Math.min(MAX_GROWS, Math.floor(gameTime / GROW_EVERY));
      if (due <= plane.grows) return;
      plane.grows = due;
      plane.size = START_SIZE + plane.grows * GROW_STEP;
      if (plane.grows >= MAX_GROWS) explode(plane);
    };

    const fly = (plane: PlaneUnit, dt: number) => {
      if (!plane.alive) return;
      plane.vy = Math.min(MAX_FALL, plane.vy + GRAVITY * dt);
      plane.y += plane.vy * dt;
      const top = FIELD.top + plane.size;
      const bottom = FIELD.bottom - plane.size;
      if (plane.y < top) {
        plane.y = top;
        plane.vy = 0;
      }
      if (plane.y > bottom) {
        plane.y = bottom;
        plane.vy = 0;
      }
    };

    const judge = (plane: PlaneUnit, side: Side) => {
      if (!plane.alive) return;
      state.rings.forEach((ring) => {
        if (hitsRim(plane, ring)) explode(plane);
        if (!plane.alive || ring.seen[side] || plane.x < ring.x) return;
        ring.seen[side] = true;
        if (inHole(plane, ring)) plane.score += 1;
      });
    };

    const pickWinner = (): Side => {
      if (state.p1.alive !== state.p2.alive) return state.p1.alive ? 'p1' : 'p2';
      if (state.p1.score !== state.p2.score) return state.p1.score > state.p2.score ? 'p1' : 'p2';
      return 'p1';
    };

    const applyRings = (scene: SceneSnap) => {
      const put = (plane: PlaneUnit, unit: SceneSnap['p1']) => {
        plane.x = unit.x;
        plane.y = unit.y;
        plane.vy = unit.v;
        plane.size = unit.a;
        plane.score = unit.n;
        plane.grows = Math.max(0, Math.round((unit.a - START_SIZE) / GROW_STEP));
        plane.alive = unit.alive === 1;
      };
      put(state.p1, scene.p1);
      put(state.p2, scene.p2);
      state.rings = scene.items.map((item) => ({
        id: item.id,
        x: item.x,
        y: item.y,
        inner: item.w,
        outer: item.h,
        seen: { p1: false, p2: false },
      }));
      state.gameTime = scene.time;
      if ((scene.winner === 'p1' || scene.winner === 'p2') && !state.winner) {
        state.winner = scene.winner;
        state.ko = KO_S;
      }
    };

    const paintRings = (rankedWait: string | null) => {
      state.clouds.forEach((cloud) => {
        cloud.x -= cloud.v * 0.016;
        if (cloud.x + cloud.w < 0) cloud.x = WIDTH + 20;
      });
      drawSky(ctx, state.clouds);
      state.rings.forEach((ring) => drawRing(ctx, ring));
      drawPlane(ctx, state.p1);
      drawPlane(ctx, state.p2);
      drawHud(ctx, state.p1, state.p2);
      if (rankedWait) drawBanner(ctx, rankedWait, 'MISMO CIELO    MISMO ARO    ESPACIO IMPULSO');
      else if (state.winner) {
        const title = state.winner === you ? 'VICTORIA' : 'GANA EL RIVAL';
        drawBanner(ctx, title, `${state.p1.name} ${state.p1.score}   ${state.p2.name} ${state.p2.score}`);
      }
    };

    const update = (nowMs: number) => {
      if (ended) return;
      if (world && link) {
        const dt = Math.min(50, Math.max(0, nowMs - state.last));
        state.last = nowMs;
        link.setLocalKeys(state.keys);
        playHead = stepPlayHead(playHead, dt, link.sceneAt(), link.serverNow());
        const scene = link.readScene(playHead);
        const countdown = rankedCountdown(world.startAt, link.serverNow());
        if (scene?.kind === 'rings') {
          applyRings(scene);
          const actor = you === 'p1' ? scene.p1 : scene.p2;
          const plane = you === 'p1' ? state.p1 : state.p2;
          let y = actor.y;
          let vy = actor.v;
          const size = actor.a;
          let flapReady = true;
          let lastFlap = -1;
          let clock = 0;
          let previous = false;
          let primed = false;
          replayInputs(scene.at, link.serverNow(), link.readKeyLog(), (keys, dtMs) => {
            const dt = dtMs / 1000;
            const down = keyHeld(keys, ' ', 'Space', 'ArrowUp');
            if (!primed) {
              previous = down;
              primed = true;
            } else if (down && !previous && flapReady && clock - lastFlap >= FLAP_GAP) {
              vy = FLAP;
              lastFlap = clock;
              flapReady = false;
            }
            if (!down) flapReady = true;
            previous = down;
            clock += dt;
            vy = Math.min(MAX_FALL, vy + GRAVITY * dt);
            y += vy * dt;
            const top = FIELD.top + size;
            const bottom = FIELD.bottom - size;
            if (y < top) {
              y = top;
              vy = 0;
            }
            if (y > bottom) {
              y = bottom;
              vy = 0;
            }
          });
          plane.y = y;
          plane.vy = vy;
        }
        paintRings(countdown);
        if (state.winner) {
          state.ko -= dt / 1000;
          if (state.ko <= 0) {
            ended = true;
            cancelAnimationFrame(raf);
            onGameEnd(state.winner);
            return;
          }
        }
        raf = requestAnimationFrame(update);
        return;
      }
      const now = nowMs / 1000;
      const dt = Math.min(0.05, (nowMs - state.last) / 1000);
      state.last = nowMs;
      const scroll = Math.min(SCROLL_MAX, SCROLL0 + state.gameTime * SCROLL_GAIN);

      const rankedWait = world ? rankedCountdown(world.startAt) : null;
      if (rankedWait) {
        // La cuenta atrás usa el reloj de la partida, igual en los dos terminales.
      } else if (!world && state.intro > 0) {
        state.intro -= dt;
      } else if (!world && !state.started) {
        if (isDown('Space', ' ')) {
          state.started = true;
          state.p1.flapReady = true;
          flap(state.p1, now, true);
        }
      } else if (world && !state.started) {
        state.started = true;
      } else if (!state.winner) {
        state.gameTime += dt;
        state.spawnWait += dt;
        const every = Math.max(1.15, 1.7 - state.gameTime * 0.018);
        if (state.spawnWait >= every) {
          state.spawnWait = 0;
          state.rings.push(spawnRing(nextRingId, state.gameTime, rand));
          nextRingId += 1;
        }

        if (botEnabled) botFlap(state.p2, scroll, now);
        else if (world) {
          link?.setLocalKeys(state.keys);
          const rival = link?.readRivalKeys() ?? {};
          const other = them === 'p1' ? state.p1 : state.p2;
          if (keyHeld(rival, ' ', 'Space', 'ArrowUp')) flap(other, now, true);
          else other.flapReady = true;
        }

        growIfDue(state.p1, state.gameTime);
        growIfDue(state.p2, state.gameTime);
        fly(state.p1, dt);
        fly(state.p2, dt);
        state.rings.forEach((ring) => {
          ring.x -= scroll * dt;
        });
        state.rings = state.rings.filter((ring) => ring.x > -ring.outer - 20);
        judge(state.p1, 'p1');
        judge(state.p2, 'p2');

        if (!state.p1.alive || (!botEnabled && !state.p2.alive)) {
          state.winner = pickWinner();
          state.ko = KO_S;
        }
      } else {
        state.ko -= dt;
        if (state.ko <= 0) {
          ended = true;
          cancelAnimationFrame(raf);
          onGameEnd(state.winner);
          return;
        }
      }

      state.clouds.forEach((cloud) => {
        cloud.x -= cloud.v * dt;
        if (cloud.x + cloud.w < 0) cloud.x = WIDTH + 20;
      });
      state.sparks = state.sparks.filter((spark) => {
        spark.x += spark.vx * dt;
        spark.y += spark.vy * dt;
        spark.life -= dt;
        return spark.life > 0;
      });

      drawSky(ctx, state.clouds);
      state.rings.forEach((ring) => drawRing(ctx, ring));
      drawPlane(ctx, state.p1);
      drawPlane(ctx, state.p2);
      state.sparks.forEach((spark) => {
        ctx.globalAlpha = Math.max(0, spark.life / spark.max);
        paint(ctx, spark.x, spark.y, 4, 4, spark.color);
        ctx.globalAlpha = 1;
      });
      drawHud(ctx, state.p1, state.p2);

      if (rankedWait) {
        drawBanner(ctx, rankedWait, 'MISMO CIELO    MISMO ARO    ESPACIO IMPULSO');
      } else if (!world && state.intro > 0) {
        const n = state.intro > 1.9 ? '3' : state.intro > 1.1 ? '2' : state.intro > 0.35 ? '1' : 'YA';
        drawBanner(ctx, n, 'PASA POR EL HUECO    CHOCA EL BORDE Y PIERDES');
      } else if (!world && !state.started) {
        drawBanner(ctx, 'ESPACIO', 'CRECE CADA 10s    6 VECES Y EXPLOTA');
      } else if (state.winner) {
        const title = state.winner === you ? 'VICTORIA' : 'GANA EL RIVAL';
        drawBanner(ctx, title, `${state.p1.name} ${state.p1.score}   ${state.p2.name} ${state.p2.score}`);
      }

      raf = requestAnimationFrame(update);
    };

    raf = requestAnimationFrame(update);
    return () => {
      ended = true;
      window.removeEventListener('keydown', handleKeyDown);
      window.removeEventListener('keyup', handleKeyUp);
      canvas.removeEventListener('pointerdown', handlePointer);
      window.removeEventListener('pointerup', handlePointerUp);
      link?.stop();
      cancelAnimationFrame(raf);
    };
  }, [onGameEnd, botEnabled, world]);

  return (
    <canvas
      ref={canvasRef}
      width={WIDTH}
      height={HEIGHT}
      aria-label="Aero Rings"
      className="w-full max-w-full rounded-xl [image-rendering:pixelated]"
    />
  );
}
