import { useEffect, useRef } from 'react';

export default function Tetris({
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

    const COLS = 10;
    const ROWS = 20;
    const BLOCK_SIZE = 20;

    const createGrid = () => Array.from({ length: ROWS }, () => Array(COLS).fill(0));

    const state = {
      p1: { grid: createGrid(), x: 4, y: 0, color: '#FF5A5F', dropTimer: 0 },
      p2: { grid: createGrid(), x: 4, y: 0, color: '#00A699', dropTimer: 0 },
      /** Temporizador del bot: cuántos frames hasta el próximo movimiento lateral. */
      botMoveTimer: 0,
      /** Columna objetivo del bot para el bloque actual. */
      botTargetX: 4,
    };

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'a' && state.p1.x > 0) state.p1.x--;
      if (e.key === 'd' && state.p1.x < COLS - 1) state.p1.x++;
      if (e.key === 'w' || e.key === 's') state.p1.dropTimer += 1000;

      if (!botEnabled) {
        if (e.key === 'ArrowLeft' && state.p2.x > 0) state.p2.x--;
        if (e.key === 'ArrowRight' && state.p2.x < COLS - 1) state.p2.x++;
        if (e.key === 'ArrowUp' || e.key === 'ArrowDown') state.p2.dropTimer += 1000;
      }
    };
    window.addEventListener('keydown', handleKeyDown);

    /** Bot: elige una nueva columna objetivo cuando la pieza se resetea. */
    const pickBotTarget = () => {
      state.botTargetX = Math.floor(Math.random() * COLS);
    };

    const checkCollision = (grid: number[][], x: number, y: number) => {
      if (y >= ROWS) return true;
      if (y >= 0 && grid[y][x] !== 0) return true;
      return false;
    };

    const update = (time: number) => {
      animationFrameId = requestAnimationFrame(update);
      const deltaTime = time - lastTime;
      lastTime = time;

      let gameOver = false;

      // — Bot: mover P2 hacia la columna objetivo —
      if (botEnabled) {
        state.botMoveTimer += deltaTime;
        if (state.botMoveTimer > 200) {
          state.botMoveTimer = 0;
          if (state.p2.x < state.botTargetX && state.p2.x < COLS - 1) state.p2.x++;
          else if (state.p2.x > state.botTargetX && state.p2.x > 0) state.p2.x--;
        }
      }

      [state.p1, state.p2].forEach((p, idx) => {
        p.dropTimer += deltaTime;
        if (p.dropTimer > 400) {
          p.dropTimer = 0;
          if (!checkCollision(p.grid, p.x, p.y + 1)) {
            p.y++;
          } else {
            if (p.y === 0) {
              onGameEnd(idx === 0 ? 'p2' : 'p1');
              gameOver = true;
              return;
            }
            p.grid[p.y][p.x] = 1;
            p.y = 0;
            p.x = 4;

            // Bot elige nueva columna objetivo al aparecer nueva pieza
            if (botEnabled && idx === 1) pickBotTarget();

            for (let r = ROWS - 1; r >= 0; r--) {
              if (p.grid[r].every((c) => c !== 0)) {
                p.grid.splice(r, 1);
                p.grid.unshift(Array(COLS).fill(0));
                r++;
              }
            }
          }
        }
      });

      if (!gameOver) draw();
    };

    const drawGrid = (
      grid: number[][],
      offsetX: number,
      color: string,
      activeX: number,
      activeY: number,
    ) => {
      ctx.strokeStyle = '#333';
      for (let r = 0; r < ROWS; r++) {
        for (let c = 0; c < COLS; c++) {
          if (grid[r][c]) {
            ctx.fillStyle = '#888';
            ctx.fillRect(offsetX + c * BLOCK_SIZE, r * BLOCK_SIZE, BLOCK_SIZE, BLOCK_SIZE);
          }
          ctx.strokeRect(offsetX + c * BLOCK_SIZE, r * BLOCK_SIZE, BLOCK_SIZE, BLOCK_SIZE);
        }
      }
      ctx.fillStyle = color;
      ctx.fillRect(offsetX + activeX * BLOCK_SIZE, activeY * BLOCK_SIZE, BLOCK_SIZE, BLOCK_SIZE);
    };

    const draw = () => {
      ctx.fillStyle = '#1e1e1e';
      ctx.fillRect(0, 0, 800, 400);

      drawGrid(state.p1.grid, 200, state.p1.color, state.p1.x, state.p1.y);
      drawGrid(state.p2.grid, 400, state.p2.color, state.p2.x, state.p2.y);

      ctx.fillStyle = '#333';
      ctx.fillRect(398, 0, 4, 400);

      if (botEnabled) {
        ctx.font = '12px sans-serif';
        ctx.fillStyle = '#ffffff66';
        ctx.fillText('BOT', 570, 395);
      }
    };

    // Elegir primera columna objetivo del bot
    pickBotTarget();

    animationFrameId = requestAnimationFrame(update);
    return () => {
      window.removeEventListener('keydown', handleKeyDown);
      cancelAnimationFrame(animationFrameId);
    };
  }, [onGameEnd, botEnabled]);

  return <canvas ref={canvasRef} width={800} height={400} className="w-full max-w-full rounded-xl" />;
}
