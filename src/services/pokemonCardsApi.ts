import { fetchJson, isHttpStatusError } from './http/pokeApiClient';
import { mapWithConcurrency, throwIfAborted } from './utils/async';
import type { PokemonCard, PokemonCardAggregate, PokemonCardLanguage } from '../types/pokemonCards';

const TCGDEX_API = 'https://api.tcgdex.net/v2';
const CARDS_PAGE_SIZE = 100;
const CARD_DETAIL_CONCURRENCY = 6;
const CARD_IMAGE_QUALITY = 'low';
const CARD_IMAGE_EXTENSION = 'webp';

/**
 * Supported detail-page card languages in preferred fallback order.
 */
export const SUPPORTED_CARD_LANGUAGES: PokemonCardLanguage[] = ['de', 'en', 'ja'];

/**
 * Minimal list payload returned by the localized cards endpoint.
 */
interface TcgDexCardBrief {
  id: string;
}

/**
 * Localized card detail payload normalized for the detail-page gallery.
 */
interface TcgDexCardResponse {
  id: string;
  localId: string;
  name: string;
  image?: string | null;
  dexId?: number[];
  set: {
    id: string;
    name: string;
    logo?: string | null;
  };
  category?: string | null;
  rarity?: string | null;
}

/**
 * Loads all localized cards for one Pokemon and groups them by stable card id.
 *
 * @param dexId - National Pokédex id used for card lookup.
 * @param signal - Optional cancellation signal.
 * @returns Aggregated cards keyed by `card.id`.
 */
export async function fetchPokemonCards(
  dexId: number,
  signal?: AbortSignal,
): Promise<PokemonCardAggregate[]> {
  const perLanguageResults = await Promise.all(
    SUPPORTED_CARD_LANGUAGES.map(async (language) => ({
      language,
      cards: await fetchPokemonCardsForLanguage(dexId, language, signal),
    })),
  );

  return groupCardsById(perLanguageResults);
}

/**
 * Loads one localized card list for a single TCGdex language.
 *
 * @param dexId - National Pokédex id used for card lookup.
 * @param language - Requested TCGdex language.
 * @param signal - Optional cancellation signal.
 * @returns Normalized localized cards for that language.
 */
export async function fetchPokemonCardsForLanguage(
  dexId: number,
  language: PokemonCardLanguage,
  signal?: AbortSignal,
): Promise<PokemonCard[]> {
  const briefs = await fetchCardBriefsByDexId(dexId, language, signal);
  const cardResults = await mapWithConcurrency(
    briefs,
    CARD_DETAIL_CONCURRENCY,
    async (brief) => {
      try {
        return {
          card: await fetchPokemonCardByIdInLanguage(brief.id, language, signal),
          error: null as unknown,
        };
      } catch (error) {
        throwIfAborted(signal);
        return {
          card: null,
          error,
        };
      }
    },
    signal,
  );

  const cards = cardResults
    .map((result) => result.card)
    .filter((card): card is PokemonCard => card?.dexIds.includes(dexId) === true);

  if (cards.length > 0 || briefs.length === 0) {
    return cards;
  }

  const firstError = cardResults.find((result) => result.error !== null)?.error;
  if (firstError) {
    throw firstError instanceof Error
      ? firstError
      : new Error('TCGdex card detail request failed.');
  }

  return [];
}

/**
 * Fetches a concrete card id in one target language.
 *
 * @param cardId - Stable TCGdex card id.
 * @param language - Requested TCGdex language.
 * @param signal - Optional cancellation signal.
 * @returns Localized card or `null` when unavailable in that language.
 */
export async function fetchPokemonCardByIdInLanguage(
  cardId: string,
  language: PokemonCardLanguage,
  signal?: AbortSignal,
): Promise<PokemonCard | null> {
  try {
    const response = await fetchJson<TcgDexCardResponse>(
      `${TCGDEX_API}/${language}/cards/${cardId}`,
      signal,
    );
    return mapCardResponse(response, language);
  } catch (error) {
    if (isHttpStatusError(error, 404)) {
      return null;
    }

    throw error;
  }
}

/**
 * Fetches paginated card briefs for one Pokemon dex id in one TCG language.
 *
 * @param dexId - National Pokédex id for the card search.
 * @param language - Requested TCGdex language.
 * @param signal - Optional cancellation signal.
 * @returns All matching localized card briefs, in API order.
 */
async function fetchCardBriefsByDexId(
  dexId: number,
  language: PokemonCardLanguage,
  signal?: AbortSignal,
): Promise<TcgDexCardBrief[]> {
  const results: TcgDexCardBrief[] = [];
  let page = 1;

  for (;;) {
    throwIfAborted(signal);

    const url = new URL(`${TCGDEX_API}/${language}/cards`);
    url.searchParams.set('dexId', String(dexId));
    url.searchParams.set('pagination:page', String(page));
    url.searchParams.set('pagination:itemsPerPage', String(CARDS_PAGE_SIZE));

    const batch = await fetchJson<TcgDexCardBrief[]>(url.toString(), signal);
    results.push(...batch);

    if (batch.length < CARDS_PAGE_SIZE) {
      break;
    }

    page += 1;
  }

  return dedupeBriefs(results);
}

/**
 * Groups localized search results by stable card id.
 *
 * @param results - Localized card lists keyed by language.
 * @returns Aggregated cards with per-language variants.
 */
function groupCardsById(
  results: { language: PokemonCardLanguage; cards: PokemonCard[] }[],
): PokemonCardAggregate[] {
  const grouped = new Map<string, PokemonCardAggregate>();

  for (const { language, cards } of results) {
    for (const card of cards) {
      const existing = grouped.get(card.id) ?? {
        id: card.id,
        languages: {},
      };

      existing.languages[language] = card;
      grouped.set(card.id, existing);
    }
  }

  return [...grouped.values()];
}

/**
 * Removes duplicate brief entries while preserving the first seen order.
 *
 * @param briefs - Card brief payloads from the list endpoint.
 * @returns Unique brief list.
 */
function dedupeBriefs(briefs: TcgDexCardBrief[]): TcgDexCardBrief[] {
  const seen = new Set<string>();
  const unique: TcgDexCardBrief[] = [];

  for (const brief of briefs) {
    if (seen.has(brief.id)) {
      continue;
    }

    seen.add(brief.id);
    unique.push(brief);
  }

  return unique;
}

/**
 * Maps the raw TCGdex card payload to a UI-oriented model.
 *
 * @param card - Raw TCGdex response.
 * @param language - Requested TCGdex language.
 * @returns Normalized Pokemon card model.
 */
function mapCardResponse(card: TcgDexCardResponse, language: PokemonCardLanguage): PokemonCard {
  return {
    id: card.id,
    language,
    name: card.name,
    localId: card.localId,
    image: toCardImageUrl(card.image),
    dexIds: Array.isArray(card.dexId) ? card.dexId : [],
    set: {
      id: card.set.id,
      name: card.set.name,
      logo: card.set.logo ?? null,
    },
    category: card.category ?? null,
    rarity: card.rarity ?? null,
  };
}

/**
 * Expands a TCGdex card asset reference into a final web-friendly image URL.
 *
 * @param imageUrl - Raw asset reference returned by TCGdex.
 * @returns Final image URL with quality and extension, or `null` when unavailable.
 */
function toCardImageUrl(imageUrl?: string | null): string | null {
  if (!imageUrl) {
    return null;
  }

  return `${imageUrl}/${CARD_IMAGE_QUALITY}.${CARD_IMAGE_EXTENSION}`;
}
