import React, { useState, useEffect } from 'react';
import { Card, ClassName, CollectionItem, CraftPlanItem, Deck, DeckFormat } from './types/card';
import { fetchCardDatabase } from './services/cardData';
import { loadExtraEffects } from './services/extraEffects';
import {
  getAllDecks,
  saveDeck,
  deleteDeck,
  getAllCollection,
  saveCollectionItem,
  batchSaveCollection,
  getAllCraftPlans,
  saveCraftPlan,
  deleteCraftPlan,
} from './services/db';
import { Header, ActiveTab } from './components/common/Header';
import { DeckListScreen } from './components/deck/DeckListScreen';
import { DeckBuilder } from './components/deck/DeckBuilder';
import { CardBrowser } from './components/cards/CardBrowser';
import { CollectionManager } from './components/collection/CollectionManager';
import { SetTracker } from './components/tracker/SetTracker';
import { CraftPlanner } from './components/crafting/CraftPlanner';
import { HandTester } from './components/handtester/HandTester';
import { ImportExportModal } from './components/importexport/ImportExportModal';
import { playClick } from './services/sound';
import { Sparkles, Loader2 } from 'lucide-react';

export default function App() {
  const [loading, setLoading] = useState(true);
  const [cards, setCards] = useState<Card[]>([]);
  const [cardsMap, setCardsMap] = useState<Map<string, Card>>(new Map());

  const [activeTab, setActiveTab] = useState<ActiveTab>('decks');
  const [decks, setDecks] = useState<Deck[]>([]);
  const [editingDeck, setEditingDeck] = useState<Deck | null>(null);
  const [testerDeckId, setTesterDeckId] = useState<string | undefined>(undefined);

  const [collection, setCollection] = useState<Record<string, CollectionItem>>({});
  const [craftPlans, setCraftPlans] = useState<Record<string, CraftPlanItem>>({});

  const [isImportExportOpen, setIsImportExportOpen] = useState(false);

  // Initialize data
  const loadData = async () => {
    try {
      const [dbResult] = await Promise.all([
        fetchCardDatabase(),
        loadExtraEffects(),
      ]);
      setCards(dbResult.cards);
      setCardsMap(dbResult.map);

      const [loadedDecks, loadedCollection, loadedCraftPlans] = await Promise.all([
        getAllDecks(),
        getAllCollection(),
        getAllCraftPlans(),
      ]);

      setDecks(loadedDecks);
      setCollection(loadedCollection);
      setCraftPlans(loadedCraftPlans);
    } catch (e) {
      console.error('Failed to initialize application data:', e);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  /* ================== DECK ACTIONS ================== */

  const handleSelectDeck = (deck: Deck) => {
    setEditingDeck(deck);
  };

  const handleCreateDeck = async (name: string, className: ClassName, format: DeckFormat, tags?: string[]) => {
    const newDeck: Deck = {
      id: `deck-${Date.now()}`,
      version: 1,
      name,
      class: className,
      format,
      cards: {},
      tags: tags && tags.length > 0 ? tags : ['Custom'],
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };
    await saveDeck(newDeck);
    setDecks((prev) => [newDeck, ...prev]);
    setEditingDeck(newDeck);
  };

  const handleSaveDeck = async (updated: Deck) => {
    await saveDeck(updated);
    setDecks((prev) => prev.map((d) => (d.id === updated.id ? updated : d)));
    setEditingDeck(updated);
  };

  const handleDuplicateDeck = async (sourceDeck: Deck) => {
    const copy: Deck = {
      ...sourceDeck,
      id: `deck-${Date.now()}`,
      name: `${sourceDeck.name} (Copy)`,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };
    await saveDeck(copy);
    setDecks((prev) => [copy, ...prev]);
  };

  const handleDeleteDeck = async (id: string) => {
    await deleteDeck(id);
    setDecks((prev) => prev.filter((d) => d.id !== id));
    if (editingDeck?.id === id) {
      setEditingDeck(null);
    }
  };

  const handleTestHand = (deck: Deck) => {
    setTesterDeckId(deck.id);
    setActiveTab('handtester');
  };

  const handleAddCardToActiveDeck = async (card: Card) => {
    if (!editingDeck) return;
    const currentQty = editingDeck.cards[card.id] || 0;
    if (currentQty >= 3) return;

    const updated: Deck = {
      ...editingDeck,
      cards: { ...editingDeck.cards, [card.id]: currentQty + 1 },
      updatedAt: new Date().toISOString(),
    };
    await handleSaveDeck(updated);
  };

  /* ================== COLLECTION ACTIONS ================== */

  const handleUpdateCollection = async (cardId: string, regular: number, foil: number) => {
    const item: CollectionItem = {
      cardId,
      regularCount: regular,
      foilCount: foil,
      updatedAt: new Date().toISOString(),
    };
    await saveCollectionItem(item);
    setCollection((prev) => ({ ...prev, [cardId]: item }));
  };

  const handleBatchUpdateCollection = async (items: CollectionItem[]) => {
    await batchSaveCollection(items);
    setCollection((prev) => {
      const next = { ...prev };
      items.forEach((it) => {
        next[it.cardId] = it;
      });
      return next;
    });
  };

  /* ================== CRAFT PLAN ACTIONS ================== */

  const handleSaveCraftPlan = async (item: CraftPlanItem) => {
    await saveCraftPlan(item);
    setCraftPlans((prev) => ({ ...prev, [item.cardId]: item }));
  };

  const handleDeleteCraftPlan = async (cardId: string) => {
    await deleteCraftPlan(cardId);
    setCraftPlans((prev) => {
      const next = { ...prev };
      delete next[cardId];
      return next;
    });
  };

  const handleAddCardsToCraftPlan = async (cardIds: string[]) => {
    for (const cardId of cardIds) {
      const existing = craftPlans[cardId];
      const planItem: CraftPlanItem = existing || {
        cardId,
        desiredCount: 3,
        priority: 'high',
        createdAt: new Date().toISOString(),
      };
      await saveCraftPlan(planItem);
      setCraftPlans((prev) => ({ ...prev, [cardId]: planItem }));
    }
  };

  const handleImportMissingFromDeck = async (deck: Deck) => {
    const missingIds: string[] = [];
    Object.entries(deck.cards).forEach(([cardId, qtyNeeded]) => {
      const collItem = collection[cardId];
      const owned = collItem ? collItem.regularCount + collItem.foilCount : 0;
      if (owned < qtyNeeded) {
        missingIds.push(cardId);
      }
    });
    if (missingIds.length > 0) {
      await handleAddCardsToCraftPlan(missingIds);
    }
  };

  if (loading) {
    return (
      <div className="flex h-screen w-screen flex-col items-center justify-center bg-slate-950 text-slate-200">
        <div className="relative flex h-16 w-16 items-center justify-center rounded-2xl border border-cyan-500/40 bg-gradient-to-br from-cyan-950 to-slate-900 shadow-[0_0_25px_rgba(6,182,212,0.4)]">
          <Loader2 className="h-8 w-8 animate-spin text-cyan-400" />
        </div>
        <h2 className="mt-4 font-serif text-lg font-bold tracking-wider text-slate-100 uppercase">
          SHADOWVERSE: WORLDS BEYOND
        </h2>
        <p className="mt-1 text-xs text-slate-400">Loading card grimoire and local data...</p>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 flex flex-col font-sans selection:bg-cyan-500 selection:text-slate-950">
      {/* Header */}
      <Header
        activeTab={activeTab}
        onTabChange={(tab) => {
          setActiveTab(tab);
        }}
        activeDeck={editingDeck}
        onOpenDeckBuilder={(d) => {
          setEditingDeck(d);
          setActiveTab('decks');
        }}
        onOpenImportExport={() => setIsImportExportOpen(true)}
      />

      {/* Main Container */}
      <main className="flex-1 w-full px-4 sm:px-6 lg:px-8 xl:px-10 py-5 sm:py-6">
        {/* TAB 1: DECKS */}
        {activeTab === 'decks' && (
          <>
            {editingDeck ? (
              <DeckBuilder
                deck={editingDeck}
                allCards={cards}
                cardsMap={cardsMap}
                collection={collection}
                onSaveDeck={handleSaveDeck}
                onClose={() => setEditingDeck(null)}
                onOpenHandTester={(d) => handleTestHand(d)}
                onAddCardsToCraftPlan={handleAddCardsToCraftPlan}
                onUpdateCollection={handleUpdateCollection}
              />
            ) : (
              <DeckListScreen
                decks={decks}
                cardsMap={cardsMap}
                onSelectDeck={handleSelectDeck}
                onCreateDeck={handleCreateDeck}
                onDuplicateDeck={handleDuplicateDeck}
                onDeleteDeck={handleDeleteDeck}
                onTestHand={handleTestHand}
                onImportDeck={() => setIsImportExportOpen(true)}
                onUpdateDeck={handleSaveDeck}
              />
            )}
          </>
        )}

        {/* TAB 2: CARDS */}
        {activeTab === 'cards' && (
          <CardBrowser
            cards={cards}
            cardsMap={cardsMap}
            decks={decks}
            activeDeck={editingDeck}
            onSelectActiveDeck={(d) => setEditingDeck(d)}
            onAddCardToDeck={editingDeck ? handleAddCardToActiveDeck : undefined}
            collection={collection}
            onUpdateCollection={handleUpdateCollection}
            onAddToCraftPlan={(card) => handleAddCardsToCraftPlan([card.id])}
          />
        )}

        {/* TAB 3: COLLECTION */}
        {activeTab === 'collection' && (
          <CollectionManager
            cards={cards}
            cardsMap={cardsMap}
            collection={collection}
            onUpdateCollection={handleUpdateCollection}
            onBatchUpdateCollection={handleBatchUpdateCollection}
            activeDeck={editingDeck}
            onAddToCraftPlan={(card) => handleAddCardsToCraftPlan([card.id])}
          />
        )}

        {/* TAB 4: SET TRACKER */}
        {activeTab === 'tracker' && (
          <SetTracker
            cards={cards}
            cardsMap={cardsMap}
            collection={collection}
            onAddCardsToCraftPlan={handleAddCardsToCraftPlan}
            onUpdateCollection={handleUpdateCollection}
          />
        )}

        {/* TAB 5: HAND TESTER */}
        {activeTab === 'handtester' && (
          <HandTester
            decks={decks}
            initialDeckId={testerDeckId}
            cardsMap={cardsMap}
          />
        )}

        {/* TAB 6: CRAFT PLANNER */}
        {activeTab === 'craft' && (
          <CraftPlanner
            cards={cards}
            cardsMap={cardsMap}
            craftPlans={craftPlans}
            collection={collection}
            decks={decks}
            onSaveCraftPlan={handleSaveCraftPlan}
            onDeleteCraftPlan={handleDeleteCraftPlan}
            onUpdateCollection={handleUpdateCollection}
            onImportMissingFromDeck={handleImportMissingFromDeck}
          />
        )}
      </main>

      {/* Footer */}
      <footer className="border-t border-slate-900 bg-slate-950/80 py-6 text-center text-xs text-slate-500">
        <div className="mx-auto max-w-7xl px-4 flex flex-col sm:flex-row items-center justify-between gap-3">
          <div className="flex items-center space-x-2">
            <span className="font-serif font-bold text-slate-400">
              SHADOWVERSE: WORLDS BEYOND
            </span>
            <span>· Companion & Deck Builder</span>
          </div>
          <div className="text-[11px] text-slate-600">
            Client-side offline architecture · Persistent IndexedDB · 204 Authentic Cards Loaded
          </div>
        </div>
      </footer>

      {/* Import / Export Modal */}
      {isImportExportOpen && (
        <ImportExportModal
          onClose={() => setIsImportExportOpen(false)}
          onRefreshData={loadData}
          cardsMap={cardsMap}
          onImportSingleDeck={async (d) => {
            await saveDeck(d);
            setDecks((prev) => [d, ...prev]);
            setEditingDeck(d);
            setActiveTab('decks');
          }}
        />
      )}
    </div>
  );
}
