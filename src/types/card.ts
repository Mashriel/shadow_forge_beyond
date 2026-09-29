export enum CardBooleanRaw {
  true = '1',
  false = '0',
}

export enum CardColorRaw {
  abyss = 'Abysscraft',
  dragon = 'Dragoncraft',
  forest = 'Forestcraft',
  haven = 'Havencraft',
  neutral = 'Neutral',
  portal = 'Portalcraft',
  rune = 'Runecraft',
  sword = 'Swordcraft',
}

export enum CardSetIdRaw {
  basic = '10000',
  legendsRise = '10001',
  basicToken = '90000',
}

export enum CardSetNameRaw {
  basic = 'Basic',
  legendsRise = 'Legends Rise',
  basicToken = 'Tokens',
}

export enum CardRarityRaw {
  bronze = '1',
  silver = '2',
  gold = '3',
  rainbow = '4',
}

export enum CardTribeRaw {
  Artifact = 'Artifact',
  Mysteria = 'Mysteria',
  Shikigami = 'Shikigami',
  Luminous = 'Luminous',
  Levin = 'Levin',
  Puppetry = 'Puppetry',
  Anathema = 'Anathema',
  Golem = 'Golem',
  Departed = 'Departed',
  Officer = 'Officer',
  EarthSigil = 'Earth Sigil',
  Pixie = 'Pixie',
  Marine = 'Marine',
}

// '4' is equal to 'spell card' in-game
// 'spell' is an amulet in-game which doesn't have a countdown (or has abilities to be engaged)
// 'amulet' is an amulet in-game, which has a countdown
export enum CardTypeRaw {
  four = '4',
  amulet = 'Amulet',
  follower = 'Follower',
  spell = 'Spell',
}

export interface CardStyleInfo {
  cv: string;
  evo: boolean;
  name: string;
  nonevo: boolean;
  name_ruby: string;
  skill_text: string;
  illustrator: string;
  image_index: number;
  flavour_text: string;
  evo_flavour_text: string;
}

export interface CardQuestionRaw {
  answer: string;
  question: string;
}

export interface CardInfoRaw {
  id: string;
  slug: string;
  name: string;
  evo: CardBooleanRaw | string;
  skill_text: string;
  flavour_text: string;
  class: '0' | '1' | '2' | '3' | '4' | '5' | '6' | '7' | string;
  color: CardColorRaw | string;
  cv: string;
  evo_skill_text: string | null;
  evo_flavour_text: string | null;
  type: CardTypeRaw | string;
  cost: '0' | '1' | '2' | '3' | '4' | '5' | '6' | '7' | '8' | '9' | '10' | '18' | string;
  atk: string;
  life: string;
  rarity: CardRarityRaw | string;
  tribes: CardTribeRaw[] | string[];
  setId: CardSetIdRaw | string;
  set_name: CardSetNameRaw | string;
  illustrator: string;
  is_token: CardBooleanRaw | string;
  is_include_rotation: CardBooleanRaw | string;
  style_card_list: CardStyleInfo[] | null;
  questions: CardQuestionRaw[];
  related_cards: number[];
  use_red_ether: string | null;
  use_red_ether_foil: string | null;
  get_red_ether: string | null;
  get_red_ether_foil: string | null;
  price: string | null;
  foilPrice: string | null;
  deltaPrice: string | null;
  deltaFoilPrice: string | null;
  delta7dPrice: string | null;
  delta7dPriceFoil: string | null;
  image: string;
  image_back: string | null;
}

// Normalized application types:
export type DeckFormat = 'Rotation' | 'Unlimited' | 'Simplified';

export type CardRarity = '1' | '2' | '3' | '4'; // 1: Bronze, 2: Silver, 3: Gold, 4: Legendary

export type CardType = 'Follower' | 'Spell' | 'Amulet';

export type ClassName =
  | 'Forestcraft'
  | 'Swordcraft'
  | 'Runecraft'
  | 'Dragoncraft'
  | 'Abysscraft'
  | 'Havencraft'
  | 'Portalcraft'
  | 'Neutral';

export interface Card {
  id: string;
  slug: string;
  name: string;
  hasEvo: boolean;
  skillText: string;
  flavorText: string;
  classId: string;
  className: ClassName;
  cv: string;
  evoSkillText: string;
  evoFlavorText: string;
  type: CardType;
  subType?: 'Countdown' | 'Continuous' | null;
  cost: number;
  atk: number;
  life: number;
  rarity: 1 | 2 | 3 | 4;
  rarityName: 'Bronze' | 'Silver' | 'Gold' | 'Legendary';
  tribes: string[];
  keywords: string[];
  setId: string;
  setName: string;
  illustrator: string;
  isToken: boolean;
  isRotation: boolean;
  questions: CardQuestionRaw[];
  relatedCards: string[];
  useRedEther: number;
  getRedEther: number;
  image: string;
  imageBack: string | null;
}

export interface Deck {
  id: string;
  version: number;
  name: string;
  class: ClassName;
  format: DeckFormat;
  cards: Record<string, number>; // cardId -> quantity (1 to 3)
  tags: string[];
  rotationSetsAtCreation?: string[]; // Set IDs legal in Rotation when this deck was saved/exported
  createdAt: string;
  updatedAt: string;
}

export interface CollectionItem {
  cardId: string;
  regularCount: number; // 0..3
  foilCount: number; // 0..3
  updatedAt: string;
}

export interface CraftPlanItem {
  cardId: string;
  desiredCount: number; // 1..3
  priority: 'high' | 'medium' | 'low';
  createdAt: string;
  notes?: string;
}
