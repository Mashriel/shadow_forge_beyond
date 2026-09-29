import React, { useState, useMemo } from 'react';
import { Card, CollectionItem, CraftPlanItem, Deck } from '../../types/card';
import { RARITIES, VIAL_VALUES } from '../../services/rules';
import { CardVisual } from '../common/CardVisual';
import { CardDetailModal } from '../cards/CardDetailModal';
import { playClick, playCardPlay } from '../../services/sound';
import {
  Wrench,
  Plus,
  Trash2,
  CheckCircle,
  Sparkles,
  ArrowRight,
  Layers,
  ChevronDown,
} from 'lucide-react';

interface CraftPlannerProps {
  cards: Card[];
  cardsMap: Map<string, Card>;
  craftPlans: Record<string, CraftPlanItem>;
  collection: Record<string, CollectionItem>;
  decks: Deck[];
  onSaveCraftPlan: (item: CraftPlanItem) => void;
  onDeleteCraftPlan: (cardId: string) => void;
  onUpdateCollection: (cardId: string, regular: number, foil: number) => void;
  onImportMissingFromDeck: (deck: Deck) => void;
}

export const CraftPlanner: React.FC<CraftPlannerProps> = ({
  cards,
  cardsMap,
  craftPlans,
  collection,
  decks,
  onSaveCraftPlan,
  onDeleteCraftPlan,
  onUpdateCollection,
  onImportMissingFromDeck,
}) => {
  const [selectedPriority, setSelectedPriority] = useState<'all' | 'high' | 'medium' | 'low'>('all');
  const [inspectCard, setInspectCard] = useState<Card | null>(null);
  const [selectedDeckToImport, setSelectedDeckToImport] = useState<string>('');

  // Owned vials state persisted in localStorage
  const [ownedVials, setOwnedVials] = useState<number>(() => {
    const saved = localStorage.getItem('sv_wb_owned_vials');
    return saved ? Math.max(0, parseInt(saved, 10) || 0) : 0;
  });

  const handleUpdateOwnedVials = (val: number) => {
    const next = Math.max(0, val);
    setOwnedVials(next);
    localStorage.setItem('sv_wb_owned_vials', String(next));
  };

  const planList = useMemo(() => {
    const list: { plan: CraftPlanItem; card: Card; neededCopies: number; etherCost: number }[] = [];
    Object.values(craftPlans).forEach((p) => {
      const card = cardsMap.get(p.cardId);
      if (!card) return;
      const collItem = collection[p.cardId];
      const owned = collItem ? collItem.regularCount + collItem.foilCount : 0;
      const needed = Math.max(1, p.desiredCount - owned);
      const v = VIAL_VALUES[card.rarity]?.craft || 50;
      list.push({
        plan: p,
        card,
        neededCopies: needed,
        etherCost: needed * v,
      });
    });

    const priorityOrder = { high: 1, medium: 2, low: 3 };

    return list
      .filter((item) => selectedPriority === 'all' || item.plan.priority === selectedPriority)
      .sort((a, b) => {
        const pDiff = priorityOrder[a.plan.priority] - priorityOrder[b.plan.priority];
        if (pDiff !== 0) return pDiff;
        return b.card.rarity - a.card.rarity || a.card.cost - b.card.cost;
      });
  }, [craftPlans, cardsMap, collection, selectedPriority]);

  // Overall totals
  const totalEther = useMemo(() => {
    return Object.values(craftPlans).reduce((acc, p) => {
      const card = cardsMap.get(p.cardId);
      if (!card) return acc;
      const collItem = collection[p.cardId];
      const owned = collItem ? collItem.regularCount + collItem.foilCount : 0;
      const needed = Math.max(0, p.desiredCount - owned);
      const v = VIAL_VALUES[card.rarity]?.craft || 50;
      return acc + needed * v;
    }, 0);
  }, [craftPlans, cardsMap, collection]);

  // Craft action: increment collection by 1 and decrease plan
  const handleCraftCard = (card: Card, plan: CraftPlanItem) => {
    playCardPlay();
    const collItem = collection[card.id];
    const curReg = collItem ? collItem.regularCount : 0;
    const curFoil = collItem ? collItem.foilCount : 0;
    const nextReg = Math.min(3, curReg + 1);

    // Update collection
    onUpdateCollection(card.id, nextReg, curFoil);

    // If total owned now meets desired count, remove plan or decrease
    if (nextReg + curFoil >= plan.desiredCount) {
      onDeleteCraftPlan(card.id);
    }
  };

  const handleImportDeck = () => {
    if (!selectedDeckToImport) return;
    const deck = decks.find((d) => d.id === selectedDeckToImport);
    if (deck) {
      playClick();
      onImportMissingFromDeck(deck);
      alert(`Imported missing cards from deck "${deck.name}" to your Craft Planner!`);
    }
  };

  return (
    <div className="space-y-6">
      {/* Top Banner */}
      <div className="rounded-2xl border border-cyan-900/40 bg-gradient-to-r from-slate-900 via-purple-950/40 to-slate-900 p-5 sm:p-6 shadow-2xl backdrop-blur-md">
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
          <div>
            <div className="flex items-center space-x-2">
              <Wrench className="h-6 w-6 text-purple-400" />
              <h1 className="font-serif text-2xl sm:text-3xl font-bold tracking-wide text-white">
                Vial & Craft Planner
              </h1>
            </div>
            <p className="mt-1 text-xs sm:text-sm text-slate-400">
              Queue prioritized cards to synthesize with Red Ether and track total vials needed.
            </p>
          </div>

          {/* Quick-Import from Deck Tool */}
          <div className="flex items-center space-x-2 bg-slate-950 border border-slate-800 rounded-xl p-1.5 text-xs">
            <Layers className="h-4 w-4 text-cyan-400 ml-1.5" />
            <select
              value={selectedDeckToImport}
              onChange={(e) => setSelectedDeckToImport(e.target.value)}
              className="bg-transparent text-slate-200 focus:outline-none cursor-pointer max-w-[180px] truncate"
            >
              <option value="" className="bg-slate-900">Select Deck to Auto-Queue...</option>
              {decks.map((d) => (
                <option key={d.id} value={d.id} className="bg-slate-900">
                  {d.name} ({d.class})
                </option>
              ))}
            </select>
            <button
              onClick={handleImportDeck}
              disabled={!selectedDeckToImport}
              className="rounded-lg bg-cyan-900/80 border border-cyan-500/60 px-3 py-1.5 font-semibold text-cyan-200 hover:bg-cyan-800 disabled:opacity-30 transition-all"
            >
              Import Missing
            </button>
          </div>
        </div>

        {/* Total Cost Display, Owned Vials Budget Input & Filters */}
        <div className="mt-6 pt-5 border-t border-slate-800 space-y-4">
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            {/* Owned Red Ether Input */}
            <div className="rounded-xl border border-slate-800 bg-slate-950/80 p-3 flex flex-col justify-between">
              <span className="text-[10px] uppercase font-bold text-slate-400 block">
                My Owned Red Ether Vials
              </span>
              <div className="mt-1.5 flex items-center space-x-2">
                <span className="text-xl">🧪</span>
                <input
                  type="number"
                  min="0"
                  value={ownedVials}
                  onChange={(e) => handleUpdateOwnedVials(parseInt(e.target.value, 10) || 0)}
                  placeholder="0"
                  className="w-full rounded-lg border border-purple-500/40 bg-slate-900 px-2.5 py-1 text-base font-bold text-purple-300 focus:border-purple-400 focus:outline-none"
                />
              </div>
            </div>

            {/* Total Ether Needed */}
            <div className="rounded-xl border border-slate-800 bg-slate-950/80 p-3 flex flex-col justify-between">
              <span className="text-[10px] uppercase font-bold text-slate-400 block">
                Total Vials Needed
              </span>
              <div className="mt-1.5 text-xl font-bold text-amber-300">
                {totalEther.toLocaleString()} <span className="text-xs font-normal text-slate-400">🧪 Vials</span>
              </div>
            </div>

            {/* Budget Status */}
            <div className="rounded-xl border border-slate-800 bg-slate-950/80 p-3 flex flex-col justify-between">
              <span className="text-[10px] uppercase font-bold text-slate-400 block">
                Vial Budget Status
              </span>
              <div className="mt-1.5">
                {ownedVials >= totalEther ? (
                  <div className="text-emerald-400 font-bold text-xs flex items-center space-x-1.5">
                    <CheckCircle className="h-4 w-4 shrink-0 text-emerald-400" />
                    <span>Sufficient Vials! (+{(ownedVials - totalEther).toLocaleString()} leftover)</span>
                  </div>
                ) : (
                  <div className="text-amber-400 font-bold text-xs flex items-center space-x-1.5">
                    <Sparkles className="h-4 w-4 shrink-0 text-amber-400" />
                    <span>Short by {(totalEther - ownedVials).toLocaleString()} Vials</span>
                  </div>
                )}
              </div>
            </div>
          </div>

          {/* Priority Filter */}
          <div className="flex items-center justify-between pt-2">
            <div className="flex items-center space-x-1.5 text-xs">
              <span className="text-slate-500 font-semibold mr-1">Filter Priority:</span>
              {[
                { id: 'all', label: 'All' },
                { id: 'high', label: 'High Priority' },
                { id: 'medium', label: 'Medium' },
                { id: 'low', label: 'Low' },
              ].map((p) => (
                <button
                  key={p.id}
                  onClick={() => setSelectedPriority(p.id as typeof selectedPriority)}
                  className={`rounded-lg px-2.5 py-1 font-semibold transition-all ${
                    selectedPriority === p.id
                      ? 'bg-purple-600 text-white shadow-sm'
                      : 'bg-slate-950 border border-slate-800 text-slate-400 hover:text-white'
                  }`}
                >
                  {p.label}
                </button>
              ))}
            </div>

            <span className="text-xs text-slate-500">
              Queued Cards: <strong className="text-white">{planList.length}</strong>
            </span>
          </div>
        </div>
      </div>

      {/* Craft Plan Items List */}
      <div className="space-y-3">
        {planList.length > 0 ? (
          <div className="rounded-2xl border border-slate-800 bg-slate-900/40 divide-y divide-slate-800 overflow-hidden shadow-xl">
            {planList.map(({ plan, card, neededCopies, etherCost }) => {
              const rarity = RARITIES.find((r) => r.id === card.rarity);
              const collItem = collection[card.id];
              const ownedCount = collItem ? collItem.regularCount + collItem.foilCount : 0;

              return (
                <div
                  key={card.id}
                  onClick={() => setInspectCard(card)}
                  className="flex flex-col sm:flex-row sm:items-center justify-between p-3 sm:p-4 hover:bg-slate-850/60 cursor-pointer transition-colors gap-3"
                >
                  {/* Left: Card visual & info */}
                  <div className="flex items-center space-x-3.5 min-w-0">
                    <div className="relative shrink-0">
                      <img
                        src={card.image}
                        alt={card.name}
                        className="h-14 w-11 rounded-lg object-cover border border-slate-700 shadow-md"
                      />
                      <div className="absolute -top-1.5 -left-1.5 flex h-5 w-5 items-center justify-center rounded-full bg-emerald-950 border border-emerald-500 text-[10px] font-bold text-white">
                        {card.cost}
                      </div>
                    </div>

                    <div className="min-w-0">
                      <div className="flex items-center space-x-2">
                        <span className="font-serif font-bold text-slate-100 text-sm sm:text-base truncate">
                          {card.name}
                        </span>
                        <span
                          className="rounded px-1.5 py-0.2 text-[10px] font-bold"
                          style={{ color: rarity?.color, backgroundColor: `${rarity?.color}20` }}
                        >
                          {card.rarityName}
                        </span>
                      </div>

                      <div className="text-xs text-slate-400 mt-0.5">
                        {card.className} · {card.type} · Set: {card.setName}
                      </div>

                      <div className="flex items-center space-x-2 mt-1 text-xs">
                        <span className="text-slate-300">
                          Owned: <strong>{ownedCount}</strong> / Desired: <strong>{plan.desiredCount}</strong>
                        </span>
                        <span className="text-amber-400 font-semibold">
                          (Need {neededCopies} more)
                        </span>
                        {ownedVials >= etherCost ? (
                          <span className="rounded bg-emerald-950/90 border border-emerald-500/50 px-1.5 py-0.5 text-[10px] font-bold text-emerald-300">
                            Affordable Now
                          </span>
                        ) : (
                          <span className="rounded bg-slate-900 border border-slate-700 px-1.5 py-0.5 text-[10px] text-slate-400">
                            Need {(etherCost - ownedVials).toLocaleString()} More Vials
                          </span>
                        )}
                      </div>
                    </div>
                  </div>

                  {/* Right: Priority, Cost & Actions */}
                  <div
                    className="flex items-center space-x-3 shrink-0 justify-end"
                    onClick={(e) => e.stopPropagation()}
                  >
                    {/* Priority Selector */}
                    <select
                      value={plan.priority}
                      onChange={(e) => {
                        playClick();
                        onSaveCraftPlan({
                          ...plan,
                          priority: e.target.value as 'high' | 'medium' | 'low',
                        });
                      }}
                      className={`rounded-lg px-2 py-1 text-xs font-semibold border focus:outline-none cursor-pointer ${
                        plan.priority === 'high'
                          ? 'border-rose-500/60 bg-rose-950/60 text-rose-300'
                          : plan.priority === 'medium'
                          ? 'border-amber-500/60 bg-amber-950/60 text-amber-300'
                          : 'border-slate-700 bg-slate-900 text-slate-300'
                      }`}
                    >
                      <option value="high" className="bg-slate-900">High Priority</option>
                      <option value="medium" className="bg-slate-900">Medium</option>
                      <option value="low" className="bg-slate-900">Low</option>
                    </select>

                    {/* Ether Cost */}
                    <div className="text-right min-w-[70px]">
                      <span className="text-xs font-bold text-amber-300 block">
                        {etherCost.toLocaleString()} 🧪
                      </span>
                      <span className="text-[10px] text-slate-500">
                        {VIAL_VALUES[card.rarity]?.craft} each
                      </span>
                    </div>

                    {/* "I Crafted This" Button */}
                    <button
                      onClick={() => handleCraftCard(card, plan)}
                      className="flex items-center space-x-1 rounded-lg bg-emerald-950/80 border border-emerald-500/60 px-2.5 py-1.5 text-xs font-semibold text-emerald-300 hover:bg-emerald-900 transition-colors shadow-sm"
                      title="Mark 1 copy as crafted (adds to collection)"
                    >
                      <CheckCircle className="h-3.5 w-3.5" />
                      <span>Craft (+1)</span>
                    </button>

                    {/* Remove from plan */}
                    <button
                      onClick={() => {
                        playClick();
                        onDeleteCraftPlan(card.id);
                      }}
                      className="p-1.5 rounded-lg border border-slate-800 bg-slate-950 text-slate-400 hover:text-rose-400 hover:border-rose-900/50"
                      title="Remove from Craft Planner"
                    >
                      <Trash2 className="h-4 w-4" />
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        ) : (
          <div className="flex flex-col items-center justify-center rounded-2xl border border-slate-800 bg-slate-900/30 p-12 text-center">
            <Wrench className="h-10 w-10 text-slate-600 mb-3" />
            <h3 className="font-serif text-lg font-bold text-slate-300">
              No cards in Craft Planner
            </h3>
            <p className="mt-1 text-sm text-slate-500 max-w-sm">
              Add cards from the Card Database, Deck Builder, or select a deck above to automatically queue missing cards.
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
          onUpdateCollection={(reg, foil) => onUpdateCollection(inspectCard.id, reg, foil)}
        />
      )}
    </div>
  );
};
