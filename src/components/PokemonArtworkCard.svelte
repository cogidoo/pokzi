<script lang="ts">
  import type { PokemonAttack } from '../types/pokemon';

  /**
   * Input contract for the detail hero artwork card.
   */
  interface PokemonArtworkCardProps {
    displayName: string;
    image: string | null;
    attacks: PokemonAttack[];
  }

  const { displayName, image, attacks }: PokemonArtworkCardProps = $props();
  let flipped = $state(false);

  /**
   * Toggles between artwork and attack-card back side.
   */
  function toggleCard() {
    flipped = !flipped;
  }
</script>

<button
  class={`detail-artwork-card ${flipped ? 'detail-artwork-card--flipped' : ''}`}
  type="button"
  aria-pressed={flipped}
  aria-label={flipped ? `${displayName}-Bild zeigen` : `Angriffe von ${displayName} zeigen`}
  onclick={toggleCard}
>
  <span class="detail-artwork-card__inner">
    <span class="detail-artwork-card__face detail-artwork-card__face--front">
      <span class="detail-artwork-card__media">
        {#if image}
          <img class="detail-artwork-card__image" src={image} alt={displayName} loading="eager" />
        {:else}
          <span class="detail-artwork-card__fallback">Kein Bild</span>
        {/if}
      </span>
    </span>

    <span class="detail-artwork-card__face detail-artwork-card__face--back" aria-hidden={!flipped}>
      <span class="detail-artwork-card__media detail-artwork-card__media--backdrop">
        {#if image}
          <img class="detail-artwork-card__backdrop" src={image} alt="" />
        {/if}
      </span>

      <span class="detail-artwork-card__content">
        {#if attacks.length > 0}
          <span class="detail-artwork-card__attack-list">
            {#each attacks as attack (attack.name)}
              <span class="detail-artwork-card__attack">
                <span class="detail-artwork-card__attack-name">{attack.name}</span>
                <span class="detail-artwork-card__attack-meta">
                  <span class="detail-artwork-card__attack-type">{attack.typeName}</span>
                  <span class="detail-artwork-card__attack-damage">{attack.damage} Schaden</span>
                </span>
              </span>
            {/each}
          </span>
        {:else}
          <span class="detail-artwork-card__empty">Keine passenden Angriffe gefunden.</span>
        {/if}
      </span>
    </span>
  </span>

  <span class="detail-artwork-card__hint" aria-hidden="true">
    <svg viewBox="0 0 24 24" class="detail-artwork-card__hint-icon" focusable="false">
      <path
        d="M8 7.5a6 6 0 0 1 9.8 2"
        fill="none"
        stroke="currentColor"
        stroke-linecap="round"
        stroke-linejoin="round"
        stroke-width="2"
      />
      <path
        d="m18 7.3-.2 4-4-.5"
        fill="none"
        stroke="currentColor"
        stroke-linecap="round"
        stroke-linejoin="round"
        stroke-width="2"
      />
      <path
        d="M16 16.5a6 6 0 0 1-9.8-2"
        fill="none"
        stroke="currentColor"
        stroke-linecap="round"
        stroke-linejoin="round"
        stroke-width="2"
      />
      <path
        d="m6 16.7.2-4 4 .5"
        fill="none"
        stroke="currentColor"
        stroke-linecap="round"
        stroke-linejoin="round"
        stroke-width="2"
      />
    </svg>
    <span class="visually-hidden">Karte drehen</span>
  </span>
</button>
