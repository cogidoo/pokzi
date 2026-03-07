import { beforeEach, describe, expect, it, vi } from 'vitest';
import {
  SearchController,
  classifyQuery,
  isTolerantOnlyResultSet,
  type SearchUiState,
} from './searchController';
import type { PokemonSearchResult } from '../../types/pokemon';

function makeResult(id: number, quality: 'exact' | 'partial' | 'tolerant'): PokemonSearchResult {
  return {
    id,
    name: `pokemon-${String(id)}`,
    displayName: `Pokemon ${String(id)}`,
    image: null,
    types: [{ name: 'Normal' }],
    evolutionStage: 'Basis',
    matchQuality: quality,
  };
}

describe('searchController helpers', () => {
  it('classifies empty, invalid and valid queries', () => {
    expect(classifyQuery('  ')).toBe('empty');
    expect(classifyQuery('a')).toBe('invalid');
    expect(classifyQuery('25')).toBe('valid');
    expect(classifyQuery('pi')).toBe('valid');
  });

  it('detects tolerant-only result sets', () => {
    expect(isTolerantOnlyResultSet([])).toBe(false);
    expect(isTolerantOnlyResultSet([makeResult(1, 'tolerant')])).toBe(true);
    expect(isTolerantOnlyResultSet([makeResult(1, 'exact'), makeResult(2, 'tolerant')])).toBe(
      false,
    );
  });
});

describe('SearchController', () => {
  let query = '';
  let uiState: SearchUiState = 'idle';
  let errorMessage = '';
  let results: PokemonSearchResult[] = [];
  let showTolerantHint = false;

  const searchPokemon =
    vi.fn<(queryValue: string, signal?: AbortSignal) => Promise<PokemonSearchResult[]>>();

  const toErrorMessage = vi.fn((error: unknown) => String(error));

  function createController() {
    return new SearchController(
      {
        getQuery: () => query,
        setUiState: (state) => {
          uiState = state;
        },
        setErrorMessage: (message) => {
          errorMessage = message;
        },
        setResults: (nextResults) => {
          results = nextResults;
        },
        setShowTolerantHint: (visible) => {
          showTolerantHint = visible;
        },
      },
      {
        searchPokemon,
        toErrorMessage,
      },
      280,
    );
  }

  beforeEach(() => {
    vi.useFakeTimers();
    query = '';
    uiState = 'idle';
    errorMessage = '';
    results = [];
    showTolerantHint = false;
    searchPokemon.mockReset();
    toErrorMessage.mockClear();
  });

  it('sets idle state for empty queries', async () => {
    const controller = createController();
    query = '   ';

    await controller.performSearch();

    expect(uiState).toBe('idle');
    expect(searchPokemon).not.toHaveBeenCalled();
    controller.dispose();
  });

  it('sets invalid state for too-short text queries', async () => {
    const controller = createController();
    query = 'p';

    await controller.performSearch();

    expect(uiState).toBe('invalid');
    expect(searchPokemon).not.toHaveBeenCalled();
    controller.dispose();
  });

  it('maps successful queries and tolerant hint', async () => {
    const controller = createController();
    query = 'evli';
    searchPokemon.mockResolvedValueOnce([makeResult(133, 'tolerant')]);

    await controller.performSearch();

    expect(uiState).toBe('success');
    expect(results).toHaveLength(1);
    expect(showTolerantHint).toBe(true);
    controller.dispose();
  });

  it('maps errors via provided mapper', async () => {
    const controller = createController();
    query = 'pikachu';
    searchPokemon.mockRejectedValueOnce(new Error('boom'));
    toErrorMessage.mockReturnValueOnce('mapped');

    await controller.performSearch();

    expect(uiState).toBe('error');
    expect(errorMessage).toBe('mapped');
    expect(showTolerantHint).toBe(false);
    controller.dispose();
  });

  it('supports retry and manual submit helpers', async () => {
    const controller = createController();
    query = '25';
    searchPokemon.mockResolvedValue([makeResult(25, 'exact')]);

    controller.onManualSubmit();
    await Promise.resolve();
    controller.retrySearch();
    await Promise.resolve();

    expect(searchPokemon).toHaveBeenCalledTimes(2);
    controller.dispose();
  });

  it('runs only latest debounced query', async () => {
    const controller = createController();
    searchPokemon.mockResolvedValue([makeResult(731, 'exact')]);

    controller.scheduleDebouncedSearch('pi');
    controller.scheduleDebouncedSearch('pik');
    vi.advanceTimersByTime(280);
    await Promise.resolve();

    expect(searchPokemon).toHaveBeenCalledTimes(1);
    expect(searchPokemon).toHaveBeenCalledWith('pik', expect.any(AbortSignal));
    controller.dispose();
  });
});
