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
  await expect(page.getByRole('button', { name: 'Zu Pichu wechseln' })).toBeVisible();
  await expect(page.getByRole('button', { name: 'Zu Raichu wechseln' })).toBeVisible();
  await expect(page.getByText('Größe')).toBeVisible();
  await page.getByRole('button', { name: 'Zurück zur Suche' }).click();

  await expect(page.getByRole('list', { name: 'Suchergebnisse' })).toBeVisible();
  await expect(page.getByRole('heading', { name: 'Pikachu' })).toBeVisible();
  await expect(page.getByLabel('Pokemon suchen')).toHaveValue('pika');
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
