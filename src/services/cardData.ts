import {
  Card,
  CardInfoRaw,
  CardType,
  CardTypeRaw,
  ClassName,
  CardBooleanRaw,
  CardRarityRaw,
} from '../types/card';
import { VIAL_VALUES } from './rules';

const CLASS_ID_MAP: Record<string, ClassName> = {
  '0': 'Neutral',
  '1': 'Forestcraft',
  '2': 'Swordcraft',
  '3': 'Runecraft',
  '4': 'Dragoncraft',
  '5': 'Abysscraft',
  '6': 'Havencraft',
  '7': 'Portalcraft',
};

const RARITY_MAP: Record<string, 1 | 2 | 3 | 4> = {
  Bronze: 1,
  Silver: 2,
  Gold: 3,
  Legendary: 4,
  '1': 1,
  '2': 2,
  '3': 3,
  '4': 4,
};

const RARITY_NAMES: Record<number, 'Bronze' | 'Silver' | 'Gold' | 'Legendary'> = {
  1: 'Bronze',
  2: 'Silver',
  3: 'Gold',
  4: 'Legendary',
};

// Normalize cards from either Beyond Codex normalized format or legacy Deck Portal format
function normalizeCard(raw: any): Card {
  // Rarity handling
  let validRarity: 1 | 2 | 3 | 4 = 1;
  if (typeof raw.rarity === 'string' && RARITY_MAP[raw.rarity]) {
    validRarity = RARITY_MAP[raw.rarity];
  } else if (typeof raw.rarity === 'number' && [1, 2, 3, 4].includes(raw.rarity)) {
    validRarity = raw.rarity as 1 | 2 | 3 | 4;
  }
  const fallbackVials = VIAL_VALUES[validRarity] || { craft: 50, liquefyRegular: 10 };

  // Class handling
  let colorName: ClassName = 'Neutral';
  if (typeof raw.class === 'string' && CLASS_ID_MAP[raw.class]) {
    colorName = CLASS_ID_MAP[raw.class];
  } else if (
    typeof raw.class === 'string' &&
    [
      'Forestcraft',
      'Swordcraft',
      'Runecraft',
      'Dragoncraft',
      'Abysscraft',
      'Havencraft',
      'Portalcraft',
      'Neutral',
    ].includes(raw.class)
  ) {
    colorName = raw.class as ClassName;
  } else if (raw.color) {
    colorName = raw.color as ClassName;
  }

  // Type handling
  let cardType: CardType = 'Follower';
  let subType: 'Countdown' | 'Continuous' | null = null;
  const rawTypeStr = String(raw.type || '');

  if (rawTypeStr === '4' || rawTypeStr === 'Spell') {
    cardType = 'Spell';
  } else if (rawTypeStr === 'Amulet') {
    cardType = 'Amulet';
    const skill = (raw.rawSkillText || raw.skill_text || raw.text || '').toLowerCase();
    subType = skill.includes('countdown') ? 'Countdown' : 'Continuous';
  } else if (rawTypeStr === 'Follower' || !rawTypeStr) {
    cardType = 'Follower';
  } else {
    if (raw.type === CardTypeRaw.four || raw.type === '4') {
      cardType = 'Spell';
    } else if (raw.type === CardTypeRaw.amulet) {
      cardType = 'Amulet';
      subType = 'Countdown';
    } else {
      cardType = 'Follower';
    }
  }

  const parsedCost = Number(raw.cost) || 0;
  const parsedAtk = Number(raw.attack ?? raw.atk) || 0;
  const parsedLife = Number(raw.defense ?? raw.life) || 0;

  // Evolution handling
  const hasEvo = Boolean(
    raw.evolved ||
      raw.evo === CardBooleanRaw.true ||
      raw.evo === '1' ||
      raw.image_back
  );
  const evoSkillText =
    raw.evolved?.rawSkillText ||
    raw.evolved?.text ||
    raw.evo_skill_text ||
    '';
  const evoFlavorText =
    raw.evolved?.flavourText || raw.evo_flavour_text || '';
  const imageBack = raw.evolved?.image || raw.image_back || null;

  // Skill text & markup
  const skillText = raw.rawSkillText || raw.skill_text || raw.text || '';
  const flavorText = raw.flavourText || raw.flavour_text || '';

  // Token & Set
  const isToken = Boolean(
    raw.token ||
      raw.is_token === CardBooleanRaw.true ||
      String(raw.is_token) === '1' ||
      String(raw.setId) === '90000' ||
      String(raw.set) === '90000'
  );

  const rawSetName = String(raw.set || raw.set_name || 'Basic');
  const setName = rawSetName === '90000' ? 'Tokens' : rawSetName;
  const setId = String(raw.setId ?? '');

  // In Rotation, legal sets are the six latest numbered card sets alongside the Basic set
  const isRotation =
    !isToken &&
    (setId === '10000' ||
      setName.toLowerCase() === 'basic' ||
      Number(setId) >= 10004 ||
      [
        'skybound dragons',
        'blossoming fate',
        'apocalypse pact',
        "anathema's gambit",
        'chronicle of destiny',
        'revenants of azvaldt',
      ].includes(setName.toLowerCase()));

  // Traits / Tribes
  const tribes: string[] = Array.isArray(raw.traits)
    ? raw.traits.map(String)
    : Array.isArray(raw.tribes)
    ? raw.tribes.map(String)
    : [];

  let keywords: string[] = Array.isArray(raw.keywords)
    ? raw.keywords.map(String)
    : [];

  const rawTextCombined = `${raw.rawSkillText || ''} ${raw.skill_text || ''} ${raw.text || ''} ${raw.skill_disc || ''} ${raw.evolved?.rawSkillText || ''} ${raw.evolved?.skill_text || ''} ${raw.evolved?.text || ''} ${skillText || ''} ${evoSkillText || ''}`.toLowerCase();

  const ignoresWardRegex = /ignores?\s*(?:<[^>]+>\s*)*ward|bypasses?\s*(?:<[^>]+>\s*)*ward|can\s+attack\s+past\s*(?:<[^>]+>\s*)*ward|ignores?\s+(?:[a-z]+\s+)?ward/gi;
  const hasIgnoresWardEffect = ignoresWardRegex.test(rawTextCombined);

  if (hasIgnoresWardEffect) {
    if (!keywords.includes('Ignores Ward')) {
      keywords.push('Ignores Ward');
    }
    const textWithoutIgnores = rawTextCombined.replace(ignoresWardRegex, '');
    const hasStandaloneWard = /\bward\b/i.test(textWithoutIgnores);
    if (!hasStandaloneWard) {
      keywords = keywords.filter((k) => k.toLowerCase() !== 'ward');
    }
  }

  const image =
    raw.image || `https://static.dotgg.gg/shadowverse/cards/${raw.id}.webp`;

  const useRedEther =
    raw.use_red_ether !== null && raw.use_red_ether !== undefined && raw.use_red_ether !== ''
      ? Number(raw.use_red_ether)
      : fallbackVials.craft;

  const getRedEther =
    raw.get_red_ether !== null && raw.get_red_ether !== undefined && raw.get_red_ether !== ''
      ? Number(raw.get_red_ether)
      : fallbackVials.liquefyRegular;

  return {
    id: String(raw.id),
    slug: String(raw.baseCardId || raw.slug || raw.id),
    name: raw.name || 'Unknown Card',
    hasEvo,
    skillText,
    flavorText,
    classId: String(raw.class ?? '0'),
    className: colorName,
    cv: raw.styles?.[0]?.cv || raw.cv || '',
    evoSkillText,
    evoFlavorText,
    type: cardType,
    subType,
    cost: parsedCost,
    atk: parsedAtk,
    life: parsedLife,
    rarity: validRarity,
    rarityName: RARITY_NAMES[validRarity] || 'Bronze',
    tribes,
    keywords,
    setId,
    setName: setName === '90000' ? 'Tokens' : setName,
    illustrator: raw.styles?.[0]?.illustrator || raw.illustrator || '',
    isToken,
    isRotation,
    questions: Array.isArray(raw.questions) ? raw.questions : [],
    relatedCards: Array.isArray(raw.relatedCards)
      ? raw.relatedCards.map(String)
      : Array.isArray(raw.related_cards)
      ? raw.related_cards.map(String)
      : [],
    useRedEther,
    getRedEther,
    image,
    imageBack,
  };
}

export interface CodexMetadata {
  schemaVersion?: string;
  generatedAt?: string;
  source?: string;
  imageBase?: string;
  count?: number;
  sourceCount?: number;
  deckSelectableCount?: number;
  classes: string[];
  sets: Record<string, string>;
  traits: Record<string, string>;
  keywords: Record<string, string>;
  skillReplaceTextNames?: Record<string, string>;
  update?: {
    added?: number;
    updated?: number;
    deleted?: number;
  };
}

export interface DynamicGameMetadata {
  classes: string[];
  sets: { id: string; name: string; number?: number }[];
  traits: string[];
  keywords: string[];
  rawMetadata: CodexMetadata | null;
}

let cachedCards: Card[] | null = null;
let cardMap: Map<string, Card> | null = null;
let cachedMetadata: CodexMetadata | null = null;

export async function fetchCardMetadata(): Promise<DynamicGameMetadata> {
  if (cachedMetadata) {
    return parseDynamicMetadata(cachedMetadata);
  }

  // 1. Try local /data/metadata.json first
  try {
    const res = await fetch('/data/metadata.json');
    if (res.ok) {
      const meta = await res.json();
      if (meta && meta.classes && meta.sets) {
        cachedMetadata = meta;
        return parseDynamicMetadata(meta);
      }
    }
  } catch (err) {
    console.warn('Could not load local /data/metadata.json, attempting Beyond Codex API fallback...', err);
  }

  // 2. Fallback to Beyond Codex raw endpoint
  try {
    const res = await fetch(
      'https://raw.githubusercontent.com/SomostVE/beyond_codex/main/api/v1/metadata.json'
    );
    if (res.ok) {
      const meta = await res.json();
      if (meta && meta.classes && meta.sets) {
        cachedMetadata = meta;
        return parseDynamicMetadata(meta);
      }
    }
  } catch (err) {
    console.error('Failed to load metadata from Beyond Codex fallback:', err);
  }

  return parseDynamicMetadata(null);
}

export function parseDynamicMetadata(meta: CodexMetadata | null): DynamicGameMetadata {
  if (!meta) {
    return {
      classes: ['Forestcraft', 'Swordcraft', 'Runecraft', 'Dragoncraft', 'Abysscraft', 'Havencraft', 'Portalcraft', 'Neutral'],
      sets: [
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
      ],
      traits: [
        'Artifact', 'Earth Sigil', 'Golem', 'Levin', 'Luminous', 'Marine',
        'Mysteria', 'Officer', 'Pixie', 'Puppetry', 'Shikigami', 'Anathema',
        'Departed', 'Loot', 'Encroacher'
      ],
      keywords: [
        'Fanfare', 'Last Words', 'Evolve', 'Strike', 'Ward', 'Ignores Ward', 'Storm',
        'Ambush', 'Bane', 'Drain', 'Overflow', 'Countdown', 'Rush',
        'Clash', 'Enhance', 'Invoke', 'Earth Rite', 'Necromancy',
        'Spellboost', 'Engage', 'Super-Evolve', 'Maneuver', 'Rally',
        'Wrath', 'Avarice', 'Resonance', 'Crest', 'Accelerate'
      ],
      rawMetadata: null,
    };
  }

  const classes = Array.isArray(meta.classes) ? meta.classes : [];

  // Sets ordered chronologically by numeric setId
  const sets = Object.entries(meta.sets || {})
    .sort(([idA], [idB]) => Number(idA) - Number(idB))
    .map(([id, name], idx) => ({
      id,
      name: name === '90000' ? 'Tokens' : name,
      number: id === '10000' || id === '90000' ? undefined : idx,
    }));

  const traits = Object.values(meta.traits || {})
    .filter((t) => typeof t === 'string' && t.trim() !== '' && t !== '-')
    .sort();

  const keywords = Object.values(meta.keywords || {})
    .filter((k) => typeof k === 'string' && k.trim() !== '')
    .sort();

  return {
    classes,
    sets,
    traits,
    keywords,
    rawMetadata: meta,
  };
}

export async function fetchCardDatabase(): Promise<{ cards: Card[]; map: Map<string, Card> }> {
  if (cachedCards && cardMap) {
    return { cards: cachedCards, map: cardMap };
  }

  // 1. Try local /data/cards.json first
  try {
    const res = await fetch('/data/cards.json');
    if (res.ok) {
      const rawList = await res.json();
      if (Array.isArray(rawList) && rawList.length > 0) {
        const loadedCards = rawList.map(normalizeCard);
        cachedCards = loadedCards;
        cardMap = new Map();
        for (const card of loadedCards) {
          cardMap.set(card.id, card);
        }
        return { cards: loadedCards, map: cardMap };
      }
    }
  } catch (err) {
    console.warn('Could not load local /data/cards.json, attempting Beyond Codex API fallback...', err);
  }

  // 2. Fallback to Beyond Codex raw endpoint
  try {
    const res = await fetch(
      'https://raw.githubusercontent.com/SomostVE/beyond_codex/main/api/v1/cards.json'
    );
    if (res.ok) {
      const rawList = await res.json();
      const loadedCards = rawList.map(normalizeCard);
      cachedCards = loadedCards;
      cardMap = new Map();
      for (const card of loadedCards) {
        cardMap.set(card.id, card);
      }
      return { cards: loadedCards, map: cardMap };
    }
  } catch (err) {
    console.error('Failed to load card database from Beyond Codex fallback:', err);
  }

  return { cards: cachedCards || [], map: cardMap || new Map() };
}

/**
 * Returns formatted text parts for Shadowverse markup.
 * Parses <b>, <color=Keyword>, <sev>, <ev>, <hr>, <i>
 */
export interface TextSegment {
  text: string;
  isBold?: boolean;
  isKeyword?: boolean;
  isAccelerateKeyword?: boolean;
  isSuperEvolveKeyword?: boolean;
  isEvolveKeyword?: boolean;
  isSuperEvolve?: boolean;
  isEvolve?: boolean;
  isDivider?: boolean;
  isItalic?: boolean;
}

export interface CardAbilities {
  baseSegments: TextSegment[];
  evoSegments: TextSegment[];
  superEvoSegments: TextSegment[];
  hasBase: boolean;
  hasEvo: boolean;
  hasSuperEvo: boolean;
  baseText: string;
  evoText: string;
  superEvoText: string;
}

export function parseSkillText(html: string, defaultSev = false, defaultEv = false): TextSegment[] {
  if (!html) return [];

  // Pre-format plain or parameterized keywords that might not have raw HTML tags
  const normalizedHtml = html
    .replace(/(^|\n|<hr\s*\/?>|•\s*)(Accelerate(?:\s*\(\d+\))?)(:|\s+|$)/gi, '$1<b><color=Keyword>$2</color></b>$3')
    .replace(/(^|\n|<hr\s*\/?>|•\s*)(Enhance(?:\s*\(\d+\))?)(:|\s+|$)/gi, '$1<b><color=Keyword>$2</color></b>$3')
    .replace(/(^|\n|<hr\s*\/?>|•\s*)(Countdown(?:\s*\(\d+\))?)(:|\s+|$)/gi, '$1<b><color=Keyword>$2</color></b>$3')
    .replace(/(^|\n|<hr\s*\/?>|•\s*)(Reanimate(?:\s*\(\d+\))?)(:|\s+|$)/gi, '$1<b><color=Keyword>$2</color></b>$3');

  const withMarkers = normalizedHtml
    .replace(/<hr\s*\/?>/gi, '\n___HR___\n')
    .replace(/<ridx=\d+>/gi, '\n• ')
    .replace(/<\/ridx>/gi, '')
    .replace(/<sev>(.*?)<\/sev>/gis, '\n___SEV_START___$1___SEV_END___\n')
    .replace(/<ev>(.*?)<\/ev>/gis, '\n___EV_START___$1___EV_END___\n');

  const lines = withMarkers.split('\n');
  const segments: TextSegment[] = [];

  for (let l = 0; l < lines.length; l++) {
    const rawLine = lines[l];
    const line = rawLine.trim();
    if (!line) continue;

    if (line === '___HR___') {
      segments.push({ text: '', isDivider: true });
      continue;
    }

    let isSev = defaultSev;
    let isEv = defaultEv;
    let cleanLine = line;

    if (cleanLine.includes('___SEV_START___')) {
      isSev = true;
      cleanLine = cleanLine.replace(/___SEV_START___/g, '').replace(/___SEV_END___/g, '');
    } else if (cleanLine.includes('___EV_START___')) {
      isEv = true;
      cleanLine = cleanLine.replace(/___EV_START___/g, '').replace(/___EV_END___/g, '');
    }

    // Auto-detect Super-Evolve vs Evolve prefixes
    if (/^Super-Evolve/i.test(cleanLine.trim()) || /<b><color=Keyword>Super-Evolve<\/color><\/b>/i.test(cleanLine)) {
      isSev = true;
    } else if (/^Evolve/i.test(cleanLine.trim()) || /<b><color=Keyword>Evolve<\/color><\/b>/i.test(cleanLine)) {
      isEv = true;
    }

    // Match tags including nested combinations like <b><i>...</i></b> or <color=Keyword>...</color>
    const tagRegex = /(<b>(?:<i>)?(?:<color=Keyword>)?.*?(?:<\/color>)?(?:<\/i>)?<\/b>|<i>(?:<b>)?(?:<color=Keyword>)?.*?(?:<\/color>)?(?:<\/b>)?<\/i>|<color=Keyword>.*?<\/color>)/gi;
    const tokens = cleanLine.split(tagRegex);

    for (const token of tokens) {
      if (!token) continue;

      const isBold = /<b>/i.test(token);
      const isItalic = /<i>/i.test(token);
      const isKeywordTag = /<color=Keyword>/i.test(token);
      const cleanText = token.replace(/<[^>]+>/g, '');

      if (!cleanText) continue;

      const trimmed = cleanText.trim();
      const isSuperEvolveKw = /^super-evolve:?$/i.test(trimmed);
      const isEvolveKw = /^evolve:?$/i.test(trimmed);
      const isAccelerateKw = /^accelerate(?:\s*\(\d+\))?:?$/i.test(trimmed);
      const isEnhanceKw = /^enhance(?:\s*\(\d+\))?:?$/i.test(trimmed);
      const isCrest = /^Crest:/i.test(trimmed);
      const isKnownKw =
        isKeywordTag ||
        isSuperEvolveKw ||
        isEvolveKw ||
        isAccelerateKw ||
        isEnhanceKw ||
        /^(fanfare|last words|rush|storm|ward|bane|drain|ambush|clash|strike|invoke|countdown|reanimate|skybound art|super skybound art|earth rite|spellboost|engage|rally|wrath|overflow|necromancy|aura|barrier|intimidate):?$/i.test(trimmed);

      segments.push({
        text: cleanText,
        isBold: isBold || isCrest,
        isItalic: isItalic || isCrest,
        isKeyword: isKnownKw,
        isAccelerateKeyword: isAccelerateKw,
        isSuperEvolveKeyword: isSuperEvolveKw,
        isEvolveKeyword: isEvolveKw,
        isSuperEvolve: isSev,
        isEvolve: isEv,
      });
    }

    if (l < lines.length - 1) {
      segments.push({ text: '\n' });
    }
  }

  return segments;
}

/**
 * Extracts and partitions card abilities into:
 * - Base Abilities (Normal)
 * - Evolve Abilities (Yellow Theme)
 * - Super-Evolve Abilities (Purple Theme)
 */
export function extractCardAbilities(card: Card): CardAbilities {
  const normal = card.skillText || '';
  const evo = card.evoSkillText || '';
  const combined = `${normal}\n${evo}`;

  // 1. Extract Super-Evolve block
  let superEvoText = '';
  const sevMatch = combined.match(/<sev>(.*?)<\/sev>/s);
  if (sevMatch) {
    superEvoText = sevMatch[1].trim();
  } else {
    const lines = combined.split('\n');
    const seLines = lines.filter((l) => /(?:<color=Keyword>)?Super-Evolve(?:<\/color>)?\s*:/i.test(l));
    if (seLines.length > 0) {
      superEvoText = seLines.join('\n').trim();
    }
  }

  // 2. Extract Evolve block
  let evoText = '';
  const evMatch = combined.match(/<ev>(.*?)<\/ev>/s);
  if (evMatch) {
    evoText = evMatch[1].trim();
  } else if (evo) {
    const cleanEvo = evo
      .replace(/<sev>.*?<\/sev>/gs, '')
      .replace(/<hr\s*\/?>\s*$/i, '')
      .trim();
    const cleanNormal = normal
      .replace(/<sev>.*?<\/sev>/gs, '')
      .replace(/<hr\s*\/?>\s*$/i, '')
      .trim();
    if (cleanEvo && cleanEvo !== cleanNormal) {
      evoText = cleanEvo;
    }
  }

  // 3. Extract Base block
  let baseText = normal
    .replace(/<sev>.*?<\/sev>/gs, '')
    .replace(/<ev>.*?<\/ev>/gs, '')
    .replace(/<hr\s*\/?>\s*$/i, '')
    .trim();

  const baseSegments = parseSkillText(baseText);
  const evoSegments = parseSkillText(evoText, false, true);
  const superEvoSegments = parseSkillText(superEvoText, true, false);

  return {
    baseSegments,
    evoSegments,
    superEvoSegments,
    baseText,
    evoText,
    superEvoText,
    hasBase: baseSegments.length > 0 && baseSegments.some((s) => s.text.trim().length > 0),
    hasEvo: evoSegments.length > 0 && evoSegments.some((s) => s.text.trim().length > 0),
    hasSuperEvo: superEvoSegments.length > 0 && superEvoSegments.some((s) => s.text.trim().length > 0),
  };
}
