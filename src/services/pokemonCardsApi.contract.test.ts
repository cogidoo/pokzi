import { afterEach, describe, expect, it, vi } from 'vitest';
import { fetchPokemonCardByIdInLanguage, fetchPokemonCards } from './pokemonCardsApi';

function requestUrl(input: RequestInfo | URL): string {
  if (typeof input === 'string') {
    return input;
  }

  return input instanceof URL ? input.toString() : input.url;
}

function asResponse(body: unknown, init: ResponseInit = {}): Response {
  return new Response(JSON.stringify(body), {
    status: 200,
    headers: { 'content-type': 'application/json' },
    ...init,
  });
}

function cardDetail(
  id: string,
  language: string,
  localId: string,
  name: string,
  setName: string,
  dexId: number[] = [4],
  image?: string | null,
) {
  return {
    id,
    localId,
    name,
    image,
    dexId,
    set: {
      id: 'sv03.5',
      name: setName,
      logo: `https://assets.tcgdex.net/${language}/sv/sv03.5/logo`,
    },
    category: 'Pokémon',
    rarity: 'Häufig',
  };
}

describe('fetchPokemonCards', () => {
  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it('aggregates localized card lists by stable card id', async () => {
    const fetchMock = vi.fn<(input: RequestInfo | URL) => Promise<Response>>((input) => {
      const url = requestUrl(input);

      if (url.startsWith('https://api.tcgdex.net/v2/de/cards?')) {
        expect(url).toContain('dexId=eq%3A4');
        return Promise.resolve(asResponse([{ id: 'shared-1' }]));
      }

      if (url.startsWith('https://api.tcgdex.net/v2/en/cards?')) {
        expect(url).toContain('dexId=eq%3A4');
        return Promise.resolve(asResponse([{ id: 'shared-1' }]));
      }

      if (url.startsWith('https://api.tcgdex.net/v2/ja/cards?')) {
        expect(url).toContain('dexId=eq%3A4');
        return Promise.resolve(asResponse([{ id: 'ja-only-1' }]));
      }

      if (url.endsWith('/de/cards/shared-1')) {
        return Promise.resolve(
          asResponse(
            cardDetail(
              'shared-1',
              'de',
              '004',
              'Glumanda',
              '151',
              [4],
              'https://assets.tcgdex.net/de/sv/sv03.5/004',
            ),
          ),
        );
      }

      if (url.endsWith('/en/cards/shared-1')) {
        return Promise.resolve(
          asResponse(
            cardDetail(
              'shared-1',
              'en',
              '004',
              'Charmander',
              '151',
              [4],
              'https://assets.tcgdex.net/en/sv/sv03.5/004',
            ),
          ),
        );
      }

      if (url.endsWith('/ja/cards/ja-only-1')) {
        return Promise.resolve(
          asResponse(
            cardDetail(
              'ja-only-1',
              'ja',
              '004',
              'ヒトカゲ',
              '151',
              [4],
              'https://assets.tcgdex.net/ja/SV/SV2a/004',
            ),
          ),
        );
      }

      return Promise.reject(new Error(`Unexpected URL ${url}`));
    });

    vi.stubGlobal('fetch', fetchMock);

    const cards = await fetchPokemonCards(4);

    expect(cards).toHaveLength(2);
    expect(cards[0]?.id).toBe('shared-1');
    expect(cards[0]?.languages.de?.name).toBe('Glumanda');
    expect(cards[0]?.languages.de?.image).toBe(
      'https://assets.tcgdex.net/de/sv/sv03.5/004/low.webp',
    );
    expect(cards[0]?.languages.en?.name).toBe('Charmander');
    expect(cards[0]?.languages.en?.image).toBe(
      'https://assets.tcgdex.net/en/sv/sv03.5/004/low.webp',
    );
    expect(cards[1]?.id).toBe('ja-only-1');
    expect(cards[1]?.languages.ja?.name).toBe('ヒトカゲ');
    expect(cards[1]?.languages.ja?.image).toBe('https://assets.tcgdex.net/ja/SV/SV2a/004/low.webp');
  });

  it('keeps partial availability when a card only exists in one language', async () => {
    const fetchMock = vi.fn<(input: RequestInfo | URL) => Promise<Response>>((input) => {
      const url = requestUrl(input);

      if (url.startsWith('https://api.tcgdex.net/v2/de/cards?')) {
        return Promise.resolve(asResponse([]));
      }

      if (url.startsWith('https://api.tcgdex.net/v2/en/cards?')) {
        return Promise.resolve(asResponse([{ id: 'en-only-1' }]));
      }

      if (url.startsWith('https://api.tcgdex.net/v2/ja/cards?')) {
        return Promise.resolve(asResponse([]));
      }

      if (url.endsWith('/en/cards/en-only-1')) {
        return Promise.resolve(
          asResponse(cardDetail('en-only-1', 'en', '004', 'Charmander', '151')),
        );
      }

      return Promise.reject(new Error(`Unexpected URL ${url}`));
    });

    vi.stubGlobal('fetch', fetchMock);

    const cards = await fetchPokemonCards(4);

    expect(cards).toHaveLength(1);
    expect(cards[0]?.id).toBe('en-only-1');
    expect(cards[0]?.languages.en?.language).toBe('en');
  });

  it('skips missing localized card details but keeps the rest of the aggregate', async () => {
    const fetchMock = vi.fn<(input: RequestInfo | URL) => Promise<Response>>((input) => {
      const url = requestUrl(input);

      if (url.startsWith('https://api.tcgdex.net/v2/de/cards?')) {
        return Promise.resolve(asResponse([{ id: 'shared-1' }, { id: 'missing-1' }]));
      }

      if (url.startsWith('https://api.tcgdex.net/v2/en/cards?')) {
        return Promise.resolve(asResponse([{ id: 'shared-1' }]));
      }

      if (url.startsWith('https://api.tcgdex.net/v2/ja/cards?')) {
        return Promise.resolve(asResponse([]));
      }

      if (url.endsWith('/de/cards/shared-1')) {
        return Promise.resolve(asResponse(cardDetail('shared-1', 'de', '004', 'Glumanda', '151')));
      }

      if (url.endsWith('/en/cards/shared-1')) {
        return Promise.resolve(
          asResponse(cardDetail('shared-1', 'en', '004', 'Charmander', '151')),
        );
      }

      if (url.endsWith('/de/cards/missing-1')) {
        return Promise.resolve(asResponse({ message: 'Not found' }, { status: 404 }));
      }

      return Promise.reject(new Error(`Unexpected URL ${url}`));
    });

    vi.stubGlobal('fetch', fetchMock);

    const cards = await fetchPokemonCards(4);

    expect(cards).toHaveLength(1);
    expect(cards[0]?.id).toBe('shared-1');
    expect(cards[0]?.languages.de?.language).toBe('de');
    expect(cards[0]?.languages.en?.language).toBe('en');
  });

  it('drops cards whose detail payload does not expose the target dex id', async () => {
    const fetchMock = vi.fn<(input: RequestInfo | URL) => Promise<Response>>((input) => {
      const url = requestUrl(input);

      if (url.startsWith('https://api.tcgdex.net/v2/de/cards?')) {
        return Promise.resolve(asResponse([{ id: 'wrong-1' }]));
      }

      if (url.startsWith('https://api.tcgdex.net/v2/en/cards?')) {
        return Promise.resolve(asResponse([]));
      }

      if (url.startsWith('https://api.tcgdex.net/v2/ja/cards?')) {
        return Promise.resolve(asResponse([]));
      }

      if (url.endsWith('/de/cards/wrong-1')) {
        return Promise.resolve(
          asResponse(cardDetail('wrong-1', 'de', '004', 'Glumanda', '151', [999])),
        );
      }

      return Promise.reject(new Error(`Unexpected URL ${url}`));
    });

    vi.stubGlobal('fetch', fetchMock);

    await expect(fetchPokemonCards(4)).resolves.toEqual([]);
  });

  it('returns null for 404 language lookups on one specific card id', async () => {
    const fetchMock = vi.fn<(input: RequestInfo | URL) => Promise<Response>>((input) => {
      const url = requestUrl(input);

      if (url.endsWith('/ja/cards/shared-1')) {
        return Promise.resolve(asResponse({ message: 'Not found' }, { status: 404 }));
      }

      return Promise.reject(new Error(`Unexpected URL ${url}`));
    });

    vi.stubGlobal('fetch', fetchMock);

    await expect(fetchPokemonCardByIdInLanguage('shared-1', 'ja')).resolves.toBeNull();
  });

  it('rethrows non-404 card language lookup errors', async () => {
    const fetchMock = vi.fn<(input: RequestInfo | URL) => Promise<Response>>((input) => {
      const url = requestUrl(input);

      if (url.endsWith('/en/cards/shared-1')) {
        return Promise.resolve(asResponse({ message: 'boom' }, { status: 500 }));
      }

      return Promise.reject(new Error(`Unexpected URL ${url}`));
    });

    vi.stubGlobal('fetch', fetchMock);

    await expect(fetchPokemonCardByIdInLanguage('shared-1', 'en')).rejects.toBeInstanceOf(Error);
  });

  it('normalizes missing optional card fields from one language detail response', async () => {
    const fetchMock = vi.fn<(input: RequestInfo | URL) => Promise<Response>>((input) => {
      const url = requestUrl(input);

      if (url.endsWith('/en/cards/shared-2')) {
        return Promise.resolve(
          asResponse({
            id: 'shared-2',
            localId: '099',
            name: 'Charmander',
            image: null,
            dexId: 'not-an-array',
            set: {
              id: 'base1',
              name: 'Base Set',
            },
          }),
        );
      }

      return Promise.reject(new Error(`Unexpected URL ${url}`));
    });

    vi.stubGlobal('fetch', fetchMock);

    await expect(fetchPokemonCardByIdInLanguage('shared-2', 'en')).resolves.toEqual({
      id: 'shared-2',
      language: 'en',
      name: 'Charmander',
      localId: '099',
      image: null,
      dexIds: [],
      set: {
        id: 'base1',
        name: 'Base Set',
        logo: null,
      },
      category: null,
      rarity: null,
    });
  });

  it('deduplicates paginated briefs across pages and keeps one aggregate entry', async () => {
    const fetchMock = vi.fn<(input: RequestInfo | URL) => Promise<Response>>((input) => {
      const url = requestUrl(input);
      const parsedUrl = new URL(url);
      const page = parsedUrl.searchParams.get('pagination:page');

      if (url.startsWith('https://api.tcgdex.net/v2/de/cards?') && page === '1') {
        return Promise.resolve(
          asResponse(
            new Array(100)
              .fill(null)
              .map((_, index) => ({ id: index === 99 ? 'shared-1' : `de-${String(index)}` })),
          ),
        );
      }

      if (url.startsWith('https://api.tcgdex.net/v2/de/cards?') && page === '2') {
        return Promise.resolve(asResponse([{ id: 'shared-1' }]));
      }

      if (url.startsWith('https://api.tcgdex.net/v2/en/cards?')) {
        return Promise.resolve(asResponse([]));
      }

      if (url.startsWith('https://api.tcgdex.net/v2/ja/cards?')) {
        return Promise.resolve(asResponse([]));
      }

      if (url.endsWith('/de/cards/shared-1')) {
        return Promise.resolve(asResponse(cardDetail('shared-1', 'de', '004', 'Glumanda', '151')));
      }

      if (url.includes('/de/cards/de-')) {
        const id = url.split('/').pop() ?? 'missing';
        return Promise.resolve(asResponse(cardDetail(id, 'de', '001', 'Karte', '151')));
      }

      return Promise.reject(new Error(`Unexpected URL ${url}`));
    });

    vi.stubGlobal('fetch', fetchMock);

    const cards = await fetchPokemonCards(4);

    expect(cards.filter((card) => card.id === 'shared-1')).toHaveLength(1);
  });

  it('throws the first detail error when briefs exist but no valid cards can be built', async () => {
    const fetchMock = vi.fn<(input: RequestInfo | URL) => Promise<Response>>((input) => {
      const url = requestUrl(input);

      if (url.startsWith('https://api.tcgdex.net/v2/de/cards?')) {
        return Promise.resolve(asResponse([{ id: 'broken-1' }]));
      }

      if (url.startsWith('https://api.tcgdex.net/v2/en/cards?')) {
        return Promise.resolve(asResponse([]));
      }

      if (url.startsWith('https://api.tcgdex.net/v2/ja/cards?')) {
        return Promise.resolve(asResponse([]));
      }

      if (url.endsWith('/de/cards/broken-1')) {
        return Promise.resolve(asResponse({ message: 'boom' }, { status: 500 }));
      }

      return Promise.reject(new Error(`Unexpected URL ${url}`));
    });

    vi.stubGlobal('fetch', fetchMock);

    await expect(fetchPokemonCards(4)).rejects.toBeInstanceOf(Error);
  });

  it('returns an empty list when every language brief list is empty', async () => {
    const fetchMock = vi.fn<(input: RequestInfo | URL) => Promise<Response>>((input) => {
      const url = requestUrl(input);

      if (url.startsWith('https://api.tcgdex.net/v2/de/cards?')) {
        return Promise.resolve(asResponse([]));
      }

      if (url.startsWith('https://api.tcgdex.net/v2/en/cards?')) {
        return Promise.resolve(asResponse([]));
      }

      if (url.startsWith('https://api.tcgdex.net/v2/ja/cards?')) {
        return Promise.resolve(asResponse([]));
      }

      return Promise.reject(new Error(`Unexpected URL ${url}`));
    });

    vi.stubGlobal('fetch', fetchMock);

    await expect(fetchPokemonCards(4)).resolves.toEqual([]);
  });

  it('keeps cards from healthy languages when one language detail flow fails', async () => {
    const fetchMock = vi.fn<(input: RequestInfo | URL) => Promise<Response>>((input) => {
      const url = requestUrl(input);

      if (url.startsWith('https://api.tcgdex.net/v2/de/cards?')) {
        return Promise.resolve(asResponse([{ id: 'broken-1' }]));
      }

      if (url.startsWith('https://api.tcgdex.net/v2/en/cards?')) {
        return Promise.resolve(asResponse([{ id: 'shared-1' }]));
      }

      if (url.startsWith('https://api.tcgdex.net/v2/ja/cards?')) {
        return Promise.resolve(asResponse([]));
      }

      if (url.endsWith('/de/cards/broken-1')) {
        return Promise.resolve(asResponse({ message: 'boom' }, { status: 500 }));
      }

      if (url.endsWith('/en/cards/shared-1')) {
        return Promise.resolve(
          asResponse(cardDetail('shared-1', 'en', '004', 'Charmander', '151')),
        );
      }

      return Promise.reject(new Error(`Unexpected URL ${url}`));
    });

    vi.stubGlobal('fetch', fetchMock);

    await expect(fetchPokemonCards(4)).resolves.toEqual([
      {
        id: 'shared-1',
        languages: {
          en: {
            id: 'shared-1',
            language: 'en',
            name: 'Charmander',
            localId: '004',
            image: null,
            dexIds: [4],
            set: {
              id: 'sv03.5',
              name: '151',
              logo: 'https://assets.tcgdex.net/en/sv/sv03.5/logo',
            },
            category: 'Pokémon',
            rarity: 'Häufig',
          },
        },
      },
    ]);
  });

  it('keeps cards from healthy languages when one language list request fails', async () => {
    const fetchMock = vi.fn<(input: RequestInfo | URL) => Promise<Response>>((input) => {
      const url = requestUrl(input);

      if (url.startsWith('https://api.tcgdex.net/v2/de/cards?')) {
        return Promise.resolve(asResponse({ message: 'boom' }, { status: 500 }));
      }

      if (url.startsWith('https://api.tcgdex.net/v2/en/cards?')) {
        return Promise.resolve(asResponse([{ id: 'shared-1' }]));
      }

      if (url.startsWith('https://api.tcgdex.net/v2/ja/cards?')) {
        return Promise.resolve(asResponse([]));
      }

      if (url.endsWith('/en/cards/shared-1')) {
        return Promise.resolve(
          asResponse(cardDetail('shared-1', 'en', '004', 'Charmander', '151')),
        );
      }

      return Promise.reject(new Error(`Unexpected URL ${url}`));
    });

    vi.stubGlobal('fetch', fetchMock);

    const cards = await fetchPokemonCards(4);

    expect(cards).toHaveLength(1);
    expect(cards[0]?.languages.en?.name).toBe('Charmander');
  });

  it('uses an exact dexId filter for every language list request', async () => {
    const requestedDexIdFilters: string[] = [];
    const fetchMock = vi.fn<(input: RequestInfo | URL) => Promise<Response>>((input) => {
      const url = new URL(requestUrl(input));

      if (url.pathname.endsWith('/cards')) {
        requestedDexIdFilters.push(url.searchParams.get('dexId') ?? '');
        return Promise.resolve(asResponse([]));
      }

      return Promise.reject(new Error(`Unexpected URL ${url.toString()}`));
    });

    vi.stubGlobal('fetch', fetchMock);

    await expect(fetchPokemonCards(7)).resolves.toEqual([]);
    expect(requestedDexIdFilters).toEqual(['eq:7', 'eq:7', 'eq:7']);
  });
});
