"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.Mahjong = void 0;
// Simplified set of tiles for demo: Dots 1-9 (4 copies each)
const TILES_DOTS = ['🀙', '🀚', '🀛', '🀜', '🀝', '🀞', '🀟', '🀠', '🀡'];
const TILES_BAMBOO = ['🀐', '🀑', '🀒', '🀓', '🀔', '🀕', '🀖', '🀗', '🀘'];
const TILES_CHAR = ['🀇', '🀈', '🀉', '🀊', '🀋', '🀌', '🀍', '🀎', '🀏'];
const TILES_HONORS = ['🀀', '🀁', '🀂', '🀃', '🀄', '🀅', '🀆']; // Winds + Dragons
// Full set: 34 types * 4 = 136 tiles
const FULL_DECK = [
    ...TILES_DOTS,
    ...TILES_BAMBOO,
    ...TILES_CHAR,
    ...TILES_HONORS
].flatMap(t => Array(4).fill(t));
class Mahjong {
    getInitialState() {
        // Shuffle deck
        const deck = [...FULL_DECK].sort(() => Math.random() - 0.5);
        // Deal 13 tiles to each of 4 potential players (max)
        // We will assign hands dynamically based on actual players in the room
        // But for state structure, we prepare for 4 slots.
        const hands = {};
        const discards = [];
        return {
            deck,
            hands, // playerId -> Tile[]
            discards,
            currentPlayerIndex: 0, // Index in the room.players array
            lastDrawnTile: null, // Tile just drawn by current player
            phase: 'draw', // 'draw' or 'discard'
            players: {} // playerId -> seatIndex (0-3)
        };
    }
    processMove(gameState, move, playerId) {
        // Initialize hands if first move (hacky but works for dynamic player binding)
        // Or better: The game engine should have initialized players mapping. 
        // We assume gameState.players is populated by the server wrapper or we do it lazily.
        // Actually, we need to know the player order. 
        // Let's assume the wrapper passed the player IDs or we infer from keys.
        // For simplicity, we rely on `currentPlayerIndex` which corresponds to `Object.keys(gameState.players)` sorted or something.
        // Let's stick to the server logic: Room has `players` array.
        // We need to store `turnOrder` in gameState.
        if (!gameState.turnOrder) {
            // First time setup
            gameState.turnOrder = [playerId]; // This is wrong, we need all players.
            // Wait, getInitialState doesn't know about players.
            // We'll rely on the fact that the first "move" might be a system init or we handle it in `processMove` validation.
            // But actually, `processMove` is called by a specific player.
        }
        // To make this robust, we need to inject player IDs into state at start. 
        // Since `getInitialState` is parameterless, we'll do a lazy init check.
        if (!gameState.hands[playerId]) {
            // Lazy init for this player? No, that's bad for turn order.
            // Let's assume the server wrapper (index.ts) injected `players` map into gameState
            // BUT index.ts only does: room.gameState = gameLogic.getInitialState();
            // So we need to handle "Start Game" event in index.ts better to pass players, OR we handle it here.
            // Workaround: We will use the `players` map we added in index.ts:
            // room.gameState.players = { [id]: 'A', ... }
            // We can use the keys of this map as the turn order.
        }
        const playerIds = Object.keys(gameState.players);
        const currentIndex = gameState.currentPlayerIndex;
        const currentTurnPlayerId = playerIds[currentIndex];
        // 1. Check if it's this player's turn
        if (playerId !== currentTurnPlayerId) {
            throw new Error("Not your turn");
        }
        const { action, tileIndex } = move;
        // Phase 1: Draw (Auto or Manual)
        // Ideally, draw happens automatically at start of turn.
        // But to keep it simple, let's say the first action of a turn must be 'draw', 
        // OR we auto-draw when previous player discards.
        // Let's go with: Player clicks "Draw" (or auto) -> state updates -> Player clicks "Discard".
        if (action === 'draw') {
            if (gameState.phase !== 'draw')
                throw new Error("Already drawn, please discard");
            const tile = gameState.deck.pop();
            if (!tile)
                return { newState: gameState, result: { isGameOver: true, winnerId: null } }; // Wall empty = Draw
            gameState.hands[playerId] = gameState.hands[playerId] || [];
            gameState.hands[playerId].push(tile);
            gameState.lastDrawnTile = tile;
            gameState.phase = 'discard';
            return { newState: gameState };
        }
        if (action === 'discard') {
            if (gameState.phase !== 'discard')
                throw new Error("Please draw a tile first");
            const hand = gameState.hands[playerId];
            if (!hand || !hand[tileIndex])
                throw new Error("Invalid tile");
            const discardedTile = hand.splice(tileIndex, 1)[0];
            gameState.discards.push(discardedTile);
            // Check Win (Very basic: 4 triplets/sequences + 1 pair) - Skipping for this simple demo
            // const isWin = this.checkWin(hand);
            // Advance turn
            gameState.currentPlayerIndex = (currentIndex + 1) % playerIds.length;
            gameState.phase = 'draw'; // Next player needs to draw
            return { newState: gameState };
        }
        if (action === 'reorder') {
            const { newHand } = move;
            if (!Array.isArray(newHand))
                throw new Error("Invalid hand");
            // Validate that newHand is a permutation of the current hand
            const currentHand = gameState.hands[playerId] || [];
            if (newHand.length !== currentHand.length)
                throw new Error("Hand length mismatch");
            const sortStr = (arr) => [...arr].sort().join('');
            if (sortStr(newHand) !== sortStr(currentHand)) {
                throw new Error("Invalid reorder: tiles do not match");
            }
            gameState.hands[playerId] = newHand;
            return { newState: gameState };
        }
        throw new Error("Unknown action");
    }
    checkWinCondition(gameState) {
        if (gameState.deck.length === 0) {
            return { isGameOver: true, winnerId: null };
        }
        return { isGameOver: false };
    }
    // Helper to deal initial hands (called from server index.ts if possible, or lazy)
    // We'll modify getInitialState to be "empty" and let the first interaction or a setup phase deal cards?
    // No, standard is deal at start.
    // We'll add a helper `dealHands` that we can call from the server wrapper.
    dealHands(deck, playerIds) {
        const hands = {};
        playerIds.forEach(id => {
            hands[id] = [];
            for (let i = 0; i < 13; i++) {
                hands[id].push(deck.pop());
            }
            hands[id].sort();
        });
        return hands;
    }
}
exports.Mahjong = Mahjong;
