<script lang="ts">
  import SearchBar from './components/SearchBar.svelte';
  import EvolutionSummary from './components/EvolutionSummary.svelte';
  import PokemonCardsGallery from './components/PokemonCardsGallery.svelte';
  import PokemonArtworkCard from './components/PokemonArtworkCard.svelte';
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
  import { fetchPokemonCards, SUPPORTED_CARD_LANGUAGES } from './services/pokemonCardsApi';
  import { fetchPokemonDetail, isSearchPokemonError, searchPokemon } from './services/pokemonApi';
  import type {
    PokemonCard,
    PokemonCardAggregate,
    PokemonCardLanguage,
    PokemonCardTileData,
  } from './types/pokemonCards';
  import type { PokemonDetail, PokemonSearchResult } from './types/pokemon';

  /*
   * Main application shell that coordinates search input, async lookup,
   * and all result/status rendering states.
   */

  /**
   * UI states for the detail view.
   */
  type DetailUiState = 'loading' | 'success' | 'empty' | 'error';
  /**
   * Local UI states for the optional cards section inside the detail view.
   */
  type DetailCardsUiState = 'idle' | 'loading' | 'success' | 'empty' | 'error';
  let query = $state('');
  let uiState = $state<SearchUiState>('idle');
  let errorMessage = $state('');
  let results = $state<PokemonSearchResult[]>([]);
  let showTolerantHint = $state(false);
  let route = $state<AppRoute>(parseRoute(window.location.hash));
  let detailUiState = $state<DetailUiState>('loading');
  let detailErrorMessage = $state('');
  let detail = $state<PokemonDetail | null>(null);
  let detailCardsUiState = $state<DetailCardsUiState>('idle');
  let detailCardsErrorMessage = $state('');
  let detailCards = $state<PokemonCardAggregate[]>([]);
  let openedFromResults = $state(false);
  let detailTransitioning = $state(false);

  let activeDetailAbort: AbortController | null = null;
  let activeDetailCardsAbort: AbortController | null = null;
  let nextDetailRequestToken = 0;
  let nextDetailCardsRequestToken = 0;
  let lastDetailRouteId: number | null = null;

  const DEBOUNCE_MS = 280;
  const HERO_TEXT_PLACEHOLDER = ' ';
  const visibleDetailCards = $derived.by(() => mapVisibleDetailCards(detailCards));

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
   * Builds the preferred language order for content and image fallback.
   *
   * @param preferredLanguage - Currently selected card language.
   * @returns Ordered unique language list.
   */
  function getCardLanguageOrder(preferredLanguage: PokemonCardLanguage): PokemonCardLanguage[] {
    return [
      preferredLanguage,
      ...SUPPORTED_CARD_LANGUAGES.filter((language) => language !== preferredLanguage),
    ];
  }

  /**
   * Resolves the best visible variant for one aggregated card.
   *
   * @param card - Aggregated card grouped by stable card id.
   * @param selectedLanguage - Language chosen by the user.
   * @returns Localized variant or `null` when no variant exists.
   */
  function getVisibleCardVariant(
    card: PokemonCardAggregate,
    selectedLanguage: PokemonCardLanguage,
  ): PokemonCard | null {
    const selectableLanguages = getSelectableCardLanguages(card);
    const orderedLanguages =
      selectableLanguages.length > 0 ? selectableLanguages : getCardLanguageOrder(selectedLanguage);

    for (const language of orderedLanguages) {
      const variant = card.languages[language];
      if (variant) {
        return variant;
      }
    }

    return null;
  }

  /**
   * Resolves the strongest available image for one aggregated card.
   *
   * @param card - Aggregated card grouped by stable card id.
   * @param selectedLanguage - Language chosen by the user.
   * @returns Matching image URL from the preferred fallback chain or `null`.
   */
  function resolveCardImage(
    card: PokemonCardAggregate,
    selectedLanguage: PokemonCardLanguage,
  ): { imageUrl: string | null; imageLanguage: PokemonCardLanguage | null } {
    for (const language of getCardLanguageOrder(selectedLanguage)) {
      const variant = card.languages[language];
      if (variant?.image) {
        return {
          imageUrl: variant.image,
          imageLanguage: language,
        };
      }
    }

    return {
      imageUrl: null,
      imageLanguage: null,
    };
  }

  /**
   * Resolves which languages can be shown as one consistent card.
   *
   * When at least one localized image exists, only languages with their own image stay selectable.
   * If no image exists in any language, every localized text variant stays selectable.
   *
   * @param card - Aggregated card grouped by stable card id.
   * @returns Selectable display languages in stable UI order.
   */
  function getSelectableCardLanguages(card: PokemonCardAggregate): PokemonCardLanguage[] {
    const localizedLanguages = SUPPORTED_CARD_LANGUAGES.filter(
      (language) => card.languages[language] !== undefined,
    );
    const imageLanguages = localizedLanguages.filter(
      (language) => card.languages[language]?.image !== null,
    );

    if (imageLanguages.length > 0) {
      return imageLanguages;
    }

    return localizedLanguages;
  }

  /**
   * Maps the currently visible localized cards to gallery/viewer tile data.
   *
   * @param cards - Aggregated cards for every supported language.
   * @param selectedLanguage - Language chosen by the user.
   * @returns Tile models for the visible cards.
   */
  function mapVisibleDetailCards(cards: PokemonCardAggregate[]): PokemonCardTileData[] {
    const visibleCards: PokemonCardTileData[] = [];

    for (const card of cards) {
      const visibleVariant = getVisibleCardVariant(card, 'de');
      if (!visibleVariant) {
        continue;
      }

      const resolvedImage = resolveCardImage(card, visibleVariant.language ?? 'de');
      const availableLanguages = getSelectableCardLanguages(card);
      const variants = Object.fromEntries(
        availableLanguages.map((language) => {
          const variant = card.languages[language];

          return [
            language,
            {
              language,
              name: variant?.name ?? visibleVariant.name,
              setName: variant?.set.name ?? visibleVariant.set.name,
              number: variant?.localId ?? visibleVariant.localId,
              imageUrl: variant?.image ?? null,
              imageLanguage: variant?.image ? language : null,
              price: variant?.price ?? null,
            },
          ];
        }),
      );

      visibleCards.push({
        id: card.id,
        language: visibleVariant.language,
        availableLanguages,
        imageLanguage: resolvedImage.imageLanguage,
        variants,
        name: visibleVariant.name,
        setName: visibleVariant.set.name,
        number: visibleVariant.localId,
        imageUrl: resolvedImage.imageUrl,
        price: visibleVariant.price,
      });
    }

    return visibleCards;
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
   * Aborts the currently active detail cards request.
   */
  function cancelDetailCardsInFlight() {
    if (activeDetailCardsAbort) {
      activeDetailCardsAbort.abort();
      activeDetailCardsAbort = null;
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
   * Maps cards request errors to user-facing German messages.
   *
   * @param error - Error thrown by the cards flow.
   * @returns Message for the local cards section.
   */
  function toDetailCardsErrorMessage(error: unknown): string {
    if (isSearchPokemonError(error)) {
      if (error.code === 'timeout') {
        return 'Die Karten haben zu lange geladen. Bitte versuche es erneut.';
      }

      if (error.code === 'server') {
        return 'Die Kartenquelle antwortet gerade nicht richtig. Bitte versuche es erneut.';
      }
    }

    return 'Die Karten konnten gerade nicht geladen werden.';
  }

  /**
   * Starts loading localized TCG cards for the active detail Pokemon.
   *
   * @param pokemon - Current Pokemon detail payload.
   */
  async function loadDetailCards(pokemon: PokemonDetail) {
    const requestToken = ++nextDetailCardsRequestToken;
    cancelDetailCardsInFlight();

    const requestAbort = new AbortController();
    activeDetailCardsAbort = requestAbort;
    detailCardsUiState = 'loading';
    detailCardsErrorMessage = '';
    try {
      const cards = await fetchPokemonCards(pokemon.id, requestAbort.signal);
      if (requestToken !== nextDetailCardsRequestToken) {
        return;
      }

      detailCards = cards;
      detailCardsUiState = mapVisibleDetailCards(cards).length > 0 ? 'success' : 'empty';
    } catch (error) {
      if (requestToken !== nextDetailCardsRequestToken) {
        return;
      }

      if (error instanceof DOMException && error.name === 'AbortError') {
        return;
      }

      detailCards = [];
      detailCardsErrorMessage = toDetailCardsErrorMessage(error);
      detailCardsUiState = 'error';
    }
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
   * Synchronizes route and navigation context from popstate/hash changes.
   *
   * @param event - Browser history/navigation event.
   */
  function onLocationChange(event?: PopStateEvent | HashChangeEvent) {
    const state = event instanceof PopStateEvent ? (event.state as unknown) : null;
    openedFromResults = wasOpenedFromResults(state);
    route = parseRoute(window.location.hash);
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
        detailCards = [];
        detailCardsErrorMessage = '';
        detailCardsUiState = 'idle';
        detailUiState = 'empty';
        return;
      }

      detail = found;
      detailUiState = 'success';
      void loadDetailCards(found);
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
      detailCards = [];
      detailCardsErrorMessage = '';
      detailCardsUiState = 'idle';
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
    cancelDetailCardsInFlight();

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
    if (route.kind !== 'detail') {
      lastDetailRouteId = null;
      detailCards = [];
      detailCardsErrorMessage = '';
      detailCardsUiState = 'idle';
      cancelDetailInFlight();
      cancelDetailCardsInFlight();
      return;
    }

    if (lastDetailRouteId === route.id) {
      return;
    }

    lastDetailRouteId = route.id;
    void loadDetail(route.id);
  });
</script>

<svelte:window onpopstate={onLocationChange} onhashchange={onLocationChange} />

<main class="app">
  {#if route.kind === 'search'}
    <section class="app__search-shell">
      <div class="app__search-shell-accent" aria-hidden="true"></div>
      <div class="app__search-shell-body">
        <header class="app__header">
          <h1 class="app__title">Pokemon entdecken</h1>
        </header>

        <section class="app__search">
          <SearchBar bind:query submitDisabled={uiState === 'loading'} onSubmit={onManualSubmit} />
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
          details="Mindestens 2 Buchstaben eines deutschen Namens oder 1+ Ziffern für ID-Suche."
        />
      {:else if uiState === 'invalid'}
        <StatusState
          tone="neutral"
          title="Bitte genauer suchen"
          message="Gib mindestens 2 Buchstaben oder eine Nummer ein."
          details="Mindestens 2 Buchstaben eines deutschen Namens oder 1+ Ziffern für ID-Suche."
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
        {@const currentDetail = detail}
        <article class="detail__content">
          <section class="detail__hero">
            <div class="detail__image-wrap">
              {#key currentDetail.id}
                <PokemonArtworkCard
                  displayName={currentDetail.displayName}
                  image={currentDetail.image}
                />
              {/key}
            </div>

            <div class="detail__hero-meta">
              <div class="detail__identity">
                <p class="detail__id">{formatId(currentDetail.id)}</p>
                <div class="detail__name-row">
                  <h1 class="detail__name">{currentDetail.displayName}</h1>
                </div>
              </div>
              <div class="detail__hero-support">
                <p class="meta-chip meta-chip--stage meta-chip--detail">
                  <span class="meta-chip__label">Stufe</span>
                  <span class="meta-chip__value">{currentDetail.evolution.stage}</span>
                </p>
                <div class="card__types" aria-label="Pokemon-Typen">
                  {#each currentDetail.types as type (type.name)}
                    <span class="type-chip">{type.name}</span>
                  {/each}
                </div>
              </div>
              <p
                class={`detail__hero-text ${currentDetail.flavorText ? '' : 'detail__hero-text--empty'}`}
              >
                {currentDetail.flavorText ?? HERO_TEXT_PLACEHOLDER}
              </p>
            </div>
          </section>

          {#if hasEvolutionRelations(currentDetail)}
            <section class="detail__section detail__section--evolution" aria-label="Entwicklung">
              <EvolutionSummary
                evolution={currentDetail.evolution}
                currentPokemonId={currentDetail.id}
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
                <p class="detail-fact__value">{formatMetric(currentDetail.heightMeters)} m</p>
              </article>
              <article class="detail-fact">
                <p class="detail-fact__label">Gewicht</p>
                <p class="detail-fact__value">{formatMetric(currentDetail.weightKilograms)} kg</p>
              </article>
              {#if currentDetail.category}
                <article class="detail-fact">
                  <p class="detail-fact__label">Kategorie</p>
                  <p class="detail-fact__value">{currentDetail.category}</p>
                </article>
              {/if}
            </div>
          </section>

          {#if detailCardsUiState !== 'idle'}
            <PokemonCardsGallery
              pokemonName={currentDetail.displayName}
              galleryState={detailCardsUiState}
              cards={visibleDetailCards}
              availableLanguages={SUPPORTED_CARD_LANGUAGES}
              errorMessage={detailCardsErrorMessage}
              onRetry={() => void loadDetailCards(currentDetail)}
            />
          {/if}
        </article>
      {/if}
    </section>
  {/if}
</main>
