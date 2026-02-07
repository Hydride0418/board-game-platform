import React from 'react';
import { motion } from 'framer-motion';
import { twMerge } from 'tailwind-merge';

interface Props {
    gameState: any;
    onMove: (move: any) => void;
    myPlayerId: string;
}

const TicTacToeBoard: React.FC<Props> = ({ gameState, onMove, myPlayerId }) => {
    if (!gameState) return <div className="text-white/60 animate-pulse">Loading Game State...</div>;

    const { board, currentPlayer, players } = gameState;
    const mySymbol = players ? players[myPlayerId] : null;
    const isMyTurn = currentPlayer === mySymbol;

    const getStatus = () => {
        if (!mySymbol) return "Spectating";
        if (isMyTurn) return `Your Turn (${mySymbol})`;
        return `Opponent's Turn (${mySymbol === 'X' ? 'O' : 'X'})`;
    };

    return (
        <div className="flex flex-col items-center">
            <h3 className="text-3xl font-bold bg-clip-text text-transparent bg-gradient-to-r from-blue-400 to-purple-500 mb-2">
                Tic Tac Toe
            </h3>
            <div className={twMerge(
                "mb-6 px-4 py-2 rounded-full text-sm font-medium backdrop-blur-md border border-white/10",
                isMyTurn ? "bg-green-500/20 text-green-300 border-green-500/30" : "bg-white/5 text-gray-400"
            )}>
                {getStatus()}
            </div>

            <div className="grid grid-cols-3 gap-3 p-3 bg-white/5 rounded-2xl border border-white/10 shadow-2xl backdrop-blur-sm">
                {board.map((cell: string | null, index: number) => (
                    <motion.button 
                        key={index}
                        whileHover={cell === null && isMyTurn ? { scale: 1.05, backgroundColor: "rgba(255,255,255,0.15)" } : {}}
                        whileTap={cell === null && isMyTurn ? { scale: 0.95 } : {}}
                        className={twMerge(
                            "w-24 h-24 flex items-center justify-center text-5xl font-bold rounded-xl transition-colors duration-200",
                            "bg-white/10 border border-white/5 shadow-inner",
                            cell === null && isMyTurn ? "cursor-pointer hover:border-white/20" : "cursor-default opacity-90",
                            cell === 'X' ? "text-blue-400" : "text-pink-400"
                        )}
                        onClick={() => {
                            if (cell === null && isMyTurn) {
                                onMove({ index });
                            }
                        }}
                        disabled={cell !== null || !isMyTurn}
                    >
                        {cell && (
                            <motion.span
                                initial={{ scale: 0, opacity: 0, rotate: -45 }}
                                animate={{ scale: 1, opacity: 1, rotate: 0 }}
                                transition={{ type: "spring", stiffness: 300, damping: 20 }}
                            >
                                {cell}
                            </motion.span>
                        )}
                    </motion.button>
                ))}
            </div>
        </div>
    );
};

export default TicTacToeBoard;
