import TicTacToeBoard from './games/TicTacToeBoard';
import MahjongBoard from './games/MahjongBoard';

// Register new game components here
export const GAME_COMPONENT_REGISTRY: Record<string, React.FC<any>> = {
    'tictactoe': TicTacToeBoard,
    'mahjong': MahjongBoard,
};
