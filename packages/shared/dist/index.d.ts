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
    winnerId?: string | null;
    isGameOver: boolean;
}
export interface IGameLogic {
    getInitialState(): any;
    processMove(gameState: any, move: any, playerId: string): {
        newState: any;
        result?: GameResult;
    };
    checkWinCondition(gameState: any): GameResult;
}
export declare const GAMES_LIST: {
    id: string;
    name: string;
    minPlayers: number;
    maxPlayers: number;
}[];
