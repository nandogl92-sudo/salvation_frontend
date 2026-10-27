import { useEffect, useRef } from 'react';
import { keyHeld, otherSide, startLiveInputs, stepPlayHead } from './liveInputs';
import { makeRng, rankedCountdown, sideLabel, type SharedWorld } from './sharedWorld';

/** Velocidad máxima del bot (píxeles por frame). Ajustar para cambiar dificultad. */
const BOT_SPEED = 4;

const WIDTH = 960;
const HEIGHT = 540;
const FRAME = { x: 16, y: 90, w: 928, h: 434, cut: 26 };
const SKY_BOTTOM = 136;
const PLAY_TOP = 152;
const PLAY_BOTTOM = 508;
const WALL_H = 14;
const PADDLE_W = 18;
const PADDLE_H = 108;
const P1_X = 62;
const P2_X = WIDTH - 62 - PADDLE_W;
const BALL_R = 6;
const MAX_BALL_SPEED = 15;
const SERVICE_LEFT = 272;
const SERVICE_RIGHT = WIDTH - 272;
const SUN = { x: 480, y: 128, r: 22 };
const PLAYER_SCALE = 3;
const SWING_FRAMES = 10;
const SHAKE_FRAMES = 12;

const CYAN = '#3ec8ff';
const ORANGE = '#ff8c24';
const BALL_COLOR = '#d9f23c';
const COURT_ART_SRC = '/paddle-duel.jpg';

const courtArt = new Image();
let courtArtReady = false;
courtArt.onload = () => {
  courtArtReady = true;
};
courtArt.src = COURT_ART_SRC;

const drawCover = (ctx: Ctx, image: HTMLImageElement, x: number, y: number, w: number, h: number) => {
  const scale = Math.max(w / image.width, h / image.height);
  const dw = image.width * scale;
  const dh = image.height * scale;
  ctx.drawImage(image, x + (w - dw) / 2, y + (h - dh) / 2, dw, dh);
};

const STARS: [number, number][] = [
  [48, 100], [120, 112], [200, 96], [300, 118], [380, 102], [600, 108],
  [690, 96], [780, 116], [860, 100], [920, 112], [250, 128], [720, 126],
];

type Ctx = CanvasRenderingContext2D;

type Team = {
  main: string;
  dark: string;
  light: string;
};

const TEAM_P1: Team = { main: CYAN, dark: '#1d6f99', light: '#d7f6ff' };
const TEAM_P2: Team = { main: ORANGE, dark: '#a34f0e', light: '#ffe0bf' };

/**
 * Jugador en pixel art, 12 columnas x 17 filas, mirando a la derecha.
 * c cap · v visera · s piel · e ojo · t camiseta · d camiseta oscura
 * w cuello · p pantalón · k zapatilla
 */
const PLAYER_ROWS = [
  '....cccc....',
  '...cccccc...',
  '...ccccccvv.',
  '...ssssss...',
  '...sssses...',
  '....ssss....',
  '...wtttttw..',
  '..tttttttt..',
  '..sdtttttds.',
  '...dttttd...',
  '...dttttd...',
  '...pppppp...',
  '...pppppp...',
  '...ss..ss...',
  '...ss..ss...',
  '...ss..ss...',
  '..kkk..kkk..',
];

const LEG_ROWS_STEP = [
  '..ss....ss..',
  '..ss....ss..',
  '...ss..ss...',
  '.kkk....kkk.',
];

const PLAYER_W = PLAYER_ROWS[0].length * PLAYER_SCALE;
const PLAYER_H = PLAYER_ROWS.length * PLAYER_SCALE;

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

const drawPanel = (ctx: Ctx, x: number, y: number, w: number, h: number, stroke: string | CanvasGradient) => {
  traceChamfer(ctx, x, y, w, h, 12);
  ctx.fillStyle = '#070b18';
  ctx.fill();
  ctx.strokeStyle = stroke;
  ctx.lineWidth = 3;
  ctx.stroke();
};

const drawHud = (
  ctx: Ctx,
  leftScore: number,
  rightScore: number,
  botEnabled: boolean,
  leftName = 'P1',
  rightName = 'P2',
) => {
  const y = 12;
  const h = 66;
  ctx.textBaseline = 'middle';

  drawPanel(ctx, 16, y, 292, h, CYAN);
  ctx.textAlign = 'left';
  ctx.font = '18px "Press Start 2P", monospace';
  ctx.fillStyle = CYAN;
  ctx.fillText(leftName, 40, 46);
  ctx.font = '8px "Press Start 2P", monospace';
  ctx.fillStyle = '#9fb3c8';
  ctx.fillText('W / S', 104, 38);
  ctx.fillStyle = '#f6f1e8';
  ctx.fillText('PRIMERO A 10', 104, 56);

  const fade = ctx.createLinearGradient(324, 0, 636, 0);
  fade.addColorStop(0, CYAN);
  fade.addColorStop(1, ORANGE);
  drawPanel(ctx, 324, y, 312, h, fade);
  ctx.textAlign = 'center';
  ctx.font = '10px "Press Start 2P", monospace';
  ctx.fillStyle = '#f6f1e8';
  ctx.fillText('PADDLE DUEL', 480, 30);
  ctx.font = '22px "Press Start 2P", monospace';
  ctx.fillStyle = CYAN;
  ctx.fillText(String(leftScore).padStart(2, '0'), 426, 56);
  ctx.fillStyle = '#f6f1e8';
  ctx.fillText('-', 480, 56);
  ctx.fillStyle = ORANGE;
  ctx.fillText(String(rightScore).padStart(2, '0'), 534, 56);

  drawPanel(ctx, 652, y, 292, h, ORANGE);
  ctx.textAlign = 'right';
  ctx.font = '18px "Press Start 2P", monospace';
  ctx.fillStyle = ORANGE;
  ctx.fillText(rightName, 920, 46);
  ctx.font = '8px "Press Start 2P", monospace';
  ctx.fillStyle = '#9fb3c8';
  ctx.fillText(botEnabled ? 'BOT' : 'FLECHAS', 856, 38);
  ctx.fillStyle = '#f6f1e8';
  ctx.fillText('PRIMERO A 10', 856, 56);

  ctx.textAlign = 'left';
  ctx.textBaseline = 'alphabetic';
};

const drawSun = (ctx: Ctx) => {
  const glow = ctx.createRadialGradient(SUN.x, SUN.y, 4, SUN.x, SUN.y, 70);
  glow.addColorStop(0, 'rgba(255, 150, 40, 0.4)');
  glow.addColorStop(1, 'rgba(255, 120, 20, 0)');
  ctx.fillStyle = glow;
  ctx.fillRect(SUN.x - 90, FRAME.y, 180, SKY_BOTTOM - FRAME.y);

  ctx.save();
  ctx.beginPath();
  ctx.arc(SUN.x, SUN.y, SUN.r, 0, Math.PI * 2);
  ctx.clip();
  for (let y = SUN.y - SUN.r; y < SUN.y + SUN.r; y += 3) {
    const band = Math.floor((y - (SUN.y - SUN.r)) / 3);
    ctx.fillStyle = band % 2 === 0 ? '#ff9a1f' : '#e25c12';
    ctx.fillRect(SUN.x - SUN.r, y, SUN.r * 2, 3);
  }
  ctx.restore();
};

const drawSky = (ctx: Ctx) => {
  const sky = ctx.createLinearGradient(0, FRAME.y, 0, SKY_BOTTOM);
  sky.addColorStop(0, '#0c1236');
  sky.addColorStop(0.6, '#2a1660');
  sky.addColorStop(1, '#6a2a6c');
  ctx.fillStyle = sky;
  ctx.fillRect(FRAME.x, FRAME.y, FRAME.w, SKY_BOTTOM - FRAME.y);

  ctx.fillStyle = '#f8fafc';
  STARS.forEach(([x, y]) => {
    ctx.fillRect(x, y, 2, 2);
  });

  fillRidge(ctx, [
    [16, 134], [80, 112], [150, 126], [230, 104], [320, 122], [420, 110],
    [540, 118], [640, 100], [740, 120], [830, 104], [900, 118], [944, 126],
  ], SKY_BOTTOM, '#3a2a6a');
  drawSun(ctx);
  fillRidge(ctx, [
    [16, 136], [90, 120], [180, 132], [280, 116], [380, 130], [480, 134],
    [580, 124], [690, 112], [800, 128], [880, 118], [944, 130],
  ], SKY_BOTTOM, '#1a1038');
};

const drawCourtFloor = (ctx: Ctx) => {
  const floor = ctx.createLinearGradient(0, PLAY_TOP, 0, PLAY_BOTTOM);
  floor.addColorStop(0, '#1b5a98');
  floor.addColorStop(1, '#2c80c8');
  ctx.fillStyle = floor;
  ctx.fillRect(FRAME.x, PLAY_TOP, FRAME.w, PLAY_BOTTOM - PLAY_TOP);

  ctx.fillStyle = 'rgba(0, 0, 0, 0.08)';
  for (let y = PLAY_TOP + 6; y < PLAY_BOTTOM; y += 12) {
    ctx.fillRect(FRAME.x, y, FRAME.w, 1);
  }

  const sideShade = ctx.createLinearGradient(FRAME.x, 0, FRAME.x + FRAME.w, 0);
  sideShade.addColorStop(0, 'rgba(0, 0, 0, 0.35)');
  sideShade.addColorStop(0.18, 'rgba(0, 0, 0, 0)');
  sideShade.addColorStop(0.82, 'rgba(0, 0, 0, 0)');
  sideShade.addColorStop(1, 'rgba(0, 0, 0, 0.35)');
  ctx.fillStyle = sideShade;
  ctx.fillRect(FRAME.x, PLAY_TOP, FRAME.w, PLAY_BOTTOM - PLAY_TOP);

  const midY = (PLAY_TOP + PLAY_BOTTOM) / 2;
  ctx.fillStyle = '#f6f8ff';
  ctx.fillRect(FRAME.x, PLAY_TOP + 2, FRAME.w, 3);
  ctx.fillRect(FRAME.x, PLAY_BOTTOM - 5, FRAME.w, 3);
  ctx.fillRect(SERVICE_LEFT, PLAY_TOP, 3, PLAY_BOTTOM - PLAY_TOP);
  ctx.fillRect(SERVICE_RIGHT - 3, PLAY_TOP, 3, PLAY_BOTTOM - PLAY_TOP);
  ctx.fillRect(FRAME.x, midY - 1, SERVICE_LEFT - FRAME.x, 3);
  ctx.fillRect(SERVICE_RIGHT, midY - 1, FRAME.x + FRAME.w - SERVICE_RIGHT, 3);

  ctx.fillStyle = 'rgba(0, 0, 0, 0.22)';
  ctx.fillRect(WIDTH / 2 + 5, PLAY_TOP, 10, PLAY_BOTTOM - PLAY_TOP);
};

const drawNet = (ctx: Ctx) => {
  const x = WIDTH / 2 - 4;
  ctx.fillStyle = 'rgba(240, 246, 255, 0.28)';
  ctx.fillRect(x, PLAY_TOP, 8, PLAY_BOTTOM - PLAY_TOP);
  ctx.fillStyle = 'rgba(10, 20, 40, 0.55)';
  for (let y = PLAY_TOP; y < PLAY_BOTTOM; y += 6) {
    ctx.fillRect(x, y, 8, 1);
  }
  ctx.fillRect(x + 3, PLAY_TOP, 2, PLAY_BOTTOM - PLAY_TOP);
  ctx.fillStyle = '#f6f8ff';
  ctx.fillRect(x - 1, PLAY_TOP, 10, 4);
  ctx.fillRect(x - 1, PLAY_BOTTOM - 4, 10, 4);
  ctx.fillStyle = '#2c3240';
  ctx.fillRect(x - 3, PLAY_TOP - 8, 14, 12);
  ctx.fillRect(x - 3, PLAY_BOTTOM - 4, 14, 12);
  ctx.fillStyle = '#8c94a6';
  ctx.fillRect(x - 1, PLAY_TOP - 6, 10, 3);
  ctx.fillRect(x - 1, PLAY_BOTTOM - 2, 10, 3);
};

const drawGlassWall = (ctx: Ctx, y: number) => {
  ctx.fillStyle = 'rgba(170, 220, 255, 0.32)';
  ctx.fillRect(FRAME.x, y, FRAME.w, WALL_H);
  ctx.fillStyle = 'rgba(255, 255, 255, 0.35)';
  for (let x = FRAME.x + 12; x < FRAME.x + FRAME.w; x += 58) {
    ctx.fillRect(x, y + 2, 12, 2);
    ctx.fillRect(x + 4, y + 6, 8, 2);
  }
  ctx.fillStyle = '#1b2230';
  for (let x = FRAME.x; x <= FRAME.x + FRAME.w; x += 116) {
    ctx.fillRect(x - 2, y, 4, WALL_H);
  }
  ctx.fillRect(FRAME.x, y, FRAME.w, 2);
  ctx.fillRect(FRAME.x, y + WALL_H - 2, FRAME.w, 2);
};

const drawFence = (ctx: Ctx, x: number) => {
  ctx.fillStyle = 'rgba(200, 220, 240, 0.22)';
  for (let y = PLAY_TOP; y < PLAY_BOTTOM; y += 6) {
    ctx.fillRect(x, y, 12, 1);
  }
  for (let fx = x; fx <= x + 12; fx += 6) {
    ctx.fillRect(fx, PLAY_TOP, 1, PLAY_BOTTOM - PLAY_TOP);
  }
};

const drawField = (ctx: Ctx) => {
  drawSky(ctx);
  drawCourtFloor(ctx);
  drawGlassWall(ctx, PLAY_TOP - WALL_H);
  drawGlassWall(ctx, PLAY_BOTTOM);
  drawFence(ctx, FRAME.x + 2);
  drawFence(ctx, FRAME.x + FRAME.w - 14);
  drawNet(ctx);
};

const pixelColor = (char: string, team: Team): string | null => {
  switch (char) {
    case 'c': return team.main;
    case 'v': return '#f6f8ff';
    case 's': return '#f0b98a';
    case 'e': return '#1a1a24';
    case 't': return team.main;
    case 'd': return team.dark;
    case 'w': return '#f6f8ff';
    case 'p': return '#1f2a44';
    case 'k': return '#eef2f8';
    default: return null;
  }
};

const drawPlayer = (ctx: Ctx, x: number, y: number, dir: 1 | -1, team: Team, step: number, swing: number) => {
  ctx.save();
  ctx.translate(dir === 1 ? x : x + PLAYER_W, y);
  ctx.scale(dir, 1);

  ctx.fillStyle = 'rgba(0, 0, 0, 0.3)';
  ctx.beginPath();
  ctx.ellipse(PLAYER_W / 2, PLAYER_H + 2, 14, 4, 0, 0, Math.PI * 2);
  ctx.fill();

  const stepRows = step >= 0 && step % 2 === 1 ? LEG_ROWS_STEP : null;
  PLAYER_ROWS.forEach((row, rowIndex) => {
    const isLeg = rowIndex >= 13;
    const source = stepRows && isLeg ? stepRows[rowIndex - 13] : row;
    for (let col = 0; col < source.length; col += 1) {
      const color = pixelColor(source[col], team);
      if (!color) continue;
      ctx.fillStyle = color;
      ctx.fillRect(col * PLAYER_SCALE, rowIndex * PLAYER_SCALE, PLAYER_SCALE, PLAYER_SCALE);
    }
  });

  const reach = swing > 0 ? Math.round(Math.sin((swing / SWING_FRAMES) * Math.PI) * 6) : 0;
  const armY = 8 * PLAYER_SCALE;
  ctx.fillStyle = '#f0b98a';
  ctx.fillRect(10 * PLAYER_SCALE, armY, 4 + reach, PLAYER_SCALE);
  ctx.fillStyle = '#6b3e22';
  ctx.fillRect(10 * PLAYER_SCALE + 4 + reach, armY - 1, 10, PLAYER_SCALE + 2);

  ctx.restore();
};

const drawRacket = (ctx: Ctx, x: number, y: number, team: Team) => {
  ctx.fillStyle = 'rgba(0, 0, 0, 0.3)';
  ctx.beginPath();
  ctx.roundRect(x + 3, y + 5, PADDLE_W, PADDLE_H, PADDLE_W / 2);
  ctx.fill();

  ctx.beginPath();
  ctx.roundRect(x, y, PADDLE_W, PADDLE_H, PADDLE_W / 2);
  ctx.fillStyle = team.dark;
  ctx.fill();
  ctx.beginPath();
  ctx.roundRect(x + 2, y + 2, PADDLE_W - 4, PADDLE_H - 4, (PADDLE_W - 4) / 2);
  ctx.fillStyle = team.main;
  ctx.fill();

  ctx.fillStyle = team.dark;
  for (let hy = y + 16; hy < y + PADDLE_H - 14; hy += 8) {
    ctx.fillRect(x + 5, hy, 2, 2);
    ctx.fillRect(x + 11, hy, 2, 2);
    ctx.fillRect(x + 8, hy + 4, 2, 2);
  }
  ctx.fillStyle = team.light;
  ctx.fillRect(x + 4, y + 8, PADDLE_W - 8, 3);
  ctx.fillRect(x + 4, y + PADDLE_H - 11, PADDLE_W - 8, 3);
};

const drawBall = (ctx: Ctx, x: number, y: number, trail: { x: number; y: number }[]) => {
  ctx.fillStyle = 'rgba(0, 0, 0, 0.3)';
  ctx.beginPath();
  ctx.ellipse(x + 3, y + 7, 6, 3, 0, 0, Math.PI * 2);
  ctx.fill();

  trail.forEach((point, index) => {
    const fade = (index + 1) / (trail.length + 1);
    ctx.beginPath();
    ctx.arc(point.x, point.y, 1.5 + fade * 2.5, 0, Math.PI * 2);
    ctx.fillStyle = `rgba(217, 242, 60, ${0.1 + fade * 0.35})`;
    ctx.fill();
  });

  ctx.beginPath();
  ctx.arc(x, y, BALL_R, 0, Math.PI * 2);
  ctx.fillStyle = BALL_COLOR;
  ctx.fill();
  ctx.fillStyle = '#8fae16';
  ctx.fillRect(x - 1, y - 5, 2, 10);
  ctx.fillStyle = '#f7ffb0';
  ctx.fillRect(x - 3, y - 4, 2, 2);
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

type Spark = { x: number; y: number; vx: number; vy: number; life: number; color: string };

const spawnSparks = (sparks: Spark[], x: number, y: number, count: number, color: string) => {
  for (let i = 0; i < count; i += 1) {
    const angle = Math.random() * Math.PI * 2;
    const speed = 1.5 + Math.random() * 2.5;
    sparks.push({ x, y, vx: Math.cos(angle) * speed, vy: Math.sin(angle) * speed, life: 14, color });
  }
};

const drawSparks = (ctx: Ctx, sparks: Spark[]) => {
  sparks.forEach((spark) => {
    ctx.globalAlpha = spark.life / 14;
    ctx.fillStyle = spark.color;
    ctx.fillRect(Math.round(spark.x), Math.round(spark.y), 3, 3);
  });
  ctx.globalAlpha = 1;
};

const drawCountBanner = (ctx: Ctx, title: string) => {
  ctx.fillStyle = 'rgba(5, 7, 15, 0.72)';
  ctx.fillRect(180, 210, 600, 140);
  ctx.strokeStyle = '#3ec8ff';
  ctx.lineWidth = 3;
  ctx.strokeRect(180, 210, 600, 140);
  ctx.textAlign = 'center';
  ctx.font = '28px "Press Start 2P", monospace';
  ctx.fillStyle = '#d9f23c';
  ctx.fillText(title, 480, 280);
  ctx.font = '8px "Press Start 2P", monospace';
  ctx.fillStyle = '#9fb3c8';
  ctx.fillText('MISMO CAMPO    MISMO SAQUE', 480, 318);
};

export default function Pong({
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

    void document.fonts.load('20px "Press Start 2P"');

    let animationFrameId = 0;
    const rand = world ? makeRng(world.seed) : Math.random;
    const you = world?.localSide ?? 'p1';
    const them = otherSide(you);
    const link = world ? startLiveInputs(world.matchId, world.localUserId) : null;
    const paddleStart = (PLAY_TOP + PLAY_BOTTOM - PADDLE_H) / 2;
    const minPaddle = PLAY_TOP + 6;
    const maxPaddle = PLAY_BOTTOM - PADDLE_H - 6;
    
    const state = {
      p1: { y: paddleStart, score: 0, swing: 0, moving: 0 },
      p2: { y: paddleStart, score: 0, swing: 0, moving: 0 },
      ball: { x: WIDTH / 2, y: (PLAY_TOP + PLAY_BOTTOM) / 2, vx: 6, vy: 4 },
      trail: [] as { x: number; y: number }[],
      sparks: [] as Spark[],
      shake: 0,
      frames: 0,
      keys: {} as Record<string, boolean>,
    };
    if (link) link.setLocalKeys(state.keys);

    const publishKeys = () => {
      link?.setLocalKeys(state.keys);
    };
    const handleKeyDown = (e: KeyboardEvent) => {
      state.keys[e.key] = true;
      publishKeys();
    };
    const handleKeyUp = (e: KeyboardEvent) => {
      state.keys[e.key] = false;
      publishKeys();
    };
    window.addEventListener('keydown', handleKeyDown);
    window.addEventListener('keyup', handleKeyUp);

    const resetBall = () => {
      state.trail = [];
      if (world) {
        const serve = state.p1.score + state.p2.score;
        state.ball = {
          x: WIDTH / 2,
          y: (PLAY_TOP + PLAY_BOTTOM) / 2,
          vx: serve % 2 === 0 ? 6 : -6,
          vy: Math.floor(serve / 2) % 2 === 0 ? 4 : -4,
        };
        return;
      }
      state.ball = {
        x: WIDTH / 2,
        y: (PLAY_TOP + PLAY_BOTTOM) / 2,
        vx: rand() > 0.5 ? 6 : -6,
        vy: rand() > 0.5 ? 4 : -4,
      };
    };

    const bounceOff = (paddleY: number, dir: 1 | -1) => {
      const offset = (state.ball.y - (paddleY + PADDLE_H / 2)) / (PADDLE_H / 2);
      const speed = Math.min(MAX_BALL_SPEED, Math.abs(state.ball.vx) * 1.1);
      state.ball.vx = dir * speed;
      state.ball.vy = offset * 6;
    };

    const scorePoint = (side: 'p1' | 'p2') => {
      state[side].score += 1;
      state.shake = SHAKE_FRAMES;
      const exitX = side === 'p1' ? WIDTH - 24 : 24;
      spawnSparks(state.sparks, exitX, state.ball.y, 14, side === 'p1' ? CYAN : ORANGE);
      resetBall();
    };

    const TAP_DIST = 14;
    const TAP_STEP = 2;
    const TAP_FRAMES = 8;
    const paddleGlide = {
      p1: { left: 0, prev: 0, held: 0 },
      p2: { left: 0, prev: 0, held: 0 },
    };
    const movePaddle = (side: 'p1' | 'p2', up: boolean, down: boolean) => {
      if (up) state[side].y = Math.max(minPaddle, state[side].y - 7);
      if (down) state[side].y = Math.min(maxPaddle, state[side].y + 7);
    };
    const slidePaddle = (side: 'p1' | 'p2', up: boolean, down: boolean) => {
      const steer = up === down ? 0 : down ? 1 : -1;
      const pad = paddleGlide[side];
      if (steer !== 0) {
        if (pad.prev !== steer) {
          pad.left = steer * TAP_DIST;
          pad.held = 0;
        }
        pad.held += 1;
        pad.prev = steer;
        if (pad.held > TAP_FRAMES) {
          pad.left = 0;
          movePaddle(side, up, down);
          return;
        }
      } else {
        pad.prev = 0;
        pad.held = 0;
      }
      if (pad.left === 0) return;
      const step = Math.sign(pad.left) * Math.min(TAP_STEP, Math.abs(pad.left));
      pad.left -= step;
      state[side].y = clampPaddle(state[side].y + step);
    };

    const clampPaddle = (y: number) => Math.max(minPaddle, Math.min(maxPaddle, y));

    const FRAME_MS = 1000 / 60;
    const openAt = Date.now();
    const isHost = !world || you === 'p1';
    let lastStamp = performance.now();
    let acc = 0;
    let ended = false;
    let playHead = 0;

    const stepBall = () => {
      state.trail.push({ x: state.ball.x, y: state.ball.y });
      if (state.trail.length > 8) state.trail.shift();

      const prevX = state.ball.x;
      state.ball.x += state.ball.vx;
      state.ball.y += state.ball.vy;

      if (state.ball.y <= PLAY_TOP + BALL_R) {
        state.ball.y = PLAY_TOP + BALL_R;
        state.ball.vy *= -1;
        spawnSparks(state.sparks, state.ball.x, PLAY_TOP, 4, '#cfe9ff');
      }
      if (state.ball.y >= PLAY_BOTTOM - BALL_R) {
        state.ball.y = PLAY_BOTTOM - BALL_R;
        state.ball.vy *= -1;
        spawnSparks(state.sparks, state.ball.x, PLAY_BOTTOM, 4, '#cfe9ff');
      }

      const meets = (paddleX: number, paddleY: number) => {
        const yHit = state.ball.y + BALL_R >= paddleY && state.ball.y - BALL_R <= paddleY + PADDLE_H;
        if (!yHit) return false;
        const face = state.ball.vx < 0 ? paddleX + PADDLE_W : paddleX;
        const crossed = state.ball.vx < 0
          ? prevX - BALL_R >= face && state.ball.x - BALL_R <= face
          : prevX + BALL_R <= face && state.ball.x + BALL_R >= face;
        const inside = state.ball.x + BALL_R >= paddleX && state.ball.x - BALL_R <= paddleX + PADDLE_W;
        return crossed || inside;
      };

      if (state.ball.vx < 0 && meets(P1_X, state.p1.y)) {
        bounceOff(state.p1.y, 1);
        state.ball.x = P1_X + PADDLE_W + BALL_R;
        state.p1.swing = SWING_FRAMES;
        spawnSparks(state.sparks, state.ball.x, state.ball.y, 6, CYAN);
      }
      if (state.ball.vx > 0 && meets(P2_X, state.p2.y)) {
        bounceOff(state.p2.y, -1);
        state.ball.x = P2_X - BALL_R;
        state.p2.swing = SWING_FRAMES;
        spawnSparks(state.sparks, state.ball.x, state.ball.y, 6, ORANGE);
      }

      if (state.ball.x < 0) scorePoint('p2');
      if (state.ball.x > WIDTH) scorePoint('p1');
    };

    let simFrame = 0;
    let faceMine = { up: false, down: false };
    let faceTheirs = { up: false, down: false };

    const finish = () => {
      if (state.p1.score >= 10) { ended = true; onGameEnd('p1'); return true; }
      if (state.p2.score >= 10) { ended = true; onGameEnd('p2'); return true; }
      return false;
    };

    const playFrame = (frame: number) => {
      state.frames += 1;
      const p1Before = state.p1.y;
      const p2Before = state.p2.y;
      const mine = link?.readMove(frame, 'local') ?? { up: false, down: false };
      const theirs = link?.readMove(frame, 'rival') ?? { up: false, down: false };
      faceMine = mine;
      faceTheirs = theirs;
      movePaddle(you, mine.up, mine.down);
      movePaddle(them, theirs.up, theirs.down);
      state.p1.moving = state.p1.y !== p1Before ? Math.floor(state.frames / 6) : -1;
      state.p2.moving = state.p2.y !== p2Before ? Math.floor(state.frames / 6) : -1;
      if (state.p1.swing > 0) state.p1.swing -= 1;
      if (state.p2.swing > 0) state.p2.swing -= 1;
      if (state.shake > 0) state.shake -= 1;
      stepBall();
    };

    const catchUp = () => {
      if (!link || !world || ended) return;
      const now = link.serverNow();
      const live = link.serverFrame(world.startAt);
      link.setLocalKeys(
        state.keys,
        state[you].y,
        null,
        live,
      );
      if (rankedCountdown(world.startAt, now)) return;
      if (finish()) return;
      const origin = Math.floor(world.startAt / FRAME_MS);
      const clockFrame = origin + live;
      const ready = Math.min(link.localHeardFrame(), link.rivalHeardFrame());
      if (ready <= origin) return;
      const target = Math.min(ready, clockFrame - 5);
      if (simFrame < origin) simFrame = origin;
      if (target <= simFrame) return;
      const gap = target - simFrame;
      const budget = gap > 2 ? Math.min(gap, 10) : 1;
      let guard = 0;
      while (simFrame < target && guard < budget) {
        guard += 1;
        simFrame += 1;
        playFrame(simFrame);
        if (finish()) return;
      }
    };

    const step = () => {
      if (world) {
        catchUp();
        return;
      }
      state.frames += 1;
      const rankedWait = world ? rankedCountdown(world.startAt) : rankedCountdown(openAt + 10000);
      const p1Before = state.p1.y;
      const p2Before = state.p2.y;

      if (!rankedWait) {
        if (world) {
          movePaddle(
            you,
            keyHeld(state.keys, 'w', 'W', 'ArrowUp'),
            keyHeld(state.keys, 's', 'S', 'ArrowDown'),
          );
          const rival = link?.readRivalKeys() ?? {};
          const rivalUp = keyHeld(rival, 'w', 'W', 'ArrowUp');
          const rivalDown = keyHeld(rival, 's', 'S', 'ArrowDown');
          movePaddle(them, rivalUp, rivalDown);
          const rivalY = link?.readRivalY();
          if (typeof rivalY === 'number' && !rivalUp && !rivalDown) {
            const drift = rivalY - state[them].y;
            if (Math.abs(drift) > 2) state[them].y = clampPaddle(state[them].y + drift * 0.45);
          }
        } else {
          const p1Up = Boolean(state.keys['w'] || state.keys['W']);
          const p1Down = Boolean(state.keys['s'] || state.keys['S']);
          const p2Up = Boolean(state.keys['ArrowUp']);
          const p2Down = Boolean(state.keys['ArrowDown']);
          faceMine = { up: p1Up, down: p1Down };
          faceTheirs = botEnabled ? { up: false, down: false } : { up: p2Up, down: p2Down };
          slidePaddle('p1', p1Up, p1Down);
          if (botEnabled) {
            const paddleCenter = state.p2.y + PADDLE_H / 2;
            if (state.ball.y > paddleCenter) state.p2.y = Math.min(maxPaddle, state.p2.y + BOT_SPEED);
            else if (state.ball.y < paddleCenter) state.p2.y = Math.max(minPaddle, state.p2.y - BOT_SPEED);
          } else {
            slidePaddle('p2', p2Up, p2Down);
          }
        }
      }

      state.p1.moving = state.p1.y !== p1Before ? Math.floor(state.frames / 6) : -1;
      state.p2.moving = state.p2.y !== p2Before ? Math.floor(state.frames / 6) : -1;
      if (state.p1.swing > 0) state.p1.swing -= 1;
      if (state.p2.swing > 0) state.p2.swing -= 1;
      if (state.shake > 0) state.shake -= 1;

      if (!rankedWait) stepBall();

      if (world) {
        link?.setLocalKeys(
          state.keys,
          state[you].y,
          isHost
            ? {
                ballX: state.ball.x,
                ballY: state.ball.y,
                ballVx: state.ball.vx,
                ballVy: state.ball.vy,
                p1: state.p1.score,
                p2: state.p2.score,
              }
            : null,
        );
      }

      state.sparks = state.sparks.filter((spark) => {
        spark.x += spark.vx;
        spark.y += spark.vy;
        spark.vy += 0.12;
        spark.life -= 1;
        return spark.life > 0;
      });

      if (isHost) {
        if (state.p1.score >= 10) { ended = true; onGameEnd('p1'); return; }
        if (state.p2.score >= 10) { ended = true; onGameEnd('p2'); return; }
        return;
      }
      const snap = link?.readRivalSnap();
      if (snap && snap.p1 >= 10) { ended = true; onGameEnd('p1'); return; }
      if (snap && snap.p2 >= 10) { ended = true; onGameEnd('p2'); return; }
    };

    const paint = (rankedWait: string | null, blend: number) => {
      ctx.fillStyle = '#05070f';
      ctx.fillRect(0, 0, WIDTH, HEIGHT);
      ctx.save();
      if (state.shake > 0) {
        const power = state.shake / SHAKE_FRAMES;
        ctx.translate((Math.random() - 0.5) * 6 * power, (Math.random() - 0.5) * 6 * power);
      }
      if (courtArtReady) drawCover(ctx, courtArt, 0, 0, WIDTH, HEIGHT);
      traceChamfer(ctx, FRAME.x, FRAME.y, FRAME.w, FRAME.h, FRAME.cut);
      ctx.clip();
      if (!courtArtReady) drawField(ctx);

      const p1Draw = state.p1.y;
      const p2Draw = state.p2.y;
      const ballX = state.ball.x + state.ball.vx * blend;
      const ballY = Math.max(
        PLAY_TOP + BALL_R,
        Math.min(PLAY_BOTTOM - BALL_R, state.ball.y + state.ball.vy * blend),
      );
      const p1SwingShift = state.p1.swing > 0 ? Math.round(Math.sin((state.p1.swing / SWING_FRAMES) * Math.PI) * 6) : 0;
      const p2SwingShift = state.p2.swing > 0 ? Math.round(Math.sin((state.p2.swing / SWING_FRAMES) * Math.PI) * 6) : 0;
      const p1PlayerY = Math.round(p1Draw + PADDLE_H / 2 - PLAYER_H / 2);
      const p2PlayerY = Math.round(p2Draw + PADDLE_H / 2 - PLAYER_H / 2);
      drawPlayer(ctx, P1_X - PLAYER_W - 2, p1PlayerY, 1, TEAM_P1, state.p1.moving, state.p1.swing);
      drawPlayer(ctx, P2_X + PADDLE_W + 2, p2PlayerY, -1, TEAM_P2, state.p2.moving, state.p2.swing);
      drawRacket(ctx, P1_X + p1SwingShift, p1Draw, TEAM_P1);
      drawRacket(ctx, P2_X - p2SwingShift, p2Draw, TEAM_P2);
      drawBall(ctx, ballX, ballY, state.trail);
      drawSparks(ctx, state.sparks);
      ctx.restore();
      drawFrame(ctx);
      drawHud(
        ctx,
        state.p1.score,
        state.p2.score,
        botEnabled,
        sideLabel(world, 'p1', 'P1'),
        sideLabel(world, 'p2', 'P2'),
      );
      if (rankedWait) drawCountBanner(ctx, rankedWait);
    };

    const tick = (now: number) => {
      if (ended) return;
      if (world && link) {
        const dt = Math.min(50, Math.max(0, now - lastStamp));
        lastStamp = now;
        link.setLocalKeys(state.keys);
        const countdown = rankedCountdown(world.startAt, link.serverNow());
        const latestAt = link.rallyAt();
        playHead = stepPlayHead(playHead, dt, latestAt, link.serverNow());
        const view = playHead > 0 ? link.readRally(playHead) : null;
        if (view) {
          if (view.p1 !== state.p1.score || view.p2 !== state.p2.score) state.shake = SHAKE_FRAMES;
          state.trail.push({ x: view.ballX, y: view.ballY });
          if (state.trail.length > 8) state.trail.shift();
          state.ball = { x: view.ballX, y: view.ballY, vx: 0, vy: 0 };
          state.p1.y = view.p1y;
          state.p2.y = view.p2y;
          state.p1.score = view.p1;
          state.p2.score = view.p2;
          if (state.shake > 0) state.shake -= 1;
        }
        paint(countdown, 0);
        if (view && view.p1 >= 10) { ended = true; onGameEnd('p1'); return; }
        if (view && view.p2 >= 10) { ended = true; onGameEnd('p2'); return; }
        animationFrameId = requestAnimationFrame(tick);
        return;
      }
      acc += Math.min(50, now - lastStamp);
      lastStamp = now;
      while (acc >= FRAME_MS) {
        acc -= FRAME_MS;
        step();
        if (ended) return;
      }
      const blend = Math.max(0, Math.min(1, acc / FRAME_MS));
      paint(world ? rankedCountdown(world.startAt, link ? link.serverNow() : Date.now()) : rankedCountdown(openAt + 10000), blend);
      animationFrameId = requestAnimationFrame(tick);
    };

    if (world) resetBall();
    animationFrameId = requestAnimationFrame(tick);

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
      aria-label="Paddle Duel"
      className="w-full max-w-full aspect-video rounded-xl"
    />
  );
}
