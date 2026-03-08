import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { GERMAN_SPECIES_NAME_BY_ID } from '../data/pokemonGermanSpeciesIndex';

function makePokemon(id: number, name: string, image = `https://img/${name}.png`) {
  return {
    id,
    name,
    height: 10,
    weight: 100,
    sprites: {
      other: {
        'official-artwork': {
          front_default: image,
        },
      },
    },
    types: [{ type: { name: 'electric' } }],
  };
}

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

function speciesNames(de: string | null, evolutionChainId?: number) {
  const names = [{ language: { name: 'en' }, name: 'english-name' }];
  if (de) {
    names.push({ language: { name: 'de' }, name: de });
  }
  return {
    names,
    ...(evolutionChainId
      ? {
          evolution_chain: {
            url: `https://pokeapi.co/api/v2/evolution-chain/${String(evolutionChainId)}/`,
          },
        }
      : {}),
  };
}

describe('searchPokemon (German names)', () => {
  beforeEach(() => {
    vi.resetModules();
    vi.stubGlobal('fetch', vi.fn());
  });

  afterEach(() => {
    vi.unstubAllGlobals();
    vi.restoreAllMocks();
  });

  it('returns empty array for empty query without network calls', async () => {
    const { searchPokemon } = await import('./pokemonApi');
    await expect(searchPokemon('   ')).resolves.toEqual([]);
    expect(fetch).not.toHaveBeenCalled();
  });

  it('returns empty array when species index endpoint returns no items', async () => {
    vi.mocked(fetch).mockImplementation((input) => {
      const url = inputToUrl(input);
      if (url.includes('/pokemon-species?limit=1400')) {
        return Promise.resolve(asResponse({ results: [] }));
      }

      return Promise.resolve(asResponse({}, false, 404));
    });

    const { searchPokemon } = await import('./pokemonApi');
    await expect(searchPokemon('pik')).resolves.toEqual([]);
  });

  it('supports numeric ID search and returns german display name', async () => {
    vi.mocked(fetch).mockImplementation((input) => {
      const url = inputToUrl(input);

      if (url.endsWith('/pokemon/25')) {
        return Promise.resolve(asResponse(makePokemon(25, 'pikachu')));
      }

      if (url.endsWith('/pokemon-species/25')) {
        return Promise.resolve(asResponse(speciesNames('Pikachu', 10)));
      }

      if (url.endsWith('/evolution-chain/10')) {
        return Promise.resolve(
          asResponse({
            chain: {
              species: { name: 'pichu' },
              evolves_to: [
                {
                  species: { name: 'pikachu' },
                  evolves_to: [{ species: { name: 'raichu' }, evolves_to: [] }],
                },
              ],
            },
          }),
        );
      }

      return Promise.resolve(asResponse({}, false, 404));
    });

    const { searchPokemon } = await import('./pokemonApi');
    const results = await searchPokemon('25');

    expect(results).toHaveLength(1);
    expect(results[0]?.id).toBe(25);
    expect(results[0]?.displayName).toBe('Pikachu');
    expect(results[0]?.evolutionStage).toBe('Phase 1');
    expect(fetch).toHaveBeenCalledWith('https://pokeapi.co/api/v2/pokemon/25', expect.any(Object));
  });

  it('returns empty array for unknown numeric ID', async () => {
    vi.mocked(fetch).mockResolvedValue(asResponse({}, false, 404));
    const { searchPokemon } = await import('./pokemonApi');

    await expect(searchPokemon('999999')).resolves.toEqual([]);
  });

  it('throws on non-404 numeric ID errors', async () => {
    vi.mocked(fetch).mockResolvedValue(asResponse({}, false, 500));
    const { searchPokemon } = await import('./pokemonApi');

    await expect(searchPokemon('25')).rejects.toThrow('Request failed: 500');
  });

  it('falls back to english API name for numeric search if german translation is unavailable', async () => {
    vi.mocked(fetch).mockImplementation((input) => {
      const url = inputToUrl(input);

      if (url.endsWith('/pokemon/4')) {
        return Promise.resolve(asResponse(makePokemon(4, 'charmander')));
      }

      if (url.endsWith('/pokemon-species/4')) {
        return Promise.resolve(
          asResponse({
            names: [{ language: { name: 'en' }, name: 'Charmander' }],
          }),
        );
      }

      return Promise.resolve(asResponse({}, false, 404));
    });

    const { searchPokemon } = await import('./pokemonApi');
    const [result] = await searchPokemon('4');

    expect(result.displayName).toBe('charmander');
  });

  it('falls back to english API name for numeric search when species endpoint is 404', async () => {
    vi.mocked(fetch).mockImplementation((input) => {
      const url = inputToUrl(input);

      if (url.endsWith('/pokemon/4')) {
        return Promise.resolve(asResponse(makePokemon(4, 'charmander')));
      }

      if (url.endsWith('/pokemon-species/4')) {
        return Promise.resolve(asResponse({}, false, 404));
      }

      return Promise.resolve(asResponse({}, false, 404));
    });

    const { searchPokemon } = await import('./pokemonApi');
    const [result] = await searchPokemon('4');

    expect(result.displayName).toBe('charmander');
  });

  it('finds by german name and returns german display name', async () => {
    vi.mocked(fetch).mockImplementation((input) => {
      const url = inputToUrl(input);

      if (url.includes('/pokemon-species?limit=1400')) {
        return Promise.resolve(
          asResponse({
            results: [{ name: 'pikachu', url: 'https://pokeapi.co/api/v2/pokemon-species/25/' }],
          }),
        );
      }

      if (url.endsWith('/pokemon-species/25')) {
        return Promise.resolve(asResponse(speciesNames('Pikachu', 10)));
      }

      if (url.endsWith('/evolution-chain/10')) {
        return Promise.resolve(
          asResponse({
            chain: {
              species: { name: 'pichu' },
              evolves_to: [
                {
                  species: { name: 'pikachu' },
                  evolves_to: [{ species: { name: 'raichu' }, evolves_to: [] }],
                },
              ],
            },
          }),
        );
      }

      if (url.endsWith('/pokemon/25')) {
        return Promise.resolve(asResponse(makePokemon(25, 'pikachu')));
      }

      return Promise.resolve(asResponse({}, false, 404));
    });

    const { searchPokemon } = await import('./pokemonApi');
    const results = await searchPokemon('pikachu');

    expect(results).toHaveLength(1);
    expect(results[0]?.name).toBe('pikachu');
    expect(results[0]?.displayName).toBe('Pikachu');
    expect(results[0]?.evolutionStage).toBe('Phase 1');
    expect(results[0]?.matchQuality).toBe('exact');
  });

  it('treats umlaut and ss variants as equivalent in german-name matching', async () => {
    vi.mocked(fetch).mockImplementation((input) => {
      const url = inputToUrl(input);

      if (url.includes('/pokemon-species?limit=1400')) {
        return Promise.resolve(
          asResponse({
            results: [{ name: 'skiddo', url: 'https://pokeapi.co/api/v2/pokemon-species/672/' }],
          }),
        );
      }

      if (url.endsWith('/pokemon-species/672')) {
        return Promise.resolve(asResponse(speciesNames('Mähikel')));
      }

      if (url.endsWith('/pokemon/672')) {
        return Promise.resolve(asResponse(makePokemon(672, 'skiddo')));
      }

      return Promise.resolve(asResponse({}, false, 404));
    });

    const { searchPokemon } = await import('./pokemonApi');
    const [result] = await searchPokemon('maehikel');

    expect(result).toBeDefined();
    expect(result.displayName).toBe('Mähikel');
    expect(result.matchQuality).toBe('exact');
  });

  it('returns tolerant match quality for one-edit typo in short german names', async () => {
    vi.mocked(fetch).mockImplementation((input) => {
      const url = inputToUrl(input);

      if (url.includes('/pokemon-species?limit=1400')) {
        return Promise.resolve(
          asResponse({
            results: [{ name: 'eevee', url: 'https://pokeapi.co/api/v2/pokemon-species/133/' }],
          }),
        );
      }

      if (url.endsWith('/pokemon-species/133')) {
        return Promise.resolve(asResponse(speciesNames('Evoli')));
      }

      if (url.endsWith('/pokemon/133')) {
        return Promise.resolve(asResponse(makePokemon(133, 'eevee')));
      }

      return Promise.resolve(asResponse({}, false, 404));
    });

    const { searchPokemon } = await import('./pokemonApi');
    const [result] = await searchPokemon('evli');

    expect(result).toBeDefined();
    expect(result.displayName).toBe('Evoli');
    expect(result.matchQuality).toBe('tolerant');
  });

  it('allows up to two edits for longer german names', async () => {
    vi.mocked(fetch).mockImplementation((input) => {
      const url = inputToUrl(input);

      if (url.includes('/pokemon-species?limit=1400')) {
        return Promise.resolve(
          asResponse({
            results: [{ name: 'squirtle', url: 'https://pokeapi.co/api/v2/pokemon-species/7/' }],
          }),
        );
      }

      if (url.endsWith('/pokemon-species/7')) {
        return Promise.resolve(asResponse(speciesNames('Schiggy')));
      }

      if (url.endsWith('/pokemon/7')) {
        return Promise.resolve(asResponse(makePokemon(7, 'squirtle')));
      }

      return Promise.resolve(asResponse({}, false, 404));
    });

    const { searchPokemon } = await import('./pokemonApi');
    const [result] = await searchPokemon('schigyy');

    expect(result).toBeDefined();
    expect(result.displayName).toBe('Schiggy');
    expect(result.matchQuality).toBe('tolerant');
  });

  it('returns tolerant matches when no exact or partial german match exists', async () => {
    vi.mocked(fetch).mockImplementation((input) => {
      const url = inputToUrl(input);

      if (url.includes('/pokemon-species?limit=1400')) {
        return Promise.resolve(
          asResponse({
            results: [{ name: 'squirtle', url: 'https://pokeapi.co/api/v2/pokemon-species/7/' }],
          }),
        );
      }

      if (url.endsWith('/pokemon-species/7')) {
        return Promise.resolve(asResponse(speciesNames('Schiggy')));
      }

      if (url.endsWith('/pokemon/7')) {
        return Promise.resolve(asResponse(makePokemon(7, 'squirtle')));
      }

      return Promise.resolve(asResponse({}, false, 404));
    });

    const { searchPokemon } = await import('./pokemonApi');
    const [result] = await searchPokemon('schigyy');

    expect(result).toBeDefined();
    expect(result.displayName).toBe('Schiggy');
    expect(result.matchQuality).toBe('tolerant');
  });

  it('maps root chain pokemon to Basis stage', async () => {
    vi.mocked(fetch).mockImplementation((input) => {
      const url = inputToUrl(input);

      if (url.endsWith('/pokemon/1')) {
        return Promise.resolve(asResponse(makePokemon(1, 'bulbasaur')));
      }

      if (url.endsWith('/pokemon-species/1')) {
        return Promise.resolve(asResponse(speciesNames('Bisasam', 1)));
      }

      if (url.endsWith('/evolution-chain/1')) {
        return Promise.resolve(
          asResponse({
            chain: {
              species: { name: 'bulbasaur' },
              evolves_to: [
                {
                  species: { name: 'ivysaur' },
                  evolves_to: [{ species: { name: 'venusaur' }, evolves_to: [] }],
                },
              ],
            },
          }),
        );
      }

      return Promise.resolve(asResponse({}, false, 404));
    });

    const { searchPokemon } = await import('./pokemonApi');
    const [result] = await searchPokemon('1');

    expect(result.evolutionStage).toBe('Basis');
  });

  it('maps depth >= 2 pokemon to Phase 2 stage', async () => {
    vi.mocked(fetch).mockImplementation((input) => {
      const url = inputToUrl(input);

      if (url.endsWith('/pokemon/6')) {
        return Promise.resolve(asResponse(makePokemon(6, 'charizard')));
      }

      if (url.endsWith('/pokemon-species/6')) {
        return Promise.resolve(asResponse(speciesNames('Glurak', 4)));
      }

      if (url.endsWith('/evolution-chain/4')) {
        return Promise.resolve(
          asResponse({
            chain: {
              species: { name: 'charmander' },
              evolves_to: [
                {
                  species: { name: 'charmeleon' },
                  evolves_to: [{ species: { name: 'charizard' }, evolves_to: [] }],
                },
              ],
            },
          }),
        );
      }

      return Promise.resolve(asResponse({}, false, 404));
    });

    const { searchPokemon } = await import('./pokemonApi');
    const [result] = await searchPokemon('6');

    expect(result.evolutionStage).toBe('Phase 2');
  });

  it('throws on non-404 evolution-chain errors', async () => {
    vi.mocked(fetch).mockImplementation((input) => {
      const url = inputToUrl(input);

      if (url.endsWith('/pokemon/25')) {
        return Promise.resolve(asResponse(makePokemon(25, 'pikachu')));
      }

      if (url.endsWith('/pokemon-species/25')) {
        return Promise.resolve(asResponse(speciesNames('Pikachu', 10)));
      }

      if (url.endsWith('/evolution-chain/10')) {
        return Promise.resolve(asResponse({}, false, 500));
      }

      return Promise.resolve(asResponse({}, false, 404));
    });

    const { searchPokemon } = await import('./pokemonApi');
    await expect(searchPokemon('25')).rejects.toThrow('Request failed: 500');
  });

  it('falls back to Basis when evolution-chain endpoint returns 404', async () => {
    vi.mocked(fetch).mockImplementation((input) => {
      const url = inputToUrl(input);

      if (url.endsWith('/pokemon/25')) {
        return Promise.resolve(asResponse(makePokemon(25, 'pikachu')));
      }

      if (url.endsWith('/pokemon-species/25')) {
        return Promise.resolve(asResponse(speciesNames('Pikachu', 10)));
      }

      if (url.endsWith('/evolution-chain/10')) {
        return Promise.resolve(asResponse({}, false, 404));
      }

      return Promise.resolve(asResponse({}, false, 404));
    });

    const { searchPokemon } = await import('./pokemonApi');
    const [result] = await searchPokemon('25');

    expect(result.evolutionStage).toBe('Basis');
  });

  it('falls back to Basis when evolution-chain URL is invalid', async () => {
    vi.mocked(fetch).mockImplementation((input) => {
      const url = inputToUrl(input);

      if (url.endsWith('/pokemon/25')) {
        return Promise.resolve(asResponse(makePokemon(25, 'pikachu')));
      }

      if (url.endsWith('/pokemon-species/25')) {
        return Promise.resolve(
          asResponse({
            names: [{ language: { name: 'de' }, name: 'Pikachu' }],
            evolution_chain: {
              url: 'https://pokeapi.co/api/v2/evolution-chain/not-a-number/',
            },
          }),
        );
      }

      return Promise.resolve(asResponse({}, false, 404));
    });

    const { searchPokemon } = await import('./pokemonApi');
    const [result] = await searchPokemon('25');

    expect(result.evolutionStage).toBe('Basis');
    const evolutionCalls = vi
      .mocked(fetch)
      .mock.calls.filter(([url]) => inputToUrl(url).includes('/evolution-chain/'));
    expect(evolutionCalls).toHaveLength(0);
  });

  it('falls back to Basis when pokemon is missing inside the evolution chain', async () => {
    vi.mocked(fetch).mockImplementation((input) => {
      const url = inputToUrl(input);

      if (url.endsWith('/pokemon/25')) {
        return Promise.resolve(asResponse(makePokemon(25, 'pikachu')));
      }

      if (url.endsWith('/pokemon-species/25')) {
        return Promise.resolve(asResponse(speciesNames('Pikachu', 10)));
      }

      if (url.endsWith('/evolution-chain/10')) {
        return Promise.resolve(
          asResponse({
            chain: {
              species: { name: 'pichu' },
              evolves_to: [{ species: { name: 'raichu' }, evolves_to: [] }],
            },
          }),
        );
      }

      return Promise.resolve(asResponse({}, false, 404));
    });

    const { searchPokemon } = await import('./pokemonApi');
    const [result] = await searchPokemon('25');

    expect(result.evolutionStage).toBe('Basis');
  });

  it('returns no matches when only english name exists', async () => {
    vi.mocked(fetch).mockImplementation((input) => {
      const url = inputToUrl(input);

      if (url.includes('/pokemon-species?limit=1400')) {
        return Promise.resolve(
          asResponse({
            results: [{ name: 'charmander', url: 'https://pokeapi.co/api/v2/pokemon-species/4/' }],
          }),
        );
      }

      if (url.endsWith('/pokemon-species/4')) {
        return Promise.resolve(asResponse(speciesNames('Glumanda')));
      }

      return Promise.resolve(asResponse({}, false, 404));
    });

    const { searchPokemon } = await import('./pokemonApi');
    await expect(searchPokemon('charmander')).resolves.toEqual([]);
  });

  it('skips species entries when german translation is missing', async () => {
    vi.mocked(fetch).mockImplementation((input) => {
      const url = inputToUrl(input);

      if (url.includes('/pokemon-species?limit=1400')) {
        return Promise.resolve(
          asResponse({
            results: [{ name: 'eevee', url: 'https://pokeapi.co/api/v2/pokemon-species/133/' }],
          }),
        );
      }

      if (url.endsWith('/pokemon-species/133')) {
        return Promise.resolve(
          asResponse({
            names: [{ language: { name: 'en' }, name: 'Eevee' }],
          }),
        );
      }

      return Promise.resolve(asResponse({}, false, 404));
    });

    const { searchPokemon } = await import('./pokemonApi');
    await expect(searchPokemon('evo')).resolves.toEqual([]);
  });

  it('marks full-name german query results as exact matches', async () => {
    vi.mocked(fetch).mockImplementation((input) => {
      const url = inputToUrl(input);

      if (url.includes('/pokemon-species?limit=1400')) {
        return Promise.resolve(
          asResponse({
            results: [{ name: 'pikachu', url: 'https://pokeapi.co/api/v2/pokemon-species/25/' }],
          }),
        );
      }

      if (url.endsWith('/pokemon-species/25')) {
        return Promise.resolve(asResponse(speciesNames('Pikachu')));
      }

      if (url.endsWith('/pokemon/25')) {
        return Promise.resolve(asResponse(makePokemon(25, 'pikachu')));
      }

      return Promise.resolve(asResponse({}, false, 404));
    });

    const { searchPokemon } = await import('./pokemonApi');
    const results = await searchPokemon('pikachu');

    expect(results).toHaveLength(1);
    expect(results[0]?.displayName).toBe('Pikachu');
    expect(results[0]?.matchQuality).toBe('exact');
  });

  it('filters out pokemon detail 404s', async () => {
    vi.mocked(fetch).mockImplementation((input) => {
      const url = inputToUrl(input);

      if (url.includes('/pokemon-species?limit=1400')) {
        return Promise.resolve(
          asResponse({
            results: [{ name: 'ghostmon', url: 'https://pokeapi.co/api/v2/pokemon-species/999/' }],
          }),
        );
      }

      if (url.endsWith('/pokemon-species/999')) {
        return Promise.resolve(asResponse(speciesNames('Geistmon')));
      }

      if (url.endsWith('/pokemon/999')) {
        return Promise.resolve(asResponse({}, false, 404));
      }

      return Promise.resolve(asResponse({}, false, 500));
    });

    const { searchPokemon } = await import('./pokemonApi');
    await expect(searchPokemon('geist')).resolves.toEqual([]);
  });

  it('throws on non-404 pokemon detail errors', async () => {
    vi.mocked(fetch).mockImplementation((input) => {
      const url = inputToUrl(input);

      if (url.includes('/pokemon-species?limit=1400')) {
        return Promise.resolve(
          asResponse({
            results: [{ name: 'pikachu', url: 'https://pokeapi.co/api/v2/pokemon-species/25/' }],
          }),
        );
      }

      if (url.endsWith('/pokemon-species/25')) {
        return Promise.resolve(asResponse(speciesNames('Pikachu')));
      }

      if (url.endsWith('/pokemon/25')) {
        return Promise.resolve(asResponse({}, false, 500));
      }

      return Promise.resolve(asResponse({}, false, 404));
    });

    const { searchPokemon } = await import('./pokemonApi');
    await expect(searchPokemon('pik')).rejects.toThrow('Request failed: 500');
  });

  it('retries after aborted species-index request', async () => {
    let indexCalls = 0;

    vi.mocked(fetch).mockImplementation((input, init) => {
      const url = inputToUrl(input);

      if (url.includes('/pokemon-species?limit=1400')) {
        indexCalls += 1;

        if (indexCalls === 1) {
          const signal = (init as { signal?: AbortSignal }).signal;
          return new Promise<Response>((_resolve, reject) => {
            signal?.addEventListener(
              'abort',
              () => {
                reject(new DOMException('Aborted', 'AbortError'));
              },
              { once: true },
            );
          });
        }

        return Promise.resolve(
          asResponse({
            results: [{ name: 'pikachu', url: 'https://pokeapi.co/api/v2/pokemon-species/25/' }],
          }),
        );
      }

      if (url.endsWith('/pokemon-species/25')) {
        return Promise.resolve(asResponse(speciesNames('Pikachu')));
      }

      if (url.endsWith('/pokemon/25')) {
        return Promise.resolve(asResponse(makePokemon(25, 'pikachu')));
      }

      return Promise.resolve(asResponse({}, false, 404));
    });

    const { searchPokemon } = await import('./pokemonApi');
    const controller = new AbortController();

    const first = searchPokemon('pik', controller.signal);
    controller.abort();
    await expect(first).rejects.toBeInstanceOf(DOMException);

    const second = await searchPokemon('pik');
    expect(second).toHaveLength(1);
    expect(indexCalls).toBe(2);
  });

  it('reuses in-flight species-index promise for concurrent searches', async () => {
    let release: (() => void) | undefined;

    vi.mocked(fetch).mockImplementation((input) => {
      const url = inputToUrl(input);

      if (url.includes('/pokemon-species?limit=1400')) {
        return new Promise<Response>((resolve) => {
          release = () => {
            resolve(
              asResponse({
                results: [
                  { name: 'pikachu', url: 'https://pokeapi.co/api/v2/pokemon-species/25/' },
                ],
              }),
            );
          };
        });
      }

      if (url.endsWith('/pokemon-species/25')) {
        return Promise.resolve(asResponse(speciesNames('Pikachu')));
      }

      if (url.endsWith('/pokemon/25')) {
        return Promise.resolve(asResponse(makePokemon(25, 'pikachu')));
      }

      return Promise.resolve(asResponse({}, false, 404));
    });

    const { searchPokemon } = await import('./pokemonApi');

    const first = searchPokemon('pik');
    const second = searchPokemon('pikac');

    if (release) release();

    await Promise.all([first, second]);

    const indexCalls = vi
      .mocked(fetch)
      .mock.calls.filter(([url]) => inputToUrl(url).includes('/pokemon-species?limit=1400')).length;
    expect(indexCalls).toBe(1);
  });

  it('ignores species entries with invalid id urls', async () => {
    vi.mocked(fetch).mockImplementation((input) => {
      const url = inputToUrl(input);

      if (url.includes('/pokemon-species?limit=1400')) {
        return Promise.resolve(
          asResponse({
            results: [
              { name: 'broken', url: 'https://pokeapi.co/api/v2/pokemon-species/not-a-number/' },
            ],
          }),
        );
      }

      return Promise.resolve(asResponse({}, false, 404));
    });

    const { searchPokemon } = await import('./pokemonApi');
    await expect(searchPokemon('brok')).resolves.toEqual([]);
  });

  it('returns no text matches when species ids are outside the bundled german index', async () => {
    vi.mocked(fetch).mockImplementation((input) => {
      const url = inputToUrl(input);

      if (url.includes('/pokemon-species?limit=1400')) {
        return Promise.resolve(
          asResponse({
            results: [{ name: 'unknown', url: 'https://pokeapi.co/api/v2/pokemon-species/9999/' }],
          }),
        );
      }

      return Promise.resolve(asResponse({}, false, 404));
    });

    const { searchPokemon } = await import('./pokemonApi');
    await expect(searchPokemon('unk')).resolves.toEqual([]);
  });

  it('throws when detail species lookup fails with non-404 during text search', async () => {
    vi.mocked(fetch).mockImplementation((input) => {
      const url = inputToUrl(input);

      if (url.includes('/pokemon-species?limit=1400')) {
        return Promise.resolve(
          asResponse({
            results: [{ name: 'pikachu', url: 'https://pokeapi.co/api/v2/pokemon-species/25/' }],
          }),
        );
      }

      if (url.endsWith('/pokemon/25')) {
        return Promise.resolve(asResponse(makePokemon(25, 'pikachu')));
      }

      if (url.endsWith('/pokemon-species/25')) {
        return Promise.resolve(asResponse({}, false, 500));
      }

      return Promise.resolve(asResponse({}, false, 404));
    });

    const { searchPokemon } = await import('./pokemonApi');
    await expect(searchPokemon('pikachu')).rejects.toThrow('Request failed: 500');
  });

  it('avoids per-index species-localization requests during german text search', async () => {
    vi.mocked(fetch).mockImplementation((input) => {
      const url = inputToUrl(input);

      if (url.includes('/pokemon-species?limit=1400')) {
        return Promise.resolve(
          asResponse({
            results: [
              { name: 'pikachu', url: 'https://pokeapi.co/api/v2/pokemon-species/25/' },
              { name: 'raichu', url: 'https://pokeapi.co/api/v2/pokemon-species/26/' },
            ],
          }),
        );
      }

      if (url.endsWith('/pokemon/25')) {
        return Promise.resolve(asResponse(makePokemon(25, 'pikachu')));
      }

      if (url.endsWith('/pokemon-species/25')) {
        return Promise.resolve(asResponse(speciesNames('Pikachu', 10)));
      }

      if (url.endsWith('/evolution-chain/10')) {
        return Promise.resolve(
          asResponse({
            chain: {
              species: { name: 'pichu' },
              evolves_to: [
                {
                  species: { name: 'pikachu' },
                  evolves_to: [{ species: { name: 'raichu' }, evolves_to: [] }],
                },
              ],
            },
          }),
        );
      }

      return Promise.resolve(asResponse({}, false, 404));
    });

    const { searchPokemon } = await import('./pokemonApi');
    await searchPokemon('pikachu');

    const speciesByIdCalls = vi
      .mocked(fetch)
      .mock.calls.filter(([url]) => /\/pokemon-species\/\d+\/?$/.test(inputToUrl(url)));

    expect(speciesByIdCalls).toHaveLength(1);
    expect(
      speciesByIdCalls[0]
        ? inputToUrl(speciesByIdCalls[0][0]).endsWith('/pokemon-species/25')
        : false,
    ).toBe(true);
  });

  it('caps german-name matches at 20', async () => {
    const candidateIds = Object.entries(GERMAN_SPECIES_NAME_BY_ID)
      .filter(([, germanName]) => germanName.toLowerCase().includes('ra'))
      .slice(0, 30)
      .map(([id]) => Number(id));

    expect(candidateIds.length).toBeGreaterThanOrEqual(20);

    const results = candidateIds.map((id) => ({
      name: `poke${String(id)}`,
      url: `https://pokeapi.co/api/v2/pokemon-species/${String(id)}/`,
    }));

    vi.mocked(fetch).mockImplementation((input) => {
      const url = inputToUrl(input);

      if (url.includes('/pokemon-species?limit=1400')) {
        return Promise.resolve(asResponse({ results }));
      }

      const pokemonId = /\/pokemon\/(\d+)\/?$/.exec(url)?.[1];
      if (pokemonId) {
        return Promise.resolve(asResponse(makePokemon(Number(pokemonId), `poke${pokemonId}`)));
      }

      const speciesId = /\/pokemon-species\/(\d+)\/?$/.exec(url)?.[1];
      if (speciesId) {
        const germanName = GERMAN_SPECIES_NAME_BY_ID[Number(speciesId)];
        return Promise.resolve(asResponse(speciesNames(germanName)));
      }

      return Promise.resolve(asResponse({}, false, 404));
    });

    const { searchPokemon } = await import('./pokemonApi');
    const found = await searchPokemon('ra');

    expect(found).toHaveLength(20);
  });

  it('limits species-index detail requests to bounded concurrency', async () => {
    const results = Array.from({ length: 24 }, (_, index) => ({
      name: `poke${String(index + 1)}`,
      url: `https://pokeapi.co/api/v2/pokemon-species/${String(index + 1)}/`,
    }));
    let inFlightSpecies = 0;
    let maxInFlightSpecies = 0;

    vi.mocked(fetch).mockImplementation((input) => {
      const url = inputToUrl(input);

      if (url.includes('/pokemon-species?limit=1400')) {
        return Promise.resolve(asResponse({ results }));
      }

      const speciesId = /pokemon-species\/(\d+)/.exec(url)?.[1];
      if (speciesId) {
        inFlightSpecies += 1;
        maxInFlightSpecies = Math.max(maxInFlightSpecies, inFlightSpecies);
        return new Promise<Response>((resolve) => {
          setTimeout(() => {
            inFlightSpecies -= 1;
            resolve(asResponse(speciesNames(`Poke${speciesId}`)));
          }, 5);
        });
      }

      const pokemonId = url.split('/').at(-1);
      if (!pokemonId) {
        throw new Error('Pokemon ID missing in URL');
      }

      return Promise.resolve(asResponse(makePokemon(Number(pokemonId), `poke${pokemonId}`)));
    });

    const { searchPokemon } = await import('./pokemonApi');
    await searchPokemon('poke');

    expect(maxInFlightSpecies).toBeLessThanOrEqual(8);
  });

  it('keeps first german text search request volume bounded on cold cache', async () => {
    const results = Array.from({ length: 1400 }, (_, index) => ({
      name: `poke${String(index + 1)}`,
      url: `https://pokeapi.co/api/v2/pokemon-species/${String(index + 1)}/`,
    }));

    vi.mocked(fetch).mockImplementation((input) => {
      const url = inputToUrl(input);

      if (url.includes('/pokemon-species?limit=1400')) {
        return Promise.resolve(asResponse({ results }));
      }

      if (url.endsWith('/pokemon/25')) {
        return Promise.resolve(asResponse(makePokemon(25, 'pikachu')));
      }

      if (url.endsWith('/pokemon-species/25')) {
        return Promise.resolve(asResponse(speciesNames('Pikachu', 10)));
      }

      if (url.endsWith('/evolution-chain/10')) {
        return Promise.resolve(
          asResponse({
            chain: {
              species: { name: 'pichu' },
              evolves_to: [
                {
                  species: { name: 'pikachu' },
                  evolves_to: [{ species: { name: 'raichu' }, evolves_to: [] }],
                },
              ],
            },
          }),
        );
      }

      return Promise.resolve(asResponse({}, false, 404));
    });

    const { searchPokemon } = await import('./pokemonApi');
    const found = await searchPokemon('pikachu');

    expect(found).toHaveLength(1);

    const allCalls = vi.mocked(fetch).mock.calls.map(([url]) => inputToUrl(url));
    const perSpeciesCalls = allCalls.filter((url) => /\/pokemon-species\/\d+\/?$/.test(url));
    expect(perSpeciesCalls).toEqual(['https://pokeapi.co/api/v2/pokemon-species/25']);
    expect(allCalls.length).toBeLessThanOrEqual(4);
  });

  it('uses front_default image when official artwork is missing', async () => {
    vi.mocked(fetch).mockImplementation((input) => {
      const url = inputToUrl(input);

      if (url.includes('/pokemon-species?limit=1400')) {
        return Promise.resolve(
          asResponse({
            results: [{ name: 'bulbasaur', url: 'https://pokeapi.co/api/v2/pokemon-species/1/' }],
          }),
        );
      }

      if (url.endsWith('/pokemon-species/1')) {
        return Promise.resolve(asResponse(speciesNames('Bisasam')));
      }

      if (url.endsWith('/pokemon/1')) {
        return Promise.resolve(
          asResponse({
            id: 1,
            name: 'bulbasaur',
            sprites: {
              front_default: 'https://img/front-bulbasaur.png',
            },
            types: [{ type: { name: 'grass' } }],
          }),
        );
      }

      return Promise.resolve(asResponse({}, false, 404));
    });

    const { searchPokemon } = await import('./pokemonApi');
    const [result] = await searchPokemon('bisa');

    expect(result.image).toBe('https://img/front-bulbasaur.png');
  });

  it('uses null image when no artwork fields are available', async () => {
    vi.mocked(fetch).mockImplementation((input) => {
      const url = inputToUrl(input);

      if (url.includes('/pokemon-species?limit=1400')) {
        return Promise.resolve(
          asResponse({
            results: [{ name: 'metapod', url: 'https://pokeapi.co/api/v2/pokemon-species/11/' }],
          }),
        );
      }

      if (url.endsWith('/pokemon-species/11')) {
        return Promise.resolve(asResponse(speciesNames('Safcon')));
      }

      if (url.endsWith('/pokemon/11')) {
        return Promise.resolve(
          asResponse({
            id: 11,
            name: 'metapod',
            sprites: {},
            types: [{ type: { name: 'bug' } }],
          }),
        );
      }

      return Promise.resolve(asResponse({}, false, 404));
    });

    const { searchPokemon } = await import('./pokemonApi');
    const [result] = await searchPokemon('saf');

    expect(result.image).toBeNull();
  });

  it('falls back to original type name when no german mapping exists', async () => {
    vi.mocked(fetch).mockImplementation((input) => {
      const url = inputToUrl(input);

      if (url.includes('/pokemon-species?limit=1400')) {
        return Promise.resolve(
          asResponse({
            results: [{ name: 'mew', url: 'https://pokeapi.co/api/v2/pokemon-species/151/' }],
          }),
        );
      }

      if (url.endsWith('/pokemon-species/151')) {
        return Promise.resolve(asResponse(speciesNames('Mew')));
      }

      if (url.endsWith('/pokemon/151')) {
        return Promise.resolve(
          asResponse({
            id: 151,
            name: 'mew',
            sprites: {
              other: {
                'official-artwork': {
                  front_default: 'https://img/mew.png',
                },
              },
            },
            types: [{ type: { name: 'cosmic' } }],
          }),
        );
      }

      return Promise.resolve(asResponse({}, false, 404));
    });

    const { searchPokemon } = await import('./pokemonApi');
    const [result] = await searchPokemon('mew');

    expect(result.types[0]?.name).toBe('cosmic');
  });

  it('keeps german index cache between searches', async () => {
    vi.mocked(fetch).mockImplementation((input) => {
      const url = inputToUrl(input);

      if (url.includes('/pokemon-species?limit=1400')) {
        return Promise.resolve(
          asResponse({
            results: [{ name: 'eevee', url: 'https://pokeapi.co/api/v2/pokemon-species/133/' }],
          }),
        );
      }

      if (url.endsWith('/pokemon-species/133')) {
        return Promise.resolve(asResponse(speciesNames('Evoli')));
      }

      if (url.endsWith('/pokemon/133')) {
        return Promise.resolve(asResponse(makePokemon(133, 'eevee')));
      }

      return Promise.resolve(asResponse({}, false, 404));
    });

    const { searchPokemon } = await import('./pokemonApi');

    await searchPokemon('evo');
    await searchPokemon('evo');

    const indexCalls = vi
      .mocked(fetch)
      .mock.calls.filter(([url]) => inputToUrl(url).includes('/pokemon-species?limit=1400')).length;
    expect(indexCalls).toBe(1);
  });

  it('fetches localized detail payload with evolution summary, facts and flavor text', async () => {
    vi.mocked(fetch).mockImplementation((input) => {
      const url = inputToUrl(input);

      if (url.endsWith('/pokemon/25')) {
        return Promise.resolve(
          asResponse({
            id: 25,
            name: 'pikachu',
            height: 4,
            weight: 60,
            sprites: {
              other: {
                'official-artwork': {
                  front_default: 'https://img/pikachu.png',
                },
              },
            },
            types: [{ type: { name: 'electric' } }],
          }),
        );
      }

      if (url.endsWith('/pokemon-species/25')) {
        return Promise.resolve(
          asResponse({
            names: [
              { language: { name: 'en' }, name: 'Pikachu' },
              { language: { name: 'de' }, name: 'Pikachu' },
            ],
            genera: [{ language: { name: 'de' }, genus: 'Maus-Pokemon' }],
            flavor_text_entries: [
              {
                language: { name: 'de' },
                flavor_text: 'Wenn mehrere\nPOKeMON sich versammeln,\tentladen sie Strom.',
              },
            ],
            evolution_chain: {
              url: 'https://pokeapi.co/api/v2/evolution-chain/10/',
            },
          }),
        );
      }

      if (url.endsWith('/evolution-chain/10')) {
        return Promise.resolve(
          asResponse({
            chain: {
              species: {
                name: 'pichu',
                url: 'https://pokeapi.co/api/v2/pokemon-species/172/',
              },
              evolves_to: [
                {
                  species: {
                    name: 'pikachu',
                    url: 'https://pokeapi.co/api/v2/pokemon-species/25/',
                  },
                  evolves_to: [
                    {
                      species: {
                        name: 'raichu',
                        url: 'https://pokeapi.co/api/v2/pokemon-species/26/',
                      },
                      evolves_to: [],
                    },
                  ],
                },
              ],
            },
          }),
        );
      }

      if (url.endsWith('/pokemon-species/172')) {
        return Promise.resolve(asResponse(speciesNames('Pichu')));
      }

      if (url.endsWith('/pokemon-species/26')) {
        return Promise.resolve(asResponse(speciesNames('Raichu')));
      }

      return Promise.resolve(asResponse({}, false, 404));
    });

    const { fetchPokemonDetail } = await import('./pokemonApi');
    const detail = await fetchPokemonDetail(25);

    expect(detail).not.toBeNull();
    expect(detail?.displayName).toBe('Pikachu');
    expect(detail?.heightMeters).toBe(0.4);
    expect(detail?.weightKilograms).toBe(6);
    expect(detail?.category).toBe('Maus-Pokemon');
    expect(detail?.flavorText).toBe('Wenn mehrere POKeMON sich versammeln, entladen sie Strom.');
    expect(detail?.types[0]?.name).toBe('Elektro');
    expect(detail?.evolution.stage).toBe('Phase 1');
    expect(detail?.evolution.sharedPath).toEqual([
      { id: 172, displayName: 'Pichu', image: null, types: [] },
      { id: 25, displayName: 'Pikachu', image: null, types: [] },
    ]);
    expect(detail?.evolution.branchGroups).toEqual([
      {
        originId: 25,
        items: [{ id: 26, displayName: 'Raichu', image: null, types: [] }],
      },
    ]);
  });

  it('returns null when detail endpoint responds with 404', async () => {
    vi.mocked(fetch).mockResolvedValue(asResponse({}, false, 404));
    const { fetchPokemonDetail } = await import('./pokemonApi');
    await expect(fetchPokemonDetail(999999)).resolves.toBeNull();
  });

  it('falls back to Basis detail evolution when pokemon is missing in chain path', async () => {
    vi.mocked(fetch).mockImplementation((input) => {
      const url = inputToUrl(input);

      if (url.endsWith('/pokemon/25')) {
        return Promise.resolve(asResponse(makePokemon(25, 'pikachu')));
      }

      if (url.endsWith('/pokemon-species/25')) {
        return Promise.resolve(asResponse(speciesNames('Pikachu', 10)));
      }

      if (url.endsWith('/evolution-chain/10')) {
        return Promise.resolve(
          asResponse({
            chain: {
              species: { name: 'pichu', url: 'https://pokeapi.co/api/v2/pokemon-species/172/' },
              evolves_to: [{ species: { name: 'raichu' }, evolves_to: [] }],
            },
          }),
        );
      }

      return Promise.resolve(asResponse({}, false, 404));
    });

    const { fetchPokemonDetail } = await import('./pokemonApi');
    const detail = await fetchPokemonDetail(25);

    expect(detail?.evolution.stage).toBe('Basis');
    expect(detail?.evolution.sharedPath).toEqual([]);
    expect(detail?.evolution.branchGroups).toEqual([]);
  });

  it('falls back to Basis detail evolution when evolution chain endpoint is 404', async () => {
    vi.mocked(fetch).mockImplementation((input) => {
      const url = inputToUrl(input);

      if (url.endsWith('/pokemon/25')) {
        return Promise.resolve(asResponse(makePokemon(25, 'pikachu')));
      }

      if (url.endsWith('/pokemon-species/25')) {
        return Promise.resolve(asResponse(speciesNames('Pikachu', 10)));
      }

      if (url.endsWith('/evolution-chain/10')) {
        return Promise.resolve(asResponse({}, false, 404));
      }

      return Promise.resolve(asResponse({}, false, 404));
    });

    const { fetchPokemonDetail } = await import('./pokemonApi');
    const detail = await fetchPokemonDetail(25);

    expect(detail?.evolution.stage).toBe('Basis');
    expect(detail?.evolution.sharedPath).toEqual([]);
    expect(detail?.evolution.branchGroups).toEqual([]);
  });

  it('throws on non-404 errors while fetching detail payload', async () => {
    vi.mocked(fetch).mockResolvedValue(asResponse({}, false, 500));
    const { fetchPokemonDetail } = await import('./pokemonApi');

    await expect(fetchPokemonDetail(25)).rejects.toThrow('Request failed: 500');
  });

  it('falls back to API name and Basis stage when species endpoint is missing for detail view', async () => {
    vi.mocked(fetch).mockImplementation((input) => {
      const url = inputToUrl(input);

      if (url.endsWith('/pokemon/4')) {
        return Promise.resolve(asResponse(makePokemon(4, 'charmander')));
      }

      if (url.endsWith('/pokemon-species/4')) {
        return Promise.resolve(asResponse({}, false, 404));
      }

      return Promise.resolve(asResponse({}, false, 404));
    });

    const { fetchPokemonDetail } = await import('./pokemonApi');
    const detail = await fetchPokemonDetail(4);

    expect(detail?.displayName).toBe('charmander');
    expect(detail?.category).toBeNull();
    expect(detail?.flavorText).toBeNull();
    expect(detail?.evolution.stage).toBe('Basis');
  });

  it('falls back to Basis detail evolution when evolution chain URL is invalid', async () => {
    vi.mocked(fetch).mockImplementation((input) => {
      const url = inputToUrl(input);

      if (url.endsWith('/pokemon/25')) {
        return Promise.resolve(asResponse(makePokemon(25, 'pikachu')));
      }

      if (url.endsWith('/pokemon-species/25')) {
        return Promise.resolve(
          asResponse({
            names: [{ language: { name: 'de' }, name: 'Pikachu' }],
            evolution_chain: {
              url: 'https://pokeapi.co/api/v2/evolution-chain/not-a-number/',
            },
          }),
        );
      }

      return Promise.resolve(asResponse({}, false, 404));
    });

    const { fetchPokemonDetail } = await import('./pokemonApi');
    const detail = await fetchPokemonDetail(25);

    expect(detail?.evolution.stage).toBe('Basis');
  });

  it('uses chain species names when species URLs in evolution nodes are malformed', async () => {
    vi.mocked(fetch).mockImplementation((input) => {
      const url = inputToUrl(input);

      if (url.endsWith('/pokemon/25')) {
        return Promise.resolve(asResponse(makePokemon(25, 'pikachu')));
      }

      if (url.endsWith('/pokemon-species/25')) {
        return Promise.resolve(asResponse(speciesNames('Pikachu', 10)));
      }

      if (url.endsWith('/evolution-chain/10')) {
        return Promise.resolve(
          asResponse({
            chain: {
              species: {
                name: 'pichu',
                url: 'https://pokeapi.co/api/v2/pokemon-species/not-a-number/',
              },
              evolves_to: [
                {
                  species: {
                    name: 'pikachu',
                    url: 'https://pokeapi.co/api/v2/pokemon-species/25/',
                  },
                  evolves_to: [
                    {
                      species: {
                        name: 'raichu',
                        url: 'https://pokeapi.co/api/v2/pokemon-species/also-invalid/',
                      },
                      evolves_to: [],
                    },
                  ],
                },
              ],
            },
          }),
        );
      }

      return Promise.resolve(asResponse({}, false, 404));
    });

    const { fetchPokemonDetail } = await import('./pokemonApi');
    const detail = await fetchPokemonDetail(25);

    expect(detail).not.toBeNull();
    expect(detail?.evolution.stage).toBe('Phase 1');
    expect(detail?.evolution.sharedPath).toEqual([
      { id: 25, displayName: 'Pikachu', image: null, types: [] },
    ]);
    expect(detail?.evolution.branchGroups).toEqual([]);
  });

  it('hides evolution items when chain nodes do not provide species URLs', async () => {
    vi.mocked(fetch).mockImplementation((input) => {
      const url = inputToUrl(input);

      if (url.endsWith('/pokemon/25')) {
        return Promise.resolve(asResponse(makePokemon(25, 'pikachu')));
      }

      if (url.endsWith('/pokemon-species/25')) {
        return Promise.resolve(asResponse(speciesNames('Pikachu', 10)));
      }

      if (url.endsWith('/evolution-chain/10')) {
        return Promise.resolve(
          asResponse({
            chain: {
              species: { name: 'pichu' },
              evolves_to: [
                {
                  species: {
                    name: 'pikachu',
                    url: 'https://pokeapi.co/api/v2/pokemon-species/25/',
                  },
                  evolves_to: [{ species: { name: 'raichu' }, evolves_to: [] }],
                },
              ],
            },
          }),
        );
      }

      return Promise.resolve(asResponse({}, false, 404));
    });

    const { fetchPokemonDetail } = await import('./pokemonApi');
    const detail = await fetchPokemonDetail(25);

    expect(detail?.evolution.stage).toBe('Phase 1');
    expect(detail?.evolution.sharedPath).toEqual([
      { id: 25, displayName: 'Pikachu', image: null, types: [] },
    ]);
    expect(detail?.evolution.branchGroups).toEqual([]);
  });

  it('keeps later branch groups when current chain node URL is malformed', async () => {
    vi.mocked(fetch).mockImplementation((input) => {
      const url = inputToUrl(input);

      if (url.endsWith('/pokemon/25')) {
        return Promise.resolve(asResponse(makePokemon(25, 'pikachu')));
      }

      if (url.endsWith('/pokemon-species/25')) {
        return Promise.resolve(asResponse(speciesNames('Pikachu', 10)));
      }

      if (url.endsWith('/evolution-chain/10')) {
        return Promise.resolve(
          asResponse({
            chain: {
              species: { name: 'pichu', url: 'https://pokeapi.co/api/v2/pokemon-species/172/' },
              evolves_to: [
                {
                  species: {
                    name: 'pikachu',
                    url: 'https://pokeapi.co/api/v2/pokemon-species/not-a-number/',
                  },
                  evolves_to: [
                    {
                      species: {
                        name: 'raichu',
                        url: 'https://pokeapi.co/api/v2/pokemon-species/26/',
                      },
                      evolves_to: [],
                    },
                  ],
                },
              ],
            },
          }),
        );
      }

      if (url.endsWith('/pokemon-species/26')) {
        return Promise.resolve(asResponse(speciesNames('Raichu')));
      }

      if (url.endsWith('/pokemon/raichu')) {
        return Promise.resolve(asResponse(makePokemon(26, 'raichu')));
      }

      return Promise.resolve(asResponse({}, false, 404));
    });

    const { fetchPokemonDetail } = await import('./pokemonApi');
    const detail = await fetchPokemonDetail(25);

    expect(detail?.evolution.stage).toBe('Phase 1');
    expect(detail?.evolution.branchGroups).toEqual([
      {
        originId: 25,
        items: [
          {
            id: 26,
            displayName: 'Raichu',
            image: 'https://img/raichu.png',
            types: [{ name: 'Elektro' }],
          },
        ],
      },
    ]);
    expect(detail?.evolution.sharedPath).toEqual([
      {
        id: 172,
        displayName: 'pichu',
        image: null,
        types: [],
      },
    ]);
  });

  it('keeps detail usable when evolution-chain lookup fails with non-404 status', async () => {
    vi.mocked(fetch).mockImplementation((input) => {
      const url = inputToUrl(input);

      if (url.endsWith('/pokemon/25')) {
        return Promise.resolve(asResponse(makePokemon(25, 'pikachu')));
      }

      if (url.endsWith('/pokemon-species/25')) {
        return Promise.resolve(asResponse(speciesNames('Pikachu', 10)));
      }

      if (url.endsWith('/evolution-chain/10')) {
        return Promise.resolve(asResponse({}, false, 500));
      }

      return Promise.resolve(asResponse({}, false, 404));
    });

    const { fetchPokemonDetail } = await import('./pokemonApi');
    const detail = await fetchPokemonDetail(25);

    expect(detail).not.toBeNull();
    expect(detail?.displayName).toBe('Pikachu');
    expect(detail?.evolution.stage).toBe('Basis');
    expect(detail?.evolution.sharedPath).toEqual([]);
    expect(detail?.evolution.branchGroups).toEqual([]);
  });

  it('does not cache degraded detail payload when evolution lookup fails transiently', async () => {
    let evolutionCalls = 0;

    vi.mocked(fetch).mockImplementation((input) => {
      const url = inputToUrl(input);

      if (url.endsWith('/pokemon/25')) {
        return Promise.resolve(asResponse(makePokemon(25, 'pikachu')));
      }

      if (url.endsWith('/pokemon-species/25')) {
        return Promise.resolve(asResponse(speciesNames('Pikachu', 10)));
      }

      if (url.endsWith('/evolution-chain/10')) {
        evolutionCalls += 1;
        if (evolutionCalls === 1) {
          return Promise.resolve(asResponse({}, false, 500));
        }

        return Promise.resolve(
          asResponse({
            chain: {
              species: {
                name: 'pichu',
                url: 'https://pokeapi.co/api/v2/pokemon-species/172/',
              },
              evolves_to: [
                {
                  species: {
                    name: 'pikachu',
                    url: 'https://pokeapi.co/api/v2/pokemon-species/25/',
                  },
                  evolves_to: [
                    {
                      species: {
                        name: 'raichu',
                        url: 'https://pokeapi.co/api/v2/pokemon-species/26/',
                      },
                      evolves_to: [],
                    },
                  ],
                },
              ],
            },
          }),
        );
      }

      if (url.endsWith('/pokemon-species/172')) {
        return Promise.resolve(asResponse(speciesNames('Pichu')));
      }

      if (url.endsWith('/pokemon-species/26')) {
        return Promise.resolve(asResponse(speciesNames('Raichu')));
      }

      if (url.endsWith('/pokemon/pichu')) {
        return Promise.resolve(asResponse(makePokemon(172, 'pichu')));
      }

      if (url.endsWith('/pokemon/raichu')) {
        return Promise.resolve(asResponse(makePokemon(26, 'raichu')));
      }

      return Promise.resolve(asResponse({}, false, 404));
    });

    const { fetchPokemonDetail } = await import('./pokemonApi');
    const first = await fetchPokemonDetail(25);
    const second = await fetchPokemonDetail(25);

    expect(first?.evolution.branchGroups).toEqual([]);
    expect(second?.evolution.branchGroups).toEqual([
      {
        originId: 25,
        items: [
          {
            id: 26,
            displayName: 'Raichu',
            image: 'https://img/raichu.png',
            types: [{ name: 'Elektro' }],
          },
        ],
      },
    ]);

    const pokemon25Calls = vi
      .mocked(fetch)
      .mock.calls.filter(([url]) => inputToUrl(url).endsWith('/pokemon/25')).length;
    const chainCalls = vi
      .mocked(fetch)
      .mock.calls.filter(([url]) => inputToUrl(url).endsWith('/evolution-chain/10')).length;
    expect(pokemon25Calls).toBe(2);
    expect(chainCalls).toBe(2);
  });

  it('keeps detail usable when adjacent evolution artwork lookup fails with non-404 status', async () => {
    vi.mocked(fetch).mockImplementation((input) => {
      const url = inputToUrl(input);

      if (url.endsWith('/pokemon/25')) {
        return Promise.resolve(asResponse(makePokemon(25, 'pikachu')));
      }

      if (url.endsWith('/pokemon-species/25')) {
        return Promise.resolve(asResponse(speciesNames('Pikachu', 10)));
      }

      if (url.endsWith('/evolution-chain/10')) {
        return Promise.resolve(
          asResponse({
            chain: {
              species: {
                name: 'pichu',
                url: 'https://pokeapi.co/api/v2/pokemon-species/172/',
              },
              evolves_to: [
                {
                  species: {
                    name: 'pikachu',
                    url: 'https://pokeapi.co/api/v2/pokemon-species/25/',
                  },
                  evolves_to: [
                    {
                      species: {
                        name: 'raichu',
                        url: 'https://pokeapi.co/api/v2/pokemon-species/26/',
                      },
                      evolves_to: [],
                    },
                  ],
                },
              ],
            },
          }),
        );
      }

      if (url.endsWith('/pokemon-species/172')) {
        return Promise.resolve(asResponse(speciesNames('Pichu')));
      }

      if (url.endsWith('/pokemon-species/26')) {
        return Promise.resolve(asResponse(speciesNames('Raichu')));
      }

      if (url.endsWith('/pokemon/pichu')) {
        return Promise.resolve(asResponse({}, false, 404));
      }

      if (url.endsWith('/pokemon/raichu')) {
        return Promise.resolve(asResponse({}, false, 500));
      }

      return Promise.resolve(asResponse({}, false, 404));
    });

    const { fetchPokemonDetail } = await import('./pokemonApi');
    const detail = await fetchPokemonDetail(25);

    expect(detail).not.toBeNull();
    expect(detail?.displayName).toBe('Pikachu');
    expect(detail?.evolution.stage).toBe('Basis');
    expect(detail?.evolution.sharedPath).toEqual([]);
    expect(detail?.evolution.branchGroups).toEqual([]);
  });

  it('keeps abort behavior when the evolution fetch is aborted by caller signal', async () => {
    const controller = new AbortController();
    vi.mocked(fetch).mockImplementation((input) => {
      const url = inputToUrl(input);

      if (url.endsWith('/pokemon/25')) {
        return Promise.resolve(asResponse(makePokemon(25, 'pikachu')));
      }

      if (url.endsWith('/pokemon-species/25')) {
        return Promise.resolve(asResponse(speciesNames('Pikachu', 10)));
      }

      if (url.endsWith('/evolution-chain/10')) {
        controller.abort();
        return Promise.reject(new DOMException('Aborted', 'AbortError'));
      }

      return Promise.resolve(asResponse({}, false, 404));
    });

    const { fetchPokemonDetail } = await import('./pokemonApi');
    await expect(fetchPokemonDetail(25, controller.signal)).rejects.toMatchObject({
      name: 'AbortError',
    });
  });

  it('returns null flavor text when flavor entries do not contain german', async () => {
    vi.mocked(fetch).mockImplementation((input) => {
      const url = inputToUrl(input);

      if (url.endsWith('/pokemon/25')) {
        return Promise.resolve(asResponse(makePokemon(25, 'pikachu')));
      }

      if (url.endsWith('/pokemon-species/25')) {
        return Promise.resolve(
          asResponse({
            names: [{ language: { name: 'de' }, name: 'Pikachu' }],
            flavor_text_entries: [{ language: { name: 'en' }, flavor_text: 'english only' }],
          }),
        );
      }

      return Promise.resolve(asResponse({}, false, 404));
    });

    const { fetchPokemonDetail } = await import('./pokemonApi');
    const detail = await fetchPokemonDetail(25);

    expect(detail?.flavorText).toBeNull();
  });

  it('returns null flavor text when german entry becomes empty after cleanup', async () => {
    vi.mocked(fetch).mockImplementation((input) => {
      const url = inputToUrl(input);

      if (url.endsWith('/pokemon/25')) {
        return Promise.resolve(asResponse(makePokemon(25, 'pikachu')));
      }

      if (url.endsWith('/pokemon-species/25')) {
        return Promise.resolve(
          asResponse({
            names: [{ language: { name: 'de' }, name: 'Pikachu' }],
            flavor_text_entries: [{ language: { name: 'de' }, flavor_text: '\n\t \r' }],
          }),
        );
      }

      return Promise.resolve(asResponse({}, false, 404));
    });

    const { fetchPokemonDetail } = await import('./pokemonApi');
    const detail = await fetchPokemonDetail(25);

    expect(detail?.flavorText).toBeNull();
  });

  it('falls back to chain names when adjacent species localization lookups are missing', async () => {
    vi.mocked(fetch).mockImplementation((input) => {
      const url = inputToUrl(input);

      if (url.endsWith('/pokemon/6')) {
        return Promise.resolve(asResponse(makePokemon(6, 'charizard')));
      }

      if (url.endsWith('/pokemon-species/6')) {
        return Promise.resolve(asResponse(speciesNames('Glurak', 4)));
      }

      if (url.endsWith('/evolution-chain/4')) {
        return Promise.resolve(
          asResponse({
            chain: {
              species: {
                name: 'charmander',
                url: 'https://pokeapi.co/api/v2/pokemon-species/4/',
              },
              evolves_to: [
                {
                  species: {
                    name: 'charmeleon',
                    url: 'https://pokeapi.co/api/v2/pokemon-species/5/',
                  },
                  evolves_to: [
                    {
                      species: {
                        name: 'charizard',
                        url: 'https://pokeapi.co/api/v2/pokemon-species/6/',
                      },
                      evolves_to: [],
                    },
                  ],
                },
              ],
            },
          }),
        );
      }

      if (url.endsWith('/pokemon-species/5')) {
        return Promise.resolve(asResponse({}, false, 404));
      }

      return Promise.resolve(asResponse({}, false, 404));
    });

    const { fetchPokemonDetail } = await import('./pokemonApi');
    const detail = await fetchPokemonDetail(6);

    expect(detail?.evolution.stage).toBe('Phase 2');
  });

  it('uses root-only shared path and still resolves later branch groups', async () => {
    vi.mocked(fetch).mockImplementation((input) => {
      const url = inputToUrl(input);

      if (url.endsWith('/pokemon/1')) {
        return Promise.resolve(asResponse(makePokemon(1, 'bulbasaur')));
      }

      if (url.endsWith('/pokemon-species/1')) {
        return Promise.resolve(asResponse(speciesNames('Bisasam', 1)));
      }

      if (url.endsWith('/evolution-chain/1')) {
        return Promise.resolve(
          asResponse({
            chain: {
              species: {
                name: 'bulbasaur',
                url: 'https://pokeapi.co/api/v2/pokemon-species/1/',
              },
              evolves_to: [
                {
                  species: {
                    name: 'ivysaur',
                    url: 'https://pokeapi.co/api/v2/pokemon-species/2/',
                  },
                  evolves_to: [],
                },
              ],
            },
          }),
        );
      }

      if (url.endsWith('/pokemon-species/2')) {
        return Promise.resolve(asResponse(speciesNames('Bisaknosp')));
      }

      return Promise.resolve(asResponse({}, false, 404));
    });

    const { fetchPokemonDetail } = await import('./pokemonApi');
    const detail = await fetchPokemonDetail(1);

    expect(detail?.evolution.stage).toBe('Basis');
  });

  it('returns all reachable later stages for a basis pokemon in a linear chain', async () => {
    vi.mocked(fetch).mockImplementation((input) => {
      const url = inputToUrl(input);

      if (url.endsWith('/pokemon/1')) {
        return Promise.resolve(asResponse(makePokemon(1, 'bulbasaur')));
      }

      if (url.endsWith('/pokemon-species/1')) {
        return Promise.resolve(asResponse(speciesNames('Bisasam', 1)));
      }

      if (url.endsWith('/evolution-chain/1')) {
        return Promise.resolve(
          asResponse({
            chain: {
              species: { name: 'bulbasaur', url: 'https://pokeapi.co/api/v2/pokemon-species/1/' },
              evolves_to: [
                {
                  species: { name: 'ivysaur', url: 'https://pokeapi.co/api/v2/pokemon-species/2/' },
                  evolves_to: [
                    {
                      species: {
                        name: 'venusaur',
                        url: 'https://pokeapi.co/api/v2/pokemon-species/3/',
                      },
                      evolves_to: [],
                    },
                  ],
                },
              ],
            },
          }),
        );
      }

      if (url.endsWith('/pokemon-species/2')) {
        return Promise.resolve(asResponse(speciesNames('Bisaknosp')));
      }

      if (url.endsWith('/pokemon-species/3')) {
        return Promise.resolve(asResponse(speciesNames('Bisaflor')));
      }

      if (url.endsWith('/pokemon/ivysaur')) {
        return Promise.resolve(asResponse(makePokemon(2, 'ivysaur')));
      }

      if (url.endsWith('/pokemon/venusaur')) {
        return Promise.resolve(asResponse(makePokemon(3, 'venusaur')));
      }

      return Promise.resolve(asResponse({}, false, 404));
    });

    const { fetchPokemonDetail } = await import('./pokemonApi');
    const detail = await fetchPokemonDetail(1);

    expect(detail?.evolution.stage).toBe('Basis');
    expect(detail?.evolution.branchGroups).toEqual([
      {
        originId: 1,
        items: [
          {
            id: 2,
            displayName: 'Bisaknosp',
            image: 'https://img/ivysaur.png',
            types: [{ name: 'Elektro' }],
          },
          {
            id: 3,
            displayName: 'Bisaflor',
            image: 'https://img/venusaur.png',
            types: [{ name: 'Elektro' }],
          },
        ],
      },
    ]);
  });

  it('returns all reachable later stages for branching evolution paths', async () => {
    vi.mocked(fetch).mockImplementation((input) => {
      const url = inputToUrl(input);

      if (url.endsWith('/pokemon/133')) {
        return Promise.resolve(asResponse(makePokemon(133, 'eevee')));
      }

      if (url.endsWith('/pokemon-species/133')) {
        return Promise.resolve(asResponse(speciesNames('Evoli', 67)));
      }

      if (url.endsWith('/evolution-chain/67')) {
        return Promise.resolve(
          asResponse({
            chain: {
              species: { name: 'eevee', url: 'https://pokeapi.co/api/v2/pokemon-species/133/' },
              evolves_to: [
                {
                  species: {
                    name: 'vaporeon',
                    url: 'https://pokeapi.co/api/v2/pokemon-species/134/',
                  },
                  evolves_to: [
                    {
                      species: {
                        name: 'deepvaporeon',
                        url: 'https://pokeapi.co/api/v2/pokemon-species/10001/',
                      },
                      evolves_to: [],
                    },
                  ],
                },
                {
                  species: {
                    name: 'jolteon',
                    url: 'https://pokeapi.co/api/v2/pokemon-species/135/',
                  },
                  evolves_to: [],
                },
              ],
            },
          }),
        );
      }

      if (url.endsWith('/pokemon-species/134')) {
        return Promise.resolve(asResponse(speciesNames('Aquana')));
      }

      if (url.endsWith('/pokemon-species/135')) {
        return Promise.resolve(asResponse(speciesNames('Blitza')));
      }

      if (url.endsWith('/pokemon-species/10001')) {
        return Promise.resolve(asResponse(speciesNames('Tiefaquana')));
      }

      if (url.endsWith('/pokemon/vaporeon')) {
        return Promise.resolve(asResponse(makePokemon(134, 'vaporeon')));
      }

      if (url.endsWith('/pokemon/jolteon')) {
        return Promise.resolve(asResponse(makePokemon(135, 'jolteon')));
      }

      if (url.endsWith('/pokemon/deepvaporeon')) {
        return Promise.resolve(asResponse(makePokemon(10001, 'deepvaporeon')));
      }

      return Promise.resolve(asResponse({}, false, 404));
    });

    const { fetchPokemonDetail } = await import('./pokemonApi');
    const detail = await fetchPokemonDetail(133);

    expect(detail).not.toBeNull();
    if (!detail) {
      throw new Error('Expected detail payload for Evoli');
    }

    expect(detail.evolution.stage).toBe('Basis');
    expect(detail.evolution.sharedPath.map((item) => item.displayName)).toEqual(['Evoli']);
    expect(
      detail.evolution.branchGroups.map((group) => group.items.map((item) => item.displayName)),
    ).toEqual([['Aquana', 'Tiefaquana'], ['Blitza']]);
  });

  it('splits branch groups when branching starts after one linear intermediate stage', async () => {
    vi.mocked(fetch).mockImplementation((input) => {
      const url = inputToUrl(input);

      if (url.endsWith('/pokemon/1')) {
        return Promise.resolve(asResponse(makePokemon(1, 'rootmon')));
      }

      if (url.endsWith('/pokemon-species/1')) {
        return Promise.resolve(asResponse(speciesNames('Wurzel', 99)));
      }

      if (url.endsWith('/evolution-chain/99')) {
        return Promise.resolve(
          asResponse({
            chain: {
              species: { name: 'rootmon', url: 'https://pokeapi.co/api/v2/pokemon-species/1/' },
              evolves_to: [
                {
                  species: { name: 'midmon', url: 'https://pokeapi.co/api/v2/pokemon-species/2/' },
                  evolves_to: [
                    {
                      species: {
                        name: 'branchone',
                        url: 'https://pokeapi.co/api/v2/pokemon-species/3/',
                      },
                      evolves_to: [],
                    },
                    {
                      species: {
                        name: 'branchtwo',
                        url: 'https://pokeapi.co/api/v2/pokemon-species/4/',
                      },
                      evolves_to: [],
                    },
                  ],
                },
              ],
            },
          }),
        );
      }

      if (url.endsWith('/pokemon-species/2')) {
        return Promise.resolve(asResponse(speciesNames('Mitte')));
      }

      if (url.endsWith('/pokemon-species/3')) {
        return Promise.resolve(asResponse(speciesNames('Ast Eins')));
      }

      if (url.endsWith('/pokemon-species/4')) {
        return Promise.resolve(asResponse(speciesNames('Ast Zwei')));
      }

      if (url.endsWith('/pokemon/midmon')) {
        return Promise.resolve(asResponse(makePokemon(2, 'midmon')));
      }

      if (url.endsWith('/pokemon/branchone')) {
        return Promise.resolve(asResponse(makePokemon(3, 'branchone')));
      }

      if (url.endsWith('/pokemon/branchtwo')) {
        return Promise.resolve(asResponse(makePokemon(4, 'branchtwo')));
      }

      return Promise.resolve(asResponse({}, false, 404));
    });

    const { fetchPokemonDetail } = await import('./pokemonApi');
    const detail = await fetchPokemonDetail(1);

    expect(detail?.evolution.branchGroups).toEqual([
      {
        originId: 1,
        items: [
          {
            id: 2,
            displayName: 'Mitte',
            image: 'https://img/midmon.png',
            types: [{ name: 'Elektro' }],
          },
          {
            id: 3,
            displayName: 'Ast Eins',
            image: 'https://img/branchone.png',
            types: [{ name: 'Elektro' }],
          },
        ],
      },
      {
        originId: 1,
        items: [
          {
            id: 2,
            displayName: 'Mitte',
            image: 'https://img/midmon.png',
            types: [{ name: 'Elektro' }],
          },
          {
            id: 4,
            displayName: 'Ast Zwei',
            image: 'https://img/branchtwo.png',
            types: [{ name: 'Elektro' }],
          },
        ],
      },
    ]);
    expect(detail?.evolution.branchGroups).toEqual([
      {
        originId: 1,
        items: [
          {
            id: 2,
            displayName: 'Mitte',
            image: 'https://img/midmon.png',
            types: [{ name: 'Elektro' }],
          },
          {
            id: 3,
            displayName: 'Ast Eins',
            image: 'https://img/branchone.png',
            types: [{ name: 'Elektro' }],
          },
        ],
      },
      {
        originId: 1,
        items: [
          {
            id: 2,
            displayName: 'Mitte',
            image: 'https://img/midmon.png',
            types: [{ name: 'Elektro' }],
          },
          {
            id: 4,
            displayName: 'Ast Zwei',
            image: 'https://img/branchtwo.png',
            types: [{ name: 'Elektro' }],
          },
        ],
      },
    ]);
  });

  it('maps localized type chips on shared path and branch items with max of two chips', async () => {
    vi.mocked(fetch).mockImplementation((input) => {
      const url = inputToUrl(input);

      if (url.endsWith('/pokemon/1') || url.endsWith('/pokemon/bulbasaur')) {
        return Promise.resolve(
          asResponse({
            ...makePokemon(1, 'bulbasaur'),
            types: [
              { type: { name: 'grass' } },
              { type: { name: 'poison' } },
              { type: { name: 'fairy' } },
            ],
          }),
        );
      }

      if (url.endsWith('/pokemon/2') || url.endsWith('/pokemon/ivysaur')) {
        return Promise.resolve(
          asResponse({
            ...makePokemon(2, 'ivysaur'),
            types: [
              { type: { name: 'grass' } },
              { type: { name: 'poison' } },
              { type: { name: 'dragon' } },
            ],
          }),
        );
      }

      if (url.endsWith('/pokemon-species/1')) {
        return Promise.resolve(asResponse(speciesNames('Bisasam', 1)));
      }

      if (url.endsWith('/pokemon-species/2')) {
        return Promise.resolve(asResponse(speciesNames('Bisaknosp')));
      }

      if (url.endsWith('/evolution-chain/1')) {
        return Promise.resolve(
          asResponse({
            chain: {
              species: { name: 'bulbasaur', url: 'https://pokeapi.co/api/v2/pokemon-species/1/' },
              evolves_to: [
                {
                  species: { name: 'ivysaur', url: 'https://pokeapi.co/api/v2/pokemon-species/2/' },
                  evolves_to: [],
                },
              ],
            },
          }),
        );
      }

      return Promise.resolve(asResponse({}, false, 404));
    });

    const { fetchPokemonDetail } = await import('./pokemonApi');
    const detail = await fetchPokemonDetail(1);

    expect(detail?.evolution.sharedPath).toEqual([
      {
        id: 1,
        displayName: 'Bisasam',
        image: 'https://img/bulbasaur.png',
        types: [{ name: 'Pflanze' }, { name: 'Gift' }],
      },
    ]);
    expect(detail?.evolution.branchGroups).toEqual([
      {
        originId: 1,
        items: [
          {
            id: 2,
            displayName: 'Bisaknosp',
            image: 'https://img/ivysaur.png',
            types: [{ name: 'Pflanze' }, { name: 'Gift' }],
          },
        ],
      },
    ]);
  });

  it('reuses cached detail payload and avoids repeated backend calls for same detail id', async () => {
    vi.mocked(fetch).mockImplementation((input) => {
      const url = inputToUrl(input);

      if (url.endsWith('/pokemon/25')) {
        return Promise.resolve(asResponse(makePokemon(25, 'pikachu')));
      }

      if (url.endsWith('/pokemon-species/25')) {
        return Promise.resolve(asResponse(speciesNames('Pikachu', 10)));
      }

      if (url.endsWith('/evolution-chain/10')) {
        return Promise.resolve(
          asResponse({
            chain: {
              species: { name: 'pichu', url: 'https://pokeapi.co/api/v2/pokemon-species/172/' },
              evolves_to: [
                {
                  species: {
                    name: 'pikachu',
                    url: 'https://pokeapi.co/api/v2/pokemon-species/25/',
                  },
                  evolves_to: [
                    {
                      species: {
                        name: 'raichu',
                        url: 'https://pokeapi.co/api/v2/pokemon-species/26/',
                      },
                      evolves_to: [],
                    },
                  ],
                },
              ],
            },
          }),
        );
      }

      if (url.endsWith('/pokemon-species/172')) {
        return Promise.resolve(asResponse(speciesNames('Pichu')));
      }

      if (url.endsWith('/pokemon-species/26')) {
        return Promise.resolve(asResponse(speciesNames('Raichu')));
      }

      if (url.endsWith('/pokemon/pichu')) {
        return Promise.resolve(asResponse(makePokemon(172, 'pichu')));
      }

      if (url.endsWith('/pokemon/raichu')) {
        return Promise.resolve(asResponse(makePokemon(26, 'raichu')));
      }

      return Promise.resolve(asResponse({}, false, 404));
    });

    const { fetchPokemonDetail } = await import('./pokemonApi');
    const first = await fetchPokemonDetail(25);
    const second = await fetchPokemonDetail(25);

    expect(first).not.toBeNull();
    expect(second).toEqual(first);

    const pokemon25Calls = vi
      .mocked(fetch)
      .mock.calls.filter(([url]) => inputToUrl(url).endsWith('/pokemon/25')).length;
    const chainCalls = vi
      .mocked(fetch)
      .mock.calls.filter(([url]) => inputToUrl(url).endsWith('/evolution-chain/10')).length;
    expect(pokemon25Calls).toBe(1);
    expect(chainCalls).toBe(1);
  });

  it('reuses cached evolution items across different detail ids in the same chain', async () => {
    vi.mocked(fetch).mockImplementation((input) => {
      const url = inputToUrl(input);

      if (url.endsWith('/pokemon/25')) {
        return Promise.resolve(asResponse(makePokemon(25, 'pikachu')));
      }

      if (url.endsWith('/pokemon/26')) {
        return Promise.resolve(asResponse(makePokemon(26, 'raichu')));
      }

      if (url.endsWith('/pokemon-species/25')) {
        return Promise.resolve(asResponse(speciesNames('Pikachu', 10)));
      }

      if (url.endsWith('/pokemon-species/26')) {
        return Promise.resolve(asResponse(speciesNames('Raichu', 10)));
      }

      if (url.endsWith('/evolution-chain/10')) {
        return Promise.resolve(
          asResponse({
            chain: {
              species: { name: 'pichu', url: 'https://pokeapi.co/api/v2/pokemon-species/172/' },
              evolves_to: [
                {
                  species: {
                    name: 'pikachu',
                    url: 'https://pokeapi.co/api/v2/pokemon-species/25/',
                  },
                  evolves_to: [
                    {
                      species: {
                        name: 'raichu',
                        url: 'https://pokeapi.co/api/v2/pokemon-species/26/',
                      },
                      evolves_to: [],
                    },
                  ],
                },
              ],
            },
          }),
        );
      }

      if (url.endsWith('/pokemon-species/172')) {
        return Promise.resolve(asResponse(speciesNames('Pichu')));
      }

      if (url.endsWith('/pokemon/pichu')) {
        return Promise.resolve(asResponse(makePokemon(172, 'pichu')));
      }

      if (url.endsWith('/pokemon/pikachu')) {
        return Promise.resolve(asResponse(makePokemon(25, 'pikachu')));
      }

      if (url.endsWith('/pokemon/raichu')) {
        return Promise.resolve(asResponse(makePokemon(26, 'raichu')));
      }

      return Promise.resolve(asResponse({}, false, 404));
    });

    const { fetchPokemonDetail } = await import('./pokemonApi');
    const first = await fetchPokemonDetail(25);
    const second = await fetchPokemonDetail(26);

    expect(first).not.toBeNull();
    expect(second).not.toBeNull();

    const pichuCalls = vi
      .mocked(fetch)
      .mock.calls.filter(([url]) => inputToUrl(url).endsWith('/pokemon/pichu')).length;
    expect(pichuCalls).toBe(1);
  });
});
