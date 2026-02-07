
export interface User {
  id: string;
  name: string;
}

export interface Room {
  id: string;
  hostId: string;
  players: User[];
  gameType: string;
  status: 'waiting' | 'playing' | 'finished';
  gameState?: any;
}

export interface GameResult {
    winnerId?: string | null; // null for draw
    isGameOver: boolean;
}

export interface IGameLogic {
  getInitialState(): any;
  // returns new state if valid, throws error or returns null if invalid
  processMove(gameState: any, move: any, playerId: string): { newState: any; result?: GameResult }; 
  checkWinCondition(gameState: any): GameResult;
}

export const GAMES_LIST = [
    { id: 'tictactoe', name: 'Tic Tac Toe', minPlayers: 2, maxPlayers: 2 },
    { id: 'mahjong', name: 'Mahjong (Simplified)', minPlayers: 2, maxPlayers: 4 }
];
