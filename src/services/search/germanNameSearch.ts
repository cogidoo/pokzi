import { mapWithConcurrency } from '../utils/async';

/**
 * Shape of one normalized species index entry.
 */
export interface BaseSpeciesIndexItem {
  id: number;
  pokemonName: string;
}

/**
 * Indexed localized entry for German search matching.
 */
export interface GermanPokemonIndexItem {
  id: number;
  germanName: string;
  germanNameToleranceKey: string;
}

/**
 * Search ranking quality classification.
 */
export type SearchMatchQuality = 'exact' | 'partial' | 'tolerant';

/**
 * Ranked localized match returned by text-query search.
 */
export interface GermanPokemonMatch {
  item: GermanPokemonIndexItem;
  quality: SearchMatchQuality;
}

/**
 * Dependencies used by German-name search index.
 */
export interface GermanNameSearchDependencies {
  fetchSpeciesIndex: (signal?: AbortSignal) => Promise<BaseSpeciesIndexItem[]>;
  fetchGermanIndexItem: (
    species: BaseSpeciesIndexItem,
    signal?: AbortSignal,
  ) => Promise<GermanPokemonIndexItem | null>;
}

/**
 * Configuration for bounded German search behavior.
 */
export interface GermanNameSearchConfig {
  searchResultLimit: number;
  indexRequestConcurrency: number;
  indexScanBatchSize: number;
  maxBatchesAfterExactMatch: number;
}

/**
 * Stateful German name search index with incremental localization cache.
 */
export interface GermanNameSearchIndex {
  findGermanMatches: (
    toleranceQuery: string,
    signal?: AbortSignal,
  ) => Promise<GermanPokemonMatch[]>;
}

/**
 * Normalizes German text for tolerant umlaut and `ss` matching.
 *
 * @param value - Input text from query or index.
 * @returns Lowercased tolerance key with normalized variants.
 */
export function normalizeToleranceText(value: string): string {
  return value
    .trim()
    .toLowerCase()
    .replace(/ä/g, 'ae')
    .replace(/ö/g, 'oe')
    .replace(/ü/g, 'ue')
    .replace(/ß/g, 'ss');
}

/**
 * Normalizes user input for all search branches.
 *
 * @param query - Raw user query.
 * @returns Lowercased and trimmed query.
 */
export function normalizeQuery(query: string): string {
  return query.trim().toLowerCase();
}

/**
 * Creates a stateful German-name search index service.
 *
 * @param dependencies - Index loading dependencies.
 * @param config - Search tuning configuration.
 * @returns Search index service for ranked German matches.
 */
export function createGermanNameSearchIndex(
  dependencies: GermanNameSearchDependencies,
  config: GermanNameSearchConfig,
): GermanNameSearchIndex {
  let localizedScanCursor = 0;
  const germanIndexById = new Map<number, GermanPokemonIndexItem | null>();

  return {
    findGermanMatches: async (toleranceQuery, signal) => {
      const speciesIndex = await dependencies.fetchSpeciesIndex(signal);
      let exact: GermanPokemonIndexItem | null = null;
      const partial: GermanPokemonIndexItem[] = [];
      const seenPartialIds = new Set<number>();
      let batchesAfterExactMatch: number | null = null;

      for (const species of speciesIndex) {
        const cached = germanIndexById.get(species.id);
        if (cached === undefined || cached === null) {
          continue;
        }

        const hadExact = exact !== null;
        exact = pushStrongMatch(cached, toleranceQuery, exact, partial, seenPartialIds);
        if (!hadExact && exact !== null) {
          batchesAfterExactMatch = 0;
        }
      }

      while (
        localizedScanCursor < speciesIndex.length &&
        !shouldStopIndexScan(
          partial.length,
          batchesAfterExactMatch,
          config.searchResultLimit,
          config.maxBatchesAfterExactMatch,
        )
      ) {
        const batchStart = localizedScanCursor;
        const batch = speciesIndex.slice(batchStart, batchStart + config.indexScanBatchSize);
        const hadExactBeforeBatch = exact !== null;

        const localizedBatch = await mapWithConcurrency(
          batch,
          config.indexRequestConcurrency,
          (species) => dependencies.fetchGermanIndexItem(species, signal),
          signal,
        );

        for (const localizedItem of localizedBatch) {
          if (localizedItem) {
            germanIndexById.set(localizedItem.id, localizedItem);
            const hadExact = exact !== null;
            exact = pushStrongMatch(localizedItem, toleranceQuery, exact, partial, seenPartialIds);
            if (!hadExact && exact !== null) {
              batchesAfterExactMatch = 0;
            }
          }
        }

        for (const species of batch) {
          if (!germanIndexById.has(species.id)) {
            germanIndexById.set(species.id, null);
          }
        }

        localizedScanCursor = batchStart + batch.length;

        if (hadExactBeforeBatch && batchesAfterExactMatch !== null) {
          batchesAfterExactMatch += 1;
        }
      }

      if (exact || partial.length > 0) {
        const sortedPartial = partial
          .filter((item) => item.id !== exact?.id)
          .sort(sortByGermanName);
        return [...(exact ? [exact] : []), ...sortedPartial]
          .slice(0, config.searchResultLimit)
          .map((item) => ({
            item,
            quality: exact?.id === item.id ? ('exact' as const) : ('partial' as const),
          }));
      }

      const tolerant: { item: GermanPokemonIndexItem; distance: number }[] = [];
      for (const species of speciesIndex) {
        const item = germanIndexById.get(species.id);
        if (!item) {
          continue;
        }

        const maxDistance = maxAllowedEditDistance(item.germanNameToleranceKey);
        const distance = levenshteinWithinLimit(
          toleranceQuery,
          item.germanNameToleranceKey,
          maxDistance,
        );
        if (distance === null) {
          continue;
        }

        tolerant.push({ item, distance });
      }

      tolerant.sort((a, b) => {
        if (a.distance !== b.distance) {
          return a.distance - b.distance;
        }

        return sortByGermanName(a.item, b.item);
      });

      return tolerant
        .slice(0, config.searchResultLimit)
        .map(({ item }) => ({ item, quality: 'tolerant' as const }));
    },
  };
}

/**
 * Sorts index items alphabetically by German display name.
 *
 * @param a - First localized item.
 * @param b - Second localized item.
 * @returns Stable alphabetical ordering result.
 */
function sortByGermanName(a: GermanPokemonIndexItem, b: GermanPokemonIndexItem): number {
  return a.germanName.localeCompare(b.germanName, 'de-DE', { sensitivity: 'base' });
}

/**
 * Resolves tolerant distance threshold from candidate name length.
 *
 * @param value - Normalized candidate name.
 * @returns Max allowed edit distance.
 */
function maxAllowedEditDistance(value: string): number {
  if (value.length <= 5) {
    return 1;
  }

  return 2;
}

/**
 * Calculates Levenshtein edit distance and exits early above the limit.
 *
 * @param source - Normalized query text.
 * @param target - Normalized candidate text.
 * @param maxDistance - Maximum tolerated distance.
 * @returns Distance or `null` when the limit is exceeded.
 */
function levenshteinWithinLimit(
  source: string,
  target: string,
  maxDistance: number,
): number | null {
  const sourceLength = source.length;
  const targetLength = target.length;
  if (Math.abs(sourceLength - targetLength) > maxDistance) {
    return null;
  }

  const previous = Array.from({ length: targetLength + 1 }, (_, index) => index);

  for (let row = 1; row <= sourceLength; row += 1) {
    const current = [row];
    let rowMin = current[0];

    for (let col = 1; col <= targetLength; col += 1) {
      const substitutionCost = source[row - 1] === target[col - 1] ? 0 : 1;
      const value = Math.min(
        previous[col] + 1,
        current[col - 1] + 1,
        previous[col - 1] + substitutionCost,
      );
      current[col] = value;
      rowMin = Math.min(rowMin, value);
    }

    if (rowMin > maxDistance) {
      return null;
    }

    for (let col = 0; col <= targetLength; col += 1) {
      previous[col] = current[col];
    }
  }

  return previous[targetLength] <= maxDistance ? previous[targetLength] : null;
}

/**
 * Places one localized entry into exact and partial buckets.
 *
 * @param item - Candidate localized item.
 * @param toleranceQuery - Normalized tolerant query text.
 * @param exact - Current exact match.
 * @param partial - Mutable partial match list.
 * @param seenPartialIds - Set used to avoid duplicate partial entries.
 * @returns Updated exact match value.
 */
function pushStrongMatch(
  item: GermanPokemonIndexItem,
  toleranceQuery: string,
  exact: GermanPokemonIndexItem | null,
  partial: GermanPokemonIndexItem[],
  seenPartialIds: Set<number>,
): GermanPokemonIndexItem | null {
  if (item.germanNameToleranceKey === toleranceQuery) {
    return item;
  }

  if (!item.germanNameToleranceKey.includes(toleranceQuery)) {
    return exact;
  }

  if (!seenPartialIds.has(item.id)) {
    partial.push(item);
    seenPartialIds.add(item.id);
  }

  return exact;
}

/**
 * Determines whether localized scanning can stop early.
 *
 * @param fuzzyCount - Current count of fuzzy matches.
 * @param batchesAfterExactMatch - Number of batches scanned after finding exact match.
 * @param searchResultLimit - Max number of results.
 * @param maxBatchesAfterExactMatch - Batches scanned after exact match was found.
 * @returns True when enough matches were collected.
 */
function shouldStopIndexScan(
  fuzzyCount: number,
  batchesAfterExactMatch: number | null,
  searchResultLimit: number,
  maxBatchesAfterExactMatch: number,
): boolean {
  if (batchesAfterExactMatch === null) {
    return false;
  }

  if (fuzzyCount >= searchResultLimit - 1) {
    return true;
  }

  return batchesAfterExactMatch >= maxBatchesAfterExactMatch;
}
