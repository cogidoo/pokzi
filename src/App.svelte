<script lang="ts">
  import SearchBar from './components/SearchBar.svelte';
  import ResultCard from './components/ResultCard.svelte';
  import StatusState from './components/StatusState.svelte';
  import { fetchPokemonDetail, isSearchPokemonError, searchPokemon } from './services/pokemonApi';
  import type { PokemonDetail, PokemonSearchResult } from './types/pokemon';

  /*
   * Main application shell that coordinates search input, async lookup,
   * and all result/status rendering states.
   */

  /**
   * UI states for the search view.
   */
  type SearchUiState = 'idle' | 'invalid' | 'loading' | 'success' | 'empty' | 'error';
  /**
   * UI states for the detail view.
   */
  type DetailUiState = 'loading' | 'success' | 'empty' | 'error';
  /**
   * Minimal route model used by the app.
   */
  type AppRoute = { kind: 'search' } | { kind: 'detail'; id: number };
  /**
   * Browser history marker for detail pages opened from search results.
   */
  interface DetailHistoryState {
    source: 'results';
  }
  const SEARCH_HASH = '#/';
  const DETAIL_HASH_PATTERN = /^#\/pokemon\/(\d+)\/?$/;

  let query = $state('');
  let uiState = $state<SearchUiState>('idle');
  let errorMessage = $state('');
  let results = $state<PokemonSearchResult[]>([]);
  let route = $state<AppRoute>(parseRoute(window.location.hash));
  let detailUiState = $state<DetailUiState>('loading');
  let detailErrorMessage = $state('');
  let detail = $state<PokemonDetail | null>(null);
  let openedFromResults = $state(false);
  let detailTransitioning = $state(false);

  let debounceHandle: ReturnType<typeof setTimeout> | undefined;
  let activeAbort: AbortController | null = null;
  let activeDetailAbort: AbortController | null = null;
  let nextRequestToken = 0;
  let nextDetailRequestToken = 0;
  let lastDetailRouteId: number | null = null;

  const DEBOUNCE_MS = 280;
  const HERO_TEXT_PLACEHOLDER = ' ';
  const COMPACT_SEARCH_STATES: SearchUiState[] = ['success', 'empty', 'error'];

  /**
   * Parses current URL hash into the app-level route model.
   *
   * @param hash - Browser location hash string.
   * @returns Parsed route with search fallback.
   */
  function parseRoute(hash: string): AppRoute {
    const match = DETAIL_HASH_PATTERN.exec(hash);
    if (!match) {
      return { kind: 'search' };
    }

    const id = Number(match[1]);
    if (!Number.isFinite(id) || id < 1) {
      return { kind: 'search' };
    }

    return { kind: 'detail', id };
  }

  /**
   * Creates hash URL for a detail route.
   *
   * @param id - Pokemon id to open.
   * @returns Hash-only route URL.
   */
  function detailHash(id: number): string {
    return `#/pokemon/${String(id)}`;
  }

  /**
   * Builds the root search hash URL.
   *
   * @returns Search URL for pushState.
   */
  function searchUrl(): string {
    return SEARCH_HASH;
  }

  /**
   * Formats Pokemon id for readable display labels.
   *
   * @param id - Numeric Pokemon id.
   * @returns Formatted id string like `#025`.
   */
  function formatId(id: number): string {
    return `#${id.toString().padStart(3, '0')}`;
  }

  /**
   * Formats metric values for German locale output.
   *
   * @param value - Numeric metric value.
   * @returns Locale-formatted number with at most one decimal.
   */
  function formatMetric(value: number): string {
    const hasDecimal = Math.abs(value % 1) > 0;
    return value.toLocaleString('de-DE', {
      minimumFractionDigits: hasDecimal ? 1 : 0,
      maximumFractionDigits: 1,
    });
  }

  /**
   * Checks whether detail data contains visible earlier or later evolution items.
   *
   * @param pokemon - Detail payload shown in the detail view.
   * @returns True if at least one related evolution is available.
   */
  function hasEvolutionRelations(pokemon: PokemonDetail): boolean {
    return pokemon.evolution.previous.length > 0 || pokemon.evolution.next.length > 0;
  }

  /**
   * Classifies search input for UI state handling.
   *
   * @param raw - Current value from the search input.
   * @returns Whether the input is empty, invalid, or valid.
   */
  function classifyQuery(raw: string): 'empty' | 'invalid' | 'valid' {
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
   * Aborts the currently active request if one exists.
   */
  function cancelInFlight() {
    if (activeAbort) {
      activeAbort.abort();
      activeAbort = null;
    }
  }

  /**
   * Aborts the currently active detail request.
   */
  function cancelDetailInFlight() {
    if (activeDetailAbort) {
      activeDetailAbort.abort();
      activeDetailAbort = null;
    }
  }

  /**
   * Maps technical errors to user-facing German messages.
   *
   * @param error - Error thrown by the search flow.
   * @returns Message for the UI error state.
   */
  function toErrorMessage(error: unknown): string {
    if (isSearchPokemonError(error)) {
      if (error.code === 'timeout') {
        return 'Die Suche hat zu lange gedauert. Bitte versuche es erneut.';
      }

      if (error.code === 'server') {
        return 'Der Pokemon-Server antwortet gerade nicht richtig. Bitte versuche es erneut.';
      }
    }

    return 'Pokemon konnten gerade nicht geladen werden. Bitte versuche es erneut.';
  }

  /**
   * Maps detail request errors to user-facing German messages.
   *
   * @param error - Error thrown by the detail flow.
   * @returns Message for the detail error state.
   */
  function toDetailErrorMessage(error: unknown): string {
    if (isSearchPokemonError(error)) {
      if (error.code === 'timeout') {
        return 'Die Detailansicht hat zu lange geladen. Bitte versuche es erneut.';
      }

      if (error.code === 'server') {
        return 'Der Pokemon-Server antwortet gerade nicht richtig. Bitte versuche es erneut.';
      }
    }

    return 'Die Pokemon-Details konnten gerade nicht geladen werden. Bitte versuche es erneut.';
  }

  /**
   * Runs a search and synchronizes all UI states.
   *
   * @param rawQuery - Optional query string; defaults to current query state.
   */
  async function performSearch(rawQuery: string = query) {
    const normalized = rawQuery.trim();
    const queryState = classifyQuery(normalized);
    const requestToken = ++nextRequestToken;

    cancelInFlight();

    if (queryState === 'empty') {
      uiState = 'idle';
      errorMessage = '';
      results = [];
      return;
    }

    if (queryState === 'invalid') {
      uiState = 'invalid';
      errorMessage = '';
      results = [];
      return;
    }

    const requestAbort = new AbortController();
    activeAbort = requestAbort;
    uiState = 'loading';
    errorMessage = '';

    try {
      const found = await searchPokemon(normalized, requestAbort.signal);

      if (requestToken !== nextRequestToken) {
        return;
      }

      results = found;
      uiState = found.length > 0 ? 'success' : 'empty';
    } catch (error) {
      if (requestToken !== nextRequestToken) {
        return;
      }

      if (error instanceof DOMException && error.name === 'AbortError') {
        return;
      }

      results = [];
      errorMessage = toErrorMessage(error);
      uiState = 'error';
    }
  }

  /**
   * Starts an immediate search from manual form submit.
   */
  function onManualSubmit() {
    clearTimeout(debounceHandle);
    void performSearch(query);
  }

  /**
   * Retries search with the current query state.
   */
  function retrySearch() {
    void performSearch(query);
  }

  /**
   * Opens detail route from search results and keeps return context.
   *
   * @param id - Pokemon id to open.
   */
  function openPokemonDetail(id: number) {
    openedFromResults = true;
    const historyState: DetailHistoryState = { source: 'results' };
    window.history.pushState(historyState, '', detailHash(id));
    route = { kind: 'detail', id };
  }

  /**
   * Opens another Pokemon detail from evolution navigation tiles.
   * Uses replaceState to keep "back to search" behavior stable.
   *
   * @param id - Pokemon id to open.
   */
  function openEvolutionDetail(id: number) {
    if (route.kind !== 'detail' || route.id === id) {
      return;
    }

    const historyState = openedFromResults
      ? ({ source: 'results' } satisfies DetailHistoryState)
      : {};
    window.history.replaceState(historyState, '', detailHash(id));
    route = { kind: 'detail', id };
  }

  /**
   * Loads detail data and synchronizes the detail UI states.
   *
   * @param id - Pokemon id from route.
   */
  async function loadDetail(id: number) {
    const requestToken = ++nextDetailRequestToken;
    cancelDetailInFlight();

    const requestAbort = new AbortController();
    activeDetailAbort = requestAbort;
    const keepCurrentFrame = detailUiState === 'success' && detail !== null;
    detailTransitioning = keepCurrentFrame;
    if (!keepCurrentFrame) {
      detailUiState = 'loading';
    }
    detailErrorMessage = '';

    try {
      const found = await fetchPokemonDetail(id, requestAbort.signal);
      if (requestToken !== nextDetailRequestToken) {
        return;
      }
      detailTransitioning = false;

      if (!found) {
        detail = null;
        detailUiState = 'empty';
        return;
      }

      detail = found;
      detailUiState = 'success';
    } catch (error) {
      if (requestToken !== nextDetailRequestToken) {
        return;
      }

      if (error instanceof DOMException && error.name === 'AbortError') {
        detailTransitioning = false;
        return;
      }

      detailTransitioning = false;
      const message = toDetailErrorMessage(error);

      if (keepCurrentFrame) {
        detailErrorMessage = message;
        return;
      }

      detail = null;
      detailErrorMessage = message;
      detailUiState = 'error';
    }
  }

  /**
   * Retries loading the active detail route.
   */
  function retryDetail() {
    if (route.kind !== 'detail') {
      return;
    }

    void loadDetail(route.id);
  }

  /**
   * Returns to search view.
   * If opened from deep-link without prior results, it resets to search start.
   */
  function goBackToSearch() {
    cancelDetailInFlight();

    if (openedFromResults && window.history.length > 1) {
      window.history.back();
      return;
    }

    window.history.pushState({}, '', searchUrl());
    route = { kind: 'search' };
    if (!openedFromResults) {
      query = '';
      results = [];
      errorMessage = '';
      uiState = 'idle';
    }
  }

  /**
   * Schedules a debounced search for smoother typing.
   *
   * @param currentQuery - Query value captured when scheduling.
   */
  function scheduleDebouncedSearch(currentQuery: string) {
    clearTimeout(debounceHandle);

    debounceHandle = setTimeout(() => {
      void performSearch(currentQuery);
    }, DEBOUNCE_MS);
  }

  $effect(() => {
    scheduleDebouncedSearch(query);

    return () => {
      clearTimeout(debounceHandle);
      debounceHandle = undefined;
    };
  });

  $effect(() => {
    const onLocationChange = (event?: PopStateEvent | HashChangeEvent) => {
      const state =
        event instanceof PopStateEvent
          ? ((event.state ?? null) as { source?: unknown } | null)
          : null;
      openedFromResults = state?.source === 'results';
      route = parseRoute(window.location.hash);
    };

    window.addEventListener('popstate', onLocationChange);
    window.addEventListener('hashchange', onLocationChange);
    onLocationChange();
    return () => {
      window.removeEventListener('popstate', onLocationChange);
      window.removeEventListener('hashchange', onLocationChange);
    };
  });

  $effect(() => {
    if (route.kind !== 'detail') {
      lastDetailRouteId = null;
      return;
    }

    if (lastDetailRouteId === route.id) {
      return;
    }

    lastDetailRouteId = route.id;
    void loadDetail(route.id);
    return () => {
      cancelDetailInFlight();
    };
  });
</script>

<main class="app">
  {#if route.kind === 'search'}
    {@const compactSearch = COMPACT_SEARCH_STATES.includes(uiState)}
    <section class="app__search-rail">
      <div class="app__search-shell">
        <header class="app__header">
          <p class="app__eyebrow">Pokzi</p>
          <h1 class="app__title">Pokemon entdecken</h1>
          <p class="app__subtitle">
            Suche mit deutschem Namen oder Nummer und öffne direkt die passende Karte.
          </p>
        </header>

        <section class="app__search">
          <SearchBar
            bind:query
            submitDisabled={uiState === 'loading'}
            compact={compactSearch}
            onSubmit={onManualSubmit}
          />
        </section>
      </div>
    </section>

    <section class="app__results" aria-live="polite" aria-busy={uiState === 'loading'}>
      {#if uiState === 'loading'}
        <StatusState
          tone="info"
          title="Pokemon werden geladen..."
          message="Ergebnisse für deine Suche werden geladen."
        />
      {:else if uiState === 'error'}
        <StatusState
          tone="error"
          title="Etwas ist schiefgelaufen"
          message={errorMessage}
          actionLabel="Erneut versuchen"
          onAction={retrySearch}
        />
      {:else if uiState === 'idle'}
        <StatusState
          tone="neutral"
          title="Suche starten"
          message="Probiere z. B. &quot;schiggy&quot; oder &quot;7&quot;."
        />
      {:else if uiState === 'invalid'}
        <StatusState
          tone="warning"
          title="Bitte genauer suchen"
          message="Gib mindestens 2 Buchstaben oder eine Nummer ein."
        />
      {:else if uiState === 'empty'}
        <StatusState
          tone="warning"
          title="Keine Pokemon gefunden"
          message="Probiere einen deutschen Namen wie &quot;bisasam&quot; oder eine Nummer wie &quot;25&quot;."
        />
      {:else}
        <div class="result-list" role="list" aria-label="Suchergebnisse">
          {#each results as pokemon (pokemon.id)}
            <ResultCard {pokemon} onSelect={openPokemonDetail} />
          {/each}
        </div>
      {/if}
    </section>
  {:else}
    <section class="detail">
      <button class="detail__back" type="button" onclick={goBackToSearch}>
        Zurück zur Suche
      </button>

      {#if detailUiState === 'loading'}
        <section class="detail-skeleton" aria-live="polite" aria-busy="true">
          <h1 class="detail-skeleton__title">Pokemon wird geladen...</h1>
          <p class="detail-skeleton__message">Die Detailansicht wird vorbereitet.</p>
          <div class="detail-skeleton__hero" aria-hidden="true">
            <div class="detail-skeleton__image shimmer"></div>
            <div class="detail-skeleton__meta">
              <div class="detail-skeleton__line shimmer"></div>
              <div class="detail-skeleton__line detail-skeleton__line--short shimmer"></div>
              <div class="detail-skeleton__chips">
                <span class="detail-skeleton__chip shimmer"></span>
                <span class="detail-skeleton__chip shimmer"></span>
              </div>
            </div>
          </div>
          <div class="detail-skeleton__section shimmer" aria-hidden="true"></div>
          <div class="detail-skeleton__facts" aria-hidden="true">
            <div class="detail-skeleton__fact shimmer"></div>
            <div class="detail-skeleton__fact shimmer"></div>
            <div class="detail-skeleton__fact shimmer"></div>
          </div>
        </section>
      {:else if detailUiState === 'error'}
        <StatusState
          tone="error"
          title="Details konnten nicht geladen werden"
          message={detailErrorMessage}
          actionLabel="Erneut versuchen"
          onAction={retryDetail}
        />
      {:else if detailUiState === 'empty'}
        <StatusState
          tone="warning"
          title="Pokemon nicht gefunden"
          message="Zu dieser Nummer konnten keine Details geladen werden."
        />
      {:else if detail}
        <article class="detail__content">
          <section class="detail__hero">
            <div class="detail__image-wrap">
              {#if detail.image}
                <img
                  class="detail__image"
                  src={detail.image}
                  alt={detail.displayName}
                  loading="eager"
                />
              {:else}
                <div class="detail__image-fallback">Kein Bild</div>
              {/if}
            </div>

            <div class="detail__hero-meta">
              <div class="detail__identity">
                <p class="detail__id">{formatId(detail.id)}</p>
                <h1 class="detail__name">{detail.displayName}</h1>
              </div>
              <div class="detail__hero-support">
                <p class="meta-chip meta-chip--stage meta-chip--detail">
                  <span class="meta-chip__label">Stufe</span>
                  <span class="meta-chip__value">{detail.evolution.stage}</span>
                </p>
                <div class="card__types" aria-label="Pokemon-Typen">
                  {#each detail.types as type (type.name)}
                    <span class="type-chip">{type.name}</span>
                  {/each}
                </div>
              </div>
              <p class={`detail__hero-text ${detail.flavorText ? '' : 'detail__hero-text--empty'}`}>
                {detail.flavorText ?? HERO_TEXT_PLACEHOLDER}
              </p>
            </div>
          </section>

          {#if hasEvolutionRelations(detail)}
            <section class="detail__section" aria-label="Entwicklung">
              <div class="detail__section-head">
                <h2 class="detail__section-title">Entwicklung</h2>
                <p class="detail__section-note">Aktuelle Stufe: {detail.evolution.stage}</p>
              </div>
              <div class="evolution" aria-label="Entwicklungsweg">
                {#each detail.evolution.previous as item (item.id)}
                  <button
                    class="evolution-item"
                    type="button"
                    onclick={() => {
                      openEvolutionDetail(item.id);
                    }}
                    aria-label={`Zu ${item.displayName} wechseln`}
                  >
                    <div class="evolution-item__image-wrap">
                      {#if item.image}
                        <img
                          class="evolution-item__image"
                          src={item.image}
                          alt={item.displayName}
                        />
                      {:else}
                        <div class="evolution-item__image-fallback">Kein Bild</div>
                      {/if}
                    </div>
                    <span class="evolution-item__name">{item.displayName}</span>
                  </button>
                {/each}

                <article class="evolution-item evolution-item--current" aria-current="true">
                  <div class="evolution-item__image-wrap">
                    {#if detail.image}
                      <img
                        class="evolution-item__image"
                        src={detail.image}
                        alt={detail.displayName}
                      />
                    {:else}
                      <div class="evolution-item__image-fallback">Kein Bild</div>
                    {/if}
                  </div>
                  <span class="evolution-item__name">{detail.displayName}</span>
                </article>

                {#each detail.evolution.next as item (item.id)}
                  <button
                    class="evolution-item"
                    type="button"
                    onclick={() => {
                      openEvolutionDetail(item.id);
                    }}
                    aria-label={`Zu ${item.displayName} wechseln`}
                  >
                    <div class="evolution-item__image-wrap">
                      {#if item.image}
                        <img
                          class="evolution-item__image"
                          src={item.image}
                          alt={item.displayName}
                        />
                      {:else}
                        <div class="evolution-item__image-fallback">Kein Bild</div>
                      {/if}
                    </div>
                    <span class="evolution-item__name">{item.displayName}</span>
                  </button>
                {/each}
              </div>
            </section>
          {/if}

          {#if detailTransitioning}
            <p class="detail__info detail__info--loading" role="status" aria-live="polite">
              Neue Details werden geladen...
            </p>
          {:else if detailErrorMessage}
            <section class="detail__info detail__info--error" aria-live="polite">
              <p class="detail__text">{detailErrorMessage}</p>
              <button class="state__action" type="button" onclick={retryDetail}
                >Erneut versuchen</button
              >
            </section>
          {/if}

          <section class="detail__section" aria-label="Wichtige Fakten">
            <h2 class="detail__section-title">Wichtige Fakten</h2>
            <div class="detail__facts">
              <article class="detail-fact">
                <p class="detail-fact__label">Größe</p>
                <p class="detail-fact__value">{formatMetric(detail.heightMeters)} m</p>
              </article>
              <article class="detail-fact">
                <p class="detail-fact__label">Gewicht</p>
                <p class="detail-fact__value">{formatMetric(detail.weightKilograms)} kg</p>
              </article>
              {#if detail.category}
                <article class="detail-fact">
                  <p class="detail-fact__label">Kategorie</p>
                  <p class="detail-fact__value">{detail.category}</p>
                </article>
              {/if}
            </div>
          </section>
        </article>
      {/if}
    </section>
  {/if}
</main>
