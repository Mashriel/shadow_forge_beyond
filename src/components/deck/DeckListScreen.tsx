import React, { useState } from 'react';
import { Card, ClassName, Deck, DeckFormat } from '../../types/card';
import { CLASSES, FORMATS, validateDeck, DECK_SIZE_LIMIT } from '../../services/rules';
import { getAvailableTagsForClass, PLAYSTYLE_TAGS } from '../../services/deckTags';
import { playClick } from '../../services/sound';
import {
  Plus,
  Layers,
  Sword,
  Copy,
  Trash2,
  Edit3,
  CheckCircle2,
  AlertTriangle,
  Upload,
  Download,
  Sparkles,
  Search,
  Filter,
  Tag,
  Check,
  ArrowRight,
} from 'lucide-react';

interface DeckListScreenProps {
  decks: Deck[];
  cardsMap: Map<string, Card>;
  onSelectDeck: (deck: Deck) => void;
  onCreateDeck: (name: string, className: ClassName, format: DeckFormat, tags?: string[]) => void;
  onDuplicateDeck: (deck: Deck) => void;
  onDeleteDeck: (id: string) => void;
  onTestHand: (deck: Deck) => void;
  onImportDeck: () => void;
  onUpdateDeck?: (deck: Deck) => void;
}

export const DeckListScreen: React.FC<DeckListScreenProps> = ({
  decks,
  cardsMap,
  onSelectDeck,
  onCreateDeck,
  onDuplicateDeck,
  onDeleteDeck,
  onTestHand,
  onImportDeck,
  onUpdateDeck,
}) => {
  const [filterClass, setFilterClass] = useState<ClassName | 'All'>('All');
  const [filterFormat, setFilterFormat] = useState<DeckFormat | 'All'>('All');
  const [filterTag, setFilterFormatTag] = useState<string>('All');
  const [searchQuery, setSearchQuery] = useState('');

  // Create deck modal state
  const [isCreateOpen, setIsCreateOpen] = useState(false);
  const [newDeckName, setNewDeckName] = useState('');
  const [newDeckClass, setNewDeckClass] = useState<ClassName>('Swordcraft');
  const [newDeckFormat, setNewDeckFormat] = useState<DeckFormat>('Rotation');
  const [newDeckTags, setNewDeckTags] = useState<string[]>([]);

  // Delete confirmation modal state
  const [deckToDelete, setDeckToDelete] = useState<Deck | null>(null);

  const filteredDecks = decks.filter((deck) => {
    if (filterClass !== 'All' && deck.class !== filterClass) return false;
    if (filterFormat !== 'All' && deck.format !== filterFormat) return false;
    if (filterTag !== 'All' && (!deck.tags || !deck.tags.includes(filterTag))) return false;
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase();
      const matchName = deck.name.toLowerCase().includes(q);
      const matchTags = deck.tags && deck.tags.some((t) => t.toLowerCase().includes(q));
      if (!matchName && !matchTags) return false;
    }
    return true;
  });

  const handleOpenCreate = () => {
    playClick();
    setNewDeckName('');
    setNewDeckTags([]);
    setIsCreateOpen(true);
  };

  const handleConfirmCreate = (e: React.FormEvent) => {
    e.preventDefault();
    playClick();
    const finalName = newDeckName.trim() || `${newDeckClass} Deck`;
    onCreateDeck(finalName, newDeckClass, newDeckFormat, newDeckTags);
    setIsCreateOpen(false);
  };

  const toggleCreateTag = (tag: string) => {
    playClick();
    setNewDeckTags((prev) =>
      prev.includes(tag) ? prev.filter((t) => t !== tag) : [...prev, tag]
    );
  };

  const availableTags = getAvailableTagsForClass(newDeckClass);

  return (
    <div className="space-y-6">
      {/* Top Banner & Primary Actions */}
      <div className="rounded-2xl border border-cyan-900/40 bg-gradient-to-r from-slate-900 via-cyan-950/40 to-slate-900 p-5 sm:p-6 shadow-2xl backdrop-blur-md">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <h1 className="font-serif text-2xl sm:text-3xl font-bold tracking-wide text-white">
              Decks & Classes
            </h1>
            <p className="mt-1 text-xs sm:text-sm text-slate-400">
              Build and customize decks for Rotation, Unlimited, and Simplified formats.
            </p>
          </div>

          <div className="flex items-center space-x-2.5">
            <button
              onClick={() => {
                playClick();
                onImportDeck();
              }}
              className="flex items-center space-x-1.5 rounded-xl border border-slate-700 bg-slate-950 px-3.5 py-2.5 text-xs sm:text-sm font-semibold text-slate-200 hover:border-slate-500 hover:text-white transition-all shadow-md"
            >
              <Upload className="h-4 w-4 text-cyan-400" />
              <span>Import Deck</span>
            </button>

            <button
              onClick={handleOpenCreate}
              className="flex items-center space-x-2 rounded-xl bg-gradient-to-r from-cyan-500 to-teal-400 px-4 py-2.5 text-xs sm:text-sm font-bold text-slate-950 shadow-[0_0_15px_rgba(6,182,212,0.5)] hover:brightness-110 transition-all"
            >
              <Plus className="h-4 w-4 stroke-[3]" />
              <span>Create New Deck</span>
            </button>
          </div>
        </div>

        {/* Filter Toolbar with SVG Class Icon Buttons */}
        <div className="mt-6 flex flex-col md:flex-row items-stretch md:items-center justify-between gap-4 pt-4 border-t border-slate-800">
          <div className="relative flex-1 max-w-md">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search your decks by name or tag..."
              className="w-full rounded-xl border border-slate-800 bg-slate-950/80 pl-9 pr-3 py-2 text-xs text-slate-100 placeholder-slate-500 focus:border-cyan-500 focus:outline-none"
            />
          </div>

          <div className="flex flex-wrap items-center gap-3 text-xs">
            {/* Class Icon Filter Bar (excluding Neutral) */}
            <div className="flex items-center gap-1 bg-slate-950 border border-slate-800 rounded-xl p-1">
              <button
                type="button"
                onClick={() => {
                  playClick();
                  setFilterClass('All');
                }}
                className={`px-3 py-1.5 rounded-lg font-semibold transition-all ${
                  filterClass === 'All'
                    ? 'bg-cyan-500 text-slate-950 font-bold shadow-[0_0_10px_rgba(6,182,212,0.4)]'
                    : 'text-slate-400 hover:text-white'
                }`}
              >
                All
              </button>
              {CLASSES.filter((c) => c.name !== 'Neutral').map((cls) => {
                const isSelected = filterClass === cls.name;
                return (
                  <button
                    type="button"
                    key={cls.name}
                    title={cls.name}
                    onClick={() => {
                      playClick();
                      setFilterClass(cls.name);
                    }}
                    className={`group relative p-1.5 rounded-lg border transition-all duration-150 flex items-center justify-center ${
                      isSelected
                        ? 'border-cyan-400 bg-cyan-950/80 shadow-[0_0_10px_rgba(34,211,238,0.3)] scale-105'
                        : 'border-transparent hover:border-slate-700 hover:bg-slate-900/60'
                    }`}
                  >
                    <img
                      src={cls.iconSvg}
                      alt={cls.name}
                      className={`h-5 w-5 object-contain transition-transform group-hover:scale-110 ${
                        isSelected ? 'filter drop-shadow-[0_0_6px_rgba(34,211,238,0.8)]' : 'opacity-70 group-hover:opacity-100'
                      }`}
                    />
                  </button>
                );
              })}
            </div>

            {/* Format filter */}
            <div className="flex items-center space-x-1.5 bg-slate-950 border border-slate-800 rounded-xl px-2.5 py-1.5 text-slate-300">
              <span className="text-slate-500 font-semibold">Format:</span>
              <select
                value={filterFormat}
                onChange={(e) => setFilterFormat(e.target.value as typeof filterFormat)}
                className="bg-transparent focus:outline-none cursor-pointer font-medium"
              >
                <option value="All" className="bg-slate-900">All Formats</option>
                {FORMATS.map((f) => (
                  <option key={f.id} value={f.id} className="bg-slate-900">
                    {f.label}
                  </option>
                ))}
              </select>
            </div>
          </div>
        </div>
      </div>

      {/* Decks Grid */}
      <div className="grid grid-cols-[repeat(auto-fill,minmax(330px,1fr))] gap-4 sm:gap-5">
        {filteredDecks.map((deck) => {
          const classConfig = CLASSES.find((c) => c.name === deck.class) || CLASSES[0];
          const validation = validateDeck(deck, cardsMap);
          const totalCards = Object.values(deck.cards).reduce((sum, q) => sum + q, 0);

          return (
            <div
              key={deck.id}
              onClick={() => {
                playClick();
                onSelectDeck(deck);
              }}
              className="group relative rounded-2xl border border-slate-800 bg-slate-900/60 p-4 sm:p-5 hover:border-cyan-500/50 hover:bg-slate-900/90 transition-all duration-200 cursor-pointer shadow-lg hover:shadow-cyan-950/30 flex flex-col justify-between overflow-hidden"
            >
              {/* Faded Large Class SVG Icon on Side */}
              <img
                src={classConfig.iconSvg}
                alt={deck.class}
                className="absolute -right-3 -bottom-2 h-28 w-28 opacity-15 group-hover:opacity-30 transition-all duration-300 pointer-events-none filter drop-shadow-[0_0_12px_rgba(255,255,255,0.15)]"
              />

              {/* Background class accent */}
              <div
                className={`absolute top-0 right-0 w-36 h-36 bg-gradient-to-bl ${classConfig.bgGradient} rounded-bl-full pointer-events-none opacity-30 group-hover:opacity-60 transition-opacity`}
              />

              <div className="relative z-10">
                {/* Header: Class, Format & Status */}
                <div className="flex items-center justify-between">
                  <div className="flex items-center space-x-2">
                    <span
                      className="shrink-0 flex items-center space-x-1.5 rounded-lg px-2.5 py-1 text-xs font-bold border"
                      style={{
                        color: classConfig.color,
                        borderColor: `${classConfig.color}40`,
                        backgroundColor: `${classConfig.color}15`,
                      }}
                    >
                      <img
                        src={classConfig.iconSvg}
                        alt={deck.class}
                        className="h-4 w-4 object-contain"
                      />
                      <span>{deck.class}</span>
                    </span>
                    <span className="rounded bg-slate-800/90 border border-slate-700 px-2 py-0.5 text-[11px] font-semibold text-slate-300">
                      {deck.format}
                    </span>
                  </div>

                  {validation.valid ? (
                    <span
                      title={`Ready (${DECK_SIZE_LIMIT} cards, legal for ${deck.format})`}
                      className="flex items-center space-x-1 text-emerald-400 text-xs font-bold"
                    >
                      <CheckCircle2 className="h-4 w-4" />
                      <span>Ready</span>
                    </span>
                  ) : deck.format === 'Rotation' && validation.errors.some((e) => e.includes('Rotation') || e.includes('legal')) ? (
                    <span
                      title="Contains cards from sets that rotated out of Rotation format"
                      className="flex items-center space-x-1 text-rose-400 text-xs font-bold animate-pulse"
                    >
                      <AlertTriangle className="h-3.5 w-3.5 text-rose-400" />
                      <span>Rotated Out</span>
                    </span>
                  ) : (
                    <span
                      title={`${totalCards}/${DECK_SIZE_LIMIT} cards`}
                      className="flex items-center space-x-1 text-amber-400 text-xs font-semibold"
                    >
                      <AlertTriangle className="h-3.5 w-3.5" />
                      <span>{totalCards}/40</span>
                    </span>
                  )}
                </div>

                {/* Deck Name */}
                <h2 className="mt-3 font-serif text-lg sm:text-xl font-bold text-white group-hover:text-cyan-300 transition-colors truncate">
                  {deck.name}
                </h2>

                {/* Tags */}
                {deck.tags && deck.tags.length > 0 && (
                  <div className="mt-2.5 flex flex-wrap gap-1">
                    {deck.tags.map((tag) => (
                      <span
                        key={tag}
                        onClick={(e) => {
                          e.stopPropagation();
                          playClick();
                          setSearchQuery(tag);
                        }}
                        className="rounded-full bg-slate-950/90 border border-slate-700/80 px-2.5 py-0.5 text-[10px] text-cyan-300 hover:text-white hover:border-cyan-500 font-medium transition-colors"
                      >
                        #{tag}
                      </span>
                    ))}
                  </div>
                )}
              </div>

              {/* Card preview bar / footer */}
              <div className="mt-6 pt-3 border-t border-slate-800/80 flex items-center justify-between text-xs text-slate-400">
                <span>
                  Total Cards: <strong className="text-white">{totalCards}</strong>
                </span>

                {/* Action Buttons */}
                <div className="flex items-center space-x-1" onClick={(e) => e.stopPropagation()}>
                  {/* Move to Unlimited if Rotated Out */}
                  {deck.format === 'Rotation' && validation.errors.some((e) => e.includes('Rotation') || e.includes('legal')) && (
                    <button
                      onClick={() => {
                        playClick();
                        onUpdateDeck?.({
                          ...deck,
                          format: 'Unlimited',
                          updatedAt: new Date().toISOString(),
                        });
                      }}
                      className="flex items-center space-x-1 rounded-lg bg-indigo-950 border border-indigo-500/80 px-2.5 py-1 text-xs font-bold text-indigo-200 hover:bg-indigo-900 transition-all shadow-[0_0_10px_rgba(99,102,241,0.35)] mr-1"
                      title="Move deck format to Unlimited to make it legal"
                    >
                      <ArrowRight className="h-3.5 w-3.5 text-indigo-400" />
                      <span>Move to Unlimited</span>
                    </button>
                  )}

                  {/* Test Hand */}
                  <button
                    onClick={() => {
                      playClick();
                      onTestHand(deck);
                    }}
                    className="flex items-center space-x-1 rounded-lg bg-amber-950/80 border border-amber-500/60 px-2.5 py-1 text-xs font-semibold text-amber-300 hover:bg-amber-900 transition-colors shadow-sm"
                    title="Test Opening Hand & Draws"
                  >
                    <Sword className="h-3.5 w-3.5" />
                    <span>Test Hand</span>
                  </button>

                  {/* Duplicate */}
                  <button
                    onClick={() => {
                      playClick();
                      onDuplicateDeck(deck);
                    }}
                    className="p-1.5 rounded-lg border border-slate-800 bg-slate-950 text-slate-400 hover:text-white hover:border-slate-600"
                    title="Duplicate Deck"
                  >
                    <Copy className="h-3.5 w-3.5" />
                  </button>

                  {/* Delete */}
                  <button
                    onClick={() => {
                      playClick();
                      setDeckToDelete(deck);
                    }}
                    className="p-1.5 rounded-lg border border-slate-800 bg-slate-950 text-slate-400 hover:text-rose-400 hover:border-rose-900/50"
                    title="Delete Deck"
                  >
                    <Trash2 className="h-3.5 w-3.5" />
                  </button>
                </div>
              </div>
            </div>
          );
        })}
      </div>

      {filteredDecks.length === 0 && (
        <div className="flex flex-col items-center justify-center rounded-2xl border border-slate-800 bg-slate-900/30 p-12 text-center">
          <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-cyan-950 border border-cyan-500/40 text-cyan-400 mb-4 shadow-[0_0_15px_rgba(6,182,212,0.3)]">
            <Layers className="h-7 w-7" />
          </div>
          <h3 className="font-serif text-lg sm:text-xl font-bold text-slate-200">No Saved Decks Yet</h3>
          <p className="mt-1 text-xs sm:text-sm text-slate-400 max-w-md leading-relaxed">
            Your deck list is clean and ready. Create a new deck from scratch or load an exported backup JSON file.
          </p>
          <div className="flex flex-wrap items-center justify-center gap-3 mt-5">
            <button
              onClick={handleOpenCreate}
              className="flex items-center space-x-2 rounded-xl bg-gradient-to-r from-cyan-500 to-teal-400 px-5 py-2.5 text-xs font-bold text-slate-950 shadow-[0_0_15px_rgba(6,182,212,0.4)] hover:brightness-110 transition-all"
            >
              <Plus className="h-4 w-4" />
              <span>Create Your First Deck</span>
            </button>
            <button
              onClick={onImportDeck}
              className="flex items-center space-x-2 rounded-xl border border-slate-700 bg-slate-950 px-4 py-2.5 text-xs font-semibold text-slate-300 hover:text-white hover:border-cyan-500/60 transition-colors"
            >
              <Download className="h-4 w-4 text-cyan-400" />
              <span>Import Backup Archive</span>
            </button>
          </div>
        </div>
      )}

      {/* CREATE DECK MODAL */}
      {isCreateOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm">
          <div
            className="w-full max-w-md rounded-2xl border border-cyan-800/40 bg-slate-950 p-6 text-slate-100 shadow-2xl"
            onClick={(e) => e.stopPropagation()}
          >
            <h2 className="font-serif text-xl font-bold text-white mb-1">Create New Deck</h2>
            <p className="text-xs text-slate-400 mb-5">
              Select your deck's class and tournament format.
            </p>

            <form onSubmit={handleConfirmCreate} className="space-y-4">
              {/* Deck Name */}
              <div>
                <label className="block text-xs font-semibold text-slate-300 mb-1.5">
                  Deck Name
                </label>
                <input
                  type="text"
                  required
                  placeholder="e.g. Ramp Dragon, Levin Aggro..."
                  value={newDeckName}
                  onChange={(e) => setNewDeckName(e.target.value)}
                  className="w-full rounded-xl border border-slate-700 bg-slate-900 px-3.5 py-2 text-sm text-white placeholder-slate-500 focus:border-cyan-500 focus:outline-none"
                />
              </div>

              {/* Class Selection */}
              <div>
                <div className="flex items-center justify-between mb-1.5">
                  <label className="text-xs font-semibold text-slate-300">
                    Class
                  </label>
                  <span className="text-xs font-bold text-cyan-400">
                    {newDeckClass}
                  </span>
                </div>
                <div className="grid grid-cols-4 sm:grid-cols-7 gap-2 p-1 bg-slate-950/80 rounded-xl border border-slate-800">
                  {CLASSES.filter((c) => c.name !== 'Neutral').map((cls) => {
                    const isSelected = newDeckClass === cls.name;
                    return (
                      <button
                        type="button"
                        key={cls.name}
                        title={cls.name}
                        onClick={() => {
                          playClick();
                          setNewDeckClass(cls.name);
                        }}
                        className={`group relative flex flex-col items-center justify-center p-2.5 rounded-lg border transition-all duration-150 ${
                          isSelected
                            ? 'border-cyan-400 bg-cyan-950/80 shadow-[0_0_12px_rgba(34,211,238,0.3)] scale-105'
                            : 'border-slate-800/80 bg-slate-900/40 hover:border-slate-700 hover:bg-slate-900/80'
                        }`}
                      >
                        <img
                          src={cls.iconSvg}
                          alt={cls.name}
                          className={`h-7 w-7 object-contain transition-transform duration-150 group-hover:scale-110 ${
                            isSelected ? 'filter drop-shadow-[0_0_6px_rgba(34,211,238,0.8)]' : 'opacity-80 group-hover:opacity-100'
                          }`}
                        />
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* Format Selection */}
              <div>
                <label className="block text-xs font-semibold text-slate-300 mb-1.5">
                  Format
                </label>
                <div className="grid grid-cols-3 gap-2">
                  {FORMATS.map((fmt) => {
                    const isSelected = newDeckFormat === fmt.id;
                    return (
                      <button
                        type="button"
                        key={fmt.id}
                        onClick={() => {
                          playClick();
                          setNewDeckFormat(fmt.id);
                        }}
                        className={`rounded-xl border py-2.5 px-3 text-center text-xs font-semibold transition-all ${
                          isSelected
                            ? 'border-cyan-400 bg-cyan-950 text-cyan-300 shadow-[0_0_10px_rgba(6,182,212,0.3)] font-bold'
                            : 'border-slate-800 bg-slate-900/80 text-slate-400 hover:text-white hover:border-slate-700'
                        }`}
                      >
                        <div>{fmt.label}</div>
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* Tag Selection: Playstyle & Archetype */}
              <div className="space-y-3 pt-1">
                <div>
                  <label className="block text-xs font-semibold text-slate-300 mb-1.5 flex items-center space-x-1.5">
                    <Tag className="h-3.5 w-3.5 text-cyan-400" />
                    <span>Playstyle Tags</span>
                  </label>
                  <div className="flex flex-wrap gap-1.5 max-h-24 overflow-y-auto p-1 bg-slate-950/60 rounded-xl border border-slate-800">
                    {PLAYSTYLE_TAGS.map((pt) => {
                      const active = newDeckTags.includes(pt);
                      return (
                        <button
                          type="button"
                          key={pt}
                          onClick={() => toggleCreateTag(pt)}
                          className={`rounded-lg px-2.5 py-1 text-[11px] font-medium transition-all ${
                            active
                              ? 'bg-cyan-500 text-slate-950 font-bold shadow-sm'
                              : 'bg-slate-900 border border-slate-800 text-slate-400 hover:border-slate-700 hover:text-slate-200'
                          }`}
                        >
                          {pt}
                        </button>
                      );
                    })}
                  </div>
                </div>

                {availableTags.archetype.length > 0 && (
                  <div>
                    <label className="block text-xs font-semibold text-slate-300 mb-1.5 flex items-center space-x-1.5">
                      <Sparkles className="h-3.5 w-3.5 text-amber-400" />
                      <span>{newDeckClass} Archetype Tags</span>
                    </label>
                    <div className="flex flex-wrap gap-1.5 p-1 bg-slate-950/60 rounded-xl border border-slate-800">
                      {availableTags.archetype.map((at) => {
                        const active = newDeckTags.includes(at);
                        return (
                          <button
                            type="button"
                            key={at}
                            onClick={() => toggleCreateTag(at)}
                            className={`rounded-lg px-2.5 py-1 text-[11px] font-medium transition-all ${
                              active
                                ? 'bg-amber-500 text-slate-950 font-bold shadow-sm'
                                : 'bg-slate-900 border border-slate-800 text-slate-400 hover:border-slate-700 hover:text-slate-200'
                            }`}
                          >
                            {at}
                          </button>
                        );
                      })}
                    </div>
                  </div>
                )}
              </div>

              {/* Action buttons */}
              <div className="flex items-center justify-end space-x-2 pt-3 border-t border-slate-800">
                <button
                  type="button"
                  onClick={() => setIsCreateOpen(false)}
                  className="rounded-xl border border-slate-700 px-4 py-2 text-xs font-semibold text-slate-300 hover:bg-slate-900"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="rounded-xl bg-gradient-to-r from-cyan-500 to-teal-400 px-5 py-2 text-xs font-bold text-slate-950 shadow-md hover:brightness-110"
                >
                  Create & Build
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Delete Confirmation Modal */}
      {deckToDelete && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/85 backdrop-blur-md p-4 animate-in fade-in duration-150">
          <div className="w-full max-w-md rounded-2xl border border-rose-500/50 bg-slate-900 p-6 shadow-2xl space-y-4">
            <div className="flex items-center space-x-3 text-rose-400">
              <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-rose-950 border border-rose-500/60 shadow-[0_0_12px_rgba(244,63,94,0.3)]">
                <Trash2 className="h-5 w-5 text-rose-400" />
              </div>
              <div>
                <h3 className="font-serif text-lg font-bold text-white">Delete Deck</h3>
                <p className="text-xs text-slate-400">This action cannot be undone</p>
              </div>
            </div>

            <p className="text-xs sm:text-sm text-slate-300 leading-relaxed bg-slate-950/60 p-3.5 rounded-xl border border-slate-800">
              Are you sure you want to delete <strong className="text-white font-bold">{deckToDelete.name}</strong> ({deckToDelete.class})?
            </p>

            <div className="flex items-center justify-end space-x-3 pt-2">
              <button
                type="button"
                onClick={() => setDeckToDelete(null)}
                className="rounded-xl border border-slate-700 bg-slate-950 px-4 py-2 text-xs font-semibold text-slate-300 hover:text-white hover:border-slate-500 transition-colors"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={() => {
                  playClick();
                  onDeleteDeck(deckToDelete.id);
                  setDeckToDelete(null);
                }}
                className="rounded-xl bg-gradient-to-r from-rose-600 to-red-500 px-5 py-2 text-xs font-bold text-white shadow-[0_0_15px_rgba(244,63,94,0.6)] hover:brightness-110 transition-all"
              >
                Delete Deck
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
