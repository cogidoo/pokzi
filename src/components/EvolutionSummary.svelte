<script lang="ts">
  import type { PokemonEvolutionSummary, PokemonEvolutionTile } from '../types/pokemon';

  /**
   * Derived Phase-2 column group tied to one Phase-1 origin tile.
   */
  interface Phase2Group {
    originId: number;
    originName: string;
    items: PokemonEvolutionTile[];
  }

  /**
   * Input contract for the detail evolution summary component.
   */
  interface EvolutionSummaryProps {
    evolution: PokemonEvolutionSummary;
    currentPokemonId: number;
    onSelect: (id: number) => void;
  }

  const { evolution, currentPokemonId, onSelect }: EvolutionSummaryProps = $props();
  const basisTile = $derived(evolution.sharedPath[0]);
  const phase1Tiles = $derived(resolvePhase1Tiles(evolution));
  const phase2Groups = $derived(resolvePhase2Groups(evolution));

  /**
   * Checks whether one tile is the currently open Pokemon.
   *
   * @param tile - Evolution tile rendered in one stage lane.
   * @returns True when this tile is the active detail Pokemon.
   */
  function isCurrent(tile: PokemonEvolutionTile): boolean {
    return tile.id === currentPokemonId;
  }

  /**
   * Returns up to two type chips for one evolution tile.
   *
   * @param tile - Evolution tile rendered in one stage lane.
   * @returns Type labels for compact metadata rendering.
   */
  function tileTypes(tile: PokemonEvolutionTile) {
    return (tile.types ?? []).slice(0, 2);
  }

  /**
   * Deduplicates evolution tiles while preserving source order.
   *
   * @param tiles - Candidate tiles in rendering order.
   * @returns Unique tile list by Pokemon id.
   */
  function uniqueTiles(tiles: PokemonEvolutionTile[]): PokemonEvolutionTile[] {
    const unique: PokemonEvolutionTile[] = [];

    for (const tile of tiles) {
      if (unique.some((entry) => entry.id === tile.id)) {
        continue;
      }

      unique.push(tile);
    }

    return unique;
  }

  /**
   * Resolves all visible Phase-1 tiles for the stage board.
   *
   * @param summary - Evolution summary from detail payload.
   * @returns Ordered Phase-1 candidates.
   */
  function resolvePhase1Tiles(summary: PokemonEvolutionSummary): PokemonEvolutionTile[] {
    const fromShared = summary.sharedPath.length > 1 ? [summary.sharedPath[1]] : [];
    const fromRootBranches =
      summary.sharedPath.length === 1
        ? summary.branchGroups.flatMap((group) => group.items.slice(0, 1))
        : [];

    return uniqueTiles([...fromShared, ...fromRootBranches]);
  }

  /**
   * Resolves grouped Phase-2 tiles tied to one Phase-1 origin.
   *
   * @param summary - Evolution summary from detail payload.
   * @returns Ordered Phase-2 groups with readable origin labels.
   */
  function resolvePhase2Groups(summary: PokemonEvolutionSummary): Phase2Group[] {
    const phase1Tiles = resolvePhase1Tiles(summary);

    if (summary.sharedPath.length >= 3) {
      const origin = summary.sharedPath[1];
      const phase2Tile = summary.sharedPath[2];
      return [
        {
          originId: origin.id,
          originName: origin.displayName,
          items: [phase2Tile],
        },
      ];
    }

    if (summary.sharedPath.length === 2) {
      const origin = summary.sharedPath[1];
      const phase2Items = uniqueTiles(
        summary.branchGroups.flatMap((group) => group.items.slice(0, 1)),
      );
      if (phase2Items.length === 0) {
        return [];
      }

      return [
        {
          originId: origin.id,
          originName: origin.displayName,
          items: phase2Items,
        },
      ];
    }

    const groups: Record<number, PokemonEvolutionTile[]> = {};
    const order: number[] = [];
    for (const group of summary.branchGroups) {
      if (group.items.length < 2) {
        continue;
      }
      const phase1 = group.items[0];
      const phase2 = group.items[1];

      const existing = groups[phase1.id] ?? [];
      existing.push(phase2);
      if (!(phase1.id in groups)) {
        order.push(phase1.id);
      }
      groups[phase1.id] = existing;
    }

    return order.map((originId) => ({
      originId,
      originName:
        phase1Tiles.find((tile) => tile.id === originId)?.displayName ?? `#${String(originId)}`,
      items: uniqueTiles(groups[originId] ?? []),
    }));
  }
</script>

<div class="detail__section-head">
  <h2 class="detail__section-title">Entwicklung</h2>
  <p class="detail__section-note">Aktuelle Stufe: {evolution.stage}</p>
</div>

<div class="evolution-board" aria-label="Entwicklungsstufen">
  <section class="evolution-stage" aria-label="Basisstufe">
    <h3 class="evolution-stage__title">Basis</h3>
    <div class="evolution-stage__lane">
      {#if basisTile}
        <div class="evolution-stage__entry">
          {#if isCurrent(basisTile)}
            <article class="evolution-item evolution-item--current" aria-current="true">
              <div class="evolution-item__image-wrap">
                {#if basisTile.image}
                  <img
                    class="evolution-item__image"
                    src={basisTile.image}
                    alt={basisTile.displayName}
                  />
                {:else}
                  <div class="evolution-item__image-fallback">Kein Bild</div>
                {/if}
              </div>
              <div class="evolution-item__content">
                <span class="evolution-item__name">{basisTile.displayName}</span>
                {#if tileTypes(basisTile).length > 0}
                  <div class="evolution-item__types" aria-label={`${basisTile.displayName} Typen`}>
                    {#each tileTypes(basisTile) as type (type.name)}
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
                onSelect(basisTile.id);
              }}
              aria-label={`Zu ${basisTile.displayName} wechseln`}
            >
              <div class="evolution-item__image-wrap">
                {#if basisTile.image}
                  <img
                    class="evolution-item__image"
                    src={basisTile.image}
                    alt={basisTile.displayName}
                  />
                {:else}
                  <div class="evolution-item__image-fallback">Kein Bild</div>
                {/if}
              </div>
              <div class="evolution-item__content">
                <span class="evolution-item__name">{basisTile.displayName}</span>
                {#if tileTypes(basisTile).length > 0}
                  <div class="evolution-item__types" aria-label={`${basisTile.displayName} Typen`}>
                    {#each tileTypes(basisTile) as type (type.name)}
                      <span class="type-chip">{type.name}</span>
                    {/each}
                  </div>
                {/if}
              </div>
            </button>
          {/if}
        </div>
      {/if}
    </div>
  </section>

  <div class="evolution-board__arrow" aria-hidden="true">→</div>

  <section class="evolution-stage" aria-label="Phase 1">
    <h3 class="evolution-stage__title">Phase 1</h3>
    <div class="evolution-stage__lane">
      {#each phase1Tiles as tile (tile.id)}
        <div class="evolution-stage__entry">
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
        </div>
      {/each}
    </div>
  </section>

  <div class="evolution-board__arrow" aria-hidden="true">→</div>

  <section class="evolution-stage" aria-label="Phase 2">
    <h3 class="evolution-stage__title">Phase 2</h3>
    <div class="evolution-stage__lane evolution-stage__lane--groups">
      {#if phase2Groups.length === 0}
        <p class="evolution-stage__empty">Keine Phase-2-Entwicklung</p>
      {:else}
        {#each phase2Groups as group (group.originId)}
          <div class="evolution-stage__group">
            {#if phase2Groups.length > 1}
              <p class="evolution-stage__group-label">Von {group.originName}</p>
            {/if}
            <div class="evolution-stage__group-items">
              {#each group.items as tile (tile.id)}
                <div class="evolution-stage__entry">
                  {#if isCurrent(tile)}
                    <article class="evolution-item evolution-item--current" aria-current="true">
                      <div class="evolution-item__image-wrap">
                        {#if tile.image}
                          <img
                            class="evolution-item__image"
                            src={tile.image}
                            alt={tile.displayName}
                          />
                        {:else}
                          <div class="evolution-item__image-fallback">Kein Bild</div>
                        {/if}
                      </div>
                      <div class="evolution-item__content">
                        <span class="evolution-item__name">{tile.displayName}</span>
                        {#if tileTypes(tile).length > 0}
                          <div
                            class="evolution-item__types"
                            aria-label={`${tile.displayName} Typen`}
                          >
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
                          <img
                            class="evolution-item__image"
                            src={tile.image}
                            alt={tile.displayName}
                          />
                        {:else}
                          <div class="evolution-item__image-fallback">Kein Bild</div>
                        {/if}
                      </div>
                      <div class="evolution-item__content">
                        <span class="evolution-item__name">{tile.displayName}</span>
                        {#if tileTypes(tile).length > 0}
                          <div
                            class="evolution-item__types"
                            aria-label={`${tile.displayName} Typen`}
                          >
                            {#each tileTypes(tile) as type (type.name)}
                              <span class="type-chip">{type.name}</span>
                            {/each}
                          </div>
                        {/if}
                      </div>
                    </button>
                  {/if}
                </div>
              {/each}
            </div>
          </div>
        {/each}
      {/if}
    </div>
  </section>
</div>
