<script lang="ts">
  import type {
    PokemonEvolutionBranchGroup,
    PokemonEvolutionSummary,
    PokemonEvolutionTile,
  } from '../types/pokemon';

  /**
   * Normalized evolution payload consumed by this component.
   */
  interface EvolutionSummaryView {
    stage: PokemonEvolutionSummary['stage'];
    sharedPath: PokemonEvolutionTile[];
    branchGroups: PokemonEvolutionBranchGroup[];
  }

  /**
   * Input contract for the detail evolution summary component.
   */
  interface EvolutionSummaryProps {
    evolution: EvolutionSummaryView;
    currentPokemonId: number;
    onSelect: (id: number) => void;
  }

  const { evolution, currentPokemonId, onSelect }: EvolutionSummaryProps = $props();

  /**
   * Checks whether one tile is the currently open Pokemon.
   *
   * @param tile - Evolution tile rendered in shared path or branch group.
   * @returns True when this tile is the active detail Pokemon.
   */
  function isCurrent(tile: PokemonEvolutionTile): boolean {
    return tile.id === currentPokemonId;
  }

  /**
   * Returns up to two type chips for one evolution tile.
   *
   * @param tile - Evolution tile rendered in shared path or branch group.
   * @returns Type labels for compact metadata rendering.
   */
  function tileTypes(tile: PokemonEvolutionTile) {
    return (tile.types ?? []).slice(0, 2);
  }
</script>

<div class="detail__section-head">
  <h2 class="detail__section-title">Entwicklung</h2>
  <p class="detail__section-note">Aktuelle Stufe: {evolution.stage}</p>
</div>

<ol class="evolution" aria-label="Entwicklungsweg">
  {#each evolution.sharedPath as tile (tile.id)}
    <li class="evolution__step">
      {#if isCurrent(tile)}
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
            {#if tileTypes(tile).length > 0}
              <div class="evolution-item__types" aria-label={`${tile.displayName} Typen`}>
                {#each tileTypes(tile) as type (type.name)}
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
          onclick={() => {
            onSelect(tile.id);
          }}
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
            {#if tileTypes(tile).length > 0}
              <div class="evolution-item__types" aria-label={`${tile.displayName} Typen`}>
                {#each tileTypes(tile) as type (type.name)}
                  <span class="type-chip">{type.name}</span>
                {/each}
              </div>
            {/if}
          </div>
        </button>
      {/if}
    </li>
  {/each}
</ol>

{#if evolution.branchGroups.length > 0}
  <div class="evolution-branches" aria-label="Weitere Entwicklungszweige">
    {#each evolution.branchGroups as group, index (String(group.originId) + '-' + String(index))}
      {@const groupNumber = String(index + 1)}
      <section class="evolution-branch-group" aria-label={'Entwicklungszweig ' + groupNumber}>
        <h3 class="visually-hidden">Entwicklungszweig {groupNumber}</h3>
        <ol class="evolution-branch">
          {#each group.items as tile (tile.id)}
            <li class="evolution-branch__step">
              {#if isCurrent(tile)}
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
                    {#if tileTypes(tile).length > 0}
                      <div class="evolution-item__types" aria-label={`${tile.displayName} Typen`}>
                        {#each tileTypes(tile) as type (type.name)}
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
                  onclick={() => {
                    onSelect(tile.id);
                  }}
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
                    {#if tileTypes(tile).length > 0}
                      <div class="evolution-item__types" aria-label={`${tile.displayName} Typen`}>
                        {#each tileTypes(tile) as type (type.name)}
                          <span class="type-chip">{type.name}</span>
                        {/each}
                      </div>
                    {/if}
                  </div>
                </button>
              {/if}
            </li>
          {/each}
        </ol>
      </section>
    {/each}
  </div>
{/if}
