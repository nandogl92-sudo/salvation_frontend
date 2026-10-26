import { useEffect, useRef } from 'react';
import { keyHeld, otherSide, startLiveInputs } from './liveInputs';
import { rankedCountdown, sideLabel, type SharedWorld } from './sharedWorld';

const WIDTH = 960;
const HEIGHT = 540;
const FIELD = { left: 20, top: 118, right: 940, bottom: 424 };
const BODY = { w: 28, h: 32 };
const PIX = '"Press Start 2P", monospace';
const INTRO_FRAMES = 78;
const KO_FRAMES = 96;
const SPARK_MAX = 42;

type Ctx = CanvasRenderingContext2D;
type Side = 'p1' | 'p2';

type Fighter = {
  x: number;
  y: number;
  hp: number;
  hits: number;
  mag: number;
  reserve: number;
  magSize: number;
  cooldown: number;
  reloading: number;
  flash: number;
  muzzle: number;
  moving: boolean;
};

type Spark = {
  x: number;
  y: number;
  vx: number;
  vy: number;
  life: number;
  color: string;
  size: number;
};

type Palette = {
  armor: string;
  dark: string;
  light: string;
  glow: string;
  visor: string;
  name: string;
};

const CYAN: Palette = {
  armor: '#2ad4ff',
  dark: '#0d5d8a',
  light: '#b8f4ff',
  glow: '#5cf0ff',
  visor: '#ff3d8a',
  name: 'CYAN PULSE',
};

const AMBER: Palette = {
  armor: '#ff9a2e',
  dark: '#a84810',
  light: '#ffe08a',
  glow: '#ffb347',
  visor: '#3dffb0',
  name: 'AMBER BOLT',
};

const formatTime = (frames: number) => {
  const total = Math.floor(frames / 60);
  const minutes = String(Math.floor(total / 60)).padStart(2, '0');
  const seconds = String(total % 60).padStart(2, '0');
  return `${minutes}:${seconds}`;
};

const paint = (ctx: Ctx, x: number, y: number, w: number, h: number, color: string) => {
  ctx.fillStyle = color;
  ctx.fillRect(x, y, w, h);
};

const burst = (sparks: Spark[], x: number, y: number, color: string, count: number) => {
  for (let i = 0; i < count; i += 1) {
    if (sparks.length >= SPARK_MAX) return;
    sparks.push({
      x,
      y,
      vx: (Math.random() - 0.5) * 5.2,
      vy: (Math.random() - 0.8) * 4.4,
      life: 10 + Math.floor(Math.random() * 10),
      color,
      size: 2 + Math.floor(Math.random() * 3),
    });
  }
};

const drawCrate = (ctx: Ctx, x: number, y: number, w: number, h: number, neon: string) => {
  paint(ctx, x + 4, y + 6, w, h, '#1a1428');
  paint(ctx, x, y, w, h, '#3a3358');
  paint(ctx, x, y, w, 6, neon);
  paint(ctx, x + 6, y + 10, w - 12, 4, 'rgba(255,255,255,0.16)');
  paint(ctx, x + 8, y + h - 14, 10, 8, '#2a2438');
  paint(ctx, x + w - 18, y + h - 14, 10, 8, '#2a2438');
};

const drawPylon = (ctx: Ctx, x: number, y: number, h: number, frames: number, color: string) => {
  const pulse = 0.45 + Math.sin(frames / 10) * 0.2;
  paint(ctx, x, y, 10, h, '#2a2038');
  paint(ctx, x + 2, y + 8, 6, h - 16, color);
  ctx.globalAlpha = pulse;
  paint(ctx, x - 4, y - 8, 18, 10, color);
  ctx.globalAlpha = 1;
  paint(ctx, x - 2, y - 6, 14, 6, '#fff7c2');
};

const drawArena = (ctx: Ctx, frames: number) => {
  const sky = ctx.createLinearGradient(0, 0, 0, HEIGHT);
  sky.addColorStop(0, '#14082c');
  sky.addColorStop(0.4, '#2a1060');
  sky.addColorStop(0.72, '#3c1878');
  sky.addColorStop(1, '#1a0c38');
  ctx.fillStyle = sky;
  ctx.fillRect(0, 0, WIDTH, HEIGHT);

  ctx.fillStyle = 'rgba(255,255,255,0.7)';
  for (let i = 0; i < 18; i += 1) {
    const sx = (i * 97 + frames) % WIDTH;
    const sy = 16 + (i * 13) % 90;
    ctx.fillRect(sx, sy, i % 3 === 0 ? 2 : 1, 1);
  }

  paint(ctx, 0, 104, WIDTH, FIELD.bottom - 96, '#24183c');
  ctx.fillStyle = 'rgba(92, 240, 255, 0.12)';
  for (let y = 128; y < FIELD.bottom; y += 32) ctx.fillRect(16, y, WIDTH - 32, 2);
  for (let x = 48; x < WIDTH; x += 72) ctx.fillRect(x, 112, 2, FIELD.bottom - 112);

  paint(ctx, FIELD.left, FIELD.top, FIELD.right - FIELD.left, 4, 'rgba(255, 179, 71, 0.35)');
  paint(ctx, 478, FIELD.top, 4, FIELD.bottom - FIELD.top, 'rgba(255, 61, 138, 0.45)');

  drawCrate(ctx, 28, 130, 72, 54, '#5cf0ff');
  drawCrate(ctx, 28, 196, 72, 50, '#3dffb0');
  drawCrate(ctx, 108, 136, 48, 80, '#7ea0ff');
  drawCrate(ctx, 812, 126, 90, 42, '#ffb347');
  drawCrate(ctx, 854, 178, 62, 66, '#ff6b3d');
  drawCrate(ctx, 250, 248, 74, 92, '#7ea0ff');

  paint(ctx, 168, 210, 56, 30, '#5c4030');
  paint(ctx, 172, 214, 48, 8, '#c4925a');
  paint(ctx, 176, 234, 10, 10, '#1a1420');
  paint(ctx, 198, 234, 10, 10, '#1a1420');

  drawPylon(ctx, 700, 150, 160, frames, '#ff6b3d');
  drawPylon(ctx, 728, 168, 142, frames + 8, '#ffb347');
  paint(ctx, 690, 186, 56, 6, '#4a5560');
  paint(ctx, 690, 230, 56, 6, '#4a5560');

  ctx.fillStyle = '#6a5438';
  [620, 648, 760, 788].forEach((x) => {
    ctx.beginPath();
    ctx.arc(x, 300, 11, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = 'rgba(255, 179, 71, 0.35)';
    ctx.beginPath();
    ctx.arc(x, 300, 5, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = '#6a5438';
  });

  paint(ctx, 262, 266, 10, 10, '#3ecf6e');
  paint(ctx, 278, 266, 10, 10, '#5cf0ff');
  paint(ctx, 262, 286, 10, 10, '#e2b43a');

  paint(ctx, 300, 348, 360, 28, '#1a2438');
  paint(ctx, 300, 348, 360, 5, '#ff3d8a');
  ctx.textAlign = 'center';
  ctx.fillStyle = '#f4f7fb';
  ctx.font = `10px ${PIX}`;
  ctx.fillText('LASER YARD', 480, 368);
  ctx.textAlign = 'left';
  paint(ctx, 300, 376, 8, FIELD.bottom - 376, '#3a3358');
  paint(ctx, 652, 376, 8, FIELD.bottom - 376, '#3a3358');

  const pit = ctx.createLinearGradient(0, 430, 0, HEIGHT);
  pit.addColorStop(0, '#2a1060');
  pit.addColorStop(0.5, '#ff3d8a');
  pit.addColorStop(1, '#14082c');
  ctx.fillStyle = pit;
  ctx.fillRect(318, 432, 324, HEIGHT - 432);
  paint(ctx, 340, 500, 18, 40, '#1a1428');
  paint(ctx, 420, 490, 14, 50, '#241830');
  paint(ctx, 530, 488, 22, 52, '#1a1428');
  ctx.fillStyle = '#5cf0ff';
  ctx.beginPath();
  ctx.arc(480, 502, 16 + Math.sin(frames / 12) * 3, 0, Math.PI * 2);
  ctx.fill();
};

const drawDuelist = (
  ctx: Ctx,
  x: number,
  y: number,
  dir: number,
  pal: Palette,
  rifle: boolean,
  fighter: Fighter,
  frames: number,
  down: boolean,
) => {
  const bob = fighter.moving && !down ? Math.round(Math.sin(frames / 3.2) * 2) : 0;
  const squash = down ? 8 : 0;
  ctx.save();
  ctx.translate(x + BODY.w / 2, y + BODY.h + squash);
  ctx.scale(dir, 1);
  if (fighter.flash > 0) ctx.globalAlpha = 0.55 + (frames % 2) * 0.35;

  paint(ctx, -11, -14 + bob, 8, 14, pal.dark);
  paint(ctx, 2, -14 + bob, 8, 14, pal.dark);
  paint(ctx, -10, -4 + bob, 7, 5, '#1a1420');
  paint(ctx, 3, -4 + bob, 7, 5, '#1a1420');

  paint(ctx, -12, -30 + bob, 24, 18, pal.dark);
  paint(ctx, -10, -28 + bob, 20, 14, pal.armor);
  paint(ctx, -8, -26 + bob, 16, 4, pal.light);
  paint(ctx, -6, -18 + bob, 12, 4, pal.visor);

  paint(ctx, -8, -42 + bob, 16, 14, pal.light);
  paint(ctx, -10, -40 + bob, 20, 6, pal.dark);
  paint(ctx, -4, -38 + bob, 10, 5, pal.visor);
  paint(ctx, -2, -36 + bob, 6, 2, '#fff');
  paint(ctx, 6, -34 + bob, 8, 4, pal.glow);

  const gunY = -22 + bob;
  if (rifle) {
    paint(ctx, 10, gunY, 22, 5, pal.dark);
    paint(ctx, 12, gunY + 1, 20, 3, pal.glow);
    paint(ctx, 28, gunY - 2, 6, 8, pal.armor);
  } else {
    paint(ctx, 10, gunY, 16, 5, pal.dark);
    paint(ctx, 12, gunY + 1, 14, 3, pal.glow);
  }
  if (fighter.muzzle > 0) {
    paint(ctx, rifle ? 30 : 24, gunY - 3, 10, 10, '#fff7c2');
    paint(ctx, rifle ? 34 : 28, gunY - 1, 8, 6, pal.glow);
  }

  ctx.restore();
  ctx.globalAlpha = 1;
};

const drawPortrait = (ctx: Ctx, x: number, y: number, pal: Palette, dir: number) => {
  paint(ctx, x, y, 44, 44, '#101018');
  ctx.strokeStyle = pal.glow;
  ctx.lineWidth = 2;
  ctx.strokeRect(x + 1, y + 1, 42, 42);
  ctx.save();
  ctx.translate(x + 22, y + 40);
  ctx.scale(dir * 0.72, 0.72);
  paint(ctx, -10, -28, 20, 14, pal.armor);
  paint(ctx, -8, -40, 16, 14, pal.light);
  paint(ctx, -4, -36, 10, 5, pal.visor);
  ctx.restore();
};

const drawHud = (ctx: Ctx, p1: Fighter, p2: Fighter, frames: number, p1Name: string, p2Name: string) => {
  paint(ctx, 0, 0, WIDTH, 104, 'rgba(10, 8, 24, 0.72)');
  paint(ctx, 8, 8, 300, 88, '#161022');
  ctx.strokeStyle = CYAN.glow;
  ctx.strokeRect(8, 8, 300, 88);
  paint(ctx, 652, 8, 300, 88, '#161022');
  ctx.strokeStyle = AMBER.glow;
  ctx.strokeRect(652, 8, 300, 88);
  paint(ctx, 320, 8, 320, 88, '#120c22');
  ctx.strokeStyle = '#ff3d8a';
  ctx.strokeRect(320, 8, 320, 88);

  drawPortrait(ctx, 16, 18, CYAN, 1);
  ctx.textAlign = 'left';
  ctx.font = `10px ${PIX}`;
  ctx.fillStyle = p1.hp > 30 ? '#3dffb0' : '#ff4d4d';
  ctx.fillText(`${Math.max(0, p1.hp)}%`, 70, 28);
  paint(ctx, 126, 16, 160, 12, '#1b2430');
  paint(ctx, 126, 16, Math.max(0, p1.hp) * 1.6, 12, p1.hp > 30 ? CYAN.glow : '#e23b2f');
  ctx.fillStyle = '#d5dbe3';
  ctx.font = `7px ${PIX}`;
  ctx.fillText('BLASTER', 70, 48);
  ctx.fillText(p1.reloading > 0 ? 'RELOAD' : `AMMO ${p1.mag}/${p1.reserve}`, 154, 48);
  ctx.fillStyle = CYAN.glow;
  ctx.font = `8px ${PIX}`;
  ctx.fillText(p1Name, 70, 68);
  ctx.fillStyle = '#9aa6b8';
  ctx.font = `7px ${PIX}`;
  ctx.fillText('Arena: Laser Yard', 70, 86);

  drawPortrait(ctx, 900, 18, AMBER, -1);
  ctx.textAlign = 'right';
  ctx.font = `10px ${PIX}`;
  ctx.fillStyle = p2.hp > 30 ? '#3dffb0' : '#ff4d4d';
  ctx.fillText(`${Math.max(0, p2.hp)}%`, 888, 28);
  paint(ctx, 680, 16, 160, 12, '#1b2430');
  const rifleFill = Math.max(0, p2.hp) * 1.6;
  paint(ctx, 680 + 160 - rifleFill, 16, rifleFill, 12, p2.hp > 30 ? AMBER.glow : '#e23b2f');
  ctx.fillStyle = '#d5dbe3';
  ctx.font = `7px ${PIX}`;
  ctx.fillText(p2.reloading > 0 ? 'RELOAD' : `AMMO ${p2.mag}/${p2.reserve}`, 760, 48);
  ctx.fillText('RIFLE', 860, 48);
  ctx.fillStyle = AMBER.glow;
  ctx.font = `8px ${PIX}`;
  ctx.fillText(p2Name, 888, 68);
  ctx.fillStyle = '#9aa6b8';
  ctx.font = `7px ${PIX}`;
  ctx.fillText('P1 WASD  P2 FLECHAS', 888, 86);

  ctx.textAlign = 'center';
  ctx.fillStyle = '#ff3d8a';
  ctx.font = `16px ${PIX}`;
  ctx.fillText('VS', 480, 36);
  ctx.fillStyle = '#f4f7fb';
  ctx.font = `10px ${PIX}`;
  ctx.fillText(formatTime(frames), 480, 56);
  ctx.font = `7px ${PIX}`;
  ctx.fillStyle = CYAN.glow;
  ctx.fillText(`${p1Name} ${p1.hits}`, 390, 78);
  ctx.fillStyle = AMBER.glow;
  ctx.fillText(`${p2Name} ${p2.hits}`, 570, 78);
  ctx.fillStyle = '#f4f7fb';
  ctx.fillText('ROUND 1', 480, 78);
  ctx.textAlign = 'left';
};

const drawLaser = (ctx: Ctx, x: number, y: number, owner: Side) => {
  const glow = owner === 'p1' ? 'rgba(92, 240, 255, 0.38)' : 'rgba(255, 179, 71, 0.38)';
  const core = owner === 'p1' ? '#7ee0ff' : '#ffb15a';
  paint(ctx, x - 6, y - 4, 22, 11, glow);
  paint(ctx, x, y, 14, 3, core);
  paint(ctx, x + 2, y + 1, 8, 1, '#fff');
};

const drawBanner = (ctx: Ctx, title: string, sub: string, accent: string) => {
  paint(ctx, 180, 200, 600, 130, 'rgba(10, 8, 24, 0.82)');
  ctx.strokeStyle = accent;
  ctx.lineWidth = 3;
  ctx.strokeRect(180, 200, 600, 130);
  ctx.textAlign = 'center';
  ctx.fillStyle = accent;
  ctx.font = `22px ${PIX}`;
  ctx.fillText(title, 480, 252);
  ctx.fillStyle = '#f4f7fb';
  ctx.font = `10px ${PIX}`;
  ctx.fillText(sub, 480, 288);
  ctx.textAlign = 'left';
};

const makeFighter = (x: number, y: number, magSize: number, reserve: number): Fighter => ({
  x,
  y,
  hp: 100,
  hits: 0,
  mag: magSize,
  reserve,
  magSize,
  cooldown: 0,
  reloading: 0,
  flash: 0,
  muzzle: 0,
  moving: false,
});

export default function Shooter({
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

    let animationFrameId = 0;
    const you = world?.localSide ?? 'p1';
    const them = otherSide(you);
    const link = world ? startLiveInputs(world.matchId, world.localUserId) : null;
    const p1Name = sideLabel(world, 'p1', CYAN.name);
    const p2Name = sideLabel(world, 'p2', AMBER.name);
    const state = {
      p1: makeFighter(200, 300, 15, 45),
      p2: makeFighter(620, 250, 10, 60),
      bullets: [] as { x: number; y: number; vx: number; owner: Side; damage: number }[],
      sparks: [] as Spark[],
      keys: {} as Record<string, boolean>,
      frames: 0,
      ko: null as Side | null,
      koFrames: 0,
    };
    if (link) link.setLocalKeys(state.keys);

    const waiting = () => Boolean(world ? rankedCountdown(world.startAt) : state.frames < INTRO_FRAMES);

    const shoot = (owner: Side) => {
      if (state.ko || waiting()) return;
      const fighter = state[owner];
      if (fighter.reloading > 0 || fighter.cooldown > 0) return;
      if (fighter.mag <= 0) return;
      fighter.mag -= 1;
      fighter.cooldown = owner === 'p1' ? 12 : 20;
      fighter.muzzle = 6;
      const goingRight = owner === 'p1';
      const tipX = goingRight ? fighter.x + BODY.w + 8 : fighter.x - 8;
      const tipY = fighter.y + 14;
      state.bullets.push({
        x: goingRight ? fighter.x + BODY.w : fighter.x,
        y: tipY,
        vx: goingRight ? 11 : -11,
        owner,
        damage: owner === 'p1' ? 8 : 12,
      });
      burst(state.sparks, tipX, tipY, owner === 'p1' ? CYAN.glow : AMBER.glow, 4);
      if (fighter.mag === 0 && fighter.reserve > 0) fighter.reloading = 45;
    };

    const handleKeyDown = (event: KeyboardEvent) => {
      state.keys[event.key] = true;
      if (event.key === ' ') event.preventDefault();
    };
    const handleKeyUp = (event: KeyboardEvent) => { state.keys[event.key] = false; };
    window.addEventListener('keydown', handleKeyDown);
    window.addEventListener('keyup', handleKeyUp);

    const clamp = (fighter: Fighter, minX: number, maxX: number) => {
      if (fighter.x < minX) fighter.x = minX;
      if (fighter.x > maxX - BODY.w) fighter.x = maxX - BODY.w;
      if (fighter.y < FIELD.top) fighter.y = FIELD.top;
      if (fighter.y > FIELD.bottom - BODY.h) fighter.y = FIELD.bottom - BODY.h;
    };

    const reload = (fighter: Fighter) => {
      if (fighter.cooldown > 0) fighter.cooldown -= 1;
      if (fighter.flash > 0) fighter.flash -= 1;
      if (fighter.muzzle > 0) fighter.muzzle -= 1;
      if (fighter.reloading <= 0) return;
      fighter.reloading -= 1;
      if (fighter.reloading > 0) return;
      const load = Math.min(fighter.magSize, fighter.reserve);
      fighter.mag = load;
      fighter.reserve -= load;
    };

    const tickSparks = () => {
      state.sparks = state.sparks.filter((spark) => {
        spark.x += spark.vx;
        spark.y += spark.vy;
        spark.vy += 0.12;
        spark.life -= 1;
        return spark.life > 0;
      });
    };

    const drawWorld = () => {
      drawArena(ctx, state.frames);
      drawDuelist(ctx, state.p1.x, state.p1.y, 1, CYAN, false, state.p1, state.frames, state.ko === 'p2');
      drawDuelist(ctx, state.p2.x, state.p2.y, -1, AMBER, true, state.p2, state.frames, state.ko === 'p1');
      state.bullets.forEach((bullet) => {
        drawLaser(ctx, bullet.x, bullet.y, bullet.owner);
      });
      state.sparks.forEach((spark) => {
        ctx.globalAlpha = Math.max(0.2, spark.life / 16);
        paint(ctx, spark.x, spark.y, spark.size, spark.size, spark.color);
      });
      ctx.globalAlpha = 1;
      drawHud(ctx, state.p1, state.p2, state.frames, p1Name, p2Name);
      const count = world ? rankedCountdown(world.startAt) : null;
      if (count) {
        drawBanner(ctx, count, 'MISMO PATIO    TU LADO SOLO', '#5cf0ff');
      } else if (!world && state.frames < INTRO_FRAMES) {
        drawBanner(ctx, 'LASER DUEL', 'CYAN PULSE  VS  AMBER BOLT', '#5cf0ff');
      }
      if (state.ko) {
        const winner = state.ko === 'p1' ? CYAN.name : AMBER.name;
        drawBanner(ctx, 'KO', `${winner} WINS`, state.ko === 'p1' ? CYAN.glow : AMBER.glow);
      }
    };

    const update = () => {
      state.frames += 1;

      if (state.ko) {
        tickSparks();
        state.koFrames -= 1;
        drawWorld();
        if (state.koFrames <= 0) {
          onGameEnd(state.ko);
          return;
        }
        animationFrameId = requestAnimationFrame(update);
        return;
      }

      if (!waiting()) {
        const speed = 4;
        const steer = (side: Side, up: boolean, down: boolean, left: boolean, right: boolean) => {
          const beforeX = state[side].x;
          const beforeY = state[side].y;
          if (up) state[side].y -= speed;
          if (down) state[side].y += speed;
          if (left) state[side].x -= speed;
          if (right) state[side].x += speed;
          state[side].moving = state[side].x !== beforeX || state[side].y !== beforeY;
        };
        if (world) {
          const padSteer = (side: Side, keys: Record<string, boolean>) => {
            steer(
              side,
              keyHeld(keys, 'w', 'W', 'ArrowUp'),
              keyHeld(keys, 's', 'S', 'ArrowDown'),
              keyHeld(keys, 'a', 'A', 'ArrowLeft'),
              keyHeld(keys, 'd', 'D', 'ArrowRight'),
            );
            clamp(state[side], side === 'p1' ? FIELD.left : 500, side === 'p1' ? 470 : FIELD.right);
            if (keyHeld(keys, ' ', 'Space', 'Enter')) shoot(side);
          };
          link?.setLocalKeys(state.keys);
          padSteer(you, state.keys);
          padSteer(them, link?.readRivalKeys() ?? {});
          reload(state.p1);
          reload(state.p2);
        } else {
        const p1x = state.p1.x;
        const p1y = state.p1.y;
        if (state.keys['w'] || state.keys['W']) state.p1.y -= speed;
        if (state.keys['s'] || state.keys['S']) state.p1.y += speed;
        if (state.keys['a'] || state.keys['A']) state.p1.x -= speed;
        if (state.keys['d'] || state.keys['D']) state.p1.x += speed;
        state.p1.moving = state.p1.x !== p1x || state.p1.y !== p1y;
        clamp(state.p1, FIELD.left, 470);
        reload(state.p1);
        if (state.keys[' ']) shoot('p1');

        reload(state.p2);
        if (botEnabled) {
          const beforeY = state.p2.y;
          const targetY = state.p1.y;
          if (state.p2.y < targetY) state.p2.y += 3;
          else if (state.p2.y > targetY) state.p2.y -= 3;
          if (state.p2.x > state.p1.x + 280) state.p2.x -= 2;
          if (state.p2.x < state.p1.x + 180) state.p2.x += 2;
          clamp(state.p2, 500, FIELD.right);
          state.p2.moving = state.p2.y !== beforeY;
          if (Math.abs(state.p2.y - state.p1.y) < 28 && state.frames > 90) {
            shoot('p2');
            if (state.p2.cooldown > 0) state.p2.cooldown = 48;
          }
        } else {
          const p2x = state.p2.x;
          const p2y = state.p2.y;
          if (state.keys['ArrowUp']) state.p2.y -= speed;
          if (state.keys['ArrowDown']) state.p2.y += speed;
          if (state.keys['ArrowLeft']) state.p2.x -= speed;
          if (state.keys['ArrowRight']) state.p2.x += speed;
          state.p2.moving = state.p2.x !== p2x || state.p2.y !== p2y;
          clamp(state.p2, 500, FIELD.right);
          if (state.keys['Enter']) shoot('p2');
        }
        }

        state.bullets = state.bullets.filter((bullet) => {
          bullet.x += bullet.vx;
          if (bullet.x < 0 || bullet.x > WIDTH) return false;
          const target = bullet.owner === 'p1' ? state.p2 : state.p1;
          const hit = bullet.x >= target.x && bullet.x <= target.x + BODY.w
            && bullet.y >= target.y && bullet.y <= target.y + BODY.h;
          if (!hit) return true;
          target.hp -= bullet.damage;
          target.flash = 10;
          state[bullet.owner].hits += 1;
          burst(state.sparks, bullet.x, bullet.y, bullet.owner === 'p1' ? CYAN.light : AMBER.light, 8);
          return false;
        });
      } else {
        reload(state.p1);
        reload(state.p2);
      }

      tickSparks();

      if (state.p1.hp <= 0) {
        state.ko = 'p2';
        state.koFrames = KO_FRAMES;
        burst(state.sparks, state.p1.x + 14, state.p1.y + 16, CYAN.light, 14);
      } else if (state.p2.hp <= 0) {
        state.ko = 'p1';
        state.koFrames = KO_FRAMES;
        burst(state.sparks, state.p2.x + 14, state.p2.y + 16, AMBER.light, 14);
      }

      drawWorld();
      animationFrameId = requestAnimationFrame(update);
    };

    animationFrameId = requestAnimationFrame(update);
    return () => {
      window.removeEventListener('keydown', handleKeyDown);
      window.removeEventListener('keyup', handleKeyUp);
      link?.stop();
      cancelAnimationFrame(animationFrameId);
    };
  }, [onGameEnd, botEnabled, world]);

  return (
    <canvas
      ref={canvasRef}
      width={WIDTH}
      height={HEIGHT}
      aria-label="Laser Duel"
      className="w-full max-w-full rounded-xl [image-rendering:pixelated]"
    />
  );
}
