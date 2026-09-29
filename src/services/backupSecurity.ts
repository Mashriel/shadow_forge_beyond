import { Card, CollectionItem, CraftPlanItem, Deck } from '../types/card';
import { CLASSES } from './rules';

export const BACKUP_APP_IDENTIFIER = 'Shadowverse Worlds Beyond Companion Archive';
export const CURRENT_BACKUP_VERSION = 1;
export const MAX_BACKUP_FILE_SIZE = 5 * 1024 * 1024; // 5 MB max file size limit

export interface ValidatedBackupManifest {
  app: string;
  version: number;
  exportedAt: string;
  checksum?: string;
  decks: Deck[];
  collection: Record<string, CollectionItem>;
  craftPlans: Record<string, CraftPlanItem>;
  checksumVerified: boolean;
  warnings: string[];
  stats: {
    deckCount: number;
    collectionCount: number;
    craftPlanCount: number;
  };
}

/**
 * Sanitize string inputs to prevent XSS / malicious code injection
 */
export function sanitizeText(input: unknown, maxLength: number = 2000): string {
  if (typeof input !== 'string') return '';
  // Remove HTML tags & script protocols
  const clean = input
    .replace(/<[^>]*>?/gm, '')
    .replace(/javascript:/gi, '')
    .replace(/data:/gi, '')
    .trim();
  return clean.slice(0, maxLength);
}

/**
 * Generate SHA-256 Checksum hash for string content
 */
export async function generateDataChecksum(content: string): Promise<string> {
  try {
    if (typeof window !== 'undefined' && window.crypto && window.crypto.subtle) {
      const encoder = new TextEncoder();
      const data = encoder.encode(content);
      const hashBuffer = await window.crypto.subtle.digest('SHA-256', data);
      const hashArray = Array.from(new Uint8Array(hashBuffer));
      return hashArray.map((b) => b.toString(16).padStart(2, '0')).join('');
    }
  } catch (e) {
    console.warn('Crypto SHA-256 unavailable, fallback hash used', e);
  }
  // Fallback simple numeric hash string if subtle crypto is unavailable
  let hash = 0;
  for (let i = 0; i < content.length; i++) {
    const char = content.charCodeAt(i);
    hash = (hash << 5) - hash + char;
    hash |= 0;
  }
  return `fallback-${Math.abs(hash).toString(16)}`;
}

/**
 * Validate and Sanitize a Deck object
 */
export function validateAndSanitizeDeck(
  raw: any,
  cardsMap?: Map<string, Card>
): { validDeck: Deck | null; warnings: string[] } {
  const warnings: string[] = [];

  if (!raw || typeof raw !== 'object') {
    return { validDeck: null, warnings: ['Deck entry is not a valid object.'] };
  }

  const name = sanitizeText(raw.name, 100) || 'Untitled Deck';
  const id = sanitizeText(raw.id, 100) || `deck-${Date.now()}-${Math.random().toString(36).substr(2, 5)}`;
  
  // Validate Class
  const validClasses = CLASSES.map((c) => c.name);
  let className = raw.class;
  if (!validClasses.includes(className)) {
    className = 'Neutral';
    warnings.push(`Deck "${name}" had an unrecognized class "${raw.class}". Reassigned to Neutral.`);
  }

  // Validate Format
  const format = raw.format === 'Unlimited' ? 'Unlimited' : 'Rotation';

  // Validate Cards Map
  const sanitizedCards: Record<string, number> = {};
  if (raw.cards && typeof raw.cards === 'object') {
    Object.entries(raw.cards).forEach(([cardId, qty]) => {
      const cleanCardId = sanitizeText(cardId, 100);
      const numQty = typeof qty === 'number' ? Math.floor(qty) : Number(qty) || 0;

      if (!cleanCardId) return;

      // Check if card exists in database if cardsMap is provided
      if (cardsMap && cardsMap.size > 0 && !cardsMap.has(cleanCardId)) {
        warnings.push(`Deck "${name}": Omitted card ID "${cleanCardId}" as it does not exist in database.`);
        return;
      }

      // Clamp quantity to valid range (1 to 3 copies per card)
      if (numQty > 0) {
        const clampedQty = Math.min(3, Math.max(1, numQty));
        if (clampedQty !== numQty) {
          warnings.push(`Deck "${name}": Clamped copy count for card ID "${cleanCardId}" to ${clampedQty}.`);
        }
        sanitizedCards[cleanCardId] = clampedQty;
      }
    });
  }

  // Validate Tags
  const tags: string[] = Array.isArray(raw.tags)
    ? raw.tags.map((t: unknown) => sanitizeText(t, 30)).filter(Boolean)
    : [];

  const createdAt = typeof raw.createdAt === 'string' ? raw.createdAt : new Date().toISOString();
  const updatedAt = typeof raw.updatedAt === 'string' ? raw.updatedAt : new Date().toISOString();
  const rotationSetsAtCreation = Array.isArray(raw.rotationSetsAtCreation)
    ? raw.rotationSetsAtCreation.map(String)
    : undefined;

  const validDeck: Deck = {
    id,
    version: 1,
    name,
    class: className,
    format,
    cards: sanitizedCards,
    tags,
    rotationSetsAtCreation,
    createdAt,
    updatedAt,
  };

  return { validDeck, warnings };
}

/**
 * Validate and Sanitize Collection records
 */
export function validateAndSanitizeCollection(
  raw: any,
  cardsMap?: Map<string, Card>
): { validCollection: Record<string, CollectionItem>; warnings: string[] } {
  const warnings: string[] = [];
  const validCollection: Record<string, CollectionItem> = {};

  if (!raw || typeof raw !== 'object') {
    return { validCollection: {}, warnings: ['Collection payload is invalid.'] };
  }

  const entries = Array.isArray(raw) ? raw : Object.values(raw);

  entries.forEach((entry: any) => {
    if (!entry || typeof entry !== 'object') return;
    const cardId = sanitizeText(entry.cardId || entry.id, 100);
    if (!cardId) return;

    if (cardsMap && cardsMap.size > 0 && !cardsMap.has(cardId)) {
      warnings.push(`Collection: Skipped non-existent card ID "${cardId}".`);
      return;
    }

    const reg = Math.min(3, Math.max(0, Math.floor(Number(entry.regularCount) || 0)));
    const foil = Math.min(3, Math.max(0, Math.floor(Number(entry.foilCount) || 0)));

    if (reg > 0 || foil > 0) {
      validCollection[cardId] = {
        cardId,
        regularCount: reg,
        foilCount: foil,
        updatedAt: typeof entry.updatedAt === 'string' ? entry.updatedAt : new Date().toISOString(),
      };
    }
  });

  return { validCollection, warnings };
}

/**
 * Validate and Sanitize Craft Plans
 */
export function validateAndSanitizeCraftPlans(
  raw: any,
  cardsMap?: Map<string, Card>
): { validCraftPlans: Record<string, CraftPlanItem>; warnings: string[] } {
  const warnings: string[] = [];
  const validCraftPlans: Record<string, CraftPlanItem> = {};

  if (!raw || typeof raw !== 'object') {
    return { validCraftPlans: {}, warnings: ['Craft plan payload is invalid.'] };
  }

  const entries = Array.isArray(raw) ? raw : Object.values(raw);

  entries.forEach((entry: any) => {
    if (!entry || typeof entry !== 'object') return;
    const cardId = sanitizeText(entry.cardId || entry.id, 100);
    if (!cardId) return;

    if (cardsMap && cardsMap.size > 0 && !cardsMap.has(cardId)) {
      warnings.push(`Craft Plan: Skipped non-existent card ID "${cardId}".`);
      return;
    }

    const desiredCount = Math.min(3, Math.max(1, Math.floor(Number(entry.desiredCount) || 3)));
    const validPriority = ['high', 'medium', 'low'].includes(entry.priority)
      ? (entry.priority as 'high' | 'medium' | 'low')
      : 'medium';

    validCraftPlans[cardId] = {
      cardId,
      desiredCount,
      priority: validPriority,
      createdAt: typeof entry.createdAt === 'string' ? entry.createdAt : typeof entry.addedAt === 'string' ? entry.addedAt : new Date().toISOString(),
      notes: sanitizeText(entry.notes, 500),
    };
  });

  return { validCraftPlans, warnings };
}

/**
 * Parse and perform security validation on incoming JSON backup payload
 */
export async function parseAndValidateBackupJSON(
  jsonText: string,
  cardsMap?: Map<string, Card>
): Promise<ValidatedBackupManifest> {
  let parsed: any;
  try {
    parsed = JSON.parse(jsonText);
  } catch {
    throw new Error('Invalid JSON structure. The file is corrupted or not a valid JSON document.');
  }

  if (!parsed || typeof parsed !== 'object') {
    throw new Error('Root JSON content is not a valid JSON object.');
  }

  const allWarnings: string[] = [];

  // 1. Single Deck JSON Case
  if (parsed.name && parsed.class && parsed.cards && !parsed.decks) {
    const { validDeck, warnings } = validateAndSanitizeDeck(parsed, cardsMap);
    if (!validDeck) {
      throw new Error('The single deck JSON is malformed and could not be parsed.');
    }
    allWarnings.push(...warnings);

    return {
      app: BACKUP_APP_IDENTIFIER,
      version: CURRENT_BACKUP_VERSION,
      exportedAt: new Date().toISOString(),
      decks: [validDeck],
      collection: {},
      craftPlans: {},
      checksumVerified: true,
      warnings: allWarnings,
      stats: {
        deckCount: 1,
        collectionCount: 0,
        craftPlanCount: 0,
      },
    };
  }

  // 2. Full Backup Archive Case
  const rawDecks = Array.isArray(parsed.decks) ? parsed.decks : [];
  const verifiedDecks: Deck[] = [];

  rawDecks.forEach((d: any) => {
    const { validDeck, warnings } = validateAndSanitizeDeck(d, cardsMap);
    if (validDeck) {
      verifiedDecks.push(validDeck);
    }
    allWarnings.push(...warnings);
  });

  const { validCollection, warnings: colWarnings } = validateAndSanitizeCollection(
    parsed.collection,
    cardsMap
  );
  allWarnings.push(...colWarnings);

  const { validCraftPlans, warnings: craftWarnings } = validateAndSanitizeCraftPlans(
    parsed.craftPlans,
    cardsMap
  );
  allWarnings.push(...craftWarnings);

  // Checksum verification
  let checksumVerified = false;
  if (typeof parsed.checksum === 'string' && parsed.checksum.length > 0) {
    // Generate comparison checksum excluding the checksum field itself
    const dataToHash = JSON.stringify({
      app: parsed.app || BACKUP_APP_IDENTIFIER,
      version: parsed.version || CURRENT_BACKUP_VERSION,
      decks: parsed.decks || [],
      collection: parsed.collection || {},
      craftPlans: parsed.craftPlans || {},
    });
    const expectedHash = await generateDataChecksum(dataToHash);
    checksumVerified = expectedHash === parsed.checksum || parsed.checksum.startsWith('fallback-');
    if (!checksumVerified) {
      allWarnings.push('Checksum mismatch detected. File data may have been modified manually.');
    }
  } else {
    checksumVerified = true; // Legacy or external file without checksum
  }

  return {
    app: parsed.app || BACKUP_APP_IDENTIFIER,
    version: Number(parsed.version) || CURRENT_BACKUP_VERSION,
    exportedAt: typeof parsed.exportedAt === 'string' ? parsed.exportedAt : new Date().toISOString(),
    checksum: parsed.checksum,
    decks: verifiedDecks,
    collection: validCollection,
    craftPlans: validCraftPlans,
    checksumVerified,
    warnings: allWarnings,
    stats: {
      deckCount: verifiedDecks.length,
      collectionCount: Object.keys(validCollection).length,
      craftPlanCount: Object.keys(validCraftPlans).length,
    },
  };
}
