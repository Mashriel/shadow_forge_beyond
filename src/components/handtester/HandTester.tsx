import React, { useState, useEffect, useMemo } from 'react';
import { Card, Deck } from '../../types/card';
import { CardVisual } from '../common/CardVisual';
import { CardDetailModal } from '../cards/CardDetailModal';
import { playClick, playCardDraw } from '../../services/sound';
import {
  RotateCcw,
  Layers,
  TrendingUp,
  Sparkles,
  BarChart3,
  Percent,
  Undo2,
  CornerUpLeft,
} from 'lucide-react';

interface HandTesterProps {
  decks: Deck[];
  initialDeckId?: string;
  cardsMap: Map<string, Card>;
}

// Representation of each physical card copy in the deck
interface DeckCardItem {
  uid: string;
  cardId: string;
  copyIndex: number;
  card: Card;
}

// Hypergeometric distribution helper: P(at least 1 success)
// N = total population (whole deck), K = total successes in population, n = sample size (cards drawn so far)
function hypergeomAtLeastOne(totalPop: number, targetCount: number, sampleSize: number): number {
  if (targetCount <= 0 || sampleSize <= 0 || totalPop <= 0) return 0;
  if (targetCount >= totalPop) return 1;
  const nonTargets = totalPop - targetCount;
  if (nonTargets < sampleSize) return 1;

  let pNone = 1;
  for (let i = 0; i < sampleSize; i++) {
    pNone *= (nonTargets - i) / (totalPop - i);
  }
  return Math.max(0, Math.min(1, 1 - pNone));
}

export const HandTester: React.FC<HandTesterProps> = ({
  decks,
  initialDeckId,
  cardsMap,
}) => {
  const [selectedDeckId, setSelectedDeckId] = useState<string>(
    initialDeckId || decks[0]?.id || ''
  );

  const selectedDeck = useMemo(() => {
    return decks.find((d) => d.id === selectedDeckId) || decks[0] || null;
  }, [decks, selectedDeckId]);

  // Expand deck into individual physical card items counting every single card copy
  const fullDeckItems = useMemo<DeckCardItem[]>(() => {
    if (!selectedDeck) return [];
    const items: DeckCardItem[] = [];
    Object.entries(selectedDeck.cards).forEach(([cardId, qty]) => {
      const card = cardsMap.get(cardId);
      if (card) {
        for (let copy = 0; copy < qty; copy++) {
          items.push({
            uid: `${cardId}-copy-${copy}`,
            cardId,
            copyIndex: copy,
            card,
          });
        }
      }
    });
    return items;
  }, [selectedDeck, cardsMap]);

  // Game / Testing state
  const [drawPile, setDrawPile] = useState<DeckCardItem[]>([]);
  const [hand, setHand] = useState<DeckCardItem[]>([]);
  const [discardPile, setDiscardPile] = useState<DeckCardItem[]>([]);
  const [mulliganSelected, setMulliganSelected] = useState<Set<string>>(new Set());
  const [isMulliganPhase, setIsMulliganPhase] = useState<boolean>(true);
  const [inspectCard, setInspectCard] = useState<Card | null>(null);

  // Fisher-Yates shuffle helper
  const shuffle = (array: DeckCardItem[]): DeckCardItem[] => {
    const copy = [...array];
    for (let i = copy.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [copy[i], copy[j]] = [copy[j], copy[i]];
    }
    return copy;
  };

  // Start fresh hand & reshuffle whole deck
  const startNewHand = () => {
    if (fullDeckItems.length === 0) return;
    playCardDraw();
    const shuffled = shuffle(fullDeckItems);
    const initialHand = shuffled.slice(0, 4); // Shadowverse initial hand size is 4
    const remainingDeck = shuffled.slice(4);

    setDrawPile(remainingDeck);
    setHand(initialHand);
    setDiscardPile([]);
    setMulliganSelected(new Set());
    setIsMulliganPhase(true);
  };

  useEffect(() => {
    if (selectedDeck) {
      startNewHand();
    }
  }, [selectedDeckId]);

  // Toggle card for initial mulligan redraw
  const toggleMulligan = (uid: string) => {
    if (!isMulliganPhase) return;
    playClick();
    const next = new Set(mulliganSelected);
    if (next.has(uid)) {
      next.delete(uid);
    } else {
      next.add(uid);
    }
    setMulliganSelected(next);
  };

  // Confirm mulligan according to authentic card game rules:
  // Returned cards are set aside, replacement cards drawn from draw pile, then returned cards shuffled back
  const confirmMulligan = () => {
    playCardDraw();
    const returnedItems: DeckCardItem[] = [];
    const keptItems: DeckCardItem[] = [];

    hand.forEach((item) => {
      if (mulliganSelected.has(item.uid)) {
        returnedItems.push(item);
      } else {
        keptItems.push(item);
      }
    });

    const redrawCount = returnedItems.length;
    const drawnReplacements = drawPile.slice(0, redrawCount);
    // Shuffle returned cards back into remaining draw pile
    const newDrawPile = shuffle([...drawPile.slice(redrawCount), ...returnedItems]);

    setHand([...keptItems, ...drawnReplacements]);
    setDrawPile(newDrawPile);
    setMulliganSelected(new Set());
    setIsMulliganPhase(false);
  };

  // Draw 1 card from remaining deck into hand
  const handleDrawCard = () => {
    if (drawPile.length === 0) return;
    playCardDraw();
    const [topCard, ...rest] = drawPile;
    setHand((prev) => [...prev, topCard]);
    setDrawPile(rest);
  };

  // Quick draw multiple cards (e.g. 3 cards)
  const handleDrawMultiple = (count: number) => {
    if (drawPile.length === 0) return;
    playCardDraw();
    const toDraw = Math.min(count, drawPile.length);
    const drawn = drawPile.slice(0, toDraw);
    const rest = drawPile.slice(toDraw);
    setHand((prev) => [...prev, ...drawn]);
    setDrawPile(rest);
  };

  // Play / discard card from hand
  const handleDiscardFromHand = (uid: string) => {
    playClick();
    const item = hand.find((h) => h.uid === uid);
    if (item) {
      setHand((prev) => prev.filter((h) => h.uid !== uid));
      setDiscardPile((prev) => [...prev, item]);
    }
  };

  // Total cards drawn from whole deck so far (starting hand after redraw + subsequent draws)
  const totalCardsDrawnSoFar = hand.length + discardPile.length;

  // Probability calculations for each cost (1 to 10+)
  const costProbabilityStats = useMemo(() => {
    const totalDeckSize = fullDeckItems.length;
    const remainingDeckSize = drawPile.length;

    const costMap: Record<
      number,
      {
        cost: number;
        totalInDeck: number;
        currentlyInHand: number;
        remainingInDeck: number;
        drawnCount: number;
        nextDrawProb: number;
        seenProbability: number;
      }
    > = {};

    // Initialize costs 1 to 10
    for (let c = 1; c <= 10; c++) {
      costMap[c] = {
        cost: c,
        totalInDeck: 0,
        currentlyInHand: 0,
        remainingInDeck: 0,
        drawnCount: 0,
        nextDrawProb: 0,
        seenProbability: 0,
      };
    }

    // Count original deck cards by cost (from whole deck)
    fullDeckItems.forEach((item) => {
      const c = Math.min(10, Math.max(1, item.card.cost));
      if (!costMap[c]) {
        costMap[c] = {
          cost: c,
          totalInDeck: 0,
          currentlyInHand: 0,
          remainingInDeck: 0,
          drawnCount: 0,
          nextDrawProb: 0,
          seenProbability: 0,
        };
      }
      costMap[c].totalInDeck += 1;
    });

    // Count current hand cards by cost
    hand.forEach((item) => {
      const c = Math.min(10, Math.max(1, item.card.cost));
      if (costMap[c]) {
        costMap[c].currentlyInHand += 1;
        costMap[c].drawnCount += 1;
      }
    });

    // Count discarded/played cards by cost
    discardPile.forEach((item) => {
      const c = Math.min(10, Math.max(1, item.card.cost));
      if (costMap[c]) {
        costMap[c].drawnCount += 1;
      }
    });

    // Count remaining in draw pile and calculate probabilities
    drawPile.forEach((item) => {
      const c = Math.min(10, Math.max(1, item.card.cost));
      if (costMap[c]) {
        costMap[c].remainingInDeck += 1;
      }
    });

    // Compute probabilities taking whole deck into account for each draw
    const result = Object.values(costMap).map((row) => {
      // Probability that the VERY NEXT card drawn from remaining deck is of this cost
      const nextDrawProb =
        remainingDeckSize > 0
          ? Math.round((row.remainingInDeck / remainingDeckSize) * 1000) / 10
          : 0;

      // Cumulative hypergeometric probability: chance of having seen at least 1 card of this cost
      // given the total cards drawn from the whole deck so far (starting hand + subsequent draws)
      const seenProbability =
        totalDeckSize > 0 && totalCardsDrawnSoFar > 0
          ? Math.round(
              hypergeomAtLeastOne(totalDeckSize, row.totalInDeck, totalCardsDrawnSoFar) * 1000
            ) / 10
          : 0;

      return {
        ...row,
        nextDrawProb,
        seenProbability,
      };
    });

    return result.sort((a, b) => a.cost - b.cost);
  }, [fullDeckItems, hand, drawPile, discardPile, totalCardsDrawnSoFar]);

  // Real-time next draw stats for Cost 1, Cost 2, and Cost 3
  const getNextDrawCostStats = (targetCost: number) => {
    const totalInDeck = fullDeckItems.filter(
      (i) => Math.min(10, Math.max(1, i.card.cost)) === targetCost
    ).length;
    const inHand = hand.filter(
      (i) => Math.min(10, Math.max(1, i.card.cost)) === targetCost
    ).length;
    const remaining = drawPile.filter(
      (i) => Math.min(10, Math.max(1, i.card.cost)) === targetCost
    ).length;
    const prob =
      drawPile.length > 0 ? ((remaining / drawPile.length) * 100).toFixed(1) : '0.0';

    return {
      cost: targetCost,
      totalInDeck,
      inHand,
      remaining,
      prob,
    };
  };

  const nextDraw1 = getNextDrawCostStats(1);
  const nextDraw2 = getNextDrawCostStats(2);
  const nextDraw3 = getNextDrawCostStats(3);

  return (
    <div className="space-y-5">
      {/* Top Banner & Deck Selector */}
      <div className="rounded-2xl border border-cyan-900/40 bg-slate-900/70 p-4 sm:p-5 shadow-2xl backdrop-blur-md">
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
          <div className="flex items-center space-x-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-cyan-950 border border-cyan-500/60 shadow-[0_0_12px_rgba(6,182,212,0.4)]">
              <BarChart3 className="h-5 w-5 text-cyan-400" />
            </div>
            <div>
              <h1 className="font-serif text-xl sm:text-2xl font-bold tracking-wide text-white">
                Hand Tester & Draw Simulator
              </h1>
              <p className="text-xs text-slate-400">
                Simulate authentic opening hands, redraws, and live next-draw probabilities from your deck.
              </p>
            </div>
          </div>

          <div className="flex flex-wrap items-center gap-2.5">
            {/* Deck Selector */}
            <div className="flex items-center space-x-2 rounded-xl bg-slate-950 border border-slate-800 px-3 py-1.5 text-xs text-slate-200">
              <Layers className="h-4 w-4 text-cyan-400" />
              <select
                value={selectedDeckId}
                onChange={(e) => setSelectedDeckId(e.target.value)}
                className="bg-transparent focus:outline-none cursor-pointer font-semibold max-w-[190px] truncate"
              >
                {decks.map((d) => (
                  <option key={d.id} value={d.id} className="bg-slate-900">
                    {d.name} ({d.class})
                  </option>
                ))}
              </select>
            </div>

            {/* Restart / New Hand Button */}
            <button
              onClick={startNewHand}
              className="flex items-center space-x-1.5 rounded-xl border border-slate-700 bg-slate-950 px-3.5 py-2 text-xs font-semibold text-slate-200 hover:border-cyan-500 hover:text-white transition-colors"
            >
              <RotateCcw className="h-3.5 w-3.5 text-cyan-400" />
              <span>New Hand (4 Cards)</span>
            </button>

            {/* Draw Card Button */}
            <button
              onClick={handleDrawCard}
              disabled={drawPile.length === 0}
              className="flex items-center space-x-1.5 rounded-xl bg-gradient-to-r from-cyan-600 to-teal-500 px-4 py-2 text-xs font-bold text-slate-950 shadow-[0_0_12px_rgba(6,182,212,0.4)] hover:brightness-110 disabled:opacity-40 transition-all"
            >
              <span>Draw Card</span>
              <span className="rounded-full bg-slate-950/40 text-cyan-100 px-1.5 py-0.2 text-[10px]">
                {drawPile.length} left
              </span>
            </button>

            {/* Quick Draw 3 */}
            <button
              onClick={() => handleDrawMultiple(3)}
              disabled={drawPile.length === 0}
              className="rounded-xl border border-slate-700 bg-slate-950 px-3 py-2 text-xs font-semibold text-slate-300 hover:text-white hover:border-slate-500 disabled:opacity-30"
              title="Draw 3 cards"
            >
              +3 Cards
            </button>
          </div>
        </div>

        {/* Deck Status Bar */}
        <div className="mt-4 pt-3 border-t border-slate-800 flex flex-wrap items-center justify-between text-xs text-slate-400 gap-3">
          <div className="flex items-center space-x-4">
            <span>
              Total Deck: <strong className="text-white">{fullDeckItems.length}</strong> cards
            </span>
            <span>
              In Hand: <strong className="text-cyan-300">{hand.length}</strong>
            </span>
            <span>
              Remaining in Deck: <strong className="text-emerald-300">{drawPile.length}</strong>
            </span>
            <span>
              Drawn from Deck:{' '}
              <strong className="text-amber-300">{totalCardsDrawnSoFar}</strong> cards
            </span>
          </div>

          <div className="text-[11px] text-slate-500">
            {isMulliganPhase
              ? 'Select cards to replace and click Confirm Mulligan'
              : 'Click any card in hand to play or discard it'}
          </div>
        </div>
      </div>

      {/* MULLIGAN PHASE BANNER */}
      {isMulliganPhase && (
        <div className="rounded-2xl border border-cyan-500/50 bg-gradient-to-r from-cyan-950/80 via-slate-900 to-cyan-950/80 p-4 sm:p-5 text-center shadow-[0_0_20px_rgba(6,182,212,0.2)] space-y-3">
          <div className="flex items-center justify-center space-x-2">
            <Sparkles className="h-5 w-5 text-cyan-400 animate-spin" />
            <h2 className="font-serif text-lg font-bold text-cyan-200">
              Initial Hand — Mulligan Phase
            </h2>
          </div>
          <p className="text-xs text-slate-300 max-w-md mx-auto">
            Click cards to mark them for <strong>Return to Deck</strong>, then confirm your redraw.
          </p>

          <div className="flex items-center justify-center space-x-3 pt-1">
            <button
              onClick={confirmMulligan}
              className="flex items-center space-x-2 rounded-xl bg-gradient-to-r from-cyan-500 via-teal-400 to-emerald-400 px-6 py-2.5 text-xs sm:text-sm font-bold text-slate-950 shadow-[0_0_18px_rgba(6,182,212,0.6)] hover:brightness-110 transition-all"
            >
              <Undo2 className="h-4 w-4 text-slate-950" />
              <span>
                {mulliganSelected.size > 0
                  ? `Return Selected Cards (${mulliganSelected.size}) & Redraw`
                  : 'Keep Current Hand (0 Returned)'}
              </span>
            </button>
          </div>
        </div>
      )}

      {/* HAND ZONE */}
      <div className="rounded-2xl border border-slate-800 bg-slate-900/60 p-4 sm:p-5 shadow-2xl space-y-3">
        <div className="flex items-center justify-between text-xs text-slate-400">
          <span className="font-bold uppercase tracking-wider text-slate-300 flex items-center space-x-2">
            <span>Your Hand</span>
            <span className="rounded-full bg-cyan-950 border border-cyan-500/50 px-2 py-0.2 text-cyan-300 text-[11px]">
              {hand.length} cards
            </span>
          </span>
          <span>
            {isMulliganPhase
              ? 'Click card to toggle for mulligan redraw'
              : 'Click card to play / discard from hand'}
          </span>
        </div>

        {/* Hand Cards Rail */}
        <div className="flex flex-wrap items-center justify-center gap-3 sm:gap-5 py-4 min-h-[220px]">
          {hand.map((item) => {
            const isMulliganed = mulliganSelected.has(item.uid);

            return (
              <div
                key={item.uid}
                onClick={() => {
                  if (isMulliganPhase) {
                    toggleMulligan(item.uid);
                  } else {
                    handleDiscardFromHand(item.uid);
                  }
                }}
                className={`group/hand relative transition-all duration-200 cursor-pointer transform-gpu ${
                  isMulliganPhase && isMulliganed
                    ? '-translate-y-4 opacity-80 ring-2 ring-rose-500 rounded-xl shadow-[0_0_15px_rgba(244,63,94,0.5)]'
                    : 'hover:-translate-y-2'
                }`}
              >
                <CardVisual
                  card={item.card}
                  onDetails={() => setInspectCard(item.card)}
                  size="md"
                />

                {/* Mulligan Return Overlay */}
                {isMulliganPhase && isMulliganed && (
                  <div className="absolute inset-0 rounded-xl bg-gradient-to-b from-rose-950/95 via-slate-950/90 to-rose-950/95 border-2 border-rose-400 flex flex-col items-center justify-center p-2 pointer-events-none z-20 shadow-[0_0_20px_rgba(244,63,94,0.6)] backdrop-blur-[2px]">
                    <div className="flex h-9 w-9 items-center justify-center rounded-full bg-rose-900 border border-rose-300 shadow-lg mb-1.5">
                      <Undo2 className="h-5 w-5 text-rose-100" />
                    </div>
                    <span className="rounded-md bg-rose-950/90 border border-rose-400/80 px-2.5 py-1 text-[11px] font-extrabold text-rose-100 uppercase tracking-wider text-center shadow-lg">
                      RETURN TO DECK
                    </span>
                    <span className="mt-1 text-[10px] font-semibold text-rose-200/90 tracking-wide">
                      (Will Redraw)
                    </span>
                  </div>
                )}

                {/* Post-Mulligan Play / Discard Hint */}
                {!isMulliganPhase && (
                  <div className="absolute top-2 right-2 opacity-0 group-hover/hand:opacity-100 transition-opacity pointer-events-none z-20">
                    <span className="rounded bg-slate-950/90 border border-slate-700 px-2 py-0.5 text-[10px] font-semibold text-slate-200 shadow">
                      Click to Play
                    </span>
                  </div>
                )}
              </div>
            );
          })}

          {hand.length === 0 && (
            <div className="text-center py-10 text-slate-500 text-xs">
              Hand is currently empty. Click <strong>"Draw Card"</strong> or <strong>"New Hand"</strong> above.
            </div>
          )}
        </div>
      </div>

      {/* HAND PROBABILITY FOR EACH COST */}
      <div className="rounded-2xl border border-slate-800 bg-slate-900/60 p-4 sm:p-5 shadow-xl space-y-4">
        <div className="flex flex-wrap items-center justify-between gap-2 border-b border-slate-800/80 pb-3">
          <div className="flex items-center space-x-2">
            <TrendingUp className="h-4 w-4 text-cyan-400" />
            <h3 className="font-serif text-base font-bold text-white">
              Hand Probability by Cost
            </h3>
          </div>
          <div className="text-xs text-slate-400">
            Whole deck: <strong className="text-white">{fullDeckItems.length}</strong> cards ·{' '}
            Remaining to draw: <strong className="text-emerald-300">{drawPile.length}</strong> cards
          </div>
        </div>

        {/* Probability Table */}
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead>
              <tr className="border-b border-slate-800 text-slate-400">
                <th className="py-2.5 px-3 font-semibold">Play Point Cost</th>
                <th className="py-2.5 px-3 font-semibold">In Whole Deck</th>
                <th className="py-2.5 px-3 font-semibold">In Current Hand</th>
                <th className="py-2.5 px-3 font-semibold">Remaining in Deck</th>
                <th className="py-2.5 px-3 font-semibold">Next Draw Chance</th>
                <th className="py-2.5 px-3 font-semibold">Drawn so far</th>
                <th className="py-2.5 px-3 font-semibold">Probability Seen so far</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-800/60">
              {costProbabilityStats.map((row) => {
                const isPresent = row.totalInDeck > 0;
                return (
                  <tr
                    key={row.cost}
                    className={`transition-colors ${
                      row.currentlyInHand > 0
                        ? 'bg-cyan-950/20'
                        : isPresent
                        ? 'hover:bg-slate-850/40'
                        : 'opacity-40'
                    }`}
                  >
                    {/* Cost Orb */}
                    <td className="py-2.5 px-3">
                      <div className="flex items-center space-x-2">
                        <div className="flex h-6 w-6 items-center justify-center rounded-full border border-emerald-400/80 bg-emerald-950 text-emerald-200 font-bold text-xs shadow-sm">
                          {row.cost === 10 ? '10+' : row.cost}
                        </div>
                        <span className="font-medium text-slate-300">
                          {row.cost === 10 ? '10+ Cost' : `${row.cost}-Cost`}
                        </span>
                      </div>
                    </td>

                    {/* In Whole Deck */}
                    <td className="py-2.5 px-3 text-slate-300">
                      <strong>{row.totalInDeck}</strong>
                      <span className="text-slate-500 text-[11px] ml-1">
                        (
                        {fullDeckItems.length > 0
                          ? ((row.totalInDeck / fullDeckItems.length) * 100).toFixed(1)
                          : 0}
                        %)
                      </span>
                    </td>

                    {/* In Hand */}
                    <td className="py-2.5 px-3">
                      {row.currentlyInHand > 0 ? (
                        <span className="rounded-full bg-cyan-950 border border-cyan-500/80 px-2 py-0.5 font-bold text-cyan-300 shadow-sm">
                          {row.currentlyInHand} in hand
                        </span>
                      ) : (
                        <span className="text-slate-500">0</span>
                      )}
                    </td>

                    {/* Remaining in Deck */}
                    <td className="py-2.5 px-3 text-slate-300">
                      <strong>{row.remainingInDeck}</strong>
                      <span className="text-slate-500 text-[11px]"> / {drawPile.length}</span>
                    </td>

                    {/* Next Draw Chance */}
                    <td className="py-2.5 px-3">
                      <div className="flex items-center space-x-2">
                        <span
                          className={`font-bold ${
                            row.nextDrawProb > 25
                              ? 'text-emerald-400'
                              : row.nextDrawProb > 10
                              ? 'text-cyan-400'
                              : 'text-slate-400'
                          }`}
                        >
                          {row.nextDrawProb}%
                        </span>
                        {/* Mini progress bar */}
                        <div className="h-1.5 w-16 rounded-full bg-slate-800 overflow-hidden hidden sm:block">
                          <div
                            className="h-full bg-gradient-to-r from-cyan-500 to-emerald-400 rounded-full"
                            style={{ width: `${Math.min(100, row.nextDrawProb * 2)}%` }}
                          />
                        </div>
                      </div>
                    </td>

                    {/* Drawn so far */}
                    <td className="py-2.5 px-3 text-slate-300">
                      <span>
                        {row.drawnCount} of {row.totalInDeck}
                      </span>
                    </td>

                    {/* Probability Seen so far */}
                    <td className="py-2.5 px-3 text-slate-200">
                      <span className="font-semibold text-slate-100">
                        {row.seenProbability}%
                      </span>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>

        {/* 3 SPACES: Real-time Next Draw Percentages for Cost 1, Cost 2, and Cost 3 Cards */}
        <div className="pt-3 border-t border-slate-800 grid grid-cols-1 sm:grid-cols-3 gap-3">
          {/* Card 1: 1-Cost Card on Next Draw */}
          <div className="rounded-xl border border-slate-800 bg-slate-950 p-3.5 space-y-1.5">
            <div className="flex items-center justify-between">
              <span className="text-slate-200 font-semibold text-xs flex items-center gap-1.5">
                <span className="flex h-5 w-5 items-center justify-center rounded-full bg-emerald-950 border border-emerald-500/80 text-[11px] font-bold text-emerald-300">
                  1
                </span>
                <span>Next Draw: 1-Cost Card</span>
              </span>
              <span className="text-[11px] text-slate-400 font-medium">
                {nextDraw1.remaining} / {drawPile.length} left
              </span>
            </div>
            <div className="flex items-baseline space-x-2">
              <span className="text-2xl font-bold text-cyan-400">{nextDraw1.prob}%</span>
              <span className="text-[11px] text-slate-400">chance on next draw</span>
            </div>
            <div className="h-1.5 w-full rounded-full bg-slate-800 overflow-hidden">
              <div
                className="h-full bg-cyan-400 rounded-full transition-all duration-300"
                style={{ width: `${Math.min(100, parseFloat(nextDraw1.prob))}%` }}
              />
            </div>
            <div className="text-[10px] text-slate-500 flex justify-between">
              <span>{nextDraw1.totalInDeck} in whole deck</span>
              <span>{nextDraw1.inHand} in hand</span>
            </div>
          </div>

          {/* Card 2: 2-Cost Card on Next Draw */}
          <div className="rounded-xl border border-slate-800 bg-slate-950 p-3.5 space-y-1.5">
            <div className="flex items-center justify-between">
              <span className="text-slate-200 font-semibold text-xs flex items-center gap-1.5">
                <span className="flex h-5 w-5 items-center justify-center rounded-full bg-emerald-950 border border-emerald-500/80 text-[11px] font-bold text-emerald-300">
                  2
                </span>
                <span>Next Draw: 2-Cost Card</span>
              </span>
              <span className="text-[11px] text-slate-400 font-medium">
                {nextDraw2.remaining} / {drawPile.length} left
              </span>
            </div>
            <div className="flex items-baseline space-x-2">
              <span className="text-2xl font-bold text-emerald-400">{nextDraw2.prob}%</span>
              <span className="text-[11px] text-slate-400">chance on next draw</span>
            </div>
            <div className="h-1.5 w-full rounded-full bg-slate-800 overflow-hidden">
              <div
                className="h-full bg-emerald-400 rounded-full transition-all duration-300"
                style={{ width: `${Math.min(100, parseFloat(nextDraw2.prob))}%` }}
              />
            </div>
            <div className="text-[10px] text-slate-500 flex justify-between">
              <span>{nextDraw2.totalInDeck} in whole deck</span>
              <span>{nextDraw2.inHand} in hand</span>
            </div>
          </div>

          {/* Card 3: 3-Cost Card on Next Draw */}
          <div className="rounded-xl border border-slate-800 bg-slate-950 p-3.5 space-y-1.5">
            <div className="flex items-center justify-between">
              <span className="text-slate-200 font-semibold text-xs flex items-center gap-1.5">
                <span className="flex h-5 w-5 items-center justify-center rounded-full bg-emerald-950 border border-emerald-500/80 text-[11px] font-bold text-emerald-300">
                  3
                </span>
                <span>Next Draw: 3-Cost Card</span>
              </span>
              <span className="text-[11px] text-slate-400 font-medium">
                {nextDraw3.remaining} / {drawPile.length} left
              </span>
            </div>
            <div className="flex items-baseline space-x-2">
              <span className="text-2xl font-bold text-amber-400">{nextDraw3.prob}%</span>
              <span className="text-[11px] text-slate-400">chance on next draw</span>
            </div>
            <div className="h-1.5 w-full rounded-full bg-slate-800 overflow-hidden">
              <div
                className="h-full bg-amber-400 rounded-full transition-all duration-300"
                style={{ width: `${Math.min(100, parseFloat(nextDraw3.prob))}%` }}
              />
            </div>
            <div className="text-[10px] text-slate-500 flex justify-between">
              <span>{nextDraw3.totalInDeck} in whole deck</span>
              <span>{nextDraw3.inHand} in hand</span>
            </div>
          </div>
        </div>
      </div>

      {/* Inspect Modal */}
      {inspectCard && (
        <CardDetailModal
          card={inspectCard}
          allCardsMap={cardsMap}
          onClose={() => setInspectCard(null)}
          onSelectCard={(c) => setInspectCard(c)}
        />
      )}
    </div>
  );
};
