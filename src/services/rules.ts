import { Card, ClassName, DeckFormat } from '../types/card';

export const DECK_SIZE_LIMIT = 40;
export const MAX_COPIES_PER_CARD = 3;

export const CLASSES: { id: string; name: ClassName; color: string; bgGradient: string; iconSymbol: string; iconSvg: string }[] = [
  { id: '1', name: 'Forestcraft', color: '#4ade80', bgGradient: 'from-emerald-950/60 to-emerald-900/20', iconSymbol: '🏹', iconSvg: 'https://shadowverse-wb.com/assets/images/common/common/class/class_elf.svg' },
  { id: '2', name: 'Swordcraft', color: '#facc15', bgGradient: 'from-amber-950/60 to-amber-900/20', iconSymbol: '⚔️', iconSvg: 'https://shadowverse-wb.com/assets/images/common/common/class/class_royal.svg' },
  { id: '3', name: 'Runecraft', color: '#60a5fa', bgGradient: 'from-sky-950/60 to-sky-900/20', iconSymbol: '🔮', iconSvg: 'https://shadowverse-wb.com/assets/images/common/common/class/class_witch.svg' },
  { id: '4', name: 'Dragoncraft', color: '#fb923c', bgGradient: 'from-orange-950/60 to-orange-900/20', iconSymbol: '🐉', iconSvg: 'https://shadowverse-wb.com/assets/images/common/common/class/class_dragon.svg' },
  { id: '5', name: 'Abysscraft', color: '#c084fc', bgGradient: 'from-purple-950/60 to-purple-900/20', iconSymbol: '🦇', iconSvg: 'https://shadowverse-wb.com/assets/images/common/common/class/class_nightmare.svg' },
  { id: '6', name: 'Havencraft', color: '#fef08a', bgGradient: 'from-yellow-950/60 to-yellow-900/20', iconSymbol: '🕊️', iconSvg: 'https://shadowverse-wb.com/assets/images/common/common/class/class_bishop.svg' },
  { id: '7', name: 'Portalcraft', color: '#2dd4bf', bgGradient: 'from-teal-950/60 to-teal-900/20', iconSymbol: '⚙️', iconSvg: 'https://shadowverse-wb.com/assets/images/common/common/class/class_nemesis.svg' },
  { id: '0', name: 'Neutral', color: '#94a3b8', bgGradient: 'from-slate-900/60 to-slate-800/20', iconSymbol: '💠', iconSvg: 'https://shadowverse-wb.com/assets/images/common/common/class/class_neutral.svg' },
];

export const RARITIES: { id: 1 | 2 | 3 | 4; name: 'Bronze' | 'Silver' | 'Gold' | 'Legendary'; color: string; border: string; glow: string }[] = [
  { id: 1, name: 'Bronze', color: '#cd7f32', border: 'border-amber-700/60', glow: 'shadow-[0_0_8px_rgba(180,83,9,0.3)]' },
  { id: 2, name: 'Silver', color: '#cbd5e1', border: 'border-slate-300/60', glow: 'shadow-[0_0_8px_rgba(203,213,225,0.3)]' },
  { id: 3, name: 'Gold', color: '#f59e0b', border: 'border-amber-400/80', glow: 'shadow-[0_0_12px_rgba(245,158,11,0.4)]' },
  { id: 4, name: 'Legendary', color: '#38bdf8', border: 'border-cyan-400', glow: 'shadow-[0_0_16px_rgba(56,189,248,0.5)]' },
];

export const FORMATS: { id: DeckFormat; label: string; description: string }[] = [
  {
    id: 'Rotation',
    label: 'Rotation',
    description: 'Standard format using cards from the six latest numbered card sets alongside the Basic card set.',
  },
  {
    id: 'Unlimited',
    label: 'Unlimited',
    description: 'Legacy format where all released collectible cards are playable without set limits.',
  },
  {
    id: 'Simplified',
    label: 'Simplified',
    description: 'Beginner-friendly curated format focused on Basic and early core sets.',
  },
];

export const VIAL_VALUES: Record<number, { craft: number; liquefyRegular: number; liquefyFoil: number }> = {
  1: { craft: 50, liquefyRegular: 10, liquefyFoil: 30 },
  2: { craft: 200, liquefyRegular: 50, liquefyFoil: 120 },
  3: { craft: 800, liquefyRegular: 250, liquefyFoil: 600 },
  4: { craft: 3500, liquefyRegular: 1000, liquefyFoil: 2500 },
};

/**
 * Returns the card sets legal in the Rotation format:
 * The six latest numbered card sets alongside the Basic card set.
 */
export function getRotationLegalSets(orderedSets = ORDERED_SETS): { id: string; name: string; number?: number }[] {
  // 1. Basic set is always legal
  const basicSet = orderedSets.find((s) => s.id === '10000' || s.name.toLowerCase() === 'basic');

  // 2. Numbered sets in ascending release order (excluding Basic and Tokens)
  const numberedSets = orderedSets.filter(
    (s) =>
      s.id !== '10000' &&
      s.id !== '90000' &&
      s.name.toLowerCase() !== 'basic' &&
      s.name.toLowerCase() !== 'tokens'
  );

  // Six latest numbered card sets
  const latestSix = numberedSets.slice(-6);

  return basicSet ? [basicSet, ...latestSix] : latestSix;
}

/**
 * Checks if a card is legal in Rotation format:
 * Must belong to Basic or one of the six latest numbered card sets.
 */
export function isCardRotationLegal(card: Card, orderedSets = ORDERED_SETS): boolean {
  if (card.isToken) return false;

  // Basic set is always legal
  if (card.setId === '10000' || card.setName.toLowerCase() === 'basic') {
    return true;
  }

  const legalSets = getRotationLegalSets(orderedSets);
  const legalSetIds = new Set(legalSets.map((s) => s.id));
  const legalSetNames = new Set(legalSets.map((s) => s.name.toLowerCase()));

  if (card.setId && legalSetIds.has(card.setId)) return true;
  if (card.setName && legalSetNames.has(card.setName.toLowerCase())) return true;

  return false;
}

/**
 * Legality check for format
 */
export function isCardLegalInFormat(card: Card, format: DeckFormat): boolean {
  if (card.isToken) return false;
  if (format === 'Rotation') {
    return isCardRotationLegal(card);
  }
  if (format === 'Simplified') {
    return card.setName === 'Basic' || card.setName === 'Legends Rise';
  }
  // Unlimited
  return true;
}

/**
 * Checks if a card can be included in a deck of given class & format
 */
export function canCardBeInDeck(card: Card, deckClass: ClassName, deckFormat: DeckFormat): boolean {
  if (card.isToken) return false;
  const isClassMatch = card.className === deckClass || card.className === 'Neutral';
  if (!isClassMatch) return false;
  return isCardLegalInFormat(card, deckFormat);
}

/**
 * Calculate total card count of a deck
 */
export function getDeckCardCount(cards: Record<string, number>): number {
  return Object.values(cards).reduce((acc, qty) => acc + qty, 0);
}

/**
 * Validates a deck and returns issues
 */
export function validateDeck(deck: {
  class: ClassName;
  format: DeckFormat;
  cards: Record<string, number>;
}, cardMap: Map<string, Card>): { valid: boolean; errors: string[]; warnings: string[] } {
  const errors: string[] = [];
  const warnings: string[] = [];
  const total = getDeckCardCount(deck.cards);

  if (total !== DECK_SIZE_LIMIT) {
    if (total < DECK_SIZE_LIMIT) {
      warnings.push(`Deck contains ${total}/${DECK_SIZE_LIMIT} cards (${DECK_SIZE_LIMIT - total} more needed).`);
    } else {
      errors.push(`Deck exceeds maximum limit: ${total}/${DECK_SIZE_LIMIT} cards.`);
    }
  }

  for (const [cardId, qty] of Object.entries(deck.cards)) {
    if (qty > MAX_COPIES_PER_CARD) {
      errors.push(`Card ${cardId} has ${qty} copies (maximum is ${MAX_COPIES_PER_CARD}).`);
    }
    const card = cardMap.get(cardId);
    if (!card) {
      errors.push(`Card ID ${cardId} not found in database.`);
      continue;
    }
    if (card.isToken) {
      errors.push(`Token card "${card.name}" cannot be added directly to a deck.`);
    }
    if (card.className !== deck.class && card.className !== 'Neutral') {
      errors.push(`Card "${card.name}" (${card.className}) cannot be used in a ${deck.class} deck.`);
    }
    if (!isCardLegalInFormat(card, deck.format)) {
      errors.push(`Card "${card.name}" is not legal in ${deck.format} format.`);
    }
  }

  return {
    valid: errors.length === 0 && total === DECK_SIZE_LIMIT,
    errors,
    warnings,
  };
}

/**
 * Official Shadowverse: Worlds Beyond card sets in chronological release order
 */
export const ORDERED_SETS: { id: string; name: string; number?: number; releaseDate?: string }[] = [
  { id: '10000', name: 'Basic' },
  { id: '10001', name: 'Legends Rise', number: 1 },
  { id: '10002', name: 'Infinity Evolved', number: 2 },
  { id: '10003', name: 'Heirs of the Omen', number: 3 },
  { id: '10004', name: 'Skybound Dragons', number: 4 },
  { id: '10005', name: 'Blossoming Fate', number: 5 },
  { id: '10006', name: 'Apocalypse Pact', number: 6 },
  { id: '10007', name: "Anathema's Gambit", number: 7 },
  { id: '10008', name: 'Chronicle of Destiny', number: 8 },
  { id: '10009', name: 'Revenants of Azvaldt', number: 9 },
  { id: '90000', name: 'Tokens' },
];

export function getSetReleaseOrder(setNameOrId: string): number {
  const clean = setNameOrId.trim();
  const index = ORDERED_SETS.findIndex(
    (s) => s.name.toLowerCase() === clean.toLowerCase() || s.id === clean
  );
  if (index !== -1) return index;

  // Check if starts with numeric setId e.g. 10005
  const num = Number(clean);
  if (!isNaN(num) && num >= 10000) return num;

  return 999;
}

export function sortSetsByReleaseOrder(sets: string[]): string[] {
  return [...sets].sort((a, b) => getSetReleaseOrder(a) - getSetReleaseOrder(b));
}

export function formatSetDisplayName(setName: string): string {
  const meta = ORDERED_SETS.find(
    (s) => s.name.toLowerCase() === setName.toLowerCase() || s.id === setName
  );
  if (meta?.number) {
    return `Set ${meta.number}: ${meta.name}`;
  }
  return setName;
}

