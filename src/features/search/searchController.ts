import type { PokemonSearchResult } from '../../types/pokemon';

/**
 * UI states for the search screen.
 */
export type SearchUiState = 'idle' | 'invalid' | 'loading' | 'success' | 'empty' | 'error';

/**
 * Search service contract consumed by the controller.
 */
export type SearchPokemonHandler = (
  query: string,
  signal?: AbortSignal,
) => Promise<PokemonSearchResult[]>;

/**
 * Mutable search state accessors used by the controller.
 */
export interface SearchControllerBindings {
  getQuery: () => string;
  setUiState: (state: SearchUiState) => void;
  setErrorMessage: (message: string) => void;
  setResults: (results: PokemonSearchResult[]) => void;
  setShowTolerantHint: (visible: boolean) => void;
}

/**
 * Dependencies for search orchestration behavior.
 */
export interface SearchControllerDependencies {
  searchPokemon: SearchPokemonHandler;
  toErrorMessage: (error: unknown) => string;
}

/**
 * Classifies a user query for search-state handling.
 *
 * @param raw - Raw query from input.
 * @returns Query classification for UI decisions.
 */
export function classifyQuery(raw: string): 'empty' | 'invalid' | 'valid' {
  const value = raw.trim();
  if (!value) {
    return 'empty';
  }

  if (/^\d+$/.test(value)) {
    return 'valid';
  }

  return value.length >= 2 ? 'valid' : 'invalid';
}

/**
 * Determines whether every visible result is tolerant-only.
 *
 * @param entries - Current result list.
 * @returns True when all results are tolerant matches.
 */
export function isTolerantOnlyResultSet(entries: PokemonSearchResult[]): boolean {
  return entries.length > 0 && entries.every((entry) => entry.matchQuality === 'tolerant');
}

/**
 * Stateful controller for debounced search requests.
 */
export class SearchController {
  private readonly bindings: SearchControllerBindings;
  private readonly dependencies: SearchControllerDependencies;
  private readonly debounceMs: number;

  private debounceHandle: ReturnType<typeof setTimeout> | undefined;
  private activeAbort: AbortController | null = null;
  private nextRequestToken = 0;

  /**
   * Creates the search flow controller.
   *
   * @param bindings - Mutable search state bindings.
   * @param dependencies - Service dependencies.
   * @param debounceMs - Debounce delay in milliseconds.
   */
  constructor(
    bindings: SearchControllerBindings,
    dependencies: SearchControllerDependencies,
    debounceMs: number,
  ) {
    this.bindings = bindings;
    this.dependencies = dependencies;
    this.debounceMs = debounceMs;
  }

  /**
   * Cancels active request and pending debounce timer.
   */
  dispose(): void {
    this.cancelInFlight();
    this.clearDebounce();
  }

  /**
   * Runs one search request and updates bound state.
   *
   * @param rawQuery - Optional query override.
   */
  async performSearch(rawQuery: string = this.bindings.getQuery()): Promise<void> {
    const normalized = rawQuery.trim();
    const queryState = classifyQuery(normalized);
    const requestToken = ++this.nextRequestToken;

    this.cancelInFlight();

    if (queryState === 'empty') {
      this.bindings.setUiState('idle');
      this.bindings.setErrorMessage('');
      this.bindings.setResults([]);
      this.bindings.setShowTolerantHint(false);
      return;
    }

    if (queryState === 'invalid') {
      this.bindings.setUiState('invalid');
      this.bindings.setErrorMessage('');
      this.bindings.setResults([]);
      this.bindings.setShowTolerantHint(false);
      return;
    }

    const requestAbort = new AbortController();
    this.activeAbort = requestAbort;
    this.bindings.setUiState('loading');
    this.bindings.setErrorMessage('');

    try {
      const found = await this.dependencies.searchPokemon(normalized, requestAbort.signal);

      if (requestToken !== this.nextRequestToken) {
        return;
      }

      this.bindings.setResults(found);
      this.bindings.setUiState(found.length > 0 ? 'success' : 'empty');
      this.bindings.setShowTolerantHint(isTolerantOnlyResultSet(found));
    } catch (error) {
      if (requestToken !== this.nextRequestToken) {
        return;
      }

      if (error instanceof DOMException && error.name === 'AbortError') {
        return;
      }

      this.bindings.setResults([]);
      this.bindings.setErrorMessage(this.dependencies.toErrorMessage(error));
      this.bindings.setUiState('error');
      this.bindings.setShowTolerantHint(false);
    }
  }

  /**
   * Executes manual submit immediately.
   */
  onManualSubmit(): void {
    this.clearDebounce();
    void this.performSearch(this.bindings.getQuery());
  }

  /**
   * Retries with the current query.
   */
  retrySearch(): void {
    void this.performSearch(this.bindings.getQuery());
  }

  /**
   * Schedules debounced execution for the current query.
   *
   * @param query - Captured query value.
   */
  scheduleDebouncedSearch(query: string): void {
    this.clearDebounce();
    this.debounceHandle = setTimeout(() => {
      void this.performSearch(query);
    }, this.debounceMs);
  }

  /**
   * Aborts the currently running search request.
   */
  private cancelInFlight(): void {
    if (this.activeAbort) {
      this.activeAbort.abort();
      this.activeAbort = null;
    }
  }

  /**
   * Clears any pending debounce timer.
   */
  private clearDebounce(): void {
    clearTimeout(this.debounceHandle);
    this.debounceHandle = undefined;
  }
}
