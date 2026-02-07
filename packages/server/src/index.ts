import express from 'express';
import { createServer } from 'http';
import { Server } from 'socket.io';
import cors from 'cors';
import path from 'path';
import { Room, User, GAMES_LIST } from '@board-game/shared';
import { v4 as uuidv4 } from 'uuid';
import { getGameLogic } from './gameRegistry';

const app = express();
app.use(cors());

// Serve static files from the client build directory
const clientDistPath = path.resolve(__dirname, '../../client/dist');
app.use(express.static(clientDistPath));

const httpServer = createServer(app);
const io = new Server(httpServer, {
  cors: {
    origin: "*",
    methods: ["GET", "POST"]
  }
});

const rooms: Map<string, Room> = new Map();
const users: Map<string, User> = new Map(); // socketId -> User

io.on('connection', (socket) => {
  console.log('User connected:', socket.id);

  socket.on('login', (name: string) => {
      const user: User = { id: socket.id, name };
      users.set(socket.id, user);
      socket.emit('login-success', user);
      console.log(`User logged in: ${name}`);
  });

  socket.on('create-room', (gameId: string) => {
      const user = users.get(socket.id);
      if (!user) return;

      const roomId = uuidv4().slice(0, 6); // Short ID
      const room: Room = {
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

  socket.on('join-room', (roomId: string) => {
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
           const gameInfo = GAMES_LIST.find(g => g.id === room.gameType);
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

  socket.on('start-game', (roomId: string) => {
      const user = users.get(socket.id);
      const room = rooms.get(roomId);
      if (!user || !room) return;

      if (room.hostId !== user.id) {
          socket.emit('error', 'Only host can start the game');
          return;
      }

      const gameInfo = GAMES_LIST.find(g => g.id === room.gameType);
      if (!gameInfo || room.players.length < gameInfo.minPlayers) {
          socket.emit('error', `Need at least ${gameInfo?.minPlayers} players to start`);
          return;
      }

      const gameLogic = getGameLogic(room.gameType);
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

  socket.on('make-move', ({ roomId, move }: { roomId: string, move: any }) => {
      const user = users.get(socket.id);
      const room = rooms.get(roomId);
      if (!user || !room) return;
      
      const gameLogic = getGameLogic(room.gameType);
      if (!gameLogic) return;

      try {
          const { newState, result } = gameLogic.processMove(room.gameState, move, user.id);
          room.gameState = newState;
          
          if (result && result.isGameOver) {
              room.status = 'finished';
              io.to(roomId).emit('game-over', result);
          }
          
          io.to(roomId).emit('room-updated', room);
      } catch (e: any) {
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
  res.sendFile(path.join(clientDistPath, 'index.html'));
});

const PORT = process.env.PORT || 3000;
httpServer.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});
