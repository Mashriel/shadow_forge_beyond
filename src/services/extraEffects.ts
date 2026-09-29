import { TextSegment, parseSkillText } from './cardData';

export interface AccelerateEffect {
  cardId: string;
  cardName: string;
  cost: number;
  name: string;
  description: string;
  rawSkillText: string;
  effects?: string[];
  keywords?: string[];
}

export interface CrestEffect {
  cardId: string;
  cardName: string;
  crestName: string;
  countdown?: number;
  description: string;
  rawSkillText: string;
  effects?: string[];
  keywords?: string[];
}

export interface FaithEffect {
  cardId: string;
  cardName: string;
  faithName: string;
  description: string;
  rawSkillText: string;
  effects?: string[];
  keywords?: string[];
}

export interface CrystallizeEffect {
  cardId: string;
  cardName: string;
  cost: number;
  countdown?: number;
  name: string;
  description: string;
  rawSkillText: string;
  effects?: string[];
  keywords?: string[];
}

let accelerateCache: Record<string, AccelerateEffect> | null = null;
let crestCache: Record<string, CrestEffect> | null = null;
let faithCache: Record<string, FaithEffect> | null = null;
let crystallizeCache: Record<string, CrystallizeEffect> | null = null;

export async function loadExtraEffects(): Promise<{
  accelerate: Record<string, AccelerateEffect>;
  crest: Record<string, CrestEffect>;
  faith: Record<string, FaithEffect>;
  crystallize: Record<string, CrystallizeEffect>;
}> {
  if (accelerateCache && crestCache && faithCache && crystallizeCache) {
    return {
      accelerate: accelerateCache,
      crest: crestCache,
      faith: faithCache,
      crystallize: crystallizeCache,
    };
  }

  try {
    const [accelRes, crestRes, faithRes, crystalRes] = await Promise.all([
      fetch('/data/accelerateEffects.json').catch(() => null),
      fetch('/data/crestEffects.json').catch(() => null),
      fetch('/data/faithEffects.json').catch(() => null),
      fetch('/data/crystallizeEffects.json').catch(() => null),
    ]);

    if (accelRes && accelRes.ok) {
      accelerateCache = await accelRes.json();
    } else {
      accelerateCache = {};
    }

    if (crestRes && crestRes.ok) {
      crestCache = await crestRes.json();
    } else {
      crestCache = {};
    }

    if (faithRes && faithRes.ok) {
      faithCache = await faithRes.json();
    } else {
      faithCache = {};
    }

    if (crystalRes && crystalRes.ok) {
      crystallizeCache = await crystalRes.json();
    } else {
      crystallizeCache = {};
    }
  } catch (err) {
    console.error('Failed to load extra effects databases:', err);
    accelerateCache = accelerateCache || {};
    crestCache = crestCache || {};
    faithCache = faithCache || {};
    crystallizeCache = crystallizeCache || {};
  }

  return {
    accelerate: accelerateCache || {},
    crest: crestCache || {},
    faith: faithCache || {},
    crystallize: crystallizeCache || {},
  };
}

export function getAccelerateEffect(cardId: string | number): AccelerateEffect | null {
  if (!accelerateCache) return null;
  return accelerateCache[String(cardId)] || null;
}

export function getCrestEffect(cardId: string | number): CrestEffect | null {
  if (!crestCache) return null;
  return crestCache[String(cardId)] || null;
}

export function getFaithEffect(cardId: string | number): FaithEffect | null {
  if (!faithCache) return null;
  return faithCache[String(cardId)] || null;
}

export function getCrystallizeEffect(cardId: string | number): CrystallizeEffect | null {
  if (!crystallizeCache) return null;
  return crystallizeCache[String(cardId)] || null;
}

export function getExtraEffectsText(cardId: string | number): string {
  const accel = getAccelerateEffect(cardId);
  const crest = getCrestEffect(cardId);
  const faith = getFaithEffect(cardId);
  const crystal = getCrystallizeEffect(cardId);
  const parts: string[] = [];

  if (accel) {
    parts.push(`Accelerate (${accel.cost}): ${accel.description}`);
    if (accel.effects) parts.push(accel.effects.join(' '));
    if (accel.keywords) parts.push(accel.keywords.join(' '));
  }

  if (crest) {
    parts.push(`${crest.crestName}: ${crest.description}`);
    if (crest.effects) parts.push(crest.effects.join(' '));
    if (crest.keywords) parts.push(crest.keywords.join(' '));
  }

  if (faith) {
    parts.push(`${faith.faithName}: ${faith.description}`);
    if (faith.effects) parts.push(faith.effects.join(' '));
    if (faith.keywords) parts.push(faith.keywords.join(' '));
  }

  if (crystal) {
    parts.push(`Crystallize (${crystal.cost}): ${crystal.description}`);
    if (crystal.effects) parts.push(crystal.effects.join(' '));
    if (crystal.keywords) parts.push(crystal.keywords.join(' '));
  }

  return parts.join(' ');
}

export function getParsedAccelerateSegments(effect: AccelerateEffect): TextSegment[] {
  return parseSkillText(effect.rawSkillText || effect.description);
}

export function getParsedCrestSegments(effect: CrestEffect): TextSegment[] {
  return parseSkillText(effect.rawSkillText || effect.description);
}

export function getParsedFaithSegments(effect: FaithEffect): TextSegment[] {
  return parseSkillText(effect.rawSkillText || effect.description);
}

export function getParsedCrystallizeSegments(effect: CrystallizeEffect): TextSegment[] {
  return parseSkillText(effect.rawSkillText || effect.description);
}
