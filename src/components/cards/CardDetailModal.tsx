import React, { useState, useEffect, useRef } from 'react';
import { Card, CollectionItem } from '../../types/card';
import { RARITIES, CLASSES, VIAL_VALUES } from '../../services/rules';
import { parseSkillText, extractCardAbilities, TextSegment } from '../../services/cardData';
import {
  getAccelerateEffect,
  getCrestEffect,
  getFaithEffect,
  getCrystallizeEffect,
  getParsedAccelerateSegments,
  getParsedCrestSegments,
  getParsedFaithSegments,
  getParsedCrystallizeSegments,
} from '../../services/extraEffects';
import { playClick, playEvolveChime } from '../../services/sound';
import {
  X,
  Sparkles,
  HelpCircle,
  Plus,
  Minus,
  Wrench,
  BookOpen,
  ArrowRight,
  ArrowLeft,
  Layers,
  Check,
  Zap,
} from 'lucide-react';

interface CardDetailModalProps {
  card: Card;
  allCardsMap: Map<string, Card>;
  onClose: () => void;
  onSelectCard?: (card: Card) => void;
  collectionItem?: CollectionItem;
  collection?: Record<string, CollectionItem>;
  onUpdateCollection?: (regular: number, foil: number) => void;
  onAddToDeck?: (card: Card) => void;
  onAddToCraftPlan?: (card: Card) => void;
  activeDeckCardCount?: number;
}

type EvolveViewState = 'normal' | 'evolved' | 'superEvolved';

export const CardDetailModal: React.FC<CardDetailModalProps> = ({
  card,
  allCardsMap,
  onClose,
  onSelectCard,
  collectionItem,
  collection,
  onUpdateCollection,
  onAddToDeck,
  onAddToCraftPlan,
  activeDeckCardCount,
}) => {
  // Navigation stack to allow navigating back and forth across related tokens/cards
  const [activeCard, setActiveCard] = useState<Card>(card);
  const [history, setHistory] = useState<Card[]>([]);

  const [evoState, setEvoState] = useState<EvolveViewState>('normal');
  const [activeTab, setActiveTab] = useState<'skills' | 'lore' | 'rulings'>('skills');

  const accelEffect = getAccelerateEffect(activeCard.id);
  const crestEffect = getCrestEffect(activeCard.id);
  const faithEffect = getFaithEffect(activeCard.id);
  const crystallizeEffect = getCrystallizeEffect(activeCard.id);

  // Track root card ID to only reset navigation when the external card changes
  const rootCardIdRef = useRef(card.id);
  useEffect(() => {
    if (card.id !== rootCardIdRef.current) {
      rootCardIdRef.current = card.id;
      setActiveCard(card);
      setHistory([]);
      setEvoState('normal');
    }
  }, [card.id]);

  const rarityConfig = RARITIES.find((r) => r.id === activeCard.rarity) || RARITIES[0];
  const classConfig = CLASSES.find((c) => c.name === activeCard.className) || CLASSES[CLASSES.length - 1];
  const vialData = VIAL_VALUES[activeCard.rarity] || { craft: 50, liquefyRegular: 10, liquefyFoil: 30 };

  const abilities = extractCardAbilities(activeCard);

  // Get collection counts for current active card
  const currentItem = collection
    ? collection[activeCard.id]
    : activeCard.id === card.id
    ? collectionItem
    : undefined;
  const regularCount = currentItem?.regularCount || 0;
  const foilCount = currentItem?.foilCount || 0;

  const setEvo = (state: EvolveViewState) => {
    if (state !== 'normal' && evoState === 'normal') {
      playEvolveChime();
    } else {
      playClick();
    }
    setEvoState(state);
  };

  const handleCollectionChange = (diffReg: number, diffFoil: number) => {
    if (!onUpdateCollection) return;
    const nextReg = Math.max(0, Math.min(3, regularCount + diffReg));
    const nextFoil = Math.max(0, Math.min(3, foilCount + diffFoil));
    onUpdateCollection(nextReg, nextFoil);
  };

  // Follower stats calculation based on evolution mode
  const currentAtk =
    evoState === 'superEvolved'
      ? activeCard.atk + 3
      : evoState === 'evolved'
      ? activeCard.atk + 2
      : activeCard.atk;

  const currentLife =
    evoState === 'superEvolved'
      ? activeCard.life + 3
      : evoState === 'evolved'
      ? activeCard.life + 2
      : activeCard.life;

  // Resilient related card lookup
  const getRelatedCard = (rid: string | number): Card | undefined => {
    const strId = String(rid);
    if (allCardsMap.has(strId)) return allCardsMap.get(strId);
    const numId = Number(rid);
    if (!isNaN(numId) && allCardsMap.has(String(numId))) return allCardsMap.get(String(numId));
    return Array.from(allCardsMap.values()).find(
      (c) => c.id === strId || c.slug === strId || c.name.toLowerCase() === strId.toLowerCase()
    );
  };

  // Navigate to a related card and remember current in history stack
  const handleSelectRelatedCard = (relCard: Card) => {
    playClick();
    setHistory((prev) => [...prev, activeCard]);
    setActiveCard(relCard);
    setEvoState('normal');
  };

  // Go back to the previously inspected card
  const handleGoBack = () => {
    playClick();
    if (history.length > 0) {
      const prevCard = history[history.length - 1];
      setHistory((prev) => prev.slice(0, -1));
      setActiveCard(prevCard);
      setEvoState('normal');
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 overflow-y-auto bg-black/85 backdrop-blur-md">
      <div
        className="relative w-full max-w-4xl rounded-2xl border border-cyan-800/40 bg-slate-950 p-4 sm:p-6 text-slate-100 shadow-[0_0_30px_rgba(0,0,0,0.9)] max-h-[92vh] flex flex-col gap-4 overflow-y-auto"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Top Header: Back Button, Breadcrumbs & Close Button */}
        <div className="flex items-center justify-between pb-3 border-b border-slate-800/80">
          <div className="flex items-center space-x-2 overflow-x-auto pr-4">
            {history.length > 0 ? (
              <button
                onClick={handleGoBack}
                className="flex items-center space-x-1.5 rounded-xl bg-cyan-950/90 border border-cyan-500/80 px-3.5 py-1.5 text-xs font-semibold text-cyan-200 hover:bg-cyan-900 hover:text-white transition-all shadow-[0_0_12px_rgba(6,182,212,0.3)] shrink-0 active:scale-95"
                title={`Back to ${history[history.length - 1].name}`}
              >
                <ArrowLeft className="h-4 w-4 text-cyan-400" />
                <span>Back to {history[history.length - 1].name}</span>
              </button>
            ) : (
              <span className="text-xs font-semibold text-slate-400 flex items-center space-x-1.5">
                <Sparkles className="h-3.5 w-3.5 text-cyan-400" />
                <span>Card Details</span>
              </span>
            )}

            {/* Breadcrumb Trail */}
            {history.length > 0 && (
              <div className="hidden sm:flex items-center space-x-1.5 text-[11px] text-slate-500 overflow-x-auto pl-2 border-l border-slate-800">
                {history.map((hCard, idx) => (
                  <React.Fragment key={idx}>
                    <button
                      onClick={() => {
                        playClick();
                        const target = history[idx];
                        setHistory(history.slice(0, idx));
                        setActiveCard(target);
                        setEvoState('normal');
                      }}
                      className="text-slate-400 hover:text-cyan-300 transition-colors truncate max-w-[120px] font-medium"
                    >
                      {hCard.name}
                    </button>
                    <span className="text-slate-600 font-bold">&gt;</span>
                  </React.Fragment>
                ))}
                <span className="text-cyan-300 font-bold truncate max-w-[150px]">
                  {activeCard.name}
                </span>
              </div>
            )}
          </div>

          {/* Close Modal Button */}
          <button
            onClick={onClose}
            className="flex h-8 w-8 items-center justify-center rounded-full bg-slate-900 border border-slate-700 text-slate-400 hover:text-white hover:border-slate-500 shrink-0 ml-auto transition-colors"
            title="Close"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        {/* Modal Body: Left Artwork Column & Right Details Column */}
        <div className="flex flex-col md:flex-row gap-6">
          {/* Left Column: Artwork & Visual Card Display */}
          <div className="flex flex-col items-center md:w-80 shrink-0">
            <div
              className={`relative rounded-xl overflow-hidden border w-64 sm:w-72 aspect-[530/687] shadow-2xl transition-all duration-300 bg-slate-950 flex items-center justify-center ${
                evoState === 'superEvolved'
                  ? 'border-purple-500 shadow-[0_0_25px_rgba(168,85,247,0.45)]'
                  : evoState === 'evolved'
                  ? 'border-amber-500 shadow-[0_0_20px_rgba(245,158,11,0.35)]'
                  : 'border-slate-800 shadow-xl'
              }`}
            >
              <img
                src={evoState !== 'normal' && activeCard.imageBack ? activeCard.imageBack : activeCard.image}
                alt={activeCard.name}
                className="h-full w-full object-contain object-top"
              />

              {/* Followers ATK/DEF */}
              {activeCard.type === 'Follower' && (
                <div className="absolute bottom-2 inset-x-2 flex items-center justify-between px-2">
                  <div
                    className={`flex items-center space-x-1 rounded-lg px-2.5 py-1 border font-bold text-sm shadow-md transition-all ${
                      evoState === 'superEvolved'
                        ? 'bg-purple-950/95 border-purple-400 text-purple-200 shadow-[0_0_12px_rgba(168,85,247,0.6)]'
                        : evoState === 'evolved'
                        ? 'bg-amber-950/95 border-amber-400 text-amber-200 shadow-[0_0_12px_rgba(245,158,11,0.6)]'
                        : 'bg-amber-950/90 border-amber-500 text-amber-300'
                    }`}
                  >
                    <span>⚔️</span>
                    <span>{currentAtk}</span>
                  </div>
                  <div
                    className={`flex items-center space-x-1 rounded-lg px-2.5 py-1 border font-bold text-sm shadow-md transition-all ${
                      evoState === 'superEvolved'
                        ? 'bg-purple-950/95 border-purple-400 text-purple-200 shadow-[0_0_12px_rgba(168,85,247,0.6)]'
                        : evoState === 'evolved'
                        ? 'bg-sky-950/95 border-sky-400 text-sky-200 shadow-[0_0_12px_rgba(56,189,248,0.6)]'
                        : 'bg-sky-950/90 border-sky-500 text-sky-300'
                    }`}
                  >
                    <span>🛡️</span>
                    <span>{currentLife}</span>
                  </div>
                </div>
              )}
            </div>

            {/* Evolution State Toggle (Normal | Evolved (Yellow) | Super-Evolved (Purple)) */}
            {activeCard.type === 'Follower' && (
              <div className="mt-4 flex rounded-lg border border-slate-800 bg-slate-900/80 p-1 w-full max-w-xs justify-center space-x-1">
                <button
                  onClick={() => setEvo('normal')}
                  className={`flex-1 rounded-md py-1.5 text-xs font-semibold transition-all ${
                    evoState === 'normal'
                      ? 'bg-slate-700 text-white shadow-sm'
                      : 'text-slate-400 hover:text-slate-200'
                  }`}
                >
                  Normal
                </button>

                <button
                  onClick={() => setEvo('evolved')}
                  className={`flex-1 rounded-md py-1.5 text-xs font-semibold transition-all flex items-center justify-center space-x-1 ${
                    evoState === 'evolved'
                      ? 'bg-amber-600 text-white shadow-[0_0_10px_rgba(245,158,11,0.5)]'
                      : 'text-amber-400/80 hover:text-amber-300'
                  }`}
                  title="Evolve (+2/+2)"
                >
                  <Sparkles className="h-3 w-3 mr-0.5" />
                  <span>Evolve</span>
                </button>

                <button
                  onClick={() => setEvo('superEvolved')}
                  className={`flex-1 rounded-md py-1.5 text-xs font-semibold transition-all flex items-center justify-center space-x-1 ${
                    evoState === 'superEvolved'
                      ? 'bg-purple-600 text-white shadow-[0_0_12px_rgba(168,85,247,0.6)]'
                      : 'text-purple-400/80 hover:text-purple-300'
                  }`}
                  title="Super-Evolve (+3/+3)"
                >
                  <Zap className="h-3 w-3 mr-0.5" />
                  <span>Super</span>
                </button>
              </div>
            )}

            {/* Quick Add To Deck & Craft buttons */}
            <div className="mt-4 w-full flex flex-col gap-2">
              {onAddToDeck && !activeCard.isToken && (
                <button
                  onClick={() => {
                    playClick();
                    onAddToDeck(activeCard);
                  }}
                  disabled={(activeDeckCardCount || 0) >= 3}
                  className={`flex w-full items-center justify-center space-x-2 rounded-lg py-2 px-3 text-sm font-semibold transition-all ${
                    (activeDeckCardCount || 0) >= 3
                      ? 'bg-slate-800 text-slate-500 cursor-not-allowed border border-slate-700'
                      : 'bg-cyan-900/80 border border-cyan-500/70 text-cyan-200 hover:bg-cyan-800 shadow-[0_0_12px_rgba(6,182,212,0.3)]'
                  }`}
                >
                  <Plus className="h-4 w-4" />
                  <span>Add to Active Deck ({activeDeckCardCount || 0}/3)</span>
                </button>
              )}

              {onAddToCraftPlan && !activeCard.isToken && (
                <button
                  onClick={() => {
                    playClick();
                    onAddToCraftPlan(activeCard);
                  }}
                  className="flex w-full items-center justify-center space-x-2 rounded-lg py-1.5 px-3 text-xs font-medium bg-slate-900 border border-slate-700 text-slate-300 hover:border-slate-500 hover:text-white"
                >
                  <Wrench className="h-3.5 w-3.5 text-amber-400" />
                  <span>Add to Craft Planner</span>
                </button>
              )}
            </div>
          </div>

          {/* Right Column: Information, Abilities, Rulings & Collection */}
          <div className="flex-1 flex flex-col min-w-0">
            {/* Header Title */}
            <div>
              <div className="flex flex-wrap items-center gap-2 mb-1">
                <span
                  className="rounded px-2 py-0.5 text-xs font-semibold tracking-wide uppercase border"
                  style={{
                    color: classConfig.color,
                    borderColor: `${classConfig.color}40`,
                    backgroundColor: `${classConfig.color}15`,
                  }}
                >
                  {activeCard.className}
                </span>
                <span className="rounded bg-slate-800/80 border border-slate-700 px-2 py-0.5 text-xs text-slate-300">
                  {activeCard.type}
                </span>
                <span
                  className="rounded px-2 py-0.5 text-xs font-medium border"
                  style={{
                    color: rarityConfig.color,
                    borderColor: `${rarityConfig.color}50`,
                    backgroundColor: `${rarityConfig.color}10`,
                  }}
                >
                  {activeCard.rarityName}
                </span>
                {activeCard.isRotation && (
                  <span className="rounded bg-indigo-950/80 border border-indigo-500/50 px-2 py-0.5 text-xs text-indigo-300">
                    Rotation Legal
                  </span>
                )}
                {activeCard.isToken && (
                  <span className="rounded bg-rose-950/80 border border-rose-500/50 px-2 py-0.5 text-xs text-rose-300">
                    Token Card
                  </span>
                )}
              </div>

              <h2 className="text-xl sm:text-2xl font-serif font-bold text-white tracking-wide">
                {activeCard.name}
              </h2>

              {/* Tribes / Traits */}
              {activeCard.tribes.length > 0 && (
                <div className="mt-1 flex flex-wrap gap-1">
                  {activeCard.tribes.map((tr) => (
                    <span
                      key={tr}
                      className="rounded bg-slate-800/60 border border-slate-700 px-1.5 py-0.5 text-[11px] text-amber-300"
                    >
                      #{tr}
                    </span>
                  ))}
                </div>
              )}
            </div>

            {/* Sub Navigation Tabs */}
            <div className="mt-4 flex border-b border-slate-800">
              <button
                onClick={() => {
                  playClick();
                  setActiveTab('skills');
                }}
                className={`flex items-center space-x-1.5 px-4 py-2 text-xs sm:text-sm font-semibold border-b-2 transition-colors ${
                  activeTab === 'skills'
                    ? 'border-cyan-400 text-cyan-300'
                    : 'border-transparent text-slate-400 hover:text-slate-200'
                }`}
              >
                <Sparkles className="h-4 w-4" />
                <span>Abilities</span>
              </button>
              <button
                onClick={() => {
                  playClick();
                  setActiveTab('lore');
                }}
                className={`flex items-center space-x-1.5 px-4 py-2 text-xs sm:text-sm font-semibold border-b-2 transition-colors ${
                  activeTab === 'lore'
                    ? 'border-cyan-400 text-cyan-300'
                    : 'border-transparent text-slate-400 hover:text-slate-200'
                }`}
              >
                <BookOpen className="h-4 w-4" />
                <span>Lore & Credits</span>
              </button>
              {activeCard.questions.length > 0 && (
                <button
                  onClick={() => {
                    playClick();
                    setActiveTab('rulings');
                  }}
                  className={`flex items-center space-x-1.5 px-4 py-2 text-xs sm:text-sm font-semibold border-b-2 transition-colors ${
                    activeTab === 'rulings'
                      ? 'border-cyan-400 text-cyan-300'
                      : 'border-transparent text-slate-400 hover:text-slate-200'
                  }`}
                >
                  <HelpCircle className="h-4 w-4" />
                  <span>Rulings & Q&A ({activeCard.questions.length})</span>
                </button>
              )}
            </div>

            {/* Tab Content */}
            <div className="flex-1 py-4 overflow-y-auto space-y-4">
              {/* SKILLS TAB */}
              {activeTab === 'skills' && (
                <div className="space-y-4">
                  {/* Accelerate Callout if present */}
                  {accelEffect && (
                    <div className="rounded-xl border border-emerald-500/50 bg-emerald-950/25 p-3.5">
                      <div className="text-xs font-bold uppercase tracking-wider text-emerald-400 mb-2 flex items-center justify-between">
                        <div className="flex items-center space-x-1.5">
                          <Zap className="h-3.5 w-3.5 text-emerald-400" />
                          <span>Accelerate Effect</span>
                        </div>
                        <span className="rounded bg-emerald-900/80 border border-emerald-500/50 px-2 py-0.5 text-[10px] text-emerald-200 font-semibold">
                          Accelerate ({accelEffect.cost} PP)
                        </span>
                      </div>
                      <div className="text-sm leading-relaxed text-slate-200 whitespace-pre-line">
                        {renderSkillSegments(getParsedAccelerateSegments(accelEffect))}
                      </div>
                    </div>
                  )}

                  {/* Crest Callout if present */}
                  {crestEffect && (
                    <div className="rounded-xl border border-orange-500/50 bg-orange-950/25 p-3.5">
                      <div className="text-xs font-bold uppercase tracking-wider text-orange-400 mb-2 flex items-center justify-between">
                        <div className="flex items-center space-x-1.5">
                          <span>⚜️</span>
                          <span>Crest Effect</span>
                        </div>
                        <span className="rounded bg-orange-900/80 border border-orange-500/50 px-2 py-0.5 text-[10px] text-orange-200 font-semibold">
                          {crestEffect.crestName}
                        </span>
                      </div>
                      <div className="text-sm leading-relaxed text-slate-200 whitespace-pre-line">
                        {renderSkillSegments(getParsedCrestSegments(crestEffect))}
                      </div>
                    </div>
                  )}

                  {/* Faith Callout if present */}
                  {faithEffect && (
                    <div className="rounded-xl border border-cyan-500/50 bg-cyan-950/25 p-3.5">
                      <div className="text-xs font-bold uppercase tracking-wider text-cyan-300 mb-2 flex items-center justify-between">
                        <div className="flex items-center space-x-1.5">
                          <span>✨</span>
                          <span>Faith Mechanic</span>
                        </div>
                        <span className="rounded bg-cyan-900/80 border border-cyan-500/50 px-2 py-0.5 text-[10px] text-cyan-200 font-semibold">
                          {faithEffect.faithName}
                        </span>
                      </div>
                      <div className="text-sm leading-relaxed text-slate-200 whitespace-pre-line">
                        {renderSkillSegments(getParsedFaithSegments(faithEffect))}
                      </div>
                    </div>
                  )}

                  {/* Crystallize Callout if present */}
                  {crystallizeEffect && (
                    <div className="rounded-xl border border-sky-400/60 bg-sky-950/30 p-3.5">
                      <div className="text-xs font-bold uppercase tracking-wider text-sky-300 mb-2 flex items-center justify-between">
                        <div className="flex items-center space-x-1.5">
                          <span>💎</span>
                          <span>Crystallize Effect</span>
                        </div>
                        <span className="rounded bg-sky-900/80 border border-sky-400/50 px-2 py-0.5 text-[10px] text-sky-200 font-semibold">
                          Crystallize ({crystallizeEffect.cost} PP)
                        </span>
                      </div>
                      <div className="text-sm leading-relaxed text-slate-200 whitespace-pre-line">
                        {renderSkillSegments(getParsedCrystallizeSegments(crystallizeEffect))}
                      </div>
                    </div>
                  )}

                  {/* 1. Base Abilities */}
                  {(abilities.hasBase || (!abilities.hasEvo && !abilities.hasSuperEvo)) && (
                    <div className="rounded-xl border border-slate-800 bg-slate-900/50 p-3.5">
                      <div className="text-xs font-bold uppercase tracking-wider text-slate-400 mb-2 flex items-center justify-between">
                        <span>Base Abilities</span>
                        <span className="text-[11px] text-slate-500 font-semibold">Cost: {activeCard.cost} PP</span>
                      </div>
                      <div className="text-sm leading-relaxed text-slate-200 whitespace-pre-line">
                        {renderSkillSegments(abilities.baseSegments)}
                      </div>
                    </div>
                  )}

                  {/* 2. Evolve Abilities */}
                  {abilities.hasEvo && (
                    <div className="rounded-xl border border-amber-500/50 bg-amber-950/25 p-3.5">
                      <div className="text-xs font-bold uppercase tracking-wider text-amber-400 mb-2 flex items-center justify-between">
                        <div className="flex items-center space-x-1.5">
                          <Sparkles className="h-3.5 w-3.5 text-amber-400" />
                          <span className="text-amber-300">Evolve Abilities</span>
                        </div>
                        <span className="rounded bg-amber-900/80 border border-amber-500/50 px-2 py-0.5 text-[10px] text-amber-200 font-semibold">
                          +2/+2 Stat Boost
                        </span>
                      </div>
                      <div className="text-sm leading-relaxed text-slate-200 whitespace-pre-line">
                        {renderSkillSegments(abilities.evoSegments)}
                      </div>
                    </div>
                  )}

                  {/* 3. Super-Evolve Abilities */}
                  {abilities.hasSuperEvo && (
                    <div className="rounded-xl border border-purple-500/50 bg-purple-950/25 p-3.5">
                      <div className="text-xs font-bold uppercase tracking-wider text-purple-300 mb-2 flex items-center justify-between">
                        <div className="flex items-center space-x-1.5">
                          <Zap className="h-3.5 w-3.5 text-purple-400" />
                          <span className="text-purple-300">Super-Evolve Abilities</span>
                        </div>
                        <span className="rounded bg-purple-900/80 border border-purple-500/50 px-2 py-0.5 text-[10px] text-purple-200 font-semibold shadow-sm">
                          +3/+3 Super Boost
                        </span>
                      </div>
                      <div className="text-sm leading-relaxed text-slate-200 whitespace-pre-line">
                        {renderSkillSegments(abilities.superEvoSegments)}
                      </div>
                    </div>
                  )}

                  {/* Related Cards / Tokens */}
                  {activeCard.relatedCards && activeCard.relatedCards.length > 0 && (
                    <div className="rounded-xl border border-slate-800 bg-slate-900/40 p-3.5">
                      <div className="text-xs font-bold uppercase tracking-wider text-slate-400 mb-2 flex items-center justify-between">
                        <div className="flex items-center space-x-1.5">
                          <Layers className="h-3.5 w-3.5 text-cyan-400" />
                          <span>Related Tokens & Cards</span>
                        </div>
                        <span className="text-[11px] text-slate-500">Click to inspect</span>
                      </div>
                      <div className="flex flex-wrap gap-2">
                        {activeCard.relatedCards.map((rid) => {
                          const relCard = getRelatedCard(rid);
                          if (!relCard) return null;
                          return (
                            <button
                              key={rid}
                              onClick={() => handleSelectRelatedCard(relCard)}
                              className="group flex items-center space-x-2.5 rounded-xl border border-slate-700/80 bg-slate-800/80 hover:bg-slate-800 px-3 py-2 text-xs text-slate-200 hover:border-cyan-400 hover:text-white transition-all shadow-sm hover:shadow-[0_0_12px_rgba(6,182,212,0.25)]"
                            >
                              <img
                                src={relCard.image}
                                alt={relCard.name}
                                className="h-8 w-8 rounded-lg object-cover border border-slate-700 group-hover:border-cyan-500"
                              />
                              <div className="flex flex-col text-left">
                                <span className="font-semibold text-cyan-300 group-hover:text-cyan-200 leading-tight">
                                  {relCard.name}
                                </span>
                                <span className="text-[10px] text-slate-400">
                                  {relCard.type} • {relCard.cost} PP
                                </span>
                              </div>
                              <ArrowRight className="h-3.5 w-3.5 text-slate-400 group-hover:text-cyan-300 group-hover:translate-x-0.5 transition-transform ml-1" />
                            </button>
                          );
                        })}
                      </div>
                    </div>
                  )}
                </div>
              )}

              {/* LORE TAB */}
              {activeTab === 'lore' && (
                <div className="space-y-4">
                  <div className="rounded-xl border border-slate-800 bg-slate-900/40 p-3.5">
                    <div className="text-xs font-bold uppercase tracking-wider text-slate-400 mb-2">
                      Card Flavor Text (Normal)
                    </div>
                    <p className="text-sm italic leading-relaxed text-slate-300">
                      {parseSimpleHtml(activeCard.flavorText) || 'No flavor text recorded.'}
                    </p>
                  </div>

                  {activeCard.evoFlavorText && (
                    <div className="rounded-xl border border-amber-900/30 bg-amber-950/10 p-3.5">
                      <div className="text-xs font-bold uppercase tracking-wider text-amber-400 mb-2">
                        Flavor Text (Evolved)
                      </div>
                      <p className="text-sm italic leading-relaxed text-amber-200/90">
                        {parseSimpleHtml(activeCard.evoFlavorText)}
                      </p>
                    </div>
                  )}

                  {/* Production Credits */}
                  <div className="rounded-xl border border-slate-800 bg-slate-900/50 p-3.5 grid grid-cols-2 gap-4 text-xs">
                    <div>
                      <span className="text-slate-500 block">Illustrator / Artist</span>
                      <span className="font-medium text-slate-200">{activeCard.illustrator || 'Official Artist'}</span>
                    </div>
                    <div>
                      <span className="text-slate-500 block">Voice Actor (CV)</span>
                      <span className="font-medium text-slate-200">{activeCard.cv || '—'}</span>
                    </div>
                    <div>
                      <span className="text-slate-500 block">Card Set</span>
                      <span className="font-medium text-slate-200">{activeCard.setName}</span>
                    </div>
                    <div>
                      <span className="text-slate-500 block">Card ID</span>
                      <span className="font-mono text-slate-400">{activeCard.id}</span>
                    </div>
                  </div>
                </div>
              )}

              {/* RULINGS TAB */}
              {activeTab === 'rulings' && (
                <div className="space-y-3">
                  {activeCard.questions.map((q, idx) => (
                    <div
                      key={idx}
                      className="rounded-xl border border-slate-800 bg-slate-900/50 p-3.5 space-y-2 text-xs"
                    >
                      <div className="flex items-start space-x-2">
                        <span className="rounded bg-cyan-950 border border-cyan-700 px-1.5 py-0.5 text-[10px] font-bold text-cyan-300 shrink-0">
                          Q
                        </span>
                        <p className="font-semibold text-slate-200 leading-relaxed">{q.question}</p>
                      </div>
                      <div className="flex items-start space-x-2 pt-2 border-t border-slate-800">
                        <span className="rounded bg-emerald-950 border border-emerald-700 px-1.5 py-0.5 text-[10px] font-bold text-emerald-300 shrink-0">
                          A
                        </span>
                        <p className="text-slate-300 leading-relaxed">{q.answer}</p>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* Footer Bar: Vials & In-Collection Controls */}
            <div className="pt-4 border-t border-slate-800/80 flex flex-wrap items-center justify-between gap-3 text-xs">
              {/* Vial values */}
              <div className="flex items-center space-x-3 text-slate-400">
                <div className="flex items-center space-x-1">
                  <span className="text-amber-400 font-bold">⚗️ {vialData.craft}</span>
                  <span className="text-[11px] text-slate-500">to create</span>
                </div>
                <div className="flex items-center space-x-1">
                  <span className="text-slate-300 font-bold">⚗️ {vialData.liquefyRegular}</span>
                  <span className="text-[11px] text-slate-500">liquefy</span>
                </div>
              </div>

              {/* Collection Stepper */}
              {onUpdateCollection && !activeCard.isToken && (
                <div className="flex items-center space-x-3 bg-slate-900/90 border border-slate-800 rounded-xl px-3 py-1.5 ml-auto">
                  <span className="text-slate-400 font-medium">In Collection:</span>

                  {/* Regular Count */}
                  <div className="flex items-center space-x-1.5">
                    <span className="text-[11px] text-slate-500">Reg</span>
                    <button
                      onClick={() => handleCollectionChange(-1, 0)}
                      disabled={regularCount <= 0}
                      className="h-5 w-5 rounded bg-slate-800 text-slate-300 flex items-center justify-center disabled:opacity-30 hover:bg-slate-700 active:scale-125 active:bg-rose-500 active:text-slate-950 transition-all duration-100"
                    >
                      <Minus className="h-3 w-3" />
                    </button>
                    <span className="font-bold text-white w-4 text-center">{regularCount}</span>
                    <button
                      onClick={() => handleCollectionChange(1, 0)}
                      disabled={regularCount >= 3}
                      className="h-5 w-5 rounded bg-slate-800 text-slate-300 flex items-center justify-center disabled:opacity-30 hover:bg-slate-700 active:scale-125 active:bg-cyan-400 active:text-slate-950 active:shadow-[0_0_10px_rgba(6,182,212,0.9)] transition-all duration-100"
                    >
                      <Plus className="h-3 w-3" />
                    </button>
                  </div>

                  <div className="h-3.5 w-px bg-slate-800" />

                  {/* Foil Count */}
                  <div className="flex items-center space-x-1.5">
                    <span className="text-[11px] text-amber-400">Foil</span>
                    <button
                      onClick={() => handleCollectionChange(0, -1)}
                      disabled={foilCount <= 0}
                      className="h-5 w-5 rounded bg-slate-800 text-slate-300 flex items-center justify-center disabled:opacity-30 hover:bg-slate-700 active:scale-125 active:bg-rose-500 active:text-slate-950 transition-all duration-100"
                    >
                      <Minus className="h-3 w-3" />
                    </button>
                    <span className="font-bold text-amber-300 w-4 text-center">{foilCount}</span>
                    <button
                      onClick={() => handleCollectionChange(0, 1)}
                      disabled={foilCount >= 3}
                      className="h-5 w-5 rounded bg-slate-800 text-slate-300 flex items-center justify-center disabled:opacity-30 hover:bg-slate-700 active:scale-125 active:bg-amber-400 active:text-slate-950 active:shadow-[0_0_10px_rgba(245,158,11,0.9)] transition-all duration-100"
                    >
                      <Plus className="h-3 w-3" />
                    </button>
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

function renderSkillSegments(segments: TextSegment[]) {
  if (!segments || segments.length === 0) return <span className="text-slate-500 italic">No abilities.</span>;

  return segments.map((seg, idx) => {
    if (seg.isDivider) {
      return <hr key={idx} className="my-2 border-slate-700/60" />;
    }

    if (seg.text === '\n') {
      return <br key={idx} />;
    }

    const cleanText = seg.text.replace(/<[^>]+>/g, '');

    // Crest references (e.g. Crest: Lhynkal, Wandering Fool)
    if (/^Crest:/i.test(cleanText.trim())) {
      return (
        <span
          key={idx}
          className="inline-flex items-center gap-1 font-bold italic text-amber-300 bg-amber-950/50 border border-amber-500/40 px-1.5 py-0.5 rounded text-xs mx-0.5 shadow-sm"
        >
          <span>⚜️</span>
          <span>{cleanText}</span>
        </span>
      );
    }

    // Strictly the Super-Evolve keyword badge (purple)
    if (seg.isSuperEvolveKeyword || /^super-evolve:?$/i.test(cleanText.trim())) {
      return (
        <span
          key={idx}
          className="inline-flex items-center gap-1 font-bold text-purple-300 bg-purple-950/90 border border-purple-500/60 px-1.5 py-0.5 rounded text-xs shadow-[0_0_8px_rgba(168,85,247,0.3)] mx-0.5"
        >
          <Zap className="h-3 w-3 text-purple-400 inline" />
          {cleanText}
        </span>
      );
    }

    // Strictly the Evolve keyword badge (yellow)
    if (seg.isEvolveKeyword || /^evolve:?$/i.test(cleanText.trim())) {
      return (
        <span
          key={idx}
          className="inline-flex items-center gap-1 font-bold text-amber-300 bg-amber-950/90 border border-amber-500/60 px-1.5 py-0.5 rounded text-xs shadow-[0_0_8px_rgba(245,158,11,0.3)] mx-0.5"
        >
          <Sparkles className="h-3 w-3 text-amber-400 inline" />
          {cleanText}
        </span>
      );
    }

    // Spellboost keyword badge (sky/blue)
    if (seg.isKeyword && /spellboost/i.test(cleanText)) {
      return (
        <span
          key={idx}
          className="inline-block font-bold px-1.5 py-0.5 rounded text-xs shadow-sm mx-0.5 text-sky-200 bg-sky-950/90 border border-sky-600/70 shadow-[0_0_8px_rgba(56,189,248,0.3)]"
        >
          {cleanText}
        </span>
      );
    }

    // Accelerate keyword badge (teal/cyan)
    if (seg.isAccelerateKeyword || /^accelerate(?:\s*\(\d+\))?:?$/i.test(cleanText.trim())) {
      return (
        <span
          key={idx}
          className="inline-block font-bold px-1.5 py-0.5 rounded text-xs shadow-sm mx-0.5 text-teal-300 bg-teal-950/90 border border-teal-500/60 shadow-[0_0_8px_rgba(20,184,166,0.3)]"
        >
          {cleanText}
        </span>
      );
    }

    // Standard Keywords (Ward, Intimidate, Storm, Rush, Bane, Drain, Ambush, Fanfare, etc.)
    if (seg.isKeyword) {
      return (
        <span
          key={idx}
          className="inline-block font-bold px-1.5 py-0.5 rounded text-xs shadow-sm mx-0.5 text-cyan-300 bg-cyan-950/80 border border-cyan-800/60"
        >
          {cleanText}
        </span>
      );
    }

    let className = 'text-slate-200';
    if (seg.isBold) className += ' font-bold text-white';
    if (seg.isItalic) className += ' italic text-slate-300';

    return (
      <span key={idx} className={className}>
        {cleanText}
      </span>
    );
  });
}

function parseSimpleHtml(str: string) {
  const clean = str.replace(/<\/?i>/gi, '').replace(/<[^>]+>/g, '');
  return clean;
}
