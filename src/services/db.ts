import { CollectionItem, CraftPlanItem, Deck } from '../types/card';
import { SAMPLE_DECKS } from './sampleDecks';
import { getRotationLegalSets } from './rules';

const DB_NAME = 'SV_WorldsBeyond_DB';
const DB_VERSION = 1;

let dbPromise: Promise<IDBDatabase> | null = null;

function isIndexedDBAvailable(): boolean {
  try {
    return typeof window !== 'undefined' && 'indexedDB' in window && window.indexedDB !== null;
  } catch {
    return false;
  }
}

function getDB(): Promise<IDBDatabase> {
  if (dbPromise) return dbPromise;

  dbPromise = new Promise((resolve, reject) => {
    if (!isIndexedDBAvailable()) {
      return reject(new Error('IndexedDB not supported or accessible'));
    }

    try {
      const request = window.indexedDB.open(DB_NAME, DB_VERSION);

      request.onupgradeneeded = (event) => {
        const db = (event.target as IDBOpenDBRequest).result;
        if (!db.objectStoreNames.contains('decks')) {
          db.createObjectStore('decks', { keyPath: 'id' });
        }
        if (!db.objectStoreNames.contains('collection')) {
          db.createObjectStore('collection', { keyPath: 'cardId' });
        }
        if (!db.objectStoreNames.contains('craftPlans')) {
          db.createObjectStore('craftPlans', { keyPath: 'cardId' });
        }
        if (!db.objectStoreNames.contains('preferences')) {
          db.createObjectStore('preferences', { keyPath: 'key' });
        }
      };

      request.onsuccess = () => resolve(request.result);
      request.onerror = () => {
        console.warn('IndexedDB failed to open, falling back to localStorage', request.error);
        reject(request.error);
      };
    } catch (e) {
      reject(e);
    }
  });

  return dbPromise;
}

// Fallback LocalStorage keys
const LS_DECKS_KEY = 'sv_wb_decks';
const LS_COLLECTION_KEY = 'sv_wb_collection';
const LS_CRAFT_KEY = 'sv_wb_craft';

/* ================== DECKS ================== */

export async function getAllDecks(): Promise<Deck[]> {
  try {
    const db = await getDB();
    return new Promise((resolve, reject) => {
      const tx = db.transaction('decks', 'readonly');
      const store = tx.objectStore('decks');
      const req = store.getAll();
      req.onsuccess = () => {
        const results: Deck[] = req.result || [];
        resolve(results);
      };
      req.onerror = () => reject(req.error);
    });
  } catch {
    // LocalStorage fallback
    const raw = localStorage.getItem(LS_DECKS_KEY);
    if (!raw) {
      localStorage.setItem(LS_DECKS_KEY, JSON.stringify([]));
      return [];
    }
    return JSON.parse(raw);
  }
}

export async function getDeckById(id: string): Promise<Deck | null> {
  try {
    const db = await getDB();
    return new Promise((resolve, reject) => {
      const tx = db.transaction('decks', 'readonly');
      const store = tx.objectStore('decks');
      const req = store.get(id);
      req.onsuccess = () => resolve(req.result || null);
      req.onerror = () => reject(req.error);
    });
  } catch {
    const decks = await getAllDecks();
    return decks.find((d) => d.id === id) || null;
  }
}

export async function saveDeck(deck: Deck): Promise<void> {
  const rotationSetsAtCreation = deck.rotationSetsAtCreation && deck.rotationSetsAtCreation.length > 0
    ? deck.rotationSetsAtCreation
    : getRotationLegalSets().map((s) => s.id);

  const deckToSave: Deck = {
    ...deck,
    rotationSetsAtCreation,
  };

  try {
    const db = await getDB();
    return new Promise((resolve, reject) => {
      const tx = db.transaction('decks', 'readwrite');
      const store = tx.objectStore('decks');
      const req = store.put(deckToSave);
      req.onsuccess = () => resolve();
      req.onerror = () => reject(req.error);
    });
  } catch {
    const raw = localStorage.getItem(LS_DECKS_KEY);
    const list: Deck[] = raw ? JSON.parse(raw) : [];
    const idx = list.findIndex((d) => d.id === deckToSave.id);
    if (idx >= 0) list[idx] = deckToSave;
    else list.push(deckToSave);
    localStorage.setItem(LS_DECKS_KEY, JSON.stringify(list));
  }
}

export async function deleteDeck(id: string): Promise<void> {
  try {
    const db = await getDB();
    return new Promise((resolve, reject) => {
      const tx = db.transaction('decks', 'readwrite');
      const store = tx.objectStore('decks');
      const req = store.delete(id);
      req.onsuccess = () => resolve();
      req.onerror = () => reject(req.error);
    });
  } catch {
    const raw = localStorage.getItem(LS_DECKS_KEY);
    if (raw) {
      const list: Deck[] = JSON.parse(raw);
      const filtered = list.filter((d) => d.id !== id);
      localStorage.setItem(LS_DECKS_KEY, JSON.stringify(filtered));
    }
  }
}

/* ================== COLLECTION ================== */

export async function getAllCollection(): Promise<Record<string, CollectionItem>> {
  try {
    const db = await getDB();
    return new Promise((resolve, reject) => {
      const tx = db.transaction('collection', 'readonly');
      const store = tx.objectStore('collection');
      const req = store.getAll();
      req.onsuccess = () => {
        const map: Record<string, CollectionItem> = {};
        const items: CollectionItem[] = req.result || [];
        items.forEach((item) => {
          map[item.cardId] = item;
        });
        resolve(map);
      };
      req.onerror = () => reject(req.error);
    });
  } catch {
    const raw = localStorage.getItem(LS_COLLECTION_KEY);
    return raw ? JSON.parse(raw) : {};
  }
}

export async function saveCollectionItem(item: CollectionItem): Promise<void> {
  try {
    const db = await getDB();
    return new Promise((resolve, reject) => {
      const tx = db.transaction('collection', 'readwrite');
      const store = tx.objectStore('collection');
      const req = store.put(item);
      req.onsuccess = () => resolve();
      req.onerror = () => reject(req.error);
    });
  } catch {
    const current = await getAllCollection();
    current[item.cardId] = item;
    localStorage.setItem(LS_COLLECTION_KEY, JSON.stringify(current));
  }
}

export async function batchSaveCollection(items: CollectionItem[]): Promise<void> {
  try {
    const db = await getDB();
    return new Promise((resolve, reject) => {
      const tx = db.transaction('collection', 'readwrite');
      const store = tx.objectStore('collection');
      for (const item of items) {
        store.put(item);
      }
      tx.oncomplete = () => resolve();
      tx.onerror = () => reject(tx.error);
    });
  } catch {
    const current = await getAllCollection();
    for (const item of items) {
      current[item.cardId] = item;
    }
    localStorage.setItem(LS_COLLECTION_KEY, JSON.stringify(current));
  }
}

/* ================== CRAFT PLANS ================== */

export async function getAllCraftPlans(): Promise<Record<string, CraftPlanItem>> {
  try {
    const db = await getDB();
    return new Promise((resolve, reject) => {
      const tx = db.transaction('craftPlans', 'readonly');
      const store = tx.objectStore('craftPlans');
      const req = store.getAll();
      req.onsuccess = () => {
        const map: Record<string, CraftPlanItem> = {};
        const items: CraftPlanItem[] = req.result || [];
        items.forEach((item) => {
          map[item.cardId] = item;
        });
        resolve(map);
      };
      req.onerror = () => reject(req.error);
    });
  } catch {
    const raw = localStorage.getItem(LS_CRAFT_KEY);
    return raw ? JSON.parse(raw) : {};
  }
}

export async function saveCraftPlan(item: CraftPlanItem): Promise<void> {
  try {
    const db = await getDB();
    return new Promise((resolve, reject) => {
      const tx = db.transaction('craftPlans', 'readwrite');
      const store = tx.objectStore('craftPlans');
      const req = store.put(item);
      req.onsuccess = () => resolve();
      req.onerror = () => reject(req.error);
    });
  } catch {
    const current = await getAllCraftPlans();
    current[item.cardId] = item;
    localStorage.setItem(LS_CRAFT_KEY, JSON.stringify(current));
  }
}

export async function deleteCraftPlan(cardId: string): Promise<void> {
  try {
    const db = await getDB();
    return new Promise((resolve, reject) => {
      const tx = db.transaction('craftPlans', 'readwrite');
      const store = tx.objectStore('craftPlans');
      const req = store.delete(cardId);
      req.onsuccess = () => resolve();
      req.onerror = () => reject(req.error);
    });
  } catch {
    const current = await getAllCraftPlans();
    delete current[cardId];
    localStorage.setItem(LS_CRAFT_KEY, JSON.stringify(current));
  }
}

/* ================== BACKUP & RESTORE ================== */

export interface ExportData {
  app: string;
  version: number;
  exportedAt: string;
  checksum?: string;
  decks: Deck[];
  collection: Record<string, CollectionItem>;
  craftPlans: Record<string, CraftPlanItem>;
}

export async function clearAllUserData(): Promise<void> {
  try {
    const db = await getDB();
    const stores = ['decks', 'collection', 'craftPlans'];
    for (const storeName of stores) {
      await new Promise<void>((resolve, reject) => {
        const tx = db.transaction(storeName, 'readwrite');
        const store = tx.objectStore(storeName);
        const req = store.clear();
        req.onsuccess = () => resolve();
        req.onerror = () => reject(req.error);
      });
    }
  } catch (e) {
    console.warn('Error clearing IndexedDB stores', e);
  }
  try {
    localStorage.removeItem(LS_DECKS_KEY);
    localStorage.removeItem(LS_COLLECTION_KEY);
    localStorage.removeItem(LS_CRAFT_KEY);
  } catch (e) {
    console.warn('Error clearing localStorage keys', e);
  }
}

export async function exportAllUserData(): Promise<ExportData> {
  const decks = await getAllDecks();
  const collection = await getAllCollection();
  const craftPlans = await getAllCraftPlans();

  const payload = {
    app: 'Shadowverse Worlds Beyond Companion Archive',
    version: 1,
    exportedAt: new Date().toISOString(),
    decks,
    collection,
    craftPlans,
  };

  try {
    const { generateDataChecksum } = await import('./backupSecurity');
    const checksum = await generateDataChecksum(
      JSON.stringify({
        app: payload.app,
        version: payload.version,
        decks: payload.decks,
        collection: payload.collection,
        craftPlans: payload.craftPlans,
      })
    );
    return { ...payload, checksum };
  } catch {
    return payload;
  }
}

export async function importAllUserData(
  data: Partial<ExportData>,
  mode: 'merge' | 'overwrite' = 'merge'
): Promise<void> {
  if (mode === 'overwrite') {
    await clearAllUserData();
  }

  if (data.decks && Array.isArray(data.decks)) {
    for (const d of data.decks) {
      await saveDeck(d);
    }
  }
  if (data.collection && typeof data.collection === 'object') {
    const items = Object.values(data.collection);
    await batchSaveCollection(items);
  }
  if (data.craftPlans && typeof data.craftPlans === 'object') {
    for (const cp of Object.values(data.craftPlans)) {
      await saveCraftPlan(cp);
    }
  }
}
