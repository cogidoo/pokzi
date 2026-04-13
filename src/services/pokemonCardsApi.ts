import { mapWithConcurrency, throwIfAborted } from './utils/async';
import { fetchJson, isHttpStatusError } from './http/pokeApiClient';
import type { PokemonCard } from '../types/pokemonCards';

const TCGDEX_API = 'https://api.tcgdex.net/v2/de';
const CARDS_PAGE_SIZE = 100;
const CARD_DETAIL_CONCURRENCY = 6;
const CARD_IMAGE_QUALITY = 'low';
const CARD_IMAGE_EXTENSION = 'webp';

/**
 * Brief card payload returned by the list endpoint.
 */
interface TcgDexCardBrief {
  id: string;
}

/**
 * Full TCGdex card payload used for the normalized gallery model.
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
 * Fetches German Pokemon cards for one Pokemon from TCGdex.
 *
 * @param dexId - National Pokédex id used to verify the resolved cards.
 * @param germanName - German Pokemon display name used for the localized card lookup.
 * @param signal - Optional cancellation signal.
 * @returns Normalized card list for the Pokemon detail page.
 */
export async function fetchPokemonCards(
  dexId: number,
  germanName: string,
  signal?: AbortSignal,
): Promise<PokemonCard[]> {
  const briefs = await fetchCardBriefsByGermanName(germanName, signal);
  const cardResults = await mapWithConcurrency(
    briefs,
    CARD_DETAIL_CONCURRENCY,
    async (brief) => {
      try {
        return {
          card: await fetchPokemonCardById(brief.id, signal),
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

  if (cards.length > 0) {
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
 * Fetches paginated German card briefs for one German Pokemon name.
 *
 * @param germanName - German Pokemon display name used by the localized card search.
 * @param signal - Optional cancellation signal.
 * @returns All localized card briefs for the Pokemon name, in API order.
 */
async function fetchCardBriefsByGermanName(
  germanName: string,
  signal?: AbortSignal,
): Promise<TcgDexCardBrief[]> {
  const results: TcgDexCardBrief[] = [];
  let page = 1;

  for (;;) {
    throwIfAborted(signal);

    const url = new URL(`${TCGDEX_API}/cards`);
    url.searchParams.set('name', germanName);
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
 * Fetches and normalizes one German TCGdex card.
 *
 * @param cardId - TCGdex card id.
 * @param signal - Optional cancellation signal.
 * @returns Normalized card or `null` if the card no longer exists.
 */
async function fetchPokemonCardById(
  cardId: string,
  signal?: AbortSignal,
): Promise<PokemonCard | null> {
  try {
    const response = await fetchJson<TcgDexCardResponse>(`${TCGDEX_API}/cards/${cardId}`, signal);
    return mapCardResponse(response);
  } catch (error) {
    if (isHttpStatusError(error, 404)) {
      return null;
    }

    throw error;
  }
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
 * @returns Normalized Pokemon card model.
 */
function mapCardResponse(card: TcgDexCardResponse): PokemonCard {
  return {
    id: card.id,
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
