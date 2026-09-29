import React, { useState, useMemo } from 'react';
import { Card, ClassName, CollectionItem, Deck } from '../../types/card';
import { CardVisual } from '../common/CardVisual';
import { CardDetailModal } from '../cards/CardDetailModal';
import { CLASSES, RARITIES, VIAL_VALUES, formatSetDisplayName, sortSetsByReleaseOrder } from '../../services/rules';
import { playClick, playCardPlay } from '../../services/sound';
import {
  Sparkles,
  Search,
  Filter,
  CheckCircle2,
  AlertCircle,
  Wrench,
  Check,
  RotateCcw,
  Zap,
} from 'lucide-react';

interface CollectionManagerProps {
  cards: Card[];
  cardsMap: Map<string, Card>;
  collection: Record<string, CollectionItem>;
  onUpdateCollection: (cardId: string, regular: number, foil: number) => void;
  onBatchUpdateCollection: (items: CollectionItem[]) => void;
  activeDeck: Deck | null;
  onAddToCraftPlan?: (card: Card) => void;
}

export const CollectionManager: React.FC<CollectionManagerProps> = ({
  cards,
  cardsMap,
  collection,
  onUpdateCollection,
  onBatchUpdateCollection,
  activeDeck,
  onAddToCraftPlan,
}) => {
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedClass, setSelectedClass] = useState<ClassName | 'All'>('All');
  const [includeNeutral, setIncludeNeutral] = useState(false);
  const [selectedRarity, setSelectedRarity] = useState<number | 'All'>('All');
  const [selectedSet, setSelectedSet] = useState<string | 'All'>('All');
  const [ownershipFilter, setOwnershipFilter] = useState<'all' | 'missing' | 'incomplete' | 'complete' | 'foil'>('all');
  const [inspectCard, setInspectCard] = useState<Card | null>(null);

  // Collectible cards (exclude tokens from collection tracking)
  const collectibleCards = useMemo(() => {
    return cards.filter((c) => !c.isToken);
  }, [cards]);

  const availableSets = useMemo(() => {
    const s = new Set<string>();
    collectibleCards.forEach((c) => {
      if (c.setName) s.add(c.setName);
    });
    return sortSetsByReleaseOrder(Array.from(s));
  }, [collectibleCards]);

  // Overall Collection Statistics
  const stats = useMemo(() => {
    let ownedUnique = 0;
    let completePlaysets = 0;
    let totalOwnedRegular = 0;
    let totalOwnedFoil = 0;
    let liquefyValue = 0;
    let vialsNeeded = 0;

    const maxRegularTotal = collectibleCards.length * 3;

    collectibleCards.forEach((card) => {
      const item = collection[card.id];
      const reg = item ? item.regularCount : 0;
      const foil = item ? item.foilCount : 0;
      const totalOwned = reg + foil;

      if (totalOwned > 0) ownedUnique++;
      if (totalOwned >= 3) completePlaysets++;

      totalOwnedRegular += reg;
      totalOwnedFoil += foil;

      const v = VIAL_VALUES[card.rarity] || { craft: 50, liquefyRegular: 10, liquefyFoil: 30 };
      liquefyValue += reg * v.liquefyRegular + foil * v.liquefyFoil;

      const missingForPlayset = Math.max(0, 3 - totalOwned);
      vialsNeeded += missingForPlayset * v.craft;
    });

    const completionPercent = maxRegularTotal > 0 ? (totalOwnedRegular / maxRegularTotal) * 100 : 0;

    return {
      ownedUnique,
      totalCards: collectibleCards.length,
      completePlaysets,
      totalOwnedRegular,
      totalOwnedFoil,
      maxRegularTotal,
      liquefyValue,
      vialsNeeded,
      completionPercent,
    };
  }, [collectibleCards, collection]);

  // Filtered Cards
  const filteredCards = useMemo(() => {
    return collectibleCards.filter((card) => {
      const item = collection[card.id];
      const reg = item ? item.regularCount : 0;
      const foil = item ? item.foilCount : 0;
      const totalOwned = reg + foil;

      // Ownership filter
      if (ownershipFilter === 'missing' && totalOwned > 0) return false;
      if (ownershipFilter === 'incomplete' && (totalOwned === 0 || totalOwned >= 3)) return false;
      if (ownershipFilter === 'complete' && totalOwned < 3) return false;
      if (ownershipFilter === 'foil' && foil === 0) return false;

      // Class (allows craft class + Neutral together)
      if (selectedClass !== 'All') {
        if (selectedClass === 'Neutral') {
          if (card.className !== 'Neutral') return false;
        } else if (includeNeutral) {
          if (card.className !== selectedClass && card.className !== 'Neutral') return false;
        } else if (card.className !== selectedClass) {
          return false;
        }
      }

      // Rarity
      if (selectedRarity !== 'All' && card.rarity !== selectedRarity) return false;

      // Set
      if (selectedSet !== 'All' && card.setName !== selectedSet) return false;

      // Search
      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase();
        const matchName = card.name.toLowerCase().includes(q);
        const matchSkill = card.skillText.toLowerCase().includes(q);
        if (!matchName && !matchSkill) return false;
      }

      return true;
    });
  }, [
    collectibleCards,
    collection,
    ownershipFilter,
    selectedClass,
    includeNeutral,
    selectedRarity,
    selectedSet,
    searchQuery,
  ]);

  const [confirmModal, setConfirmModal] = useState<{
    title: string;
    message: string;
    onConfirm: () => void;
  } | null>(null);

  // Batch action: Set all cards in a selected set to 3x playset
  const handleSetAllInSelectedSet = (setNameToUnlock: string) => {
    const targetSet = setNameToUnlock === 'All' ? 'Basic' : setNameToUnlock;
    setConfirmModal({
      title: `Unlock 3x Playset for ${formatSetDisplayName(targetSet)}`,
      message: `Set all regular cards from "${formatSetDisplayName(targetSet)}" set in your collection to a full 3x playset?`,
      onConfirm: () => {
        playCardPlay();
        const updates: CollectionItem[] = [];
        collectibleCards
          .filter((c) => c.setName === targetSet)
          .forEach((c) => {
            const current = collection[c.id];
            updates.push({
              cardId: c.id,
              regularCount: 3,
              foilCount: current?.foilCount || 0,
              updatedAt: new Date().toISOString(),
            });
          });
        onBatchUpdateCollection(updates);
      },
    });
  };

  // Batch action: Mark all cards in active deck as owned
  const handleMarkActiveDeckOwned = () => {
    if (!activeDeck) return;
    setConfirmModal({
      title: 'Mark Deck Cards Owned',
      message: `Mark all cards in active deck "${activeDeck.name}" as owned in your collection?`,
      onConfirm: () => {
        playCardPlay();
        const updates: CollectionItem[] = [];
        Object.entries(activeDeck.cards).forEach(([cardId, neededQty]) => {
          const current = collection[cardId];
          const curReg = current ? current.regularCount : 0;
          const curFoil = current ? current.foilCount : 0;
          if (curReg + curFoil < neededQty) {
            updates.push({
              cardId,
              regularCount: Math.min(3, Math.max(curReg, neededQty - curFoil)),
              foilCount: curFoil,
              updatedAt: new Date().toISOString(),
            });
          }
        });
        onBatchUpdateCollection(updates);
      },
    });
  };

  // Reset collection
  const handleResetCollection = () => {
    setConfirmModal({
      title: 'Reset Collection',
      message: 'Are you sure you want to reset your entire collection count to 0? This action cannot be undone.',
      onConfirm: () => {
        playClick();
        const updates: CollectionItem[] = collectibleCards.map((c) => ({
          cardId: c.id,
          regularCount: 0,
          foilCount: 0,
          updatedAt: new Date().toISOString(),
        }));
        onBatchUpdateCollection(updates);
      },
    });
  };

  return (
    <div className="space-y-6">
      {/* Top Banner: Collection Statistics Overview */}
      <div className="rounded-2xl border border-cyan-900/40 bg-gradient-to-r from-slate-900 via-cyan-950/40 to-slate-900 p-5 sm:p-6 shadow-2xl backdrop-blur-md">
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-5">
          <div>
            <div className="flex items-center space-x-2">
              <Sparkles className="h-6 w-6 text-amber-400" />
              <h1 className="font-serif text-2xl sm:text-3xl font-bold tracking-wide text-white">
                Collection Vault
              </h1>
            </div>
            <p className="mt-1 text-xs sm:text-sm text-slate-400">
              Track owned regular and foil copies, calculate liquefy red ether value, and inspect set completion.
            </p>
          </div>

          {/* Batch Quick-Actions */}
          <div className="flex flex-wrap items-center gap-2">
            {activeDeck && (
              <button
                onClick={handleMarkActiveDeckOwned}
                className="flex items-center space-x-1.5 rounded-xl border border-cyan-500/50 bg-cyan-950/40 px-3 py-2 text-xs font-semibold text-cyan-300 hover:bg-cyan-900/50 transition-colors"
                title={`Mark all cards in ${activeDeck.name} as owned`}
              >
                <Zap className="h-3.5 w-3.5 text-cyan-400" />
                <span>Own Active Deck Cards</span>
              </button>
            )}

            <button
              onClick={handleResetCollection}
              className="flex items-center space-x-1 rounded-xl border border-rose-900/40 bg-rose-950/30 px-3 py-2 text-xs text-rose-400 hover:bg-rose-900/40 transition-colors"
              title="Reset collection to empty"
            >
              <RotateCcw className="h-3.5 w-3.5" />
              <span>Reset</span>
            </button>
          </div>
        </div>

        {/* Analytics Grid */}
        <div className="mt-6 grid grid-cols-2 sm:grid-cols-4 gap-3 pt-5 border-t border-slate-800">
          {/* Card Completion */}
          <div className="rounded-xl border border-slate-800 bg-slate-950/80 p-3.5">
            <span className="text-[10px] uppercase font-bold text-slate-400 block">
              Unique Cards Owned
            </span>
            <div className="mt-1 flex items-baseline space-x-2">
              <span className="text-xl sm:text-2xl font-bold text-white">
                {stats.ownedUnique}
              </span>
              <span className="text-xs text-slate-500">/ {stats.totalCards} cards</span>
            </div>
            <div className="mt-2 h-1.5 w-full rounded-full bg-slate-800 overflow-hidden">
              <div
                className="h-full bg-cyan-500 rounded-full"
                style={{ width: `${(stats.ownedUnique / stats.totalCards) * 100}%` }}
              />
            </div>
          </div>

          {/* Full Playsets Completed */}
          <div className="rounded-xl border border-slate-800 bg-slate-950/80 p-3.5">
            <span className="text-[10px] uppercase font-bold text-slate-400 block">
              Playsets (3x Copies)
            </span>
            <div className="mt-1 flex items-baseline space-x-2">
              <span className="text-xl sm:text-2xl font-bold text-emerald-400">
                {stats.completePlaysets}
              </span>
              <span className="text-xs text-slate-500">/ {stats.totalCards} complete</span>
            </div>
            <div className="mt-2 text-[11px] text-slate-400">
              {stats.totalOwnedFoil > 0 && (
                <span className="text-amber-400 font-semibold flex items-center">
                  <Sparkles className="h-3 w-3 mr-1" /> {stats.totalOwnedFoil} Foil copies owned
                </span>
              )}
            </div>
          </div>

          {/* Liquefy Value */}
          <div className="rounded-xl border border-slate-800 bg-slate-950/80 p-3.5">
            <span className="text-[10px] uppercase font-bold text-slate-400 block">
              Liquefy Value
            </span>
            <div className="mt-1 text-xl sm:text-2xl font-bold text-slate-200">
              {stats.liquefyValue.toLocaleString()}{' '}
              <span className="text-xs font-normal text-slate-400">🧪 Ether</span>
            </div>
            <div className="mt-2 text-[10px] text-slate-500">
              Vials gained if you liquefy all
            </div>
          </div>

          {/* Ether Needed */}
          <div className="rounded-xl border border-slate-800 bg-slate-950/80 p-3.5">
            <span className="text-[10px] uppercase font-bold text-slate-400 block">
              Vials for Full Playset
            </span>
            <div className="mt-1 text-xl sm:text-2xl font-bold text-amber-300">
              {stats.vialsNeeded.toLocaleString()}{' '}
              <span className="text-xs font-normal text-slate-400">🧪 Ether</span>
            </div>
            <div className="mt-2 text-[10px] text-slate-500">
              To complete 3x of all cards
            </div>
          </div>
        </div>
      </div>

      {/* Filter Toolbar */}
      <div className="rounded-2xl border border-slate-800 bg-slate-900/60 p-4 space-y-3">
        <div className="flex flex-col sm:flex-row gap-3 items-stretch sm:items-center justify-between">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search collectible cards..."
              className="w-full rounded-xl border border-slate-700 bg-slate-950 pl-9 pr-3 py-2 text-xs text-slate-100 placeholder-slate-500 focus:border-cyan-500 focus:outline-none"
            />
          </div>

          {/* Ownership Filter Pills */}
          <div className="flex items-center space-x-1 overflow-x-auto text-xs pb-1 sm:pb-0">
            {[
              { id: 'all', label: 'All' },
              { id: 'missing', label: 'Missing (0x)' },
              { id: 'incomplete', label: 'Need More (1-2x)' },
              { id: 'complete', label: 'Complete (3x)' },
              { id: 'foil', label: 'Has Foils' },
            ].map((tab) => (
              <button
                key={tab.id}
                onClick={() => setOwnershipFilter(tab.id as typeof ownershipFilter)}
                className={`rounded-lg px-2.5 py-1.5 font-semibold transition-all shrink-0 ${
                  ownershipFilter === tab.id
                    ? 'bg-cyan-500 text-slate-950 font-bold shadow-sm'
                    : 'bg-slate-950 border border-slate-800 text-slate-400 hover:text-white'
                }`}
              >
                {tab.label}
              </button>
            ))}
          </div>
        </div>

        {/* Secondary Filter: Class, Neutral, Rarity, Set */}
        <div className="flex flex-wrap items-center gap-2 pt-2 border-t border-slate-800 text-xs">
          {/* Class SVG Icon Selector */}
          <div className="flex items-center gap-1.5 overflow-x-auto py-1 pr-1">
            <button
              onClick={() => {
                playClick();
                setSelectedClass('All');
                setIncludeNeutral(false);
              }}
              className={`shrink-0 rounded-xl px-3 py-1.5 text-xs font-semibold transition-all ${
                selectedClass === 'All'
                  ? 'bg-cyan-500 text-slate-950 font-bold shadow-[0_0_10px_rgba(6,182,212,0.5)]'
                  : 'bg-slate-950/70 border border-slate-800 text-slate-400 hover:border-slate-700 hover:text-white'
              }`}
            >
              All
            </button>

            {CLASSES.filter((c) => c.name !== 'Neutral').map((cls) => {
              const isSelected = selectedClass === cls.name;
              return (
                <button
                  key={cls.name}
                  title={cls.name}
                  onClick={() => {
                    playClick();
                    setSelectedClass(cls.name);
                  }}
                  className={`group relative shrink-0 p-1.5 rounded-xl border transition-all duration-150 flex items-center justify-center ${
                    isSelected
                      ? 'border-cyan-400 bg-cyan-950/80 shadow-[0_0_12px_rgba(34,211,238,0.4)] scale-105'
                      : 'border-slate-800 bg-slate-950/70 hover:border-slate-700 hover:bg-slate-900/80'
                  }`}
                  style={isSelected ? { borderColor: cls.color } : {}}
                >
                  <img
                    src={cls.iconSvg}
                    alt={cls.name}
                    className={`h-5 w-5 object-contain transition-transform duration-150 group-hover:scale-110 ${
                      isSelected ? 'filter drop-shadow-[0_0_6px_rgba(34,211,238,0.8)]' : 'opacity-75 group-hover:opacity-100'
                    }`}
                  />
                </button>
              );
            })}

            {/* Neutral Icon Button */}
            {(() => {
              const neutralConfig = CLASSES.find((c) => c.name === 'Neutral') || CLASSES[CLASSES.length - 1];
              const isNeutralSelected = selectedClass === 'Neutral';
              const isNeutralActive = includeNeutral && selectedClass !== 'All' && selectedClass !== 'Neutral';
              return (
                <button
                  onClick={() => {
                    playClick();
                    if (selectedClass === 'All') {
                      setSelectedClass('Neutral');
                      setIncludeNeutral(false);
                    } else if (selectedClass === 'Neutral') {
                      setSelectedClass('All');
                      setIncludeNeutral(false);
                    } else {
                      setIncludeNeutral((prev) => !prev);
                    }
                  }}
                  className={`group relative shrink-0 p-1.5 rounded-xl border transition-all duration-150 flex items-center justify-center space-x-1 ${
                    isNeutralSelected
                      ? 'border-slate-300 bg-slate-800 shadow-[0_0_12px_rgba(203,213,225,0.4)] scale-105'
                      : isNeutralActive
                      ? 'border-cyan-400 bg-cyan-950/80 shadow-[0_0_12px_rgba(6,182,212,0.4)]'
                      : 'border-slate-800 bg-slate-950/70 hover:border-slate-700 hover:bg-slate-900/80'
                  }`}
                  title={
                    selectedClass !== 'All' && selectedClass !== 'Neutral'
                      ? includeNeutral
                        ? 'Neutral cards included (click to exclude)'
                        : 'Include Neutral cards'
                      : 'Filter Neutral cards'
                  }
                >
                  <img
                    src={neutralConfig.iconSvg}
                    alt="Neutral"
                    className={`h-5 w-5 object-contain transition-transform duration-150 group-hover:scale-110 ${
                      isNeutralSelected || isNeutralActive ? 'filter drop-shadow-[0_0_6px_rgba(255,255,255,0.8)]' : 'opacity-75 group-hover:opacity-100'
                    }`}
                  />
                  {isNeutralActive && <Check className="h-3 w-3 text-cyan-400 font-bold" />}
                </button>
              );
            })()}
          </div>

          <div className="flex items-center space-x-1.5 bg-slate-950 border border-slate-800 rounded-lg px-2 py-1 text-slate-300">
            <span className="text-slate-500">Rarity:</span>
            <select
              value={selectedRarity}
              onChange={(e) =>
                setSelectedRarity(e.target.value === 'All' ? 'All' : Number(e.target.value))
              }
              className="bg-transparent focus:outline-none cursor-pointer"
            >
              <option value="All" className="bg-slate-900">All Rarities</option>
              {RARITIES.map((r) => (
                <option key={r.id} value={r.id} className="bg-slate-900">
                  {r.name}
                </option>
              ))}
            </select>
          </div>

          <div className="flex items-center space-x-1.5 bg-slate-950 border border-slate-800 rounded-lg px-2 py-1 text-slate-300">
            <span className="text-slate-500">Set:</span>
            <select
              value={selectedSet}
              onChange={(e) => setSelectedSet(e.target.value)}
              className="bg-transparent focus:outline-none cursor-pointer max-w-[180px] truncate"
            >
              <option value="All" className="bg-slate-900">All Sets</option>
              {availableSets.map((s) => (
                <option key={s} value={s} className="bg-slate-900">
                  {formatSetDisplayName(s)}
                </option>
              ))}
            </select>
          </div>

          {/* Unlock Selected Set Button in Filter */}
          <button
            onClick={() => handleSetAllInSelectedSet(selectedSet)}
            className="flex items-center space-x-1.5 rounded-lg border border-emerald-500/50 bg-emerald-950/60 px-2.5 py-1 text-xs font-semibold text-emerald-300 hover:bg-emerald-900/60 transition-colors shadow-sm"
            title={`Unlock 3x regular copies of all cards in ${selectedSet === 'All' ? 'Basic Set' : formatSetDisplayName(selectedSet)}`}
          >
            <Check className="h-3.5 w-3.5 text-emerald-400" />
            <span>Unlock {selectedSet === 'All' ? 'Basic' : formatSetDisplayName(selectedSet)} (3x)</span>
          </button>

          <span className="text-xs text-slate-500 ml-auto">
            Showing <strong className="text-white">{filteredCards.length}</strong> cards
          </span>
        </div>
      </div>

      {/* Cards Grid with Steppers */}
      <div className="grid grid-cols-[repeat(auto-fill,minmax(175px,1fr))] gap-4 sm:gap-5 justify-items-center">
        {filteredCards.map((card) => {
          const item = collection[card.id];
          const reg = item ? item.regularCount : 0;
          const foil = item ? item.foilCount : 0;

          return (
            <div key={card.id} className="flex flex-col items-center space-y-2">
              <CardVisual
                card={card}
                onDetails={() => setInspectCard(card)}
                collectionCount={reg}
                foilCount={foil}
              />

              {/* Direct Card Collection Steppers */}
              <div className="w-full flex flex-col gap-1 px-1">
                {/* Regular Copies */}
                <div className="flex items-center justify-between rounded-lg bg-slate-950 border border-slate-800 px-2 py-1 text-xs">
                  <span className="text-slate-400 font-medium">Regular:</span>
                  <div className="flex items-center space-x-1.5">
                    <button
                      onClick={() => {
                        playClick();
                        onUpdateCollection(card.id, Math.max(0, reg - 1), foil);
                      }}
                      disabled={reg <= 0}
                      className="h-5 w-5 rounded bg-slate-800 text-slate-300 flex items-center justify-center disabled:opacity-30 hover:bg-slate-700 active:scale-125 active:bg-rose-500 active:text-slate-950 transition-all duration-100"
                    >
                      -
                    </button>
                    <span className="w-4 text-center font-bold text-white">{reg}</span>
                    <button
                      onClick={() => {
                        playClick();
                        onUpdateCollection(card.id, Math.min(3, reg + 1), foil);
                      }}
                      disabled={reg >= 3}
                      className="h-5 w-5 rounded bg-slate-800 text-slate-300 flex items-center justify-center disabled:opacity-30 hover:bg-slate-700 active:scale-125 active:bg-cyan-400 active:text-slate-950 active:shadow-[0_0_10px_rgba(6,182,212,0.9)] transition-all duration-100 font-bold"
                    >
                      +
                    </button>
                  </div>
                </div>

                {/* Foil Copies */}
                <div className="flex items-center justify-between rounded-lg bg-slate-950 border border-slate-800 px-2 py-1 text-xs">
                  <span className="text-amber-400 font-medium flex items-center">
                    <Sparkles className="h-3 w-3 mr-0.5" /> Foil:
                  </span>
                  <div className="flex items-center space-x-1.5">
                    <button
                      onClick={() => {
                        playClick();
                        onUpdateCollection(card.id, reg, Math.max(0, foil - 1));
                      }}
                      disabled={foil <= 0}
                      className="h-5 w-5 rounded bg-slate-800 text-slate-300 flex items-center justify-center disabled:opacity-30 hover:bg-slate-700 active:scale-125 active:bg-rose-500 active:text-slate-950 transition-all duration-100"
                    >
                      -
                    </button>
                    <span className="w-4 text-center font-bold text-amber-300">{foil}</span>
                    <button
                      onClick={() => {
                        playClick();
                        onUpdateCollection(card.id, reg, Math.min(3, foil + 1));
                      }}
                      disabled={foil >= 3}
                      className="h-5 w-5 rounded bg-slate-800 text-slate-300 flex items-center justify-center disabled:opacity-30 hover:bg-slate-700 active:scale-125 active:bg-amber-400 active:text-slate-950 active:shadow-[0_0_10px_rgba(245,158,11,0.9)] transition-all duration-100 font-bold"
                    >
                      +
                    </button>
                  </div>
                </div>

                {/* Add to Craft Plan Button */}
                {onAddToCraftPlan && (
                  <button
                    onClick={() => {
                      playClick();
                      onAddToCraftPlan(card);
                    }}
                    className="w-full flex items-center justify-center space-x-1 rounded-lg border border-purple-500/40 bg-purple-950/50 py-1 text-[11px] font-semibold text-purple-300 hover:bg-purple-900/60 hover:border-purple-400 transition-colors mt-0.5"
                    title="Add card to Craft Planner"
                  >
                    <Wrench className="h-3 w-3 text-purple-400" />
                    <span>+ Craft Plan</span>
                  </button>
                )}
              </div>
            </div>
          );
        })}
      </div>

      {/* Inspect Modal */}
      {inspectCard && (
        <CardDetailModal
          card={inspectCard}
          allCardsMap={cardsMap}
          onClose={() => setInspectCard(null)}
          onSelectCard={(c) => setInspectCard(c)}
          collectionItem={collection[inspectCard.id]}
          collection={collection}
          onUpdateCollection={(reg, foil) => onUpdateCollection(inspectCard.id, reg, foil)}
          onAddToCraftPlan={onAddToCraftPlan}
        />
      )}

      {/* Confirmation Modal */}
      {confirmModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/85 backdrop-blur-md p-4 animate-in fade-in duration-150">
          <div className="w-full max-w-md rounded-2xl border border-cyan-500/50 bg-slate-900 p-6 shadow-2xl space-y-4">
            <h3 className="font-serif text-lg font-bold text-white">{confirmModal.title}</h3>
            <p className="text-xs sm:text-sm text-slate-300 leading-relaxed bg-slate-950/60 p-3.5 rounded-xl border border-slate-800">
              {confirmModal.message}
            </p>
            <div className="flex items-center justify-end space-x-3 pt-2">
              <button
                type="button"
                onClick={() => setConfirmModal(null)}
                className="rounded-xl border border-slate-700 bg-slate-950 px-4 py-2 text-xs font-semibold text-slate-300 hover:text-white transition-colors"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={() => {
                  confirmModal.onConfirm();
                  setConfirmModal(null);
                }}
                className="rounded-xl bg-gradient-to-r from-cyan-500 to-teal-400 px-5 py-2 text-xs font-bold text-slate-950 shadow-[0_0_15px_rgba(6,182,212,0.5)] hover:brightness-110 transition-all"
              >
                Confirm
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
