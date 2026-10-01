import { useEffect, useRef } from 'react';

const WIDTH = 960;
const HEIGHT = 540;
const GROUND = 468;
const SCALE = 1.85;
const BODY_W = Math.round(78 * SCALE);
const BODY_H = Math.round(150 * SCALE);
const ARROW_STOCK = 5;
const PIX = '"Press Start 2P", monospace';

type Ctx = CanvasRenderingContext2D;
type Side = 'p1' | 'p2';

type Palette = {
  armor: string;
  armorDark: string;
  armorLight: string;
  aura: string;
  crest: string;
};

const FIRE: Palette = {
  armor: '#e07a12',
  armorDark: '#8a3d08',
  armorLight: '#ffc14a',
  aura: 'rgba(255, 96, 16, 0.5)',
  crest: '#ffe08a',
};

const ICE: Palette = {
  armor: '#2f6fd6',
  armorDark: '#16356e',
  armorLight: '#9ad8ff',
  aura: 'rgba(90, 196, 255, 0.5)',
  crest: '#e7f7ff',
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

const drawPine = (ctx: Ctx, x: number, y: number, h: number) => {
  ctx.fillStyle = '#1c3a28';
  ctx.fillRect(x - 10, y - h, 20, 10);
  ctx.fillRect(x - 18, y - h + 14, 36, 12);
  ctx.fillRect(x - 26, y - h + 30, 52, 14);
  ctx.fillStyle = '#f4f7fb';
  ctx.fillRect(x - 6, y - h, 12, 4);
  ctx.fillRect(x - 10, y - h + 14, 8, 3);
  ctx.fillStyle = '#6b4428';
  ctx.fillRect(x - 3, y - 16, 6, 16);
};

const drawTorii = (ctx: Ctx, x: number, y: number) => {
  ctx.fillStyle = '#b4332a';
  ctx.fillRect(x, y - 78, 8, 78);
  ctx.fillRect(x + 46, y - 78, 8, 78);
  ctx.fillRect(x - 8, y - 86, 70, 8);
  ctx.fillStyle = '#7a1e18';
  ctx.fillRect(x - 4, y - 86, 62, 3);
  ctx.fillStyle = '#b4332a';
  ctx.fillRect(x + 2, y - 68, 50, 6);
};

const drawPagoda = (ctx: Ctx, x: number, y: number) => {
  const roofs = [96, 78, 60, 44, 30];
  roofs.forEach((roof, index) => {
    const top = y - 150 + index * 26;
    ctx.fillStyle = '#f4efe6';
    ctx.fillRect(x - 12, top + 8, 24, 18);
    ctx.fillStyle = '#8d3a32';
    ctx.fillRect(x - roof / 2, top, roof, 10);
  });
  ctx.fillStyle = '#5c4030';
  ctx.fillRect(x - 2, y - 164, 4, 16);
};

const drawSnowField = (ctx: Ctx) => {
  const sky = ctx.createLinearGradient(0, 0, 0, GROUND);
  sky.addColorStop(0, '#8eb4d8');
  sky.addColorStop(0.45, '#d5e4f2');
  sky.addColorStop(0.72, '#f3d7a4');
  sky.addColorStop(1, '#f7f4ee');
  ctx.fillStyle = sky;
  ctx.fillRect(0, 0, WIDTH, HEIGHT);

  fillRidge(ctx, [
    [0, 250], [80, 170], [160, 210], [250, 120], [340, 180],
    [430, 90], [520, 150], [610, 110], [700, 170], [800, 130],
    [900, 190], [960, 160],
  ], 300, '#c5d4e4');
  fillRidge(ctx, [
    [0, 280], [70, 200], [150, 240], [240, 160], [330, 220],
    [420, 150], [510, 200], [600, 140], [700, 210], [800, 170],
    [900, 230], [960, 200],
  ], 330, '#f7fbff');
  fillRidge(ctx, [
    [0, 320], [120, 260], [240, 300], [380, 250], [520, 290],
    [680, 250], [820, 300], [960, 270],
  ], GROUND, '#d5e1ee');

  drawPine(ctx, 48, GROUND, 110);
  drawPine(ctx, 110, GROUND, 78);
  drawPine(ctx, 168, GROUND, 96);
  drawPine(ctx, 900, GROUND, 120);
  drawPine(ctx, 830, GROUND, 84);
  drawTorii(ctx, 430, GROUND - 4);
  drawPagoda(ctx, 760, GROUND);

  ctx.fillStyle = '#f7fbff';
  ctx.fillRect(0, GROUND, WIDTH, HEIGHT - GROUND);
  ctx.fillStyle = '#a9845c';
  ctx.beginPath();
  ctx.moveTo(430, GROUND);
  ctx.lineTo(560, GROUND);
  ctx.lineTo(700, HEIGHT);
  ctx.lineTo(250, HEIGHT);
  ctx.closePath();
  ctx.fill();
  ctx.fillStyle = '#c4a078';
  ctx.fillRect(470, GROUND + 8, 16, HEIGHT - GROUND);
};

const drawSamurai = (
  ctx: Ctx,
  x: number,
  y: number,
  dir: number,
  palette: Palette,
  slashing: boolean,
  aiming: boolean,
) => {
  ctx.save();
  ctx.translate(dir === 1 ? x : x + BODY_W, y);
  ctx.scale(dir * SCALE, SCALE);

  ctx.fillStyle = palette.aura;
  ctx.fillRect(-6, -128, 14, 30);
  ctx.fillRect(4, -108, 12, 22);
  ctx.fillRect(58, -120, 14, 26);
  ctx.fillRect(64, -96, 10, 18);

  ctx.fillStyle = '#24180f';
  ctx.fillRect(10, -74, 30, 5);

  ctx.fillStyle = '#1a1a1a';
  ctx.fillRect(18, -48, 14, 40);
  ctx.fillRect(40, -48, 14, 40);
  ctx.fillStyle = palette.armorDark;
  ctx.fillRect(16, -14, 18, 12);
  ctx.fillRect(38, -14, 18, 12);

  ctx.fillStyle = palette.armor;
  ctx.fillRect(14, -100, 46, 56);
  ctx.fillStyle = palette.armorLight;
  ctx.fillRect(22, -94, 30, 8);
  ctx.fillRect(22, -80, 30, 6);
  ctx.fillRect(22, -68, 30, 6);
  ctx.fillStyle = '#f0e2c0';
  ctx.fillRect(14, -50, 46, 6);
  ctx.fillStyle = palette.armorDark;
  ctx.fillRect(6, -100, 16, 16);
  ctx.fillRect(52, -100, 16, 16);
  ctx.fillStyle = palette.armor;
  ctx.fillRect(50, -88, 14, 30);

  ctx.fillStyle = '#e6c2a0';
  ctx.fillRect(26, -116, 20, 14);
  ctx.fillStyle = palette.armor;
  ctx.fillRect(22, -132, 32, 18);
  ctx.fillStyle = palette.crest;
  ctx.fillRect(32, -148, 8, 18);
  ctx.fillStyle = '#111';
  ctx.fillRect(24, -108, 24, 8);
  ctx.fillStyle = '#f4f7fb';
  ctx.fillRect(28, -106, 4, 3);

  if (aiming) {
    ctx.strokeStyle = '#c4a574';
    ctx.lineWidth = 3;
    ctx.beginPath();
    ctx.moveTo(66, -108);
    ctx.quadraticCurveTo(86, -82, 66, -56);
    ctx.stroke();
    ctx.strokeStyle = '#f7f3ea';
    ctx.lineWidth = 1;
    ctx.beginPath();
    ctx.moveTo(66, -108);
    ctx.lineTo(66, -56);
    ctx.stroke();
  } else {
    const reach = slashing ? 34 : 6;
    ctx.save();
    ctx.translate(60, -72);
    ctx.rotate(slashing ? -0.15 : -0.6);
    ctx.fillStyle = '#e7edf5';
    ctx.fillRect(0, -2, 34 + reach, 3);
    ctx.fillStyle = '#f5c518';
    ctx.fillRect(-8, -4, 8, 7);
    ctx.restore();
  }

  ctx.restore();
};

const drawArrow = (ctx: Ctx, x: number, y: number, dir: number, color: string) => {
  ctx.save();
  ctx.translate(x, y);
  ctx.scale(dir, 1);
  ctx.fillStyle = color;
  ctx.fillRect(0, -3, 6, 6);
  ctx.fillStyle = '#e7d3ae';
  ctx.fillRect(6, -1, 16, 2);
  ctx.fillStyle = '#f4f7fb';
  ctx.beginPath();
  ctx.moveTo(22, -4);
  ctx.lineTo(30, 0);
  ctx.lineTo(22, 4);
  ctx.closePath();
  ctx.fill();
  ctx.restore();
};

const drawArrowStock = (ctx: Ctx, x: number, y: number, left: number, color: string) => {
  for (let i = 0; i < ARROW_STOCK; i += 1) {
    ctx.fillStyle = i < left ? color : '#2a3344';
    ctx.fillRect(x + i * 16, y, 10, 2);
    ctx.beginPath();
    ctx.moveTo(x + i * 16 + 10, y - 3);
    ctx.lineTo(x + i * 16 + 16, y + 1);
    ctx.lineTo(x + i * 16 + 10, y + 5);
    ctx.closePath();
    ctx.fill();
  }
};

const drawHud = (
  ctx: Ctx,
  p1: { hp: number; score: number; arrows: number },
  p2: { hp: number; score: number; arrows: number },
  seconds: number,
  showFight: boolean,
) => {
  ctx.fillStyle = 'rgba(8, 16, 32, 0.72)';
  ctx.fillRect(0, 0, WIDTH, 104);

  const drawSide = (
    sideX: number,
    alignRight: boolean,
    label: string,
    name: string,
    hp: number,
    score: number,
    arrows: number,
    palette: Palette,
  ) => {
    const portraitX = alignRight ? sideX + 286 : sideX;
    ctx.fillStyle = '#101820';
    ctx.fillRect(portraitX, 10, 44, 44);
    ctx.strokeStyle = palette.armorLight;
    ctx.strokeRect(portraitX, 10, 44, 44);
    ctx.fillStyle = palette.armor;
    ctx.fillRect(portraitX + 12, 16, 20, 12);
    ctx.fillStyle = palette.crest;
    ctx.fillRect(portraitX + 18, 10, 6, 8);
    ctx.fillStyle = '#111';
    ctx.fillRect(portraitX + 14, 30, 16, 6);

    const textX = alignRight ? sideX + 270 : sideX + 52;
    ctx.textAlign = alignRight ? 'right' : 'left';
    ctx.fillStyle = '#f7f3ea';
    ctx.font = `8px ${PIX}`;
    ctx.fillText(label, textX, 20);
    ctx.font = `10px ${PIX}`;
    ctx.fillText(name, textX, 56);
    ctx.font = `8px ${PIX}`;
    ctx.fillText(String(score).padStart(6, '0'), textX, 74);

    const barX = alignRight ? sideX : sideX + 52;
    ctx.fillStyle = '#1b2430';
    ctx.fillRect(barX, 26, 200, 12);
    ctx.fillStyle = hp > 30 ? '#7dce3a' : '#e23b2f';
    const fill = Math.max(0, hp) * 2;
    ctx.fillRect(alignRight ? barX + 200 - fill : barX, 26, fill, 12);
    ctx.textAlign = alignRight ? 'left' : 'right';
    ctx.fillStyle = '#f7f3ea';
    ctx.fillText(`HP: ${Math.max(0, hp)}%`, alignRight ? barX : barX + 200, 18);

    const stockX = alignRight ? sideX + 90 : sideX + 150;
    drawArrowStock(ctx, stockX, 90, arrows, palette.armorLight);
    ctx.textAlign = 'left';
  };

  drawSide(12, false, 'PLAYER 1', 'TAKEDA', p1.hp, p1.score, p1.arrows, FIRE);
  drawSide(WIDTH - 342, true, 'PLAYER 2', 'REN', p2.hp, p2.score, p2.arrows, ICE);

  ctx.textAlign = 'center';
  ctx.fillStyle = '#f7f3ea';
  ctx.font = `8px ${PIX}`;
  ctx.fillText(`TIME: ${String(seconds).padStart(2, '0')}`, WIDTH / 2, 18);
  ctx.fillStyle = '#ff8a1a';
  ctx.font = `16px ${PIX}`;
  ctx.fillText('VS', WIDTH / 2, 40);
  ctx.fillStyle = '#f7f3ea';
  ctx.font = `8px ${PIX}`;
  ctx.fillText('ROUND 1', WIDTH / 2, 68);
  if (showFight) {
    ctx.fillStyle = '#ffb000';
    ctx.font = `12px ${PIX}`;
    ctx.fillText('FIGHT!', WIDTH / 2, 92);
  }
  ctx.textAlign = 'left';

  ctx.fillStyle = '#243044';
  ctx.font = `10px ${PIX}`;
  ctx.fillText('SNOWY PASS', 16, HEIGHT - 16);
};

export default function Combat({
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
    const state = {
      p1: {
        x: 36, y: GROUND, vx: 0, vy: 0, hp: 100, dir: 1,
        attacking: 0, attackLock: 0, arrows: ARROW_STOCK, shootCd: 0, score: 0,
      },
      p2: {
        x: WIDTH - BODY_W - 36, y: GROUND, vx: 0, vy: 0, hp: 100, dir: -1,
        attacking: 0, attackLock: 0, arrows: ARROW_STOCK, shootCd: 0, score: 0,
      },
      shots: [] as { x: number; y: number; vx: number; owner: Side }[],
      flakes: Array.from({ length: 42 }, () => ({
        x: Math.random() * WIDTH,
        y: Math.random() * HEIGHT,
        s: Math.random() > 0.6 ? 3 : 2,
        v: 0.7 + Math.random() * 1.1,
      })),
      keys: {} as Record<string, boolean>,
      frames: 0,
      botJumpTimer: 0,
    };

    const shoot = (owner: Side) => {
      const fighter = state[owner];
      if (fighter.arrows <= 0 || fighter.shootCd > 0) return;
      fighter.arrows -= 1;
      fighter.shootCd = 24;
      state.shots.push({
        x: fighter.dir === 1 ? fighter.x + BODY_W - 16 : fighter.x - 24,
        y: fighter.y - Math.round(BODY_H * 0.55),
        vx: fighter.dir * 12,
        owner,
      });
    };

    const handleKeyDown = (event: KeyboardEvent) => {
      state.keys[event.key] = true;
      if (event.key === ' ' || event.key === 'f' || event.key === 'F' || event.key === 'k' || event.key === 'K') {
        event.preventDefault();
      }
      if (event.key === ' ' && state.p1.attacking === 0 && state.p1.attackLock === 0) {
        state.p1.attacking = 16;
        state.p1.attackLock = 36;
      }
      if ((event.key === 'f' || event.key === 'F')) shoot('p1');
      if (!botEnabled && event.key === 'Enter' && state.p2.attacking === 0 && state.p2.attackLock === 0) {
        state.p2.attacking = 16;
        state.p2.attackLock = 36;
      }
      if (!botEnabled && (event.key === 'k' || event.key === 'K')) shoot('p2');
    };
    const handleKeyUp = (event: KeyboardEvent) => { state.keys[event.key] = false; };
    window.addEventListener('keydown', handleKeyDown);
    window.addEventListener('keyup', handleKeyUp);

    const bodyOf = (fighter: { x: number; y: number }) => ({
      x: fighter.x,
      y: fighter.y - BODY_H,
      w: BODY_W,
      h: BODY_H,
    });

    const hits = (
      box: { x: number; y: number; w: number; h: number },
      fighter: { x: number; y: number },
    ) => {
      const body = bodyOf(fighter);
      return box.x < body.x + body.w && box.x + box.w > body.x && box.y < body.y + body.h && box.y + box.h > body.y;
    };

    const botUpdate = () => {
      const dist = state.p1.x - state.p2.x;
      const absDist = Math.abs(dist);
      state.p2.dir = dist > 0 ? 1 : -1;
      if (absDist > BODY_W + 24) state.p2.vx = dist > 0 ? 4 : -4;
      else state.p2.vx *= 0.5;
      if (absDist < BODY_W + 36 && state.p2.attacking === 0 && state.p2.attackLock === 0) {
        state.p2.attacking = 16;
        state.p2.attackLock = 70;
      }
      if (absDist > BODY_W + 90 && state.p2.arrows > 0 && state.p2.shootCd === 0 && Math.random() < 0.02) {
        shoot('p2');
      }
      state.botJumpTimer += 1;
      if (state.p2.y >= GROUND && state.botJumpTimer > 120 && Math.random() < 0.04) {
        state.p2.vy = -12;
        state.botJumpTimer = 0;
      }
    };

    const update = () => {
      state.frames += 1;
      [state.p1, state.p2].forEach((fighter) => {
        fighter.vy += 0.5;
        fighter.y += fighter.vy;
        fighter.x += fighter.vx;
        if (fighter.y >= GROUND) { fighter.y = GROUND; fighter.vy = 0; }
        if (fighter.x < 8) fighter.x = 8;
        if (fighter.x > WIDTH - BODY_W - 8) fighter.x = WIDTH - BODY_W - 8;
        fighter.vx *= 0.8;
        if (fighter.attacking > 0) fighter.attacking -= 1;
        if (fighter.attackLock > 0) fighter.attackLock -= 1;
        if (fighter.shootCd > 0) fighter.shootCd -= 1;
      });

      if ((state.keys['w'] || state.keys['W']) && state.p1.y >= GROUND) state.p1.vy = -12;
      if (state.keys['a'] || state.keys['A']) { state.p1.vx = -5; state.p1.dir = -1; }
      if (state.keys['d'] || state.keys['D']) { state.p1.vx = 5; state.p1.dir = 1; }

      if (!botEnabled) {
        if (state.keys['ArrowUp'] && state.p2.y >= GROUND) state.p2.vy = -12;
        if (state.keys['ArrowLeft']) { state.p2.vx = -5; state.p2.dir = -1; }
        if (state.keys['ArrowRight']) { state.p2.vx = 5; state.p2.dir = 1; }
      } else {
        botUpdate();
      }

      const strike = (attacker: Side, defender: Side) => {
        const fighter = state[attacker];
        if (fighter.attacking !== 14) return;
        const box = {
          x: fighter.dir === 1 ? fighter.x + BODY_W - 16 : fighter.x - 64,
          y: fighter.y - Math.round(BODY_H * 0.62),
          w: 72,
          h: 48,
        };
        if (!hits(box, state[defender])) return;
        state[defender].hp -= 12;
        state[defender].vx = fighter.dir * 12;
        state[defender].vy = -5;
        fighter.score += 500;
      };
      strike('p1', 'p2');
      strike('p2', 'p1');

      state.shots = state.shots.filter((shot) => {
        shot.x += shot.vx;
        if (shot.x < -40 || shot.x > WIDTH + 40) return false;
        const defender = shot.owner === 'p1' ? state.p2 : state.p1;
        const box = { x: shot.vx > 0 ? shot.x + 18 : shot.x, y: shot.y - 4, w: 14, h: 8 };
        if (!hits(box, defender)) return true;
        defender.hp -= 8;
        defender.vx = Math.sign(shot.vx) * 8;
        defender.vy = -3;
        state[shot.owner].score += 300;
        return false;
      });

      state.flakes.forEach((flake) => {
        flake.y += flake.v;
        flake.x += 0.3;
        if (flake.y > HEIGHT) {
          flake.y = 0;
          flake.x = Math.random() * WIDTH;
        }
      });

      if (state.p1.hp <= 0) { onGameEnd('p2'); return; }
      if (state.p2.hp <= 0) { onGameEnd('p1'); return; }

      drawSnowField(ctx);
      drawSamurai(ctx, state.p1.x, state.p1.y, state.p1.dir, FIRE, state.p1.attacking > 0, state.p1.shootCd > 12);
      drawSamurai(ctx, state.p2.x, state.p2.y, state.p2.dir, ICE, state.p2.attacking > 0, state.p2.shootCd > 12);
      state.shots.forEach((shot) => {
        drawArrow(ctx, shot.x, shot.y, shot.vx > 0 ? 1 : -1, shot.owner === 'p1' ? '#ffb15a' : '#9ad8ff');
      });
      ctx.fillStyle = '#ffffff';
      state.flakes.forEach((flake) => {
        ctx.fillRect(flake.x, flake.y, flake.s, flake.s);
      });
      drawHud(ctx, state.p1, state.p2, Math.floor(state.frames / 60), state.frames < 90);

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
      aria-label="Arena Clash"
      className="w-full max-w-full rounded-xl [image-rendering:pixelated]"
    />
  );
}
