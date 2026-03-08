import type {
  PokemonDetail,
  PokemonEvolutionBranchGroup,
  PokemonEvolutionTile,
  PokemonSearchResult,
  SearchMatchQuality,
} from '../types/pokemon';
import { GERMAN_SPECIES_NAME_BY_ID } from '../data/pokemonGermanSpeciesIndex';
import {
  createGermanNameSearchIndex,
  normalizeQuery,
  normalizeToleranceText,
  type BaseSpeciesIndexItem,
  type GermanPokemonIndexItem,
} from './search/germanNameSearch';
import {
  SearchPokemonError,
  fetchJson,
  isAbortError,
  isHttpStatusError,
  isSearchPokemonError,
} from './http/pokeApiClient';
import { mapWithConcurrency } from './utils/async';

const POKE_API = 'https://pokeapi.co/api/v2';
const SEARCH_RESULT_LIMIT = 20;
const INDEX_REQUEST_CONCURRENCY = 8;
const INDEX_SCAN_BATCH_SIZE = 40;
const MAX_BATCHES_AFTER_EXACT_MATCH = 2;
const DETAIL_REQUEST_CONCURRENCY = 4;

/**
 * Raw species entry returned by the species index endpoint.
 */
interface PokemonIndexItem {
  name: string;
  url: string;
}

/**
 * Subset of the PokeAPI pokemon response used by this app.
 */
interface PokemonResponse {
  id: number;
  name: string;
  height: number;
  weight: number;
  stats?: {
    base_stat: number;
    stat: { name: string };
  }[];
  sprites?: {
    other?: {
      'official-artwork'?: {
        front_default?: string | null;
      };
    };
    front_default?: string | null;
  };
  types: { type: { name: string } }[];
}

/**
 * Subset of the PokeAPI species response used for localization and evolution.
 */
interface PokemonSpeciesResponse {
  names: {
    language: { name: string };
    name: string;
  }[];
  genera?: {
    genus: string;
    language: { name: string };
  }[];
  flavor_text_entries?: {
    flavor_text: string;
    language: { name: string };
  }[];
  evolution_chain?: {
    url: string;
  };
}

/**
 * Node inside a recursive evolution-chain tree.
 */
interface EvolutionChainNode {
  species: {
    name: string;
    url?: string;
  };
  evolves_to: EvolutionChainNode[];
}

/**
 * PokeAPI evolution-chain payload wrapper.
 */
interface EvolutionChainResponse {
  chain: EvolutionChainNode;
}

let speciesIndexPromise: Promise<BaseSpeciesIndexItem[]> | null = null;
let speciesIndexCache: BaseSpeciesIndexItem[] | null = null;
const evolutionItemCache = new Map<number, PokemonEvolutionTile | null>();
const detailCache = new Map<number, PokemonDetail>();

const TYPE_NAME_DE: Record<string, string> = {
  normal: 'Normal',
  fire: 'Feuer',
  water: 'Wasser',
  electric: 'Elektro',
  grass: 'Pflanze',
  ice: 'Eis',
  fighting: 'Kampf',
  poison: 'Gift',
  ground: 'Boden',
  flying: 'Flug',
  psychic: 'Psycho',
  bug: 'Käfer',
  rock: 'Gestein',
  ghost: 'Geist',
  dragon: 'Drache',
  dark: 'Unlicht',
  steel: 'Stahl',
  fairy: 'Fee',
};

/**
 * Localized evolution-stage labels used in UI view models.
 */
type PokemonEvolutionStage = 'Basis' | 'Phase 1' | 'Phase 2';

/**
 * Builds an empty evolution summary used as a safe UI fallback.
 *
 * @returns Evolution summary without visible relations.
 */
function emptyEvolutionSummary(): {
  stage: PokemonEvolutionStage;
  sharedPath: PokemonEvolutionTile[];
  branchGroups: PokemonEvolutionBranchGroup[];
} {
  return {
    stage: 'Basis',
    sharedPath: [],
    branchGroups: [],
  };
}

export { SearchPokemonError, isSearchPokemonError };

/**
 * Loads a Pokemon by id or canonical name and applies German display metadata.
 *
 * @param idOrName - Pokemon id or API name.
 * @param signal - Optional cancellation signal.
 * @param germanName - Localized display name to apply.
 * @param matchQuality - Search ranking class used by tolerant-hint UI behavior.
 * @returns Enriched result or `null` on 404.
 */
async function fetchPokemonByIdOrName(
  idOrName: string,
  signal: AbortSignal | undefined,
  germanName: string,
  matchQuality: SearchMatchQuality,
): Promise<PokemonSearchResult | null> {
  try {
    const data = await fetchJson<PokemonResponse>(`${POKE_API}/pokemon/${idOrName}`, signal);
    const species = await fetchPokemonSpecies(data.id, signal);
    const evolutionStage = await resolveEvolutionStage(data.name, species, signal);
    return mapPokemonResponse(data, germanName, evolutionStage, matchQuality);
  } catch (error) {
    if (isHttpStatusError(error) && error.status === 404) {
      return null;
    }

    throw error;
  }
}

/**
 * Loads one Pokemon by id for numeric-search mode.
 *
 * @param id - Pokemon id as string.
 * @param signal - Optional cancellation signal.
 * @returns Enriched result or `null` on 404.
 */
async function fetchPokemonById(
  id: string,
  signal?: AbortSignal,
): Promise<PokemonSearchResult | null> {
  try {
    const data = await fetchJson<PokemonResponse>(`${POKE_API}/pokemon/${id}`, signal);
    const species = await fetchPokemonSpecies(data.id, signal);
    const germanName = getGermanNameFromSpecies(species);
    const evolutionStage = await resolveEvolutionStage(data.name, species, signal);
    return mapPokemonResponse(data, germanName ?? data.name, evolutionStage, 'exact');
  } catch (error) {
    if (isHttpStatusError(error) && error.status === 404) {
      return null;
    }

    throw error;
  }
}

/**
 * Fetches species metadata for localization and evolution lookup.
 *
 * @param idOrName - Species id or name.
 * @param signal - Optional cancellation signal.
 * @returns Species response or `null` on 404.
 */
async function fetchPokemonSpecies(
  idOrName: number | string,
  signal?: AbortSignal,
): Promise<PokemonSpeciesResponse | null> {
  try {
    return await fetchJson<PokemonSpeciesResponse>(
      `${POKE_API}/pokemon-species/${String(idOrName)}`,
      signal,
    );
  } catch (error) {
    if (isHttpStatusError(error) && error.status === 404) {
      return null;
    }

    throw error;
  }
}

/**
 * Resolves the German display name from species localization data.
 *
 * @param species - Optional species payload.
 * @returns German name or `null` when missing.
 */
function getGermanNameFromSpecies(species: PokemonSpeciesResponse | null): string | null {
  if (!species) {
    return null;
  }

  const german = species.names.find((entry) => entry.language.name === 'de');
  return german?.name ?? null;
}

/**
 * Extracts a numeric species id from a species resource URL.
 *
 * @param url - Species URL from the index response.
 * @returns Parsed species id or `null` on malformed input.
 */
function extractIdFromSpeciesUrl(url: string): number | null {
  const match = /\/pokemon-species\/(\d+)\/?$/.exec(url);
  return match ? Number(match[1]) : null;
}

/**
 * Extracts a species id from URLs used inside evolution-chain nodes.
 *
 * @param url - Species URL from evolution-chain payload.
 * @returns Parsed species id or `null` on malformed input.
 */
function extractIdFromPokemonSpeciesUrl(url: string | undefined): number | null {
  if (!url) {
    return null;
  }

  const match = /\/pokemon-species\/(\d+)\/?$/.exec(url);
  return match ? Number(match[1]) : null;
}

/**
 * Extracts the evolution-chain id from a chain resource URL.
 *
 * @param url - Evolution-chain URL from species data.
 * @returns Parsed chain id or `null` on malformed input.
 */
function extractIdFromEvolutionChainUrl(url: string): number | null {
  const match = /\/evolution-chain\/(\d+)\/?$/.exec(url);
  return match ? Number(match[1]) : null;
}

/**
 * Normalizes flavor text for readable one-paragraph output.
 *
 * @param text - Raw flavor text from PokeAPI species payload.
 * @returns Trimmed one-line text.
 */
function cleanFlavorText(text: string): string {
  return text
    .replace(/[\f\n\r\t]+/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

/**
 * Gets one German species category/genus label when available.
 *
 * @param species - Optional species payload.
 * @returns German genus label or `null`.
 */
function getGermanCategory(species: PokemonSpeciesResponse | null): string | null {
  if (!species?.genera) {
    return null;
  }

  const german = species.genera.find((entry) => entry.language.name === 'de');
  return german ? german.genus.trim() : null;
}

/**
 * Gets one cleaned German flavor-text entry when available.
 *
 * @param species - Optional species payload.
 * @returns Cleaned German flavor text or `null`.
 */
function getGermanFlavorText(species: PokemonSpeciesResponse | null): string | null {
  if (!species?.flavor_text_entries) {
    return null;
  }

  const entry = species.flavor_text_entries.find((item) => item.language.name === 'de');
  if (!entry) {
    return null;
  }

  const cleaned = cleanFlavorText(entry.flavor_text);
  return cleaned || null;
}

/**
 * Reads the base HP stat from a Pokemon payload.
 *
 * @param pokemon - Pokemon API payload.
 * @returns Base HP or `null` when unavailable.
 */
function getBaseHpStat(pokemon: PokemonResponse): number | null {
  const hp = pokemon.stats?.find((entry) => entry.stat.name === 'hp');
  if (!hp) {
    return null;
  }

  return Number.isFinite(hp.base_stat) ? hp.base_stat : null;
}

/**
 * Traverses the evolution tree and returns depth of a target Pokemon.
 *
 * @param node - Current evolution tree node.
 * @param pokemonName - Canonical Pokemon name to find.
 * @param depth - Current recursion depth.
 * @returns Depth in chain or `null` when not found.
 */
function findDepthInEvolutionChain(
  node: EvolutionChainNode,
  pokemonName: string,
  depth = 0,
): number | null {
  if (node.species.name === pokemonName) {
    return depth;
  }

  for (const next of node.evolves_to) {
    const foundDepth = findDepthInEvolutionChain(next, pokemonName, depth + 1);
    if (foundDepth !== null) {
      return foundDepth;
    }
  }

  return null;
}

/**
 * Finds the path from root to the target Pokemon in evolution chain.
 *
 * @param node - Current evolution tree node.
 * @param pokemonName - Canonical Pokemon name to find.
 * @returns Ordered path from root to target node, or `null` when missing.
 */
function findEvolutionPath(
  node: EvolutionChainNode,
  pokemonName: string,
): EvolutionChainNode[] | null {
  if (node.species.name === pokemonName) {
    return [node];
  }

  for (const next of node.evolves_to) {
    const path = findEvolutionPath(next, pokemonName);
    if (path) {
      return [node, ...path];
    }
  }

  return null;
}

/**
 * Collects all ordered branch paths from one node to every reachable leaf.
 *
 * @param startNode - Start node of one later evolution path.
 * @returns Ordered node paths from nearest node to deepest leaf.
 */
function collectBranchPaths(startNode: EvolutionChainNode): EvolutionChainNode[][] {
  if (startNode.evolves_to.length === 0) {
    return [[startNode]];
  }

  return startNode.evolves_to.flatMap((nextNode) =>
    collectBranchPaths(nextNode).map((childPath) => [startNode, ...childPath]),
  );
}

/**
 * Converts numeric evolution depth to the UI stage label.
 *
 * @param depth - Depth from the evolution-chain root.
 * @returns Stage label used by result cards.
 */
function mapDepthToEvolutionStage(depth: number): PokemonEvolutionStage {
  if (depth <= 0) {
    return 'Basis';
  }

  if (depth === 1) {
    return 'Phase 1';
  }

  return 'Phase 2';
}

/**
 * Resolves the evolution stage label for a Pokemon.
 *
 * @param pokemonName - Canonical Pokemon name.
 * @param species - Optional species payload.
 * @param signal - Optional cancellation signal.
 * @returns Stage label; defaults to `Basis` when unresolved.
 */
async function resolveEvolutionStage(
  pokemonName: string,
  species: PokemonSpeciesResponse | null,
  signal?: AbortSignal,
): Promise<PokemonEvolutionStage> {
  const chainUrl = species?.evolution_chain?.url;
  if (!chainUrl) {
    return 'Basis';
  }

  const evolutionChainId = extractIdFromEvolutionChainUrl(chainUrl);
  if (!evolutionChainId) {
    return 'Basis';
  }

  try {
    const chain = await fetchJson<EvolutionChainResponse>(
      `${POKE_API}/evolution-chain/${String(evolutionChainId)}`,
      signal,
    );
    const depth = findDepthInEvolutionChain(chain.chain, pokemonName);
    if (depth === null) {
      return 'Basis';
    }

    return mapDepthToEvolutionStage(depth);
  } catch (error) {
    if (isHttpStatusError(error) && error.status === 404) {
      return 'Basis';
    }

    throw error;
  }
}

/**
 * Loads an evolution item with localized display name and artwork.
 *
 * @param node - Evolution node containing species metadata.
 * @param signal - Optional cancellation signal.
 * @returns UI-ready evolution item or `null` when id cannot be resolved.
 */
async function resolveEvolutionItem(
  node: EvolutionChainNode,
  signal?: AbortSignal,
): Promise<PokemonEvolutionTile | null> {
  const speciesId = extractIdFromPokemonSpeciesUrl(node.species.url);
  if (!speciesId) {
    return null;
  }

  const cached = evolutionItemCache.get(speciesId);
  if (cached !== undefined) {
    return cached;
  }

  const [species, pokemon] = await Promise.all([
    fetchPokemonSpecies(speciesId, signal),
    fetchJson<PokemonResponse>(`${POKE_API}/pokemon/${node.species.name}`, signal).catch(
      (error: unknown) => {
        if (isHttpStatusError(error, 404)) {
          return null;
        }

        throw error;
      },
    ),
  ]);

  const displayName = getGermanNameFromSpecies(species) ?? node.species.name;
  const image =
    pokemon?.sprites?.other?.['official-artwork']?.front_default ??
    pokemon?.sprites?.front_default ??
    null;
  const baseHp = pokemon ? getBaseHpStat(pokemon) : null;

  const item = {
    id: speciesId,
    displayName,
    image,
    ...(baseHp !== null ? { baseHp } : {}),
    types: (pokemon?.types ?? [])
      .map((entry) => ({ name: TYPE_NAME_DE[entry.type.name] ?? entry.type.name }))
      .slice(0, 2),
  };
  evolutionItemCache.set(speciesId, item);
  return item;
}

/**
 * Builds later evolution branch groups in source-chain order.
 *
 * @param currentNode - Current Pokemon node from the resolved path.
 * @param originId - Stable id of the currently open detail Pokemon.
 * @param signal - Optional cancellation signal.
 * @returns Ordered branch groups with items from nearest to deeper stages.
 */
async function resolveBranchGroups(
  currentNode: EvolutionChainNode,
  originId: number,
  signal?: AbortSignal,
): Promise<PokemonEvolutionBranchGroup[]> {
  const allBranchPaths = currentNode.evolves_to.flatMap((branchRoot) =>
    collectBranchPaths(branchRoot),
  );
  const groups = await mapWithConcurrency(
    allBranchPaths,
    DETAIL_REQUEST_CONCURRENCY,
    async (branchPath) => {
      const items = (
        await mapWithConcurrency(branchPath, DETAIL_REQUEST_CONCURRENCY, (node) =>
          resolveEvolutionItem(node, signal),
        )
      ).filter((item): item is PokemonEvolutionTile => item !== null);

      if (items.length === 0) {
        return null;
      }

      return {
        originId,
        items,
      } satisfies PokemonEvolutionBranchGroup;
    },
  );

  return groups.filter((group): group is PokemonEvolutionBranchGroup => group !== null);
}

/**
 * Resolves stage and visible chain neighbors for the evolution summary section.
 *
 * @param pokemonName - Canonical Pokemon name.
 * @param species - Optional species payload.
 * @param currentPokemonId - Stable detail id used as branch-group origin.
 * @param signal - Optional cancellation signal.
 * @returns Summary fields for detail UI.
 */
async function resolveEvolutionSummary(
  pokemonName: string,
  species: PokemonSpeciesResponse | null,
  currentPokemonId: number,
  signal?: AbortSignal,
): Promise<{
  stage: PokemonEvolutionStage;
  sharedPath: PokemonEvolutionTile[];
  branchGroups: PokemonEvolutionBranchGroup[];
}> {
  const chainUrl = species?.evolution_chain?.url;
  if (!chainUrl) {
    return emptyEvolutionSummary();
  }

  const evolutionChainId = extractIdFromEvolutionChainUrl(chainUrl);
  if (!evolutionChainId) {
    return emptyEvolutionSummary();
  }

  try {
    const chain = await fetchJson<EvolutionChainResponse>(
      `${POKE_API}/evolution-chain/${String(evolutionChainId)}`,
      signal,
    );
    const path = findEvolutionPath(chain.chain, pokemonName);
    if (!path) {
      return emptyEvolutionSummary();
    }

    const currentNode = path[path.length - 1];
    const sharedPath = (
      await mapWithConcurrency(path, DETAIL_REQUEST_CONCURRENCY, (node) =>
        resolveEvolutionItem(node, signal),
      )
    ).filter((item): item is PokemonEvolutionTile => item !== null);
    const branchGroups = await resolveBranchGroups(currentNode, currentPokemonId, signal);

    return {
      stage: mapDepthToEvolutionStage(path.length - 1),
      sharedPath,
      branchGroups,
    };
  } catch (error) {
    if (isHttpStatusError(error, 404)) {
      return emptyEvolutionSummary();
    }

    throw error;
  }
}

/**
 * Loads and normalizes one German index entry from a species item.
 *
 * @param species - Base species entry from index.
 * @returns Localized index item or `null` if no German translation exists.
 */
function fetchGermanIndexItem(
  species: BaseSpeciesIndexItem,
): Promise<GermanPokemonIndexItem | null> {
  const germanName = GERMAN_SPECIES_NAME_BY_ID[species.id];
  if (!germanName) {
    return Promise.resolve(null);
  }

  return Promise.resolve({
    id: species.id,
    germanName,
    germanNameToleranceKey: normalizeToleranceText(germanName),
  });
}

/**
 * Maps API response fields to the UI search-result shape.
 *
 * @param data - Pokemon API payload.
 * @param germanName - Localized display name.
 * @param evolutionStage - Localized stage label.
 * @param matchQuality - Search ranking class used by tolerant-hint UI behavior.
 * @returns UI-ready search result.
 */
function mapPokemonResponse(
  data: PokemonResponse,
  germanName: string,
  evolutionStage: PokemonEvolutionStage,
  matchQuality: SearchMatchQuality,
): PokemonSearchResult {
  return {
    id: data.id,
    name: data.name,
    displayName: germanName,
    image:
      data.sprites?.other?.['official-artwork']?.front_default ??
      data.sprites?.front_default ??
      null,
    types: data.types.map((entry) => ({ name: TYPE_NAME_DE[entry.type.name] ?? entry.type.name })),
    evolutionStage,
    matchQuality,
  };
}

/**
 * Fetches and memoizes the complete species index.
 *
 * @param signal - Optional cancellation signal.
 * @returns Cached or freshly loaded species index.
 */
async function fetchSpeciesIndex(signal?: AbortSignal): Promise<BaseSpeciesIndexItem[]> {
  if (speciesIndexCache) {
    return speciesIndexCache;
  }

  speciesIndexPromise ??= fetchJson<{ results: PokemonIndexItem[] }>(
    `${POKE_API}/pokemon-species?limit=1400`,
    signal,
  )
    .then((payload) => {
      const mapped = payload.results
        .map((species) => {
          const id = extractIdFromSpeciesUrl(species.url);
          if (!id) {
            return null;
          }

          return {
            id,
            pokemonName: species.name,
          } satisfies BaseSpeciesIndexItem;
        })
        .filter((item): item is BaseSpeciesIndexItem => item !== null);

      speciesIndexCache = mapped;
      return mapped;
    })
    .catch((error: unknown) => {
      speciesIndexPromise = null;
      throw error;
    });

  return speciesIndexPromise;
}

const germanNameSearchIndex = createGermanNameSearchIndex(
  {
    fetchSpeciesIndex,
    fetchGermanIndexItem,
  },
  {
    searchResultLimit: SEARCH_RESULT_LIMIT,
    indexRequestConcurrency: INDEX_REQUEST_CONCURRENCY,
    indexScanBatchSize: INDEX_SCAN_BATCH_SIZE,
    maxBatchesAfterExactMatch: MAX_BATCHES_AFTER_EXACT_MATCH,
  },
);

/**
 * Loads one Pokemon detail payload for the dedicated detail view.
 *
 * @param id - Numeric Pokemon id from route.
 * @param signal - Optional cancellation signal.
 * @returns Localized detail payload or `null` on 404.
 */
export async function fetchPokemonDetail(
  id: number,
  signal?: AbortSignal,
): Promise<PokemonDetail | null> {
  const cached = detailCache.get(id);
  if (cached) {
    return cached;
  }

  try {
    const data = await fetchJson<PokemonResponse>(`${POKE_API}/pokemon/${String(id)}`, signal);
    const species = await fetchPokemonSpecies(data.id, signal);
    let shouldCacheDetail = true;
    let evolution = emptyEvolutionSummary();
    try {
      evolution = await resolveEvolutionSummary(data.name, species, data.id, signal);
    } catch (error) {
      if (isAbortError(error) && signal?.aborted) {
        throw error;
      }

      shouldCacheDetail = false;
    }
    const germanName = getGermanNameFromSpecies(species) ?? data.name;

    const detail = {
      id: data.id,
      name: data.name,
      displayName: germanName,
      image:
        data.sprites?.other?.['official-artwork']?.front_default ??
        data.sprites?.front_default ??
        null,
      types: data.types.map((entry) => ({
        name: TYPE_NAME_DE[entry.type.name] ?? entry.type.name,
      })),
      baseHp: getBaseHpStat(data),
      heightMeters: data.height / 10,
      weightKilograms: data.weight / 10,
      category: getGermanCategory(species),
      flavorText: getGermanFlavorText(species),
      evolution,
    };

    if (shouldCacheDetail) {
      detailCache.set(id, detail);
    }

    return detail;
  } catch (error) {
    if (isHttpStatusError(error, 404)) {
      return null;
    }

    throw error;
  }
}

/**
 * Searches Pokemon by numeric id or German name.
 *
 * @param query - Raw query from the UI.
 * @param signal - Optional cancellation signal.
 * @returns Localized list of Pokemon search results.
 */
export async function searchPokemon(
  query: string,
  signal?: AbortSignal,
): Promise<PokemonSearchResult[]> {
  const normalized = normalizeQuery(query);
  const toleranceQuery = normalizeToleranceText(query);
  if (!normalized) {
    return [];
  }

  if (/^\d+$/.test(normalized)) {
    const one = await fetchPokemonById(normalized, signal);
    return one ? [one] : [];
  }

  const combined = await germanNameSearchIndex.findGermanMatches(toleranceQuery, signal);
  if (combined.length === 0) {
    return [];
  }

  const details = await mapWithConcurrency(
    combined,
    DETAIL_REQUEST_CONCURRENCY,
    (match) =>
      fetchPokemonByIdOrName(String(match.item.id), signal, match.item.germanName, match.quality),
    signal,
  );

  return details.filter((entry): entry is PokemonSearchResult => Boolean(entry));
}
