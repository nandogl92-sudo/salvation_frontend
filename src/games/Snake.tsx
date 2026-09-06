import { useEffect, useRef } from 'react';

const GRID_W = 40;
const GRID_H = 20;

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

    let animationFrameId: number;
    let lastTime = 0;

    const gridSize = 20;
    const state = {
      p1: { body: [{ x: 5, y: 10 }], dx: 1, dy: 0, color: '#FF5A5F' },
      p2: { body: [{ x: 34, y: 10 }], dx: -1, dy: 0, color: '#00A699' },
      food: { x: 20, y: 10 },
    };

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'w' && state.p1.dy === 0) { state.p1.dx = 0; state.p1.dy = -1; }
      if (e.key === 's' && state.p1.dy === 0) { state.p1.dx = 0; state.p1.dy = 1; }
      if (e.key === 'a' && state.p1.dx === 0) { state.p1.dx = -1; state.p1.dy = 0; }
      if (e.key === 'd' && state.p1.dx === 0) { state.p1.dx = 1; state.p1.dy = 0; }

      if (!botEnabled) {
        if (e.key === 'ArrowUp' && state.p2.dy === 0) { state.p2.dx = 0; state.p2.dy = -1; }
        if (e.key === 'ArrowDown' && state.p2.dy === 0) { state.p2.dx = 0; state.p2.dy = 1; }
        if (e.key === 'ArrowLeft' && state.p2.dx === 0) { state.p2.dx = -1; state.p2.dy = 0; }
        if (e.key === 'ArrowRight' && state.p2.dx === 0) { state.p2.dx = 1; state.p2.dy = 0; }
      }
    };
    window.addEventListener('keydown', handleKeyDown);

    /**
     * Bot: calcula la siguiente dirección para P2.
     * Primero intenta moverse hacia la comida; si ese movimiento causa colisión,
     * prueba las otras direcciones en orden hasta encontrar una segura.
     */
    const botThink = () => {
      const head = state.p2.body[0];

      // Todas las posibles direcciones (sin dar marcha atrás)
      const dirs = [
        { dx: 1, dy: 0 },
        { dx: -1, dy: 0 },
        { dx: 0, dy: 1 },
        { dx: 0, dy: -1 },
      ].filter((d) => !(d.dx === -state.p2.dx && d.dy === -state.p2.dy)); // no dar marcha atrás

      // Ordenar: primero las que acercan a la comida
      const scored = dirs.map((d) => {
        const nx = head.x + d.dx;
        const ny = head.y + d.dy;
        const distToFood = Math.abs(nx - state.food.x) + Math.abs(ny - state.food.y);
        return { ...d, nx, ny, distToFood };
      });
      scored.sort((a, b) => a.distToFood - b.distToFood);

      const isSafe = (nx: number, ny: number) => {
        if (nx < 0 || nx >= GRID_W || ny < 0 || ny >= GRID_H) return false;
        for (const seg of state.p1.body) {
          if (seg.x === nx && seg.y === ny) return false;
        }
        for (let i = 1; i < state.p2.body.length; i++) {
          if (state.p2.body[i].x === nx && state.p2.body[i].y === ny) return false;
        }
        return true;
      };

      for (const d of scored) {
        if (isSafe(d.nx, d.ny)) {
          state.p2.dx = d.dx;
          state.p2.dy = d.dy;
          return;
        }
      }
      // Si no hay movimiento seguro: seguir recto (colisión inevitable, el juego termina)
    };

    const checkCollision = (head: { x: number; y: number }) => {
      if (head.x < 0 || head.x >= GRID_W || head.y < 0 || head.y >= GRID_H) return true;
      for (let i = 1; i < state.p1.body.length; i++) {
        if (head.x === state.p1.body[i].x && head.y === state.p1.body[i].y) return true;
      }
      for (let i = 1; i < state.p2.body.length; i++) {
        if (head.x === state.p2.body[i].x && head.y === state.p2.body[i].y) return true;
      }
      return false;
    };

    const update = (time: number) => {
      animationFrameId = requestAnimationFrame(update);
      if (time - lastTime < 100) return; // ~10 fps
      lastTime = time;

      // Bot decide dirección antes de moverse
      if (botEnabled) botThink();

      [state.p1, state.p2].forEach((p) => {
        const head = { x: p.body[0].x + p.dx, y: p.body[0].y + p.dy };
        p.body.unshift(head);

        if (head.x === state.food.x && head.y === state.food.y) {
          state.food = {
            x: Math.floor(Math.random() * GRID_W),
            y: Math.floor(Math.random() * GRID_H),
          };
        } else {
          p.body.pop();
        }
      });

      const p1Dead = checkCollision(state.p1.body[0]);
      const p2Dead = checkCollision(state.p2.body[0]);

      if (p1Dead && p2Dead) { onGameEnd('p1'); return; }
      if (p1Dead) { onGameEnd('p2'); return; }
      if (p2Dead) { onGameEnd('p1'); return; }

      draw();
    };

    const draw = () => {
      ctx.fillStyle = '#1e1e1e';
      ctx.fillRect(0, 0, 800, 400);

      ctx.fillStyle = '#f5b041';
      ctx.fillRect(state.food.x * gridSize, state.food.y * gridSize, gridSize, gridSize);

      [state.p1, state.p2].forEach((p) => {
        ctx.fillStyle = p.color;
        p.body.forEach((segment) => {
          ctx.fillRect(segment.x * gridSize, segment.y * gridSize, gridSize - 1, gridSize - 1);
        });
      });

      if (botEnabled) {
        ctx.font = '12px sans-serif';
        ctx.fillStyle = '#ffffff66';
        ctx.fillText('BOT', 770, 395);
      }
    };

    animationFrameId = requestAnimationFrame(update);

    return () => {
      window.removeEventListener('keydown', handleKeyDown);
      cancelAnimationFrame(animationFrameId);
    };
  }, [onGameEnd, botEnabled]);

  return <canvas ref={canvasRef} width={800} height={400} className="w-full max-w-full rounded-xl" />;
}
