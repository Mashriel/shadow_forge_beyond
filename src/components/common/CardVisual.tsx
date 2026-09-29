import React, { useState } from 'react';
import { Card } from '../../types/card';
import { CLASSES } from '../../services/rules';
import { Plus, Eye, Check, Sparkles } from 'lucide-react';
import { playClick } from '../../services/sound';

interface CardVisualProps {
  card: Card;
  onClick?: () => void;
  onDetails?: () => void;
  onQuickAdd?: (e: React.MouseEvent) => void;
  onQuickCollectionAdd?: (e: React.MouseEvent) => void;
  deckCount?: number;
  collectionCount?: number;
  foilCount?: number;
  showEvolved?: boolean;
  size?: 'sm' | 'md' | 'lg';
  isPlayableInTester?: boolean;
  className?: string;
}

export const CardVisual: React.FC<CardVisualProps> = ({
  card,
  onClick,
  onDetails,
  onQuickAdd,
  onQuickCollectionAdd,
  deckCount,
  collectionCount,
  foilCount,
  showEvolved = false,
  size = 'md',
  isPlayableInTester = false,
  className = '',
}) => {
  const [imageError, setImageError] = useState(false);
  const classConfig = CLASSES.find((c) => c.name === card.className) || CLASSES[CLASSES.length - 1];

  const currentImage = showEvolved && card.imageBack ? card.imageBack : card.image;

  // Sizing definitions matching native card aspect ratio 530x687
  // Guarantees full card image is visible without collapsing inside flex containers or grids
  const sizeClasses = {
    sm: 'w-28 sm:w-32 aspect-[530/687] text-xs shrink-0',
    md: 'w-full max-w-[210px] aspect-[530/687] text-sm shrink-0',
    lg: 'w-full max-w-[300px] aspect-[530/687] text-base shrink-0',
  }[size];

  const handleCardImageClick = () => {
    // Only invoke onClick if explicitly passed
    // NEVER open details from clicking the card image itself
    if (onClick) {
      playClick();
      onClick();
    }
  };

  return (
    <div
      onClick={handleCardImageClick}
      className={`group relative select-none rounded-xl overflow-hidden transition-all duration-200 transform-gpu hover:-translate-y-1 hover:shadow-2xl ${sizeClasses} ${className} ${
        onClick ? 'cursor-pointer' : 'cursor-default'
      } ${
        isPlayableInTester
          ? 'ring-2 ring-emerald-400 ring-offset-2 ring-offset-slate-950 shadow-[0_0_16px_rgba(52,211,153,0.7)]'
          : ''
      }`}
      style={{
        boxShadow: '0 4px 20px -2px rgba(0, 0, 0, 0.7)',
      }}
    >
      {/* Background artwork - displayed full width */}
      <div className="absolute inset-0 bg-slate-950 flex items-center justify-center">
        {!imageError ? (
          <img
            src={currentImage}
            alt={card.name}
            loading="lazy"
            onError={() => setImageError(true)}
            className="h-full w-full object-cover object-top transition-transform duration-300 group-hover:scale-105"
          />
        ) : (
          <div className="flex h-full w-full flex-col items-center justify-center p-3 text-center bg-gradient-to-b from-slate-800 to-slate-950 text-slate-300">
            <span className="text-2xl mb-1">{classConfig.iconSymbol}</span>
            <span className="font-semibold leading-tight line-clamp-2">{card.name}</span>
            <span className="mt-1 text-[10px] text-slate-400">{card.type}</span>
          </div>
        )}
      </div>

      {/* Shimmer overlay for foil cards or legendary */}
      {card.rarity === 4 && (
        <div className="pointer-events-none absolute inset-0 bg-gradient-to-tr from-transparent via-cyan-400/10 to-transparent opacity-0 group-hover:opacity-100 transition-opacity" />
      )}

      {/* Transparent border overlay as requested */}
      <div className="pointer-events-none absolute inset-0 rounded-xl border border-transparent" />

      {/* Deck Count Overlay Badge (Top Right) */}
      {deckCount !== undefined && deckCount > 0 && (
        <div className="absolute top-2 right-2 z-10 flex h-6 w-6 items-center justify-center rounded-full border border-cyan-400 bg-cyan-950 font-bold text-xs text-cyan-200 shadow-[0_0_10px_rgba(6,182,212,0.8)] pointer-events-none">
          {deckCount}x
        </div>
      )}

      {/* Collection Card Counter Pill (Top Right) */}
      {collectionCount !== undefined && (
        <div
          className={`absolute ${
            deckCount !== undefined && deckCount > 0 ? 'top-9' : 'top-2'
          } right-2 z-10 flex items-center space-x-0.5 rounded-md bg-slate-950/90 px-1.5 py-0.5 text-[10px] font-bold text-slate-100 border border-slate-700 shadow-md pointer-events-none`}
        >
          <span>{collectionCount}/3</span>
          {foilCount !== undefined && foilCount > 0 && (
            <span className="text-amber-400 flex items-center ml-1" title={`${foilCount} Foil`}>
              <Sparkles className="h-2.5 w-2.5 inline mr-0.5" />
              {foilCount}
            </span>
          )}
        </div>
      )}

      {/* Bottom Name & Stats Banner with fade effect */}
      <div className="absolute inset-x-0 bottom-0 bg-gradient-to-t from-black via-black/85 to-transparent pt-7 pb-2 px-2 pointer-events-none z-10">
        <div className="font-semibold text-white text-[11px] sm:text-xs leading-tight truncate drop-shadow-[0_1px_2px_rgba(0,0,0,0.9)]">
          {card.name}
        </div>

        <div className="mt-1 flex items-center justify-between text-[10px] gap-1">
          {/* Class & Type */}
          <span className="truncate text-slate-300 font-medium">
            {card.className !== 'Neutral' ? card.className.replace('craft', '') : 'Neutral'} · {card.type}
          </span>

          {/* Followers: ATK / DEF */}
          {card.type === 'Follower' && (
            <div className="flex items-center space-x-1 shrink-0">
              <span className="flex items-center rounded bg-amber-950/90 px-1 py-0.2 border border-amber-500/80 font-bold text-amber-300">
                ⚔️ {card.atk}
              </span>
              <span className="flex items-center rounded bg-sky-950/90 px-1 py-0.2 border border-sky-500/80 font-bold text-sky-300">
                🛡️ {card.life}
              </span>
            </div>
          )}
        </div>
      </div>

      {/* Hover Quick Action Buttons Overlay */}
      <div className="absolute inset-0 bg-slate-950/75 opacity-0 group-hover:opacity-100 transition-opacity flex flex-col items-center justify-center gap-2 p-2.5 z-20 pointer-events-none group-hover:pointer-events-auto">
        {onDetails && (
          <button
            type="button"
            onClick={(e) => {
              e.stopPropagation();
              playClick();
              onDetails();
            }}
            className="flex w-full items-center justify-center space-x-1.5 rounded-lg bg-slate-900/95 border border-cyan-500/60 hover:border-cyan-400 px-2 py-1.5 text-xs font-semibold text-cyan-200 hover:bg-slate-800 shadow-md transition-colors"
          >
            <Eye className="h-3.5 w-3.5 text-cyan-400" />
            <span>Details</span>
          </button>
        )}

        {onQuickAdd && (
          <button
            type="button"
            onClick={(e) => {
              e.stopPropagation();
              playClick();
              onQuickAdd(e);
            }}
            className="flex w-full items-center justify-center space-x-1 rounded-lg bg-cyan-900/90 border border-cyan-500/60 px-2 py-1.5 text-xs font-semibold text-cyan-200 hover:bg-cyan-800 shadow-[0_0_8px_rgba(6,182,212,0.4)] transition-colors"
          >
            <Plus className="h-3.5 w-3.5 text-cyan-300" />
            <span>Add to Deck</span>
          </button>
        )}

        {onQuickCollectionAdd && (
          <button
            type="button"
            onClick={(e) => {
              e.stopPropagation();
              playClick();
              onQuickCollectionAdd(e);
            }}
            className="flex w-full items-center justify-center space-x-1 rounded-lg bg-amber-950/90 border border-amber-500/60 px-2 py-1 text-xs font-medium text-amber-200 hover:bg-amber-900 shadow-sm transition-colors"
          >
            <Check className="h-3.5 w-3.5 text-amber-300" />
            <span>+1 Collection</span>
          </button>
        )}
      </div>
    </div>
  );
};
