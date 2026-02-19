
import React, { useState } from 'react';
import { Heart, MessageCircle, Share } from 'lucide-react';

interface InteractionBarProps {
    initialLikes?: number;
    initialComments?: number;
    initialShares?: number;
    onShare?: () => void;
    className?: string;
    iconSize?: number;
}

export const InteractionBar: React.FC<InteractionBarProps> = ({ 
    initialLikes = 0, 
    initialComments = 0, 
    initialShares = 0,
    onShare,
    className = "",
    iconSize = 16 
}) => {
    const [liked, setLiked] = useState(false);
    const [likes, setLikes] = useState(initialLikes);

    const formatCount = (num: number): string => {
        if (num >= 1000000) return (num / 1000000).toFixed(1).replace(/\.0$/, '') + 'M';
        if (num >= 1000) return (num / 1000).toFixed(1).replace(/\.0$/, '') + 'K';
        return num.toString();
    };

    const handleLike = (e: React.MouseEvent) => {
        e.stopPropagation();
        if (liked) {
            setLikes(l => l - 1);
        } else {
            setLikes(l => l + 1);
        }
        setLiked(!liked);
    };

    const handleShareClick = (e: React.MouseEvent) => {
        e.preventDefault();
        e.stopPropagation();
        if (onShare) {
            onShare();
        }
    };

    return (
        <div className={`flex items-center justify-center gap-12 w-full ${className}`}>
            {/* Like Button */}
            <button 
                onClick={handleLike} 
                className="flex flex-col items-center group transition-transform active:scale-95 p-2 rounded-full hover:bg-white/5"
            >
                <div className={`transition-all ${liked ? 'text-[rgb(255_117_93)] scale-110' : 'text-white group-hover:text-gray-200'}`}>
                    <Heart size={iconSize} fill={liked ? "currentColor" : "none"} strokeWidth={1.5} />
                </div>
                <span className="text-white font-medium text-[9px] drop-shadow-sm leading-tight mt-0.5">{formatCount(likes)}</span>
            </button>

            {/* Comment Button */}
            <button className="flex flex-col items-center group transition-transform active:scale-95 p-2 rounded-full hover:bg-white/5">
                <div className="text-white group-hover:text-gray-200 transition-all">
                    <MessageCircle size={iconSize} strokeWidth={1.5} />
                </div>
                <span className="text-white font-medium text-[9px] drop-shadow-sm leading-tight mt-0.5">{formatCount(initialComments)}</span>
            </button>

            {/* Share Button */}
            <button 
                onClick={handleShareClick} 
                className="flex flex-col items-center group transition-transform active:scale-95 p-2 rounded-full hover:bg-white/5"
            >
                <div className="text-white group-hover:text-gray-200 transition-all">
                    <Share size={iconSize} strokeWidth={1.5} />
                </div>
                <span className="text-white font-medium text-[9px] drop-shadow-sm leading-tight mt-0.5">{formatCount(initialShares)}</span>
            </button>
        </div>
    );
};
