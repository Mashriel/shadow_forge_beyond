import { ClassName } from '../types/card';

export const PLAYSTYLE_TAGS = [
  'Aggro',
  'Tempo',
  'Midrange',
  'Control',
  'Combo',
  'OTK',
  'Burn',
  'Ramp',
  'Value',
  'Stall',
  'Disruption',
] as const;

export type PlaystyleTag = (typeof PLAYSTYLE_TAGS)[number];

export const ARCHETYPE_TAGS_BY_CLASS: Record<Exclude<ClassName, 'Neutral'>, string[]> = {
  Forestcraft: ['Fairy', 'Combo', 'Evo', 'Rhino', 'Izudia', 'Crest'],
  Swordcraft: ['Rally', 'Enhance', 'Loot', 'Pirate', 'Commander', 'Evo'],
  Runecraft: ['Spellboost', 'Earth Rite', 'Crystal', 'Sephie', 'Mysteria', 'Lynkhal', 'Truth'],
  Dragoncraft: ['Ramp', 'Face', 'Discard', 'Marine', 'Burnite', 'Disdain', 'Cocytos', 'Feenie'],
  Abysscraft: ['Ghost', 'Last Words', 'Wrath', 'Vengeance', 'Miltio', 'Reanimate', 'Mode'],
  Havencraft: ['Amulet', 'Crest', 'Ward', 'Heal', 'Laphis', 'Evo'],
  Portalcraft: ['Artifact', 'Puppet', 'Evo', 'Highlander', 'Masterwork', 'Egg'],
};

export function getAvailableTagsForClass(className: ClassName): {
  playstyle: string[];
  archetype: string[];
} {
  const playstyle = [...PLAYSTYLE_TAGS];
  if (className === 'Neutral' || !ARCHETYPE_TAGS_BY_CLASS[className as Exclude<ClassName, 'Neutral'>]) {
    return { playstyle, archetype: [] };
  }
  return {
    playstyle,
    archetype: ARCHETYPE_TAGS_BY_CLASS[className as Exclude<ClassName, 'Neutral'>],
  };
}
