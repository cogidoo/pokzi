import { expect, test, type Page, type Route } from '@playwright/test';

function json(route: Route, body: unknown, status = 200) {
  return route.fulfill({
    status,
    contentType: 'application/json',
    body: JSON.stringify(body),
  });
}

async function routeTextSearchPikachu(page: Page) {
  await page.route('https://pokeapi.co/api/v2/**', async (route) => {
    const url = new URL(route.request().url());

    if (url.pathname === '/api/v2/pokemon-species' && url.searchParams.get('limit') === '1400') {
      return json(route, {
        results: [{ name: 'pikachu', url: 'https://pokeapi.co/api/v2/pokemon-species/25/' }],
      });
    }

    if (url.pathname === '/api/v2/pokemon-species/25') {
      return json(route, {
        names: [
          { language: { name: 'en' }, name: 'Pikachu' },
          { language: { name: 'de' }, name: 'Pikachu' },
        ],
        evolution_chain: {
          url: 'https://pokeapi.co/api/v2/evolution-chain/10/',
        },
      });
    }

    if (url.pathname === '/api/v2/evolution-chain/10') {
      return json(route, {
        chain: {
          species: { name: 'pichu', url: 'https://pokeapi.co/api/v2/pokemon-species/172/' },
          evolves_to: [
            {
              species: { name: 'pikachu', url: 'https://pokeapi.co/api/v2/pokemon-species/25/' },
              evolves_to: [
                {
                  species: { name: 'raichu', url: 'https://pokeapi.co/api/v2/pokemon-species/26/' },
                  evolves_to: [],
                },
              ],
            },
          ],
        },
      });
    }

    if (url.pathname === '/api/v2/pokemon-species/172') {
      return json(route, {
        names: [
          { language: { name: 'en' }, name: 'Pichu' },
          { language: { name: 'de' }, name: 'Pichu' },
        ],
      });
    }

    if (url.pathname === '/api/v2/pokemon-species/26') {
      return json(route, {
        names: [
          { language: { name: 'en' }, name: 'Raichu' },
          { language: { name: 'de' }, name: 'Raichu' },
        ],
      });
    }

    if (url.pathname === '/api/v2/pokemon/25') {
      return json(route, {
        id: 25,
        name: 'pikachu',
        height: 4,
        weight: 60,
        stats: [{ base_stat: 35, stat: { name: 'hp' } }],
        sprites: {
          other: {
            'official-artwork': { front_default: 'https://img.test/pikachu.png' },
          },
        },
        types: [{ type: { name: 'electric' } }],
      });
    }

    if (url.pathname === '/api/v2/pokemon/pichu') {
      return json(route, {
        id: 172,
        name: 'pichu',
        height: 3,
        weight: 20,
        stats: [{ base_stat: 20, stat: { name: 'hp' } }],
        sprites: {
          other: {
            'official-artwork': { front_default: 'https://img.test/pichu.png' },
          },
        },
        types: [{ type: { name: 'electric' } }],
      });
    }

    if (url.pathname === '/api/v2/pokemon/raichu') {
      return json(route, {
        id: 26,
        name: 'raichu',
        height: 8,
        weight: 300,
        stats: [{ base_stat: 60, stat: { name: 'hp' } }],
        sprites: {
          other: {
            'official-artwork': { front_default: 'https://img.test/raichu.png' },
          },
        },
        types: [{ type: { name: 'electric' } }],
      });
    }

    return json(route, {}, 404);
  });
}

async function routeIdSearchSchiggy(page: Page) {
  await page.route('https://pokeapi.co/api/v2/**', async (route) => {
    const url = new URL(route.request().url());

    if (url.pathname === '/api/v2/pokemon/7') {
      return json(route, {
        id: 7,
        name: 'squirtle',
        height: 5,
        weight: 90,
        sprites: {
          other: {
            'official-artwork': { front_default: 'https://img.test/schiggy.png' },
          },
        },
        types: [{ type: { name: 'water' } }],
      });
    }

    if (url.pathname === '/api/v2/pokemon-species/7') {
      return json(route, {
        names: [
          { language: { name: 'en' }, name: 'Squirtle' },
          { language: { name: 'de' }, name: 'Schiggy' },
        ],
        evolution_chain: {
          url: 'https://pokeapi.co/api/v2/evolution-chain/7/',
        },
      });
    }

    if (url.pathname === '/api/v2/evolution-chain/7') {
      return json(route, {
        chain: {
          species: { name: 'squirtle' },
          evolves_to: [
            {
              species: { name: 'wartortle' },
              evolves_to: [{ species: { name: 'blastoise' }, evolves_to: [] }],
            },
          ],
        },
      });
    }

    return json(route, {}, 404);
  });
}

async function routeNumericErrorThenRetrySuccess(page: Page) {
  let pokemon25Calls = 0;

  await page.route('https://pokeapi.co/api/v2/**', async (route) => {
    const url = new URL(route.request().url());

    if (url.pathname === '/api/v2/pokemon/25') {
      pokemon25Calls += 1;
      if (pokemon25Calls === 1) {
        return json(route, {}, 500);
      }

      return json(route, {
        id: 25,
        name: 'pikachu',
        height: 4,
        weight: 60,
        sprites: {
          other: {
            'official-artwork': { front_default: 'https://img.test/pikachu.png' },
          },
        },
        types: [{ type: { name: 'electric' } }],
      });
    }

    if (url.pathname === '/api/v2/pokemon-species/25') {
      return json(route, {
        names: [
          { language: { name: 'en' }, name: 'Pikachu' },
          { language: { name: 'de' }, name: 'Pikachu' },
        ],
        evolution_chain: {
          url: 'https://pokeapi.co/api/v2/evolution-chain/10/',
        },
      });
    }

    if (url.pathname === '/api/v2/evolution-chain/10') {
      return json(route, {
        chain: {
          species: { name: 'pichu' },
          evolves_to: [
            {
              species: { name: 'pikachu' },
              evolves_to: [{ species: { name: 'raichu' }, evolves_to: [] }],
            },
          ],
        },
      });
    }

    return json(route, {}, 404);
  });
}

async function routeTolerantOnlyEvoli(page: Page) {
  await page.route('https://pokeapi.co/api/v2/**', async (route) => {
    const url = new URL(route.request().url());

    if (url.pathname === '/api/v2/pokemon-species' && url.searchParams.get('limit') === '1400') {
      return json(route, {
        results: [{ name: 'eevee', url: 'https://pokeapi.co/api/v2/pokemon-species/133/' }],
      });
    }

    if (url.pathname === '/api/v2/pokemon-species/133') {
      return json(route, {
        names: [
          { language: { name: 'en' }, name: 'Eevee' },
          { language: { name: 'de' }, name: 'Evoli' },
        ],
      });
    }

    if (url.pathname === '/api/v2/pokemon/133') {
      return json(route, {
        id: 133,
        name: 'eevee',
        height: 3,
        weight: 65,
        sprites: {
          other: {
            'official-artwork': { front_default: 'https://img.test/evoli.png' },
          },
        },
        types: [{ type: { name: 'normal' } }],
      });
    }

    return json(route, {}, 404);
  });
}

async function routeFeature5LinearSplit(page: Page) {
  await page.route('https://pokeapi.co/api/v2/**', async (route) => {
    const url = new URL(route.request().url());

    if (url.pathname === '/api/v2/pokemon/1') {
      return json(route, {
        id: 1,
        name: 'rootmon',
        height: 7,
        weight: 120,
        sprites: {
          other: {
            'official-artwork': { front_default: 'https://img.test/rootmon.png' },
          },
        },
        types: [{ type: { name: 'grass' } }],
      });
    }

    if (url.pathname === '/api/v2/pokemon-species/1') {
      return json(route, {
        names: [
          { language: { name: 'en' }, name: 'Rootmon' },
          { language: { name: 'de' }, name: 'Wurzel' },
        ],
        evolution_chain: { url: 'https://pokeapi.co/api/v2/evolution-chain/99/' },
      });
    }

    if (url.pathname === '/api/v2/evolution-chain/99') {
      return json(route, {
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
      });
    }

    if (url.pathname === '/api/v2/pokemon-species/2') {
      return json(route, {
        names: [
          { language: { name: 'en' }, name: 'Midmon' },
          { language: { name: 'de' }, name: 'Mitte' },
        ],
      });
    }

    if (url.pathname === '/api/v2/pokemon-species/3') {
      return json(route, {
        names: [
          { language: { name: 'en' }, name: 'Branchone' },
          { language: { name: 'de' }, name: 'Ast Eins' },
        ],
      });
    }

    if (url.pathname === '/api/v2/pokemon-species/4') {
      return json(route, {
        names: [
          { language: { name: 'en' }, name: 'Branchtwo' },
          { language: { name: 'de' }, name: 'Ast Zwei' },
        ],
      });
    }

    if (url.pathname === '/api/v2/pokemon/midmon') {
      return json(route, {
        id: 2,
        name: 'midmon',
        height: 8,
        weight: 160,
        sprites: {
          other: {
            'official-artwork': { front_default: 'https://img.test/midmon.png' },
          },
        },
        types: [{ type: { name: 'electric' } }],
      });
    }

    if (url.pathname === '/api/v2/pokemon/branchone') {
      return json(route, {
        id: 3,
        name: 'branchone',
        height: 9,
        weight: 180,
        sprites: {
          other: {
            'official-artwork': { front_default: 'https://img.test/branchone.png' },
          },
        },
        types: [{ type: { name: 'electric' } }],
      });
    }

    if (url.pathname === '/api/v2/pokemon/branchtwo') {
      return json(route, {
        id: 4,
        name: 'branchtwo',
        height: 9,
        weight: 180,
        sprites: {
          other: {
            'official-artwork': { front_default: 'https://img.test/branchtwo.png' },
          },
        },
        types: [{ type: { name: 'electric' } }],
      });
    }

    return json(route, {}, 404);
  });
}

async function routeEvolutionDetailFailure(page: Page) {
  await page.route('https://pokeapi.co/api/v2/**', async (route) => {
    const url = new URL(route.request().url());

    if (url.pathname === '/api/v2/pokemon-species' && url.searchParams.get('limit') === '1400') {
      return json(route, {
        results: [{ name: 'pikachu', url: 'https://pokeapi.co/api/v2/pokemon-species/25/' }],
      });
    }

    if (url.pathname === '/api/v2/pokemon/25') {
      return json(route, {
        id: 25,
        name: 'pikachu',
        height: 4,
        weight: 60,
        sprites: {
          other: {
            'official-artwork': { front_default: 'https://img.test/pikachu.png' },
          },
        },
        types: [{ type: { name: 'electric' } }],
      });
    }

    if (url.pathname === '/api/v2/pokemon/26') {
      return json(route, {}, 500);
    }

    if (url.pathname === '/api/v2/pokemon-species/25') {
      return json(route, {
        names: [
          { language: { name: 'en' }, name: 'Pikachu' },
          { language: { name: 'de' }, name: 'Pikachu' },
        ],
        evolution_chain: {
          url: 'https://pokeapi.co/api/v2/evolution-chain/10/',
        },
      });
    }

    if (url.pathname === '/api/v2/pokemon-species/172') {
      return json(route, {
        names: [
          { language: { name: 'en' }, name: 'Pichu' },
          { language: { name: 'de' }, name: 'Pichu' },
        ],
      });
    }

    if (url.pathname === '/api/v2/pokemon-species/26') {
      return json(route, {
        names: [
          { language: { name: 'en' }, name: 'Raichu' },
          { language: { name: 'de' }, name: 'Raichu' },
        ],
      });
    }

    if (url.pathname === '/api/v2/evolution-chain/10') {
      return json(route, {
        chain: {
          species: { name: 'pichu', url: 'https://pokeapi.co/api/v2/pokemon-species/172/' },
          evolves_to: [
            {
              species: { name: 'pikachu', url: 'https://pokeapi.co/api/v2/pokemon-species/25/' },
              evolves_to: [
                {
                  species: { name: 'raichu', url: 'https://pokeapi.co/api/v2/pokemon-species/26/' },
                  evolves_to: [],
                },
              ],
            },
          ],
        },
      });
    }

    if (url.pathname === '/api/v2/pokemon/pichu') {
      return json(route, {
        id: 172,
        name: 'pichu',
        height: 3,
        weight: 20,
        sprites: {
          other: {
            'official-artwork': { front_default: 'https://img.test/pichu.png' },
          },
        },
        types: [{ type: { name: 'electric' } }],
      });
    }

    if (url.pathname === '/api/v2/pokemon/raichu') {
      return json(route, {
        id: 26,
        name: 'raichu',
        height: 8,
        weight: 300,
        sprites: {
          other: {
            'official-artwork': { front_default: 'https://img.test/raichu.png' },
          },
        },
        types: [{ type: { name: 'electric' } }],
      });
    }

    return json(route, {}, 404);
  });
}

async function routePhase2DenseStack(page: Page) {
  await page.route('https://pokeapi.co/api/v2/**', async (route) => {
    const url = new URL(route.request().url());

    if (url.pathname === '/api/v2/pokemon/2') {
      return json(route, {
        id: 2,
        name: 'poliwhirl',
        height: 10,
        weight: 200,
        sprites: {
          other: {
            'official-artwork': { front_default: 'https://img.test/quaputzi.png' },
          },
        },
        types: [{ type: { name: 'water' } }],
      });
    }

    if (url.pathname === '/api/v2/pokemon-species/2') {
      return json(route, {
        names: [
          { language: { name: 'en' }, name: 'Poliwhirl' },
          { language: { name: 'de' }, name: 'Quaputzi' },
        ],
        evolution_chain: { url: 'https://pokeapi.co/api/v2/evolution-chain/201/' },
      });
    }

    if (url.pathname === '/api/v2/evolution-chain/201') {
      return json(route, {
        chain: {
          species: { name: 'poliwag', url: 'https://pokeapi.co/api/v2/pokemon-species/1/' },
          evolves_to: [
            {
              species: { name: 'poliwhirl', url: 'https://pokeapi.co/api/v2/pokemon-species/2/' },
              evolves_to: [
                {
                  species: {
                    name: 'poliwrath',
                    url: 'https://pokeapi.co/api/v2/pokemon-species/3/',
                  },
                  evolves_to: [],
                },
                {
                  species: {
                    name: 'politoed',
                    url: 'https://pokeapi.co/api/v2/pokemon-species/4/',
                  },
                  evolves_to: [],
                },
              ],
            },
          ],
        },
      });
    }

    if (url.pathname === '/api/v2/pokemon-species/1') {
      return json(route, {
        names: [
          { language: { name: 'en' }, name: 'Poliwag' },
          { language: { name: 'de' }, name: 'Quapsel' },
        ],
      });
    }

    if (url.pathname === '/api/v2/pokemon-species/3') {
      return json(route, {
        names: [
          { language: { name: 'en' }, name: 'Poliwrath' },
          { language: { name: 'de' }, name: 'Quappo' },
        ],
      });
    }

    if (url.pathname === '/api/v2/pokemon-species/4') {
      return json(route, {
        names: [
          { language: { name: 'en' }, name: 'Politoed' },
          { language: { name: 'de' }, name: 'Quaxo' },
        ],
      });
    }

    if (url.pathname === '/api/v2/pokemon/poliwag') {
      return json(route, {
        id: 1,
        name: 'poliwag',
        height: 6,
        weight: 120,
        sprites: {
          other: {
            'official-artwork': { front_default: 'https://img.test/quapsel.png' },
          },
        },
        types: [{ type: { name: 'water' } }],
      });
    }

    if (url.pathname === '/api/v2/pokemon/poliwrath') {
      return json(route, {
        id: 3,
        name: 'poliwrath',
        height: 13,
        weight: 540,
        sprites: {
          other: {
            'official-artwork': { front_default: 'https://img.test/quappo.png' },
          },
        },
        types: [{ type: { name: 'water' } }, { type: { name: 'fighting' } }],
      });
    }

    if (url.pathname === '/api/v2/pokemon/politoed') {
      return json(route, {
        id: 4,
        name: 'politoed',
        height: 11,
        weight: 339,
        sprites: {
          other: {
            'official-artwork': { front_default: 'https://img.test/quaxo.png' },
          },
        },
        types: [{ type: { name: 'water' } }],
      });
    }

    return json(route, {}, 404);
  });
}

async function routeTextSearchWithCount(page: Page, count: number) {
  const preferredIds = [20, 25, 53, 58, 59, 64, 115, 129, 140, 141, 158, 205];
  const entries = Array.from({ length: count }, (_, index) => {
    const id = preferredIds[index] ?? index + 1;
    const idText = String(id);
    return {
      id,
      name: `pika${idText}`,
      de: `Pika ${idText}`,
      sprite: `https://img.test/pika-${idText}.png`,
      idText,
    };
  });

  const entryById = new Map(entries.map((entry) => [entry.id, entry]));
  const entryByName = new Map(entries.map((entry) => [entry.name, entry]));

  await page.route('https://pokeapi.co/api/v2/**', async (route) => {
    const url = new URL(route.request().url());
    const path = url.pathname;

    if (path === '/api/v2/pokemon-species' && url.searchParams.get('limit') === '1400') {
      return json(route, {
        results: entries.map((entry) => ({
          name: entry.name,
          url: `https://pokeapi.co/api/v2/pokemon-species/${entry.idText}/`,
        })),
      });
    }

    if (path.startsWith('/api/v2/pokemon-species/')) {
      const slug = path.replace('/api/v2/pokemon-species/', '').replace('/', '');
      const numericId = Number(slug);
      const entry = Number.isNaN(numericId) ? entryByName.get(slug) : entryById.get(numericId);
      if (!entry) {
        return json(route, {}, 404);
      }

      return json(route, {
        names: [
          { language: { name: 'en' }, name: entry.name },
          { language: { name: 'de' }, name: entry.de },
        ],
        evolution_chain: {
          url: `https://pokeapi.co/api/v2/evolution-chain/${entry.idText}/`,
        },
      });
    }

    if (path.startsWith('/api/v2/pokemon/')) {
      const slug = path.replace('/api/v2/pokemon/', '').replace('/', '');
      const numericId = Number(slug);
      const entry = Number.isNaN(numericId) ? entryByName.get(slug) : entryById.get(numericId);
      if (!entry) {
        return json(route, {}, 404);
      }

      return json(route, {
        id: entry.id,
        name: entry.name,
        height: 6,
        weight: 80,
        sprites: {
          other: {
            'official-artwork': { front_default: entry.sprite },
          },
        },
        types: [{ type: { name: 'electric' } }],
      });
    }

    if (path.startsWith('/api/v2/evolution-chain/')) {
      const id = Number(path.replace('/api/v2/evolution-chain/', '').replace('/', ''));
      const entry = entryById.get(id);
      if (!entry) {
        return json(route, {}, 404);
      }

      return json(route, {
        chain: {
          species: {
            name: entry.name,
            url: `https://pokeapi.co/api/v2/pokemon-species/${entry.idText}/`,
          },
          evolves_to: [],
        },
      });
    }

    return json(route, {}, 404);
  });
}

async function routeTextSearchScrollable(page: Page) {
  await routeTextSearchWithCount(page, 12);
}

async function routeDetailAttacksLoadingAndPartialRetry(page: Page) {
  let slowMoveAttempt = 0;
  let releaseSlowMove: (() => void) | null = null;
  const slowMoveGate = new Promise<void>((resolve) => {
    releaseSlowMove = resolve;
  });

  await page.route('https://pokeapi.co/api/v2/**', async (route) => {
    const url = new URL(route.request().url());

    if (url.pathname === '/api/v2/pokemon-species' && url.searchParams.get('limit') === '1400') {
      return json(route, {
        results: [{ name: 'pikachu', url: 'https://pokeapi.co/api/v2/pokemon-species/25/' }],
      });
    }

    if (url.pathname === '/api/v2/pokemon-species/25') {
      return json(route, {
        names: [
          { language: { name: 'en' }, name: 'Pikachu' },
          { language: { name: 'de' }, name: 'Pikachu' },
        ],
        flavor_text_entries: [
          {
            language: { name: 'de' },
            flavor_text: 'Ein kurzer Text fuer die Detailansicht.',
          },
        ],
        evolution_chain: {
          url: 'https://pokeapi.co/api/v2/evolution-chain/10/',
        },
      });
    }

    if (url.pathname === '/api/v2/evolution-chain/10') {
      return json(route, {
        chain: {
          species: { name: 'pichu', url: 'https://pokeapi.co/api/v2/pokemon-species/172/' },
          evolves_to: [
            {
              species: { name: 'pikachu', url: 'https://pokeapi.co/api/v2/pokemon-species/25/' },
              evolves_to: [
                {
                  species: { name: 'raichu', url: 'https://pokeapi.co/api/v2/pokemon-species/26/' },
                  evolves_to: [],
                },
              ],
            },
          ],
        },
      });
    }

    if (url.pathname === '/api/v2/pokemon-species/172') {
      return json(route, {
        names: [
          { language: { name: 'en' }, name: 'Pichu' },
          { language: { name: 'de' }, name: 'Pichu' },
        ],
      });
    }

    if (url.pathname === '/api/v2/pokemon-species/26') {
      return json(route, {
        names: [
          { language: { name: 'en' }, name: 'Raichu' },
          { language: { name: 'de' }, name: 'Raichu' },
        ],
      });
    }

    if (url.pathname === '/api/v2/pokemon/25') {
      return json(route, {
        id: 25,
        name: 'pikachu',
        height: 4,
        weight: 60,
        stats: [{ base_stat: 35, stat: { name: 'hp' } }],
        sprites: {
          front_default: 'https://img.test/pikachu-sprite.png',
          other: {
            'official-artwork': { front_default: 'https://img.test/pikachu.png' },
          },
        },
        moves: [
          {
            move: {
              name: 'quick-attack',
              url: 'https://pokeapi.co/api/v2/move/quick-attack',
            },
            version_group_details: [
              {
                level_learned_at: 1,
                move_learn_method: { name: 'level-up' },
                version_group: { name: 'red-blue' },
              },
            ],
          },
          {
            move: {
              name: 'thunder-shock',
              url: 'https://pokeapi.co/api/v2/move/thunder-shock',
            },
            version_group_details: [
              {
                level_learned_at: 2,
                move_learn_method: { name: 'level-up' },
                version_group: { name: 'red-blue' },
              },
            ],
          },
          {
            move: {
              name: 'broken-move',
              url: 'https://pokeapi.co/api/v2/move/broken-move',
            },
            version_group_details: [
              {
                level_learned_at: 0,
                move_learn_method: { name: 'machine' },
                version_group: { name: 'red-blue' },
              },
            ],
          },
          {
            move: {
              name: 'slow-move',
              url: 'https://pokeapi.co/api/v2/move/slow-move',
            },
            version_group_details: [
              {
                level_learned_at: 0,
                move_learn_method: { name: 'tutor' },
                version_group: { name: 'red-blue' },
              },
            ],
          },
        ],
        types: [{ type: { name: 'electric' } }],
      });
    }

    if (url.pathname === '/api/v2/pokemon/pichu') {
      return json(route, {
        id: 172,
        name: 'pichu',
        height: 3,
        weight: 20,
        sprites: {
          other: {
            'official-artwork': { front_default: 'https://img.test/pichu.png' },
          },
        },
        types: [{ type: { name: 'electric' } }],
      });
    }

    if (url.pathname === '/api/v2/pokemon/raichu') {
      return json(route, {
        id: 26,
        name: 'raichu',
        height: 8,
        weight: 300,
        sprites: {
          other: {
            'official-artwork': { front_default: 'https://img.test/raichu.png' },
          },
        },
        types: [{ type: { name: 'electric' } }],
      });
    }

    if (url.pathname === '/api/v2/move/quick-attack') {
      return json(route, {
        name: 'quick-attack',
        power: 30,
        type: { name: 'normal' },
        names: [{ language: { name: 'de' }, name: 'Ruckzuckhieb' }],
        flavor_text_entries: [
          {
            language: { name: 'de' },
            flavor_text: 'Ein schneller Vorstoss.',
          },
        ],
      });
    }

    if (url.pathname === '/api/v2/move/thunder-shock') {
      return json(route, {
        name: 'thunder-shock',
        power: 40,
        type: { name: 'electric' },
        names: [{ language: { name: 'de' }, name: 'Donnerschock' }],
        flavor_text_entries: [
          {
            language: { name: 'de' },
            flavor_text: 'Ein kurzer Elektroschock.',
          },
        ],
      });
    }

    if (url.pathname === '/api/v2/move/broken-move') {
      slowMoveAttempt += 1;
      if (slowMoveAttempt === 1) {
        return json(route, {}, 500);
      }

      return json(route, {
        name: 'broken-move',
        power: 70,
        type: { name: 'electric' },
        names: [{ language: { name: 'de' }, name: 'Reparaturblitz' }],
        flavor_text_entries: [
          {
            language: { name: 'de' },
            flavor_text: 'Laedt kurz Energie auf.',
          },
        ],
      });
    }

    if (url.pathname === '/api/v2/move/slow-move') {
      await slowMoveGate;
      return json(route, {
        name: 'slow-move',
        power: 90,
        type: { name: 'electric' },
        names: [{ language: { name: 'de' }, name: 'Donnerschlag' }],
        flavor_text_entries: [
          {
            language: { name: 'de' },
            flavor_text: 'Trifft das Ziel mit viel Kraft.',
          },
        ],
      });
    }

    return json(route, {}, 404);
  });

  return {
    releaseSlowMove() {
      releaseSlowMove?.();
    },
  };
}

test('zeigt initialen Such-Hinweis', async ({ page }) => {
  await page.goto('/');
  await expect(page.getByRole('heading', { name: 'Suche starten' })).toBeVisible();
});

test('Textsuche zeigt deutsche Ergebnisdaten', async ({ page }) => {
  await routeTextSearchPikachu(page);
  await page.goto('/');

  await page.getByLabel('Pokemon suchen').fill('pika');
  await page.getByRole('button', { name: 'Suchen' }).click();

  await expect(page.getByRole('list', { name: 'Suchergebnisse' })).toBeVisible();
  await expect(page.getByRole('heading', { name: 'Pikachu' })).toBeVisible();
  await expect(page.getByText('#025')).toBeVisible();
  await expect(page.getByText('Stufe')).toBeVisible();
  await expect(page.getByText('Phase 1')).toBeVisible();
  await expect(page.getByText('Elektro')).toBeVisible();
});

test('Tolerant-only Suche zeigt Verfeinerungs-Hinweis', async ({ page }) => {
  await routeTolerantOnlyEvoli(page);
  await page.goto('/');

  await page.getByLabel('Pokemon suchen').fill('evli');
  await page.getByRole('button', { name: 'Suchen' }).click();

  await expect(page.getByRole('list', { name: 'Suchergebnisse' })).toBeVisible();
  await expect(page.getByText('Meintest du vielleicht:')).toBeVisible();
  await expect(page.getByRole('heading', { name: 'Evoli' })).toBeVisible();
});

test('ID-Suche zeigt korrektes Pokemon', async ({ page }) => {
  await routeIdSearchSchiggy(page);
  await page.goto('/');

  await page.getByLabel('Pokemon suchen').fill('7');
  await page.getByRole('button', { name: 'Suchen' }).click();

  await expect(page.getByRole('heading', { name: 'Schiggy' })).toBeVisible();
  await expect(page.getByText('#007')).toBeVisible();
  await expect(page.getByText('Basis')).toBeVisible();
  await expect(page.getByText('Wasser')).toBeVisible();
});

test('Fehlerzustand zeigt Retry und Retry liefert Ergebnis', async ({ page }) => {
  await routeNumericErrorThenRetrySuccess(page);
  await page.goto('/');

  await page.getByLabel('Pokemon suchen').fill('25');

  await expect(page.getByRole('heading', { name: 'Etwas ist schiefgelaufen' })).toBeVisible();
  await page.getByRole('button', { name: 'Erneut versuchen' }).click();
  await expect(page.getByRole('heading', { name: 'Pikachu' })).toBeVisible();
  await expect(page.getByText('Phase 1')).toBeVisible();
});

test('Ergebniskarte öffnet Detailansicht und Zurück behält Suchliste', async ({ page }) => {
  await routeTextSearchPikachu(page);
  await page.goto('/');

  await page.getByLabel('Pokemon suchen').fill('pika');
  await page.getByRole('button', { name: 'Suchen' }).click();
  await page.getByRole('button', { name: /Pikachu/i }).click();

  await expect(page.getByRole('heading', { name: 'Wichtige Fakten' })).toBeVisible();
  await expect(page.getByLabel('KP 35')).toBeVisible();
  await expect(page.getByRole('button', { name: 'Zu Pichu wechseln' })).toBeVisible();
  await expect(page.getByRole('button', { name: 'Zu Raichu wechseln' })).toBeVisible();
  await expect(page.getByLabel('KP 20')).toBeVisible();
  await expect(page.getByLabel('KP 60')).toBeVisible();
  await expect(page.getByText('Größe')).toBeVisible();
  await page.getByRole('button', { name: 'Zurück zur Suche' }).click();

  await expect(page.getByRole('list', { name: 'Suchergebnisse' })).toBeVisible();
  await expect(page.getByRole('heading', { name: 'Pikachu' })).toBeVisible();
  await expect(page.getByLabel('Pokemon suchen')).toHaveValue('pika');
});

test('Alle-Angriffe-Sektion lädt separat, zeigt partiellen Hinweis und Retry', async ({ page }) => {
  const attacksFlow = await routeDetailAttacksLoadingAndPartialRetry(page);
  await page.goto('/');

  await page.getByLabel('Pokemon suchen').fill('pika');
  await page.getByRole('button', { name: 'Suchen' }).click();
  await page.getByRole('button', { name: /Pikachu/i }).click();

  await expect(page.getByRole('heading', { name: 'Pikachu' })).toBeVisible();
  await expect(page.getByRole('heading', { name: 'Wichtige Fakten' })).toBeVisible();
  await expect(page.getByRole('heading', { name: 'Alle Angriffe' })).toBeVisible();
  await expect(page.getByText('Angriffe werden geladen...')).toBeVisible();

  attacksFlow.releaseSlowMove();

  await expect(
    page.getByText('Einige Angriffe konnten nicht vollständig geladen werden.'),
  ).toBeVisible();
  await expect(page.getByRole('button', { name: 'Erneut versuchen' })).toBeVisible();
  await expect(
    page.getByRole('list', { name: 'Alle Angriffe' }).getByText('Ruckzuckhieb'),
  ).toBeVisible();

  await page.getByRole('button', { name: 'Erneut versuchen' }).click();

  await expect(
    page.getByRole('list', { name: 'Alle Angriffe' }).getByText('Reparaturblitz'),
  ).toBeVisible();
  await expect(
    page.getByRole('list', { name: 'Alle Angriffe' }).getByText('Donnerschlag'),
  ).toBeVisible();
  await expect(
    page.getByText('Einige Angriffe konnten nicht vollständig geladen werden.'),
  ).toHaveCount(0);
});

test('Deep-Link auf Detailseite kann zur Suchstartseite zurücknavigieren', async ({ page }) => {
  await routeIdSearchSchiggy(page);
  await page.goto('/#/pokemon/7');

  await expect(page.getByRole('heading', { name: 'Schiggy' })).toBeVisible();
  await page.getByRole('button', { name: 'Zurück zur Suche' }).click();
  await expect(page.getByRole('heading', { name: 'Suche starten' })).toBeVisible();
});

test('Clear-Button im Suchfeld bleibt touch-freundlich gross', async ({ page }) => {
  await page.goto('/');
  await page.getByLabel('Pokemon suchen').fill('pi');

  const clearButton = page.getByRole('button', { name: 'Suche leeren' });
  await expect(clearButton).toBeVisible();

  const box = await clearButton.boundingBox();
  expect(box).not.toBeNull();
  expect(box?.width ?? 0).toBeGreaterThanOrEqual(48);
  expect(box?.height ?? 0).toBeGreaterThanOrEqual(48);
});

test('Feature 5 zeigt verzweigte Pfade nach linearem Zwischenschritt als getrennte Gruppen', async ({
  page,
}) => {
  await routeFeature5LinearSplit(page);
  await page.goto('/#/pokemon/1');

  await expect(page.getByRole('heading', { name: 'Wurzel' })).toBeVisible();
  await expect(page.getByLabel('Entwicklungsstufen')).toBeVisible();
  await expect(page.getByRole('heading', { name: 'Phase 2' })).toBeVisible();
  const branchOne = page.getByRole('button', { name: 'Zu Ast Eins wechseln' });
  const branchTwo = page.getByRole('button', { name: 'Zu Ast Zwei wechseln' });
  await expect(branchOne).toBeVisible();
  await expect(branchTwo).toBeVisible();
  const branchOneBox = await branchOne.boundingBox();
  const branchTwoBox = await branchTwo.boundingBox();
  expect(branchOneBox).not.toBeNull();
  expect(branchTwoBox).not.toBeNull();
  const boxesOverlap =
    !!branchOneBox &&
    !!branchTwoBox &&
    branchOneBox.x < branchTwoBox.x + branchTwoBox.width &&
    branchOneBox.x + branchOneBox.width > branchTwoBox.x &&
    branchOneBox.y < branchTwoBox.y + branchTwoBox.height &&
    branchOneBox.y + branchOneBox.height > branchTwoBox.y;
  expect(boxesOverlap).toBe(false);
  await expect(page.getByText('Elektro').first()).toBeVisible();
});

test('Phase-2-Mehrfachentwicklung bleibt lesbar und innerhalb der Stage-Kachel', async ({
  page,
}) => {
  await routePhase2DenseStack(page);
  await page.setViewportSize({ width: 1366, height: 1100 });
  await page.goto('/#/pokemon/2');

  await expect(page.getByRole('heading', { name: 'Quaputzi' })).toBeVisible();
  const phase2Section = page.getByRole('region', { name: 'Phase 2' });
  await expect(phase2Section).toBeVisible();

  const quappo = page.getByRole('button', { name: 'Zu Quappo wechseln' });
  const quaxo = page.getByRole('button', { name: 'Zu Quaxo wechseln' });
  await expect(quappo).toBeVisible();
  await expect(quaxo).toBeVisible();

  const phase2Box = await phase2Section.boundingBox();
  const quappoBox = await quappo.boundingBox();
  const quaxoBox = await quaxo.boundingBox();

  expect(phase2Box).not.toBeNull();
  expect(quappoBox).not.toBeNull();
  expect(quaxoBox).not.toBeNull();

  if (!phase2Box || !quappoBox || !quaxoBox) {
    return;
  }

  expect(quappoBox.x + quappoBox.width).toBeLessThanOrEqual(phase2Box.x + phase2Box.width + 1);
  expect(quaxoBox.x + quaxoBox.width).toBeLessThanOrEqual(phase2Box.x + phase2Box.width + 1);

  const boxesOverlap =
    quappoBox.x < quaxoBox.x + quaxoBox.width &&
    quappoBox.x + quappoBox.width > quaxoBox.x &&
    quappoBox.y < quaxoBox.y + quaxoBox.height &&
    quappoBox.y + quappoBox.height > quaxoBox.y;
  expect(boxesOverlap).toBe(false);
});

test('Fehlgeschlagener Evolutionswechsel hält URL und sichtbare Details synchron', async ({
  page,
}) => {
  await routeEvolutionDetailFailure(page);
  await page.goto('/');

  await page.getByLabel('Pokemon suchen').fill('pika');
  await page.getByRole('button', { name: 'Suchen' }).click();
  await page.getByRole('button', { name: /Pikachu/i }).click();

  await expect(page.getByRole('heading', { name: 'Pikachu' })).toBeVisible();
  await expect(page).toHaveURL(/#\/pokemon\/25$/);
  await page.getByRole('button', { name: 'Zu Raichu wechseln' }).click();

  await expect(
    page.getByText('Der Pokemon-Server antwortet gerade nicht richtig. Bitte versuche es erneut.'),
  ).toBeVisible();
  await expect(page.getByRole('button', { name: 'Erneut versuchen' })).toBeVisible();
  await expect(page.getByRole('heading', { name: 'Pikachu' })).toBeVisible();
  await expect(page).toHaveURL(/#\/pokemon\/25$/);
});

test('Such-Header wird beim Scrollen kompakt', async ({ page }) => {
  await routeTextSearchScrollable(page);
  await page.setViewportSize({ width: 390, height: 640 });
  await page.goto('/');

  await page.getByLabel('Pokemon suchen').fill('ka');
  await page.getByRole('button', { name: 'Suchen' }).click();
  await expect(page.getByRole('list', { name: 'Suchergebnisse' })).toBeVisible();

  const compactHeader = page.locator('.app__header--compact');
  await expect(compactHeader).toHaveCount(0);

  await page.evaluate(() => {
    window.scrollTo(0, 500);
    window.dispatchEvent(new Event('scroll'));
  });
  await expect(compactHeader).toHaveCount(1);
});

test('Langsames Scrollen bleibt stabil und Clear-Button funktioniert auch im kompakten Header', async ({
  page,
}) => {
  await routeTextSearchScrollable(page);
  await page.setViewportSize({ width: 390, height: 640 });
  await page.goto('/');

  const searchInput = page.getByLabel('Pokemon suchen');
  await searchInput.fill('ka');
  await page.getByRole('button', { name: 'Suchen' }).click();
  await expect(page.getByRole('list', { name: 'Suchergebnisse' })).toBeVisible();

  const compactHeader = page.locator('.app__header--compact');
  await page.evaluate(() => {
    window.scrollTo(0, 500);
  });
  await expect(compactHeader).toHaveCount(1);

  await page.getByRole('button', { name: 'Suche leeren' }).click();
  await expect(searchInput).toHaveValue('');
  await expect(page.getByRole('heading', { name: 'Suche starten' })).toBeVisible();

  for (let index = 0; index < 30; index += 1) {
    await page.evaluate(() => {
      window.scrollBy(0, -8);
    });
    await page.waitForTimeout(25);
  }
  await expect.poll(() => compactHeader.count()).toBe(0);
});

test('Header bleibt nicht im kompakten Zustand haengen, wenn die Liste nach Collapse nicht mehr scrollbar ist', async ({
  page,
}) => {
  await routeTextSearchScrollable(page);
  await page.setViewportSize({ width: 390, height: 640 });
  await page.goto('/');

  await page.getByLabel('Pokemon suchen').fill('ka');
  await page.getByRole('button', { name: 'Suchen' }).click();
  await expect(page.getByRole('list', { name: 'Suchergebnisse' })).toBeVisible();

  const compactHeader = page.locator('.app__header--compact');
  const getScrollableDistance = async () =>
    page.evaluate(() => {
      const root = document.scrollingElement ?? document.documentElement;
      return root.scrollHeight - window.innerHeight;
    });

  await expect.poll(getScrollableDistance).toBeGreaterThan(0);

  await page.evaluate(() => {
    window.scrollTo(0, 120);
    window.dispatchEvent(new Event('scroll'));
  });
  await expect(compactHeader).toHaveCount(1);

  await page.evaluate(() => {
    const list = document.querySelector('.result-list');
    if (list instanceof HTMLElement) {
      list.style.maxHeight = '0px';
      list.style.overflow = 'hidden';
    }
    window.dispatchEvent(new Event('resize'));
  });
  await expect.poll(getScrollableDistance).toBeLessThanOrEqual(1);
  await expect(compactHeader).toHaveCount(1);

  await page.evaluate(() => {
    window.dispatchEvent(new WheelEvent('wheel', { deltaY: 40 }));
  });
  await expect(compactHeader).toHaveCount(1);

  await page.evaluate(() => {
    window.dispatchEvent(new WheelEvent('wheel', { deltaY: -40 }));
  });
  await expect.poll(() => compactHeader.count()).toBe(0);
});
