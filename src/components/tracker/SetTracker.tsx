import React, { useState, useMemo } from 'react';
import { Card, CollectionItem } from '../../types/card';
import { RARITIES, VIAL_VALUES, sortSetsByReleaseOrder, formatSetDisplayName } from '../../services/rules';
import { CardVisual } from '../common/CardVisual';
import { CardDetailModal } from '../cards/CardDetailModal';
import { playClick } from '../../services/sound';
import {
  PieChart,
  CheckCircle,
  AlertCircle,
  Wrench,
  ChevronRight,
  Sparkles,
} from 'lucide-react';

interface SetTrackerProps {
  cards: Card[];
  cardsMap: Map<string, Card>;
  collection: Record<string, CollectionItem>;
  onAddCardsToCraftPlan: (cardIds: string[]) => void;
  onUpdateCollection?: (cardId: string, regular: number, foil: number) => void;
}

export const SetTracker: React.FC<SetTrackerProps> = ({
  cards,
  cardsMap,
  collection,
  onAddCardsToCraftPlan,
  onUpdateCollection,
}) => {
  const [selectedSet, setSelectedSet] = useState<string>('Legends Rise');
  const [inspectCard, setInspectCard] = useState<Card | null>(null);

  // Available collectible sets in official release order
  const availableSets = useMemo(() => {
    const s = new Set<string>();
    cards.filter((c) => !c.isToken).forEach((c) => s.add(c.setName));
    return sortSetsByReleaseOrder(Array.from(s));
  }, [cards]);

  // Statistics per set
  const setStats = useMemo(() => {
    const map: Record<
      string,
      {
        totalCards: number;
        totalOwnedPlaysets: number;
        totalPlaysetsPossible: number;
        vialsNeeded: number;
        byRarity: Record<
          number,
          { total: number; fullPlaysets: number; ownedCopies: number; totalPossibleCopies: number }
        >;
      }
    > = {};

    availableSets.forEach((setName) => {
      const setCards = cards.filter((c) => !c.isToken && c.setName === setName);
      let totalOwnedPlaysets = 0;
      let vialsNeeded = 0;

      const byRarity: Record<
        number,
        { total: number; fullPlaysets: number; ownedCopies: number; totalPossibleCopies: number }
      > = {
        1: { total: 0, fullPlaysets: 0, ownedCopies: 0, totalPossibleCopies: 0 },
        2: { total: 0, fullPlaysets: 0, ownedCopies: 0, totalPossibleCopies: 0 },
        3: { total: 0, fullPlaysets: 0, ownedCopies: 0, totalPossibleCopies: 0 },
        4: { total: 0, fullPlaysets: 0, ownedCopies: 0, totalPossibleCopies: 0 },
      };

      setCards.forEach((c) => {
        const item = collection[c.id];
        const ownedTotal = item ? item.regularCount + item.foilCount : 0;
        if (ownedTotal >= 3) totalOwnedPlaysets++;

        const missing = Math.max(0, 3 - ownedTotal);
        const craftVal = VIAL_VALUES[c.rarity]?.craft || 50;
        vialsNeeded += missing * craftVal;

        if (byRarity[c.rarity]) {
          byRarity[c.rarity].total++;
          byRarity[c.rarity].totalPossibleCopies += 3;
          byRarity[c.rarity].ownedCopies += Math.min(3, ownedTotal);
          if (ownedTotal >= 3) byRarity[c.rarity].fullPlaysets++;
        }
      });

      map[setName] = {
        totalCards: setCards.length,
        totalOwnedPlaysets,
        totalPlaysetsPossible: setCards.length,
        vialsNeeded,
        byRarity,
      };
    });

    return map;
  }, [cards, collection, availableSets]);

  // Current set's cards
  const currentSetCards = useMemo(() => {
    return cards
      .filter((c) => !c.isToken && c.setName === selectedSet)
      .sort((a, b) => b.rarity - a.rarity || a.cost - b.cost);
  }, [cards, selectedSet]);

  // Missing cards in selected set
  const missingCards = useMemo(() => {
    return currentSetCards.filter((card) => {
      const item = collection[card.id];
      const owned = item ? item.regularCount + item.foilCount : 0;
      return owned < 3;
    });
  }, [currentSetCards, collection]);

  const currentStats = setStats[selectedSet];

  const handleAddAllMissingToCraft = () => {
    playClick();
    if (missingCards.length === 0) return;
    const ids = missingCards.map((c) => c.id);
    onAddCardsToCraftPlan(ids);
    alert(`Added ${missingCards.length} incomplete cards from ${selectedSet} to your Craft Planner!`);
  };

  return (
    <div className="space-y-6">
      {/* Top Banner */}
      <div className="rounded-2xl border border-cyan-900/40 bg-gradient-to-r from-slate-900 via-indigo-950/40 to-slate-900 p-5 sm:p-6 shadow-2xl backdrop-blur-md">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <div className="flex items-center space-x-2">
              <PieChart className="h-6 w-6 text-cyan-400" />
              <h1 className="font-serif text-2xl sm:text-3xl font-bold tracking-wide text-white">
                Set Completion Tracker
              </h1>
            </div>
            <p className="mt-1 text-xs sm:text-sm text-slate-400">
              Analyze card acquisition across card sets and track playset completion progress.
            </p>
          </div>

          {/* Set Selector Tabs */}
          <div className="flex items-center space-x-2 overflow-x-auto pb-1">
            {availableSets.map((setName) => {
              const st = setStats[setName];
              const pct =
                st && st.totalCards > 0
                  ? ((st.totalOwnedPlaysets / st.totalCards) * 100).toFixed(0)
                  : '0';
              return (
                <button
                  key={setName}
                  onClick={() => {
                    playClick();
                    setSelectedSet(setName);
                  }}
                  className={`rounded-xl px-4 py-2 text-xs sm:text-sm font-semibold transition-all shrink-0 ${
                    selectedSet === setName
                      ? 'bg-cyan-500 text-slate-950 font-bold shadow-[0_0_12px_rgba(6,182,212,0.5)]'
                      : 'bg-slate-950 border border-slate-800 text-slate-300 hover:text-white'
                  }`}
                >
                  <span>{formatSetDisplayName(setName)}</span>
                  <span className="ml-1.5 opacity-80 text-[11px]">({pct}%)</span>
                </button>
              );
            })}
          </div>
        </div>

        {/* Selected Set Deep Dive */}
        {currentStats && (
          <div className="mt-6 pt-5 border-t border-slate-800 space-y-4">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
              <div>
                <span className="text-xs text-slate-400 uppercase font-semibold">
                  Overall Set Playset Completion
                </span>
                <div className="text-xl sm:text-2xl font-bold text-white">
                  {currentStats.totalOwnedPlaysets} / {currentStats.totalCards}{' '}
                  <span className="text-sm font-normal text-slate-400">
                    playsets (
                    {(
                      (currentStats.totalOwnedPlaysets / Math.max(1, currentStats.totalCards)) *
                      100
                    ).toFixed(1)}
                    %)
                  </span>
                </div>
              </div>

              <div className="flex items-center space-x-3">
                <div className="text-right">
                  <span className="text-[10px] uppercase text-slate-400 block">Vials to Complete</span>
                  <span className="text-sm font-bold text-amber-300">
                    {currentStats.vialsNeeded.toLocaleString()} 🧪 Ether
                  </span>
                </div>

                {missingCards.length > 0 && (
                  <button
                    onClick={handleAddAllMissingToCraft}
                    className="flex items-center space-x-1.5 rounded-xl border border-purple-500/50 bg-purple-950/40 px-3 py-2 text-xs font-semibold text-purple-300 hover:bg-purple-900/50 transition-colors shadow-sm"
                  >
                    <Wrench className="h-3.5 w-3.5 text-purple-400" />
                    <span>Plan All Missing ({missingCards.length})</span>
                  </button>
                )}
              </div>
            </div>

            {/* Rarity Breakdown Grid */}
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 pt-2">
              {RARITIES.map((r) => {
                const rData = currentStats.byRarity[r.id];
                if (!rData || rData.total === 0) return null;
                const rPct = ((rData.ownedCopies / rData.totalPossibleCopies) * 100).toFixed(0);

                return (
                  <div key={r.id} className="rounded-xl border border-slate-800 bg-slate-950/80 p-3">
                    <div className="flex items-center justify-between">
                      <span className="text-xs font-bold" style={{ color: r.color }}>
                        {r.name}
                      </span>
                      <span className="text-[11px] font-semibold text-slate-400">{rPct}%</span>
                    </div>

                    <div className="mt-1 flex items-baseline space-x-1.5">
                      <span className="text-lg font-bold text-white">{rData.fullPlaysets}</span>
                      <span className="text-xs text-slate-500">/ {rData.total} playsets</span>
                    </div>

                    <div className="mt-2 h-1.5 w-full rounded-full bg-slate-800 overflow-hidden">
                      <div
                        className="h-full rounded-full"
                        style={{
                          backgroundColor: r.color,
                          width: `${(rData.ownedCopies / rData.totalPossibleCopies) * 100}%`,
                        }}
                      />
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        )}
      </div>

      {/* Missing Cards in This Set */}
      <div className="space-y-3">
        <div className="flex items-center justify-between">
          <h2 className="font-serif text-lg font-bold text-white flex items-center space-x-2">
            <span>Incomplete Cards in {selectedSet}</span>
            <span className="rounded-full bg-slate-800 border border-slate-700 px-2 py-0.5 text-xs font-normal text-slate-400">
              {missingCards.length}
            </span>
          </h2>

          {missingCards.length === 0 && (
            <span className="flex items-center space-x-1 text-emerald-400 text-xs font-bold">
              <CheckCircle className="h-4 w-4" />
              <span>Full Set Collected! (3x of every card)</span>
            </span>
          )}
        </div>

        {missingCards.length > 0 ? (
          <div className="grid grid-cols-[repeat(auto-fill,minmax(170px,1fr))] gap-4 justify-items-center">
            {missingCards.map((card) => {
              const item = collection[card.id];
              const reg = item ? item.regularCount : 0;
              const foil = item ? item.foilCount : 0;
              return (
                <div key={card.id} className="flex flex-col items-center space-y-1.5 w-full">
                  <CardVisual
                    card={card}
                    onDetails={() => setInspectCard(card)}
                    collectionCount={reg}
                    foilCount={foil}
                  />
                  <button
                    onClick={() => {
                      playClick();
                      onAddCardsToCraftPlan([card.id]);
                    }}
                    className="w-full flex items-center justify-center space-x-1 rounded-lg border border-purple-500/40 bg-purple-950/50 py-1 text-[11px] font-semibold text-purple-300 hover:bg-purple-900/60 hover:border-purple-400 transition-colors"
                    title="Add card to Craft Planner"
                  >
                    <Wrench className="h-3 w-3 text-purple-400" />
                    <span>+ Craft Plan</span>
                  </button>
                </div>
              );
            })}
          </div>
        ) : (
          <div className="rounded-2xl border border-emerald-900/30 bg-emerald-950/20 p-8 text-center text-emerald-300">
            <CheckCircle className="h-10 w-10 mx-auto mb-2 text-emerald-400" />
            <h3 className="font-serif text-lg font-bold">100% Set Completion!</h3>
            <p className="mt-1 text-xs text-emerald-400/80">
              You own a complete 3x playset of every card in {selectedSet}.
            </p>
          </div>
        )}
      </div>

      {/* Inspect Modal */}
      {inspectCard && (
        <CardDetailModal
          card={inspectCard}
          allCardsMap={cardsMap}
          onClose={() => setInspectCard(null)}
          onSelectCard={(c) => setInspectCard(c)}
          collectionItem={collection[inspectCard.id]}
          onUpdateCollection={
            onUpdateCollection
              ? (reg, foil) => onUpdateCollection(inspectCard.id, reg, foil)
              : undefined
          }
          onAddToCraftPlan={(card) => onAddCardsToCraftPlan([card.id])}
        />
      )}
    </div>
  );
};
