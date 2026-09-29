import React from 'react';
import { Card } from '../../types/card';
import { Sparkles, Swords, Zap, Wand2, X, SlidersHorizontal, Check } from 'lucide-react';
import { playClick } from '../../services/sound';
import {
  getExtraEffectsText,
  getAccelerateEffect,
  getCrestEffect,
  getFaithEffect,
  getCrystallizeEffect,
} from '../../services/extraEffects';

export interface AdvanceFiltersState {
  traits: string[];
  excludedTraits?: string[];
  keywords: string[];
  excludedKeywords?: string[];
  mechanics: string[];
  excludedMechanics?: string[];
  effects: string[];
  excludedEffects?: string[];
  matchMode: 'all' | 'any';
}

export const initialAdvanceFilters: AdvanceFiltersState = {
  traits: [],
  excludedTraits: [],
  keywords: [],
  excludedKeywords: [],
  mechanics: [],
  excludedMechanics: [],
  effects: [],
  excludedEffects: [],
  matchMode: 'all',
};

export const TRAIT_OPTIONS = [
  'Artifact',
  'Earth Sigil',
  'Golem',
  'Levin',
  'Luminous',
  'Marine',
  'Mysteria',
  'Officer',
  'Pixie',
  'Puppetry',
  'Shikigami',
  'Anathema',
  'Departed',
];

export const KEYWORD_OPTIONS = [
  'Evolve',
  'Super-Evolve',
  'Skybound Art',
  'Super Skybound Art',
  'Storm',
  'Rush',
  'Ward',
  'Ignores Ward',
  'Bane',
  'Drain',
  'Ambush',
  'Barrier',
  'Aura',
  'Fanfare',
  'Last Words',
  'Clash',
  'Strike',
  'Invoke',
  'Accelerate',
  'Crystallize',
];

export const MECHANIC_OPTIONS = [
  'Spellboost',
  'Earth Rite',
  'Earth Sigil',
  'Overflow',
  'Combo',
  'Necromancy',
  'Engage',
  'Countdown',
  'Enhance',
  'Crest',
  'Rally',
  'Wrath',
  'Avarice',
  'Resonance',
  'Faith',
  'Fuse',
  'Reanimate',
  'Mode',
];

export const EFFECT_OPTIONS = [
  { id: 'Draw', label: 'Draw Cards' },
  { id: 'AddToHand', label: 'Add to Hand' },
  { id: 'Discard', label: 'Discard Cards' },
  { id: 'DamageFollower', label: 'Damage to Followers' },
  { id: 'DamageEnemyLeader', label: 'Damage to Enemy Leader' },
  { id: 'DamageYourLeader', label: 'Damage to Your Leader (Self-Damage)' },
  { id: 'Destroy', label: 'Destroy' },
  { id: 'Banish', label: 'Banish' },
  { id: 'Summon', label: 'Summon / Tokens' },
  { id: 'HealLeader', label: 'Restore Leader Defense' },
  { id: 'Buff', label: 'Buff Stats (+X/+X)' },
  { id: 'CostReduction', label: 'Cost Reduction' },
  { id: 'PlayPointBoost', label: 'Play Point Boost (Ramp)' },
  { id: 'MaxPlayPointsCondition', label: '10 Max Play Points Condition' },
  { id: 'Transform', label: 'Transform Cards' },
  { id: 'AddCopy', label: 'Add Copy to Hand / Deck' },
];

const IGNORES_WARD_REGEX = /ignores?\s*(?:<[^>]+>\s*)*ward|bypasses?\s*(?:<[^>]+>\s*)*ward|can\s+attack\s+past\s*(?:<[^>]+>\s*)*ward|ignores?\s+(?:[a-z]+\s+)?ward/gi;

function checkKeywordMatch(text: string, kw: string): boolean {
  const lowerKw = kw.toLowerCase();
  if (lowerKw === 'super-evolve') {
    return /(?:super-evolve|super-evolved|super-evolves|<sev>)/i.test(text);
  }
  if (lowerKw === 'evolve') {
    return /(?<!super-)\bevolve[sd]?\b|<ev>/i.test(text);
  }
  if (lowerKw === 'super skybound art') {
    return /\bsuper skybound art\b/i.test(text);
  }
  if (lowerKw === 'skybound art') {
    return /(?<!super\s+)\bskybound art\b/i.test(text);
  }
  if (lowerKw === 'accelerate') {
    return /\baccelerate(?:\s*\(\d+\))?\b|\baccelerated\b/i.test(text);
  }
  if (lowerKw === 'crystallize') {
    return /\bcrystalliz(?:e|ed|es)(?:\s*\(\d+\))?\b/i.test(text);
  }
  if (lowerKw === 'barrier') {
    return /\bbarrier\b/i.test(text);
  }
  if (lowerKw === 'crest') {
    return /\bcrest\b/i.test(text);
  }
  if (lowerKw === 'ignores ward' || lowerKw === 'ignore ward') {
    return IGNORES_WARD_REGEX.test(text);
  }
  if (lowerKw === 'ward') {
    // Strip "Ignores Ward" phrases so "Ignores Ward" cards do not count as Ward
    const textWithoutIgnores = text.replace(IGNORES_WARD_REGEX, '');
    return /\bward\b/i.test(textWithoutIgnores);
  }
  const regex = new RegExp(`\\b${lowerKw}\\b`, 'i');
  return regex.test(text);
}

export function countActiveAdvanceFilters(filters: AdvanceFiltersState): number {
  return (
    (filters.traits?.length || 0) +
    (filters.excludedTraits?.length || 0) +
    (filters.keywords?.length || 0) +
    (filters.excludedKeywords?.length || 0) +
    (filters.mechanics?.length || 0) +
    (filters.excludedMechanics?.length || 0) +
    (filters.effects?.length || 0) +
    (filters.excludedEffects?.length || 0)
  );
}

export function cycleTriState(
  item: string,
  includedList: string[] = [],
  excludedList: string[] = []
): { newIncluded: string[]; newExcluded: string[] } {
  const isIncluded = includedList.includes(item);
  const isExcluded = excludedList.includes(item);

  if (!isIncluded && !isExcluded) {
    // 1. None -> Included
    return {
      newIncluded: [...includedList, item],
      newExcluded: excludedList.filter((i) => i !== item),
    };
  } else if (isIncluded) {
    // 2. Included -> Excluded
    return {
      newIncluded: includedList.filter((i) => i !== item),
      newExcluded: [...excludedList, item],
    };
  } else {
    // 3. Excluded -> None
    return {
      newIncluded: includedList.filter((i) => i !== item),
      newExcluded: excludedList.filter((i) => i !== item),
    };
  }
}

export function matchAdvanceFilters(card: Card, filters: AdvanceFiltersState): boolean {
  const excludedTraits = filters.excludedTraits || [];
  const excludedKeywords = filters.excludedKeywords || [];
  const excludedMechanics = filters.excludedMechanics || [];
  const excludedEffects = filters.excludedEffects || [];

  // 1. Traits
  // A) Exclusion
  if (excludedTraits.length > 0) {
    const hasExcludedTrait = excludedTraits.some((ex) =>
      card.tribes.some((tribe) => tribe.toLowerCase() === ex.toLowerCase())
    );
    if (hasExcludedTrait) return false;
  }
  // B) Inclusion
  if (filters.traits.length > 0) {
    if (filters.matchMode === 'all') {
      const hasAllTraits = filters.traits.every((t) =>
        card.tribes.some((tribe) => tribe.toLowerCase() === t.toLowerCase())
      );
      if (!hasAllTraits) return false;
    } else {
      const hasAnyTrait = filters.traits.some((t) =>
        card.tribes.some((tribe) => tribe.toLowerCase() === t.toLowerCase())
      );
      if (!hasAnyTrait) return false;
    }
  }

  const extraText = getExtraEffectsText(card.id);
  const combinedText = `${card.skillText || ''} ${card.evoSkillText || ''} ${extraText}`.toLowerCase();

  const isIgnoresWardCard =
    IGNORES_WARD_REGEX.test(combinedText) ||
    (card.keywords && card.keywords.some((k) => k.toLowerCase() === 'ignores ward'));

  const textWithoutIgnores = combinedText.replace(IGNORES_WARD_REGEX, '');
  const hasStandaloneWard = /\bward\b/i.test(textWithoutIgnores);

  const hasKeyword = (kw: string) => {
    const lkw = kw.toLowerCase();

    if (lkw === 'ward') {
      if (isIgnoresWardCard && !hasStandaloneWard) return false;
    }

    if (lkw === 'ignores ward' || lkw === 'ignore ward') {
      return Boolean(isIgnoresWardCard);
    }

    if (lkw === 'accelerate' && getAccelerateEffect(card.id) !== null) return true;
    if (lkw === 'crest' && getCrestEffect(card.id) !== null) return true;
    if (lkw === 'faith' && getFaithEffect(card.id) !== null) return true;
    if (lkw === 'crystallize' && getCrystallizeEffect(card.id) !== null) return true;

    if (
      card.keywords &&
      card.keywords.some((k) => {
        const lk = k.toLowerCase();
        if (lkw === 'ward') {
          if (isIgnoresWardCard && !hasStandaloneWard) return false;
          return lk === 'ward';
        }
        return (
          lk === lkw ||
          (lkw === 'accelerate' && lk.includes('accelerat')) ||
          (lkw === 'crest' && lk.includes('crest'))
        );
      })
    ) {
      return true;
    }
    return checkKeywordMatch(combinedText, kw);
  };

  // 2. Keywords
  // A) Exclusion
  if (excludedKeywords.length > 0) {
    const hasExcludedKeyword = excludedKeywords.some((kw) => hasKeyword(kw));
    if (hasExcludedKeyword) return false;
  }
  // B) Inclusion
  if (filters.keywords.length > 0) {
    if (filters.matchMode === 'all') {
      const hasAll = filters.keywords.every((kw) => hasKeyword(kw));
      if (!hasAll) return false;
    } else {
      const hasAny = filters.keywords.some((kw) => hasKeyword(kw));
      if (!hasAny) return false;
    }
  }

  // 3. Class Mechanics
  const hasMechanic = (mech: string) => {
    const regex = new RegExp(`\\b${mech.toLowerCase()}\\b`, 'i');
    return regex.test(combinedText);
  };

  // A) Exclusion
  if (excludedMechanics.length > 0) {
    const hasExcludedMechanic = excludedMechanics.some((m) => hasMechanic(m));
    if (hasExcludedMechanic) return false;
  }
  // B) Inclusion
  if (filters.mechanics.length > 0) {
    if (filters.matchMode === 'all') {
      const hasAll = filters.mechanics.every((mech) => hasMechanic(mech));
      if (!hasAll) return false;
    } else {
      const hasAny = filters.mechanics.some((mech) => hasMechanic(mech));
      if (!hasAny) return false;
    }
  }

  // 4. Effects / Actions
  const checkEffect = (eff: string) => {
    switch (eff) {
      case 'Draw':
        return /\bdraw\b/i.test(combinedText);

      case 'AddToHand':
        return (
          /(?:add|put|return)(?:ing|s)?.*?\b(?:to|into)\s+(?:your\s+|the\s+)?hand\b/i.test(combinedText) ||
          /\badd(?:ing|s)?\s+(?:a|an|\d+)\s+.*?to\s+hand\b/i.test(combinedText)
        );

      case 'Discard':
        return /\bdiscard(?:s|ed|ing)?\b/i.test(combinedText);

      case 'DamageFollower':
        return (
          /deal(?:s|ing)?\s+(?:\d+|x)\s+damage\s+to\s+(?:an?\s+|all\s+|other\s+|\d+\s+|random\s+)*(?:allied\s+|enemy\s+|other\s+)?follower/i.test(combinedText) ||
          /\bfollower\b.*?(?:deal|deals|dealing)\s+(?:it|them)\s+(?:\d+|x)\s+damage/i.test(combinedText) ||
          /deal(?:s|ing)?\s+(?:\d+|x)\s+damage\s+to\s+(?:this\s+follower|the\s+opposing\s+follower)/i.test(combinedText) ||
          /deal(?:s|ing)?.*?damage.*?\b(?:all enemies|all enemy followers|all followers|all other followers)\b/i.test(combinedText) ||
          /damage\s+split\s+between\s+all\s+(?:enemies|enemy\s+followers)/i.test(combinedText)
        );

      case 'DamageEnemyLeader':
        return (
          /deal(?:s|ing)?\s+(?:\d+|x)\s+damage\s+to\s+(?:the\s+|all\s+)?enemy\s+leader\b/i.test(combinedText) ||
          /deal(?:s|ing)?\s+damage\s+to\s+(?:the\s+|all\s+)?enemy\s+leader\b/i.test(combinedText) ||
          /deal(?:s|ing)?\s+(?:the\s+)?enemy\s+leader\s+(?:\d+|x)\s+damage\b/i.test(combinedText) ||
          /deal(?:s|ing)?.*?damage.*?\b(?:all enemies|the enemy)\b/i.test(combinedText) ||
          /damage\s+split\s+between\s+all\s+enemies\b/i.test(combinedText) ||
          /deal(?:s|ing)?\s+(?:\d+|x)?\s*damage\s+to\s+(?:both|all|each)\s+leaders?\b/i.test(combinedText) ||
          /damage\s+to\s+(?:both|all|each)\s+leaders?\b/i.test(combinedText) ||
          /give\s+(?:them|enemy\s+followers?)\s+["\x27][^"\x27]*deal\s+\d+\s+damage\s+to\s+your\s+leader[^"\x27]*["\x27]/i.test(combinedText)
        );

      case 'DamageYourLeader': {
        const clean = combinedText.replace(/give\s+(?:them|enemy\s+followers?)\s+["\x27][^"\x27]*["\x27]/gi, '');
        return (
          /deal(?:s|ing)?\s+(?:\d+|x)\s+damage\s+to\s+(?:your\s+leader|yourself)\b/i.test(clean) ||
          /deal(?:s|ing)?\s+damage\s+to\s+(?:your\s+leader|yourself)\b/i.test(clean) ||
          /deal(?:s|ing)?\s+(?:your\s+leader|yourself)\s+(?:\d+|x)\s+damage\b/i.test(clean) ||
          /deal(?:s|ing)?\s+(?:\d+|x)?\s*damage\s+to\s+(?:both|all|each)\s+leaders?\b/i.test(clean) ||
          /damage\s+to\s+(?:both|all|each)\s+leaders?\b/i.test(clean)
        );
      }

      case 'Destroy':
        return /\bdestroy(?:s|ed|ing)?\b/i.test(combinedText);

      case 'Banish':
        return /\bbanish(?:es|ed|ing)?\b/i.test(combinedText);

      case 'Summon':
        return /\bsummon(?:s|ed|ing)?\b/i.test(combinedText);

      case 'HealLeader':
        return (
          /(?:restore|heal)\s+(?:\d+|x)\s+(?:defense|life|health)\s+to\s+your\s+leader\b/i.test(combinedText) ||
          /(?:restore|heal).*?(?:defense|life|health).*?\b(?:your\s+leader|leader)\b/i.test(combinedText)
        );

      case 'Buff':
        return (
          /\+\d+\/\+\d+/i.test(combinedText) ||
          /\bgive\b.*?\+\d+/i.test(combinedText) ||
          /\bgain\b.*?\+\d+/i.test(combinedText) ||
          /increase\s+(?:this\s+follower's\s+)?attack/i.test(combinedText)
        );

      case 'CostReduction':
        return (
          /reduce\s+the\s+cost/i.test(combinedText) ||
          /costs?\s+\d+\s+less/i.test(combinedText) ||
          /set\s+its\s+cost\s+to\s+0/i.test(combinedText) ||
          /set\s+(?:the\s+)?cost\s+to/i.test(combinedText)
        );

      case 'PlayPointBoost':
        return (
          /gain\s+(?:\d+|an?|x)\s+max\s+play\s+point/i.test(combinedText) ||
          /gain\s+(?:\d+|an?|x)\s+play\s+point/i.test(combinedText) ||
          /restore\s+(?:\d+|an?|x)\s+play\s+point/i.test(combinedText) ||
          /play\s+point\s+orb/i.test(combinedText) ||
          /\bramp\b/i.test(combinedText)
        );

      case 'MaxPlayPointsCondition':
        return (
          /10\s+max\s+play\s+points?/i.test(combinedText) ||
          /if\s+(?:you|both\s+players)\s+have\s+10\s+max\s+play\s+points?/i.test(combinedText)
        );

      case 'Transform':
        return /\btransform(?:s|ed|ing)?\b/i.test(combinedText);

      case 'AddCopy':
        return (
          /(?:add|put)\b.*?\b(?:cop\b|copies\b|copy\b)\b/i.test(combinedText) ||
          /add\s+(?:\d+|an?|x|3)?\s*cop(?:ies|y)\s+to\s+(?:your\s+)?(?:hand|deck)/i.test(combinedText)
        );

      default:
        return combinedText.includes(eff.toLowerCase());
    }
  };

  // A) Exclusion
  if (excludedEffects.length > 0) {
    const hasExcludedEffect = excludedEffects.some((eff) => checkEffect(eff));
    if (hasExcludedEffect) return false;
  }
  // B) Inclusion
  if (filters.effects.length > 0) {
    if (filters.matchMode === 'all') {
      const hasAll = filters.effects.every((eff) => checkEffect(eff));
      if (!hasAll) return false;
    } else {
      const hasAny = filters.effects.some((eff) => checkEffect(eff));
      if (!hasAny) return false;
    }
  }

  return true;
}

interface AdvanceFiltersPanelProps {
  filters: AdvanceFiltersState;
  onChange: (next: AdvanceFiltersState) => void;
  onClose?: () => void;
  matchingCount?: number;
  availableTraits?: string[];
  availableKeywords?: string[];
}

export const AdvanceFiltersPanel: React.FC<AdvanceFiltersPanelProps> = ({
  filters,
  onChange,
  onClose,
  matchingCount,
  availableTraits = TRAIT_OPTIONS,
  availableKeywords = KEYWORD_OPTIONS,
}) => {
  const activeCount = countActiveAdvanceFilters(filters);

  const toggleTrait = (trait: string) => {
    playClick();
    const { newIncluded, newExcluded } = cycleTriState(
      trait,
      filters.traits,
      filters.excludedTraits || []
    );
    onChange({
      ...filters,
      traits: newIncluded,
      excludedTraits: newExcluded,
    });
  };

  const toggleKeyword = (kw: string) => {
    playClick();
    const { newIncluded, newExcluded } = cycleTriState(
      kw,
      filters.keywords,
      filters.excludedKeywords || []
    );
    onChange({
      ...filters,
      keywords: newIncluded,
      excludedKeywords: newExcluded,
    });
  };

  const toggleMechanic = (mech: string) => {
    playClick();
    const { newIncluded, newExcluded } = cycleTriState(
      mech,
      filters.mechanics,
      filters.excludedMechanics || []
    );
    onChange({
      ...filters,
      mechanics: newIncluded,
      excludedMechanics: newExcluded,
    });
  };

  const toggleEffect = (effId: string) => {
    playClick();
    const { newIncluded, newExcluded } = cycleTriState(
      effId,
      filters.effects,
      filters.excludedEffects || []
    );
    onChange({
      ...filters,
      effects: newIncluded,
      excludedEffects: newExcluded,
    });
  };

  const clearAdvanceFilters = () => {
    playClick();
    onChange(initialAdvanceFilters);
  };

  return (
    <div className="rounded-2xl border border-cyan-800/40 bg-slate-950/95 p-4 sm:p-5 shadow-2xl backdrop-blur-md space-y-4">
      {/* Header bar */}
      <div className="flex flex-wrap items-center justify-between gap-2 border-b border-slate-800/80 pb-3">
        <div className="flex items-center space-x-2">
          <div className="flex h-7 w-7 items-center justify-center rounded-lg bg-cyan-950 border border-cyan-500/50 text-cyan-300">
            <SlidersHorizontal className="h-4 w-4" />
          </div>
          <div>
            <h4 className="text-sm font-bold text-white flex items-center gap-2">
              Advance Filters
              {activeCount > 0 && (
                <span className="rounded-full bg-cyan-500 text-slate-950 px-2 py-0.2 text-[11px] font-black shadow-sm">
                  {activeCount} active
                </span>
              )}
            </h4>
            <p className="text-[11px] text-slate-400">
              Filter cards by trait, skill keywords, mechanics, and granular card actions
            </p>
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          {/* Tri-State Mode Helper Legend */}
          <div className="flex items-center space-x-1.5 text-[11px] bg-slate-900/90 border border-slate-800 rounded-lg px-2.5 py-1">
            <span className="text-slate-400 font-medium hidden sm:inline">Tri-State:</span>
            <span className="flex items-center text-emerald-300 font-bold bg-emerald-950/90 border border-emerald-500/60 px-1.5 py-0.2 rounded text-[10px]">
              <Check className="h-3 w-3 mr-0.5 text-emerald-400" /> Include
            </span>
            <span className="text-slate-600">→</span>
            <span className="flex items-center text-rose-300 font-bold bg-rose-950/90 border border-rose-500/60 px-1.5 py-0.2 rounded text-[10px]">
              <X className="h-3 w-3 mr-0.5 text-rose-400" /> Exclude
            </span>
            <span className="text-slate-600">→</span>
            <span className="text-slate-400 font-medium text-[10px]">Off</span>
          </div>

          {/* Match mode toggle */}
          <div className="flex items-center space-x-1 rounded-lg bg-slate-900 border border-slate-800 p-0.5 text-[11px]">
            <span className="text-slate-500 px-1.5 font-medium">Match:</span>
            <button
              type="button"
              onClick={() => {
                playClick();
                onChange({ ...filters, matchMode: 'all' });
              }}
              className={`rounded px-2 py-0.5 font-semibold transition-all ${
                filters.matchMode === 'all'
                  ? 'bg-cyan-900 text-cyan-200 shadow-sm'
                  : 'text-slate-400 hover:text-white'
              }`}
            >
              All Keywords
            </button>
            <button
              type="button"
              onClick={() => {
                playClick();
                onChange({ ...filters, matchMode: 'any' });
              }}
              className={`rounded px-2 py-0.5 font-semibold transition-all ${
                filters.matchMode === 'any'
                  ? 'bg-cyan-900 text-cyan-200 shadow-sm'
                  : 'text-slate-400 hover:text-white'
              }`}
            >
              Any Keyword
            </button>
          </div>

          {activeCount > 0 && (
            <button
              type="button"
              onClick={clearAdvanceFilters}
              className="rounded-lg border border-rose-900/60 bg-rose-950/40 px-2.5 py-1 text-xs font-semibold text-rose-300 hover:bg-rose-900/50 transition-colors"
            >
              Clear Advance
            </button>
          )}

          {onClose && (
            <button
              type="button"
              onClick={onClose}
              className="rounded-lg border border-slate-800 bg-slate-900 p-1 text-slate-400 hover:text-white hover:border-slate-700"
            >
              <X className="h-4 w-4" />
            </button>
          )}
        </div>
      </div>

      {/* 1. Trait / Tribe */}
      <div className="space-y-1.5">
        <div className="flex items-center justify-between text-xs font-semibold text-amber-300">
          <div className="flex items-center space-x-1.5">
            <Sparkles className="h-3.5 w-3.5" />
            <span>Traits & Tribes</span>
          </div>
          <span className="text-[10px] text-slate-400 font-normal">
            Click to cycle: <strong className="text-emerald-400">Include</strong> / <strong className="text-rose-400">Exclude</strong> / Off
          </span>
        </div>
        <div className="flex flex-wrap gap-1.5">
          {availableTraits.map((trait) => {
            const isIncluded = filters.traits.includes(trait);
            const isExcluded = (filters.excludedTraits || []).includes(trait);

            return (
              <button
                key={trait}
                type="button"
                onClick={() => toggleTrait(trait)}
                className={`flex items-center space-x-1 rounded-lg px-2.5 py-1 text-xs font-medium border transition-all ${
                  isIncluded
                    ? 'border-amber-400 bg-amber-950/90 text-amber-200 shadow-[0_0_8px_rgba(245,158,11,0.35)] font-bold'
                    : isExcluded
                    ? 'border-rose-500/90 bg-rose-950/90 text-rose-300 shadow-[0_0_8px_rgba(244,63,94,0.35)] font-bold'
                    : 'border-slate-800 bg-slate-900/80 text-slate-300 hover:border-amber-500/50 hover:text-white'
                }`}
                title={
                  isIncluded
                    ? `${trait}: Must INCLUDE (Click to Exclude)`
                    : isExcluded
                    ? `${trait}: EXCLUDED (Click to Turn Off)`
                    : `${trait}: Turn On (Click to Include)`
                }
              >
                {isIncluded && <Check className="h-3.5 w-3.5 text-amber-400 shrink-0" />}
                {isExcluded && <X className="h-3.5 w-3.5 text-rose-400 shrink-0" />}
                <span className={isExcluded ? 'line-through decoration-rose-400/80' : ''}>
                  {trait}
                </span>
              </button>
            );
          })}
        </div>
      </div>

      {/* 2. Keywords on Skill Text (Combat & Triggers) */}
      <div className="space-y-1.5 pt-2 border-t border-slate-800/80">
        <div className="flex items-center justify-between text-xs font-semibold text-cyan-300">
          <div className="flex items-center space-x-1.5">
            <Swords className="h-3.5 w-3.5" />
            <span>Combat & Trigger Keywords</span>
          </div>
          <span className="text-[10px] text-slate-400 font-normal">
            Click to cycle: <strong className="text-emerald-400">Include</strong> / <strong className="text-rose-400">Exclude</strong> / Off
          </span>
        </div>
        <div className="flex flex-wrap gap-1.5">
          {availableKeywords.map((kw) => {
            const isIncluded = filters.keywords.includes(kw);
            const isExcluded = (filters.excludedKeywords || []).includes(kw);

            const isSuperEvo = kw === 'Super-Evolve' || /super-evolve/i.test(kw);
            const isEvo = !isSuperEvo && (kw === 'Evolve' || /^evolve$/i.test(kw));

            let buttonClass = 'border-slate-800 bg-slate-900/80 text-slate-300 hover:border-cyan-500/50 hover:text-white';
            let checkColor = 'text-cyan-400';

            if (isExcluded) {
              buttonClass = 'border-rose-500/90 bg-rose-950/90 text-rose-300 shadow-[0_0_8px_rgba(244,63,94,0.35)] font-bold';
            } else if (isSuperEvo) {
              checkColor = 'text-purple-300';
              buttonClass = isIncluded
                ? 'border-purple-400 bg-purple-950/90 text-purple-200 shadow-[0_0_8px_rgba(168,85,247,0.4)] font-bold'
                : 'border-purple-900/50 bg-purple-950/20 text-purple-300/90 hover:border-purple-500 hover:text-white';
            } else if (isEvo) {
              checkColor = 'text-amber-400';
              buttonClass = isIncluded
                ? 'border-amber-400 bg-amber-950/90 text-amber-200 shadow-[0_0_8px_rgba(245,158,11,0.35)] font-bold'
                : 'border-amber-900/50 bg-amber-950/20 text-amber-300/90 hover:border-amber-500 hover:text-white';
            } else if (isIncluded) {
              buttonClass = 'border-cyan-400 bg-cyan-950/90 text-cyan-200 shadow-[0_0_8px_rgba(6,182,212,0.35)] font-bold';
            }

            return (
              <button
                key={kw}
                type="button"
                onClick={() => toggleKeyword(kw)}
                className={`flex items-center space-x-1 rounded-lg px-2.5 py-1 text-xs font-medium border transition-all ${buttonClass}`}
                title={
                  isIncluded
                    ? `${kw}: Must INCLUDE (Click to Exclude)`
                    : isExcluded
                    ? `${kw}: EXCLUDED (Click to Turn Off)`
                    : `${kw}: Turn On (Click to Include)`
                }
              >
                {isIncluded && <Check className={`h-3.5 w-3.5 ${checkColor} shrink-0`} />}
                {isExcluded && <X className="h-3.5 w-3.5 text-rose-400 shrink-0" />}
                <span className={isExcluded ? 'line-through decoration-rose-400/80' : ''}>
                  {kw}
                </span>
              </button>
            );
          })}
        </div>
      </div>

      {/* 3. Class Mechanics & Special Abilities */}
      <div className="space-y-1.5 pt-2 border-t border-slate-800/80">
        <div className="flex items-center justify-between text-xs font-semibold text-purple-300">
          <div className="flex items-center space-x-1.5">
            <Wand2 className="h-3.5 w-3.5" />
            <span>Class Mechanics & Abilities</span>
          </div>
          <span className="text-[10px] text-slate-400 font-normal">
            Click to cycle: <strong className="text-emerald-400">Include</strong> / <strong className="text-rose-400">Exclude</strong> / Off
          </span>
        </div>
        <div className="flex flex-wrap gap-1.5">
          {MECHANIC_OPTIONS.map((mech) => {
            const isIncluded = filters.mechanics.includes(mech);
            const isExcluded = (filters.excludedMechanics || []).includes(mech);

            return (
              <button
                key={mech}
                type="button"
                onClick={() => toggleMechanic(mech)}
                className={`flex items-center space-x-1 rounded-lg px-2.5 py-1 text-xs font-medium border transition-all ${
                  isIncluded
                    ? 'border-purple-400 bg-purple-950/90 text-purple-200 shadow-[0_0_8px_rgba(168,85,247,0.35)] font-bold'
                    : isExcluded
                    ? 'border-rose-500/90 bg-rose-950/90 text-rose-300 shadow-[0_0_8px_rgba(244,63,94,0.35)] font-bold'
                    : 'border-slate-800 bg-slate-900/80 text-slate-300 hover:border-purple-500/50 hover:text-white'
                }`}
                title={
                  isIncluded
                    ? `${mech}: Must INCLUDE (Click to Exclude)`
                    : isExcluded
                    ? `${mech}: EXCLUDED (Click to Turn Off)`
                    : `${mech}: Turn On (Click to Include)`
                }
              >
                {isIncluded && <Check className="h-3.5 w-3.5 text-purple-400 shrink-0" />}
                {isExcluded && <X className="h-3.5 w-3.5 text-rose-400 shrink-0" />}
                <span className={isExcluded ? 'line-through decoration-rose-400/80' : ''}>
                  {mech}
                </span>
              </button>
            );
          })}
        </div>
      </div>

      {/* 4. Action & Effect Types (Draw, Add to Hand, Damage Target Types, Destroy, etc.) */}
      <div className="space-y-1.5 pt-2 border-t border-slate-800/80">
        <div className="flex items-center justify-between text-xs font-semibold text-emerald-300">
          <div className="flex items-center space-x-1.5">
            <Zap className="h-3.5 w-3.5" />
            <span>Effect Actions & Damage Targets</span>
          </div>
          <span className="text-[10px] text-slate-400 font-normal">
            Click to cycle: <strong className="text-emerald-400">Include</strong> / <strong className="text-rose-400">Exclude</strong> / Off
          </span>
        </div>
        <div className="flex flex-wrap gap-1.5">
          {EFFECT_OPTIONS.map((eff) => {
            const isIncluded = filters.effects.includes(eff.id);
            const isExcluded = (filters.excludedEffects || []).includes(eff.id);

            return (
              <button
                key={eff.id}
                type="button"
                onClick={() => toggleEffect(eff.id)}
                className={`flex items-center space-x-1.5 rounded-lg px-2.5 py-1 text-xs font-medium border transition-all ${
                  isIncluded
                    ? 'border-emerald-400 bg-emerald-950/90 text-emerald-200 shadow-[0_0_8px_rgba(52,211,153,0.35)] font-bold'
                    : isExcluded
                    ? 'border-rose-500/90 bg-rose-950/90 text-rose-300 shadow-[0_0_8px_rgba(244,63,94,0.35)] font-bold'
                    : 'border-slate-800 bg-slate-900/80 text-slate-300 hover:border-emerald-500/50 hover:text-white'
                }`}
                title={
                  isIncluded
                    ? `${eff.label}: Must INCLUDE (Click to Exclude)`
                    : isExcluded
                    ? `${eff.label}: EXCLUDED (Click to Turn Off)`
                    : `${eff.label}: Turn On (Click to Include)`
                }
              >
                {isIncluded && <Check className="h-3.5 w-3.5 text-emerald-400 shrink-0" />}
                {isExcluded && <X className="h-3.5 w-3.5 text-rose-400 shrink-0" />}
                <span className={isExcluded ? 'line-through decoration-rose-400/80' : ''}>
                  {eff.label}
                </span>
              </button>
            );
          })}
        </div>
      </div>

      {/* Bottom status */}
      {matchingCount !== undefined && (
        <div className="pt-2 border-t border-slate-800 flex items-center justify-between text-xs text-slate-400">
          <span>
            Matching cards with active filters:{' '}
            <strong className="text-cyan-300 font-bold">{matchingCount}</strong>
          </span>
          {activeCount > 0 && (
            <span className="text-slate-500 text-[11px]">
              Active filters include both required & excluded options
            </span>
          )}
        </div>
      )}
    </div>
  );
};
