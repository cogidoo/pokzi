<script lang="ts">
  import { onMount } from 'svelte';
  import type { PokemonCardLanguage, PokemonCardTileData } from '../types/pokemonCards';
  import PokemonCardTile from './PokemonCardTile.svelte';
  import PokemonCardViewer from './PokemonCardViewer.svelte';

  /**
   * Local section state used by the TCG gallery.
   */
  export type PokemonCardsGalleryState = 'loading' | 'success' | 'empty' | 'error' | 'refreshing';

  /**
   * Props for the cards gallery section.
   */
  interface Props {
    pokemonName: string;
    cards?: PokemonCardTileData[];
    galleryState?: PokemonCardsGalleryState;
    availableLanguages?: PokemonCardLanguage[];
    emptyMessage?: string;
    errorMessage?: string;
    onRetry?: (() => void) | null;
  }

  const {
    pokemonName,
    cards = [],
    galleryState = 'success',
    availableLanguages = [],
    emptyMessage = 'Dazu wurden gerade keine Karten gefunden.',
    errorMessage = 'Die Karten konnten gerade nicht geladen werden.',
    onRetry = null,
  }: Props = $props();

  let viewport = $state<HTMLDivElement | null>(null);
  let prefersReducedMotion = $state(false);
  let activeCardId = $state<string | null>(null);
  const orderedCards = $derived.by(() => sortCards(cards));
  const cardCount = $derived(orderedCards.length);
  const activeCardIndex = $derived.by(() => {
    if (activeCardId === null) {
      return null;
    }

    const index = orderedCards.findIndex((card) => card.id === activeCardId);
    return index === -1 ? null : index;
  });
  const showControls = $derived(
    cardCount > 1 && (galleryState === 'success' || galleryState === 'refreshing'),
  );
  const isBusy = $derived(galleryState === 'loading' || galleryState === 'refreshing');
  const showCardCount = $derived(
    cardCount > 0 && (galleryState === 'success' || galleryState === 'refreshing'),
  );
  $effect(() => {
    if (activeCardId === null) {
      return;
    }

    if (cardCount === 0) {
      activeCardId = null;
      return;
    }
  });

  $effect(() => {
    if (galleryState !== 'success' && galleryState !== 'refreshing') {
      return;
    }
    resetGalleryPosition();
  });

  /**
   * Keeps the gallery scroll step aligned with the visible card width.
   *
   * @param direction - Scroll direction for the gallery viewport.
   */
  function scrollByCards(direction: -1 | 1) {
    const galleryViewport = viewport;
    if (!galleryViewport) {
      return;
    }

    const amount = Math.max(240, Math.round(galleryViewport.clientWidth * 0.86));

    galleryViewport.scrollBy({
      left: direction * amount,
      behavior: prefersReducedMotion ? 'auto' : 'smooth',
    });
  }

  /**
   * Brings the gallery viewport back to the first card/marker.
   */
  function resetGalleryPosition() {
    const galleryViewport = viewport;
    if (!galleryViewport) {
      return;
    }

    if (typeof galleryViewport.scrollTo === 'function') {
      galleryViewport.scrollTo({
        left: 0,
        behavior: prefersReducedMotion ? 'auto' : 'smooth',
      });
      return;
    }

    galleryViewport.scrollLeft = 0;
  }

  /**
   * Forwards the local retry intent to the parent.
   */
  function retry() {
    onRetry?.();
  }

  /**
   * Keeps German cards first, then English-only cards, then Japanese-only cards.
   *
   * @param sourceCards - Raw gallery cards from the current detail view.
   * @returns Stable sorted card list with image-backed cards preferred inside one language bucket.
   */
  function sortCards(sourceCards: PokemonCardTileData[]): PokemonCardTileData[] {
    return [...sourceCards].sort((left, right) => {
      const languagePriority = getLanguagePriority(left) - getLanguagePriority(right);
      if (languagePriority !== 0) {
        return languagePriority;
      }

      const imagePriority = Number(right.imageUrl !== null) - Number(left.imageUrl !== null);
      if (imagePriority !== 0) {
        return imagePriority;
      }

      return left.number.localeCompare(right.number, 'de');
    });
  }

  /**
   * Groups cards by their visible text language for the fixed gallery order.
   *
   * @param card - Visible card tile.
   * @returns Numeric priority for sorting.
   */
  function getLanguagePriority(card: PokemonCardTileData): number {
    if (card.language === 'de') {
      return 0;
    }

    if (card.language === 'en') {
      return 1;
    }

    return 2;
  }

  /**
   * Opens one card in the fullscreen viewer.
   *
   * @param index - Card index inside the ordered gallery list.
   */
  function openCard(index: number) {
    activeCardId = orderedCards[index]?.id ?? null;
  }

  /**
   * Closes the fullscreen viewer.
   */
  function closeViewer() {
    activeCardId = null;
  }

  /**
   * Builds a descriptive button label for one card tile.
   *
   * @param card - Card represented by the tile button.
   * @returns Localized aria-label for opening the fullscreen viewer.
   */
  function getOpenLabel(card: PokemonCardTileData): string {
    return `${card.name} aus ${card.setName}, Nr. ${card.number} öffnen`;
  }

  /**
   * Selects a new card inside the fullscreen viewer.
   *
   * @param index - Ordered card index chosen inside the viewer.
   */
  function selectViewerCard(index: number) {
    activeCardId = orderedCards[index]?.id ?? null;
  }

  onMount(() => {
    if (typeof window.matchMedia !== 'function') {
      prefersReducedMotion = false;
      return;
    }

    const media = window.matchMedia('(prefers-reduced-motion: reduce)');
    const update = () => {
      prefersReducedMotion = media.matches;
    };

    update();
    media.addEventListener('change', update);

    return () => {
      media.removeEventListener('change', update);
    };
  });
</script>

<section
  class="detail__section cards-gallery"
  aria-label={`Karten zu ${pokemonName}`}
  aria-busy={isBusy}
>
  <div class="detail__section-head cards-gallery__head">
    <div class="cards-gallery__title-row">
      <h2 class="detail__section-title">Karten</h2>
      <div class="cards-gallery__head-tools">
        {#if showCardCount}
          <span class="cards-gallery__count" aria-label={`${String(cardCount)} Karten gefunden`}>
            {cardCount}
          </span>
        {/if}
        {#if galleryState === 'refreshing'}
          <span class="cards-gallery__badge" aria-live="polite">Wird aktualisiert</span>
        {/if}
      </div>
    </div>
  </div>

  {#if galleryState === 'error'}
    <div class="cards-gallery__status cards-gallery__status--error" role="alert">
      <p class="cards-gallery__status-title">Karten laden gerade nicht</p>
      <p class="cards-gallery__status-message">{errorMessage}</p>
      {#if onRetry}
        <button class="cards-gallery__retry" type="button" onclick={retry}>Erneut versuchen</button>
      {/if}
    </div>
  {:else if galleryState === 'empty'}
    <div
      class="cards-gallery__status cards-gallery__status--empty"
      role="status"
      aria-live="polite"
    >
      <p class="cards-gallery__status-title">Noch keine Karten gefunden</p>
      <p class="cards-gallery__status-message">{emptyMessage}</p>
    </div>
  {:else if galleryState === 'loading'}
    <div class="cards-gallery__viewport" aria-label="Karten werden geladen">
      {#each [0, 1, 2] as skeletonIndex (skeletonIndex)}
        <div class="cards-gallery__skeleton" aria-hidden="true">
          <div class="cards-gallery__skeleton-art"></div>
          <div class="cards-gallery__skeleton-line cards-gallery__skeleton-line--strong"></div>
          <div class="cards-gallery__skeleton-line"></div>
        </div>
      {/each}
    </div>
  {:else}
    <div class="cards-gallery__shell">
      {#if showControls}
        <button
          class="cards-gallery__nav cards-gallery__nav--prev"
          type="button"
          aria-label="Vorherige Karten"
          onclick={() => {
            scrollByCards(-1);
          }}
        >
          ‹
        </button>
      {/if}

      <div
        class="cards-gallery__viewport"
        bind:this={viewport}
        aria-label="Horizontale Kartenliste"
      >
        {#each orderedCards as card, index (card.id)}
          <button
            class="cards-gallery__item-button"
            type="button"
            aria-label={getOpenLabel(card)}
            onclick={() => {
              openCard(index);
            }}
          >
            <div class="cards-gallery__item">
              <PokemonCardTile {card} interactive />
            </div>
          </button>
        {/each}
      </div>

      {#if showControls}
        <button
          class="cards-gallery__nav cards-gallery__nav--next"
          type="button"
          aria-label="Nächste Karten"
          onclick={() => {
            scrollByCards(1);
          }}
        >
          ›
        </button>
      {/if}
    </div>
  {/if}
</section>

{#if activeCardIndex !== null}
  <PokemonCardViewer
    cards={orderedCards}
    currentIndex={activeCardIndex}
    {availableLanguages}
    onClose={closeViewer}
    onSelect={selectViewerCard}
  />
{/if}

<style>
  .cards-gallery {
    display: grid;
    gap: 16px;
    background: linear-gradient(180deg, #ffffff 0%, #f8fbff 100%);
    border-color: #dce7f4;
  }

  .cards-gallery__head {
    gap: 0;
  }

  .cards-gallery__title-row {
    display: flex;
    align-items: center;
    justify-content: space-between;
    flex-wrap: wrap;
    gap: 12px;
  }

  .cards-gallery__head-tools {
    display: flex;
    align-items: center;
    justify-content: flex-end;
    flex-wrap: wrap;
    gap: 10px;
  }

  .cards-gallery__badge {
    min-height: 30px;
    padding: 0 12px;
    border-radius: 999px;
    display: inline-flex;
    align-items: center;
    background: #edf4ff;
    color: #31507a;
    border: 1px solid #d2e2f7;
    font-size: 0.82rem;
    font-weight: 800;
    white-space: nowrap;
  }

  .cards-gallery__count {
    min-width: 2.25rem;
    height: 2.25rem;
    padding: 0 0.65rem;
    border-radius: 999px;
    display: inline-flex;
    align-items: center;
    justify-content: center;
    background: linear-gradient(180deg, #edf4ff 0%, #dfeefe 100%);
    border: 1px solid #c9dcf3;
    color: #244c72;
    font-size: 0.92rem;
    font-weight: 900;
    box-shadow:
      inset 0 1px 0 rgba(255, 255, 255, 0.85),
      0 8px 16px rgba(53, 81, 126, 0.08);
  }

  .cards-gallery__shell {
    position: relative;
    min-width: 0;
    display: block;
  }

  .cards-gallery__viewport {
    display: grid;
    grid-auto-flow: column;
    grid-auto-columns: minmax(220px, 74vw);
    gap: 14px;
    overflow-x: auto;
    padding: 4px 2px 10px;
    scroll-snap-type: x mandatory;
    scroll-padding-inline: 2px;
    overscroll-behavior-x: contain;
    scrollbar-width: thin;
    scrollbar-color: #c6d9f0 transparent;
  }

  .cards-gallery__viewport::-webkit-scrollbar {
    height: 10px;
  }

  .cards-gallery__viewport::-webkit-scrollbar-thumb {
    background: #c6d9f0;
    border-radius: 999px;
  }

  .cards-gallery__viewport::-webkit-scrollbar-track {
    background: transparent;
  }

  .cards-gallery__item {
    scroll-snap-align: start;
    min-width: 0;
  }

  .cards-gallery__item-button {
    scroll-snap-align: start;
    min-width: 0;
    padding: 0;
    border: 0;
    background: transparent;
    text-align: left;
  }

  .cards-gallery__item-button:focus-visible {
    outline: 3px solid #7ea8f4;
    outline-offset: 4px;
    border-radius: 24px;
  }

  .cards-gallery__nav {
    position: absolute;
    top: 42%;
    width: 42px;
    height: 42px;
    border-radius: 999px;
    border: 1px solid #c9d8ea;
    background: rgba(255, 255, 255, 0.96);
    color: #31507a;
    display: grid;
    place-items: center;
    font-size: 1.6rem;
    line-height: 1;
    box-shadow: 0 10px 18px rgba(58, 90, 131, 0.12);
    transform: translateY(-50%);
  }

  .cards-gallery__nav:hover {
    border-color: #a8c3ec;
    box-shadow: 0 12px 20px rgba(58, 90, 131, 0.16);
  }

  .cards-gallery__nav:focus-visible {
    outline: 3px solid #7ea8f4;
    outline-offset: 2px;
  }

  .cards-gallery__nav--prev {
    left: -10px;
  }

  .cards-gallery__nav--next {
    right: -10px;
  }

  .cards-gallery__status {
    display: grid;
    gap: 6px;
    border-radius: 18px;
    border: 1px solid #d7e3f3;
    background: linear-gradient(180deg, #fcfdff 0%, #f2f7ff 100%);
    padding: 16px;
  }

  .cards-gallery__status--error {
    border-color: #f0c6c6;
    background: linear-gradient(180deg, #fff9f9 0%, #fff2f2 100%);
  }

  .cards-gallery__status--empty {
    background: linear-gradient(180deg, #ffffff 0%, #f7fbff 100%);
  }

  .cards-gallery__status-title {
    margin: 0;
    font-size: 1.05rem;
    font-weight: 800;
    color: var(--text);
  }

  .cards-gallery__status-message {
    margin: 0;
    color: var(--text-muted);
    line-height: 1.45;
  }

  .cards-gallery__retry {
    width: fit-content;
    min-height: 42px;
    padding: 0 16px;
    border-radius: 999px;
    border: 1px solid #b8cae4;
    background: #ffffff;
    color: #274060;
    font-weight: 700;
  }

  .cards-gallery__retry:hover {
    border-color: #93b4e0;
    box-shadow: 0 10px 18px rgba(58, 90, 131, 0.12);
  }

  .cards-gallery__retry:focus-visible {
    outline: 3px solid #7ea8f4;
    outline-offset: 2px;
  }

  .cards-gallery__skeleton {
    min-width: 0;
    display: grid;
    gap: 12px;
    padding: 12px;
    border-radius: 22px;
    border: 1px solid #d7e3f4;
    background: linear-gradient(180deg, #fbfdff 0%, #eef4ff 100%);
  }

  .cards-gallery__skeleton-art {
    aspect-ratio: 63 / 88;
    border-radius: 18px;
    background:
      linear-gradient(
        90deg,
        rgba(255, 255, 255, 0.15),
        rgba(255, 255, 255, 0.6),
        rgba(255, 255, 255, 0.15)
      ),
      #dfe8f5;
    background-size: 200% 100%;
  }

  .cards-gallery__skeleton-line {
    height: 12px;
    border-radius: 999px;
    background: #dce6f3;
  }

  .cards-gallery__skeleton-line--strong {
    width: 72%;
    height: 14px;
  }

  @media (min-width: 560px) {
    .cards-gallery__viewport {
      grid-auto-columns: minmax(220px, 42vw);
    }
  }

  @media (min-width: 720px) {
    .cards-gallery__viewport {
      grid-auto-columns: minmax(220px, 28vw);
    }
  }

  @media (min-width: 980px) {
    .cards-gallery__viewport {
      grid-auto-columns: minmax(220px, 20vw);
    }
  }

  @media (prefers-reduced-motion: reduce) {
    .cards-gallery__viewport {
      scroll-behavior: auto;
    }
  }
</style>
