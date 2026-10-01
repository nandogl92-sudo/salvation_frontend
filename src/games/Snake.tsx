import { useEffect, useRef } from 'react';

const GRID_W = 28;
const GRID_H = 16;
const CELL = 20;
const OX = 188;
const OY = 108;
const PIX = '"Press Start 2P", monospace';

type Ctx = CanvasRenderingContext2D;

const PILLARS: [number, number][] = [
  [6, 3], [6, 12], [13, 2], [13, 13], [20, 3], [20, 12],
];

const BUGS: [number, number][] = [
  [3, 5], [9, 8], [16, 4], [23, 10], [11, 14], [18, 7],
];

const KEYS: [number, number][] = [
  [8, 11], [17, 3],
];

const isPillar = (x: number, y: number) => PILLARS.some(([px, py]) => px === x && py === y);

const formatTime = (ms: number) => {
  const total = Math.floor(ms / 1000);
  const minutes = String(Math.floor(total / 60)).padStart(2, '0');
  const seconds = String(total % 60).padStart(2, '0');
  return `${minutes}:${seconds}`;
};

const drawPanel = (ctx: Ctx, x: number, y: number, w: number, h: number) => {
  ctx.fillStyle = '#241838';
  ctx.fillRect(x, y, w, h);
  ctx.strokeStyle = '#c9a24a';
  ctx.strokeRect(x, y, w, h);
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
  const sky = ctx.createLinearGradient(0, 0, 0, 540);
  sky.addColorStop(0, '#140826');
  sky.addColorStop(1, '#3a1860');
  ctx.fillStyle = sky;
  ctx.fillRect(0, 0, 960, 540);
  ctx.fillStyle = '#f4f7fb';
  [[40, 30], [120, 70], [800, 40], [900, 90], [700, 24], [60, 120]].forEach(([x, y]) => {
    ctx.fillRect(x, y, 2, 2);
  });

  ctx.textAlign = 'center';
  ctx.fillStyle = '#f0d48a';
  ctx.font = `16px ${PIX}`;
  ctx.fillText('VENOM TEMPLE', 480, 36);

  ctx.fillStyle = '#2a1c40';
  ctx.fillRect(OX - 8, OY - 8, GRID_W * CELL + 16, GRID_H * CELL + 16);
  ctx.strokeStyle = '#8a6a3a';
  ctx.strokeRect(OX - 8, OY - 8, GRID_W * CELL + 16, GRID_H * CELL + 16);

  for (let y = 0; y < GRID_H; y += 1) {
    for (let x = 0; x < GRID_W; x += 1) {
      ctx.fillStyle = (x + y) % 2 === 0 ? '#3a3158' : '#322848';
      ctx.fillRect(OX + x * CELL, OY + y * CELL, CELL, CELL);
    }
  }
};

const drawPillar = (ctx: Ctx, x: number, y: number) => {
  const px = OX + x * CELL;
  const py = OY + y * CELL;
  ctx.fillStyle = '#6a5878';
  ctx.fillRect(px + 4, py + 2, 12, 16);
  ctx.fillStyle = '#c9a24a';
  ctx.fillRect(px + 2, py, 16, 4);
  ctx.fillRect(px + 2, py + 16, 16, 4);
};

const drawGem = (ctx: Ctx, x: number, y: number, color: string) => {
  const cx = OX + x * CELL + CELL / 2;
  const cy = OY + y * CELL + CELL / 2;
  ctx.fillStyle = color;
  ctx.beginPath();
  ctx.moveTo(cx, cy - 7);
  ctx.lineTo(cx + 6, cy);
  ctx.lineTo(cx, cy + 7);
  ctx.lineTo(cx - 6, cy);
  ctx.closePath();
  ctx.fill();
  ctx.fillStyle = '#ffffff';
  ctx.fillRect(cx - 2, cy - 3, 2, 2);
};

const drawBug = (ctx: Ctx, x: number, y: number) => {
  const px = OX + x * CELL + 4;
  const py = OY + y * CELL + 6;
  ctx.fillStyle = '#c45a2a';
  ctx.fillRect(px, py, 12, 8);
  ctx.fillStyle = '#111';
  ctx.fillRect(px + 2, py + 2, 2, 2);
  ctx.fillRect(px + 8, py + 2, 2, 2);
};

const drawKey = (ctx: Ctx, x: number, y: number) => {
  const px = OX + x * CELL + 6;
  const py = OY + y * CELL + 6;
  ctx.fillStyle = '#f0d48a';
  ctx.fillRect(px, py, 8, 8);
  ctx.fillRect(px + 6, py + 6, 6, 2);
  ctx.fillRect(px + 8, py + 8, 2, 3);
};

const drawSnakeBody = (
  ctx: Ctx,
  body: { x: number; y: number }[],
  color: string,
  accent: string,
) => {
  body.forEach((segment, index) => {
    const px = OX + segment.x * CELL;
    const py = OY + segment.y * CELL;
    ctx.fillStyle = index === 0 ? accent : color;
    ctx.fillRect(px + 2, py + 2, CELL - 4, CELL - 4);
    if (index !== 0) return;
    ctx.fillStyle = '#111';
    ctx.fillRect(px + 5, py + 6, 3, 3);
    ctx.fillRect(px + 12, py + 6, 3, 3);
    ctx.fillStyle = accent;
    ctx.fillRect(px + 8, py - 2, 4, 4);
  });
};

const drawHud = (
  ctx: Ctx,
  p1Gems: number,
  p2Gems: number,
  hi: number,
  level: number,
  boost: number,
  elapsed: number,
) => {
  ctx.textAlign = 'center';
  ctx.fillStyle = '#f4efe6';
  ctx.font = `8px ${PIX}`;
  ctx.fillText(`SCORE: ${String(p1Gems * 100).padStart(6, '0')}`, 360, 64);
  ctx.fillText(`HI-SCORE: ${String(hi).padStart(6, '0')}`, 620, 64);

  drawPanel(ctx, 16, 88, 156, 300);
  drawNagaPortrait(ctx, 62, 100);
  ctx.fillStyle = '#7ee0a8';
  ctx.font = `8px ${PIX}`;
  ctx.fillText('NAGA', 94, 184);
  ctx.fillStyle = '#f4efe6';
  ctx.font = `7px ${PIX}`;
  ctx.fillText('LEVEL', 94, 210);
  ctx.font = `18px ${PIX}`;
  ctx.fillText(String(level), 94, 238);
  ctx.fillStyle = '#1b2430';
  ctx.fillRect(36, 258, 116, 10);
  ctx.fillStyle = '#3dce4a';
  ctx.fillRect(36, 258, Math.max(0, boost) * 1.16, 10);
  ctx.fillStyle = '#7ee0a8';
  ctx.font = `7px ${PIX}`;
  ctx.fillText(`BOOST: ${Math.round(boost)}%`, 94, 290);
  ctx.fillText('RIVAL', 94, 320);
  ctx.fillStyle = '#d7b4ff';
  ctx.fillText(String(p2Gems * 100).padStart(6, '0'), 94, 340);

  drawPanel(ctx, 788, 88, 156, 168);
  ctx.fillStyle = '#f0d48a';
  ctx.font = `7px ${PIX}`;
  ctx.fillText('SPECIAL', 866, 110);
  ctx.fillStyle = '#7ee0ff';
  ctx.fillText('SPEED SURGE', 866, 136);
  ctx.fillStyle = '#9aa6b8';
  ctx.fillText('SHIFT', 866, 154);
  ctx.fillStyle = '#5c6570';
  ctx.fillText('VENOM SHIELD', 866, 182);
  ctx.fillText('EMBER BITE', 866, 210);
  ctx.fillText('BLOQUEADAS', 866, 232);

  drawPanel(ctx, 788, 268, 156, 120);
  ctx.fillStyle = '#f0d48a';
  ctx.fillText('GOAL', 866, 292);
  ctx.fillStyle = '#f4efe6';
  ctx.fillText('COME GEMAS', 866, 320);
  ctx.fillText(`${p1Gems} comidas`, 866, 344);

  drawPanel(ctx, 188, 448, 200, 72);
  ctx.fillStyle = '#f0d48a';
  ctx.font = `8px ${PIX}`;
  ctx.fillText('ROUND 1', 288, 478);
  ctx.fillStyle = '#f4efe6';
  ctx.fillText(`TIMER: ${formatTime(elapsed)}`, 288, 502);

  drawPanel(ctx, 400, 448, 360, 72);
  ctx.fillStyle = '#f4efe6';
  ctx.font = `7px ${PIX}`;
  ctx.fillText('WASD - MOVER', 580, 478);
  ctx.fillText('SHIFT - ACELERON', 580, 502);
  ctx.textAlign = 'left';
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

    void document.fonts.load(`10px ${PIX}`);

    let animationFrameId = 0;
    let lastTime = 0;
    const startedAt = performance.now();
    const state = {
      p1: { body: [{ x: 4, y: 4 }, { x: 3, y: 4 }, { x: 2, y: 4 }], dx: 1, dy: 0, gems: 0 },
      p2: { body: [{ x: 23, y: 12 }, { x: 24, y: 12 }, { x: 25, y: 12 }], dx: -1, dy: 0, gems: 0 },
      food: { x: 14, y: 8 },
      boost: 100,
      hi: 0,
      keys: {} as Record<string, boolean>,
    };

    const occupied = (x: number, y: number) => {
      if (isPillar(x, y)) return true;
      return [...state.p1.body, ...state.p2.body].some((segment) => segment.x === x && segment.y === y);
    };

    const placeFood = () => {
      for (let attempt = 0; attempt < 40; attempt += 1) {
        const x = Math.floor(Math.random() * GRID_W);
        const y = Math.floor(Math.random() * GRID_H);
        if (occupied(x, y)) continue;
        state.food = { x, y };
        return;
      }
    };

    const handleKeyDown = (event: KeyboardEvent) => {
      state.keys[event.key] = true;
      if (event.key.startsWith('Arrow') || event.key === ' ') event.preventDefault();
      if (event.key === 'w' && state.p1.dy === 0) { state.p1.dx = 0; state.p1.dy = -1; }
      if (event.key === 's' && state.p1.dy === 0) { state.p1.dx = 0; state.p1.dy = 1; }
      if (event.key === 'a' && state.p1.dx === 0) { state.p1.dx = -1; state.p1.dy = 0; }
      if (event.key === 'd' && state.p1.dx === 0) { state.p1.dx = 1; state.p1.dy = 0; }
      if (!botEnabled) {
        if (event.key === 'ArrowUp' && state.p2.dy === 0) { state.p2.dx = 0; state.p2.dy = -1; }
        if (event.key === 'ArrowDown' && state.p2.dy === 0) { state.p2.dx = 0; state.p2.dy = 1; }
        if (event.key === 'ArrowLeft' && state.p2.dx === 0) { state.p2.dx = -1; state.p2.dy = 0; }
        if (event.key === 'ArrowRight' && state.p2.dx === 0) { state.p2.dx = 1; state.p2.dy = 0; }
      }
    };
    const handleKeyUp = (event: KeyboardEvent) => { state.keys[event.key] = false; };
    window.addEventListener('keydown', handleKeyDown);
    window.addEventListener('keyup', handleKeyUp);

    const isSafe = (nx: number, ny: number) => {
      if (nx < 0 || nx >= GRID_W || ny < 0 || ny >= GRID_H) return false;
      if (isPillar(nx, ny)) return false;
      for (const segment of state.p1.body) {
        if (segment.x === nx && segment.y === ny) return false;
      }
      for (let i = 1; i < state.p2.body.length; i += 1) {
        if (state.p2.body[i].x === nx && state.p2.body[i].y === ny) return false;
      }
      return true;
    };

    const botThink = () => {
      const head = state.p2.body[0];
      const dirs = [
        { dx: 1, dy: 0 },
        { dx: -1, dy: 0 },
        { dx: 0, dy: 1 },
        { dx: 0, dy: -1 },
      ].filter((dir) => !(dir.dx === -state.p2.dx && dir.dy === -state.p2.dy));
      const scored = dirs.map((dir) => {
        const nx = head.x + dir.dx;
        const ny = head.y + dir.dy;
        const distToFood = Math.abs(nx - state.food.x) + Math.abs(ny - state.food.y);
        return { ...dir, nx, ny, distToFood };
      });
      scored.sort((a, b) => a.distToFood - b.distToFood);
      for (const dir of scored) {
        if (!isSafe(dir.nx, dir.ny)) continue;
        state.p2.dx = dir.dx;
        state.p2.dy = dir.dy;
        return;
      }
    };

    const checkCollision = (head: { x: number; y: number }, own: { x: number; y: number }[], other: { x: number; y: number }[]) => {
      if (head.x < 0 || head.x >= GRID_W || head.y < 0 || head.y >= GRID_H) return true;
      if (isPillar(head.x, head.y)) return true;
      for (let i = 1; i < own.length; i += 1) {
        if (head.x === own[i].x && head.y === own[i].y) return true;
      }
      for (let i = 1; i < other.length; i += 1) {
        if (head.x === other[i].x && head.y === other[i].y) return true;
      }
      return false;
    };

    const update = (time: number) => {
      animationFrameId = requestAnimationFrame(update);
      const boosting = Boolean(state.keys['Shift'] && state.boost > 8);
      const interval = boosting ? 55 : 110;
      if (time - lastTime < interval) return;
      lastTime = time;
      if (boosting) state.boost = Math.max(0, state.boost - 7);
      else state.boost = Math.min(100, state.boost + 2);

      if (botEnabled) botThink();

      [state.p1, state.p2].forEach((snake) => {
        const head = { x: snake.body[0].x + snake.dx, y: snake.body[0].y + snake.dy };
        snake.body.unshift(head);
        if (head.x === state.food.x && head.y === state.food.y) {
          snake.gems += 1;
          placeFood();
        } else {
          snake.body.pop();
        }
      });

      state.hi = Math.max(state.hi, state.p1.gems * 100, state.p2.gems * 100);
      const p1Dead = checkCollision(state.p1.body[0], state.p1.body, state.p2.body);
      const p2Dead = checkCollision(state.p2.body[0], state.p2.body, state.p1.body);
      if (p1Dead && p2Dead) { onGameEnd('p1'); return; }
      if (p1Dead) { onGameEnd('p2'); return; }
      if (p2Dead) { onGameEnd('p1'); return; }

      const gemColor = ['#5ee0ff', '#e85ad0', '#7dff6a', '#f0d48a'][state.p1.gems % 4];
      drawTemple(ctx);
      ctx.textAlign = 'center';
      PILLARS.forEach(([x, y]) => drawPillar(ctx, x, y));
      BUGS.forEach(([x, y]) => drawBug(ctx, x, y));
      KEYS.forEach(([x, y]) => drawKey(ctx, x, y));
      drawGem(ctx, state.food.x, state.food.y, gemColor);
      drawSnakeBody(ctx, state.p1.body, '#1f8a4c', '#7ee0a8');
      drawSnakeBody(ctx, state.p2.body, '#6a3a9a', '#d7b4ff');
      drawHud(
        ctx,
        state.p1.gems,
        state.p2.gems,
        state.hi,
        1 + Math.floor(state.p1.gems / 4),
        state.boost,
        performance.now() - startedAt,
      );
    };

    animationFrameId = requestAnimationFrame(update);
    return () => {
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
