"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = __importDefault(require("express"));
const http_1 = require("http");
const socket_io_1 = require("socket.io");
const cors_1 = __importDefault(require("cors"));
const path_1 = __importDefault(require("path"));
const shared_1 = require("@board-game/shared");
const uuid_1 = require("uuid");
const gameRegistry_1 = require("./gameRegistry");
const app = (0, express_1.default)();
app.use((0, cors_1.default)());
// Serve static files from the client build directory
const clientDistPath = path_1.default.resolve(__dirname, '../../client/dist');
app.use(express_1.default.static(clientDistPath));
const httpServer = (0, http_1.createServer)(app);
const io = new socket_io_1.Server(httpServer, {
    cors: {
        origin: "*",
        methods: ["GET", "POST"]
    }
});
const rooms = new Map();
const users = new Map(); // socketId -> User
io.on('connection', (socket) => {
    console.log('User connected:', socket.id);
    socket.on('login', (name) => {
        const user = { id: socket.id, name };
        users.set(socket.id, user);
        socket.emit('login-success', user);
        console.log(`User logged in: ${name}`);
    });
    socket.on('create-room', (gameId) => {
        const user = users.get(socket.id);
        if (!user)
            return;
        const roomId = (0, uuid_1.v4)().slice(0, 6); // Short ID
        const room = {
            id: roomId,
            hostId: user.id,
            players: [user],
            gameType: gameId,
            status: 'waiting'
        };
        rooms.set(roomId, room);
        socket.join(roomId);
        socket.emit('room-created', room);
        console.log(`Room created: ${roomId} by ${user.name}`);
    });
    socket.on('join-room', (roomId) => {
        const user = users.get(socket.id);
        if (!user) {
            socket.emit('error', 'Please login first');
            return;
        }
        const room = rooms.get(roomId);
        if (!room) {
            socket.emit('error', 'Room not found');
            return;
        }
        if (!room.players.find(p => p.id === user.id)) {
            const gameInfo = shared_1.GAMES_LIST.find(g => g.id === room.gameType);
            if (gameInfo && room.players.length >= gameInfo.maxPlayers) {
                socket.emit('error', 'Room is full');
                return;
            }
            room.players.push(user);
        }
        socket.join(roomId);
        io.to(roomId).emit('room-updated', room);
        socket.emit('room-joined', room);
        console.log(`User ${user.name} joined room ${roomId}`);
    });
    socket.on('start-game', (roomId) => {
        const user = users.get(socket.id);
        const room = rooms.get(roomId);
        if (!user || !room)
            return;
        if (room.hostId !== user.id) {
            socket.emit('error', 'Only host can start the game');
            return;
        }
        const gameInfo = shared_1.GAMES_LIST.find(g => g.id === room.gameType);
        if (!gameInfo || room.players.length < gameInfo.minPlayers) {
            socket.emit('error', `Need at least ${gameInfo?.minPlayers} players to start`);
            return;
        }
        const gameLogic = (0, gameRegistry_1.getGameLogic)(room.gameType);
        if (gameLogic) {
            room.status = 'playing';
            room.gameState = gameLogic.getInitialState();
            // Special init for Mahjong (Deal cards)
            if (room.gameType === 'mahjong') {
                // @ts-ignore - We know it's Mahjong class
                room.gameState.hands = gameLogic.dealHands(room.gameState.deck, room.players.map(p => p.id));
            }
            // Assign roles/symbols based on player index
            // This is generic assignment, specific games might need more complex logic
            room.gameState.players = {};
            const symbols = ['X', 'O', 'A', 'B', 'C', 'D']; // Generic symbols
            room.players.forEach((p, index) => {
                room.gameState.players[p.id] = symbols[index % symbols.length];
            });
            io.to(roomId).emit('room-updated', room);
            console.log(`Game manually started in room ${roomId}`);
        }
    });
    socket.on('make-move', ({ roomId, move }) => {
        const user = users.get(socket.id);
        const room = rooms.get(roomId);
        if (!user || !room)
            return;
        const gameLogic = (0, gameRegistry_1.getGameLogic)(room.gameType);
        if (!gameLogic)
            return;
        try {
            const { newState, result } = gameLogic.processMove(room.gameState, move, user.id);
            room.gameState = newState;
            if (result && result.isGameOver) {
                room.status = 'finished';
                io.to(roomId).emit('game-over', result);
            }
            io.to(roomId).emit('room-updated', room);
        }
        catch (e) {
            socket.emit('error', e.message);
        }
    });
    socket.on('disconnect', () => {
        console.log('User disconnected:', socket.id);
        const user = users.get(socket.id);
        if (user) {
            users.delete(socket.id);
        }
    });
});
// Handle SPA routing: serve index.html for any unknown routes
app.get('*', (req, res) => {
    res.sendFile(path_1.default.join(clientDistPath, 'index.html'));
});
const PORT = process.env.PORT || 3000;
httpServer.listen(PORT, () => {
    console.log(`Server running on port ${PORT}`);
});
