<script lang="ts">
  import SearchBar from './components/SearchBar.svelte';
  import EvolutionSummary from './components/EvolutionSummary.svelte';
  import ResultCard from './components/ResultCard.svelte';
  import StatusState from './components/StatusState.svelte';
  import {
    detailHash,
    parseRoute,
    searchUrl,
    wasOpenedFromResults,
    type AppRoute,
    type DetailHistoryState,
  } from './features/navigation/hashRouter';
  import { SearchController, type SearchUiState } from './features/search/searchController';
  import { fetchPokemonDetail, isSearchPokemonError, searchPokemon } from './services/pokemonApi';
  import type { PokemonDetail, PokemonSearchResult } from './types/pokemon';

  /*
   * Main application shell that coordinates search input, async lookup,
   * and all result/status rendering states.
   */

  /**
   * UI states for the detail view.
   */
  type DetailUiState = 'loading' | 'success' | 'empty' | 'error';

  let query = $state('');
  let uiState = $state<SearchUiState>('idle');
  let errorMessage = $state('');
  let results = $state<PokemonSearchResult[]>([]);
  let showTolerantHint = $state(false);
  let route = $state<AppRoute>(parseRoute(window.location.hash));
  let detailUiState = $state<DetailUiState>('loading');
  let detailErrorMessage = $state('');
  let detail = $state<PokemonDetail | null>(null);
  let openedFromResults = $state(false);
  let detailTransitioning = $state(false);
  let resultsScrolled = $state(false);
  let lastResultsScrollY = 0;

  let activeDetailAbort: AbortController | null = null;
  let nextDetailRequestToken = 0;
  let lastDetailRouteId: number | null = null;

  const DEBOUNCE_MS = 280;
  const HERO_TEXT_PLACEHOLDER = ' ';
  const COMPACT_COLLAPSE_SCROLL_Y = 16;
  const COMPACT_EXPAND_SCROLL_Y = 0;
  const UPWARD_INTENT_WINDOW_MS = 220;
  let lastUpwardIntentAt = -Infinity;

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
   * Checks whether detail data contains visible evolution relations.
   *
   * @param pokemon - Detail payload shown in the detail view.
   * @returns True if at least one related evolution is available.
   */
  function hasEvolutionRelations(pokemon: PokemonDetail): boolean {
    const hasSharedRelation = pokemon.evolution.sharedPath.length > 1;
    const hasBranches = pokemon.evolution.branchGroups.some((group) => group.items.length > 0);
    return hasSharedRelation || hasBranches;
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

  const searchController = new SearchController(
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
    DEBOUNCE_MS,
  );

  /**
   * Starts an immediate search from manual form submit.
   */
  function onManualSubmit() {
    searchController.onManualSubmit();
  }

  /**
   * Retries search with the current query state.
   */
  function retrySearch() {
    searchController.retrySearch();
  }

  /**
   * Applies a stable compact/expanded state based on vertical scroll position.
   * Uses a small hysteresis so the header does not flicker near the threshold.
   */
  function syncResultsScrollState() {
    const scrollY = Math.max(window.scrollY, 0);
    const isScrollingDown = scrollY > lastResultsScrollY;
    const isScrollingUp = scrollY < lastResultsScrollY;

    if (!resultsScrolled && isScrollingDown && scrollY >= COMPACT_COLLAPSE_SCROLL_Y) {
      resultsScrolled = true;
    }

    const canExpandAtTop = isSearchResultsPageScrollable() || hasRecentUpwardIntent();
    if (resultsScrolled && isScrollingUp && scrollY <= COMPACT_EXPAND_SCROLL_Y && canExpandAtTop) {
      resultsScrolled = false;
    }

    lastResultsScrollY = scrollY;
  }

  /**
   * Expands the compact results header when the user signals upward intent.
   * This covers edge cases where compact mode removed the remaining scroll range.
   */
  function expandFromUpwardIntent() {
    if (
      route.kind !== 'search' ||
      uiState !== 'success' ||
      results.length === 0 ||
      !resultsScrolled
    ) {
      return;
    }

    lastUpwardIntentAt = Date.now();
    if (window.scrollY <= COMPACT_EXPAND_SCROLL_Y || !isSearchResultsPageScrollable()) {
      resultsScrolled = false;
    }
  }

  /**
   * Checks whether an explicit upward interaction happened recently enough.
   *
   * @returns True while upward user intent is still fresh.
   */
  function hasRecentUpwardIntent(): boolean {
    return Date.now() - lastUpwardIntentAt <= UPWARD_INTENT_WINDOW_MS;
  }

  /**
   * Checks whether the current search page can still be scrolled vertically.
   *
   * @returns True when the page height exceeds the viewport height.
   */
  function isSearchResultsPageScrollable(): boolean {
    const root = document.scrollingElement ?? document.documentElement;
    return root.scrollHeight - window.innerHeight > 1;
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
        if (detail) {
          const historyState = openedFromResults
            ? ({ source: 'results' } satisfies DetailHistoryState)
            : {};
          window.history.replaceState(historyState, '', detailHash(detail.id));
          lastDetailRouteId = detail.id;
          route = { kind: 'detail', id: detail.id };
        }
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

  $effect(() => {
    searchController.scheduleDebouncedSearch(query);
  });

  $effect(() => {
    return () => {
      searchController.dispose();
    };
  });

  $effect(() => {
    if (route.kind !== 'search' || uiState !== 'success' || results.length === 0) {
      resultsScrolled = false;
      lastResultsScrollY = 0;
      lastUpwardIntentAt = -Infinity;
      return;
    }

    lastResultsScrollY = Math.max(window.scrollY, 0);
    syncResultsScrollState();

    const onScroll = () => {
      syncResultsScrollState();
    };
    const onResize = () => {
      syncResultsScrollState();
    };
    const onWheel = (event: WheelEvent) => {
      if (event.deltaY < 0) {
        expandFromUpwardIntent();
      }
    };
    let lastTouchY = 0;
    const onTouchStart = (event: TouchEvent) => {
      const firstTouch = event.touches.item(0);
      lastTouchY = firstTouch ? firstTouch.clientY : 0;
    };
    const onTouchMove = (event: TouchEvent) => {
      const firstTouch = event.touches.item(0);
      if (!firstTouch) {
        return;
      }
      const movingDown = firstTouch.clientY - lastTouchY > 4;
      if (movingDown) {
        expandFromUpwardIntent();
      }
      lastTouchY = firstTouch.clientY;
    };

    window.addEventListener('scroll', onScroll, { passive: true });
    window.addEventListener('resize', onResize);
    window.addEventListener('wheel', onWheel, { passive: true });
    window.addEventListener('touchstart', onTouchStart, { passive: true });
    window.addEventListener('touchmove', onTouchMove, { passive: true });
    return () => {
      window.removeEventListener('scroll', onScroll);
      window.removeEventListener('resize', onResize);
      window.removeEventListener('wheel', onWheel);
      window.removeEventListener('touchstart', onTouchStart);
      window.removeEventListener('touchmove', onTouchMove);
    };
  });

  $effect(() => {
    const onLocationChange = (event?: PopStateEvent | HashChangeEvent) => {
      const state = event instanceof PopStateEvent ? (event.state as unknown) : null;
      openedFromResults = wasOpenedFromResults(state);
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
    {@const compactSearch = uiState === 'success' && results.length > 0 && resultsScrolled}
    <section class={`app__search-rail ${compactSearch ? 'app__search-rail--compact' : ''}`}>
      <div class="app__search-shell">
        <header class={`app__header ${compactSearch ? 'app__header--compact' : ''}`}>
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
          tone="neutral"
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
        {#if showTolerantHint}
          <p class="app__tolerant-hint" role="status" aria-live="polite">Meintest du vielleicht:</p>
        {/if}
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
            <section class="detail__section detail__section--evolution" aria-label="Entwicklung">
              <EvolutionSummary
                evolution={detail.evolution}
                currentPokemonId={detail.id}
                onSelect={openEvolutionDetail}
              />
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

          <section class="detail__section detail__section--facts" aria-label="Wichtige Fakten">
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
