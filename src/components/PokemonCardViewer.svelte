<script lang="ts">
  import { onMount } from 'svelte';
  import type { PokemonCardTileData } from '../types/pokemonCards';

  /**
   * Props for the fullscreen card viewer overlay.
   */
  interface Props {
    cards: PokemonCardTileData[];
    currentIndex: number;
    onClose: () => void;
    onSelect: (index: number) => void;
  }

  const EMPTY_CARD: PokemonCardTileData = {
    id: 'empty',
    name: 'Karte',
    setName: 'Kein Set',
    number: '0',
    imageUrl: null,
  };

  const { cards, currentIndex, onClose, onSelect }: Props = $props();

  let shell = $state<HTMLElement | null>(null);
  let closeButton = $state<HTMLButtonElement | null>(null);
  let previouslyFocusedElement = $state<HTMLElement | null>(null);
  let touchStartX = $state<number | null>(null);
  const currentCard = $derived.by(() => getCurrentCard(cards, currentIndex));
  const hasPrevious = $derived(currentIndex > 0);
  const hasNext = $derived(currentIndex < cards.length - 1);
  const viewerImageUrl = $derived.by(() => toViewerImageUrl(currentCard.imageUrl));
  const progressLabel = $derived.by(() => getProgressLabel(currentIndex, cards.length));
  const fallbackSummary = $derived.by(() => getFallbackSummary(currentCard));
  const cardNumberLabel = $derived.by(() => getCardNumberLabel(currentCard.number));

  /**
   * Opens the previous card when available.
   */
  function showPrevious() {
    if (hasPrevious) {
      onSelect(currentIndex - 1);
    }
  }

  /**
   * Opens the next card when available.
   */
  function showNext() {
    if (hasNext) {
      onSelect(currentIndex + 1);
    }
  }

  /**
   * Tracks the first touch X position to detect swipe gestures.
   *
   * @param event - Touch start event on the viewer stage.
   */
  function handleTouchStart(event: TouchEvent) {
    touchStartX = getTouchClientX(event.touches);
  }

  /**
   * Resolves swipe direction and triggers previous/next navigation.
   *
   * @param event - Touch end event on the viewer stage.
   */
  function handleTouchEnd(event: TouchEvent) {
    const endX = getTouchClientX(event.changedTouches);
    if (touchStartX === null || endX === null) {
      touchStartX = null;
      return;
    }

    const deltaX = endX - touchStartX;
    touchStartX = null;

    if (deltaX <= -40) {
      showNext();
      return;
    }

    if (deltaX >= 40) {
      showPrevious();
    }
  }

  /**
   * Upgrades a gallery image URL to a fullscreen card image URL.
   *
   * @param imageUrl - Gallery image URL, usually the low-quality web asset.
   * @returns Fullscreen-ready image URL or the original value when no upgrade is possible.
   */
  function toViewerImageUrl(imageUrl: string | null): string | null {
    if (!imageUrl) {
      return null;
    }

    if (imageUrl.endsWith('/low.webp')) {
      return imageUrl.replace(/\/low\.webp$/, '/high.webp');
    }

    return imageUrl;
  }

  /**
   * Reads the first touch coordinate from either a real TouchList or a test-friendly array-like value.
   *
   * @param touchList - Touch collection from the current event.
   * @returns The first client X coordinate when available.
   */
  function getTouchClientX(
    touchList:
      | TouchList
      | { 0?: { clientX: number }; item?: (index: number) => { clientX: number } | null },
  ): number | null {
    const firstTouch = touchList.item?.(0) ?? touchList[0] ?? null;
    return firstTouch?.clientX ?? null;
  }

  /**
   * Resolves the currently selected card safely for lint-friendly template access.
   *
   * @param availableCards - Ordered cards shown inside the viewer.
   * @param index - Requested selected card index.
   * @returns The selected card or `null` when the viewer has no cards.
   */
  function getCurrentCard(
    availableCards: PokemonCardTileData[],
    index: number,
  ): PokemonCardTileData {
    return availableCards[index] ?? EMPTY_CARD;
  }

  /**
   * Formats the viewer progress label.
   *
   * @param index - Current selected index.
   * @param total - Number of cards in the viewer.
   * @returns Localized progress label.
   */
  function getProgressLabel(index: number, total: number): string {
    return `Karte ${String(index + 1)} von ${String(total)}`;
  }

  /**
   * Formats the visible collector number label.
   *
   * @param number - Raw card number from TCGdex.
   * @returns Localized card number label.
   */
  function getCardNumberLabel(number: string): string {
    return `Nr. ${number}`;
  }

  /**
   * Builds the multiline fallback summary for cards without an image.
   *
   * @param card - Current viewer card.
   * @returns Compact fallback summary text.
   */
  function getFallbackSummary(card: PokemonCardTileData): string {
    return `${card.name}\n${card.setName}\n${getCardNumberLabel(card.number)}`;
  }

  /**
   * Handles global keyboard shortcuts for closing and browsing the viewer.
   *
   * @param event - Keyboard event coming from the window.
   */
  function handleWindowKeydown(event: KeyboardEvent) {
    if (event.key === 'Escape') {
      onClose();
      return;
    }

    if (event.key === 'Tab') {
      trapFocus(event);
      return;
    }

    if (event.key === 'ArrowLeft') {
      showPrevious();
      return;
    }

    if (event.key === 'ArrowRight') {
      showNext();
    }
  }

  /**
   * Keeps keyboard focus inside the fullscreen viewer while it is open.
   *
   * @param event - Global Tab key event.
   */
  function trapFocus(event: KeyboardEvent) {
    const focusableElements = getFocusableElements();
    if (focusableElements.length === 0) {
      return;
    }

    const currentFocus = document.activeElement as HTMLElement | null;
    const firstElement = focusableElements[0];
    const lastElement = focusableElements[focusableElements.length - 1];

    if (event.shiftKey) {
      if (currentFocus === firstElement) {
        event.preventDefault();
        lastElement.focus();
      }

      return;
    }

    if (currentFocus === lastElement) {
      event.preventDefault();
      firstElement.focus();
    }
  }

  /**
   * Collects focusable controls inside the active viewer shell.
   *
   * @returns Ordered focusable viewer controls.
   */
  function getFocusableElements(): HTMLElement[] {
    const viewerShell = shell ?? document.createElement('div');

    const selector =
      'button:not([disabled]), [href], input:not([disabled]), select:not([disabled]), textarea:not([disabled]), [tabindex]:not([tabindex="-1"])';

    return [...viewerShell.querySelectorAll<HTMLElement>(selector)];
  }

  onMount(() => {
    previouslyFocusedElement = document.activeElement as HTMLElement | null;
    document.body.style.overflow = 'hidden';
    closeButton?.focus();

    return () => {
      document.body.style.overflow = '';
      previouslyFocusedElement?.focus();
    };
  });
</script>

<svelte:window onkeydown={handleWindowKeydown} />

<div class="cards-viewer" role="dialog" aria-modal="true" aria-label={`Karte ${currentCard.name}`}>
  <button
    class="cards-viewer__backdrop"
    type="button"
    aria-label="Ansicht schließen"
    onclick={onClose}
  ></button>

  <section class="cards-viewer__shell" bind:this={shell}>
    <div class="cards-viewer__topbar">
      <p class="cards-viewer__eyebrow">{progressLabel}</p>
      <button
        class="cards-viewer__close"
        type="button"
        aria-label="Ansicht schließen"
        bind:this={closeButton}
        onclick={onClose}
      >
        Schließen
      </button>
    </div>

    <div
      class="cards-viewer__stage"
      role="group"
      aria-label="Kartenansicht"
      ontouchstart={handleTouchStart}
      ontouchend={handleTouchEnd}
    >
      <button
        class="cards-viewer__nav cards-viewer__nav--prev"
        type="button"
        aria-label="Vorherige Karte"
        onclick={showPrevious}
        disabled={!hasPrevious}
      >
        ‹
      </button>

      <article class="cards-viewer__card">
        <div class="cards-viewer__artboard">
          {#if viewerImageUrl}
            <img
              class="cards-viewer__image"
              src={viewerImageUrl}
              alt={currentCard.name}
              loading="eager"
            />
          {:else}
            <div class="cards-viewer__fallback">
              <p class="cards-viewer__fallback-title">Bild nicht verfügbar</p>
              <p class="cards-viewer__fallback-text">{fallbackSummary}</p>
            </div>
          {/if}
        </div>

        <div class="cards-viewer__meta">
          <h3 class="cards-viewer__name">{currentCard.name}</h3>
          <p class="cards-viewer__details">
            <span>{currentCard.setName}</span>
            <span aria-hidden="true">•</span>
            <span>{cardNumberLabel}</span>
          </p>
        </div>
      </article>

      <button
        class="cards-viewer__nav cards-viewer__nav--next"
        type="button"
        aria-label="Nächste Karte"
        onclick={showNext}
        disabled={!hasNext}
      >
        ›
      </button>
    </div>
  </section>
</div>

<style>
  .cards-viewer {
    position: fixed;
    inset: 0;
    z-index: 30;
    display: grid;
    place-items: center;
    padding: 16px;
  }

  .cards-viewer__backdrop {
    position: absolute;
    inset: 0;
    border: 0;
    background: rgba(21, 34, 56, 0.72);
  }

  .cards-viewer__shell {
    position: relative;
    z-index: 1;
    width: min(100%, 960px);
    max-height: 100%;
    display: grid;
    gap: 16px;
  }

  .cards-viewer__topbar {
    display: flex;
    justify-content: space-between;
    align-items: center;
    gap: 12px;
  }

  .cards-viewer__eyebrow {
    margin: 0;
    color: #eff4ff;
    font-size: 0.92rem;
    font-weight: 700;
  }

  .cards-viewer__close {
    min-height: 46px;
    padding: 0 16px;
    border-radius: 999px;
    border: 1px solid rgba(223, 233, 248, 0.36);
    background: rgba(255, 255, 255, 0.14);
    color: #ffffff;
    font-weight: 700;
    backdrop-filter: blur(10px);
  }

  .cards-viewer__stage {
    display: grid;
    grid-template-columns: auto minmax(0, 1fr) auto;
    align-items: center;
    gap: 12px;
  }

  .cards-viewer__nav {
    width: 48px;
    height: 48px;
    border-radius: 999px;
    border: 1px solid rgba(223, 233, 248, 0.36);
    background: rgba(255, 255, 255, 0.14);
    color: #ffffff;
    font-size: 1.7rem;
    display: grid;
    place-items: center;
    backdrop-filter: blur(10px);
  }

  .cards-viewer__nav:disabled {
    opacity: 0.35;
  }

  .cards-viewer__card {
    display: grid;
    gap: 14px;
    justify-items: center;
  }

  .cards-viewer__artboard {
    width: min(100%, 540px);
    aspect-ratio: 63 / 88;
    border-radius: 24px;
    overflow: hidden;
    background: linear-gradient(180deg, #fefefe 0%, #edf4ff 100%);
    box-shadow: 0 28px 50px rgba(10, 18, 31, 0.28);
    border: 1px solid rgba(229, 238, 251, 0.72);
  }

  .cards-viewer__image {
    width: 100%;
    height: 100%;
    object-fit: contain;
    display: block;
  }

  .cards-viewer__fallback {
    width: 100%;
    height: 100%;
    display: grid;
    align-content: center;
    justify-items: center;
    gap: 10px;
    padding: 24px;
    text-align: center;
    color: var(--text);
  }

  .cards-viewer__fallback-title {
    margin: 0;
    font-size: 1.15rem;
    font-weight: 800;
  }

  .cards-viewer__fallback-text {
    margin: 0;
    color: var(--text-muted);
    line-height: 1.45;
    white-space: pre-line;
  }

  .cards-viewer__meta {
    width: min(100%, 540px);
    display: grid;
    gap: 6px;
    color: #ffffff;
  }

  .cards-viewer__name {
    margin: 0;
    font-size: clamp(1.35rem, 4vw, 1.9rem);
    line-height: 1.1;
    text-align: center;
  }

  .cards-viewer__details {
    margin: 0;
    display: flex;
    flex-wrap: wrap;
    justify-content: center;
    gap: 8px;
    color: rgba(239, 244, 255, 0.9);
  }

  @media (max-width: 639px) {
    .cards-viewer__stage {
      grid-template-columns: minmax(0, 1fr);
    }

    .cards-viewer__nav {
      position: absolute;
      top: 50%;
      transform: translateY(-50%);
      z-index: 1;
    }

    .cards-viewer__nav--prev {
      left: 10px;
    }

    .cards-viewer__nav--next {
      right: 10px;
    }
  }
</style>
