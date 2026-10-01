import { useEffect, useRef } from 'react';

const WIDTH = 960;
const HEIGHT = 540;
const FIELD = { left: 20, top: 118, right: 940, bottom: 424 };
const BODY = { w: 28, h: 32 };
const PIX = '"Press Start 2P", monospace';

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
};

const formatTime = (frames: number) => {
  const total = Math.floor(frames / 60);
  const minutes = String(Math.floor(total / 60)).padStart(2, '0');
  const seconds = String(total % 60).padStart(2, '0');
  return `${minutes}:${seconds}`;
};

const drawContainer = (ctx: Ctx, x: number, y: number, w: number, h: number, color: string, label: string) => {
  ctx.fillStyle = color;
  ctx.fillRect(x, y, w, h);
  ctx.fillStyle = 'rgba(255,255,255,0.18)';
  ctx.fillRect(x + 4, y + 4, w - 8, 4);
  ctx.fillStyle = '#f4efe6';
  ctx.font = `8px ${PIX}`;
  ctx.fillText(label, x + 8, y + h / 2 + 4);
};

const drawDepot = (ctx: Ctx) => {
  const sky = ctx.createLinearGradient(0, 0, 0, HEIGHT);
  sky.addColorStop(0, '#f2b06a');
  sky.addColorStop(0.35, '#e08a62');
  sky.addColorStop(0.7, '#8a4a68');
  sky.addColorStop(1, '#3a2a48');
  ctx.fillStyle = sky;
  ctx.fillRect(0, 0, WIDTH, HEIGHT);

  ctx.fillStyle = '#9aa0a8';
  ctx.fillRect(0, 108, WIDTH, HEIGHT - 108);
  ctx.fillStyle = '#7d848e';
  for (let y = 124; y < FIELD.bottom; y += 28) {
    ctx.fillRect(16, y, WIDTH - 32, 2);
  }
  for (let x = 40; x < WIDTH; x += 64) {
    ctx.fillRect(x, 108, 2, FIELD.bottom - 108);
  }

  drawContainer(ctx, 28, 130, 70, 54, '#2d5f86', '3');
  drawContainer(ctx, 28, 192, 70, 48, '#3d7a4a', '5');
  drawContainer(ctx, 108, 136, 46, 78, '#2a6a78', '');
  drawContainer(ctx, 820, 128, 86, 40, '#3a6a58', '');
  drawContainer(ctx, 860, 176, 58, 64, '#245a78', '4');

  ctx.fillStyle = '#8a5a32';
  ctx.fillRect(168, 210, 54, 28);
  ctx.fillStyle = '#5c4030';
  ctx.fillRect(214, 218, 28, 8);
  ctx.fillStyle = '#222';
  ctx.fillRect(176, 234, 10, 10);
  ctx.fillRect(198, 234, 10, 10);

  ctx.fillStyle = '#c45a2a';
  ctx.fillRect(700, 150, 8, 160);
  ctx.fillRect(728, 168, 8, 140);
  ctx.fillStyle = '#4a5560';
  ctx.fillRect(690, 186, 56, 6);
  ctx.fillRect(690, 230, 56, 6);

  ctx.fillStyle = '#6a5438';
  [620, 648, 760, 788].forEach((x) => {
    ctx.beginPath();
    ctx.arc(x, 300, 10, 0, Math.PI * 2);
    ctx.fill();
  });

  ctx.fillStyle = '#2e3a44';
  ctx.fillRect(250, 250, 70, 90);
  ctx.fillStyle = '#3ecf6e';
  ctx.fillRect(262, 266, 8, 8);
  ctx.fillRect(278, 266, 8, 8);
  ctx.fillStyle = '#e2b43a';
  ctx.fillRect(262, 286, 8, 8);

  ctx.fillStyle = '#d5dbe3';
  ctx.fillRect(300, 348, 360, 28);
  ctx.fillStyle = '#2a3038';
  ctx.font = `10px ${PIX}`;
  ctx.textAlign = 'center';
  ctx.fillText('CHEMICAL DEPOT', 480, 368);
  ctx.textAlign = 'left';

  ctx.fillStyle = '#5c6570';
  ctx.fillRect(300, 376, 8, FIELD.bottom - 376);
  ctx.fillRect(652, 376, 8, FIELD.bottom - 376);

  const hole = ctx.createLinearGradient(0, 430, 0, HEIGHT);
  hole.addColorStop(0, '#f0a060');
  hole.addColorStop(0.45, '#e07a4a');
  hole.addColorStop(1, '#6a3a58');
  ctx.fillStyle = hole;
  ctx.fillRect(318, 432, 324, HEIGHT - 432);
  ctx.fillStyle = '#2a2438';
  ctx.fillRect(340, 500, 18, 40);
  ctx.fillRect(370, 478, 28, 62);
  ctx.fillRect(420, 490, 14, 50);
  ctx.fillRect(470, 470, 36, 70);
  ctx.fillRect(530, 488, 22, 52);
  ctx.fillRect(570, 500, 16, 40);
  ctx.fillStyle = '#ffb15a';
  ctx.beginPath();
  ctx.arc(480, 500, 22, 0, Math.PI * 2);
  ctx.fill();
};

const drawSoldier = (ctx: Ctx, x: number, y: number, dir: number, kind: 'blue' | 'orange') => {
  const armor = kind === 'blue' ? '#2f5ea8' : '#e07020';
  const dark = kind === 'blue' ? '#1b3a72' : '#a84810';
  const scarf = kind === 'blue' ? '#d64545' : '#f0c14a';
  ctx.fillStyle = dark;
  ctx.fillRect(x + 8, y + 18, 5, 12);
  ctx.fillRect(x + 16, y + 18, 5, 12);
  ctx.fillStyle = armor;
  ctx.fillRect(x + 6, y + 8, 16, 16);
  ctx.fillStyle = scarf;
  ctx.fillRect(x + 6, y + 14, 16, 4);
  ctx.fillStyle = kind === 'blue' ? '#8aa4d4' : '#ffd27a';
  ctx.fillRect(x + 8, y + 2, 12, 10);
  ctx.fillStyle = '#111';
  ctx.fillRect(x + 10, y + 6, 8, 3);
  ctx.fillStyle = '#c5ccd4';
  if (dir === 1) ctx.fillRect(x + 20, y + 12, 14, 3);
  else ctx.fillRect(x - 8, y + 12, 14, 3);
};

const drawPortrait = (ctx: Ctx, x: number, y: number, kind: 'blue' | 'orange') => {
  ctx.fillStyle = '#101820';
  ctx.fillRect(x, y, 40, 40);
  ctx.strokeStyle = kind === 'blue' ? '#7eb6ff' : '#ffb15a';
  ctx.strokeRect(x, y, 40, 40);
  drawSoldier(ctx, x + 6, y + 4, kind === 'blue' ? 1 : -1, kind);
};

const drawHud = (
  ctx: Ctx,
  p1: Fighter,
  p2: Fighter,
  frames: number,
) => {
  ctx.fillStyle = 'rgba(12, 18, 28, 0.35)';
  ctx.fillRect(0, 0, WIDTH, 104);

  const panel = (x: number) => {
    ctx.fillStyle = '#1a2433';
    ctx.fillRect(x, 8, 300, 88);
    ctx.strokeStyle = '#3a4a62';
    ctx.strokeRect(x, 8, 300, 88);
  };
  panel(8);
  panel(652);
  ctx.fillStyle = '#141c28';
  ctx.fillRect(320, 8, 320, 88);
  ctx.strokeStyle = '#3a4a62';
  ctx.strokeRect(320, 8, 320, 88);

  drawPortrait(ctx, 16, 18, 'blue');
  ctx.textAlign = 'left';
  ctx.fillStyle = '#7dce3a';
  ctx.font = `10px ${PIX}`;
  ctx.fillText(`${Math.max(0, p1.hp)}%`, 66, 28);
  ctx.fillStyle = '#1b2430';
  ctx.fillRect(120, 16, 160, 12);
  ctx.fillStyle = p1.hp > 30 ? '#3dce4a' : '#e23b2f';
  ctx.fillRect(120, 16, Math.max(0, p1.hp) * 1.6, 12);
  ctx.fillStyle = '#d5dbe3';
  ctx.font = `7px ${PIX}`;
  ctx.fillText('PISTOL', 66, 48);
  ctx.fillText(p1.reloading > 0 ? 'RELOAD' : `AMMO: ${p1.mag}/${p1.reserve}`, 150, 48);
  ctx.fillStyle = '#7eb6ff';
  ctx.font = `8px ${PIX}`;
  ctx.fillText('BLUE SOLDIER', 66, 68);
  ctx.fillStyle = '#9aa6b8';
  ctx.font = `7px ${PIX}`;
  ctx.fillText('Map: Depot', 66, 86);

  drawPortrait(ctx, 900, 18, 'orange');
  ctx.textAlign = 'right';
  ctx.fillStyle = '#7dce3a';
  ctx.font = `10px ${PIX}`;
  ctx.fillText(`${Math.max(0, p2.hp)}%`, 888, 28);
  ctx.fillStyle = '#1b2430';
  ctx.fillRect(680, 16, 160, 12);
  const rifleFill = Math.max(0, p2.hp) * 1.6;
  ctx.fillStyle = p2.hp > 30 ? '#e0a020' : '#e23b2f';
  ctx.fillRect(680 + 160 - rifleFill, 16, rifleFill, 12);
  ctx.fillStyle = '#d5dbe3';
  ctx.font = `7px ${PIX}`;
  ctx.fillText(p2.reloading > 0 ? 'RELOAD' : `AMMO: ${p2.mag}/${p2.reserve}`, 760, 48);
  ctx.fillText('RIFLE', 860, 48);
  ctx.fillStyle = '#ffb15a';
  ctx.font = `8px ${PIX}`;
  ctx.fillText('ORANGE SOLDIER', 888, 68);
  ctx.fillStyle = '#9aa6b8';
  ctx.font = `7px ${PIX}`;
  ctx.fillText('P1: 35ms  P2: 42ms', 888, 86);

  ctx.textAlign = 'center';
  ctx.fillStyle = '#c5ccd4';
  ctx.fillRect(348, 28, 16, 6);
  ctx.fillRect(360, 24, 4, 10);
  ctx.fillRect(596, 26, 22, 5);
  ctx.fillRect(614, 22, 4, 12);
  ctx.fillStyle = '#f4f7fb';
  ctx.font = `16px ${PIX}`;
  ctx.fillText('VS', 480, 36);
  ctx.font = `10px ${PIX}`;
  ctx.fillText(formatTime(frames), 480, 56);
  ctx.font = `7px ${PIX}`;
  ctx.fillStyle = '#9ad0ff';
  ctx.fillText(`P1: ${p1.hits}`, 390, 78);
  ctx.fillStyle = '#ffb15a';
  ctx.fillText(`P2: ${p2.hits}`, 570, 78);
  ctx.fillStyle = '#f4f7fb';
  ctx.fillText('ROUND 1', 480, 78);
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
});

export default function Shooter({
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
      p1: makeFighter(200, 300, 15, 45),
      p2: makeFighter(620, 250, 10, 60),
      bullets: [] as { x: number; y: number; vx: number; owner: Side; damage: number }[],
      keys: {} as Record<string, boolean>,
      frames: 0,
    };

    const shoot = (owner: Side) => {
      const fighter = state[owner];
      if (fighter.reloading > 0 || fighter.cooldown > 0) return;
      if (fighter.mag <= 0) return;
      fighter.mag -= 1;
      fighter.cooldown = owner === 'p1' ? 12 : 20;
      const goingRight = owner === 'p1';
      state.bullets.push({
        x: goingRight ? fighter.x + BODY.w : fighter.x,
        y: fighter.y + 14,
        vx: goingRight ? 11 : -11,
        owner,
        damage: owner === 'p1' ? 8 : 12,
      });
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
      if (fighter.reloading <= 0) return;
      fighter.reloading -= 1;
      if (fighter.reloading > 0) return;
      const load = Math.min(fighter.magSize, fighter.reserve);
      fighter.mag = load;
      fighter.reserve -= load;
    };

    const update = () => {
      state.frames += 1;
      const speed = 4;
      if (state.keys['w'] || state.keys['W']) state.p1.y -= speed;
      if (state.keys['s'] || state.keys['S']) state.p1.y += speed;
      if (state.keys['a'] || state.keys['A']) state.p1.x -= speed;
      if (state.keys['d'] || state.keys['D']) state.p1.x += speed;
      clamp(state.p1, FIELD.left, 470);
      reload(state.p1);
      if (state.keys[' ']) shoot('p1');

      reload(state.p2);
      if (botEnabled) {
        const targetY = state.p1.y;
        if (state.p2.y < targetY) state.p2.y += 3;
        else if (state.p2.y > targetY) state.p2.y -= 3;
        if (state.p2.x > state.p1.x + 280) state.p2.x -= 2;
        if (state.p2.x < state.p1.x + 180) state.p2.x += 2;
        clamp(state.p2, 500, FIELD.right);
        if (Math.abs(state.p2.y - state.p1.y) < 28 && state.frames > 90) {
          shoot('p2');
          if (state.p2.cooldown > 0) state.p2.cooldown = 48;
        }
      } else {
        if (state.keys['ArrowUp']) state.p2.y -= speed;
        if (state.keys['ArrowDown']) state.p2.y += speed;
        if (state.keys['ArrowLeft']) state.p2.x -= speed;
        if (state.keys['ArrowRight']) state.p2.x += speed;
        clamp(state.p2, 500, FIELD.right);
        if (state.keys['Enter']) shoot('p2');
      }

      state.bullets = state.bullets.filter((bullet) => {
        bullet.x += bullet.vx;
        if (bullet.x < 0 || bullet.x > WIDTH) return false;
        const target = bullet.owner === 'p1' ? state.p2 : state.p1;
        const hit = bullet.x >= target.x && bullet.x <= target.x + BODY.w
          && bullet.y >= target.y && bullet.y <= target.y + BODY.h;
        if (!hit) return true;
        target.hp -= bullet.damage;
        state[bullet.owner].hits += 1;
        return false;
      });

      if (state.p1.hp <= 0) { onGameEnd('p2'); return; }
      if (state.p2.hp <= 0) { onGameEnd('p1'); return; }

      drawDepot(ctx);
      drawSoldier(ctx, state.p1.x, state.p1.y, 1, 'blue');
      drawSoldier(ctx, state.p2.x, state.p2.y, -1, 'orange');
      state.bullets.forEach((bullet) => {
        ctx.fillStyle = bullet.owner === 'p1' ? '#7ee0ff' : '#ffb15a';
        ctx.fillRect(bullet.x, bullet.y, 12, 3);
      });
      drawHud(ctx, state.p1, state.p2, state.frames);

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
      aria-label="Laser Duel"
      className="w-full max-w-full rounded-xl [image-rendering:pixelated]"
    />
  );
}
