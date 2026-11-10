export const RANKED_GAME_NAMES: Record<string, string> = {
  pong: 'Paddle Duel',
  snake: 'Aero Rings',
  tetris: 'Slot Car Racing',
  combat: 'Sky Drop',
}

export const rankedGameName = (gameId: string): string => RANKED_GAME_NAMES[gameId] ?? 'ese juego'
