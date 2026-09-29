import React, { useState, useMemo } from 'react';
import { Card, ClassName, CollectionItem, Deck, DeckFormat } from '../../types/card';
import { CardVisual } from '../common/CardVisual';
import { CardDetailModal } from './CardDetailModal';
import {
  AdvanceFiltersPanel,
  AdvanceFiltersState,
  initialAdvanceFilters,
  countActiveAdvanceFilters,
  matchAdvanceFilters,
} from './AdvanceFiltersPanel';
import {
  CLASSES,
  RARITIES,
  isCardLegalInFormat,
  sortSetsByReleaseOrder,
  getSetReleaseOrder,
  formatSetDisplayName,
} from '../../services/rules';
import { playClick } from '../../services/sound';
import {
  Search,
  Filter,
  SlidersHorizontal,
  LayoutGrid,
  List,
  Layers,
  ArrowUpDown,
  X,
  Eye,
  Check,
  Grid,
  RotateCcw,
} from 'lucide-react';

interface CardBrowserProps {
  cards: Card[];
  cardsMap: Map<string, Card>;
  decks?: Deck[];
  activeDeck: Deck | null;
  onSelectActiveDeck?: (deck: Deck | null) => void;
  onAddCardToDeck?: (card: Card) => void;
  collection: Record<string, CollectionItem>;
  onUpdateCollection?: (cardId: string, regular: number, foil: number) => void;
  onAddToCraftPlan?: (card: Card) => void;
}

export const CardBrowser: React.FC<CardBrowserProps> = ({
  cards,
  cardsMap,
  decks = [],
  activeDeck,
  onSelectActiveDeck,
  onAddCardToDeck,
  collection,
  onUpdateCollection,
  onAddToCraftPlan,
}) => {
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedClass, setSelectedClass] = useState<ClassName | 'All'>('All');
  const [includeNeutral, setIncludeNeutral] = useState(false);
  const [selectedCost, setSelectedCost] = useState<number | 'All'>('All');
  const [selectedRarity, setSelectedRarity] = useState<number | 'All'>('All');
  const [selectedType, setSelectedType] = useState<string | 'All'>('All');
  const [selectedSet, setSelectedSet] = useState<string | 'All'>('All');
  const [selectedFormat, setSelectedFormat] = useState<DeckFormat | 'All'>('All');
  const [includeTokens, setIncludeTokens] = useState(false);
  const [sortBy, setSortBy] = useState<'cost' | 'rarity' | 'name' | 'atk' | 'life' | 'set'>('cost');
  const [sortOrder, setSortOrder] = useState<'asc' | 'desc'>('asc');
  const [viewMode, setViewMode] = useState<'grid' | 'list'>('grid');

  // Advance filters state
  const [advanceFilters, setAdvanceFilters] = useState<AdvanceFiltersState>(initialAdvanceFilters);
  const [showAdvancePanel, setShowAdvancePanel] = useState(false);

  const [inspectCard, setInspectCard] = useState<Card | null>(null);

  // Available sets from data, sorted by official release order
  const availableSets = useMemo(() => {
    const s = new Set<string>();
    cards.forEach((c) => {
      if (c.setName) s.add(c.setName);
    });
    return sortSetsByReleaseOrder(Array.from(s));
  }, [cards]);

  // Dynamic traits collected from cards and metadata
  const dynamicTraits = useMemo(() => {
    const set = new Set<string>();
    cards.forEach((c) => {
      c.tribes.forEach((t) => {
        if (t && t !== '-' && t.trim() !== '') set.add(t);
      });
    });
    return Array.from(set).sort();
  }, [cards]);

  // Filtered and sorted card list
  const filteredCards = useMemo(() => {
    return cards
      .filter((card) => {
        // Tokens: shown if includeTokens is true OR if Tokens set is selected
        const isTokensSet = selectedSet === 'Tokens' || selectedSet === '90000';
        if (!includeTokens && !isTokensSet && card.isToken) return false;

        // Search query (name, skillText, flavorText, tribes, illustrator, cv)
        if (searchQuery.trim()) {
          const q = searchQuery.toLowerCase();
          const matchName = card.name.toLowerCase().includes(q);
          const matchSkill =
            card.skillText.toLowerCase().includes(q) ||
            card.evoSkillText.toLowerCase().includes(q);
          const matchTribe = card.tribes.some((t) => t.toLowerCase().includes(q));
          const matchArtist = card.illustrator.toLowerCase().includes(q);
          const matchCV = card.cv.toLowerCase().includes(q);
          if (!matchName && !matchSkill && !matchTribe && !matchArtist && !matchCV) return false;
        }

        // Class (allows choosing a Craft Class and Neutral at the same time)
        if (selectedClass !== 'All') {
          if (selectedClass === 'Neutral') {
            if (card.className !== 'Neutral') return false;
          } else if (includeNeutral) {
            if (card.className !== selectedClass && card.className !== 'Neutral') {
              return false;
            }
          } else if (card.className !== selectedClass) {
            return false;
          }
        }

        // Cost
        if (selectedCost !== 'All') {
          if (selectedCost === 10) {
            if (card.cost < 10) return false;
          } else if (card.cost !== selectedCost) {
            return false;
          }
        }

        // Rarity
        if (selectedRarity !== 'All' && card.rarity !== selectedRarity) {
          return false;
        }

        // Type
        if (selectedType !== 'All' && card.type !== selectedType) {
          return false;
        }

        // Set
        if (selectedSet !== 'All' && card.setName !== selectedSet) {
          return false;
        }

        // Format
        if (selectedFormat !== 'All') {
          if (!isCardLegalInFormat(card, selectedFormat)) return false;
        }

        // Advance filters (Traits, Keywords, Mechanics, Action Effects)
        if (!matchAdvanceFilters(card, advanceFilters)) {
          return false;
        }

        return true;
      })
      .sort((a, b) => {
        let diff = 0;
        if (sortBy === 'cost') {
          diff = a.cost - b.cost;
        } else if (sortBy === 'rarity') {
          diff = b.rarity - a.rarity;
        } else if (sortBy === 'name') {
          diff = a.name.localeCompare(b.name);
        } else if (sortBy === 'atk') {
          diff = b.atk - a.atk;
        } else if (sortBy === 'life') {
          diff = b.life - a.life;
        } else if (sortBy === 'set') {
          diff = getSetReleaseOrder(a.setName) - getSetReleaseOrder(b.setName);
          if (diff === 0) diff = a.cost - b.cost;
        }
        return sortOrder === 'asc' ? diff : -diff;
      });
  }, [
    cards,
    searchQuery,
    selectedClass,
    includeNeutral,
    selectedCost,
    selectedRarity,
    selectedType,
    selectedSet,
    selectedFormat,
    includeTokens,
    advanceFilters,
    sortBy,
    sortOrder,
  ]);

  const activeAdvanceCount = countActiveAdvanceFilters(advanceFilters);

  const resetFilters = () => {
    playClick();
    setSearchQuery('');
    setSelectedClass('All');
    setIncludeNeutral(false);
    setSelectedCost('All');
    setSelectedRarity('All');
    setSelectedType('All');
    setSelectedSet('All');
    setSelectedFormat('All');
    setIncludeTokens(false);
    setAdvanceFilters(initialAdvanceFilters);
  };

  const hasActiveFilters =
    searchQuery !== '' ||
    selectedClass !== 'All' ||
    includeNeutral ||
    selectedCost !== 'All' ||
    selectedRarity !== 'All' ||
    selectedType !== 'All' ||
    selectedSet !== 'All' ||
    selectedFormat !== 'All' ||
    includeTokens ||
    activeAdvanceCount > 0;

  return (
    <div className="space-y-5">
      {/* Top Controls Header */}
      <div className="rounded-2xl border border-slate-800 bg-slate-900/60 p-4 sm:p-5 shadow-xl backdrop-blur-sm space-y-4">
        {/* Search Bar & Primary Actions */}
        <div className="flex flex-col sm:flex-row gap-3 items-stretch sm:items-center justify-between">
          <div className="relative flex-1">
            <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search by card name, keyword, tribe, artist, or CV..."
              className="w-full rounded-xl border border-slate-700 bg-slate-950/80 pl-10 pr-10 py-2.5 text-sm text-slate-100 placeholder-slate-500 focus:border-cyan-500 focus:outline-none focus:ring-1 focus:ring-cyan-500"
            />
            {searchQuery && (
              <button
                onClick={() => setSearchQuery('')}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-white"
              >
                <X className="h-4 w-4" />
              </button>
            )}
          </div>

          <div className="flex items-center space-x-2 shrink-0 flex-wrap gap-y-2">
            {/* Advance Filters Toggle Button */}
            <button
              onClick={() => {
                playClick();
                setShowAdvancePanel(!showAdvancePanel);
              }}
              className={`flex items-center space-x-1.5 rounded-lg px-3 py-1.5 text-xs font-semibold border transition-all ${
                showAdvancePanel || activeAdvanceCount > 0
                  ? 'border-cyan-400 bg-cyan-950/80 text-cyan-200 shadow-md'
                  : 'border-slate-800 bg-slate-950/70 text-slate-300 hover:text-white hover:border-slate-700'
              }`}
            >
              <SlidersHorizontal className="h-3.5 w-3.5 text-cyan-400" />
              <span>Advance Filters</span>
              {activeAdvanceCount > 0 && (
                <span className="ml-1 rounded-full bg-cyan-400 text-slate-950 px-1.5 py-0.2 text-[10px] font-black">
                  {activeAdvanceCount}
                </span>
              )}
            </button>

            {/* View Mode Toggle */}
            <div className="flex rounded-lg border border-slate-700 bg-slate-950 p-0.5">
              <button
                onClick={() => setViewMode('grid')}
                className={`p-2 rounded-md ${
                  viewMode === 'grid' ? 'bg-cyan-950 text-cyan-300' : 'text-slate-400 hover:text-white'
                }`}
                title="Grid View"
              >
                <LayoutGrid className="h-4 w-4" />
              </button>
              <button
                onClick={() => setViewMode('list')}
                className={`p-2 rounded-md ${
                  viewMode === 'list' ? 'bg-cyan-950 text-cyan-300' : 'text-slate-400 hover:text-white'
                }`}
                title="List View"
              >
                <List className="h-4 w-4" />
              </button>
            </div>

            {/* Sort Dropdown */}
            <div className="flex items-center space-x-1.5 bg-slate-950 border border-slate-700 rounded-lg px-2.5 py-1.5 text-xs text-slate-200">
              <ArrowUpDown className="h-3.5 w-3.5 text-slate-400" />
              <select
                value={sortBy}
                onChange={(e) => setSortBy(e.target.value as typeof sortBy)}
                className="bg-transparent text-slate-200 focus:outline-none cursor-pointer"
              >
                <option value="cost" className="bg-slate-900">Cost</option>
                <option value="set" className="bg-slate-900">Release Order (Set)</option>
                <option value="rarity" className="bg-slate-900">Rarity</option>
                <option value="name" className="bg-slate-900">Name</option>
                <option value="atk" className="bg-slate-900">Attack</option>
                <option value="life" className="bg-slate-900">Defense</option>
              </select>
              <button
                onClick={() => setSortOrder(sortOrder === 'asc' ? 'desc' : 'asc')}
                className="px-1 text-cyan-400 font-bold hover:text-cyan-300"
                title={`Order: ${sortOrder.toUpperCase()}`}
              >
                {sortOrder === 'asc' ? '↑' : '↓'}
              </button>
            </div>

            {hasActiveFilters && (
              <button
                onClick={resetFilters}
                className="rounded-lg border border-rose-900/50 bg-rose-950/40 px-2.5 py-1.5 text-xs font-medium text-rose-300 hover:bg-rose-900/50 transition-colors"
              >
                Reset
              </button>
            )}
          </div>
        </div>

        {/* Advance Filters Collapsible Drawer */}
        {showAdvancePanel && (
          <div className="pt-2 animate-in fade-in duration-200">
            <AdvanceFiltersPanel
              filters={advanceFilters}
              onChange={setAdvanceFilters}
              onClose={() => setShowAdvancePanel(false)}
              matchingCount={filteredCards.length}
              availableTraits={dynamicTraits.length > 0 ? dynamicTraits : undefined}
            />
          </div>
        )}

        {/* Class Filter Bar: Select Craft Class + Neutral simultaneously */}
        <div className="flex items-center gap-1.5 overflow-x-auto pb-1 scrollbar-none">
          <button
            onClick={() => {
              playClick();
              setSelectedClass('All');
              setIncludeNeutral(false);
            }}
            className={`shrink-0 rounded-lg px-3 py-1.5 text-xs font-semibold transition-all ${
              selectedClass === 'All'
                ? 'bg-cyan-500 text-slate-950 font-bold shadow-[0_0_10px_rgba(6,182,212,0.5)]'
                : 'bg-slate-950/70 border border-slate-800 text-slate-400 hover:border-slate-700 hover:text-white'
            }`}
          >
            All Classes
          </button>
          {CLASSES.filter((cls) => cls.name !== 'Neutral').map((cls) => {
            const isSelected = selectedClass === cls.name;
            return (
              <button
                key={cls.name}
                title={cls.name}
                onClick={() => {
                  playClick();
                  setSelectedClass(cls.name);
                }}
                className={`group relative shrink-0 p-2 rounded-xl border transition-all duration-150 flex items-center justify-center ${
                  isSelected
                    ? 'border-cyan-400 bg-cyan-950/80 shadow-[0_0_12px_rgba(34,211,238,0.4)] scale-105'
                    : 'border-slate-800 bg-slate-950/70 hover:border-slate-700 hover:bg-slate-900/80'
                }`}
                style={isSelected ? { borderColor: cls.color } : {}}
              >
                <img
                  src={cls.iconSvg}
                  alt={cls.name}
                  className={`h-6 w-6 object-contain transition-transform duration-150 group-hover:scale-110 ${
                    isSelected ? 'filter drop-shadow-[0_0_6px_rgba(34,211,238,0.8)]' : 'opacity-75 group-hover:opacity-100'
                  }`}
                />
              </button>
            );
          })}

          <div className="h-5 w-px bg-slate-800 shrink-0 mx-0.5" />

          {/* Neutral Button: can be selected alone or toggled alongside active class */}
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
                className={`group relative shrink-0 p-2 rounded-xl border transition-all duration-150 flex items-center justify-center space-x-1.5 ${
                  isNeutralSelected
                    ? 'border-slate-300 bg-slate-800 shadow-[0_0_12px_rgba(203,213,225,0.4)] scale-105'
                    : isNeutralActive
                    ? 'border-cyan-400 bg-cyan-950/80 shadow-[0_0_12px_rgba(6,182,212,0.4)]'
                    : 'border-slate-800 bg-slate-950/70 hover:border-slate-700 hover:bg-slate-900/80'
                }`}
                title={
                  selectedClass !== 'All' && selectedClass !== 'Neutral'
                    ? includeNeutral
                      ? 'Neutral cards included alongside ' + selectedClass + ' (click to exclude)'
                      : 'Click to include Neutral cards alongside ' + selectedClass
                    : 'Filter Neutral cards'
                }
              >
                <img
                  src={neutralConfig.iconSvg}
                  alt="Neutral"
                  className={`h-6 w-6 object-contain transition-transform duration-150 group-hover:scale-110 ${
                    isNeutralSelected || isNeutralActive ? 'filter drop-shadow-[0_0_6px_rgba(255,255,255,0.8)]' : 'opacity-75 group-hover:opacity-100'
                  }`}
                />
                {isNeutralActive && (
                  <Check className="h-3.5 w-3.5 text-cyan-400 font-bold" />
                )}
              </button>
            );
          })()}
        </div>

        {/* Secondary Filter Row: Cost, Rarity, Type, Format, Set */}
        <div className="flex flex-wrap items-center gap-3 pt-2 border-t border-slate-800/80 text-xs">
          {/* Cost Chips */}
          <div className="flex items-center space-x-1 overflow-x-auto">
            <span className="text-slate-500 font-semibold mr-1">Cost:</span>
            <button
              onClick={() => setSelectedCost('All')}
              className={`h-6 px-2 rounded font-bold ${
                selectedCost === 'All'
                  ? 'bg-emerald-500 text-slate-950'
                  : 'bg-slate-950 border border-slate-800 text-slate-400 hover:text-white'
              }`}
            >
              All
            </button>
            {[0, 1, 2, 3, 4, 5, 6, 7, 8, 9, 10].map((num) => (
              <button
                key={num}
                onClick={() => setSelectedCost(num)}
                className={`h-6 w-6 rounded font-bold transition-all ${
                  selectedCost === num
                    ? 'bg-emerald-400 text-slate-950 shadow-[0_0_8px_rgba(52,211,153,0.6)]'
                    : 'bg-slate-950 border border-slate-800 text-slate-400 hover:border-emerald-600 hover:text-white'
                }`}
              >
                {num === 10 ? '10+' : num}
              </button>
            ))}
          </div>

          <div className="h-4 w-px bg-slate-800 hidden sm:block" />

          {/* Rarity Filter */}
          <div className="flex items-center space-x-1">
            <span className="text-slate-500 font-semibold mr-1">Rarity:</span>
            {RARITIES.map((r) => (
              <button
                key={r.id}
                onClick={() => setSelectedRarity(selectedRarity === r.id ? 'All' : r.id)}
                className={`px-2 py-0.5 rounded font-semibold border transition-all ${
                  selectedRarity === r.id
                    ? 'shadow-sm text-white'
                    : 'border-slate-800 bg-slate-950 text-slate-400 hover:text-white'
                }`}
                style={
                  selectedRarity === r.id
                    ? { backgroundColor: `${r.color}30`, borderColor: r.color, color: r.color }
                    : {}
                }
              >
                {r.name}
              </button>
            ))}
          </div>

          <div className="h-4 w-px bg-slate-800 hidden sm:block" />

          {/* Type Filter */}
          <div className="flex items-center space-x-1">
            <span className="text-slate-500 font-semibold mr-1">Type:</span>
            {['Follower', 'Spell', 'Amulet'].map((t) => (
              <button
                key={t}
                onClick={() => setSelectedType(selectedType === t ? 'All' : t)}
                className={`px-2 py-0.5 rounded border transition-all ${
                  selectedType === t
                    ? 'border-cyan-500 bg-cyan-950 text-cyan-300 font-bold'
                    : 'border-slate-800 bg-slate-950 text-slate-400 hover:text-white'
                }`}
              >
                {t}
              </button>
            ))}
          </div>

          <div className="h-4 w-px bg-slate-800 hidden sm:block" />

          {/* Format Filter */}
          <div className="flex items-center space-x-1.5">
            <span className="text-slate-500 font-semibold">Format:</span>
            <select
              value={selectedFormat}
              onChange={(e) => setSelectedFormat(e.target.value as typeof selectedFormat)}
              className="bg-slate-950 border border-slate-800 rounded px-2.5 py-0.5 text-slate-300 focus:outline-none cursor-pointer"
            >
              <option value="All">All Formats</option>
              <option value="Rotation">Rotation (Basic + 6 Latest Sets)</option>
              <option value="Unlimited">Unlimited (All Cards)</option>
              <option value="Simplified">Simplified</option>
            </select>
          </div>

          <div className="h-4 w-px bg-slate-800 hidden sm:block" />

          {/* Set Filter: When selecting Tokens set, automatically tick Include Tokens */}
          <div className="flex items-center space-x-1.5">
            <span className="text-slate-500 font-semibold">Set:</span>
            <select
              value={selectedSet}
              onChange={(e) => {
                const val = e.target.value;
                setSelectedSet(val);
                if (val === 'Tokens' || val === '90000') {
                  setIncludeTokens(true);
                }
              }}
              className="bg-slate-950 border border-slate-800 rounded px-2.5 py-0.5 text-slate-300 focus:outline-none cursor-pointer max-w-[210px] truncate"
            >
              <option value="All">All Sets (Release Order)</option>
              {availableSets.map((s) => (
                <option key={s} value={s} className="bg-slate-900">
                  {formatSetDisplayName(s)}
                </option>
              ))}
            </select>
          </div>

          {/* Tokens Toggle */}
          <label className="flex items-center space-x-1.5 cursor-pointer ml-auto select-none">
            <input
              type="checkbox"
              checked={includeTokens || selectedSet === 'Tokens' || selectedSet === '90000'}
              onChange={(e) => setIncludeTokens(e.target.checked)}
              className="rounded border-slate-700 bg-slate-950 text-cyan-500 focus:ring-cyan-500"
            />
            <span className="text-slate-400 hover:text-slate-200">
              Include Tokens ({cards.filter((c) => c.isToken).length})
            </span>
          </label>
        </div>
      </div>

      {/* Cards Results Count & Active Deck Info Banner */}
      <div className="flex flex-wrap items-center justify-between gap-2 px-1 text-xs text-slate-400">
        <div className="flex items-center space-x-2">
          <span>
            Showing <span className="font-bold text-white">{filteredCards.length}</span> of {cards.length} cards
          </span>
          {activeAdvanceCount > 0 && (
            <span className="rounded bg-cyan-950/80 border border-cyan-800/50 px-2 py-0.5 text-cyan-300 font-semibold text-[11px]">
              {activeAdvanceCount} advance filter{activeAdvanceCount > 1 ? 's' : ''} active
            </span>
          )}
        </div>

        {/* Active Deck Selector / Indicator */}
        {decks && decks.length > 0 && onSelectActiveDeck ? (
          <div className="flex items-center space-x-2 text-xs">
            <span className="text-slate-500 font-medium">Active Deck:</span>
            <select
              value={activeDeck?.id || ''}
              onChange={(e) => {
                const found = decks.find((d) => d.id === e.target.value) || null;
                onSelectActiveDeck(found);
              }}
              className="rounded-lg bg-slate-950 border border-slate-800 px-2.5 py-1 text-xs text-slate-300 focus:border-cyan-500 focus:outline-none cursor-pointer max-w-[200px] truncate"
            >
              <option value="">None (Browse Only)</option>
              {decks.map((d) => (
                <option key={d.id} value={d.id} className="bg-slate-900">
                  {d.name} ({d.class})
                </option>
              ))}
            </select>
            {activeDeck && (
              <button
                onClick={() => onSelectActiveDeck(null)}
                className="rounded p-1 text-slate-500 hover:text-rose-400 hover:bg-slate-800 transition-colors"
                title="Unselect active deck"
              >
                <X className="h-3.5 w-3.5" />
              </button>
            )}
          </div>
        ) : (
          activeDeck && (
            <div className="flex items-center space-x-1.5 rounded-full bg-cyan-950/60 border border-cyan-800/40 px-3 py-1 text-cyan-300">
              <Layers className="h-3 w-3" />
              <span>
                Active Deck: <strong>{activeDeck.name}</strong> ({activeDeck.class} · {activeDeck.format})
              </span>
            </div>
          )
        )}
      </div>

      {/* Card Grid View */}
      {viewMode === 'grid' ? (
        <div className="grid grid-cols-[repeat(auto-fill,minmax(175px,1fr))] gap-4 sm:gap-5 justify-items-center">
          {filteredCards.map((card) => {
            const inDeckCount = activeDeck?.cards[card.id] || 0;
            const inCollection = collection[card.id];
            return (
              <CardVisual
                key={card.id}
                card={card}
                onDetails={() => setInspectCard(card)}
                deckCount={activeDeck ? inDeckCount : undefined}
                collectionCount={inCollection?.regularCount}
                foilCount={inCollection?.foilCount}
                onQuickAdd={
                  activeDeck && onAddCardToDeck && !card.isToken && inDeckCount < 3
                    ? () => onAddCardToDeck(card)
                    : undefined
                }
                onQuickCollectionAdd={
                  onUpdateCollection && !card.isToken
                    ? () =>
                        onUpdateCollection(
                          card.id,
                          Math.min(3, (inCollection?.regularCount || 0) + 1),
                          inCollection?.foilCount || 0
                        )
                    : undefined
                }
              />
            );
          })}
        </div>
      ) : (
        /* List View */
        <div className="rounded-2xl border border-slate-800 bg-slate-900/60 divide-y divide-slate-800/70 overflow-hidden">
          {filteredCards.map((card) => {
            const inDeckCount = activeDeck?.cards[card.id] || 0;
            const inCollection = collection[card.id];
            const rarity = RARITIES.find((r) => r.id === card.rarity);
            return (
              <div
                key={card.id}
                className="flex items-center justify-between p-2.5 sm:p-3 hover:bg-slate-800/40 transition-colors"
              >
                <div className="flex items-center space-x-3 min-w-0">
                  {/* Cost badge */}
                  <div className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full border border-emerald-500 bg-emerald-950 font-bold text-xs text-white">
                    {card.cost}
                  </div>

                  {/* Artwork thumbnail */}
                  <img
                    src={card.image}
                    alt={card.name}
                    className="h-10 w-8 rounded object-contain border border-transparent shrink-0 bg-slate-950"
                  />

                  {/* Name and tags */}
                  <div className="min-w-0">
                    <div className="flex items-center space-x-2">
                      <span className="font-semibold text-slate-100 text-sm truncate">
                        {card.name}
                      </span>
                      <span
                        className="text-[10px] font-bold rounded px-1.5 py-0.2"
                        style={{ color: rarity?.color, backgroundColor: `${rarity?.color}20` }}
                      >
                        {card.rarityName}
                      </span>
                      {card.isToken && (
                        <span className="rounded bg-rose-950 border border-rose-700 px-1 py-0.2 text-[9px] text-rose-300">
                          Token
                        </span>
                      )}
                    </div>
                    <div className="text-xs text-slate-400 truncate">
                      {card.className} · {card.type}
                      {card.type === 'Follower' && ` (${card.atk}/${card.life})`}
                      {card.tribes.length > 0 && ` · ${card.tribes.join(', ')}`}
                    </div>
                  </div>
                </div>

                {/* Right actions */}
                <div className="flex items-center space-x-2.5 shrink-0">
                  {inDeckCount > 0 && (
                    <span className="rounded bg-cyan-950 border border-cyan-700 px-2 py-0.5 text-xs text-cyan-300 font-bold">
                      {inDeckCount}x in deck
                    </span>
                  )}
                  {inCollection && inCollection.regularCount > 0 && (
                    <span className="text-xs text-slate-400">
                      {inCollection.regularCount}/3 owned
                    </span>
                  )}

                  {/* Dedicated Details Button */}
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      playClick();
                      setInspectCard(card);
                    }}
                    className="flex items-center space-x-1 rounded-lg bg-slate-800 hover:bg-slate-700 border border-slate-700 px-2 py-1 text-xs font-medium text-slate-200 transition-colors"
                    title="View card details"
                  >
                    <Eye className="h-3 w-3 text-cyan-400" />
                    <span>Details</span>
                  </button>

                  {activeDeck && onAddCardToDeck && !card.isToken && (
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        playClick();
                        onAddCardToDeck(card);
                      }}
                      disabled={inDeckCount >= 3}
                      className="rounded-lg bg-cyan-900 border border-cyan-600 px-2 py-1 text-xs font-semibold text-cyan-200 hover:bg-cyan-800 disabled:opacity-30"
                    >
                      + Deck
                    </button>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Empty State */}
      {filteredCards.length === 0 && (
        <div className="flex flex-col items-center justify-center rounded-2xl border border-slate-800 bg-slate-900/30 p-12 text-center">
          <Filter className="h-10 w-10 text-slate-600 mb-3" />
          <h3 className="font-serif text-lg font-bold text-slate-300">No cards found</h3>
          <p className="mt-1 text-sm text-slate-500 max-w-sm">
            Try adjusting your search terms, removing filters, or resetting advance filters.
          </p>
          <button
            onClick={resetFilters}
            className="mt-4 rounded-lg bg-cyan-900/60 border border-cyan-500/50 px-4 py-2 text-xs font-semibold text-cyan-200 hover:bg-cyan-800"
          >
            Clear all filters
          </button>
        </div>
      )}

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
            activeDeck && onAddCardToDeck
              ? (c) => onAddCardToDeck(c)
              : undefined
          }
          onAddToCraftPlan={
            onAddToCraftPlan
              ? (c) => onAddToCraftPlan(c)
              : undefined
          }
        />
      )}
    </div>
  );
};
