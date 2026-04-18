<script lang="ts">
  import { onMount } from 'svelte';
  import type { PokemonCardTileData } from '../types/pokemonCards';

  /**
   * Props for one TCG card tile.
   */
  interface Props {
    card: PokemonCardTileData;
    interactive?: boolean;
  }

  const { card, interactive = false }: Props = $props();

  const hasImage = $derived.by(() => card.imageUrl !== null);
  const titleId = $derived.by(() => `card-title-${card.id}`);
  const metaId = $derived.by(() => `card-meta-${card.id}`);
  let artboard = $state<HTMLDivElement | null>(null);
  let shouldLoadImage = $state(false);
  let imageLoaded = $state(false);
  let lastImageKey = $state('');

  $effect(() => {
    const nextImageKey = `${card.id}:${card.imageUrl ?? 'none'}`;
    if (lastImageKey === nextImageKey) {
      return;
    }

    lastImageKey = nextImageKey;
    imageLoaded = false;
    if (card.imageUrl === null) {
      imageLoaded = false;
    }
  });

  /**
   * Builds a compact display number, preserving the source value.
   *
   * @param number - Raw collector number from the card source.
   * @returns Human-readable German label for the collector number.
   */
  function formatNumber(number: string): string {
    return `Nr. ${number}`;
  }

  /**
   * Returns a visible flag marker for one image language.
   *
   * @param language - Language used by the currently shown card image.
   * @returns Flag emoji for the badge.
   */
  function getLanguageFlag(language: PokemonCardTileData['language']): string {
    if (language === 'de') {
      return '🇩🇪';
    }

    if (language === 'en') {
      return '🇬🇧';
    }

    if (language === 'ja') {
      return '🇯🇵';
    }

    return '🏳️';
  }

  /**
   * Resolves the visible image-fallback flag safely for template use.
   *
   * @param cardData - Current tile data.
   * @returns Flag for the image language or a neutral marker.
   */
  function getImageLanguageFlag(cardData: PokemonCardTileData): string {
    return getLanguageFlag(cardData.imageLanguage ?? undefined);
  }

  /**
   * Detects whether the visible card art currently comes from another language than the text.
   *
   * @param cardData - Current tile data.
   * @returns True when the image uses a fallback language.
   */
  function hasImageLanguageFallback(cardData: PokemonCardTileData): boolean {
    return (
      cardData.imageUrl !== null &&
      cardData.language !== undefined &&
      cardData.imageLanguage !== null &&
      cardData.imageLanguage !== undefined &&
      cardData.imageLanguage !== cardData.language
    );
  }

  onMount(() => {
    if (!hasImage) {
      return;
    }

    if (!artboard || typeof IntersectionObserver !== 'function') {
      shouldLoadImage = true;
      return;
    }

    const observer = new IntersectionObserver(
      (entries) => {
        if (entries.some((entry) => entry.isIntersecting)) {
          shouldLoadImage = true;
          observer.disconnect();
        }
      },
      { rootMargin: '160px' },
    );

    observer.observe(artboard);

    return () => {
      observer.disconnect();
    };
  });

  /**
   * Marks the inline card image as ready once the browser finished loading it.
   */
  function handleImageLoad() {
    imageLoaded = true;
  }

  /**
   * Falls back to the tile placeholder when the image cannot be shown.
   */
  function handleImageError() {
    shouldLoadImage = false;
    imageLoaded = false;
  }
</script>

<article
  class={`cards-tile ${interactive ? 'cards-tile--interactive' : ''}`}
  aria-labelledby={titleId}
  aria-describedby={metaId}
>
  <div class="cards-tile__artboard" bind:this={artboard}>
    {#if hasImage && shouldLoadImage}
      <img
        class={`cards-tile__image ${imageLoaded ? '' : 'cards-tile__image--loading'}`}
        src={card.imageUrl}
        alt={card.name}
        loading="lazy"
        onload={handleImageLoad}
        onerror={handleImageError}
      />
      {#if !imageLoaded}
        <div class="cards-tile__image-placeholder" aria-hidden="true"></div>
      {/if}
    {:else if hasImage}
      <div class="cards-tile__image-placeholder" aria-hidden="true"></div>
    {:else}
      <div class="cards-tile__fallback" aria-hidden="true">
        <span>Kein Bild</span>
      </div>
    {/if}
  </div>

  <div class="cards-tile__content">
    <h3 class="cards-tile__name" id={titleId}>{card.name}</h3>
    {#if hasImageLanguageFallback(card)}
      <p class="cards-tile__badge" aria-label="Kartenbild mit Sprach-Fallback">
        Bild {getImageLanguageFlag(card)}
      </p>
    {/if}
    <p class="cards-tile__meta" id={metaId}>
      <span class="cards-tile__set">{card.setName}</span>
      <span class="cards-tile__separator" aria-hidden="true">•</span>
      <span class="cards-tile__number">{formatNumber(card.number)}</span>
    </p>
  </div>
</article>

<style>
  .cards-tile {
    min-width: 0;
    display: grid;
    gap: 12px;
    border-radius: 22px;
    border: 1px solid #cfdff3;
    background:
      radial-gradient(circle at top left, rgba(255, 255, 255, 0.9), transparent 45%),
      linear-gradient(180deg, #fffdf8 0%, #f2f7ff 100%);
    box-shadow:
      inset 0 1px 0 rgba(255, 255, 255, 0.9),
      0 10px 24px rgba(53, 81, 126, 0.08);
    padding: 12px;
  }

  .cards-tile--interactive {
    transition:
      transform 160ms ease,
      box-shadow 160ms ease,
      border-color 160ms ease;
  }

  .cards-tile--interactive:hover {
    border-color: #aac5ec;
    box-shadow:
      inset 0 1px 0 rgba(255, 255, 255, 0.9),
      0 14px 28px rgba(53, 81, 126, 0.12);
  }

  .cards-tile__artboard {
    position: relative;
    aspect-ratio: 63 / 88;
    border-radius: 18px;
    overflow: hidden;
    background: linear-gradient(180deg, #f9fbff 0%, #eaf1ff 100%);
    border: 1px solid #d7e3f4;
    display: grid;
    place-items: center;
  }

  .cards-tile__image {
    width: 100%;
    height: 100%;
    object-fit: contain;
    display: block;
    transition: opacity 160ms ease;
  }

  .cards-tile__image--loading {
    opacity: 0;
  }

  .cards-tile__image-placeholder {
    width: 100%;
    height: 100%;
    background: linear-gradient(90deg, #ecf3ff 0%, #f7faff 50%, #ecf3ff 100%);
    background-size: 220% 100%;
    animation: cards-tile-shimmer 1.6s ease-in-out infinite;
  }

  .cards-tile__fallback {
    width: 100%;
    height: 100%;
    display: grid;
    place-items: center;
    color: var(--text-muted);
    font-weight: 700;
    font-size: 0.95rem;
    text-align: center;
    padding: 1rem;
  }

  .cards-tile__content {
    display: grid;
    gap: 6px;
    min-width: 0;
  }

  .cards-tile__name {
    margin: 0;
    font-size: 1.05rem;
    line-height: 1.15;
    font-weight: 800;
    color: var(--text);
    word-break: normal;
    overflow-wrap: anywhere;
    hyphens: auto;
  }

  .cards-tile__meta {
    margin: 0;
    color: var(--text-muted);
    font-size: 0.92rem;
    line-height: 1.35;
    display: flex;
    flex-wrap: wrap;
    gap: 0.35rem;
    min-width: 0;
  }

  .cards-tile__badge {
    margin: 0;
    justify-self: start;
    display: inline-flex;
    align-items: center;
    min-height: 1.8rem;
    padding: 0.2rem 0.7rem;
    border-radius: 999px;
    background: linear-gradient(180deg, #fff3cf 0%, #ffe5a8 100%);
    color: #704c06;
    font-size: 0.8rem;
    font-weight: 800;
    letter-spacing: 0.01em;
    box-shadow: inset 0 1px 0 rgba(255, 255, 255, 0.75);
  }

  .cards-tile__separator {
    opacity: 0.7;
  }

  .cards-tile__set,
  .cards-tile__number {
    min-width: 0;
  }

  @media (min-width: 720px) {
    .cards-tile {
      padding: 14px;
      border-radius: 24px;
    }

    .cards-tile__name {
      font-size: 1.1rem;
    }
  }

  @keyframes cards-tile-shimmer {
    0% {
      background-position: 100% 0;
    }

    100% {
      background-position: -100% 0;
    }
  }
</style>
