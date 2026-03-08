<script lang="ts">
  import type { PokemonEvolutionTile } from '../types/pokemon';

  /**
   * Props for one evolution board tile.
   */
  interface Props {
    tile: PokemonEvolutionTile;
    current: boolean;
    onSelect: (id: number) => void;
  }

  const { tile, current, onSelect }: Props = $props();
  const types = $derived((tile.types ?? []).slice(0, 2));

  /**
   * Emits selection of the tile id.
   */
  function select() {
    onSelect(tile.id);
  }
</script>

{#if current}
  <article class="evolution-item evolution-item--current" aria-current="true">
    <div class="evolution-item__image-wrap">
      {#if tile.image}
        <img class="evolution-item__image" src={tile.image} alt={tile.displayName} />
      {:else}
        <div class="evolution-item__image-fallback">Kein Bild</div>
      {/if}
    </div>
    <div class="evolution-item__content">
      <span class="evolution-item__name">{tile.displayName}</span>
      {#if types.length > 0}
        <div class="evolution-item__types" aria-label={`${tile.displayName} Typen`}>
          {#each types as type (type.name)}
            <span class="type-chip">{type.name}</span>
          {/each}
        </div>
      {/if}
    </div>
  </article>
{:else}
  <button
    class="evolution-item"
    type="button"
    onclick={select}
    aria-label={`Zu ${tile.displayName} wechseln`}
  >
    <div class="evolution-item__image-wrap">
      {#if tile.image}
        <img class="evolution-item__image" src={tile.image} alt={tile.displayName} />
      {:else}
        <div class="evolution-item__image-fallback">Kein Bild</div>
      {/if}
    </div>
    <div class="evolution-item__content">
      <span class="evolution-item__name">{tile.displayName}</span>
      {#if types.length > 0}
        <div class="evolution-item__types" aria-label={`${tile.displayName} Typen`}>
          {#each types as type (type.name)}
            <span class="type-chip">{type.name}</span>
          {/each}
        </div>
      {/if}
    </div>
  </button>
{/if}
