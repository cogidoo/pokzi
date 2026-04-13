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
  name: string;
  localId: string;
  image: string | null;
  dexIds: number[];
  set: PokemonCardSet;
  category: string | null;
  rarity: string | null;
}

/**
 * Compact card view model used by gallery and viewer UI components.
 */
export interface PokemonCardTileData {
  id: string;
  name: string;
  setName: string;
  number: string;
  imageUrl: string | null;
}
