import { TicTacToe } from './games/tictactoe';
import { Mahjong } from './games/mahjong';
import { IGameLogic } from '@board-game/shared';

// Register new games here
export const GAME_REGISTRY: Record<string, new () => IGameLogic> = {
    'tictactoe': TicTacToe,
    'mahjong': Mahjong,
};

export const getGameLogic = (gameType: string): IGameLogic | null => {
    const GameClass = GAME_REGISTRY[gameType];
    return GameClass ? new GameClass() : null;
};
