import React, { useState } from 'react';
import { motion, Reorder } from 'framer-motion';
import { twMerge } from 'tailwind-merge';
import type { User } from '@board-game/shared';

interface Props {
    gameState: any;
    onMove: (move: any) => void;
    myPlayerId: string;
    players: User[]; // Full player info for avatars
}

const getTileImage = (tileChar: string) => {
    const code = tileChar.codePointAt(0);
    if (!code) return '';

    // Man (Characters): 1F007 - 1F00F (Man1 - Man9)
    if (code >= 0x1F007 && code <= 0x1F00F) return `/mahjong/Man${code - 0x1F007 + 1}.svg`;
    
    // Sou (Bamboo): 1F010 - 1F018 (Sou1 - Sou9)
    if (code >= 0x1F010 && code <= 0x1F018) return `/mahjong/Sou${code - 0x1F010 + 1}.svg`;
    
    // Pin (Dots): 1F019 - 1F021 (Pin1 - Pin9)
    if (code >= 0x1F019 && code <= 0x1F021) return `/mahjong/Pin${code - 0x1F019 + 1}.svg`;
    
    // Winds: East, South, West, North (1F000 - 1F003) -> Ton, Nan, Shaa, Pei
    const winds = ['Ton', 'Nan', 'Shaa', 'Pei'];
    if (code >= 0x1F000 && code <= 0x1F003) return `/mahjong/${winds[code - 0x1F000]}.svg`;
    
    // Dragons: Red, Green, White (1F004 - 1F006) -> Chun, Hatsu, Haku
    const dragons = ['Chun', 'Hatsu', 'Haku'];
    if (code >= 0x1F004 && code <= 0x1F006) return `/mahjong/${dragons[code - 0x1F004]}.svg`;

    return '';
};

const DraggableHand: React.FC<{
    hand: string[];
    onReorder: (newHand: string[]) => void;
    onDiscard: (index: number) => void;
    canDiscard: boolean;
}> = ({ hand, onReorder, onDiscard, canDiscard }) => {
    // Initialize state ONCE. Parent uses key to force re-init.
    const [localHand, setLocalHand] = useState(() => hand.map((tile, index) => ({
        id: `tile-${index}-${tile}-${Date.now()}-${Math.random()}`,
        tile
    })));
    const [selectedId, setSelectedId] = useState<string | null>(null);

    const handleReorder = (newOrder: {id: string, tile: string}[]) => {
        setLocalHand(newOrder);
    };

    const handleDragEnd = () => {
        const newHandTiles = localHand.map(t => t.tile);
        onReorder(newHandTiles);
    };

    const handleTileClick = (id: string) => {
        if (!canDiscard) return;
        
        if (selectedId === id) {
            // Already selected, confirm discard? Or toggle off?
            // Let's toggle off if clicked again, but we will have a separate button for confirm.
            // Actually, if we want a confirm button, clicking the tile should just select it.
            // Clicking again could cancel, or do nothing. Let's make it toggle.
            setSelectedId(null);
        } else {
            setSelectedId(id);
        }
    };

    const handleConfirmDiscard = (e: React.MouseEvent, index: number) => {
        e.stopPropagation(); // Prevent triggering tile click
        onDiscard(index);
        setSelectedId(null);
    };

    return (
         <Reorder.Group 
            axis="x" 
            values={localHand} 
            onReorder={handleReorder} 
            className="flex gap-1 md:gap-2 items-end min-w-max px-4 list-none"
            onClick={() => setSelectedId(null)} // Click background to deselect
         >
            {localHand.map((item, index) => {
                const isSelected = selectedId === item.id;
                return (
                <Reorder.Item
                    key={item.id}
                    value={item}
                    onDragEnd={handleDragEnd}
                    initial={{ y: 100, opacity: 0 }}
                    animate={{ 
                        y: isSelected ? -20 : 0, 
                        opacity: 1,
                        zIndex: isSelected ? 100 : 0 
                    }}
                    // Remove whileHover y change to fix jitter. Only scale.
                    whileHover={canDiscard ? { scale: 1.05, zIndex: 50 } : {}}
                    className={twMerge(
                        "relative w-12 h-16 md:w-16 md:h-24 flex-shrink-0 bg-gradient-to-b from-[#fdf6e3] to-[#e6d5b8] text-slate-900 rounded-md flex items-center justify-center shadow-[2px_2px_5px_rgba(0,0,0,0.5)] border border-[#d6c4a8] select-none touch-none transition-shadow",
                        "after:content-[''] after:absolute after:bottom-[-6px] after:left-[-3px] after:right-[-3px] after:h-3 after:bg-[#155e37] after:rounded-b-md after:z-[-1]",
                        canDiscard 
                            ? "cursor-pointer hover:ring-2 hover:ring-amber-400" 
                            : "cursor-grab active:cursor-grabbing opacity-100",
                        isSelected && "ring-4 ring-red-500 shadow-[0_0_15px_rgba(239,68,68,0.5)]"
                    )}
                    onClick={(e) => {
                        e.stopPropagation();
                        handleTileClick(item.id);
                    }}
                    dragListener={true}
                >
                    <img src={getTileImage(item.tile)} alt={item.tile} className="w-full h-full object-contain p-0.5 pointer-events-none" />
                    
                    {/* Discard Confirmation Button */}
                    {isSelected && canDiscard && (
                        <motion.button
                            initial={{ opacity: 0, scale: 0.8, y: 10 }}
                            animate={{ opacity: 1, scale: 1, y: 0 }}
                            exit={{ opacity: 0, scale: 0.8 }}
                            className="absolute -top-12 left-1/2 -translate-x-1/2 bg-red-600 text-white text-xs font-bold px-3 py-1.5 rounded-full shadow-lg border border-red-400 whitespace-nowrap z-[100] hover:bg-red-700 active:scale-95 flex items-center gap-1"
                            onClick={(e) => handleConfirmDiscard(e, index)}
                        >
                            <span>出牌</span>
                        </motion.button>
                    )}
                </Reorder.Item>
            )})}
        </Reorder.Group>
    );
};

const MahjongBoard: React.FC<Props> = ({ gameState, onMove, myPlayerId, players }) => {
    const hands = gameState?.hands || {};
    const discards = gameState?.discards || [];
    const currentPlayerIndex = gameState?.currentPlayerIndex ?? 0;
    const phase = gameState?.phase || '';
    const playerIds = gameState?.players ? Object.keys(gameState.players) : [];
    
    // Identify My Hand and Turn
    const myHand = hands[myPlayerId] || [];
    const isMyTurn = playerIds[currentPlayerIndex] === myPlayerId;
    const canDraw = isMyTurn && phase === 'draw';
    const canDiscard = isMyTurn && phase === 'discard';

    // Helper to get user info by ID
    const getUser = (id: string) => players.find(p => p.id === id);

    if (!gameState) return <div className="text-amber-200 text-center mt-20">正在加载牌局...</div>;

    // Render other players (avatars)
    const renderOtherPlayers = () => {

        // Simple logic: filter out myself
        const others = playerIds.filter(id => id !== myPlayerId);
        
        // Positions for 2-4 players (Top, Left, Right)
        // This is a simplified static mapping. For 4 players: Right, Top, Left relative to Me.
        const positions = [
            "top-1/2 -translate-y-1/2 right-4 flex-col", // Right
            "top-4 left-1/2 -translate-x-1/2 flex-row", // Top
            "top-1/2 -translate-y-1/2 left-4 flex-col", // Left
        ];

        return others.map((id, index) => {
            const user = getUser(id);
            const isTurn = playerIds[currentPlayerIndex] === id;
            const posClass = positions[index % positions.length]; // Fallback for >4 players?

            return (
                <div key={id} className={twMerge("absolute flex items-center gap-3", posClass)}>
                     {/* Avatar */}
                    <div className={twMerge(
                        "w-12 h-12 rounded-full border-2 flex items-center justify-center bg-[#1e2e26] shadow-lg relative",
                        isTurn ? "border-red-500 shadow-[0_0_15px_rgba(239,68,68,0.6)] scale-110 transition-all" : "border-amber-700/50"
                    )}>
                        <span className="text-amber-100 font-bold text-lg">{user?.name.charAt(0).toUpperCase()}</span>
                        {/* Name Label */}
                        <div className="absolute -bottom-6 bg-black/60 px-2 py-0.5 rounded text-[10px] text-white whitespace-nowrap">
                            {user?.name}
                        </div>
                    </div>
                    {/* Fake Hand Backs (Vertical or Horizontal) */}
                    <div className={twMerge("flex gap-0.5 opacity-80", posClass.includes('col') ? "flex-col" : "flex-row")}>
                         {/* Just show a few tile backs to represent hand */}
                         {Array(13).fill(0).map((_, i) => (
                             <div key={i} className={twMerge(
                                 "bg-[#155e37] border border-[#0f4025] rounded-sm shadow-sm",
                                 posClass.includes('col') ? "w-6 h-4" : "w-4 h-6"
                             )} />
                         ))}
                    </div>
                </div>
            );
        });
    };

    return (
        <div className="w-full h-full relative flex flex-col items-center justify-center overflow-hidden">
            {/* Table Texture Background Overlay */}
            <div className="absolute inset-0 bg-[radial-gradient(#1a4731_1px,transparent_1px)] [background-size:16px_16px] opacity-20 pointer-events-none" />

            {/* Other Players */}
            {renderOtherPlayers()}

            {/* Center Area: Discards & Status */}
            <div className="relative z-10 flex flex-col items-center justify-center mb-20 md:mb-0">
                
                {/* Status Text Overlay */}
                 <div className="mb-4 text-center">
                    <h3 className="text-2xl font-serif font-bold text-amber-500/80 tracking-widest drop-shadow-md opacity-50 select-none pointer-events-none" style={{ fontFamily: '"Noto Serif SC", serif' }}>
                        雀神争霸
                    </h3>
                    <div className={twMerge(
                        "mt-2 px-4 py-1 rounded-full text-xs font-bold border transition-all duration-300 inline-block",
                        isMyTurn 
                            ? "bg-red-900/90 text-amber-100 border-amber-500/50 shadow-lg animate-pulse" 
                            : "bg-black/20 text-emerald-200/50 border-emerald-900/20"
                    )}>
                        {isMyTurn ? (phase === 'draw' ? "请摸牌" : "请出牌") : `等待 ${getUser(playerIds[currentPlayerIndex])?.name} 行动...`}
                    </div>
                </div>

                {/* Discard Pile */}
                <div className="w-[300px] md:w-[500px] min-h-[200px] bg-[#0f2e1f]/40 backdrop-blur-sm rounded-xl p-4 border border-[#2d5e40]/30 flex flex-wrap gap-1 justify-center content-center shadow-inner">
                    {discards.length === 0 && <span className="text-emerald-800/30 font-serif text-4xl select-none">牌河</span>}
                    {discards.map((tile: string, i: number) => (
                        <motion.div 
                            key={i}
                            initial={{ scale: 0, opacity: 0 }}
                            animate={{ scale: 1, opacity: 1 }}
                            className="w-8 h-10 md:w-9 md:h-12 bg-[#e8dbc5] rounded-sm flex items-center justify-center shadow-md border border-[#d6c4a8] overflow-hidden"
                        >
                            <img src={getTileImage(tile)} alt={tile} className="w-full h-full object-contain p-[2px]" />
                        </motion.div>
                    ))}
                </div>
            </div>

            {/* Action Buttons (Floating) */}
            <div className="absolute bottom-[140px] z-20 pointer-events-none w-full flex justify-center">
                {canDraw && (
                    <motion.button
                        initial={{ scale: 0.9, opacity: 0, y: 20 }}
                        animate={{ scale: 1, opacity: 1, y: 0 }}
                        whileHover={{ scale: 1.1 }}
                        whileTap={{ scale: 0.95 }}
                        className="pointer-events-auto px-8 py-3 bg-gradient-to-b from-red-600 to-red-800 text-amber-100 font-bold rounded-full shadow-[0_4px_0_#7f1d1d,0_10px_20px_rgba(0,0,0,0.5)] border border-red-400 text-lg tracking-widest flex items-center gap-2 hover:brightness-110 active:shadow-none active:translate-y-1"
                        onClick={() => onMove({ action: 'draw' })}
                    >
                        <span className="text-2xl">🀄</span> 摸牌
                    </motion.button>
                )}
            </div>

            {/* My Hand (Fixed Bottom Bar) */}
            <div className="absolute bottom-0 left-0 right-0 h-[120px] md:h-[140px] bg-[#3d2b1f] border-t-8 border-[#5c4033] shadow-[0_-10px_40px_rgba(0,0,0,0.6)] flex justify-center items-end pb-4 z-50">
                {/* Wood Texture */}
                <div className="absolute inset-0 opacity-30 bg-[url('https://www.transparenttextures.com/patterns/wood-pattern.png')]" />
                
                {/* Scrollable Container */}
                <div className="w-full overflow-x-auto px-4 flex justify-center no-scrollbar">
                     <DraggableHand 
                        key={JSON.stringify(myHand)} // Force reset when hand content changes
                        hand={myHand}
                        canDiscard={canDiscard}
                        onDiscard={(index) => onMove({ action: 'discard', tileIndex: index })}
                        onReorder={(newHand) => {
                             if (JSON.stringify(newHand) !== JSON.stringify(myHand)) {
                                 onMove({ action: 'reorder', newHand });
                             }
                        }}
                     />
                </div>
            </div>
        </div>
    );
};

export default MahjongBoard;
