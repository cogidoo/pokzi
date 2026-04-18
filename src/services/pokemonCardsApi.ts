import { fetchJson, isHttpStatusError } from './http/pokeApiClient';
import { mapWithConcurrency, throwIfAborted } from './utils/async';
import type {
  PokemonCard,
  PokemonCardAggregate,
  PokemonCardLanguage,
  PokemonCardPrice,
} from '../types/pokemonCards';

const TCGDEX_API = 'https://api.tcgdex.net/v2';
const CARDS_PAGE_SIZE = 100;
const CARD_DETAIL_CONCURRENCY = 6;
const CARD_IMAGE_QUALITY = 'low';
const CARD_IMAGE_EXTENSION = 'webp';
const EXACT_DEX_ID_FILTER_PREFIX = 'eq:';

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
  variants?: {
    normal?: boolean;
    reverse?: boolean;
    holo?: boolean;
    firstEdition?: boolean;
  } | null;
  pricing?: {
    cardmarket?: TcgDexCardmarketPricing | null;
    tcgplayer?: TcgDexTcgplayerPricing | null;
  } | null;
}

/**
 * Cardmarket market data embedded in one TCGdex card detail payload.
 */
interface TcgDexCardmarketPricing {
  unit?: string | null;
  avg?: number;
  avg7?: number;
  avg30?: number;
  trend?: number;
  'avg-holo'?: number;
  'avg7-holo'?: number;
  'avg30-holo'?: number;
  'trend-holo'?: number;
}

/**
 * One variant-specific TCGplayer price bucket.
 */
interface TcgDexTcgplayerVariantPricing {
  marketPrice?: number;
  midPrice?: number;
}

/**
 * TCGplayer market data embedded in one TCGdex card detail payload.
 */
interface TcgDexTcgplayerPricing {
  unit?: string | null;
  normal?: TcgDexTcgplayerVariantPricing | null;
  reverse?: TcgDexTcgplayerVariantPricing | null;
  holo?: TcgDexTcgplayerVariantPricing | null;
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
    SUPPORTED_CARD_LANGUAGES.map(async (language) => {
      try {
        return {
          language,
          cards: await fetchPokemonCardsForLanguage(dexId, language, signal),
          error: null as unknown,
        };
      } catch (error) {
        throwIfAborted(signal);
        return {
          language,
          cards: [],
          error,
        };
      }
    }),
  );

  const groupedCards = groupCardsById(
    perLanguageResults.map(({ language, cards }) => ({
      language,
      cards,
    })),
  );
  if (groupedCards.length > 0) {
    return groupedCards;
  }

  const firstError = perLanguageResults.find((result) => result.error !== null)?.error;
  if (firstError) {
    throw firstError instanceof Error
      ? firstError
      : new Error('TCGdex localized card request failed.');
  }

  return [];
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
    url.searchParams.set('dexId', `${EXACT_DEX_ID_FILTER_PREFIX}${String(dexId)}`);
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
    price: mapCardPrice(card.pricing, card.variants),
  };
}

/**
 * Picks one compact price summary from the optional TCGdex pricing payload.
 *
 * Cardmarket is preferred for the German-first experience because it returns EUR.
 * The selected Cardmarket fallback chain depends on the documented card variants.
 * TCGplayer is used only when Cardmarket exposes no suitable value.
 *
 * @param pricing - Raw pricing payload from TCGdex.
 * @param variants - Raw variant flags from TCGdex.
 * @returns Compact UI-ready price summary or `null`.
 */
function mapCardPrice(
  pricing: TcgDexCardResponse['pricing'],
  variants: TcgDexCardResponse['variants'],
): PokemonCardPrice | null {
  const cardmarket = pricing?.cardmarket;
  const preferredCardmarketAmounts = getPreferredCardmarketAmounts(cardmarket, variants);
  const cardmarketAmount = firstNumber(...preferredCardmarketAmounts);
  if (cardmarket && cardmarketAmount !== null) {
    return {
      amount: cardmarketAmount,
      currency: cardmarket.unit ?? 'EUR',
      provider: 'cardmarket',
      label: 'Cardmarket',
    };
  }

  const tcgplayer = pricing?.tcgplayer;
  const preferredTcgplayerAmounts = getPreferredTcgplayerAmounts(tcgplayer, variants);
  const tcgplayerAmount = firstNumber(...preferredTcgplayerAmounts);
  if (tcgplayer && tcgplayerAmount !== null) {
    return {
      amount: tcgplayerAmount,
      currency: tcgplayer.unit ?? 'USD',
      provider: 'tcgplayer',
      label: 'TCGplayer',
    };
  }

  return null;
}

/**
 * Resolves the preferred Cardmarket amount chain for one card.
 *
 * Normal printings win when available because they are the most stable
 * single-price summary for mixed cards that also have holo variants.
 *
 * @param cardmarket - Cardmarket provider payload.
 * @param variants - Variant flags declared by the card payload.
 * @returns Ordered numeric candidates for one compact UI summary.
 */
function getPreferredCardmarketAmounts(
  cardmarket: TcgDexCardmarketPricing | null | undefined,
  variants: TcgDexCardResponse['variants'],
): (number | undefined)[] {
  if (variants?.normal) {
    const candidates: (number | undefined)[] = [
      cardmarket?.trend,
      cardmarket?.avg7,
      cardmarket?.avg30,
    ];
    return candidates;
  }

  if (variants?.holo) {
    const candidates: (number | undefined)[] = [
      cardmarket?.['trend-holo'],
      cardmarket?.['avg7-holo'],
      cardmarket?.['avg30-holo'],
    ];
    return candidates;
  }

  const candidates: (number | undefined)[] = [
    cardmarket?.trend,
    cardmarket?.avg7,
    cardmarket?.avg30,
    cardmarket?.['trend-holo'],
    cardmarket?.['avg7-holo'],
    cardmarket?.['avg30-holo'],
  ];
  return candidates;
}

/**
 * Resolves the preferred TCGplayer amount chain for one card.
 *
 * @param tcgplayer - TCGplayer provider payload.
 * @param variants - Variant flags declared by the card payload.
 * @returns Ordered numeric candidates for one compact UI summary.
 */
function getPreferredTcgplayerAmounts(
  tcgplayer: TcgDexTcgplayerPricing | null | undefined,
  variants: TcgDexCardResponse['variants'],
): (number | undefined)[] {
  if (variants?.normal) {
    return [tcgplayer?.normal?.marketPrice, tcgplayer?.normal?.midPrice];
  }

  if (variants?.holo) {
    return [tcgplayer?.holo?.marketPrice, tcgplayer?.holo?.midPrice];
  }

  if (variants?.reverse) {
    return [tcgplayer?.reverse?.marketPrice, tcgplayer?.reverse?.midPrice];
  }

  return [
    tcgplayer?.normal?.marketPrice,
    tcgplayer?.normal?.midPrice,
    tcgplayer?.holo?.marketPrice,
    tcgplayer?.holo?.midPrice,
    tcgplayer?.reverse?.marketPrice,
    tcgplayer?.reverse?.midPrice,
  ];
}

/**
 * Returns the first finite numeric value from the candidate list.
 *
 * @param values - Ordered numeric candidates.
 * @returns First finite number or `null`.
 */
function firstNumber(...values: (number | undefined)[]): number | null {
  for (const value of values) {
    if (typeof value === 'number' && Number.isFinite(value)) {
      return value;
    }
  }

  return null;
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
