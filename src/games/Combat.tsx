import { useEffect, useRef } from 'react';

const WIDTH = 960;
const HEIGHT = 540;
const GROUND = 468;
const BODY_W = 40;
const BODY_H = 44;
const ARROW_STOCK = 5;
const SHIELD_HITS = 10;
const ACCEL = 0.85;
const MAX_SPEED = 4.4;
const DASH_SPEED = 8;
const DASH_FRAMES = 8;
const DASH_CD = 46;
const JUMP = -6.6;
const GRAVITY = 0.46;
const STEP_UP = 20;
const METER_MAX = 100;
const INTRO_FRAMES = 72;
const KO_FRAMES = 110;
const PIX = '"Press Start 2P", monospace';

type Platform = { x: number; y: number; w: number; h: number; stair?: boolean };

const PLATFORMS: Platform[] = [
  { x: 148, y: 404, w: 150, h: 10 },
  { x: 662, y: 404, w: 150, h: 10 },
  { x: 396, y: 308, w: 168, h: 10 },
  { x: 124, y: 420, w: 30, h: 8, stair: true },
  { x: 96, y: 436, w: 30, h: 8, stair: true },
  { x: 68, y: 452, w: 30, h: 8, stair: true },
  { x: 806, y: 420, w: 30, h: 8, stair: true },
  { x: 834, y: 436, w: 30, h: 8, stair: true },
  { x: 862, y: 452, w: 30, h: 8, stair: true },
  { x: 268, y: 388, w: 28, h: 8, stair: true },
  { x: 294, y: 372, w: 28, h: 8, stair: true },
  { x: 320, y: 356, w: 28, h: 8, stair: true },
  { x: 346, y: 340, w: 28, h: 8, stair: true },
  { x: 372, y: 324, w: 28, h: 8, stair: true },
  { x: 398, y: 308, w: 28, h: 8, stair: true },
  { x: 664, y: 388, w: 28, h: 8, stair: true },
  { x: 638, y: 372, w: 28, h: 8, stair: true },
  { x: 612, y: 356, w: 28, h: 8, stair: true },
  { x: 586, y: 340, w: 28, h: 8, stair: true },
  { x: 560, y: 324, w: 28, h: 8, stair: true },
  { x: 534, y: 308, w: 28, h: 8, stair: true },
];

type Ctx = CanvasRenderingContext2D;
type Side = 'p1' | 'p2';

type Palette = {
  armor: string;
  armorDark: string;
  armorLight: string;
  aura: string;
  crest: string;
};

type Particle = {
  x: number;
  y: number;
  vx: number;
  vy: number;
  life: number;
  color: string;
  size: number;
};

type Wave = {
  x: number;
  y: number;
  vx: number;
  owner: Side;
  life: number;
};

const FIRE: Palette = {
  armor: '#e07a12',
  armorDark: '#8a3d08',
  armorLight: '#ffc14a',
  aura: 'rgba(255, 96, 16, 0.5)',
  crest: '#ffe08a',
};

const ICE: Palette = {
  armor: '#2458c9',
  armorDark: '#16357a',
  armorLight: '#6ea0f0',
  aura: 'rgba(90, 196, 255, 0.5)',
  crest: '#f2c014',
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

const drawLantern = (ctx: Ctx, x: number, y: number, sway: number) => {
  const px = x + sway;
  ctx.fillStyle = '#5c4030';
  ctx.fillRect(x, y - 28, 2, 18);
  ctx.fillStyle = '#c45c18';
  ctx.fillRect(px - 7, y - 12, 16, 18);
  ctx.fillStyle = '#f4c14a';
  ctx.fillRect(px - 4, y - 8, 10, 10);
  ctx.fillStyle = '#7a1e18';
  ctx.fillRect(px - 7, y - 12, 16, 3);
  ctx.fillRect(px - 7, y + 6, 16, 3);
};

const drawFlag = (ctx: Ctx, x: number, y: number, frames: number, color: string) => {
  const wave = Math.round(Math.sin(frames / 8) * 4);
  ctx.fillStyle = '#6b4428';
  ctx.fillRect(x, y - 70, 4, 70);
  ctx.fillStyle = color;
  ctx.fillRect(x + 4, y - 68, 28 + wave, 16);
  ctx.fillStyle = '#f7f3ea';
  ctx.fillRect(x + 8, y - 64, 8, 8);
};

const drawCrowd = (ctx: Ctx, frames: number) => {
  for (let i = 0; i < 22; i += 1) {
    const x = 18 + i * 43;
    const bob = Math.round(Math.sin((frames + i * 11) / 9) * 3);
    const h = 16 + (i % 3) * 5;
    ctx.fillStyle = i % 2 === 0 ? '#1a1420' : '#241820';
    ctx.fillRect(x, GROUND - h + bob, 14, h);
    ctx.fillStyle = '#3a2a22';
    ctx.fillRect(x + 3, GROUND - h - 6 + bob, 8, 8);
  }
};

const drawSnowField = (ctx: Ctx, frames: number) => {
  const sky = ctx.createLinearGradient(0, 0, 0, GROUND);
  sky.addColorStop(0, '#5d7eae');
  sky.addColorStop(0.35, '#8eb4d8');
  sky.addColorStop(0.62, '#d5e4f2');
  sky.addColorStop(0.82, '#f3d7a4');
  sky.addColorStop(1, '#f7f4ee');
  ctx.fillStyle = sky;
  ctx.fillRect(0, 0, WIDTH, HEIGHT);

  ctx.fillStyle = '#f4efe6';
  ctx.fillRect(72, 48, 28, 28);
  ctx.fillRect(64, 56, 44, 20);
  ctx.fillRect(80, 44, 12, 8);
  ctx.fillStyle = '#d5e1ee';
  ctx.fillRect(84, 60, 8, 8);

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
  drawFlag(ctx, 250, GROUND, frames, '#b4332a');
  drawFlag(ctx, 690, GROUND, frames + 6, '#2458c9');
  drawLantern(ctx, 200, 118, Math.round(Math.sin(frames / 14) * 5));
  drawLantern(ctx, 480, 96, Math.round(Math.sin(frames / 12 + 1) * 6));
  drawLantern(ctx, 760, 118, Math.round(Math.sin(frames / 16 + 2) * 5));

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
  drawCrowd(ctx, frames);
};

const drawPlatform = (ctx: Ctx, plat: Platform) => {
  if (plat.stair) {
    ctx.fillStyle = '#6a4328';
    ctx.fillRect(plat.x + 2, plat.y + 6, plat.w - 4, 16);
    ctx.fillStyle = '#8d5a34';
    ctx.fillRect(plat.x, plat.y, plat.w, 8);
    ctx.fillStyle = '#f7fbff';
    ctx.fillRect(plat.x, plat.y - 3, plat.w, 4);
    return;
  }
  ctx.fillStyle = '#6a4328';
  ctx.fillRect(plat.x + 8, plat.y + plat.h, 4, 12);
  ctx.fillRect(plat.x + plat.w - 12, plat.y + plat.h, 4, 12);
  ctx.fillStyle = '#8d5a34';
  ctx.fillRect(plat.x, plat.y, plat.w, plat.h);
  ctx.fillStyle = '#f7fbff';
  ctx.fillRect(plat.x, plat.y - 3, plat.w, 4);
  ctx.fillStyle = '#d5e4f2';
  ctx.fillRect(plat.x + 6, plat.y - 3, 12, 3);
  ctx.fillRect(plat.x + plat.w - 24, plat.y - 3, 14, 3);
};

const paint = (ctx: Ctx, x: number, y: number, w: number, h: number, color: string) => {
  ctx.fillStyle = color;
  ctx.fillRect(x, y, w, h);
};

const SAMURAI_SCALE = 2;
const SAMURAI_BODY = '10,-22,#e9b73c;16,-21,#b1861e;11,-21,#e9b838;16,-20,#b48722;12,-20,#09325e;11,-20,#ebbb3b;10,-20,#0c3062;9,-20,#0c3062;16,-19,#b38822;15,-19,#eabe41;14,-19,#ecbb44;13,-19,#af861d;12,-19,#e9bd3a;11,-19,#e7b737;10,-19,#184a91;9,-19,#1a4a96;8,-19,#0d2f5f;15,-18,#a87b26;14,-18,#b48918;13,-18,#ebbf3c;12,-18,#ad891b;11,-18,#174894;10,-18,#194993;9,-18,#194993;8,-18,#0a2e62;15,-17,#0f2f58;14,-17,#184892;13,-17,#184894;12,-17,#184894;11,-17,#194995;10,-17,#082e5b;9,-17,#092f5e;8,-17,#0a2f63;7,-17,#0a2f5c;16,-16,#0f2e5a;15,-16,#0b3067;14,-16,#072b5d;13,-16,#0c3060;12,-16,#093164;11,-16,#0b3064;10,-16,#194d99;9,-16,#194a96;8,-16,#194a97;7,-16,#0a2e5e;15,-15,#e29d66;14,-15,#d1a485;13,-15,#040003;12,-15,#eb9e68;11,-15,#eb9e66;10,-15,#092d5d;9,-15,#194995;8,-15,#184894;7,-15,#194a97;6,-15,#0b2d5a;15,-14,#e0a16b;14,-14,#efa26a;13,-14,#eb9e68;12,-14,#ea9e6a;11,-14,#e7a06a;10,-14,#3c240c;9,-14,#0a305f;8,-14,#092f5e;7,-14,#0d2e61;6,-14,#0a3361;5,-14,#0a2e5e;4,-14,#e7d6c4;13,-13,#ec9f67;12,-13,#ee9f66;11,-13,#40240c;10,-13,#ee9c62;9,-13,#3e230e;8,-13,#402510;7,-13,#3e260e;15,-12,#081933;14,-12,#1a2940;13,-12,#412611;12,-12,#3c2611;11,-12,#ea9f68;10,-12,#40260f;9,-12,#1a4895;8,-12,#194a97;7,-12,#194a96;6,-12,#0d2f5f;16,-11,#0b2c4f;15,-11,#2e2624;14,-11,#292d39;13,-11,#194a96;12,-11,#194a96;11,-11,#194a96;10,-11,#194a96;9,-11,#3e2811;8,-11,#1c498a;7,-11,#1e4b8f;6,-11,#1d4a8e;5,-11,#102f5d;4,-11,#e7d2bd;16,-10,#401c04;15,-10,#182945;14,-10,#072e67;13,-10,#1a4a9c;12,-10,#1a4886;11,-10,#194a96;10,-10,#184995;9,-10,#0b2b5e;8,-10,#6d4e3c;7,-10,#6c4d3b;6,-10,#6a4d3b;5,-10,#7b4b23;19,-9,#070100;18,-9,#0e0000;17,-9,#0e0000;16,-9,#eddec9;15,-9,#092145;14,-9,#082f6a;13,-9,#1b488c;12,-9,#687888;11,-9,#274672;10,-9,#2a487a;9,-9,#204d91;8,-9,#042d6b;7,-9,#052e6c;6,-9,#0b2c61;18,-8,#eb9e68;17,-8,#ea9d65;16,-8,#0e305d;15,-8,#0a2e5e;14,-8,#182e57;13,-8,#47485c;12,-8,#444559;11,-8,#462c1d;10,-8,#70513c;9,-8,#746761;8,-8,#174894;7,-8,#0e3673;6,-8,#8e8d8b;18,-7,#070000;16,-7,#f5dece;15,-7,#02183d;14,-7,#222838;13,-7,#7e4927;12,-7,#7f4a28;11,-7,#7b4b27;10,-7,#eb9e68;9,-7,#ea9d65;8,-7,#042b66;7,-7,#666f7e;6,-7,#6c5e55;18,-6,#868686;15,-6,#5f3b1b;14,-6,#6c472d;13,-6,#432712;12,-6,#214986;11,-6,#234987;10,-6,#7d4c24;9,-6,#47250c;8,-6,#724c35;7,-6,#424647;6,-6,#6c6d68;5,-6,#6f6f65;16,-5,#7d4c24;15,-5,#252847;14,-5,#1c2b42;13,-5,#3e2511;12,-5,#164a95;11,-5,#194a97;10,-5,#7b4b27;9,-5,#21478e;8,-5,#3f230d;7,-5,#7e4a23;6,-5,#754926;5,-5,#706b67;4,-5,#6d6862;3,-5,#6d6d65;2,-5,#6c6964;1,-5,#726a68;16,-4,#0c315e;15,-4,#1d4f94;14,-4,#164998;13,-4,#1d4a8e;12,-4,#3f2612;11,-4,#39240f;10,-4,#083264;9,-4,#184995;8,-4,#1a4b97;7,-4,#40260f;6,-4,#422611;4,-4,#726755;3,-4,#6b6c67;2,-4,#706f6a;15,-3,#13305c;14,-3,#194b94;13,-3,#1c4d9a;12,-3,#0b305a;9,-3,#093162;8,-3,#092d5f;7,-3,#062f65;6,-3,#7f4a2a;15,-2,#050f2a;14,-2,#0b3065;13,-2,#11305f;7,-2,#814d28;6,-2,#794828;16,-1,#845028;15,-1,#7f4a28;14,-1,#7f4a28;13,-1,#7b4e27;8,-1,#7f4b26;7,-1,#814b27';
type SpritePixel = [number, number, string];

const parseSprite = (data: string): SpritePixel[] => data.split(';').map((item) => {
  const [x, y, color] = item.split(',');
  return [Number(x), Number(y), color];
});

const isSheath = ([x, y, color]: SpritePixel) => {
  if (x > 6 || y < -8 || y > -4) return false;
  const value = parseInt(color.slice(1), 16);
  const red = (value >> 16) & 255;
  const green = (value >> 8) & 255;
  const blue = value & 255;
  return Math.max(red, green, blue) - Math.min(red, green, blue) < 40;
};

const isFoot = ([x, y, color]: SpritePixel) => {
  if (y < -7 || y > -1 || x === 9 || x === 10) return false;
  const value = parseInt(color.slice(1), 16);
  const red = (value >> 16) & 255;
  const green = (value >> 8) & 255;
  const blue = value & 255;
  return red > 55 && blue < 70 && red > green && green + 8 >= blue && red - blue > 20;
};

const isSwordArm = ([x, y]: SpritePixel) => x >= 16 && y <= -6 && y >= -10;

const samuraiPixels = parseSprite(SAMURAI_BODY);
const samuraiSheath = samuraiPixels.filter(isSheath);
const samuraiSwordArm = samuraiPixels.filter(isSwordArm);
const samuraiFrontFoot = samuraiPixels.filter((pixel) => isFoot(pixel) && pixel[0] >= 11);
const samuraiBackFoot = samuraiPixels.filter((pixel) => isFoot(pixel) && pixel[0] <= 8);
const samuraiBody = samuraiPixels.filter((pixel) => !isSheath(pixel) && !isFoot(pixel) && !isSwordArm(pixel));

const blitSprite = (ctx: Ctx, pixels: SpritePixel[]) => {
  pixels.forEach(([x, y, color]) => {
    paint(ctx, x * SAMURAI_SCALE, y * SAMURAI_SCALE, SAMURAI_SCALE, SAMURAI_SCALE, color);
  });
};

const drawSwordArm = (ctx: Ctx, swing: number, heavy: boolean, special: boolean) => {
  const power = special ? 10 : heavy ? 8 : 6;
  const reach = swing > 0 ? Math.round(Math.sin(Math.PI * swing) * power) : 0;
  const lift = reach > 0 ? -1 : 0;
  if (reach > 0) {
    for (let i = 0; i < reach; i += 1) {
      paint(ctx, (15 + i) * SAMURAI_SCALE, (-10 + lift) * SAMURAI_SCALE, SAMURAI_SCALE, SAMURAI_SCALE, '#12386e');
      paint(ctx, (15 + i) * SAMURAI_SCALE, (-9 + lift) * SAMURAI_SCALE, SAMURAI_SCALE, SAMURAI_SCALE, '#184a96');
      paint(ctx, (16 + i) * SAMURAI_SCALE, (-8 + lift) * SAMURAI_SCALE, SAMURAI_SCALE, SAMURAI_SCALE, '#0e305d');
    }
  }
  samuraiSwordArm.forEach(([armX, armY, color]) => {
    paint(
      ctx,
      (armX + reach) * SAMURAI_SCALE,
      (armY + lift) * SAMURAI_SCALE,
      SAMURAI_SCALE,
      SAMURAI_SCALE,
      color,
    );
  });
  if (swing <= 0) return;
  const extra = Math.round(Math.sin(Math.PI * swing) * (special ? 18 : heavy ? 14 : 10));
  const length = 8 + extra;
  const x = (19 + reach) * SAMURAI_SCALE;
  const y = (-8 + lift) * SAMURAI_SCALE;
  paint(ctx, x, y, length, SAMURAI_SCALE, special ? '#ffe08a' : '#969696');
  paint(ctx, x + length, y - 1, SAMURAI_SCALE, SAMURAI_SCALE + 2, '#e4e4e4');
  if (!special) return;
  paint(ctx, x + 4, y - 3, 10, 2, '#fff4c2');
  paint(ctx, x + 8, y + 3, 8, 2, '#ffb000');
};

const drawShield = (ctx: Ctx) => {
  paint(ctx, 24, -38, 18, 24, '#5c3d28');
  paint(ctx, 26, -36, 14, 20, '#c4925a');
  paint(ctx, 26, -28, 14, 4, '#8d6238');
  paint(ctx, 31, -36, 4, 20, '#8d6238');
  paint(ctx, 31, -30, 4, 4, '#e6edf4');
  paint(ctx, 24, -38, 18, 2, '#f2c014');
  paint(ctx, 24, -16, 18, 2, '#f2c014');
  paint(ctx, 24, -38, 2, 24, '#f2c014');
  paint(ctx, 40, -38, 2, 24, '#f2c014');
};

const drawBow = (ctx: Ctx) => {
  const limb: [number, number][] = [
    [30, -40],
    [34, -36],
    [36, -30],
    [37, -24],
    [36, -18],
    [34, -14],
    [30, -10],
  ];
  limb.forEach(([x, y]) => {
    paint(ctx, x, y, 4, 5, '#6b3e22');
    paint(ctx, x, y, 2, 3, '#a56b3c');
  });
  paint(ctx, 31, -38, 2, 28, '#f4efe6');
};

const drawSamurai = (
  ctx: Ctx,
  x: number,
  y: number,
  dir: number,
  palette: Palette,
  swing: number,
  heavy: boolean,
  aiming: boolean,
  dashing: boolean,
  blocking: boolean,
  step: number,
  hurt: boolean,
  jumping: boolean,
  supering: boolean,
  flash: boolean,
  bruise: boolean,
  special: boolean,
) => {
  ctx.save();
  ctx.translate(dir === 1 ? x : x + BODY_W, y + (hurt ? 3 : 0) + (jumping ? -2 : 0));
  ctx.scale(dir, 1);
  if (hurt) ctx.translate(-4, 0);

  if (dashing || supering) {
    ctx.fillStyle = supering ? palette.armorLight : palette.aura;
    ctx.globalAlpha = supering ? 0.55 : 0.7;
    ctx.fillRect(-10, -32, 8, 22);
    ctx.fillRect(-18, -22, 7, 10);
    ctx.globalAlpha = 1;
  }

  const drawFeet = (pixels: SpritePixel[], lift: boolean) => {
    pixels.forEach(([footX, footY, color]) => {
      const offsetX = lift ? 2 : 0;
      const offsetY = lift ? -3 : jumping ? -5 : 0;
      paint(
        ctx,
        (footX + offsetX) * SAMURAI_SCALE,
        (footY + offsetY) * SAMURAI_SCALE,
        SAMURAI_SCALE,
        SAMURAI_SCALE,
        color,
      );
    });
  };

  blitSprite(ctx, samuraiBody);
  paint(ctx, 18, -40, 6, 4, palette.armor);
  paint(ctx, 20, -46, 2, 6, palette.crest);
  if (bruise) {
    paint(ctx, 22, -28, 4, 3, '#7a2430');
    paint(ctx, 26, -24, 3, 2, '#4a1820');
  }
  drawFeet(samuraiFrontFoot, step === 0);
  drawFeet(samuraiBackFoot, step === 1);
  if (swing > 0) blitSprite(ctx, samuraiSheath);
  drawSwordArm(ctx, blocking || aiming ? 0 : swing, heavy, special || supering);
  if (blocking) {
    drawShield(ctx);
  } else if (aiming) {
    drawBow(ctx);
  }
  if (flash) {
    ctx.globalAlpha = 0.55;
    ctx.fillStyle = '#ffffff';
    ctx.fillRect(8, -44, 36, 44);
    ctx.globalAlpha = 1;
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

const drawWave = (ctx: Ctx, wave: Wave, color: string) => {
  const dir = wave.vx > 0 ? 1 : -1;
  ctx.save();
  ctx.translate(wave.x, wave.y);
  ctx.scale(dir, 1);
  ctx.globalAlpha = Math.min(1, wave.life / 10);
  ctx.fillStyle = color;
  ctx.fillRect(0, -10, 28, 6);
  ctx.fillRect(8, -16, 18, 6);
  ctx.fillRect(8, -4, 18, 6);
  ctx.fillStyle = '#fff4c2';
  ctx.fillRect(18, -8, 16, 4);
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

const drawShieldStock = (ctx: Ctx, x: number, y: number, left: number) => {
  for (let i = 0; i < SHIELD_HITS; i += 1) {
    ctx.fillStyle = i < left ? '#c4925a' : '#2a3344';
    ctx.fillRect(x + i * 7, y, 5, 4);
  }
};

const drawBar = (
  ctx: Ctx,
  x: number,
  y: number,
  w: number,
  h: number,
  fill: number,
  ghost: number,
  alignRight: boolean,
  fillColor: string,
  ghostColor: string,
) => {
  ctx.fillStyle = '#1b2430';
  ctx.fillRect(x, y, w, h);
  const ghostW = Math.max(0, Math.min(1, ghost)) * w;
  const fillW = Math.max(0, Math.min(1, fill)) * w;
  ctx.fillStyle = ghostColor;
  ctx.fillRect(alignRight ? x + w - ghostW : x, y, ghostW, h);
  ctx.fillStyle = fillColor;
  ctx.fillRect(alignRight ? x + w - fillW : x, y, fillW, h);
  ctx.strokeStyle = '#f7f3ea';
  ctx.strokeRect(x, y, w, h);
};

const drawHud = (
  ctx: Ctx,
  p1: { hp: number; hpShow: number; score: number; arrows: number; shield: number; meter: number; combo: number; comboTimer: number },
  p2: { hp: number; hpShow: number; score: number; arrows: number; shield: number; meter: number; combo: number; comboTimer: number },
  seconds: number,
  frames: number,
  ko: Side | null,
) => {
  ctx.fillStyle = 'rgba(8, 16, 32, 0.78)';
  ctx.fillRect(0, 0, WIDTH, 92);

  const drawSide = (
    sideX: number,
    alignRight: boolean,
    label: string,
    name: string,
    fighter: { hp: number; hpShow: number; score: number; arrows: number; shield: number; meter: number },
    palette: Palette,
  ) => {
    const portraitX = alignRight ? sideX + 286 : sideX;
    ctx.fillStyle = '#101820';
    ctx.fillRect(portraitX, 8, 44, 44);
    ctx.strokeStyle = palette.armorLight;
    ctx.strokeRect(portraitX, 8, 44, 44);
    ctx.fillStyle = palette.armor;
    ctx.fillRect(portraitX + 12, 16, 20, 14);
    ctx.fillStyle = '#f2c014';
    ctx.fillRect(portraitX + 16, 6, 3, 8);
    ctx.fillRect(portraitX + 24, 8, 3, 6);
    ctx.fillStyle = '#f0c8a0';
    ctx.fillRect(portraitX + 14, 26, 8, 6);
    ctx.fillStyle = '#111';
    ctx.fillRect(portraitX + 16, 28, 3, 3);

    const textX = alignRight ? sideX + 270 : sideX + 52;
    ctx.textAlign = alignRight ? 'right' : 'left';
    ctx.fillStyle = '#f7f3ea';
    ctx.font = `8px ${PIX}`;
    ctx.fillText(label, textX, 16);
    ctx.font = `10px ${PIX}`;
    ctx.fillText(name, textX, 54);
    ctx.font = `8px ${PIX}`;
    ctx.fillText(String(fighter.score).padStart(6, '0'), textX, 70);

    const barX = alignRight ? sideX : sideX + 52;
    const hpColor = fighter.hp > 30 ? '#7dce3a' : '#e23b2f';
    drawBar(ctx, barX, 22, 220, 12, fighter.hp / 100, fighter.hpShow / 100, alignRight, hpColor, '#7a2430');
    drawBar(ctx, barX, 38, 220, 8, fighter.meter / METER_MAX, fighter.meter / METER_MAX, alignRight, '#ffb000', '#5a3a08');
    ctx.fillStyle = '#f7f3ea';
    ctx.font = `7px ${PIX}`;
    ctx.textAlign = alignRight ? 'left' : 'right';
    ctx.fillText('HP', alignRight ? barX : barX + 220, 18);
    ctx.fillText(fighter.meter >= METER_MAX ? 'SUPER' : 'KI', alignRight ? barX : barX + 220, 50);

    const stockX = alignRight ? sideX + 90 : sideX + 150;
    drawArrowStock(ctx, stockX, 82, fighter.arrows, palette.armorLight);
    drawShieldStock(ctx, alignRight ? sideX : sideX + 52, 74, fighter.shield);
    ctx.textAlign = 'left';
  };

  drawSide(12, false, 'PLAYER 1', 'TAKEDA', p1, FIRE);
  drawSide(WIDTH - 342, true, 'PLAYER 2', 'REN', p2, ICE);

  ctx.textAlign = 'center';
  ctx.fillStyle = '#f7f3ea';
  ctx.font = `8px ${PIX}`;
  ctx.fillText(`TIME ${String(seconds).padStart(2, '0')}`, WIDTH / 2, 16);
  ctx.fillStyle = '#ff8a1a';
  ctx.font = `16px ${PIX}`;
  ctx.fillText('VS', WIDTH / 2, 38);
  ctx.fillStyle = '#f7f3ea';
  ctx.font = `8px ${PIX}`;
  ctx.fillText('ROUND 1', WIDTH / 2, 58);

  if (frames < 40) {
    ctx.fillStyle = '#ffb000';
    ctx.font = `22px ${PIX}`;
    ctx.fillText('ROUND 1', WIDTH / 2, 250);
  } else if (frames < INTRO_FRAMES) {
    ctx.fillStyle = '#ffb000';
    ctx.font = `28px ${PIX}`;
    ctx.fillText('FIGHT!', WIDTH / 2, 250);
  }
  if (ko) {
    ctx.fillStyle = 'rgba(8, 8, 16, 0.35)';
    ctx.fillRect(0, 200, WIDTH, 80);
    ctx.fillStyle = '#ffb000';
    ctx.font = `32px ${PIX}`;
    ctx.fillText('K.O.', WIDTH / 2, 250);
    ctx.fillStyle = '#f7f3ea';
    ctx.font = `10px ${PIX}`;
    ctx.fillText(ko === 'p1' ? 'TAKEDA WINS' : 'REN WINS', WIDTH / 2, 276);
  }

  if (p1.comboTimer > 0 && p1.combo >= 2) {
    ctx.textAlign = 'left';
    ctx.fillStyle = '#ffb000';
    ctx.font = `12px ${PIX}`;
    ctx.fillText(`${p1.combo} HITS`, 24, 130);
  }
  if (p2.comboTimer > 0 && p2.combo >= 2) {
    ctx.textAlign = 'right';
    ctx.fillStyle = '#9ad8ff';
    ctx.font = `12px ${PIX}`;
    ctx.fillText(`${p2.combo} HITS`, WIDTH - 24, 130);
  }
  ctx.textAlign = 'left';

  ctx.fillStyle = '#243044';
  ctx.font = `8px ${PIX}`;
  ctx.fillText('SNOWY PASS', 16, HEIGHT - 44);
  ctx.fillStyle = 'rgba(8, 16, 32, 0.88)';
  ctx.fillRect(0, HEIGHT - 36, WIDTH, 36);
  ctx.fillStyle = '#f7f3ea';
  ctx.font = `7px ${PIX}`;
  ctx.textAlign = 'center';
  ctx.fillText('P1  WASD  SHIFT ESQUIVA  S ESCUDO  ESPACIO COMBO  F ARCO  BARRA LLENA = SUPER', WIDTH / 2, HEIGHT - 22);
  ctx.fillText('P2  FLECHAS  L ESQUIVA  ABAJO ESCUDO  ENTER COMBO  K ARCO', WIDTH / 2, HEIGHT - 10);
  ctx.textAlign = 'left';
};

const spawnBurst = (list: Particle[], x: number, y: number, color: string, count: number) => {
  for (let i = 0; i < count; i += 1) {
    list.push({
      x,
      y,
      vx: (Math.random() - 0.5) * 7,
      vy: -1 - Math.random() * 4,
      life: 12 + Math.floor(Math.random() * 10),
      color,
      size: Math.random() > 0.5 ? 3 : 2,
    });
  }
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
    const makeFighter = (x: number, dir: number) => ({
      x,
      y: GROUND,
      vx: 0,
      vy: 0,
      hp: 100,
      hpShow: 100,
      dir,
      attacking: 0,
      attackLock: 0,
      heavy: false,
      special: false,
      supering: false,
      didHit: false,
      arrows: ARROW_STOCK,
      shield: SHIELD_HITS,
      shootCd: 0,
      score: 0,
      dashing: 0,
      dashCd: 0,
      blocking: false,
      grounded: true,
      swingFrom: 0,
      stun: 0,
      flash: 0,
      meter: 0,
      combo: 0,
      comboTimer: 0,
    });

    const state = {
      p1: makeFighter(22, 1),
      p2: makeFighter(WIDTH - BODY_W - 22, -1),
      shots: [] as { x: number; y: number; vx: number; owner: Side }[],
      waves: [] as Wave[],
      fx: [] as Particle[],
      flakes: Array.from({ length: 42 }, () => ({
        x: Math.random() * WIDTH,
        y: Math.random() * HEIGHT,
        s: Math.random() > 0.6 ? 3 : 2,
        v: 0.7 + Math.random() * 1.1,
      })),
      keys: {} as Record<string, boolean>,
      frames: 0,
      hitStop: 0,
      shake: 0,
      ko: null as Side | null,
      koFrames: 0,
    };

    const impactFrame = (fighter: typeof state.p1) => {
      if (fighter.supering) return 12;
      if (fighter.special) return 10;
      if (fighter.heavy) return 8;
      return 9;
    };

    const tryDash = (owner: Side) => {
      const fighter = state[owner];
      if (state.ko || state.frames < INTRO_FRAMES) return;
      if (fighter.stun > 0 || fighter.dashCd > 0 || fighter.dashing > 0 || !fighter.grounded) return;
      fighter.dashing = DASH_FRAMES;
      fighter.dashCd = DASH_CD;
      fighter.blocking = false;
      fighter.attacking = 0;
      fighter.special = false;
      fighter.supering = false;
      spawnBurst(state.fx, fighter.x + BODY_W / 2, fighter.y - 8, '#f7f3ea', 6);
    };

    const shoot = (owner: Side) => {
      const fighter = state[owner];
      if (state.ko || state.frames < INTRO_FRAMES) return;
      if (fighter.stun > 0 || fighter.arrows <= 0 || fighter.shootCd > 0 || fighter.blocking || fighter.dashing > 0) return;
      fighter.arrows -= 1;
      fighter.shootCd = 42;
      state.shots.push({
        x: fighter.dir === 1 ? fighter.x + BODY_W - 8 : fighter.x - 18,
        y: fighter.y - Math.round(BODY_H * 0.62),
        vx: fighter.dir * 11,
        owner,
      });
    };

    const startSlash = (owner: Side) => {
      const fighter = state[owner];
      if (state.ko || state.frames < INTRO_FRAMES) return;
      if (fighter.stun > 0 || fighter.blocking || fighter.dashing > 0) return;
      if (fighter.attacking === 0 && fighter.attackLock === 0) {
        if (fighter.meter >= METER_MAX) {
          fighter.attacking = 28;
          fighter.attackLock = 36;
          fighter.swingFrom = 28;
          fighter.heavy = true;
          fighter.special = true;
          fighter.supering = true;
          fighter.didHit = false;
          fighter.meter = 0;
          fighter.vx += fighter.dir * 3.4;
          return;
        }
        fighter.attacking = 18;
        fighter.attackLock = 22;
        fighter.swingFrom = 18;
        fighter.heavy = false;
        fighter.special = false;
        fighter.supering = false;
        fighter.didHit = false;
        fighter.vx += fighter.dir * 2.2;
        return;
      }
      if (!fighter.heavy && fighter.attacking > 0 && fighter.attacking <= 12) {
        fighter.heavy = true;
        fighter.attacking = 16;
        fighter.swingFrom = 16;
        fighter.attackLock = 32;
        fighter.didHit = false;
        fighter.vx += fighter.dir * 3;
        return;
      }
      if (fighter.heavy && !fighter.special && fighter.attacking > 0 && fighter.attacking <= 10 && fighter.meter >= 50) {
        fighter.special = true;
        fighter.attacking = 20;
        fighter.swingFrom = 20;
        fighter.attackLock = 38;
        fighter.didHit = false;
        fighter.meter -= 50;
        fighter.vx += fighter.dir * 3.6;
      }
    };

    const handleKeyDown = (event: KeyboardEvent) => {
      const key = event.key.length === 1 ? event.key.toLowerCase() : event.key;
      state.keys[key] = true;
      if (key === ' ' || key === 'arrowdown' || key === 'arrowup' || key === 'arrowleft' || key === 'arrowright') {
        event.preventDefault();
      }
      if (key === ' ') startSlash('p1');
      if (key === 'f') shoot('p1');
      if (key === 'Shift') tryDash('p1');
      if (!botEnabled) {
        if (key === 'Enter') startSlash('p2');
        if (key === 'k') shoot('p2');
        if (key === 'l') tryDash('p2');
      }
    };
    const handleKeyUp = (event: KeyboardEvent) => {
      const key = event.key.length === 1 ? event.key.toLowerCase() : event.key;
      state.keys[key] = false;
    };
    window.addEventListener('keydown', handleKeyDown);
    window.addEventListener('keyup', handleKeyUp);

    const bodyOf = (fighter: { x: number; y: number }) => ({
      x: fighter.x + 2,
      y: fighter.y - BODY_H + 8,
      w: BODY_W - 4,
      h: BODY_H - 10,
    });

    const hits = (
      box: { x: number; y: number; w: number; h: number },
      fighter: { x: number; y: number },
    ) => {
      const body = bodyOf(fighter);
      return box.x < body.x + body.w && box.x + box.w > body.x && box.y < body.y + body.h && box.y + box.h > body.y;
    };

    const steer = (fighter: typeof state.p1, dir: -1 | 0 | 1) => {
      if (fighter.dashing > 0) {
        fighter.vx = fighter.dir * DASH_SPEED;
        return;
      }
      if (fighter.stun > 0) {
        fighter.vx *= 0.8;
        return;
      }
      if (dir !== 0 && !fighter.blocking) {
        fighter.dir = dir;
        fighter.vx += dir * ACCEL;
      } else {
        fighter.vx *= 0.72;
      }
      const cap = fighter.blocking ? 1.6 : MAX_SPEED;
      if (fighter.vx > cap) fighter.vx = cap;
      if (fighter.vx < -cap) fighter.vx = -cap;
    };

    const applyHit = (defender: typeof state.p1, attacker: typeof state.p1, amount: number, knock: number, stun: number) => {
      if (defender.dashing > 0) return false;
      const facing = defender.dir === -Math.sign(knock || 1);
      const hitX = defender.x + BODY_W / 2;
      const hitY = defender.y - 24;
      if (defender.blocking && facing && defender.shield > 0) {
        defender.shield -= 1;
        defender.vx = knock * 1.4;
        attacker.meter = Math.min(METER_MAX, attacker.meter + 4);
        spawnBurst(state.fx, hitX, hitY, '#f2c014', 6);
        state.hitStop = 3;
        state.shake = 4;
        return false;
      }
      defender.hp -= amount;
      defender.vx = knock * 9;
      defender.vy = -4.2;
      defender.stun = stun;
      defender.flash = 6;
      defender.attacking = 0;
      defender.blocking = false;
      attacker.score += amount * 25;
      attacker.meter = Math.min(METER_MAX, attacker.meter + amount);
      if (attacker.comboTimer > 0) attacker.combo += 1;
      else attacker.combo = 1;
      attacker.comboTimer = 50;
      spawnBurst(state.fx, hitX, hitY, amount > 12 ? '#ffe08a' : '#ffffff', amount > 12 ? 14 : 8);
      state.hitStop = amount > 12 ? 8 : 5;
      state.shake = amount > 12 ? 10 : 6;
      return true;
    };

    const botUpdate = () => {
      const dist = state.p1.x - state.p2.x;
      const absDist = Math.abs(dist);
      state.p2.dir = dist >= 0 ? 1 : -1;
      const arrowNear = state.shots.some((shot) => shot.owner === 'p1' && Math.abs(shot.x - state.p2.x) < 140);
      if (arrowNear && Math.random() < 0.4) tryDash('p2');
      if (absDist > 360 && state.p2.dashCd === 0 && state.p2.grounded && Math.random() < 0.03) tryDash('p2');
      const playerSwinging = state.p1.attacking > 0 && absDist < 70;
      state.p2.blocking = playerSwinging && state.p2.dashing === 0 && state.p2.grounded && state.p2.shield > 0 && state.p2.stun === 0;
      if (state.p2.blocking) {
        steer(state.p2, 0);
      } else if (absDist > 42) {
        steer(state.p2, dist > 0 ? 1 : -1);
      } else {
        steer(state.p2, 0);
        state.p2.dir = dist > 0 ? 1 : -1;
      }
      if (!state.p2.blocking && state.p2.attacking === 0 && state.p2.attackLock === 0 && absDist < 46 && Math.random() < 0.35) {
        startSlash('p2');
        state.p2.attackLock = 64;
      } else if (state.p2.attacking > 0 && absDist < 50 && Math.random() < 0.2) {
        startSlash('p2');
      }
      if (absDist > 160 && state.p2.arrows > 0 && state.p2.shootCd === 0 && state.frames > 100 && Math.random() < 0.012) {
        shoot('p2');
      }
      if (state.p2.grounded && !state.p2.blocking && state.p1.y < state.p2.y - 24 && Math.random() < 0.05) {
        state.p2.vy = JUMP;
      }
    };

    const update = () => {
      state.frames += 1;
      if (state.hitStop > 0) {
        state.hitStop -= 1;
      } else if (!state.ko) {
        if (state.frames >= INTRO_FRAMES) {
          state.p1.blocking = Boolean(state.keys['s'] && state.p1.grounded && state.p1.dashing === 0 && state.p1.shield > 0 && state.p1.stun === 0);
          if (!botEnabled) {
            state.p2.blocking = Boolean(state.keys['ArrowDown'] && state.p2.grounded && state.p2.dashing === 0 && state.p2.shield > 0 && state.p2.stun === 0);
          }

          const p1Dir = state.keys['a'] ? -1 : state.keys['d'] ? 1 : 0;
          steer(state.p1, p1Dir);
          if (state.keys['w'] && state.p1.grounded && !state.p1.blocking && state.p1.dashing === 0 && state.p1.stun === 0) {
            state.p1.vy = JUMP;
          }

          if (!botEnabled) {
            const p2Dir = state.keys['ArrowLeft'] ? -1 : state.keys['ArrowRight'] ? 1 : 0;
            steer(state.p2, p2Dir);
            if (state.keys['ArrowUp'] && state.p2.grounded && !state.p2.blocking && state.p2.dashing === 0 && state.p2.stun === 0) {
              state.p2.vy = JUMP;
            }
          } else {
            botUpdate();
          }
        }

        const land = (fighter: typeof state.p1, prevY: number) => {
          let grounded = false;
          if (fighter.vy >= 0) {
            PLATFORMS.forEach((plat) => {
              const overlaps = fighter.x + 4 < plat.x + plat.w && fighter.x + BODY_W - 4 > plat.x;
              const crossed = prevY <= plat.y && fighter.y >= plat.y && fighter.y <= plat.y + 14;
              if (!overlaps || !crossed) return;
              fighter.y = plat.y;
              fighter.vy = 0;
              grounded = true;
            });
          }
          if (fighter.y >= GROUND) {
            fighter.y = GROUND;
            fighter.vy = 0;
            grounded = true;
          }
          fighter.grounded = grounded;
        };

        const climb = (fighter: typeof state.p1) => {
          if (fighter.vy < -1) return;
          let stepped = fighter.y;
          PLATFORMS.forEach((plat) => {
            const overlaps = fighter.x + 6 < plat.x + plat.w && fighter.x + BODY_W - 6 > plat.x;
            const rise = fighter.y - plat.y;
            if (!overlaps || rise <= 0 || rise > STEP_UP) return;
            if (plat.y < stepped) stepped = plat.y;
          });
          if (stepped === fighter.y) return;
          fighter.y = stepped;
          fighter.vy = 0;
          fighter.grounded = true;
        };

        [state.p1, state.p2].forEach((fighter) => {
          const prevY = fighter.y;
          fighter.vy += GRAVITY;
          fighter.y += fighter.vy;
          fighter.x += fighter.vx;
          land(fighter, prevY);
          climb(fighter);
          if (fighter.x < 12) fighter.x = 12;
          if (fighter.x > WIDTH - BODY_W - 12) fighter.x = WIDTH - BODY_W - 12;
          if (fighter.attacking > 0) fighter.attacking -= 1;
          if (fighter.attackLock > 0) fighter.attackLock -= 1;
          if (fighter.shootCd > 0) fighter.shootCd -= 1;
          if (fighter.dashing > 0) fighter.dashing -= 1;
          if (fighter.dashCd > 0) fighter.dashCd -= 1;
          if (fighter.stun > 0) fighter.stun -= 1;
          if (fighter.flash > 0) fighter.flash -= 1;
          if (fighter.comboTimer > 0) fighter.comboTimer -= 1;
          else fighter.combo = 0;
          if (fighter.hpShow > fighter.hp) fighter.hpShow -= 0.45;
          if (fighter.hpShow < fighter.hp) fighter.hpShow = fighter.hp;
          if (fighter.attacking === 0) {
            fighter.heavy = false;
            fighter.special = false;
            fighter.supering = false;
            fighter.didHit = false;
          }
        });

        const strikeBox = (fighter: typeof state.p1) => {
          const reach = fighter.supering ? 56 : fighter.special ? 48 : fighter.heavy ? 42 : 32;
          return {
            x: fighter.dir === 1 ? fighter.x + 34 : fighter.x - reach + 6,
            y: fighter.y - 24,
            w: reach,
            h: 12,
          };
        };

        const strike = (attacker: Side, defender: Side) => {
          const fighter = state[attacker];
          if (fighter.didHit || fighter.attacking !== impactFrame(fighter)) return;
          const box = strikeBox(fighter);
          if (!hits(box, state[defender])) return;
          fighter.didHit = true;
          const amount = fighter.supering ? 22 : fighter.special ? 16 : fighter.heavy ? 14 : 8;
          const stun = fighter.supering ? 22 : fighter.special ? 18 : fighter.heavy ? 16 : 12;
          const connected = applyHit(state[defender], fighter, amount, fighter.dir * (fighter.supering ? 8 : 6), stun);
          if (connected && fighter.supering) {
            state.waves.push({
              x: fighter.dir === 1 ? fighter.x + BODY_W : fighter.x,
              y: fighter.y - 22,
              vx: fighter.dir * 10,
              owner: attacker,
              life: 28,
            });
          }
        };

        const p1Impact = state.p1.attacking === impactFrame(state.p1) && !state.p1.didHit;
        const p2Impact = state.p2.attacking === impactFrame(state.p2) && !state.p2.didHit;
        if (p1Impact && p2Impact && Math.abs(state.p1.x - state.p2.x) < 78) {
          state.p1.didHit = true;
          state.p2.didHit = true;
          state.p1.vx = -state.p1.dir * 5;
          state.p2.vx = -state.p2.dir * 5;
          state.hitStop = 9;
          state.shake = 8;
          spawnBurst(state.fx, (state.p1.x + state.p2.x) / 2, state.p1.y - 22, '#ffe08a', 16);
        } else {
          strike('p1', 'p2');
          strike('p2', 'p1');
        }

        state.shots = state.shots.filter((shot) => {
          shot.x += shot.vx;
          if (shot.x < -40 || shot.x > WIDTH + 40) return false;
          const defender = shot.owner === 'p1' ? state.p2 : state.p1;
          const box = { x: shot.vx > 0 ? shot.x + 16 : shot.x, y: shot.y - 4, w: 16, h: 10 };
          if (!hits(box, defender)) return true;
          applyHit(defender, state[shot.owner], 7, Math.sign(shot.vx) * 7, 10);
          return false;
        });

        state.waves = state.waves.filter((wave) => {
          wave.x += wave.vx;
          wave.life -= 1;
          if (wave.life <= 0 || wave.x < -50 || wave.x > WIDTH + 50) return false;
          const defender = wave.owner === 'p1' ? state.p2 : state.p1;
          const box = { x: wave.vx > 0 ? wave.x : wave.x - 28, y: wave.y - 12, w: 32, h: 20 };
          if (!hits(box, defender)) return true;
          applyHit(defender, state[wave.owner], 10, Math.sign(wave.vx) * 8, 16);
          return false;
        });
      } else {
        [state.p1, state.p2].forEach((fighter) => {
          fighter.vy += GRAVITY;
          fighter.y += fighter.vy;
          fighter.x += fighter.vx * 0.4;
          if (fighter.y > GROUND) {
            fighter.y = GROUND;
            fighter.vy = 0;
          }
          if (fighter.flash > 0) fighter.flash -= 1;
          if (fighter.hpShow > fighter.hp) fighter.hpShow -= 0.6;
        });
        state.koFrames -= 1;
        if (state.koFrames <= 0 && state.ko) {
          onGameEnd(state.ko);
          return;
        }
      }

      if (!state.ko) {
        if (state.p1.hp <= 0) {
          state.ko = 'p2';
          state.koFrames = KO_FRAMES;
          state.p1.stun = 999;
          state.p1.vy = -5;
        } else if (state.p2.hp <= 0) {
          state.ko = 'p1';
          state.koFrames = KO_FRAMES;
          state.p2.stun = 999;
          state.p2.vy = -5;
        }
      }

      state.fx = state.fx.filter((spark) => {
        spark.x += spark.vx;
        spark.y += spark.vy;
        spark.vy += 0.18;
        spark.life -= 1;
        return spark.life > 0;
      });
      state.flakes.forEach((flake) => {
        flake.y += flake.v;
        flake.x += 0.3;
        if (flake.y > HEIGHT) {
          flake.y = 0;
          flake.x = Math.random() * WIDTH;
        }
      });
      if (state.shake > 0) state.shake -= 1;

      const ox = state.shake > 0 ? Math.round((Math.random() - 0.5) * state.shake) : 0;
      const oy = state.shake > 0 ? Math.round((Math.random() - 0.5) * state.shake) : 0;
      ctx.save();
      ctx.translate(ox, oy);
      drawSnowField(ctx, state.frames);
      PLATFORMS.forEach((plat) => drawPlatform(ctx, plat));
      const stepOf = (fighter: typeof state.p1) => {
        if (!fighter.grounded || Math.abs(fighter.vx) < 0.55 || fighter.stun > 0) return -1;
        return Math.floor(state.frames / 6) % 2;
      };
      const swingOf = (fighter: typeof state.p1) => {
        if (fighter.attacking <= 0 || fighter.swingFrom <= 0) return 0;
        return 1 - fighter.attacking / fighter.swingFrom;
      };
      const paintFighter = (fighter: typeof state.p1, palette: Palette) => {
        drawSamurai(
          ctx,
          fighter.x,
          fighter.y,
          fighter.dir,
          palette,
          swingOf(fighter),
          fighter.heavy,
          fighter.shootCd > 8,
          fighter.dashing > 0,
          fighter.blocking,
          stepOf(fighter),
          fighter.stun > 0 && fighter.hp > 0,
          !fighter.grounded,
          fighter.supering,
          fighter.flash > 0,
          fighter.hp < 40,
          fighter.special,
        );
      };
      paintFighter(state.p1, FIRE);
      paintFighter(state.p2, ICE);
      state.shots.forEach((shot) => {
        drawArrow(ctx, shot.x, shot.y, shot.vx > 0 ? 1 : -1, shot.owner === 'p1' ? '#ffb15a' : '#9ad8ff');
      });
      state.waves.forEach((wave) => {
        drawWave(ctx, wave, wave.owner === 'p1' ? '#ffb000' : '#9ad8ff');
      });
      state.fx.forEach((spark) => {
        ctx.globalAlpha = Math.min(1, spark.life / 8);
        ctx.fillStyle = spark.color;
        ctx.fillRect(spark.x, spark.y, spark.size, spark.size);
      });
      ctx.globalAlpha = 1;
      ctx.fillStyle = '#ffffff';
      state.flakes.forEach((flake) => {
        ctx.fillRect(flake.x, flake.y, flake.s, flake.s);
      });
      ctx.restore();
      drawHud(ctx, state.p1, state.p2, Math.floor(state.frames / 60), state.frames, state.ko);

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
