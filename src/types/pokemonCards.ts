/**
 * Supported TCGdex locales used by the cards feature.
 */
export type PokemonCardLanguage = 'de' | 'en' | 'ja';

/**
 * Minimal set metadata needed by the Pokemon cards gallery.
 */
export interface PokemonCardSet {
  id: string;
  name: string;
  logo: string | null;
}

/**
 * Normalized Pokemon TCG card used by the detail-page cards feature.
 */
export interface PokemonCard {
  id: string;
  language?: PokemonCardLanguage;
  name: string;
  localId: string;
  image: string | null;
  dexIds: number[];
  set: PokemonCardSet;
  category: string | null;
  rarity: string | null;
}

/**
 * One TCG card grouped across all loaded card languages by stable `card.id`.
 */
export interface PokemonCardAggregate {
  id: string;
  languages: Partial<Record<PokemonCardLanguage, PokemonCard>>;
}

/**
 * Localized card variant data used inside the fullscreen viewer.
 */
export interface PokemonCardTileVariant {
  language: PokemonCardLanguage;
  name: string;
  setName: string;
  number: string;
  imageUrl: string | null;
  imageLanguage: PokemonCardLanguage | null;
}

/**
 * Compact card view model used by gallery and viewer UI components.
 */
export interface PokemonCardTileData {
  id: string;
  language?: PokemonCardLanguage;
  availableLanguages?: PokemonCardLanguage[];
  imageLanguage?: PokemonCardLanguage | null;
  variants?: Partial<Record<PokemonCardLanguage, PokemonCardTileVariant>>;
  name: string;
  setName: string;
  number: string;
  imageUrl: string | null;
}
