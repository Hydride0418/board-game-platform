"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.TicTacToe = void 0;
class TicTacToe {
    getInitialState() {
        return {
            board: Array(9).fill(null), // 0-8
            currentPlayer: 'X', // X or O
            players: {} // playerId -> 'X' | 'O'
        };
    }
    processMove(gameState, move, playerId) {
        const { index } = move;
        const { board, currentPlayer, players } = gameState;
        const symbol = players[playerId];
        if (!symbol) {
            throw new Error("You are not a player in this game");
        }
        if (symbol !== currentPlayer) {
            throw new Error("Not your turn");
        }
        if (board[index] !== null) {
            throw new Error("Cell already taken");
        }
        // Apply move
        const newBoard = [...board];
        newBoard[index] = symbol;
        const nextPlayer = currentPlayer === 'X' ? 'O' : 'X';
        const newState = {
            ...gameState,
            board: newBoard,
            currentPlayer: nextPlayer
        };
        const result = this.checkWinCondition(newState);
        return { newState, result };
    }
    checkWinCondition(gameState) {
        const { board } = gameState;
        const lines = [
            [0, 1, 2], [3, 4, 5], [6, 7, 8], // Rows
            [0, 3, 6], [1, 4, 7], [2, 5, 8], // Cols
            [0, 4, 8], [2, 4, 6] // Diagonals
        ];
        for (const [a, b, c] of lines) {
            if (board[a] && board[a] === board[b] && board[a] === board[c]) {
                return { isGameOver: true, winnerId: board[a] }; // Returns 'X' or 'O'
            }
        }
        if (board.every((cell) => cell !== null)) {
            return { isGameOver: true, winnerId: null }; // Draw
        }
        return { isGameOver: false };
    }
}
exports.TicTacToe = TicTacToe;
