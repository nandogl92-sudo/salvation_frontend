import { useEffect, useRef } from 'react';

export default function Pong({ onGameEnd }: { onGameEnd: (winner: 'p1' | 'p2') => void }) {
  const canvasRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    let animationFrameId: number;
    
    const state = {
      p1: { y: 150, score: 0 },
      p2: { y: 150, score: 0 },
      ball: { x: 400, y: 200, vx: 5, vy: 5 },
      keys: {} as Record<string, boolean>
    };

    const handleKeyDown = (e: KeyboardEvent) => { state.keys[e.key] = true; };
    const handleKeyUp = (e: KeyboardEvent) => { state.keys[e.key] = false; };
    window.addEventListener('keydown', handleKeyDown);
    window.addEventListener('keyup', handleKeyUp);

    const resetBall = () => {
      state.ball = { x: 400, y: 200, vx: (Math.random() > 0.5 ? 5 : -5), vy: (Math.random() > 0.5 ? 5 : -5) };
    };

    const update = () => {
      // Move P1
      if (state.keys['w'] || state.keys['W']) state.p1.y = Math.max(0, state.p1.y - 7);
      if (state.keys['s'] || state.keys['S']) state.p1.y = Math.min(300, state.p1.y + 7);
      // Move P2
      if (state.keys['ArrowUp']) state.p2.y = Math.max(0, state.p2.y - 7);
      if (state.keys['ArrowDown']) state.p2.y = Math.min(300, state.p2.y + 7);

      // Ball physics
      state.ball.x += state.ball.vx;
      state.ball.y += state.ball.vy;

      if (state.ball.y <= 0 || state.ball.y >= 390) state.ball.vy *= -1;

      // Paddle collision
      if (state.ball.x <= 30 && state.ball.y >= state.p1.y && state.ball.y <= state.p1.y + 100) {
        state.ball.vx *= -1.1;
        state.ball.x = 30;
      }
      if (state.ball.x >= 760 && state.ball.y >= state.p2.y && state.ball.y <= state.p2.y + 100) {
        state.ball.vx *= -1.1;
        state.ball.x = 760;
      }

      // Scoring
      if (state.ball.x < 0) { state.p2.score++; resetBall(); }
      if (state.ball.x > 800) { state.p1.score++; resetBall(); }

      if (state.p1.score >= 10) { onGameEnd('p1'); return; }
      if (state.p2.score >= 10) { onGameEnd('p2'); return; }

      draw();
      animationFrameId = requestAnimationFrame(update);
    };

    const draw = () => {
      ctx.fillStyle = '#1e1e1e';
      ctx.fillRect(0, 0, 800, 400);
      
      ctx.fillStyle = '#FF5A5F'; // P1 (Local)
      ctx.fillRect(10, state.p1.y, 20, 100);
      
      ctx.fillStyle = '#00A699'; // P2 (Rival)
      ctx.fillRect(770, state.p2.y, 20, 100);
      
      ctx.fillStyle = '#ffffff';
      ctx.beginPath();
      ctx.arc(state.ball.x, state.ball.y, 10, 0, Math.PI * 2);
      ctx.fill();

      ctx.font = '30px sans-serif';
      ctx.fillText(state.p1.score.toString(), 200, 50);
      ctx.fillText(state.p2.score.toString(), 600, 50);
      
      ctx.setLineDash([5, 15]);
      ctx.beginPath();
      ctx.moveTo(400, 0);
      ctx.lineTo(400, 400);
      ctx.strokeStyle = '#ffffff55';
      ctx.stroke();
    };

    animationFrameId = requestAnimationFrame(update);

    return () => {
      window.removeEventListener('keydown', handleKeyDown);
      window.removeEventListener('keyup', handleKeyUp);
      cancelAnimationFrame(animationFrameId);
    };
  }, [onGameEnd]);

  return <canvas ref={canvasRef} width={800} height={400} className="w-full max-w-full rounded-xl" />;
}
