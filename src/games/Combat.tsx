import { useEffect, useRef } from 'react';

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

    let animationFrameId: number;

    const state = {
      p1: { x: 100, y: 300, vx: 0, vy: 0, hp: 100, color: '#FF5A5F', attacking: 0, dir: 1 },
      p2: { x: 650, y: 300, vx: 0, vy: 0, hp: 100, color: '#00A699', attacking: 0, dir: -1 },
      keys: {} as Record<string, boolean>,
      /** Temporizador del bot: frames hasta el próximo salto aleatorio. */
      botJumpTimer: 0,
    };

    const handleKeyDown = (e: KeyboardEvent) => {
      state.keys[e.key] = true;
      if (e.key === ' ' && state.p1.attacking === 0) state.p1.attacking = 15;
      if (!botEnabled && e.key === 'Enter' && state.p2.attacking === 0) state.p2.attacking = 15;
    };
    const handleKeyUp = (e: KeyboardEvent) => { state.keys[e.key] = false; };

    window.addEventListener('keydown', handleKeyDown);
    window.addEventListener('keyup', handleKeyUp);

    /** Bot: persigue a P1 y ataca cuando está cerca. */
    const botUpdate = () => {
      const dist = state.p1.x - state.p2.x;
      const absDist = Math.abs(dist);

      // Moverse hacia P1
      if (absDist > 70) {
        state.p2.vx = dist > 0 ? 4 : -4;
        state.p2.dir = dist > 0 ? 1 : -1;
      } else {
        state.p2.vx *= 0.5; // frenar cuando está cerca
      }

      // Atacar cuando está en rango
      if (absDist < 80 && state.p2.attacking === 0) {
        state.p2.attacking = 15;
        state.p2.dir = dist > 0 ? -1 : 1; // orientarse hacia P1 antes de golpear
      }

      // Salto aleatorio (para que no sea tan predecible)
      state.botJumpTimer++;
      if (state.p2.y >= 300 && state.botJumpTimer > 120 && Math.random() < 0.05) {
        state.p2.vy = -12;
        state.botJumpTimer = 0;
      }
    };

    const update = () => {
      // — P1 (jugador humano) —
      [state.p1, state.p2].forEach((p) => {
        p.vy += 0.5; // gravedad
        p.y += p.vy;
        p.x += p.vx;
        if (p.y >= 300) { p.y = 300; p.vy = 0; }
        if (p.x <= 0) p.x = 0;
        if (p.x >= 750) p.x = 750;
        p.vx *= 0.8; // fricción
        if (p.attacking > 0) p.attacking--;
      });

      if (state.keys['w'] && state.p1.y >= 300) state.p1.vy = -12;
      if (state.keys['a']) { state.p1.vx = -5; state.p1.dir = -1; }
      if (state.keys['d']) { state.p1.vx = 5; state.p1.dir = 1; }

      if (!botEnabled) {
        if (state.keys['ArrowUp'] && state.p2.y >= 300) state.p2.vy = -12;
        if (state.keys['ArrowLeft']) { state.p2.vx = -5; state.p2.dir = -1; }
        if (state.keys['ArrowRight']) { state.p2.vx = 5; state.p2.dir = 1; }
      } else {
        botUpdate();
      }

      // — Hitboxes de ataque —
      if (state.p1.attacking === 14) {
        const box = { x: state.p1.dir === 1 ? state.p1.x + 50 : state.p1.x - 50, y: state.p1.y };
        if (
          box.x < state.p2.x + 50 && box.x + 50 > state.p2.x &&
          box.y < state.p2.y + 50 && box.y + 50 > state.p2.y
        ) {
          state.p2.hp -= 15;
          state.p2.vx = state.p1.dir * 15;
          state.p2.vy = -5;
        }
      }
      if (state.p2.attacking === 14) {
        const box = { x: state.p2.dir === 1 ? state.p2.x + 50 : state.p2.x - 50, y: state.p2.y };
        if (
          box.x < state.p1.x + 50 && box.x + 50 > state.p1.x &&
          box.y < state.p1.y + 50 && box.y + 50 > state.p1.y
        ) {
          state.p1.hp -= 15;
          state.p1.vx = state.p2.dir * 15;
          state.p1.vy = -5;
        }
      }

      if (state.p1.hp <= 0) { onGameEnd('p2'); return; }
      if (state.p2.hp <= 0) { onGameEnd('p1'); return; }

      draw();
      animationFrameId = requestAnimationFrame(update);
    };

    const draw = () => {
      ctx.fillStyle = '#2c3e50';
      ctx.fillRect(0, 0, 800, 400);
      ctx.fillStyle = '#34495e';
      ctx.fillRect(0, 350, 800, 50);

      [state.p1, state.p2].forEach((p) => {
        ctx.fillStyle = p.color;
        ctx.fillRect(p.x, p.y, 50, 50);
        if (p.attacking > 0) {
          ctx.fillStyle = 'white';
          ctx.fillRect(p.dir === 1 ? p.x + 50 : p.x - 50, p.y + 10, 50, 30);
        }
      });

      // Barras de HP
      ctx.fillStyle = 'red';
      ctx.fillRect(10, 10, 300, 20);
      ctx.fillRect(490, 10, 300, 20);
      ctx.fillStyle = 'green';
      ctx.fillRect(10, 10, state.p1.hp * 3, 20);
      ctx.fillRect(490 + (300 - state.p2.hp * 3), 10, state.p2.hp * 3, 20);

      if (botEnabled) {
        ctx.font = '12px sans-serif';
        ctx.fillStyle = '#ffffff66';
        ctx.fillText('BOT', 700, 395);
      }
    };

    animationFrameId = requestAnimationFrame(update);
    return () => {
      window.removeEventListener('keydown', handleKeyDown);
      window.removeEventListener('keyup', handleKeyUp);
      cancelAnimationFrame(animationFrameId);
    };
  }, [onGameEnd, botEnabled]);

  return <canvas ref={canvasRef} width={800} height={400} className="w-full max-w-full rounded-xl" />;
}
