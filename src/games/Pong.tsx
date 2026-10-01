import { useEffect, useRef } from 'react';

/** Velocidad máxima del bot (píxeles por frame). Ajustar para cambiar dificultad. */
const BOT_SPEED = 4;

const WIDTH = 960;
const HEIGHT = 540;
const FRAME = { x: 16, y: 90, w: 928, h: 434, cut: 26 };
const PLAY_TOP = 104;
const PLAY_BOTTOM = 510;
const PADDLE_W = 18;
const PADDLE_H = 108;
const P1_X = 62;
const P2_X = WIDTH - 62 - PADDLE_W;
const BALL_R = 6;
const WATER_Y = 352;
const SUN = { x: 480, y: 292, r: 62 };

const CYAN = '#3ec8ff';
const ORANGE = '#ff8c24';

const HEART = [
  '01100110',
  '11111111',
  '11111111',
  '01111110',
  '00111100',
  '00011000',
];

const STARS: [number, number][] = [
  [48, 118], [90, 150], [140, 128], [188, 168], [230, 112], [280, 146],
  [330, 124], [390, 160], [430, 118], [520, 132], [570, 156], [620, 114],
  [670, 148], [730, 122], [790, 164], [850, 136], [900, 118], [160, 200],
  [360, 188], [640, 196], [820, 186], [70, 210], [500, 176], [250, 214],
];

type Ctx = CanvasRenderingContext2D;

const traceChamfer = (ctx: Ctx, x: number, y: number, w: number, h: number, cut: number) => {
  ctx.beginPath();
  ctx.moveTo(x + cut, y);
  ctx.lineTo(x + w - cut, y);
  ctx.lineTo(x + w, y + cut);
  ctx.lineTo(x + w, y + h - cut);
  ctx.lineTo(x + w - cut, y + h);
  ctx.lineTo(x + cut, y + h);
  ctx.lineTo(x, y + h - cut);
  ctx.lineTo(x, y + cut);
  ctx.closePath();
};

const fillRidge = (ctx: Ctx, points: [number, number][], floor: number, color: string) => {
  const step = 8;
  ctx.fillStyle = color;
  for (let i = 0; i < points.length - 1; i += 1) {
    const [x0, y0] = points[i];
    const [x1, y1] = points[i + 1];
    if (x1 <= x0) continue;
    for (let x = x0; x < x1; x += step) {
      const t = (x - x0) / (x1 - x0);
      const y = Math.round((y0 + (y1 - y0) * t) / step) * step;
      ctx.fillRect(x, y, step + 1, Math.max(step, floor - y));
    }
  }
};

const drawHeart = (ctx: Ctx, x: number, y: number, color: string) => {
  ctx.fillStyle = color;
  HEART.forEach((row, rowIndex) => {
    for (let col = 0; col < row.length; col += 1) {
      if (row[col] !== '1') continue;
      ctx.fillRect(x + col * 3, y + rowIndex * 3, 3, 3);
    }
  });
};

const drawHearts = (ctx: Ctx, x: number, y: number, color: string) => {
  for (let i = 0; i < 3; i += 1) drawHeart(ctx, x + i * 30, y, color);
};

const drawBar = (ctx: Ctx, x: number, y: number, color: string) => {
  ctx.beginPath();
  ctx.roundRect(x, y, 132, 10, 5);
  ctx.fillStyle = color;
  ctx.fill();
  ctx.fillStyle = 'rgba(255,255,255,0.45)';
  ctx.fillRect(x + 8, y + 2, 116, 2);
};

const drawPanel = (ctx: Ctx, x: number, y: number, w: number, h: number, stroke: string | CanvasGradient) => {
  traceChamfer(ctx, x, y, w, h, 12);
  ctx.fillStyle = '#070b18';
  ctx.fill();
  ctx.strokeStyle = stroke;
  ctx.lineWidth = 3;
  ctx.stroke();
};

const drawHud = (ctx: Ctx, leftScore: number, rightScore: number) => {
  const y = 12;
  const h = 66;
  drawPanel(ctx, 16, y, 292, h, CYAN);
  drawHearts(ctx, 32, 28, CYAN);
  drawBar(ctx, 148, 40, CYAN);

  const fade = ctx.createLinearGradient(324, 0, 636, 0);
  fade.addColorStop(0, CYAN);
  fade.addColorStop(1, ORANGE);
  drawPanel(ctx, 324, y, 312, h, fade);

  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.font = '11px "Press Start 2P", monospace';
  ctx.fillStyle = '#f6f1e8';
  ctx.fillText('SCORE', 480, 30);
  ctx.font = '20px "Press Start 2P", monospace';
  ctx.fillStyle = CYAN;
  ctx.fillText(String(leftScore).padStart(2, '0'), 430, 54);
  ctx.fillStyle = '#f6f1e8';
  ctx.fillText('-', 480, 54);
  ctx.fillStyle = ORANGE;
  ctx.fillText(String(rightScore).padStart(2, '0'), 530, 54);
  ctx.textAlign = 'left';
  ctx.textBaseline = 'alphabetic';

  drawPanel(ctx, 652, y, 292, h, ORANGE);
  drawBar(ctx, 676, 40, ORANGE);
  drawHearts(ctx, 836, 28, ORANGE);
};

const drawCloud = (ctx: Ctx, x: number, y: number) => {
  ctx.fillStyle = '#4a3c86';
  ctx.fillRect(x + 8, y, 40, 8);
  ctx.fillRect(x, y + 8, 64, 8);
  ctx.fillRect(x + 16, y + 16, 28, 6);
};

const drawSun = (ctx: Ctx) => {
  const glow = ctx.createRadialGradient(SUN.x, SUN.y, 8, SUN.x, SUN.y, 110);
  glow.addColorStop(0, 'rgba(255, 150, 40, 0.35)');
  glow.addColorStop(1, 'rgba(255, 120, 20, 0)');
  ctx.fillStyle = glow;
  ctx.fillRect(SUN.x - 160, SUN.y - 160, 320, 320);

  ctx.save();
  ctx.beginPath();
  ctx.arc(SUN.x, SUN.y, SUN.r, 0, Math.PI * 2);
  ctx.clip();
  for (let y = SUN.y - SUN.r; y < SUN.y + SUN.r; y += 4) {
    const band = Math.floor((y - (SUN.y - SUN.r)) / 4);
    ctx.fillStyle = band % 2 === 0 ? '#ff9a1f' : '#e25c12';
    ctx.fillRect(SUN.x - SUN.r, y, SUN.r * 2, 4);
  }
  ctx.restore();
};

const drawWater = (ctx: Ctx) => {
  ctx.fillStyle = '#070e22';
  ctx.fillRect(FRAME.x, WATER_Y, FRAME.w, FRAME.y + FRAME.h - WATER_Y);
  for (let y = WATER_Y + 10; y < FRAME.y + FRAME.h - 12; y += 9) {
    ctx.fillStyle = 'rgba(70, 100, 170, 0.2)';
    ctx.fillRect(FRAME.x + 20, y, FRAME.w - 40, 2);
  }
  ctx.fillStyle = 'rgba(255, 168, 70, 0.45)';
  ctx.fillRect(SUN.x - 110, WATER_Y, 220, 3);
  for (let i = 0; i < 8; i += 1) {
    const y = WATER_Y + 10 + i * 14;
    const half = 100 - i * 6;
    const shift = i % 2 === 0 ? 0 : 10;
    ctx.fillStyle = `rgba(255, 138, 40, ${0.62 - i * 0.06})`;
    ctx.fillRect(SUN.x - half + shift, y, half * 2 - shift, 4);
  }
};

const drawField = (ctx: Ctx) => {
  const sky = ctx.createLinearGradient(0, FRAME.y, 0, WATER_Y);
  sky.addColorStop(0, '#0c1236');
  sky.addColorStop(0.55, '#1a1458');
  sky.addColorStop(1, '#3a1868');
  ctx.fillStyle = sky;
  ctx.fillRect(FRAME.x, FRAME.y, FRAME.w, FRAME.h);

  ctx.fillStyle = '#f8fafc';
  STARS.forEach(([x, y]) => {
    ctx.fillRect(x, y, 2, 2);
  });

  drawCloud(ctx, 70, 150);
  drawCloud(ctx, 250, 186);
  drawCloud(ctx, 620, 158);
  drawCloud(ctx, 800, 196);

  fillRidge(ctx, [
    [16, 280], [70, 220], [130, 250], [200, 190], [270, 230],
    [340, 200], [410, 260], [500, 250], [580, 210], [660, 240],
    [740, 180], [820, 220], [900, 190], [944, 240],
  ], WATER_Y + 6, '#322860');

  drawSun(ctx);

  fillRidge(ctx, [
    [16, 230], [60, 180], [120, 220], [190, 160], [260, 210],
    [330, 250], [400, 300], [470, 318], [540, 300], [620, 230],
    [700, 170], [780, 210], [860, 160], [944, 220],
  ], WATER_Y + 20, '#140e30');

  drawWater(ctx);

  ctx.save();
  ctx.setLineDash([3, 9]);
  ctx.strokeStyle = 'rgba(255,255,255,0.9)';
  ctx.lineWidth = 2;
  ctx.beginPath();
  ctx.moveTo(WIDTH / 2, PLAY_TOP);
  ctx.lineTo(WIDTH / 2, PLAY_BOTTOM);
  ctx.stroke();
  ctx.restore();
};

const drawCapsule = (ctx: Ctx, x: number, y: number, color: string, shine: string) => {
  ctx.beginPath();
  ctx.roundRect(x, y, PADDLE_W, PADDLE_H, PADDLE_W / 2);
  ctx.fillStyle = color;
  ctx.fill();
  ctx.fillStyle = shine;
  ctx.fillRect(x + 6, y + 14, 4, PADDLE_H - 28);
  ctx.fillStyle = 'rgba(255,255,255,0.85)';
  ctx.fillRect(x + 4, y + 8, PADDLE_W - 8, 3);
  ctx.fillRect(x + 4, y + PADDLE_H - 11, PADDLE_W - 8, 3);
};

const drawBall = (ctx: Ctx, x: number, y: number, trail: { x: number; y: number }[]) => {
  trail.forEach((point, index) => {
    const fade = (index + 1) / (trail.length + 1);
    ctx.beginPath();
    ctx.arc(point.x, point.y, 2 + fade * 2, 0, Math.PI * 2);
    ctx.fillStyle = `rgba(255,255,255,${0.15 + fade * 0.45})`;
    ctx.fill();
  });
  ctx.beginPath();
  ctx.arc(x, y, BALL_R, 0, Math.PI * 2);
  ctx.fillStyle = '#ffffff';
  ctx.fill();
};

const drawFrame = (ctx: Ctx) => {
  const border = ctx.createLinearGradient(FRAME.x, 0, FRAME.x + FRAME.w, 0);
  border.addColorStop(0, CYAN);
  border.addColorStop(0.46, '#5aa0ff');
  border.addColorStop(0.54, '#ff7a32');
  border.addColorStop(1, ORANGE);
  traceChamfer(ctx, FRAME.x, FRAME.y, FRAME.w, FRAME.h, FRAME.cut);
  ctx.strokeStyle = border;
  ctx.lineWidth = 5;
  ctx.stroke();
  traceChamfer(ctx, FRAME.x + 7, FRAME.y + 7, FRAME.w - 14, FRAME.h - 14, FRAME.cut - 4);
  ctx.strokeStyle = 'rgba(255,255,255,0.12)';
  ctx.lineWidth = 2;
  ctx.stroke();
};

export default function Pong({
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

    void document.fonts.load('20px "Press Start 2P"');

    let animationFrameId = 0;
    const paddleStart = (PLAY_TOP + PLAY_BOTTOM - PADDLE_H) / 2;
    const minPaddle = PLAY_TOP + 6;
    const maxPaddle = PLAY_BOTTOM - PADDLE_H - 6;

    const state = {
      p1: { y: paddleStart, score: 0 },
      p2: { y: paddleStart, score: 0 },
      ball: { x: WIDTH / 2, y: (PLAY_TOP + PLAY_BOTTOM) / 2, vx: 6, vy: 4 },
      trail: [] as { x: number; y: number }[],
      keys: {} as Record<string, boolean>,
    };

    const handleKeyDown = (e: KeyboardEvent) => { state.keys[e.key] = true; };
    const handleKeyUp = (e: KeyboardEvent) => { state.keys[e.key] = false; };
    window.addEventListener('keydown', handleKeyDown);
    window.addEventListener('keyup', handleKeyUp);

    const resetBall = () => {
      state.trail = [];
      state.ball = {
        x: WIDTH / 2,
        y: (PLAY_TOP + PLAY_BOTTOM) / 2,
        vx: Math.random() > 0.5 ? 6 : -6,
        vy: Math.random() > 0.5 ? 4 : -4,
      };
    };

    const update = () => {
      if (state.keys['w'] || state.keys['W']) state.p1.y = Math.max(minPaddle, state.p1.y - 7);
      if (state.keys['s'] || state.keys['S']) state.p1.y = Math.min(maxPaddle, state.p1.y + 7);

      if (botEnabled) {
        const paddleCenter = state.p2.y + PADDLE_H / 2;
        if (state.ball.y > paddleCenter) state.p2.y = Math.min(maxPaddle, state.p2.y + BOT_SPEED);
        else if (state.ball.y < paddleCenter) state.p2.y = Math.max(minPaddle, state.p2.y - BOT_SPEED);
      } else {
        if (state.keys['ArrowUp']) state.p2.y = Math.max(minPaddle, state.p2.y - 7);
        if (state.keys['ArrowDown']) state.p2.y = Math.min(maxPaddle, state.p2.y + 7);
      }

      state.trail.push({ x: state.ball.x, y: state.ball.y });
      if (state.trail.length > 8) state.trail.shift();

      state.ball.x += state.ball.vx;
      state.ball.y += state.ball.vy;

      if (state.ball.y <= PLAY_TOP + BALL_R) {
        state.ball.y = PLAY_TOP + BALL_R;
        state.ball.vy *= -1;
      }
      if (state.ball.y >= PLAY_BOTTOM - BALL_R) {
        state.ball.y = PLAY_BOTTOM - BALL_R;
        state.ball.vy *= -1;
      }

      const hitsPaddle = (paddleY: number) => (
        state.ball.y >= paddleY && state.ball.y <= paddleY + PADDLE_H
      );

      if (
        state.ball.vx < 0 &&
        state.ball.x <= P1_X + PADDLE_W + BALL_R &&
        state.ball.x >= P1_X - BALL_R &&
        hitsPaddle(state.p1.y)
      ) {
        state.ball.vx = Math.abs(state.ball.vx) * 1.1;
        state.ball.x = P1_X + PADDLE_W + BALL_R;
      }
      if (
        state.ball.vx > 0 &&
        state.ball.x >= P2_X - BALL_R &&
        state.ball.x <= P2_X + PADDLE_W + BALL_R &&
        hitsPaddle(state.p2.y)
      ) {
        state.ball.vx = -Math.abs(state.ball.vx) * 1.1;
        state.ball.x = P2_X - BALL_R;
      }

      if (state.ball.x < 0) { state.p2.score += 1; resetBall(); }
      if (state.ball.x > WIDTH) { state.p1.score += 1; resetBall(); }

      if (state.p1.score >= 10) { onGameEnd('p1'); return; }
      if (state.p2.score >= 10) { onGameEnd('p2'); return; }

      ctx.fillStyle = '#05070f';
      ctx.fillRect(0, 0, WIDTH, HEIGHT);
      ctx.save();
      traceChamfer(ctx, FRAME.x, FRAME.y, FRAME.w, FRAME.h, FRAME.cut);
      ctx.clip();
      drawField(ctx);
      drawCapsule(ctx, P1_X, state.p1.y, CYAN, '#d7f6ff');
      drawCapsule(ctx, P2_X, state.p2.y, ORANGE, '#ffe0bf');
      drawBall(ctx, state.ball.x, state.ball.y, state.trail);
      ctx.restore();
      drawFrame(ctx);
      drawHud(ctx, state.p1.score, state.p2.score);

      animationFrameId = requestAnimationFrame(update);
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
      width={WIDTH}
      height={HEIGHT}
      aria-label="Paddle Duel"
      className="w-full max-w-full rounded-xl [image-rendering:pixelated]"
    />
  );
}
