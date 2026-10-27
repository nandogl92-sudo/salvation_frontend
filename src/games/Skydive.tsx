import { useEffect, useRef } from 'react';
import { keyHeld, otherSide, startLiveInputs, stepPlayHead, type SceneSnap } from './liveInputs';
import { makeRng, rankedCountdown, sideLabel, type SharedWorld } from './sharedWorld';

const WIDTH = 960;
const HEIGHT = 540;
const PIX = '"Press Start 2P", monospace';
const FIELD = { left: 18, top: 70, right: 942, bottom: 530 };
const INTRO_S = 10;
const KO_S = 2.2;
const PHASE_S = 10;
const MAX_PHASE = 8;
const MIN_GAP = 112;
const MOVE = 310;

const fallSpeedOf = (phase: number) => 75 + phase * 65;

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

type Cloud = { x: number; y: number; s: number; layer: number };
type Spark = { x: number; y: number; vx: number; vy: number; life: number; color: string };

const ART_SRC = '/sky-drop.jpg';
const dropArt = new Image();
let dropArtReady = false;
dropArt.onload = () => {
  dropArtReady = true;
};
dropArt.src = ART_SRC;

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
  name,
});

const formatTime = (seconds: number) => `${seconds.toFixed(1)}s`;

const drawSky = (ctx: Ctx, clouds: Cloud[], fall: number, time: number) => {
  const sky = ctx.createLinearGradient(0, 0, 0, HEIGHT);
  sky.addColorStop(0, '#2f6fb3');
  sky.addColorStop(0.45, '#6eb6e8');
  sky.addColorStop(1, '#d7f0ff');
  ctx.fillStyle = sky;
  ctx.fillRect(0, 0, WIDTH, HEIGHT);

  ctx.fillStyle = '#7a9a6a';
  ctx.beginPath();
  ctx.moveTo(0, 520);
  ctx.lineTo(80, 390);
  ctx.lineTo(170, 500);
  ctx.lineTo(260, 360);
  ctx.lineTo(380, 510);
  ctx.lineTo(500, 400);
  ctx.lineTo(620, 515);
  ctx.lineTo(740, 370);
  ctx.lineTo(860, 510);
  ctx.lineTo(960, 400);
  ctx.lineTo(960, 540);
  ctx.lineTo(0, 540);
  ctx.fill();
  ctx.fillStyle = '#93b37c';
  ctx.beginPath();
  ctx.moveTo(0, 530);
  ctx.lineTo(120, 430);
  ctx.lineTo(240, 520);
  ctx.lineTo(400, 410);
  ctx.lineTo(560, 525);
  ctx.lineTo(720, 420);
  ctx.lineTo(900, 520);
  ctx.lineTo(960, 450);
  ctx.lineTo(960, 540);
  ctx.lineTo(0, 540);
  ctx.fill();

  clouds.forEach((cloud) => {
    const y = ((cloud.y - fall * (0.22 + cloud.layer * 0.18)) % (HEIGHT + 80) + HEIGHT + 80) % (HEIGHT + 80) - 40;
    ctx.fillStyle = cloud.layer === 0 ? 'rgba(255,255,255,0.35)' : 'rgba(255,255,255,0.7)';
    paint(ctx, cloud.x, y, cloud.s * 2.2, cloud.s, ctx.fillStyle as string);
    paint(ctx, cloud.x + cloud.s * 0.6, y - cloud.s * 0.4, cloud.s * 1.4, cloud.s * 0.9, ctx.fillStyle as string);
  });
  void time;
};

const drawBackdrop = (ctx: Ctx, clouds: Cloud[], fall: number, time: number) => {
  if (!dropArtReady) {
    drawSky(ctx, clouds, fall, time);
    return;
  }
  drawCover(ctx, dropArt, 0, 0, WIDTH, HEIGHT);
};

const drawHazard = (ctx: Ctx, item: Hazard) => {
  if (item.kind === 'balloon') {
    paint(ctx, item.x + 12, item.y + 32, 4, 16, '#6b4f2a');
    paint(ctx, item.x, item.y, item.w, item.h - 10, '#e11d48');
    paint(ctx, item.x + 8, item.y + 6, 10, 8, '#fecdd3');
    return;
  }
  if (item.kind === 'bird') {
    paint(ctx, item.x + 8, item.y + 8, 26, 10, '#1f2937');
    paint(ctx, item.x, item.y + 4, 14, 6, '#374151');
    paint(ctx, item.x + 28, item.y + 4, 14, 6, '#374151');
    paint(ctx, item.x + 30, item.y + 10, 6, 4, '#f59e0b');
    return;
  }
  if (item.kind === 'kite') {
    paint(ctx, item.x + 8, item.y, 28, 28, '#22c55e');
    paint(ctx, item.x + 18, item.y + 10, 8, 8, '#fef08a');
    paint(ctx, item.x + 20, item.y + 28, 3, 16, '#a3a3a3');
    return;
  }
  paint(ctx, item.x, item.y, item.w, item.h, '#b45309');
  paint(ctx, item.x + 4, item.y + 4, item.w - 8, 6, '#fbbf24');
  paint(ctx, item.x + 6, item.y + 14, item.w - 12, 8, '#78350f');
};

const drawJumper = (ctx: Ctx, jumper: Jumper, time: number, sway: number) => {
  const x = jumper.x + sway;
  const y = jumper.y;
  ctx.globalAlpha = jumper.alive ? 1 : 0.38;
  ctx.strokeStyle = jumper.dark;
  ctx.lineWidth = 2;
  ctx.beginPath();
  ctx.moveTo(x, y + 8);
  ctx.lineTo(x - 18, y - 18);
  ctx.moveTo(x, y + 8);
  ctx.lineTo(x + 18, y - 18);
  ctx.stroke();
  paint(ctx, x - 24, y - 30, 48, 16, jumper.canopy);
  paint(ctx, x - 20, y - 26, 10, 6, '#fff');
  paint(ctx, x - 8, y, 16, 18, jumper.color);
  paint(ctx, x - 5, y - 10, 10, 10, '#f8d7b0');
  paint(ctx, x - 6, y + 16, 5, 10, jumper.dark);
  paint(ctx, x + 1, y + 16, 5, 10, jumper.dark);
  if (!jumper.alive) {
    ctx.fillStyle = '#f5c518';
    ctx.font = `10px ${PIX}`;
    ctx.textAlign = 'center';
    ctx.fillText('OUT', x, y - 38);
  }
  ctx.globalAlpha = 1;
  void time;
};

const drawHud = (ctx: Ctx, p1: Jumper, p2: Jumper, gameTime: number, phase: number) => {
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
  ctx.fillText(`${formatTime(gameTime)}  FASE ${phase + 1}`, 480, 44);
  ctx.textAlign = 'left';
};

const drawBanner = (ctx: Ctx, title: string, sub: string) => {
  paint(ctx, 140, 196, 680, 148, 'rgba(10, 16, 28, 0.88)');
  ctx.strokeStyle = '#f5c518';
  ctx.lineWidth = 3;
  ctx.strokeRect(140, 196, 680, 148);
  ctx.textAlign = 'center';
  ctx.fillStyle = '#f5c518';
  ctx.font = `20px ${PIX}`;
  ctx.fillText(title, 480, 256);
  ctx.fillStyle = '#f4f7fb';
  ctx.font = `9px ${PIX}`;
  ctx.fillText(sub, 480, 298);
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
    let playHead = 0;
    const rand = world ? makeRng(world.seed) : Math.random;
    const you = world?.localSide ?? 'p1';
    const them = otherSide(you);
    const link = world ? startLiveInputs(world.matchId, world.localUserId) : null;
    const state = {
      p1: makeJumper(300, '#fb7185', '#9f1239', '#e11d48', sideLabel(world, 'p1', 'ROSA')),
      p2: makeJumper(660, '#7dd3fc', '#1e3a8a', '#2563eb', sideLabel(world, 'p2', 'AZUL')),
      keys: {} as Record<string, boolean>,
      hazards: [] as Hazard[],
      sparks: [] as Spark[],
      clouds: Array.from({ length: 12 }, (_, i) => ({
        x: (i * 97) % WIDTH,
        y: 40 + (i * 61) % 460,
        s: 16 + (i % 4) * 8,
        layer: i % 3,
      })),
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

    const burst = (x: number, y: number, color: string) => {
      for (let i = 0; i < 10; i += 1) {
        if (state.sparks.length > 40) return;
        state.sparks.push({
          x,
          y,
          vx: (Math.random() - 0.5) * 160,
          vy: (Math.random() - 0.8) * 120,
          life: 0.35,
          color,
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
        jumper.x = actor.x;
        jumper.y = actor.y;
        jumper.vx = actor.v;
        jumper.lived = actor.p;
        jumper.alive = actor.alive === 1;
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
      const dt = Math.min(0.05, (now - state.last) / 1000);
      if (world && link) {
        const stepMs = Math.min(50, Math.max(0, now - state.last));
        state.last = now;
        link.setLocalKeys(state.keys);
        playHead = stepPlayHead(playHead, stepMs, link.sceneAt(), link.serverNow());
        const scene = link.readScene(playHead);
        if (scene?.kind === 'drop') applyDrop(scene);
        const phase = Math.min(MAX_PHASE, Math.floor(state.gameTime / PHASE_S));
        drawBackdrop(ctx, state.clouds, state.fall, state.gameTime);
        state.hazards.forEach((item) => drawHazard(ctx, item));
        drawJumper(ctx, state.p1, state.gameTime, Math.sin(state.gameTime * 3.1) * 7);
        drawJumper(ctx, state.p2, state.gameTime, Math.sin(state.gameTime * 3.1 + 1.4) * 7);
        drawHud(ctx, state.p1, state.p2, state.gameTime, phase);
        const rankedWait = rankedCountdown(world.startAt, link.serverNow());
        if (rankedWait) drawBanner(ctx, rankedWait, 'MISMO CIELO    ESQUIVA Y AGUANTA');
        if (state.winner === 'draw') {
          drawBanner(ctx, 'EMPATE', `${formatTime(state.p1.lived)} = ${formatTime(state.p2.lived)}`);
        } else if (state.winner) {
          const name = state.winner === 'p1' ? state.p1.name : state.p2.name;
          drawBanner(ctx, `${name} GANA`, `${formatTime(state.p1.lived)}  vs  ${formatTime(state.p2.lived)}`);
        }
        if (state.winner) {
          state.ko -= stepMs / 1000;
          if (state.ko <= 0) {
            onGameEnd(state.winner === 'p2' ? 'p2' : 'p1');
            return;
          }
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
        const phase = Math.min(MAX_PHASE, Math.floor(state.gameTime / PHASE_S));
        const fallSpeed = fallSpeedOf(phase);
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
          burst(jumper.x, jumper.y, jumper.canopy);
        };
        strike(state.p1, sway1);
        strike(state.p2, sway2);

        if (!state.p1.alive || !state.p2.alive) {
          if (state.p1.alive !== state.p2.alive) state.winner = state.p1.alive ? 'p1' : 'p2';
          else {
            const gap = Math.abs(state.p1.lived - state.p2.lived);
            state.winner = gap < 0.04 ? 'draw' : state.p1.lived > state.p2.lived ? 'p1' : 'p2';
          }
          state.ko = KO_S;
        }
      } else {
        state.ko -= dt;
        if (state.ko <= 0) {
          onGameEnd(state.winner === 'p2' ? 'p2' : 'p1');
          return;
        }
      }

      state.sparks = state.sparks.filter((spark) => {
        spark.x += spark.vx * dt;
        spark.y += spark.vy * dt;
        spark.life -= dt;
        return spark.life > 0;
      });

      const phase = Math.min(MAX_PHASE, Math.floor(state.gameTime / PHASE_S));
      drawBackdrop(ctx, state.clouds, state.fall, state.gameTime);
      state.hazards.forEach((item) => drawHazard(ctx, item));
      drawJumper(ctx, state.p1, state.gameTime, Math.sin(state.gameTime * 3.1) * 7);
      drawJumper(ctx, state.p2, state.gameTime, Math.sin(state.gameTime * 3.1 + 1.4) * 7);
      state.sparks.forEach((spark) => paint(ctx, spark.x, spark.y, 3, 3, spark.color));
      drawHud(ctx, state.p1, state.p2, state.gameTime, phase);

      if (rankedWait) {
        drawBanner(ctx, rankedWait, 'MISMO CIELO    ESQUIVA Y AGUANTA');
      } else if (!world && state.intro > 0) {
        const n = String(Math.max(1, Math.ceil(state.intro)));
        drawBanner(ctx, n, 'QUIEN CHOCA PIERDE    CADA 10s BAJAS MAS');
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
      window.removeEventListener('keydown', handleKeyDown);
      window.removeEventListener('keyup', handleKeyUp);
      link?.stop();
      cancelAnimationFrame(raf);
    };
  }, [onGameEnd, botEnabled, world]);

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
