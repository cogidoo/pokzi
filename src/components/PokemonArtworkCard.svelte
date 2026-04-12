<script lang="ts">
  /**
   * Input contract for the detail hero artwork card.
   */
  interface PokemonArtworkCardProps {
    displayName: string;
    image: string | null;
  }

  const { displayName, image }: PokemonArtworkCardProps = $props();
</script>

<div class="detail-artwork-card" aria-label={`${displayName} Artwork`}>
  <span class="detail-artwork-card__media">
    {#if image}
      <img class="detail-artwork-card__image" src={image} alt={displayName} loading="eager" />
    {:else}
      <span class="detail-artwork-card__fallback">Kein Bild</span>
    {/if}
  </span>
</div>
