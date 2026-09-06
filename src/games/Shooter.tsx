import { useEffect, useRef } from 'react';

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

    let animationFrameId: number;

    const state = {
      p1: { x: 100, y: 200, hp: 100, color: '#FF5A5F', cooldown: 0 },
      p2: { x: 670, y: 200, hp: 100, color: '#00A699', cooldown: 0 },
      bullets: [] as { x: number; y: number; vx: number; vy: number; owner: 'p1' | 'p2' }[],
      keys: {} as Record<string, boolean>,
    };

    const handleKeyDown = (e: KeyboardEvent) => { state.keys[e.key] = true; };
    const handleKeyUp = (e: KeyboardEvent) => { state.keys[e.key] = false; };
    window.addEventListener('keydown', handleKeyDown);
    window.addEventListener('keyup', handleKeyUp);

    /** Bot: sigue la Y de P1 y dispara cuando está alineado. */
    const botUpdate = () => {
      const targetY = state.p1.y + 15; // centro de P1

      // Acercarse verticalmente
      if (state.p2.y + 15 < targetY) state.p2.y = Math.min(370, state.p2.y + 3);
      else if (state.p2.y + 15 > targetY) state.p2.y = Math.max(0, state.p2.y - 3);

      // Moverse horizontalmente para mantener distancia media
      if (state.p2.x > state.p1.x + 250) state.p2.x = Math.max(400, state.p2.x - 2);
      if (state.p2.x < state.p1.x + 150) state.p2.x = Math.min(770, state.p2.x + 2);

      // Disparar cuando está razonablemente alineado con P1
      const yAligned = Math.abs(state.p2.y - state.p1.y) < 25;
      if (yAligned && state.p2.cooldown === 0) {
        state.bullets.push({
          x: state.p2.x,
          y: state.p2.y + 15,
          vx: -10,
          vy: 0,
          owner: 'p2',
        });
        state.p2.cooldown = 25; // dispara algo más lento que P1 para ser beatable
      }
    };

    const update = () => {
      const speed = 4;

      // — P1 (jugador humano: WASD + Espacio) —
      if (state.keys['w']) state.p1.y = Math.max(0, state.p1.y - speed);
      if (state.keys['s']) state.p1.y = Math.min(370, state.p1.y + speed);
      if (state.keys['a']) state.p1.x = Math.max(0, state.p1.x - speed);
      if (state.keys['d']) state.p1.x = Math.min(370, state.p1.x + speed);

      if (state.p1.cooldown > 0) state.p1.cooldown--;
      if (state.keys[' '] && state.p1.cooldown === 0) {
        state.bullets.push({ x: state.p1.x + 30, y: state.p1.y + 15, vx: 10, vy: 0, owner: 'p1' });
        state.p1.cooldown = 15;
      }

      // — P2 (bot o segundo jugador) —
      if (state.p2.cooldown > 0) state.p2.cooldown--;

      if (botEnabled) {
        botUpdate();
      } else {
        if (state.keys['ArrowUp']) state.p2.y = Math.max(0, state.p2.y - speed);
        if (state.keys['ArrowDown']) state.p2.y = Math.min(370, state.p2.y + speed);
        if (state.keys['ArrowLeft']) state.p2.x = Math.max(400, state.p2.x - speed);
        if (state.keys['ArrowRight']) state.p2.x = Math.min(770, state.p2.x + speed);
        if (state.keys['Enter'] && state.p2.cooldown === 0) {
          state.bullets.push({ x: state.p2.x, y: state.p2.y + 15, vx: -10, vy: 0, owner: 'p2' });
          state.p2.cooldown = 15;
        }
      }

      // — Mover balas y detectar impactos —
      for (let i = state.bullets.length - 1; i >= 0; i--) {
        const b = state.bullets[i];
        b.x += b.vx;

        if (b.x < 0 || b.x > 800) {
          state.bullets.splice(i, 1);
          continue;
        }

        if (
          b.owner === 'p1' &&
          b.x >= state.p2.x && b.x <= state.p2.x + 30 &&
          b.y >= state.p2.y && b.y <= state.p2.y + 30
        ) {
          state.p2.hp -= 10;
          state.bullets.splice(i, 1);
        } else if (
          b.owner === 'p2' &&
          b.x >= state.p1.x && b.x <= state.p1.x + 30 &&
          b.y >= state.p1.y && b.y <= state.p1.y + 30
        ) {
          state.p1.hp -= 10;
          state.bullets.splice(i, 1);
        }
      }

      if (state.p1.hp <= 0) { onGameEnd('p2'); return; }
      if (state.p2.hp <= 0) { onGameEnd('p1'); return; }

      draw();
      animationFrameId = requestAnimationFrame(update);
    };

    const draw = () => {
      ctx.fillStyle = '#1e1e1e';
      ctx.fillRect(0, 0, 800, 400);

      ctx.setLineDash([5, 15]);
      ctx.beginPath(); ctx.moveTo(400, 0); ctx.lineTo(400, 400);
      ctx.strokeStyle = '#ffffff55'; ctx.stroke(); ctx.setLineDash([]);

      ctx.fillStyle = state.p1.color;
      ctx.fillRect(state.p1.x, state.p1.y, 30, 30);
      ctx.fillStyle = state.p2.color;
      ctx.fillRect(state.p2.x, state.p2.y, 30, 30);

      // Barras de HP
      ctx.fillStyle = 'red';
      ctx.fillRect(10, 10, 200, 20);
      ctx.fillRect(590, 10, 200, 20);
      ctx.fillStyle = 'green';
      ctx.fillRect(10, 10, state.p1.hp * 2, 20);
      ctx.fillRect(590 + (200 - state.p2.hp * 2), 10, state.p2.hp * 2, 20);

      // Balas
      ctx.fillStyle = 'yellow';
      state.bullets.forEach((b) => {
        ctx.beginPath();
        ctx.arc(b.x, b.y, 4, 0, Math.PI * 2);
        ctx.fill();
      });

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
