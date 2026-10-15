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

type Ctx = CanvasRenderingContext2D;
type CellPos = { x: number; y: number };
type SnakeUnit = {
  body: CellPos[];
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
};

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

const drawPanel = (ctx: Ctx, x: number, y: number, w: number, h: number) => {
  ctx.fillStyle = '#160f24';
  ctx.fillRect(x, y, w, h);
  ctx.strokeStyle = '#c9a24a';
  ctx.strokeRect(x + 0.5, y + 0.5, w - 1, h - 1);
  ctx.strokeStyle = '#5c4318';
  ctx.strokeRect(x + 4, y + 4, w - 8, h - 8);
};

const drawNagaPortrait = (ctx: Ctx, x: number, y: number) => {
  ctx.fillStyle = '#140e22';
  ctx.fillRect(x, y, 64, 64);
  ctx.strokeStyle = '#c9a24a';
  ctx.strokeRect(x, y, 64, 64);
  ctx.fillStyle = '#1f8a4c';
  ctx.fillRect(x + 18, y + 10, 28, 22);
  ctx.fillRect(x + 14, y + 18, 8, 16);
  ctx.fillRect(x + 42, y + 18, 8, 16);
  ctx.fillStyle = '#f0d48a';
  ctx.fillRect(x + 22, y + 34, 20, 16);
  ctx.fillStyle = '#111';
  ctx.fillRect(x + 24, y + 18, 5, 5);
  ctx.fillRect(x + 36, y + 18, 5, 5);
  ctx.fillStyle = '#e23b4a';
  ctx.fillRect(x + 30, y + 28, 4, 8);
};

const drawTemple = (ctx: Ctx) => {
  const sky = ctx.createLinearGradient(0, 0, 0, HEIGHT);
  sky.addColorStop(0, '#12061f');
  sky.addColorStop(1, '#2a1248');
  ctx.fillStyle = sky;
  ctx.fillRect(0, 0, WIDTH, HEIGHT);
  ctx.fillStyle = '#f4f7fb';
  [[48, 18], [140, 40], [820, 22], [900, 48], [760, 16], [70, 50]].forEach(([x, y]) => {
    ctx.fillRect(x, y, 2, 2);
  });

  const fieldW = GRID_W * CELL;
  const fieldH = GRID_H * CELL;
  ctx.fillStyle = '#120c1c';
  ctx.fillRect(OX - 8, OY - 8, fieldW + 16, fieldH + 16);
  ctx.strokeStyle = '#e6c56a';
  ctx.strokeRect(OX - 8, OY - 8, fieldW + 16, fieldH + 16);
  ctx.strokeStyle = '#6a4e22';
  ctx.strokeRect(OX - 4, OY - 4, fieldW + 8, fieldH + 8);

  for (let y = 0; y < GRID_H; y += 1) {
    for (let x = 0; x < GRID_W; x += 1) {
      ctx.fillStyle = (x + y) % 2 === 0 ? '#2c2344' : '#231b38';
      ctx.fillRect(OX + x * CELL, OY + y * CELL, CELL, CELL);
    }
  }
};

const drawPillar = (ctx: Ctx, x: number, y: number) => {
  const px = OX + x * CELL;
  const py = OY + y * CELL;
  ctx.fillStyle = '#8d7aa0';
  ctx.fillRect(px + 5, py + 3, 10, 14);
  ctx.fillStyle = '#f0d48a';
  ctx.fillRect(px + 2, py + 1, 16, 4);
  ctx.fillRect(px + 2, py + 15, 16, 4);
  ctx.fillStyle = '#fff6d0';
  ctx.fillRect(px + 4, py + 2, 4, 2);
};

const drawGap = (ctx: Ctx, x: number, y: number) => {
  const px = OX + x * CELL;
  const py = OY + y * CELL;
  ctx.fillStyle = '#f0d48a';
  ctx.fillRect(px + 4, py + 4, CELL - 8, CELL - 8);
  ctx.fillStyle = '#231b38';
  ctx.fillRect(px + 7, py + 7, CELL - 14, CELL - 14);
};

const drawGem = (ctx: Ctx, x: number, y: number, color: string) => {
  const cx = OX + x * CELL + CELL / 2;
  const cy = OY + y * CELL + CELL / 2;
  ctx.fillStyle = '#1a1020';
  ctx.beginPath();
  ctx.moveTo(cx, cy - 9);
  ctx.lineTo(cx + 8, cy);
  ctx.lineTo(cx, cy + 9);
  ctx.lineTo(cx - 8, cy);
  ctx.closePath();
  ctx.fill();
  ctx.fillStyle = color;
  ctx.beginPath();
  ctx.moveTo(cx, cy - 7);
  ctx.lineTo(cx + 6, cy);
  ctx.lineTo(cx, cy + 7);
  ctx.lineTo(cx - 6, cy);
  ctx.closePath();
  ctx.fill();
  ctx.fillStyle = '#ffffff';
  ctx.fillRect(cx - 2, cy - 4, 3, 3);
};

const drawRareGem = (ctx: Ctx, x: number, y: number) => {
  const px = OX + x * CELL;
  const py = OY + y * CELL;
  ctx.fillStyle = '#ffd76a';
  ctx.fillRect(px + 1, py + 1, CELL - 2, CELL - 2);
  ctx.fillStyle = '#3a1860';
  ctx.fillRect(px + 3, py + 3, CELL - 6, CELL - 6);
  const cx = px + CELL / 2;
  const cy = py + CELL / 2;
  ctx.fillStyle = '#ff5a3c';
  ctx.beginPath();
  ctx.moveTo(cx, cy - 8);
  ctx.lineTo(cx + 7, cy);
  ctx.lineTo(cx, cy + 8);
  ctx.lineTo(cx - 7, cy);
  ctx.closePath();
  ctx.fill();
  ctx.fillStyle = '#fff6d0';
  ctx.fillRect(cx - 2, cy - 2, 4, 4);
};

const drawBug = (ctx: Ctx, x: number, y: number) => {
  const px = OX + x * CELL + 3;
  const py = OY + y * CELL + 5;
  ctx.fillStyle = '#ff8a3d';
  ctx.fillRect(px + 1, py + 2, 12, 8);
  ctx.fillStyle = '#7a2e10';
  ctx.fillRect(px, py, 3, 4);
  ctx.fillRect(px + 11, py, 3, 4);
  ctx.fillRect(px + 2, py + 10, 2, 3);
  ctx.fillRect(px + 10, py + 10, 2, 3);
  ctx.fillStyle = '#111';
  ctx.fillRect(px + 3, py + 4, 2, 2);
  ctx.fillRect(px + 9, py + 4, 2, 2);
};

const drawKey = (ctx: Ctx, x: number, y: number) => {
  const px = OX + x * CELL + 3;
  const py = OY + y * CELL + 4;
  ctx.fillStyle = '#fff6d0';
  ctx.fillRect(px, py, 10, 10);
  ctx.fillStyle = '#3a1860';
  ctx.fillRect(px + 3, py + 3, 4, 4);
  ctx.fillStyle = '#f0d48a';
  ctx.fillRect(px + 8, py + 4, 8, 3);
  ctx.fillRect(px + 12, py + 7, 3, 4);
  ctx.fillRect(px + 9, py + 7, 3, 3);
};

const drawSnakeBody = (
  ctx: Ctx,
  body: CellPos[],
  color: string,
  accent: string,
  shielded: boolean,
  slowed: boolean,
) => {
  body.forEach((segment, index) => {
    const px = OX + segment.x * CELL;
    const py = OY + segment.y * CELL;
    ctx.fillStyle = '#120c18';
    ctx.fillRect(px + 1, py + 1, CELL - 2, CELL - 2);
    ctx.fillStyle = index === 0 ? accent : color;
    ctx.fillRect(px + 3, py + 3, CELL - 6, CELL - 6);
    if (index !== 0) return;
    ctx.fillStyle = '#111';
    ctx.fillRect(px + 5, py + 6, 4, 4);
    ctx.fillRect(px + 11, py + 6, 4, 4);
    ctx.fillStyle = '#fff';
    ctx.fillRect(px + 6, py + 7, 2, 2);
    ctx.fillRect(px + 12, py + 7, 2, 2);
    ctx.fillStyle = accent;
    ctx.fillRect(px + 8, py - 1, 4, 4);
    if (shielded) {
      ctx.strokeStyle = '#7ee0ff';
      ctx.lineWidth = 2;
      ctx.strokeRect(px - 1, py - 1, CELL + 2, CELL + 2);
      ctx.lineWidth = 1;
    }
    if (slowed) {
      ctx.strokeStyle = '#ff8a3d';
      ctx.strokeRect(px + 2, py + 2, CELL - 4, CELL - 4);
    }
  });
};

const drawMeter = (ctx: Ctx, x: number, y: number, w: number, h: number, value: number, color: string) => {
  ctx.fillStyle = '#0c0814';
  ctx.fillRect(x, y, w, h);
  ctx.fillStyle = color;
  ctx.fillRect(x, y, Math.round(Math.max(0, Math.min(100, value)) / 100 * w), h);
  ctx.strokeStyle = '#5c4318';
  ctx.strokeRect(x, y, w, h);
};

const abilityLabel = (value: number) => (value >= 100 ? 'LISTA' : `${Math.round(value)}%`);

const drawPips = (ctx: Ctx, x: number, y: number, count: number, on: string) => {
  const size = 12;
  const gap = 3;
  for (let i = 0; i < GEM_GOAL; i += 1) {
    const col = i % 10;
    const row = Math.floor(i / 10);
    ctx.fillStyle = i < count ? on : '#2a2140';
    ctx.fillRect(x + col * (size + gap), y + row * (size + gap), size, size);
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
  drawPanel(ctx, 10, 6, WIDTH - 20, 62);
  ctx.fillStyle = '#f0d48a';
  ctx.font = `13px ${PIX}`;
  ctx.fillText('VENOM TEMPLE', WIDTH / 2, 26);
  ctx.font = `8px ${PIX}`;
  ctx.fillStyle = '#7ee0a8';
  ctx.fillText('TU', 118, 46);
  ctx.font = `14px ${PIX}`;
  ctx.fillText(`${p1.gems}/${GEM_GOAL}`, 210, 50);
  ctx.fillStyle = '#f4efe6';
  ctx.font = `8px ${PIX}`;
  ctx.fillText('TIEMPO', WIDTH / 2, 44);
  ctx.font = `12px ${PIX}`;
  ctx.fillText(formatTime(elapsed), WIDTH / 2, 60);
  ctx.fillStyle = '#d7b4ff';
  ctx.font = `8px ${PIX}`;
  ctx.fillText('RIVAL', WIDTH - 118, 46);
  ctx.font = `14px ${PIX}`;
  ctx.fillText(`${p2.gems}/${GEM_GOAL}`, WIDTH - 210, 50);
  ctx.fillStyle = '#9aa6b8';
  ctx.font = `8px ${PIX}`;
  ctx.fillText(`MAX ${String(hi).padStart(4, '0')}`, WIDTH / 2 + 150, 28);

  drawPanel(ctx, 10, OY, 170, GRID_H * CELL);
  const left = 95;
  drawNagaPortrait(ctx, left - 32, OY + 14);
  ctx.fillStyle = '#7ee0a8';
  ctx.font = `8px ${PIX}`;
  ctx.fillText('NAGA', left, OY + 96);
  ctx.fillStyle = '#f4efe6';
  ctx.fillText('NIVEL', left, OY + 118);
  ctx.font = `20px ${PIX}`;
  ctx.fillText(String(level), left, OY + 146);
  ctx.font = `8px ${PIX}`;
  ctx.fillStyle = '#7ee0a8';
  ctx.fillText('ACELERON', left, OY + 172);
  drawMeter(ctx, 24, OY + 182, 142, 14, p1.boost, '#3dce4a');
  ctx.fillStyle = '#f4efe6';
  ctx.fillText(`${Math.round(p1.boost)}%`, left, OY + 214);
  ctx.fillStyle = '#d7b4ff';
  ctx.fillText('RIVAL', left, OY + 242);
  drawMeter(ctx, 24, OY + 252, 142, 12, p2.boost, '#b07adf');
  ctx.font = `8px ${PIX}`;
  ctx.fillStyle = '#f4efe6';
  ctx.fillText(`K ${abilityLabel(p2.shield)}`, left, OY + 286);
  ctx.fillText(`L ${abilityLabel(p2.bite)}`, left, OY + 306);

  drawPanel(ctx, 768, OY, 182, GRID_H * CELL);
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

    let animationFrameId = 0;
    let ended = false;
    const startedAt = performance.now();
    const makeSnake = (body: CellPos[], dx: number): SnakeUnit => ({
      body,
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

    const finish = (winner: 'p1' | 'p2') => {
      if (ended) return;
      ended = true;
      onGameEnd(winner);
    };

    const useShield = (snake: SnakeUnit, now: number) => {
      if (snake.shield < 100) return;
      snake.shield = 0;
      snake.shieldUntil = now + SHIELD_MS;
    };

    const useBite = (attacker: SnakeUnit, victim: SnakeUnit, now: number) => {
      if (attacker.bite < 100) return;
      const canSteal = victim.gems > 0;
      const cut = Math.min(3, Math.max(0, victim.body.length - 3));
      if (!canSteal && cut === 0) return;
      attacker.bite = 0;
      if (canSteal) {
        victim.gems -= 1;
        attacker.gems += 1;
      }
      if (cut > 0) victim.body.splice(victim.body.length - cut, cut);
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
      if (key === 'w' && state.p1.dy === 0) { state.p1.dx = 0; state.p1.dy = -1; }
      if (key === 's' && state.p1.dy === 0) { state.p1.dx = 0; state.p1.dy = 1; }
      if (key === 'a' && state.p1.dx === 0) { state.p1.dx = -1; state.p1.dy = 0; }
      if (key === 'd' && state.p1.dx === 0) { state.p1.dx = 1; state.p1.dy = 0; }
      if (key === 'q') useShield(state.p1, now);
      if (key === 'e') useBite(state.p1, state.p2, now);
      if (key === 'Shift') state.p1.wantsBoost = true;
      if (!botEnabled) {
        if (event.key === 'ArrowUp' && state.p2.dy === 0) { state.p2.dx = 0; state.p2.dy = -1; }
        if (event.key === 'ArrowDown' && state.p2.dy === 0) { state.p2.dx = 0; state.p2.dy = 1; }
        if (event.key === 'ArrowLeft' && state.p2.dx === 0) { state.p2.dx = -1; state.p2.dy = 0; }
        if (event.key === 'ArrowRight' && state.p2.dx === 0) { state.p2.dx = 1; state.p2.dy = 0; }
        if (key === 'k') useShield(state.p2, now);
        if (key === 'l') useBite(state.p2, state.p1, now);
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
        state.p2.dx = picked.dx;
        state.p2.dy = picked.dy;
      } else if (state.p2.shield >= 100) {
        useShield(state.p2, now);
      }
      state.p2.wantsBoost = manhattan(head, foodTarget) > 8 && state.p2.boost > 30;
      if (state.p2.bite >= 100 && (state.p1.gems > 0 || state.p1.body.length > 5) && manhattan(head, state.p1.body[0]) < 8) {
        useBite(state.p2, state.p1, now);
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

    const stepSnake = (id: 'p1' | 'p2', now: number) => {
      const snake = state[id];
      const other = id === 'p1' ? state.p2 : state.p1;
      if (now - snake.lastMove < intervalFor(snake, now)) return false;
      snake.lastMove = now;
      const next = { x: snake.body[0].x + snake.dx, y: snake.body[0].y + snake.dy };
      const deadly = hits(next, snake, other);
      if (deadly && snake.shieldUntil > now) return false;
      snake.body.unshift(next);
      let grew = false;
      if (sameCell(next, state.food)) {
        snake.gems += 1;
        grew = true;
        placeFood();
      } else if (state.rare && sameCell(next, state.rare)) {
        applyRare(snake, other, now);
        grew = true;
      }
      const bugIndex = state.bugs.findIndex((bug) => sameCell(bug, next));
      if (bugIndex >= 0) {
        state.bugs.splice(bugIndex, 1);
        snake.slowUntil = now + SLOW_MS;
        state.bugRespawns.push(now + RESPAWN_MS);
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

    const update = (time: number) => {
      if (ended) return;
      animationFrameId = requestAnimationFrame(update);
      recharge(time);
      flushRespawns(time);
      spawnRare(time);
      const crushed = restoreGap(time);
      if (botEnabled) botThink(time);

      const p1Dead = stepSnake('p1', time);
      const p2Dead = stepSnake('p2', time);
      state.hi = Math.max(state.hi, state.p1.gems * 100, state.p2.gems * 100);

      const p1Lost = p1Dead || crushed === 'p1' || crushed === 'both';
      const p2Lost = p2Dead || crushed === 'p2' || crushed === 'both';
      if (p1Lost && p2Lost) { finish('p1'); return; }
      if (p1Lost) { finish('p2'); return; }
      if (p2Lost) { finish('p1'); return; }
      const winner = gemWinner();
      if (winner) { finish(winner); return; }

      const gemColor = ['#5ee0ff', '#e85ad0', '#7dff6a', '#f0d48a'][state.p1.gems % 4];
      drawTemple(ctx);
      ctx.textAlign = 'center';
      state.pillars.forEach(([x, y]) => drawPillar(ctx, x, y));
      if (state.hidden) drawGap(ctx, state.hidden.x, state.hidden.y);
      state.bugs.forEach((bug) => drawBug(ctx, bug.x, bug.y));
      state.keys.forEach((key) => drawKey(ctx, key.x, key.y));
      drawGem(ctx, state.food.x, state.food.y, gemColor);
      if (state.rare) drawRareGem(ctx, state.rare.x, state.rare.y);
      drawSnakeBody(ctx, state.p1.body, '#1f8a4c', '#7ee0a8', state.p1.shieldUntil > time, state.p1.slowUntil > time);
      drawSnakeBody(ctx, state.p2.body, '#6a3a9a', '#d7b4ff', state.p2.shieldUntil > time, state.p2.slowUntil > time);
      drawHud(ctx, state.p1, state.p2, state.hi, time - startedAt, time);
      if (state.noteUntil > time) {
        const label = state.note;
        ctx.font = `12px ${PIX}`;
        ctx.textAlign = 'center';
        const plateW = label.length * 12 + 28;
        const plateX = OX + (GRID_W * CELL - plateW) / 2;
        const plateY = OY + 8;
        ctx.fillStyle = '#160f24';
        ctx.fillRect(plateX, plateY, plateW, 24);
        ctx.strokeStyle = '#f0d48a';
        ctx.strokeRect(plateX, plateY, plateW, 24);
        ctx.fillStyle = '#ffd76a';
        ctx.fillText(label, OX + (GRID_W * CELL) / 2, plateY + 17);
        ctx.textAlign = 'left';
      }
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
      width={960}
      height={540}
      aria-label="Worm Clash"
      className="w-full max-w-full rounded-xl [image-rendering:pixelated]"
    />
  );
}
