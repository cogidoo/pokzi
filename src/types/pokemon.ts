/**
 * Localized Pokemon type used for UI labels.
 */
export interface PokemonType {
  name: string;
}

/**
 * Shape of a Pokemon search result rendered in the UI.
 */
export interface PokemonSearchResult {
  id: number;
  name: string;
  displayName: string;
  image: string | null;
  types: PokemonType[];
  evolutionStage: 'Basis' | 'Phase 1' | 'Phase 2';
}

/**
 * Evolution summary fields for one Pokemon detail page.
 */
export interface PokemonEvolutionItem {
  id: number;
  displayName: string;
  image: string | null;
}

/**
 * Evolution summary fields for one Pokemon detail page.
 */
export interface PokemonEvolutionSummary {
  stage: 'Basis' | 'Phase 1' | 'Phase 2';
  previous: PokemonEvolutionItem[];
  next: PokemonEvolutionItem[];
}

/**
 * Shape of a Pokemon detail payload rendered in the detail view.
 */
export interface PokemonDetail {
  id: number;
  name: string;
  displayName: string;
  image: string | null;
  types: PokemonType[];
  heightMeters: number;
  weightKilograms: number;
  category: string | null;
  flavorText: string | null;
  evolution: PokemonEvolutionSummary;
}
