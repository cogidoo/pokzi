import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { fetchPokemonCards } from './pokemonCardsApi';

function asResponse(body: unknown, ok = true, status = 200): Response {
  return {
    ok,
    status,
    json: vi.fn().mockResolvedValue(body),
  } as unknown as Response;
}

function inputToUrl(input: unknown): string {
  if (typeof input === 'string') {
    return input;
  }

  if (input instanceof URL) {
    return input.toString();
  }

  if (
    input &&
    typeof input === 'object' &&
    'url' in input &&
    typeof (input as { url: unknown }).url === 'string'
  ) {
    return (input as { url: string }).url;
  }

  throw new Error('Unexpected fetch input type');
}

function cardDetail(
  id: string,
  localId: string,
  name: string,
  setName: string,
  dexId: number[] = [4],
) {
  return {
    id,
    localId,
    name,
    image: `https://assets.tcgdex.net/de/swsh/base/${localId}`,
    dexId,
    set: {
      id: 'base',
      name: setName,
      logo: 'https://assets.tcgdex.net/de/swsh/base/logo',
    },
    category: 'Pokémon',
    rarity: 'Common',
  };
}

describe('pokemonCardsApi', () => {
  beforeEach(() => {
    vi.stubGlobal('fetch', vi.fn());
  });

  afterEach(() => {
    vi.unstubAllGlobals();
    vi.restoreAllMocks();
  });

  it('fetches german cards by German name search and verifies the dex id on detail payloads', async () => {
    vi.mocked(fetch).mockImplementation((input) => {
      const url = inputToUrl(input);

      if (url.startsWith('https://api.tcgdex.net/v2/de/cards?')) {
        const parsed = new URL(url);
        expect(parsed.searchParams.get('name')).toBe('Glumanda');
        expect(parsed.searchParams.get('pagination:page')).toBe('1');
        return Promise.resolve(
          asResponse([{ id: 'base-1' }, { id: 'base-2' }, { id: 'base-wrong-dex' }]),
        );
      }

      if (url.endsWith('/de/cards/base-1')) {
        return Promise.resolve(asResponse(cardDetail('base-1', '001', 'Glumanda', 'Basis Set')));
      }

      if (url.endsWith('/de/cards/base-2')) {
        return Promise.resolve(asResponse(cardDetail('base-2', '002', 'Glumanda', 'Jungle')));
      }

      if (url.endsWith('/de/cards/base-wrong-dex')) {
        return Promise.resolve(
          asResponse(cardDetail('base-wrong-dex', '999', 'Glumanda', 'Promo', [999])),
        );
      }

      return Promise.resolve(asResponse({}, false, 404));
    });

    const cards = await fetchPokemonCards(4, 'Glumanda');

    expect(cards).toEqual([
      {
        id: 'base-1',
        name: 'Glumanda',
        localId: '001',
        image: 'https://assets.tcgdex.net/de/swsh/base/001/low.webp',
        dexIds: [4],
        set: {
          id: 'base',
          name: 'Basis Set',
          logo: 'https://assets.tcgdex.net/de/swsh/base/logo',
        },
        category: 'Pokémon',
        rarity: 'Common',
      },
      {
        id: 'base-2',
        name: 'Glumanda',
        localId: '002',
        image: 'https://assets.tcgdex.net/de/swsh/base/002/low.webp',
        dexIds: [4],
        set: {
          id: 'base',
          name: 'Jungle',
          logo: 'https://assets.tcgdex.net/de/swsh/base/logo',
        },
        category: 'Pokémon',
        rarity: 'Common',
      },
    ]);
  });

  it('continues paging until the API returns a short final page', async () => {
    vi.mocked(fetch).mockImplementation((input) => {
      const url = inputToUrl(input);

      if (url.startsWith('https://api.tcgdex.net/v2/de/cards?')) {
        const parsed = new URL(url);
        const page = parsed.searchParams.get('pagination:page');

        if (page === '1') {
          const firstPage = [
            ...Array.from({ length: 99 }, () => ({ id: 'base-1' })),
            { id: 'base-2' },
          ];

          return Promise.resolve(asResponse(firstPage));
        }

        if (page === '2') {
          expect(parsed.searchParams.get('pagination:itemsPerPage')).toBe('100');
          return Promise.resolve(asResponse([{ id: 'base-3' }]));
        }
      }

      if (url.endsWith('/de/cards/base-1')) {
        return Promise.resolve(asResponse(cardDetail('base-1', '001', 'Glumanda', 'Basis Set')));
      }

      if (url.endsWith('/de/cards/base-2')) {
        return Promise.resolve(asResponse(cardDetail('base-2', '002', 'Glutexo', 'Jungle')));
      }

      if (url.endsWith('/de/cards/base-3')) {
        return Promise.resolve(asResponse(cardDetail('base-3', '003', 'Glurak', 'Fossil')));
      }

      return Promise.resolve(asResponse({}, false, 404));
    });

    const cards = await fetchPokemonCards(4, 'Glumanda');

    expect(cards).toHaveLength(3);
    expect(cards.map((card) => card.id)).toEqual(['base-1', 'base-2', 'base-3']);
  });

  it('skips missing card details but keeps the remaining cards', async () => {
    vi.mocked(fetch).mockImplementation((input) => {
      const url = inputToUrl(input);

      if (url.startsWith('https://api.tcgdex.net/v2/de/cards?')) {
        return Promise.resolve(asResponse([{ id: 'base-1' }, { id: 'base-404' }]));
      }

      if (url.endsWith('/de/cards/base-1')) {
        return Promise.resolve(asResponse(cardDetail('base-1', '001', 'Glumanda', 'Basis Set')));
      }

      if (url.endsWith('/de/cards/base-404')) {
        return Promise.resolve(asResponse({}, false, 404));
      }

      return Promise.resolve(asResponse({}, false, 404));
    });

    const cards = await fetchPokemonCards(4, 'Glumanda');

    expect(cards).toHaveLength(1);
    expect(cards[0]?.id).toBe('base-1');
  });

  it('drops cards whose detail payload does not expose the target dex id', async () => {
    vi.mocked(fetch).mockImplementation((input) => {
      const url = inputToUrl(input);

      if (url.startsWith('https://api.tcgdex.net/v2/de/cards?')) {
        return Promise.resolve(asResponse([{ id: 'base-1' }]));
      }

      if (url.endsWith('/de/cards/base-1')) {
        return Promise.resolve(
          asResponse({
            id: 'base-1',
            localId: '001',
            name: 'Glumanda',
            image: 'https://assets.tcgdex.net/de/swsh/base/001',
            set: {
              id: 'base',
              name: 'Basis Set',
              logo: 'https://assets.tcgdex.net/de/swsh/base/logo',
            },
            category: 'Pokémon',
            rarity: 'Common',
          }),
        );
      }

      return Promise.resolve(asResponse({}, false, 404));
    });

    await expect(fetchPokemonCards(4, 'Glumanda')).resolves.toEqual([]);
  });

  it('surfaces list endpoint failures', async () => {
    vi.mocked(fetch).mockResolvedValue(asResponse({}, false, 500));

    await expect(fetchPokemonCards(4, 'Glumanda')).rejects.toMatchObject({
      name: 'SearchPokemonError',
      code: 'server',
      status: 500,
    });
  });

  it('surfaces non-404 card detail failures', async () => {
    vi.mocked(fetch).mockImplementation((input) => {
      const url = inputToUrl(input);

      if (url.startsWith('https://api.tcgdex.net/v2/de/cards?')) {
        return Promise.resolve(asResponse([{ id: 'base-1' }]));
      }

      if (url.endsWith('/de/cards/base-1')) {
        return Promise.resolve(asResponse({}, false, 500));
      }

      return Promise.resolve(asResponse({}, false, 404));
    });

    await expect(fetchPokemonCards(4, 'Glumanda')).rejects.toMatchObject({
      name: 'SearchPokemonError',
      code: 'server',
      status: 500,
    });
  });

  it('maps missing optional card fields to safe defaults', async () => {
    vi.mocked(fetch).mockImplementation((input) => {
      const url = inputToUrl(input);

      if (url.startsWith('https://api.tcgdex.net/v2/de/cards?')) {
        return Promise.resolve(asResponse([{ id: 'base-1' }]));
      }

      if (url.endsWith('/de/cards/base-1')) {
        return Promise.resolve(
          asResponse({
            id: 'base-1',
            localId: '001',
            name: 'Glumanda',
            dexId: [4],
            set: {
              id: 'base',
              name: 'Basis Set',
            },
          }),
        );
      }

      return Promise.resolve(asResponse({}, false, 404));
    });

    await expect(fetchPokemonCards(4, 'Glumanda')).resolves.toEqual([
      {
        id: 'base-1',
        name: 'Glumanda',
        localId: '001',
        image: null,
        dexIds: [4],
        set: {
          id: 'base',
          name: 'Basis Set',
          logo: null,
        },
        category: null,
        rarity: null,
      },
    ]);
  });

  it('keeps successfully loaded cards when one card detail request fails', async () => {
    vi.mocked(fetch).mockImplementation((input) => {
      const url = inputToUrl(input);

      if (url.startsWith('https://api.tcgdex.net/v2/de/cards?')) {
        return Promise.resolve(asResponse([{ id: 'base-1' }, { id: 'base-2' }]));
      }

      if (url.endsWith('/de/cards/base-1')) {
        return Promise.resolve(asResponse(cardDetail('base-1', '001', 'Glumanda', 'Basis Set')));
      }

      if (url.endsWith('/de/cards/base-2')) {
        return Promise.resolve(asResponse({}, false, 500));
      }

      return Promise.resolve(asResponse({}, false, 404));
    });

    await expect(fetchPokemonCards(4, 'Glumanda')).resolves.toEqual([
      {
        id: 'base-1',
        name: 'Glumanda',
        localId: '001',
        image: 'https://assets.tcgdex.net/de/swsh/base/001/low.webp',
        dexIds: [4],
        set: {
          id: 'base',
          name: 'Basis Set',
          logo: 'https://assets.tcgdex.net/de/swsh/base/logo',
        },
        category: 'Pokémon',
        rarity: 'Common',
      },
    ]);
  });

  it('keeps localized title variants such as ex cards when they belong to the same dex id', async () => {
    vi.mocked(fetch).mockImplementation((input) => {
      const url = inputToUrl(input);

      if (url.startsWith('https://api.tcgdex.net/v2/de/cards?')) {
        return Promise.resolve(asResponse([{ id: 'base-ex' }]));
      }

      if (url.endsWith('/de/cards/base-ex')) {
        return Promise.resolve(
          asResponse(cardDetail('base-ex', '125', 'Glumanda-ex', 'Karmesin & Purpur', [4])),
        );
      }

      return Promise.resolve(asResponse({}, false, 404));
    });

    await expect(fetchPokemonCards(4, 'Glumanda')).resolves.toEqual([
      {
        id: 'base-ex',
        name: 'Glumanda-ex',
        localId: '125',
        image: 'https://assets.tcgdex.net/de/swsh/base/125/low.webp',
        dexIds: [4],
        set: {
          id: 'base',
          name: 'Karmesin & Purpur',
          logo: 'https://assets.tcgdex.net/de/swsh/base/logo',
        },
        category: 'Pokémon',
        rarity: 'Common',
      },
    ]);
  });
});
