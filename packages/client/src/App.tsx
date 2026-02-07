import { useEffect, useState } from 'react';
import { io, Socket } from 'socket.io-client';
import { GAMES_LIST, type User, type Room } from '@board-game/shared';
import { GAME_COMPONENT_REGISTRY } from './gameRegistry';
import { motion, AnimatePresence } from 'framer-motion';
import { twMerge } from 'tailwind-merge';

// Auto-detect server URL: use same origin in production, or localhost:3000 in dev
const socket: Socket = io(import.meta.env.PROD ? window.location.origin : 'http://localhost:3000');

// Reusable UI Components
const Card = ({ children, className }: { children: React.ReactNode, className?: string }) => (
  <motion.div 
    initial={{ opacity: 0, y: 20 }}
    animate={{ opacity: 1, y: 0 }}
    className={twMerge("bg-white/10 backdrop-blur-md border border-white/20 rounded-2xl shadow-xl p-8", className)}
  >
    {children}
  </motion.div>
);

interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
    variant?: 'primary' | 'secondary' | 'danger';
}

const Button = ({ children, className, variant = 'primary', ...props }: ButtonProps) => {
    const baseStyles = "px-6 py-3 rounded-xl font-semibold transition-all duration-200 shadow-lg active:scale-95";
    const variants = {
        primary: "bg-gradient-to-r from-blue-500 to-indigo-600 hover:from-blue-400 hover:to-indigo-500 text-white shadow-blue-500/20",
        secondary: "bg-white/10 hover:bg-white/20 text-white border border-white/10",
        danger: "bg-red-500/80 hover:bg-red-500 text-white"
    };
    return (
        <button className={twMerge(baseStyles, variants[variant], className)} {...props}>
            {children}
        </button>
    );
};

const Input = ({ className, ...props }: React.InputHTMLAttributes<HTMLInputElement>) => (
    <input 
        className={twMerge("w-full px-4 py-3 bg-black/20 border border-white/10 rounded-xl text-white placeholder-white/40 focus:outline-none focus:ring-2 focus:ring-blue-500/50 transition-all", className)}
        {...props}
    />
);

function App() {
  const [user, setUser] = useState<User | null>(null);
  const [room, setRoom] = useState<Room | null>(null);
  const [username, setUsername] = useState('');
  const [roomIdInput, setRoomIdInput] = useState('');
  const [error, setError] = useState('');
  const [gameResult, setGameResult] = useState<any>(null);

  useEffect(() => {
    socket.on('connect', () => {
      console.log('Connected to server');
    });

    socket.on('login-success', (user: User) => {
      setUser(user);
      setError('');
    });

    socket.on('room-created', (newRoom: Room) => {
      setRoom(newRoom);
      setGameResult(null);
    });

    socket.on('room-joined', (joinedRoom: Room) => {
      setRoom(joinedRoom);
      setGameResult(null);
    });

    socket.on('room-updated', (updatedRoom: Room) => {
      setRoom(updatedRoom);
    });

    socket.on('game-over', (result: any) => {
        setGameResult(result);
    });

    socket.on('error', (msg: string) => {
      setError(msg);
      // alert(msg); // Replaced with UI error display
      setTimeout(() => setError(''), 3000);
    });

    return () => {
      socket.off('connect');
      socket.off('login-success');
      socket.off('room-created');
      socket.off('room-joined');
      socket.off('room-updated');
      socket.off('game-over');
      socket.off('error');
    };
  }, []);

  const handleLogin = () => {
    if (username.trim()) {
      socket.emit('login', username);
    }
  };

  const createRoom = (gameId: string) => {
    socket.emit('create-room', gameId);
  };

  const joinRoom = () => {
    if (roomIdInput.trim()) {
      socket.emit('join-room', roomIdInput);
    }
  };

  const makeMove = (move: any) => {
      if (room) {
          socket.emit('make-move', { roomId: room.id, move });
      }
  };

  const startGame = () => {
      if (room) {
          socket.emit('start-game', room.id);
      }
  };

  // Helper to determine if we should use full screen immersive mode (e.g. for Mahjong)
  const isImmersiveGame = room?.gameType === 'mahjong';

  return (
    <div className="min-h-screen flex items-center justify-center p-4 text-white relative overflow-hidden">
      {/* Background blobs */}
      <div className="absolute top-[-10%] left-[-10%] w-[500px] h-[500px] bg-purple-500/30 rounded-full blur-[120px]" />
      <div className="absolute bottom-[-10%] right-[-10%] w-[500px] h-[500px] bg-blue-500/30 rounded-full blur-[120px]" />

      <AnimatePresence mode="wait">
        {!user ? (
          <Card key="login" className="w-full max-w-md">
            <h1 className="text-4xl font-bold text-center mb-8 bg-clip-text text-transparent bg-gradient-to-r from-blue-400 to-purple-400">
              Game Station
            </h1>
            <div className="flex flex-col gap-4">
                <Input 
                  value={username} 
                  onChange={(e: any) => setUsername(e.target.value)} 
                  placeholder="Enter your nickname" 
                  onKeyDown={(e: any) => e.key === 'Enter' && handleLogin()}
                />
                <Button onClick={handleLogin}>Start Playing</Button>
            </div>
          </Card>
        ) : room ? (
            isImmersiveGame ? (
                // Immersive Mode (Full Screen, No Sidebar)
                <motion.div 
                    key="room-immersive"
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    exit={{ opacity: 0 }}
                    className="absolute inset-0 w-full h-full bg-[#1a4731]" // Dark green base for Mahjong
                >
                    {/* Minimal Back Button */}
                    <button 
                        onClick={() => setRoom(null)}
                        className="absolute top-4 left-4 z-50 px-3 py-1 bg-black/40 text-white/60 rounded-full hover:bg-black/60 hover:text-white transition-all text-sm backdrop-blur-md"
                    >
                        ← Exit
                    </button>
                    
                    {(room.status === 'playing' || room.status === 'finished') ? (
                         (() => {
                            const GameComponent = GAME_COMPONENT_REGISTRY[room.gameType];
                            return GameComponent ? (
                                <GameComponent 
                                    gameState={room.gameState} 
                                    onMove={makeMove} 
                                    myPlayerId={user.id}
                                    players={room.players} // Pass full player list for avatars
                                />
                            ) : <div>Game component not found</div>;
                        })()
                    ) : (
                        <div className="flex flex-col items-center justify-center h-full text-center">
                            <h2 className="text-3xl font-serif font-bold text-amber-400 mb-4">等待玩家加入...</h2>
                            <div className="bg-black/20 px-6 py-4 rounded-xl backdrop-blur-sm mb-8">
                                <p className="text-emerald-100/60 text-sm uppercase tracking-widest mb-1">Room ID</p>
                                <p className="text-4xl font-mono text-white tracking-wider">{room.id}</p>
                            </div>
                            
                            <div className="flex gap-4 mb-8">
                                {room.players.map(p => (
                                    <div key={p.id} className="flex flex-col items-center gap-2">
                                        <div className="w-16 h-16 rounded-full bg-gradient-to-b from-amber-200 to-amber-500 p-1 shadow-lg">
                                            <div className="w-full h-full rounded-full bg-[#1a4731] flex items-center justify-center text-xl font-bold border-2 border-amber-900/20">
                                                {p.name.charAt(0).toUpperCase()}
                                            </div>
                                        </div>
                                        <span className="text-sm font-medium text-amber-100">{p.name}</span>
                                    </div>
                                ))}
                            </div>

                            {room.hostId === user.id && (
                                <Button 
                                    onClick={startGame}
                                    className="bg-gradient-to-r from-red-600 to-red-800 text-amber-100 border border-red-400 px-12 py-4 text-xl shadow-[0_0_30px_rgba(220,38,38,0.4)]"
                                >
                                    开始游戏
                                </Button>
                            )}
                        </div>
                    )}
                </motion.div>
            ) : (
          <Card key="room" className="w-full max-w-2xl relative">
             <button 
                onClick={() => setRoom(null)}
                className="absolute top-6 left-6 text-white/50 hover:text-white transition-colors flex items-center gap-2"
             >
                ← Back
             </button>
            <div className="text-center mb-8 mt-4">
                <h1 className="text-3xl font-bold mb-2">Room {room.id}</h1>
                <div className="flex justify-center gap-2 text-sm">
                    <span className="px-3 py-1 rounded-full bg-white/10 border border-white/10">
                        {GAMES_LIST.find(g => g.id === room.gameType)?.name || room.gameType}
                    </span>
                    <span className={twMerge(
                        "px-3 py-1 rounded-full border",
                        room.status === 'playing' ? "bg-green-500/20 border-green-500/30 text-green-300" : "bg-yellow-500/20 border-yellow-500/30 text-yellow-300"
                    )}>
                        {room.status.toUpperCase()}
                    </span>
                </div>
            </div>
            
            <div className="grid md:grid-cols-[1fr_250px] gap-8">
                <div className="flex flex-col items-center justify-center min-h-[300px] bg-black/20 rounded-2xl border border-white/5 p-4">
                    {(room.status === 'playing' || room.status === 'finished') ? (
                        <div className="relative">
                            {(() => {
                                const GameComponent = GAME_COMPONENT_REGISTRY[room.gameType];
                                return GameComponent ? (
                                    <GameComponent 
                                        gameState={room.gameState} 
                                        onMove={makeMove} 
                                        myPlayerId={user.id} 
                                    />
                                ) : (
                                    <div>Game component not found for {room.gameType}</div>
                                );
                            })()}
                            {gameResult && (
                                <motion.div 
                                    initial={{ opacity: 0, scale: 0.8 }}
                                    animate={{ opacity: 1, scale: 1 }}
                                    className="absolute inset-0 z-10 flex items-center justify-center bg-black/60 backdrop-blur-sm rounded-2xl"
                                >
                                    <div className="text-center p-6 bg-[#1e1e2e] border border-white/10 rounded-xl shadow-2xl">
                                        <h2 className="text-2xl font-bold mb-2">
                                            {gameResult.winnerId ? 
                                                (gameResult.winnerId === room.gameState.players[user.id] ? "🎉 You Won!" : "💀 You Lost") 
                                                : "🤝 It's a Draw!"}
                                        </h2>
                                        <Button variant="secondary" onClick={() => setRoom(null)} className="mt-4 text-sm">
                                            Return to Lobby
                                        </Button>
                                    </div>
                                </motion.div>
                            )}
                        </div>
                    ) : (
                        <div className="text-center text-white/50">
                            <div className="text-4xl mb-2">⏳</div>
                            <p className="mb-4">Waiting for players...</p>
                            <p className="text-sm mb-6">Share ID: <span className="text-white font-mono bg-white/10 px-2 py-1 rounded select-all cursor-pointer">{room.id}</span></p>
                            
                            {room.hostId === user.id && (
                                <Button 
                                    onClick={startGame}
                                    className="bg-green-600 hover:bg-green-500 shadow-green-500/20"
                                >
                                    Start Game
                                </Button>
                            )}
                        </div>
                    )}
                </div>

                <div className="bg-white/5 rounded-xl border border-white/10 p-4 h-full">
                    <h3 className="text-sm font-bold text-white/50 uppercase tracking-wider mb-4">Players</h3>
                    <ul className="space-y-3">
                        {room.players.map(p => (
                            <li key={p.id} className="flex items-center gap-3">
                                <div className="w-8 h-8 rounded-full bg-gradient-to-br from-blue-400 to-purple-500 flex items-center justify-center text-xs font-bold shadow-lg">
                                    {p.name.charAt(0).toUpperCase()}
                                </div>
                                <div className="flex-1 min-w-0">
                                    <p className="truncate font-medium text-sm">
                                        {p.name}
                                        {p.id === user.id && <span className="text-white/30 ml-1">(You)</span>}
                                    </p>
                                    {p.id === room.hostId && <p className="text-[10px] text-yellow-500/80">HOST</p>}
                                </div>
                            </li>
                        ))}
                    </ul>
                </div>
            </div>
          </Card>
        )
        ) : (
          <Card key="lobby" className="w-full max-w-4xl">
             <div className="flex justify-between items-center mb-8">
                <h1 className="text-2xl font-bold">Game Lobby</h1>
                <div className="flex items-center gap-3">
                    <div className="w-8 h-8 rounded-full bg-gradient-to-br from-blue-400 to-purple-500 flex items-center justify-center text-xs font-bold">
                        {user.name.charAt(0).toUpperCase()}
                    </div>
                    <span className="font-medium">{user.name}</span>
                </div>
             </div>

             {error && (
                 <motion.div 
                    initial={{ opacity: 0, height: 0 }}
                    animate={{ opacity: 1, height: 'auto' }}
                    className="bg-red-500/20 border border-red-500/50 text-red-200 px-4 py-3 rounded-xl mb-6 text-sm"
                 >
                    {error}
                 </motion.div>
             )}
            
             <div className="grid md:grid-cols-2 gap-8">
                <section>
                    <h3 className="text-sm font-bold text-white/50 uppercase tracking-wider mb-4">Create Room</h3>
                    <div className="grid gap-4">
                        {GAMES_LIST.map(game => (
                            <button 
                                key={game.id} 
                                onClick={() => createRoom(game.id)} 
                                className="group relative overflow-hidden p-6 rounded-2xl bg-gradient-to-br from-white/5 to-white/0 border border-white/10 hover:border-white/30 transition-all text-left"
                            >
                                <div className="absolute inset-0 bg-gradient-to-r from-blue-500/10 to-purple-500/10 opacity-0 group-hover:opacity-100 transition-opacity" />
                                <h4 className="text-lg font-bold mb-1">{game.name}</h4>
                                <p className="text-sm text-white/50">{game.minPlayers}-{game.maxPlayers} Players</p>
                            </button>
                        ))}
                    </div>
                </section>

                <section>
                    <h3 className="text-sm font-bold text-white/50 uppercase tracking-wider mb-4">Join Room</h3>
                    <div className="bg-white/5 rounded-2xl border border-white/10 p-6">
                        <p className="text-sm text-white/70 mb-4">Enter a 6-digit room ID to join your friends.</p>
                        <div className="flex gap-2">
                            <Input 
                                value={roomIdInput} 
                                onChange={(e: any) => setRoomIdInput(e.target.value)} 
                                placeholder="Room ID" 
                                className="font-mono tracking-widest text-center uppercase"
                            />
                            <Button onClick={joinRoom}>Join</Button>
                        </div>
                    </div>
                </section>
             </div>
          </Card>
        )}
      </AnimatePresence>
    </div>
  );
}

export default App;
