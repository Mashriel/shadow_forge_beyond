import React, { useState, useMemo } from 'react';
import { Card, ClassName, CollectionItem, Deck, DeckFormat } from '../../types/card';
import { CardVisual } from '../common/CardVisual';
import { CardDetailModal } from '../cards/CardDetailModal';
import {
  AdvanceFiltersPanel,
  AdvanceFiltersState,
  initialAdvanceFilters,
  countActiveAdvanceFilters,
  matchAdvanceFilters,
} from '../cards/AdvanceFiltersPanel';
import {
  canCardBeInDeck,
  isCardLegalInFormat,
  getDeckCardCount,
  validateDeck,
  DECK_SIZE_LIMIT,
  MAX_COPIES_PER_CARD,
  CLASSES,
  RARITIES,
  VIAL_VALUES,
  FORMATS,
} from '../../services/rules';
import { getAvailableTagsForClass, PLAYSTYLE_TAGS } from '../../services/deckTags';
import { playClick, playCardPlay, playCardDraw } from '../../services/sound';
import {
  Save,
  ArrowLeft,
  Plus,
  Minus,
  Trash2,
  Share2,
  Sword,
  Wrench,
  Search,
  Filter,
  CheckCircle2,
  AlertTriangle,
  Copy,
  Check,
  Sparkles,
  Tag,
  X,
  Edit3,
  BarChart2,
} from 'lucide-react';

interface DeckBuilderProps {
  deck: Deck;
  allCards: Card[];
  cardsMap: Map<string, Card>;
  collection: Record<string, CollectionItem>;
  onSaveDeck: (updatedDeck: Deck) => void;
  onClose: () => void;
  onOpenHandTester: (deck: Deck) => void;
  onAddCardsToCraftPlan: (cardIds: string[]) => void;
  onUpdateCollection?: (cardId: string, regular: number, foil: number) => void;
}

export const DeckBuilder: React.FC<DeckBuilderProps> = ({
  deck: initialDeck,
  allCards,
  cardsMap,
  collection,
  onSaveDeck,
  onClose,
  onOpenHandTester,
  onAddCardsToCraftPlan,
  onUpdateCollection,
}) => {
  const [currentDeck, setCurrentDeck] = useState<Deck>({ ...initialDeck });
  const [deckName, setDeckName] = useState(initialDeck.name);
  const [isEditingName, setIsEditingName] = useState(false);
  const [isTagModalOpen, setIsTagModalOpen] = useState(false);
  const [hasUnsavedChanges, setHasUnsavedChanges] = useState(false);
  const [activeTabMobile, setActiveTabMobile] = useState<'catalog' | 'deck'>('catalog');

  const toggleDeckTag = (tag: string) => {
    playClick();
    const currentTags = currentDeck.tags || [];
    const updatedTags = currentTags.includes(tag)
      ? currentTags.filter((t) => t !== tag)
      : [...currentTags, tag];
    setCurrentDeck({
      ...currentDeck,
      tags: updatedTags,
      updatedAt: new Date().toISOString(),
    });
    setHasUnsavedChanges(true);
  };

  const handleFormatChange = (newFormat: DeckFormat) => {
    playClick();
    setCurrentDeck((prev) => ({
      ...prev,
      format: newFormat,
      updatedAt: new Date().toISOString(),
    }));
    setHasUnsavedChanges(true);
  };

  // Catalog filters
  const [searchQuery, setSearchQuery] = useState('');
  const [filterCost, setFilterCost] = useState<number | 'All'>('All');
  const [filterRarity, setFilterRarity] = useState<number | 'All'>('All');
  const [filterType, setFilterType] = useState<string | 'All'>('All');
  const [advanceFilters, setAdvanceFilters] = useState<AdvanceFiltersState>(initialAdvanceFilters);
  const [showAdvancePanel, setShowAdvancePanel] = useState(false);
  const [groupBy, setGroupBy] = useState<'cost' | 'type'>('cost');

  const [inspectCard, setInspectCard] = useState<Card | null>(null);
  const [copyCodeSuccess, setCopyCodeSuccess] = useState(false);

  const classConfig = CLASSES.find((c) => c.name === currentDeck.class) || CLASSES[0];
  const totalCards = getDeckCardCount(currentDeck.cards);
  const validation = validateDeck(currentDeck, cardsMap);

  // Dynamic traits for deck class cards
  const dynamicTraits = useMemo(() => {
    const set = new Set<string>();
    allCards.forEach((c) => {
      c.tribes.forEach((t) => {
        if (t && t !== '-' && t.trim() !== '') set.add(t);
      });
    });
    return Array.from(set).sort();
  }, [allCards]);

  // Filter legal card catalog for this deck
  const legalCards = useMemo(() => {
    return allCards
      .filter((card) => {
        // Deck legality check
        if (!canCardBeInDeck(card, currentDeck.class, currentDeck.format)) {
          return false;
        }

        // Search query
        if (searchQuery.trim()) {
          const q = searchQuery.toLowerCase();
          const matchName = card.name.toLowerCase().includes(q);
          const matchSkill = card.skillText.toLowerCase().includes(q);
          const matchTribe = card.tribes.some((t) => t.toLowerCase().includes(q));
          if (!matchName && !matchSkill && !matchTribe) return false;
        }

        // Cost
        if (filterCost !== 'All') {
          if (filterCost === 10) {
            if (card.cost < 10) return false;
          } else if (card.cost !== filterCost) {
            return false;
          }
        }

        // Rarity
        if (filterRarity !== 'All' && card.rarity !== filterRarity) {
          return false;
        }

        // Type
        if (filterType !== 'All' && card.type !== filterType) {
          return false;
        }

        // Advance filters (Traits, Keywords, Mechanics, Effects)
        if (!matchAdvanceFilters(card, advanceFilters)) {
          return false;
        }

        return true;
      })
      .sort((a, b) => a.cost - b.cost || a.name.localeCompare(b.name));
  }, [allCards, currentDeck.class, currentDeck.format, searchQuery, filterCost, filterRarity, filterType, advanceFilters]);

  // Deck card objects with quantities
  const deckEntries = useMemo(() => {
    const list: { card: Card; qty: number; ownedQty: number; missingQty: number }[] = [];
    for (const [cardId, qty] of Object.entries(currentDeck.cards)) {
      if (qty <= 0) continue;
      const card = cardsMap.get(cardId);
      if (!card) continue;
      const collItem = collection[cardId];
      const owned = collItem ? collItem.regularCount + collItem.foilCount : 0;
      const missing = Math.max(0, qty - owned);
      list.push({ card, qty, ownedQty: owned, missingQty: missing });
    }
    return list.sort((a, b) => a.card.cost - b.card.cost || a.card.name.localeCompare(b.card.name));
  }, [currentDeck.cards, cardsMap, collection]);

  // Mana curve calculations (1 to 10+)
  const manaCurve = useMemo(() => {
    const counts: Record<number, { followers: number; spells: number; amulets: number; total: number }> = {};
    for (let c = 1; c <= 10; c++) {
      counts[c] = { followers: 0, spells: 0, amulets: 0, total: 0 };
    }

    let followersCount = 0;
    let spellsCount = 0;
    let amuletsCount = 0;
    let totalVials = 0;
    let missingVials = 0;

    deckEntries.forEach(({ card, qty, missingQty }) => {
      const clampedCost = Math.min(10, Math.max(1, card.cost));
      if (!counts[clampedCost]) {
        counts[clampedCost] = { followers: 0, spells: 0, amulets: 0, total: 0 };
      }

      counts[clampedCost].total += qty;
      if (card.type === 'Follower') {
        counts[clampedCost].followers += qty;
        followersCount += qty;
      } else if (card.type === 'Spell') {
        counts[clampedCost].spells += qty;
        spellsCount += qty;
      } else if (card.type === 'Amulet') {
        counts[clampedCost].amulets += qty;
        amuletsCount += qty;
      }

      const craftVal = VIAL_VALUES[card.rarity]?.craft || 50;
      totalVials += craftVal * qty;
      missingVials += craftVal * missingQty;
    });

    const maxCount = Math.max(1, ...Object.values(counts).map((c) => c.total));

    return {
      distribution: counts,
      maxCount,
      followersCount,
      spellsCount,
      amuletsCount,
      totalVials,
      missingVials,
    };
  }, [deckEntries]);

  // Card addition handler
  const handleAddCard = (card: Card) => {
    if (totalCards >= DECK_SIZE_LIMIT) return;
    const currentQty = currentDeck.cards[card.id] || 0;
    if (currentQty >= MAX_COPIES_PER_CARD) return;

    playCardPlay();
    const updatedCards = { ...currentDeck.cards, [card.id]: currentQty + 1 };
    setCurrentDeck({
      ...currentDeck,
      cards: updatedCards,
      updatedAt: new Date().toISOString(),
    });
    setHasUnsavedChanges(true);
  };

  // Card removal handler
  const handleRemoveCard = (cardId: string) => {
    const currentQty = currentDeck.cards[cardId] || 0;
    if (currentQty <= 0) return;

    playCardDraw();
    const updatedCards = { ...currentDeck.cards };
    if (currentQty === 1) {
      delete updatedCards[cardId];
    } else {
      updatedCards[cardId] = currentQty - 1;
    }

    setCurrentDeck({
      ...currentDeck,
      cards: updatedCards,
      updatedAt: new Date().toISOString(),
    });
    setHasUnsavedChanges(true);
  };

  // Save changes
  const handleSave = () => {
    playClick();
    const updated = {
      ...currentDeck,
      name: deckName.trim() || 'Untitled Deck',
      updatedAt: new Date().toISOString(),
    };
    onSaveDeck(updated);
    setHasUnsavedChanges(false);
  };

  const [showClearConfirm, setShowClearConfirm] = useState(false);
  const [craftNotice, setCraftNotice] = useState<string | null>(null);

  // Clear deck
  const handleConfirmClear = () => {
    playClick();
    setCurrentDeck({
      ...currentDeck,
      cards: {},
      updatedAt: new Date().toISOString(),
    });
    setHasUnsavedChanges(true);
    setShowClearConfirm(false);
  };

  // Copy deck code / JSON
  const handleCopyDeckCode = () => {
    playClick();
    const payload = JSON.stringify(currentDeck, null, 2);
    navigator.clipboard.writeText(payload);
    setCopyCodeSuccess(true);
    setTimeout(() => setCopyCodeSuccess(false), 2000);
  };

  // Craft missing cards
  const handleCraftMissing = () => {
    playClick();
    const missingIds: string[] = [];
    deckEntries.forEach(({ card, missingQty }) => {
      if (missingQty > 0) {
        missingIds.push(card.id);
      }
    });

    if (missingIds.length > 0) {
      onAddCardsToCraftPlan(missingIds);
      setCraftNotice(`Added ${missingIds.length} missing cards to your Craft Planner!`);
    } else {
      setCraftNotice('You already own all cards needed for this deck!');
    }
  };

  return (
    <div className="space-y-4">
      {/* Top Deck Info Bar */}
      <div className="rounded-2xl border border-cyan-900/40 bg-slate-900/80 p-4 sm:p-5 shadow-2xl backdrop-blur-md">
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
          {/* Deck Title & Class Info */}
          <div className="flex items-center space-x-3">
            <button
              onClick={() => {
                if (hasUnsavedChanges) {
                  handleSave();
                }
                onClose();
              }}
              className="flex h-9 w-9 items-center justify-center rounded-lg border border-slate-700 bg-slate-950 text-slate-300 hover:text-white hover:border-slate-500"
              title="Return to Decks"
            >
              <ArrowLeft className="h-5 w-5" />
            </button>

            <div>
              <div className="flex items-center space-x-2">
                {isEditingName ? (
                  <input
                    type="text"
                    value={deckName}
                    autoFocus
                    onChange={(e) => {
                      setDeckName(e.target.value);
                      setHasUnsavedChanges(true);
                    }}
                    onBlur={() => setIsEditingName(false)}
                    onKeyDown={(e) => e.key === 'Enter' && setIsEditingName(false)}
                    className="rounded bg-slate-950 border border-cyan-500 px-2 py-0.5 text-lg font-bold text-white focus:outline-none"
                  />
                ) : (
                  <h1
                    onClick={() => setIsEditingName(true)}
                    className="font-serif text-xl sm:text-2xl font-bold text-white cursor-pointer hover:text-cyan-300 transition-colors flex items-center space-x-2"
                    title="Click to rename deck"
                  >
                    <span>{deckName}</span>
                    <span className="text-xs text-slate-500 font-sans font-normal">(rename)</span>
                  </h1>
                )}
              </div>

              <div className="flex flex-wrap items-center gap-2 mt-1">
                <span
                  className="inline-flex items-center space-x-1.5 rounded px-2.5 py-0.5 text-xs font-bold border"
                  style={{
                    color: classConfig.color,
                    borderColor: `${classConfig.color}40`,
                    backgroundColor: `${classConfig.color}15`,
                  }}
                >
                  <img
                    src={classConfig.iconSvg}
                    alt={currentDeck.class}
                    className="h-4 w-4 object-contain"
                  />
                  <span>{currentDeck.class}</span>
                </span>
                {/* Format Selector */}
                <div className="flex items-center bg-slate-900 border border-slate-700 hover:border-cyan-500/60 rounded px-2 py-0.5 text-xs font-semibold text-slate-200 transition-colors">
                  <span className="text-slate-500 mr-1 font-medium">Format:</span>
                  <select
                    value={currentDeck.format}
                    onChange={(e) => handleFormatChange(e.target.value as DeckFormat)}
                    className="bg-transparent text-cyan-300 font-bold focus:outline-none cursor-pointer"
                    title="Change deck format"
                  >
                    {FORMATS.map((f) => (
                      <option key={f.id} value={f.id} className="bg-slate-900 text-slate-100">
                        {f.label}
                      </option>
                    ))}
                  </select>
                </div>
                {validation.valid ? (
                  <span
                    title={`Full deck capacity (${DECK_SIZE_LIMIT} cards) & legal for ${currentDeck.format}`}
                    className="flex items-center space-x-1 rounded bg-emerald-950/80 border border-emerald-500/60 px-2 py-0.5 text-xs font-bold text-emerald-300"
                  >
                    <CheckCircle2 className="h-3.5 w-3.5 text-emerald-400" />
                    <span>Ready</span>
                  </span>
                ) : (
                  <span className="flex items-center space-x-1 rounded bg-amber-950/80 border border-amber-500/60 px-2 py-0.5 text-xs font-semibold text-amber-300">
                    <AlertTriangle className="h-3.5 w-3.5" />
                    <span>In Progress ({totalCards}/{DECK_SIZE_LIMIT})</span>
                  </span>
                )}

                {/* Deck Tags Bar */}
                <div className="flex items-center space-x-1.5 ml-2 border-l border-slate-800 pl-3">
                  {currentDeck.tags && currentDeck.tags.length > 0 && (
                    <div className="flex flex-wrap gap-1">
                      {currentDeck.tags.map((tag) => (
                        <span
                          key={tag}
                          className="rounded-full bg-slate-950 border border-slate-800 px-2 py-0.5 text-[10px] text-cyan-300 font-medium"
                        >
                          #{tag}
                        </span>
                      ))}
                    </div>
                  )}
                  <button
                    type="button"
                    onClick={() => {
                      playClick();
                      setIsTagModalOpen(true);
                    }}
                    className="flex items-center space-x-1 rounded-full bg-slate-800 hover:bg-slate-700 border border-slate-700 px-2 py-0.5 text-[10px] font-semibold text-slate-300 hover:text-white transition-colors"
                  >
                    <Tag className="h-3 w-3 text-cyan-400" />
                    <span>{currentDeck.tags && currentDeck.tags.length > 0 ? 'Edit Tags' : '+ Add Tags'}</span>
                  </button>
                </div>
              </div>
            </div>
          </div>

          {/* Quick Action Buttons */}
          <div className="flex flex-wrap items-center gap-2">
            {/* Test Hand Simulator Button */}
            <button
              onClick={() => {
                handleSave();
                onOpenHandTester(currentDeck);
              }}
              className="flex items-center space-x-1.5 rounded-lg bg-gradient-to-r from-amber-600 to-amber-700 px-3.5 py-2 text-xs sm:text-sm font-bold text-white shadow-[0_0_12px_rgba(245,158,11,0.4)] hover:brightness-110 transition-all"
            >
              <Sword className="h-4 w-4" />
              <span>Test Hand</span>
            </button>

            {/* Craft Missing Button */}
            {manaCurve.missingVials > 0 && (
              <button
                onClick={handleCraftMissing}
                className="flex items-center space-x-1.5 rounded-lg border border-purple-500/60 bg-purple-950/50 px-3 py-2 text-xs font-semibold text-purple-300 hover:bg-purple-900/50 transition-colors"
                title={`Missing ${manaCurve.missingVials} vials`}
              >
                <Wrench className="h-4 w-4 text-purple-400" />
                <span>Craft Missing ({manaCurve.missingVials} 🧪)</span>
              </button>
            )}

            {/* Copy / Export */}
            <button
              onClick={handleCopyDeckCode}
              className="flex items-center space-x-1 rounded-lg border border-slate-700 bg-slate-950 px-3 py-2 text-xs font-medium text-slate-300 hover:text-white hover:border-slate-500"
              title="Copy Deck JSON"
            >
              {copyCodeSuccess ? <Check className="h-4 w-4 text-emerald-400" /> : <Copy className="h-4 w-4" />}
              <span>{copyCodeSuccess ? 'Copied!' : 'Export'}</span>
            </button>

            {/* Clear Deck */}
            <button
              onClick={() => {
                playClick();
                setShowClearConfirm(true);
              }}
              className="flex items-center space-x-1 rounded-lg border border-rose-900/40 bg-rose-950/30 px-2.5 py-2 text-xs text-rose-400 hover:bg-rose-900/40"
              title="Clear all cards"
            >
              <Trash2 className="h-4 w-4" />
            </button>

            {/* Save Deck Button */}
            <button
              onClick={handleSave}
              className={`flex items-center space-x-1.5 rounded-lg px-4 py-2 text-xs sm:text-sm font-bold shadow-lg transition-all ${
                hasUnsavedChanges
                  ? 'bg-cyan-500 text-slate-950 hover:bg-cyan-400 shadow-[0_0_15px_rgba(6,182,212,0.6)] animate-pulse'
                  : 'bg-cyan-900/80 border border-cyan-500/60 text-cyan-200 hover:bg-cyan-800'
              }`}
            >
              <Save className="h-4 w-4" />
              <span>{hasUnsavedChanges ? 'Save Changes' : 'Saved'}</span>
            </button>
          </div>
        </div>

        {/* Card Count Progress Bar */}
        <div className="mt-4 space-y-1.5">
          <div className="flex items-center justify-between text-xs text-slate-400">
            <span>
              Deck Capacity:{' '}
              <strong className={totalCards === DECK_SIZE_LIMIT ? 'text-emerald-400' : 'text-cyan-300'}>
                {totalCards}
              </strong>{' '}
              / {DECK_SIZE_LIMIT}
            </span>
            <span>
              {totalCards < DECK_SIZE_LIMIT
                ? `${DECK_SIZE_LIMIT - totalCards} cards needed`
                : totalCards === DECK_SIZE_LIMIT
                ? 'Full Deck'
                : `${totalCards - DECK_SIZE_LIMIT} cards over limit!`}
            </span>
          </div>

          <div className="h-2.5 w-full rounded-full bg-slate-950 overflow-hidden border border-slate-800">
            <div
              className={`h-full transition-all duration-300 ${
                totalCards === DECK_SIZE_LIMIT && validation.errors.length === 0
                  ? 'bg-gradient-to-r from-emerald-500 to-teal-400 shadow-[0_0_10px_rgba(16,185,129,0.8)]'
                  : validation.errors.length > 0 || totalCards > DECK_SIZE_LIMIT
                  ? 'bg-gradient-to-r from-rose-500 to-red-600 shadow-[0_0_10px_rgba(244,63,94,0.8)]'
                  : 'bg-gradient-to-r from-cyan-600 to-indigo-500'
              }`}
              style={{ width: `${Math.min(100, (totalCards / DECK_SIZE_LIMIT) * 100)}%` }}
            />
          </div>

          {/* Validation Error Issues Banner */}
          {validation.errors.length > 0 && (
            <div className="mt-3 rounded-xl border border-rose-500/60 bg-rose-950/40 p-3 text-xs text-rose-200 space-y-2 shadow-lg">
              <div className="flex items-center justify-between flex-wrap gap-2">
                <div className="font-bold flex items-center space-x-1.5 text-rose-400">
                  <AlertTriangle className="h-4 w-4 shrink-0" />
                  <span>Deck Legality Issues ({validation.errors.length}):</span>
                </div>
                {currentDeck.format === 'Rotation' && validation.errors.some((e) => e.includes('Rotation') || e.includes('legal')) && (
                  <button
                    onClick={() => handleFormatChange('Unlimited')}
                    className="flex items-center space-x-1 rounded-lg bg-indigo-900 hover:bg-indigo-800 border border-indigo-500/80 px-2.5 py-1 text-xs font-bold text-indigo-200 shadow-md transition-all"
                    title="Change deck format to Unlimited"
                  >
                    <span>Move Deck to Unlimited</span>
                  </button>
                )}
              </div>
              <ul className="list-disc list-inside space-y-1 text-[11px] text-rose-300/90 pl-1 font-medium">
                {validation.errors.map((err, i) => (
                  <li key={i}>{err}</li>
                ))}
              </ul>
            </div>
          )}
        </div>
      </div>

      {/* Mobile Sub-Navigation Tabs */}
      <div className="flex lg:hidden rounded-xl border border-slate-800 bg-slate-900/90 p-1">
        <button
          onClick={() => setActiveTabMobile('catalog')}
          className={`flex-1 rounded-lg py-2 text-xs font-bold transition-all ${
            activeTabMobile === 'catalog'
              ? 'bg-cyan-950 text-cyan-300 border border-cyan-500/50'
              : 'text-slate-400'
          }`}
        >
          Card Catalog ({legalCards.length})
        </button>
        <button
          onClick={() => setActiveTabMobile('deck')}
          className={`flex-1 rounded-lg py-2 text-xs font-bold transition-all flex items-center justify-center space-x-1.5 ${
            activeTabMobile === 'deck'
              ? 'bg-cyan-950 text-cyan-300 border border-cyan-500/50'
              : 'text-slate-400'
          }`}
        >
          <span>Deck List</span>
          <span className="rounded-full bg-slate-800 px-2 py-0.5 text-[10px]">
            {totalCards}/40
          </span>
        </button>
      </div>

      {/* Main Two-Column Layout (Desktop) */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-5">
        {/* LEFT COLUMN: Card Catalog (7 cols on desktop, 8 on xl, 9 on 2xl) */}
        <div
          className={`lg:col-span-7 xl:col-span-8 2xl:col-span-9 space-y-4 ${
            activeTabMobile === 'catalog' ? 'block' : 'hidden lg:block'
          }`}
        >
          {/* Search & Filter Controls */}
          <div className="rounded-2xl border border-slate-800 bg-slate-900/60 p-3.5 space-y-3">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder={`Search ${currentDeck.class} and Neutral legal cards...`}
                className="w-full rounded-xl border border-slate-700 bg-slate-950 pl-9 pr-3 py-2 text-xs text-slate-100 placeholder-slate-500 focus:border-cyan-500 focus:outline-none"
              />
            </div>

            {/* Quick Filter Chips: Cost */}
            <div className="flex items-center space-x-1 overflow-x-auto text-xs pb-1 scrollbar-none">
              <span className="text-slate-500 font-semibold text-[11px] mr-1">Cost:</span>
              <button
                onClick={() => setFilterCost('All')}
                className={`h-5 px-2 rounded text-[11px] font-bold ${
                  filterCost === 'All'
                    ? 'bg-emerald-500 text-slate-950'
                    : 'bg-slate-950 border border-slate-800 text-slate-400'
                }`}
              >
                All
              </button>
              {[1, 2, 3, 4, 5, 6, 7, 8, 9, 10].map((num) => (
                <button
                  key={num}
                  onClick={() => setFilterCost(num)}
                  className={`h-5 w-5 rounded text-[11px] font-bold ${
                    filterCost === num
                      ? 'bg-emerald-400 text-slate-950'
                      : 'bg-slate-950 border border-slate-800 text-slate-400'
                  }`}
                >
                  {num === 10 ? '10+' : num}
                </button>
              ))}
            </div>

            {/* Quick Filter Chips: Type, Rarity & Advance Filters Toggle */}
            <div className="flex flex-wrap items-center gap-2 text-xs pt-2 border-t border-slate-800">
              <div className="flex items-center space-x-1">
                {['Follower', 'Spell', 'Amulet'].map((t) => (
                  <button
                    key={t}
                    onClick={() => setFilterType(filterType === t ? 'All' : t)}
                    className={`px-2 py-0.5 rounded text-[11px] border ${
                      filterType === t
                        ? 'border-cyan-500 bg-cyan-950 text-cyan-300 font-bold'
                        : 'border-slate-800 bg-slate-950 text-slate-400'
                    }`}
                  >
                    {t}
                  </button>
                ))}
              </div>

              {/* Advance Filters Toggle */}
              <button
                type="button"
                onClick={() => setShowAdvancePanel(!showAdvancePanel)}
                className={`flex items-center space-x-1 px-2 py-0.5 rounded text-[11px] border transition-all ${
                  showAdvancePanel || countActiveAdvanceFilters(advanceFilters) > 0
                    ? 'border-cyan-400 bg-cyan-950 text-cyan-200 font-bold shadow-sm'
                    : 'border-slate-800 bg-slate-950 text-slate-400 hover:text-slate-200'
                }`}
              >
                <span>Advance Filters</span>
                {countActiveAdvanceFilters(advanceFilters) > 0 && (
                  <span className="rounded-full bg-cyan-400 text-slate-950 px-1 py-0.1 text-[9px] font-black">
                    {countActiveAdvanceFilters(advanceFilters)}
                  </span>
                )}
              </button>

              <div className="flex items-center space-x-1 ml-auto">
                {RARITIES.map((r) => (
                  <button
                    key={r.id}
                    onClick={() => setFilterRarity(filterRarity === r.id ? 'All' : r.id)}
                    className={`px-1.5 py-0.5 rounded text-[11px] border font-bold ${
                      filterRarity === r.id
                        ? 'text-white'
                        : 'border-slate-800 bg-slate-950 text-slate-500'
                    }`}
                    style={filterRarity === r.id ? { borderColor: r.color, backgroundColor: `${r.color}30` } : {}}
                  >
                    {r.name[0]}
                  </button>
                ))}
              </div>
            </div>

            {/* Advance Filters Panel */}
            {showAdvancePanel && (
              <div className="pt-2 animate-in fade-in duration-200">
                <AdvanceFiltersPanel
                  filters={advanceFilters}
                  onChange={setAdvanceFilters}
                  onClose={() => setShowAdvancePanel(false)}
                  matchingCount={legalCards.length}
                  availableTraits={dynamicTraits.length > 0 ? dynamicTraits : undefined}
                />
              </div>
            )}
          </div>

          {/* Cards Catalog Container - Multi-column grid showing complete card images, scrollable vertically */}
          <div className="h-[750px] overflow-y-auto overflow-x-hidden pr-2 space-y-3">
            <div className="grid grid-cols-[repeat(auto-fill,minmax(160px,1fr))] gap-3 sm:gap-4 justify-items-center">
              {legalCards.map((card) => {
                const inDeckCount = currentDeck.cards[card.id] || 0;
                const inCollection = collection[card.id];
                return (
                  <CardVisual
                    key={card.id}
                    card={card}
                    onDetails={() => setInspectCard(card)}
                    deckCount={inDeckCount}
                    collectionCount={inCollection?.regularCount}
                    foilCount={inCollection?.foilCount}
                    onQuickAdd={
                      totalCards < DECK_SIZE_LIMIT && inDeckCount < MAX_COPIES_PER_CARD
                        ? () => handleAddCard(card)
                        : undefined
                    }
                  />
                );
              })}
            </div>

            {legalCards.length === 0 && (
              <div className="text-center py-12 text-slate-500 text-sm">
                No matching legal cards found.
              </div>
            )}
          </div>
        </div>

        {/* RIGHT COLUMN: Deck Contents & Mana Curve (5 cols on desktop, 4 on xl, 3 on 2xl) */}
        <div
          className={`lg:col-span-5 xl:col-span-4 2xl:col-span-3 space-y-4 ${
            activeTabMobile === 'deck' ? 'block' : 'hidden lg:block'
          }`}
        >
          {/* Deck Analytics Card: Mana Curve & Composition */}
          <div className="rounded-2xl border border-slate-800 bg-slate-900/80 p-4 space-y-4 shadow-xl">
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold uppercase tracking-wider text-slate-300 flex items-center space-x-1.5">
                <BarChart2 className="h-4 w-4 text-cyan-400" />
                <span>Mana Curve & Distribution</span>
              </span>
              <span className="text-xs text-slate-400">
                Avg Cost:{' '}
                <strong className="text-cyan-300 font-mono text-sm ml-1 bg-slate-950 px-2 py-0.5 rounded border border-slate-800">
                  {totalCards > 0
                    ? (
                        deckEntries.reduce((sum, e) => sum + e.card.cost * e.qty, 0) / totalCards
                      ).toFixed(1)
                    : '0.0'}
                </strong>
              </span>
            </div>

            {/* High-Fidelity Graphical Mana Curve Chart */}
            <div className="relative rounded-xl border border-slate-800 bg-slate-950/90 p-3 pt-4">
              {/* Subtle Horizontal Grid lines */}
              <div className="absolute inset-x-3 top-8 bottom-8 flex flex-col justify-between pointer-events-none opacity-10">
                <div className="border-b border-slate-400 w-full" />
                <div className="border-b border-slate-400 w-full" />
                <div className="border-b border-slate-400 w-full" />
              </div>

              <div className="relative flex items-end justify-between h-36 gap-1 z-10">
                {Object.entries(manaCurve.distribution).map(([costStr, data]) => {
                  const costNum = Number(costStr);
                  const heightPercent =
                    manaCurve.maxCount > 0 ? Math.max(8, (data.total / manaCurve.maxCount) * 100) : 0;

                  return (
                    <div key={costStr} className="flex-1 flex flex-col items-center group relative h-full justify-end">
                      {/* Interactive Tooltip Popover */}
                      <div className="absolute -top-10 opacity-0 group-hover:opacity-100 transition-all duration-150 bg-slate-950 border border-cyan-500/60 shadow-[0_0_15px_rgba(6,182,212,0.4)] px-2 py-1 rounded-lg text-[10px] text-slate-200 pointer-events-none whitespace-nowrap z-30 flex flex-col items-center">
                        <span className="font-bold text-cyan-300">PP {costNum === 10 ? '10+' : costNum}: {data.total} cards</span>
                        <div className="flex items-center space-x-1.5 mt-0.5 text-[9px]">
                          <span className="text-cyan-400">{data.followers} Followers</span>
                          <span className="text-slate-600">•</span>
                          <span className="text-amber-400">{data.spells} Spells</span>
                          <span className="text-slate-600">•</span>
                          <span className="text-purple-400">{data.amulets} Amulets</span>
                        </div>
                      </div>

                      {/* Prominent Card Count Badge above Bar */}
                      <div className="mb-1.5 flex items-center justify-center">
                        {data.total > 0 ? (
                          <span className="rounded-full bg-cyan-950 border border-cyan-500/60 text-cyan-200 text-[10px] font-bold px-1.5 py-0.2 min-w-[20px] text-center shadow-[0_0_8px_rgba(6,182,212,0.3)]">
                            {data.total}
                          </span>
                        ) : (
                          <span className="text-[10px] font-medium text-slate-700">0</span>
                        )}
                      </div>

                      {/* Stacked Bar container */}
                      <div className="w-full max-w-[28px] rounded-t-lg overflow-hidden bg-slate-900/60 border border-slate-800 flex flex-col-reverse transition-all duration-300 group-hover:border-cyan-500/50" style={{ height: `${heightPercent}%` }}>
                        {data.total > 0 ? (
                          <>
                            {data.followers > 0 && (
                              <div
                                style={{ height: `${(data.followers / data.total) * 100}%` }}
                                className="bg-gradient-to-t from-cyan-600 to-cyan-400 transition-all"
                                title={`${data.followers} Followers`}
                              />
                            )}
                            {data.spells > 0 && (
                              <div
                                style={{ height: `${(data.spells / data.total) * 100}%` }}
                                className="bg-gradient-to-t from-amber-600 to-amber-400 transition-all"
                                title={`${data.spells} Spells`}
                              />
                            )}
                            {data.amulets > 0 && (
                              <div
                                style={{ height: `${(data.amulets / data.total) * 100}%` }}
                                className="bg-gradient-to-t from-purple-600 to-purple-400 transition-all"
                                title={`${data.amulets} Amulets`}
                              />
                            )}
                          </>
                        ) : (
                          <div className="h-full bg-transparent" />
                        )}
                      </div>

                      {/* Cost PP Badge Label */}
                      <div className="mt-2 flex items-center justify-center">
                        <span className="h-5 w-5 rounded-full bg-slate-900 border border-slate-700/80 text-[10px] font-bold text-slate-300 flex items-center justify-center group-hover:border-cyan-400 group-hover:text-cyan-300 group-hover:bg-slate-950 transition-all">
                          {costNum === 10 ? '10+' : costNum}
                        </span>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>

            {/* Type & Vials Summary Cards */}
            <div className="grid grid-cols-2 gap-2 text-xs">
              <div className="rounded-xl bg-slate-950 p-2.5 border border-slate-800/80 space-y-1">
                <span className="text-slate-500 block text-[10px] uppercase font-bold tracking-wider">Composition Breakdown</span>
                <div className="flex items-center justify-between font-semibold text-slate-200 text-[11px]">
                  <span className="flex items-center space-x-1">
                    <span className="h-2 w-2 rounded-full bg-cyan-400" />
                    <span>Followers: <strong className="text-cyan-300">{manaCurve.followersCount}</strong></span>
                  </span>
                  <span className="flex items-center space-x-1">
                    <span className="h-2 w-2 rounded-full bg-amber-400" />
                    <span>Spells: <strong className="text-amber-300">{manaCurve.spellsCount}</strong></span>
                  </span>
                  <span className="flex items-center space-x-1">
                    <span className="h-2 w-2 rounded-full bg-purple-400" />
                    <span>Amulets: <strong className="text-purple-300">{manaCurve.amuletsCount}</strong></span>
                  </span>
                </div>
              </div>
              <div className="rounded-xl bg-slate-950 p-2.5 border border-slate-800/80 flex flex-col justify-between">
                <span className="text-slate-500 block text-[10px] uppercase font-bold tracking-wider">Vials Cost</span>
                <div className="flex items-center justify-between">
                  <span className="font-bold text-amber-300 text-sm">
                    {manaCurve.totalVials.toLocaleString()} Vials
                  </span>
                  {manaCurve.missingVials > 0 && (
                    <span className="text-[10px] text-purple-400 font-semibold bg-purple-950/80 border border-purple-500/40 px-2 py-0.5 rounded">
                      {manaCurve.missingVials.toLocaleString()} missing
                    </span>
                  )}
                </div>
              </div>
            </div>
          </div>

          {/* Deck Cards List */}
          <div className="rounded-2xl border border-slate-800 bg-slate-900/60 p-3.5 space-y-2 h-[480px] flex flex-col">
            <div className="flex items-center justify-between text-xs pb-1 border-b border-slate-800 shrink-0">
              <span className="font-bold uppercase tracking-wider text-slate-400">
                Cards in Deck ({totalCards}/{DECK_SIZE_LIMIT})
              </span>
              <span className="text-slate-500">{deckEntries.length} unique cards</span>
            </div>

            {deckEntries.length === 0 ? (
              <div className="flex-1 flex flex-col items-center justify-center text-center p-6 text-slate-500 text-xs">
                Your deck is empty. Click cards in the catalog to add them.
              </div>
            ) : (
              <div className="space-y-1.5 flex-1 overflow-y-auto pr-1">
                {deckEntries.map(({ card, qty, ownedQty, missingQty }) => {
                  const rarity = RARITIES.find((r) => r.id === card.rarity);
                  const isFormatLegal = isCardLegalInFormat(card, currentDeck.format);
                  const isClassLegal = card.className === currentDeck.class || card.className === 'Neutral';
                  const isIllegal = !isFormatLegal || !isClassLegal;

                  let illegalReason = '';
                  if (!isFormatLegal) {
                    illegalReason = `Not legal in ${currentDeck.format} (${card.setName})`;
                  } else if (!isClassLegal) {
                    illegalReason = `Illegal class (${card.className} in ${currentDeck.class})`;
                  }

                  return (
                    <div
                      key={card.id}
                      onClick={() => setInspectCard(card)}
                      className={`group relative flex items-center justify-between rounded-xl border p-2 cursor-pointer transition-all overflow-hidden ${
                        isIllegal
                          ? 'border-rose-500/80 bg-rose-950/50 shadow-[0_0_10px_rgba(244,63,94,0.25)]'
                          : 'border-slate-800 bg-slate-950/80 hover:border-cyan-500/50'
                      }`}
                    >
                      {/* Background artwork sliver */}
                      <div className="absolute right-0 inset-y-0 w-32 opacity-25 pointer-events-none overflow-hidden">
                        <img
                          src={card.image}
                          alt={card.name}
                          className="h-full w-full object-cover object-center"
                        />
                        <div className="absolute inset-0 bg-gradient-to-r from-slate-950 via-slate-950/60 to-transparent" />
                      </div>

                      {/* Left: Mana cost & Card info */}
                      <div className="flex items-center space-x-2.5 min-w-0 z-10">
                        {/* Mana cost */}
                        <div
                          className={`flex h-6 w-6 shrink-0 items-center justify-center rounded-full font-bold text-xs text-white ${
                            isIllegal
                              ? 'border border-rose-500 bg-rose-950'
                              : 'border border-emerald-500 bg-emerald-950'
                          }`}
                        >
                          {card.cost}
                        </div>

                        {/* Card Name & Badges */}
                        <div className="min-w-0">
                          <div className="flex items-center space-x-1.5 flex-wrap gap-y-0.5">
                            <span className={`font-semibold text-xs truncate ${isIllegal ? 'text-rose-200' : 'text-slate-200'}`}>
                              {card.name}
                            </span>
                            <span
                              className="text-[9px] font-bold rounded px-1"
                              style={{ color: rarity?.color }}
                            >
                              {card.rarityName[0]}
                            </span>
                            {isIllegal && (
                              <span
                                className="rounded bg-rose-950/90 border border-rose-500/80 px-1.5 py-0.2 text-[9px] font-bold text-rose-300 flex items-center space-x-0.5 shadow-sm"
                                title={illegalReason}
                              >
                                <AlertTriangle className="h-3 w-3 text-rose-400 shrink-0" />
                                <span>{illegalReason}</span>
                              </span>
                            )}
                          </div>
                          <div className="text-[10px] text-slate-400">
                            {card.type}
                            {missingQty > 0 && (
                              <span className="ml-1.5 text-amber-400 font-semibold">
                                (Need {missingQty} more)
                              </span>
                            )}
                          </div>
                        </div>
                      </div>

                      {/* Right: Quantity Controls */}
                      <div className="flex items-center space-x-1.5 z-10" onClick={(e) => e.stopPropagation()}>
                        <button
                          onClick={() => handleRemoveCard(card.id)}
                          className="flex h-6 w-6 items-center justify-center rounded-md border border-slate-700 bg-slate-900 text-slate-300 hover:bg-slate-800 hover:text-white"
                          title="Remove 1 copy"
                        >
                          <Minus className="h-3 w-3" />
                        </button>

                        <span className="w-5 text-center font-bold text-xs text-cyan-300">
                          {qty}x
                        </span>

                        <button
                          onClick={() => handleAddCard(card)}
                          disabled={totalCards >= DECK_SIZE_LIMIT || qty >= MAX_COPIES_PER_CARD}
                          className="flex h-6 w-6 items-center justify-center rounded-md border border-slate-700 bg-slate-900 text-slate-300 hover:bg-slate-800 hover:text-white disabled:opacity-30"
                          title="Add 1 copy"
                        >
                          <Plus className="h-3 w-3" />
                        </button>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Card Detail Modal */}
      {inspectCard && (
        <CardDetailModal
          card={inspectCard}
          allCardsMap={cardsMap}
          onClose={() => setInspectCard(null)}
          onSelectCard={(c) => setInspectCard(c)}
          collectionItem={collection[inspectCard.id]}
          collection={collection}
          onUpdateCollection={
            onUpdateCollection
              ? (reg, foil) => onUpdateCollection(inspectCard.id, reg, foil)
              : undefined
          }
          onAddToDeck={
            totalCards < DECK_SIZE_LIMIT
              ? (c) => handleAddCard(c)
              : undefined
          }
          activeDeckCardCount={currentDeck.cards[inspectCard.id] || 0}
        />
      )}

      {/* Tag Management Modal */}
      {isTagModalOpen && (() => {
        const availableTags = getAvailableTagsForClass(currentDeck.class);
        return (
          <div
            className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm"
            onClick={() => setIsTagModalOpen(false)}
          >
            <div
              className="relative w-full max-w-md rounded-2xl border border-cyan-800/60 bg-slate-950 p-5 shadow-2xl text-slate-100 space-y-4"
              onClick={(e) => e.stopPropagation()}
            >
              <div className="flex items-center justify-between border-b border-slate-800 pb-3">
                <div className="flex items-center space-x-2">
                  <Tag className="h-5 w-5 text-cyan-400" />
                  <h2 className="font-serif text-lg font-bold text-white">Manage Deck Tags</h2>
                </div>
                <button
                  onClick={() => setIsTagModalOpen(false)}
                  className="rounded-lg p-1 text-slate-400 hover:text-white hover:bg-slate-900"
                >
                  <X className="h-5 w-5" />
                </button>
              </div>

              {/* Playstyle Tags */}
              <div>
                <label className="block text-xs font-bold uppercase tracking-wider text-cyan-400 mb-2">
                  Playstyle Archetype
                </label>
                <div className="flex flex-wrap gap-1.5 p-2 bg-slate-900/60 rounded-xl border border-slate-800 max-h-32 overflow-y-auto">
                  {PLAYSTYLE_TAGS.map((pt) => {
                    const active = currentDeck.tags && currentDeck.tags.includes(pt);
                    return (
                      <button
                        type="button"
                        key={pt}
                        onClick={() => toggleDeckTag(pt)}
                        className={`rounded-lg px-2.5 py-1 text-xs font-semibold transition-all ${
                          active
                            ? 'bg-cyan-500 text-slate-950 font-bold shadow-md scale-105'
                            : 'bg-slate-950 border border-slate-800 text-slate-400 hover:border-slate-700 hover:text-slate-200'
                        }`}
                      >
                        {pt}
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* Class Specific Archetype Tags */}
              {availableTags.archetype.length > 0 && (
                <div>
                  <label className="block text-xs font-bold uppercase tracking-wider text-amber-400 mb-2 flex items-center space-x-1">
                    <Sparkles className="h-3.5 w-3.5" />
                    <span>{currentDeck.class} Archetype Tags</span>
                  </label>
                  <div className="flex flex-wrap gap-1.5 p-2 bg-slate-900/60 rounded-xl border border-slate-800">
                    {availableTags.archetype.map((at) => {
                      const active = currentDeck.tags && currentDeck.tags.includes(at);
                      return (
                        <button
                          type="button"
                          key={at}
                          onClick={() => toggleDeckTag(at)}
                          className={`rounded-lg px-2.5 py-1 text-xs font-semibold transition-all ${
                            active
                              ? 'bg-amber-500 text-slate-950 font-bold shadow-md scale-105'
                              : 'bg-slate-950 border border-slate-800 text-slate-400 hover:border-slate-700 hover:text-slate-200'
                          }`}
                        >
                          {at}
                        </button>
                      );
                    })}
                  </div>
                </div>
              )}

              <div className="pt-2 border-t border-slate-800 flex justify-end">
                <button
                  type="button"
                  onClick={() => setIsTagModalOpen(false)}
                  className="rounded-xl bg-cyan-500 hover:bg-cyan-400 px-4 py-2 text-xs font-bold text-slate-950 shadow-md transition-all"
                >
                  Done
                </button>
              </div>
            </div>
          </div>
        );
      })()}

      {/* Clear Deck Confirmation Modal */}
      {showClearConfirm && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/85 backdrop-blur-md p-4 animate-in fade-in duration-150">
          <div className="w-full max-w-md rounded-2xl border border-rose-500/50 bg-slate-900 p-6 shadow-2xl space-y-4">
            <div className="flex items-center space-x-3 text-rose-400">
              <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-rose-950 border border-rose-500/60 shadow-[0_0_12px_rgba(244,63,94,0.3)]">
                <Trash2 className="h-5 w-5 text-rose-400" />
              </div>
              <div>
                <h3 className="font-serif text-lg font-bold text-white">Clear All Cards?</h3>
                <p className="text-xs text-slate-400">Remove all copies from deck list</p>
              </div>
            </div>

            <p className="text-xs sm:text-sm text-slate-300 leading-relaxed bg-slate-950/60 p-3.5 rounded-xl border border-slate-800">
              Are you sure you want to clear all cards from <strong className="text-white font-bold">{currentDeck.name}</strong>?
            </p>

            <div className="flex items-center justify-end space-x-3 pt-2">
              <button
                type="button"
                onClick={() => setShowClearConfirm(false)}
                className="rounded-xl border border-slate-700 bg-slate-950 px-4 py-2 text-xs font-semibold text-slate-300 hover:text-white hover:border-slate-500 transition-colors"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleConfirmClear}
                className="rounded-xl bg-gradient-to-r from-rose-600 to-red-500 px-5 py-2 text-xs font-bold text-white shadow-[0_0_15px_rgba(244,63,94,0.6)] hover:brightness-110 transition-all"
              >
                Clear Deck
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Craft Notice Modal */}
      {craftNotice && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/80 backdrop-blur-md p-4 animate-in fade-in duration-150">
          <div className="w-full max-w-sm rounded-2xl border border-purple-500/50 bg-slate-900 p-6 shadow-2xl space-y-4 text-center">
            <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-purple-950 border border-purple-500/60 text-purple-300 mx-auto shadow-[0_0_15px_rgba(168,85,247,0.4)]">
              <Wrench className="h-6 w-6" />
            </div>
            <p className="text-sm text-slate-200 font-medium">{craftNotice}</p>
            <button
              type="button"
              onClick={() => setCraftNotice(null)}
              className="w-full rounded-xl bg-purple-600 hover:bg-purple-500 py-2.5 text-xs font-bold text-white transition-colors"
            >
              OK
            </button>
          </div>
        </div>
      )}
    </div>
  );
};
