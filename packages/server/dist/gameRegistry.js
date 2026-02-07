"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.getGameLogic = exports.GAME_REGISTRY = void 0;
const tictactoe_1 = require("./games/tictactoe");
const mahjong_1 = require("./games/mahjong");
// Register new games here
exports.GAME_REGISTRY = {
    'tictactoe': tictactoe_1.TicTacToe,
    'mahjong': mahjong_1.Mahjong,
};
const getGameLogic = (gameType) => {
    const GameClass = exports.GAME_REGISTRY[gameType];
    return GameClass ? new GameClass() : null;
};
exports.getGameLogic = getGameLogic;
