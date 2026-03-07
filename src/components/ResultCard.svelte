<script lang="ts">
  import type { PokemonSearchResult } from '../types/pokemon';

  /*
   * Presentational card for one Pokemon search result.
   * It renders localized display fields and visual metadata chips.
   */

  /**
   * Props for a single Pokemon result card.
   */
  interface Props {
    pokemon: PokemonSearchResult;
    onSelect?: (id: number) => void;
  }

  let { pokemon, onSelect = () => undefined }: Props = $props();

  /**
   * Formats a numeric Pokemon id to a three-digit display string.
   *
   * @param id - Raw Pokemon id.
   * @returns Formatted id like "#007".
   */
  function formatId(id: number): string {
    return `#${id.toString().padStart(3, '0')}`;
  }

  /**
   * Maps the evolution stage label to a CSS-friendly class suffix.
   *
   * @param stage - Human-readable evolution stage.
   * @returns Class name fragment used by stage chip styles.
   */
  function stageClass(stage: PokemonSearchResult['evolutionStage']): string {
    if (stage === 'Basis') {
      return 'basis';
    }

    if (stage === 'Phase 1') {
      return 'phase-1';
    }

    return 'phase-2';
  }

  /**
   * Emits selection of the current card.
   */
  function selectPokemon() {
    onSelect(pokemon.id);
  }
</script>

<article class="card" role="listitem">
  <button class="card__button" type="button" onclick={selectPokemon}>
    <div class="card__image-wrap">
      {#if pokemon.image}
        <img class="card__image" src={pokemon.image} alt={pokemon.displayName} loading="lazy" />
      {:else}
        <div class="card__image-fallback">Kein Bild</div>
      {/if}
    </div>

    <div class="card__content">
      <div class="card__headline">
        <span class="card__name" role="heading" aria-level="2">{pokemon.displayName}</span>
        <p class="card__id" aria-label={`Pokemon-ID ${formatId(pokemon.id)}`}>
          {formatId(pokemon.id)}
        </p>
      </div>
      <div class="card__meta" aria-label="Pokemon-Metadaten">
        <p class={`meta-chip meta-chip--stage meta-chip--${stageClass(pokemon.evolutionStage)}`}>
          <span class="meta-chip__label">Stufe</span>
          <span class="meta-chip__value">{pokemon.evolutionStage}</span>
        </p>
        <div class="card__types" aria-label="Pokemon-Typen">
          {#each pokemon.types as type (type.name)}
            <span class="type-chip">{type.name}</span>
          {/each}
        </div>
      </div>
    </div>
  </button>
</article>
