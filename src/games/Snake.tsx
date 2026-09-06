import { useEffect, useRef } from 'react';

export default function Snake({ onGameEnd }: { onGameEnd: (winner: 'p1' | 'p2') => void }) {
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
      p1: { body: [{x: 5, y: 10}], dx: 1, dy: 0, color: '#FF5A5F' },
      p2: { body: [{x: 34, y: 10}], dx: -1, dy: 0, color: '#00A699' },
      food: { x: 20, y: 10 },
    };

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'w' && state.p1.dy === 0) { state.p1.dx = 0; state.p1.dy = -1; }
      if (e.key === 's' && state.p1.dy === 0) { state.p1.dx = 0; state.p1.dy = 1; }
      if (e.key === 'a' && state.p1.dx === 0) { state.p1.dx = -1; state.p1.dy = 0; }
      if (e.key === 'd' && state.p1.dx === 0) { state.p1.dx = 1; state.p1.dy = 0; }
      
      if (e.key === 'ArrowUp' && state.p2.dy === 0) { state.p2.dx = 0; state.p2.dy = -1; }
      if (e.key === 'ArrowDown' && state.p2.dy === 0) { state.p2.dx = 0; state.p2.dy = 1; }
      if (e.key === 'ArrowLeft' && state.p2.dx === 0) { state.p2.dx = -1; state.p2.dy = 0; }
      if (e.key === 'ArrowRight' && state.p2.dx === 0) { state.p2.dx = 1; state.p2.dy = 0; }
    };
    window.addEventListener('keydown', handleKeyDown);

    const update = (time: number) => {
      animationFrameId = requestAnimationFrame(update);
      if (time - lastTime < 100) return; // ~10 fps
      lastTime = time;

      [state.p1, state.p2].forEach(p => {
        const head = { x: p.body[0].x + p.dx, y: p.body[0].y + p.dy };
        p.body.unshift(head);
        
        if (head.x === state.food.x && head.y === state.food.y) {
          state.food = { x: Math.floor(Math.random() * 40), y: Math.floor(Math.random() * 20) };
        } else {
          p.body.pop();
        }
      });

      const checkCollision = (head: {x:number, y:number}) => {
         if (head.x < 0 || head.x >= 40 || head.y < 0 || head.y >= 20) return true;
         for (let i = 1; i < state.p1.body.length; i++) {
           if (head.x === state.p1.body[i].x && head.y === state.p1.body[i].y) return true;
         }
         for (let i = 1; i < state.p2.body.length; i++) {
           if (head.x === state.p2.body[i].x && head.y === state.p2.body[i].y) return true;
         }
         return false;
      };

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

      [state.p1, state.p2].forEach(p => {
        ctx.fillStyle = p.color;
        p.body.forEach(segment => {
          ctx.fillRect(segment.x * gridSize, segment.y * gridSize, gridSize - 1, gridSize - 1);
        });
      });
    };

    animationFrameId = requestAnimationFrame(update);

    return () => {
      window.removeEventListener('keydown', handleKeyDown);
      cancelAnimationFrame(animationFrameId);
    };
  }, [onGameEnd]);

  return <canvas ref={canvasRef} width={800} height={400} className="w-full max-w-full rounded-xl" />;
}
