import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

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

  it('keeps aborted signals as AbortError when signal is already aborted', async () => {
    const abortedSignal = { aborted: true, reason: undefined } as unknown as AbortSignal;
    const { searchPokemon } = await import('./pokemonApi');

    await expect(searchPokemon('25', abortedSignal)).rejects.toMatchObject({
      name: 'AbortError',
    });
    expect(fetch).not.toHaveBeenCalled();
  });

  it('exposes type guard for SearchPokemonError', async () => {
    const { SearchPokemonError, isSearchPokemonError } = await import('./pokemonApi');
    const known = new SearchPokemonError('server', 'boom', 500);

    expect(isSearchPokemonError(known)).toBe(true);
    expect(isSearchPokemonError(new Error('boom'))).toBe(false);
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

  it('maps network failures to SearchPokemonError(network)', async () => {
    vi.mocked(fetch).mockRejectedValue(new Error('socket hang up'));
    const { searchPokemon } = await import('./pokemonApi');

    await expect(searchPokemon('25')).rejects.toMatchObject({
      name: 'SearchPokemonError',
      code: 'network',
    });
  });

  it('maps timeout failures to SearchPokemonError(timeout)', async () => {
    vi.mocked(fetch).mockRejectedValue(new DOMException('Timed out', 'TimeoutError'));
    const { searchPokemon } = await import('./pokemonApi');

    await expect(searchPokemon('25')).rejects.toMatchObject({
      name: 'SearchPokemonError',
      code: 'timeout',
    });
  });

  it('maps non-user aborts to SearchPokemonError(timeout)', async () => {
    vi.mocked(fetch).mockRejectedValue(new DOMException('Aborted', 'AbortError'));
    const { searchPokemon } = await import('./pokemonApi');

    await expect(searchPokemon('25')).rejects.toMatchObject({
      name: 'SearchPokemonError',
      code: 'timeout',
    });
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

  it('prioritizes exact german match before fuzzy results', async () => {
    vi.mocked(fetch).mockImplementation((input) => {
      const url = inputToUrl(input);

      if (url.includes('/pokemon-species?limit=1400')) {
        return Promise.resolve(
          asResponse({
            results: [
              { name: 'pikachu', url: 'https://pokeapi.co/api/v2/pokemon-species/25/' },
              { name: 'pikipek', url: 'https://pokeapi.co/api/v2/pokemon-species/731/' },
            ],
          }),
        );
      }

      if (url.endsWith('/pokemon-species/25')) {
        return Promise.resolve(asResponse(speciesNames('Pikachu')));
      }

      if (url.endsWith('/pokemon-species/731')) {
        return Promise.resolve(asResponse(speciesNames('Pikadings')));
      }

      if (url.endsWith('/pokemon/25')) {
        return Promise.resolve(asResponse(makePokemon(25, 'pikachu')));
      }

      if (url.endsWith('/pokemon/731')) {
        return Promise.resolve(asResponse(makePokemon(731, 'pikipek')));
      }

      return Promise.resolve(asResponse({}, false, 404));
    });

    const { searchPokemon } = await import('./pokemonApi');
    const results = await searchPokemon('pika');

    expect(results).toHaveLength(2);
    expect(results[0]?.displayName).toBe('Pikachu');
    expect(results[1]?.displayName).toBe('Pikadings');
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

  it('throws when species detail lookup fails with non-404', async () => {
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
        return Promise.resolve(asResponse({}, false, 500));
      }

      return Promise.resolve(asResponse({}, false, 404));
    });

    const { searchPokemon } = await import('./pokemonApi');
    await expect(searchPokemon('pik')).rejects.toThrow('Request failed: 500');
  });

  it('caps german-name matches at 20', async () => {
    const results = Array.from({ length: 30 }, (_, index) => ({
      name: `poke${String(index)}`,
      url: `https://pokeapi.co/api/v2/pokemon-species/${String(index + 1)}/`,
    }));

    vi.mocked(fetch).mockImplementation((input) => {
      const url = inputToUrl(input);

      if (url.includes('/pokemon-species?limit=1400')) {
        return Promise.resolve(asResponse({ results }));
      }

      const speciesId = /pokemon-species\/(\d+)/.exec(url)?.[1];
      if (speciesId) {
        return Promise.resolve(asResponse(speciesNames(`Poke${speciesId}`)));
      }

      const pokemonId = url.split('/').at(-1);
      if (!pokemonId) {
        throw new Error('Pokemon ID missing in URL');
      }
      return Promise.resolve(asResponse(makePokemon(Number(pokemonId), `poke${pokemonId}`)));
    });

    const { searchPokemon } = await import('./pokemonApi');
    const found = await searchPokemon('poke');

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

  it('finds and prioritizes an exact match even when it appears late in the index', async () => {
    const results = Array.from({ length: 1400 }, (_, index) => ({
      name: `poke${String(index + 1)}`,
      url: `https://pokeapi.co/api/v2/pokemon-species/${String(index + 1)}/`,
    }));

    vi.mocked(fetch).mockImplementation((input) => {
      const url = inputToUrl(input);

      if (url.includes('/pokemon-species?limit=1400')) {
        return Promise.resolve(asResponse({ results }));
      }

      const speciesId = /pokemon-species\/(\d+)/.exec(url)?.[1];
      if (speciesId) {
        if (speciesId === '1000') {
          return Promise.resolve(asResponse(speciesNames('Pika')));
        }

        return Promise.resolve(asResponse(speciesNames(`Pika${speciesId}`)));
      }

      const pokemonId = url.split('/').at(-1);
      if (!pokemonId) {
        throw new Error('Pokemon ID missing in URL');
      }

      return Promise.resolve(asResponse(makePokemon(Number(pokemonId), `poke${pokemonId}`)));
    });

    const { searchPokemon } = await import('./pokemonApi');
    const found = await searchPokemon('pika');

    expect(found).toHaveLength(20);
    expect(found[0]?.id).toBe(1000);
    expect(found[0]?.displayName).toBe('Pika');
  });

  it('limits additional localization work after finding an exact match', async () => {
    const results = Array.from({ length: 1400 }, (_, index) => ({
      name: `poke${String(index + 1)}`,
      url: `https://pokeapi.co/api/v2/pokemon-species/${String(index + 1)}/`,
    }));
    let localizedSpeciesCalls = 0;

    vi.mocked(fetch).mockImplementation((input) => {
      const url = inputToUrl(input);

      if (url.includes('/pokemon-species?limit=1400')) {
        return Promise.resolve(asResponse({ results }));
      }

      const speciesId = /pokemon-species\/(\d+)/.exec(url)?.[1];
      if (speciesId) {
        localizedSpeciesCalls += 1;
        if (speciesId === '1') {
          return Promise.resolve(asResponse(speciesNames('Pika')));
        }
        return Promise.resolve(asResponse(speciesNames(`Name${speciesId}`)));
      }

      const pokemonId = url.split('/').at(-1);
      if (!pokemonId) {
        throw new Error('Pokemon ID missing in URL');
      }

      return Promise.resolve(asResponse(makePokemon(Number(pokemonId), `poke${pokemonId}`)));
    });

    const { searchPokemon } = await import('./pokemonApi');
    const found = await searchPokemon('pika');

    expect(found[0]?.displayName).toBe('Pika');
    expect(localizedSpeciesCalls).toBeLessThanOrEqual(121);
  });

  it('scans two additional batches when the exact match is already cached', async () => {
    const results = Array.from({ length: 1400 }, (_, index) => ({
      name: `poke${String(index + 1)}`,
      url: `https://pokeapi.co/api/v2/pokemon-species/${String(index + 1)}/`,
    }));
    let localizedSpeciesCalls = 0;

    vi.mocked(fetch).mockImplementation((input) => {
      const url = inputToUrl(input);

      if (url.includes('/pokemon-species?limit=1400')) {
        return Promise.resolve(asResponse({ results }));
      }

      const speciesId = /pokemon-species\/(\d+)/.exec(url)?.[1];
      if (speciesId) {
        localizedSpeciesCalls += 1;
        if (speciesId === '1') {
          return Promise.resolve(asResponse(speciesNames('Pika')));
        }
        return Promise.resolve(asResponse(speciesNames(`Name${speciesId}`)));
      }

      const pokemonId = url.split('/').at(-1);
      if (!pokemonId) {
        throw new Error('Pokemon ID missing in URL');
      }

      return Promise.resolve(asResponse(makePokemon(Number(pokemonId), `poke${pokemonId}`)));
    });

    const { searchPokemon } = await import('./pokemonApi');
    await searchPokemon('pika');
    const callsAfterFirstSearch = localizedSpeciesCalls;

    await searchPokemon('pika');
    const secondSearchLocalizationCalls = localizedSpeciesCalls - callsAfterFirstSearch;

    expect(secondSearchLocalizationCalls).toBe(81);
  });

  it('does not advance scan cursor when a localization batch aborts', async () => {
    const results = Array.from({ length: 80 }, (_, index) => ({
      name: `poke${String(index + 1)}`,
      url: `https://pokeapi.co/api/v2/pokemon-species/${String(index + 1)}/`,
    }));
    let firstBatchAborts = true;

    vi.mocked(fetch).mockImplementation((input) => {
      const url = inputToUrl(input);

      if (url.includes('/pokemon-species?limit=1400')) {
        return Promise.resolve(asResponse({ results }));
      }

      if (url.endsWith('/pokemon-species/1') && firstBatchAborts) {
        firstBatchAborts = false;
        return Promise.reject(new DOMException('Aborted', 'AbortError'));
      }

      const speciesId = /pokemon-species\/(\d+)/.exec(url)?.[1];
      if (speciesId) {
        return Promise.resolve(asResponse(speciesNames(`Pika${speciesId}`)));
      }

      const pokemonId = url.split('/').at(-1);
      if (!pokemonId) {
        throw new Error('Pokemon ID missing in URL');
      }

      return Promise.resolve(asResponse(makePokemon(Number(pokemonId), `poke${pokemonId}`)));
    });

    const { searchPokemon } = await import('./pokemonApi');
    await expect(searchPokemon('pika1')).rejects.toMatchObject({
      name: 'SearchPokemonError',
      code: 'timeout',
    });

    const secondTry = await searchPokemon('pika1');
    expect(secondTry.length).toBeGreaterThan(0);
    expect(secondTry[0]?.id).toBe(1);
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
    expect(detail?.evolution.previous).toEqual([{ id: 172, displayName: 'Pichu', image: null }]);
    expect(detail?.evolution.next).toEqual([{ id: 26, displayName: 'Raichu', image: null }]);
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
    expect(detail?.evolution.previous).toEqual([]);
    expect(detail?.evolution.next).toEqual([]);
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
    expect(detail?.evolution.previous).toEqual([]);
    expect(detail?.evolution.next).toEqual([]);
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
    expect(detail?.evolution.previous).toEqual([]);
    expect(detail?.evolution.next).toEqual([]);
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
    expect(detail?.evolution.previous).toEqual([]);
    expect(detail?.evolution.next).toEqual([]);
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
    expect(detail?.evolution.previous).toEqual([]);
    expect(detail?.evolution.next).toEqual([]);
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

    expect(first?.evolution.next).toEqual([]);
    expect(second?.evolution.next).toEqual([
      { id: 26, displayName: 'Raichu', image: 'https://img/raichu.png' },
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
    expect(detail?.evolution.previous).toEqual([]);
    expect(detail?.evolution.next).toEqual([]);
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

  it('uses null previous evolution for root chain entry and still resolves next evolution', async () => {
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
    expect(detail?.evolution.next).toEqual([
      { id: 2, displayName: 'Bisaknosp', image: 'https://img/ivysaur.png' },
      { id: 3, displayName: 'Bisaflor', image: 'https://img/venusaur.png' },
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

    expect(detail?.evolution.stage).toBe('Basis');
    expect(detail?.evolution.next).toEqual([
      { id: 134, displayName: 'Aquana', image: 'https://img/vaporeon.png' },
      { id: 135, displayName: 'Blitza', image: 'https://img/jolteon.png' },
      { id: 10001, displayName: 'Tiefaquana', image: 'https://img/deepvaporeon.png' },
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
});
